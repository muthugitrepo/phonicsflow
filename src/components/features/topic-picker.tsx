"use client";

import * as React from "react";
import { Plus, X } from "lucide-react";
import { useSounds } from "@/lib/queries/sounds";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/**
 * Free-text topics with the phonics diary offered as suggestions — trainers
 * cover sounds from the library most days, but not only those.
 */
export function TopicPicker({
  value,
  onChange,
}: {
  value: string[];
  onChange: (topics: string[]) => void;
}) {
  const { data: sounds } = useSounds();
  const [draft, setDraft] = React.useState("");

  const add = (topic: string) => {
    const trimmed = topic.trim();
    if (!trimmed || value.includes(trimmed)) return;
    onChange([...value, trimmed]);
    setDraft("");
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Input
          list="phonics-sound-options"
          value={draft}
          placeholder="e.g. sh, short vowels, blending"
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              add(draft);
            }
          }}
          aria-label="Add a topic"
        />
        <Button variant="secondary" onClick={() => add(draft)} aria-label="Add topic">
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      <datalist id="phonics-sound-options">
        {(sounds ?? []).map((sound) => (
          <option key={sound.id} value={sound.sound_name} />
        ))}
      </datalist>

      {value.length > 0 ? (
        <ul className="flex flex-wrap gap-1.5">
          {value.map((topic) => (
            <li
              key={topic}
              className="inline-flex items-center gap-1 rounded-full bg-brand-soft px-2 py-0.5 text-xs font-medium text-brand-strong ring-1 ring-brand-ring"
            >
              {topic}
              <button
                type="button"
                onClick={() => onChange(value.filter((item) => item !== topic))}
                aria-label={`Remove ${topic}`}
                className="text-brand-strong/70 hover:text-brand-strong"
              >
                <X className="h-3 w-3" />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-muted">No topics added yet.</p>
      )}
    </div>
  );
}
