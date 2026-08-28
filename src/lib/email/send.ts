import "server-only";

/**
 * The one place that talks to the email provider.
 *
 * Uses Resend's REST API over plain fetch — no SDK, so swapping to SendGrid,
 * Postmark or SES means rewriting this function and nothing else.
 */
export interface EmailMessage {
  to: string[];
  subject: string;
  html: string;
  text: string;
  /**
   * Display name shown beside the verified address, e.g. "Ranjani via
   * PhonicsFlow". The address itself cannot be the sender's own: providers only
   * send from domains verified by DNS, and a From of @gmail.com would fail
   * SPF/DKIM and be rejected or spam-filed.
   */
  fromName?: string;
  /** Where replies go — this is where the sender's real address belongs. */
  replyTo?: string;
}

export const isEmailConfigured = () =>
  Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);

export async function sendEmail(message: EmailMessage) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;

  if (!apiKey || !from) {
    throw new Error(
      "Email is not configured. Set RESEND_API_KEY and EMAIL_FROM in your environment.",
    );
  }
  if (message.to.length === 0) {
    throw new Error("No recipients — is there an account with the Head role?");
  }

  // EMAIL_FROM may be "Name <addr@domain>" or a bare address; only the address
  // part is fixed by domain verification, so the display name can be swapped.
  const address = from.match(/<([^>]+)>/)?.[1] ?? from.trim();
  const sender = message.fromName ? `${message.fromName} <${address}>` : from;

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: sender,
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
  return payload as { id?: string };
}
