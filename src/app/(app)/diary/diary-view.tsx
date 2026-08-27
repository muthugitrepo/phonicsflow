"use client";

import * as React from "react";
import { BookOpenText, ChevronDown, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { useDeleteSound, useSounds } from "@/lib/queries/sounds";
import { useIsTeamHead } from "@/components/session-provider";
import { SoundFormModal } from "@/components/features/sound-form-modal";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs } from "@/components/ui/tabs";
import { EmptyState, ErrorState, LoadingRows } from "@/components/ui/states";
import { useToast } from "@/components/ui/toast";
import { SOUND_CATEGORY_LABELS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { SoundCategory } from "@/lib/database.types";
import type { PhonicsSound } from "@/lib/types";

export function DiaryView() {
  const { data, isLoading, error } = useSounds();
  const deleteSound = useDeleteSound();
  const isTeamHead = useIsTeamHead();
  const { toast } = useToast();

  const [category, setCategory] = React.useState<SoundCategory | "all">("all");
  const [search, setSearch] = React.useState("");
  const [expanded, setExpanded] = React.useState<string | null>(null);
  const [editing, setEditing] = React.useState<PhonicsSound | null>(null);
  const [formOpen, setFormOpen] = React.useState(false);

  const sounds = React.useMemo(() => data ?? [], [data]);

  const visible = React.useMemo(() => {
    const term = search.trim().toLowerCase();
    return sounds.filter((sound) => {
      if (category !== "all" && sound.category !== category) return false;
      if (!term) return true;
      return (
        sound.sound_name.toLowerCase().includes(term) ||
        sound.example_words.some((example) => example.word.toLowerCase().includes(term))
      );
    });
  }, [sounds, category, search]);

  const counts = React.useMemo(
    () => ({
      consonant: sounds.filter((s) => s.category === "consonant").length,
      consonant_digraph: sounds.filter((s) => s.category === "consonant_digraph").length,
      vowel_digraph: sounds.filter((s) => s.category === "vowel_digraph").length,
    }),
    [sounds],
  );

  return (
    <>
      <PageHeader
        title="Phonics diary"
        description="The shared sound library — searchable, and editable by any trainer."
        actions={
          <Button
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            <Plus className="h-4 w-4" /> Add sound
          </Button>
        }
      />

      <div className="mb-4 space-y-2">
        <div className="relative sm:max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <Input
            className="pl-9"
            placeholder="Search a sound or an example word"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            aria-label="Search sounds"
          />
        </div>
        <Tabs
          items={[
            { value: "all", label: "All", count: sounds.length },
            { value: "consonant", label: "Consonants", count: counts.consonant },
            { value: "consonant_digraph", label: "Consonant digraphs", count: counts.consonant_digraph },
            { value: "vowel_digraph", label: "Vowel digraphs", count: counts.vowel_digraph },
          ]}
          value={category}
          onChange={(value) => setCategory(value as SoundCategory | "all")}
        />
      </div>

      {error ? (
        <ErrorState message={(error as Error).message} />
      ) : isLoading ? (
        <Card>
          <LoadingRows rows={5} />
        </Card>
      ) : visible.length === 0 ? (
        <Card>
          <EmptyState
            icon={BookOpenText}
            title="No sounds match"
            description="Try a different search, or add the sound to the library."
          />
        </Card>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {visible.map((sound) => {
            const isOpen = expanded === sound.id;
            return (
              <li key={sound.id}>
                <Card className="h-full">
                  <div className="flex items-start justify-between gap-2 px-4 py-3">
                    <button
                      type="button"
                      className="flex min-w-0 flex-1 items-start gap-3 text-left"
                      onClick={() => setExpanded(isOpen ? null : sound.id)}
                      aria-expanded={isOpen}
                    >
                      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-brand-soft text-sm font-bold text-brand-strong">
                        {sound.sound_name}
                      </span>
                      <span className="min-w-0">
                        <span className="block text-sm font-semibold text-ink">
                          /{sound.sound_name}/
                        </span>
                        <Badge tone="neutral" className="mt-1">
                          {SOUND_CATEGORY_LABELS[sound.category]}
                        </Badge>
                      </span>
                    </button>
                    <ChevronDown
                      className={cn(
                        "mt-1 h-4 w-4 shrink-0 text-muted transition-transform",
                        isOpen && "rotate-180",
                      )}
                    />
                  </div>

                  <div className="px-4 pb-3">
                    {sound.description ? (
                      <p className="mb-2 text-xs text-ink-2">{sound.description}</p>
                    ) : null}

                    {isOpen ? (
                      <ol className="space-y-1.5">
                        {sound.example_words.map((example, index) => (
                          <li key={`${example.word}-${index}`} className="rounded-md bg-plane px-2.5 py-1.5">
                            <p className="text-sm font-medium text-ink">{example.word}</p>
                            {example.example_sentence ? (
                              <p className="text-xs text-ink-2">{example.example_sentence}</p>
                            ) : null}
                          </li>
                        ))}
                      </ol>
                    ) : (
                      <p className="flex flex-wrap gap-1">
                        {sound.example_words.slice(0, 5).map((example, index) => (
                          <span
                            key={`${example.word}-${index}`}
                            className="rounded bg-plane px-1.5 py-0.5 text-xs text-ink-2"
                          >
                            {example.word}
                          </span>
                        ))}
                        {sound.example_words.length > 5 ? (
                          <span className="px-1 text-xs text-muted">
                            +{sound.example_words.length - 5} more
                          </span>
                        ) : null}
                      </p>
                    )}

                    <div className="mt-2 flex items-center gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setEditing(sound);
                          setFormOpen(true);
                        }}
                      >
                        <Pencil className="h-3.5 w-3.5" /> Edit
                      </Button>
                      {isTeamHead ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={async () => {
                            await deleteSound.mutateAsync(sound.id);
                            toast("Sound removed");
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5" /> Delete
                        </Button>
                      ) : null}
                    </div>
                  </div>
                </Card>
              </li>
            );
          })}
        </ul>
      )}

      <SoundFormModal
        sound={editing}
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditing(null);
        }}
      />
    </>
  );
}
