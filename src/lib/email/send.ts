import "server-only";

import nodemailer from "nodemailer";

/**
 * The one place that talks to an email provider.
 *
 * Two transports, chosen by which environment variables are present:
 *
 *   SMTP   (SMTP_HOST set) — Gmail, Zoho, Outlook, your host, or a provider's
 *          SMTP endpoint. With Gmail this sends *through* Google from your own
 *          mailbox, so the From address is genuinely yours and the message
 *          appears in your Sent folder.
 *
 *   Resend (RESEND_API_KEY set) — HTTP API, no SMTP port needed.
 *
 * SMTP wins if both are configured. Adding a third provider means editing this
 * file and nothing else.
 */
export interface EmailMessage {
  to: string[];
  subject: string;
  html: string;
  text: string;
  /** Display name shown beside the sending address. */
  fromName?: string;
  /** Where replies go. */
  replyTo?: string;
}

type Transport = "smtp" | "resend" | null;

export function emailTransport(): Transport {
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) return "smtp";
  if (process.env.RESEND_API_KEY) return "resend";
  return null;
}

export const isEmailConfigured = () => emailTransport() !== null && Boolean(senderAddress());

/**
 * The address mail is sent from.
 *
 * Over SMTP most providers — Gmail included — rewrite From to the authenticated
 * account unless it is a configured alias, so SMTP_USER is the honest default.
 */
export function senderAddress() {
  const configured = process.env.EMAIL_FROM?.trim();
  if (configured) return configured;
  if (emailTransport() === "smtp") return process.env.SMTP_USER?.trim();
  return undefined;
}

/** The bare address, without any display name wrapper. */
export function sendingAddress() {
  const raw = senderAddress();
  if (!raw) return undefined;
  return (raw.match(/<([^>]+)>/)?.[1] ?? raw).trim();
}

function composeFrom(fromName?: string) {
  const address = sendingAddress();
  if (!address) return undefined;
  return fromName ? `${fromName} <${address}>` : senderAddress();
}

export async function sendEmail(message: EmailMessage) {
  const transport = emailTransport();
  const from = composeFrom(message.fromName);

  if (!transport || !from) {
    throw new Error(
      "Email is not configured. Set SMTP_HOST/SMTP_USER/SMTP_PASS (or RESEND_API_KEY) plus EMAIL_FROM.",
    );
  }
  if (message.to.length === 0) {
    throw new Error("No recipients — add at least one address.");
  }

  if (transport === "smtp") {
    const port = Number(process.env.SMTP_PORT ?? 587);
    const mailer = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure: port === 465, // 465 is implicit TLS; 587 upgrades via STARTTLS
      auth: { user: process.env.SMTP_USER!, pass: process.env.SMTP_PASS! },
    });

    const info = await mailer.sendMail({
      from,
      to: message.to.join(", "),
      subject: message.subject,
      html: message.html,
      text: message.text,
      replyTo: message.replyTo,
    });
    return { id: info.messageId };
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: message.to,
      subject: message.subject,
      html: message.html,
      text: message.text,
      ...(message.replyTo ? { reply_to: message.replyTo } : {}),
    }),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload?.message ?? `Email provider returned ${response.status}`);
  }
  return { id: (payload as { id?: string }).id };
}
