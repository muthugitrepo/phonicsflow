"use client";

import * as React from "react";
import { createBrowserClient } from "@supabase/ssr";
import { CheckCircle2, Loader2, Star, Video } from "lucide-react";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "@/lib/supabase/config";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Textarea } from "@/components/ui/input";
import { MAX_UPLOAD_BYTES } from "@/lib/constants";
import { cn } from "@/lib/utils";

export function FeedbackForm({ token, studentName }: { token: string; studentName: string }) {
  const [rating, setRating] = React.useState<number | null>(null);
  const [text, setText] = React.useState("");
  const [file, setFile] = React.useState<File | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [done, setDone] = React.useState(false);

  if (done) {
    return (
      <Card>
        <CardBody className="flex flex-col items-center gap-2 py-10 text-center">
          <CheckCircle2 className="h-8 w-8 text-good" />
          <p className="text-base font-semibold text-ink">Thank you</p>
          <p className="text-sm text-ink-2">
            Your feedback about {studentName} has been sent to the trainer.
          </p>
        </CardBody>
      </Card>
    );
  }

  const submit = async () => {
    setError(null);

    if (!text.trim() && !file) {
      setError("Add a short note or a video before sending.");
      return;
    }

    setBusy(true);
    try {
      let videoPath: string | null = null;

      if (file) {
        if (file.size > MAX_UPLOAD_BYTES) {
          throw new Error("Videos must be under 50 MB.");
        }

        // The signed URL lets the file go straight to storage, bypassing the
        // serverless request body limit.
        const signed = await fetch(`/api/feedback/${token}/upload`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fileName: file.name }),
        });
        const signedPayload = await signed.json();
        if (!signed.ok) throw new Error(signedPayload.error ?? "Upload failed");

        const storage = createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        const { error: uploadError } = await storage.storage
          .from(signedPayload.bucket)
          .uploadToSignedUrl(signedPayload.path, signedPayload.token, file);
        if (uploadError) throw uploadError;

        videoPath = signedPayload.path;
      }

      const response = await fetch(`/api/feedback/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          written_feedback: text.trim() || undefined,
          rating: rating ?? undefined,
          video_url: videoPath ?? undefined,
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Could not send your feedback");

      setDone(true);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Could not send your feedback");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <CardBody className="space-y-4">
        <Field label="How are things going?">
          <div className="flex gap-1.5">
            {[1, 2, 3, 4, 5].map((value) => (
              <button
                key={value}
                type="button"
                aria-label={`${value} out of 5`}
                aria-pressed={rating === value}
                onClick={() => setRating(rating === value ? null : value)}
                className={cn(
                  "grid h-10 w-10 place-items-center rounded-lg border transition-colors",
                  rating !== null && value <= rating
                    ? "border-brand-ring bg-brand-soft text-brand-strong"
                    : "border-line text-muted hover:bg-plane",
                )}
              >
                <Star className="h-4 w-4" fill={rating !== null && value <= rating ? "currentColor" : "none"} />
              </button>
            ))}
          </div>
        </Field>

        <Field label="Your feedback" htmlFor="feedback_text">
          <Textarea
            id="feedback_text"
            rows={5}
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder={`What is going well for ${studentName}? Anything you would like the trainer to work on?`}
          />
        </Field>

        <Field label="Video (optional)" hint="Up to 50 MB. A quick clip of reading practice works well.">
          <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-line px-3 py-3 text-sm text-ink-2 hover:bg-plane">
            <Video className="h-4 w-4" />
            {file ? file.name : "Choose a video"}
            <input
              type="file"
              accept="video/*"
              className="sr-only"
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            />
          </label>
        </Field>

        {error ? (
          <p role="alert" className="rounded-md bg-[#fbeaea] px-3 py-2 text-sm text-[#a02525]">
            {error}
          </p>
        ) : null}

        <Button className="w-full" size="lg" onClick={submit} disabled={busy}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Send feedback
        </Button>
      </CardBody>
    </Card>
  );
}
