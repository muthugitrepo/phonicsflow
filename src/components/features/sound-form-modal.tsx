"use client";

import * as React from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { useSaveSound } from "@/lib/queries/sounds";
import { useToast } from "@/components/ui/toast";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input, Select, Textarea } from "@/components/ui/input";
import { soundSchema, type SoundInput, type SoundFormValues } from "@/lib/validations";
import { SOUND_CATEGORY_LABELS } from "@/lib/constants";
import type { PhonicsSound } from "@/lib/types";

const BLANK_WORD = { word: "", example_sentence: "" };

export function SoundFormModal({
  sound,
  open,
  onClose,
}: {
  sound?: PhonicsSound | null;
  open: boolean;
  onClose: () => void;
}) {
  const saveSound = useSaveSound();
  const { toast } = useToast();

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<SoundFormValues, unknown, SoundInput>({ resolver: zodResolver(soundSchema) });

  const { fields, append, remove } = useFieldArray({ control, name: "example_words" });

  React.useEffect(() => {
    if (!open) return;
    reset({
      category: sound?.category ?? "consonant",
      sound_name: sound?.sound_name ?? "",
      description: sound?.description ?? "",
      example_words: sound?.example_words?.length
        ? sound.example_words
        : Array.from({ length: 3 }, () => ({ ...BLANK_WORD })),
    } as SoundFormValues);
  }, [open, sound, reset]);

  const onSubmit = async (values: SoundInput) => {
    try {
      await saveSound.mutateAsync({ id: sound?.id, values });
      toast(sound ? "Sound updated" : "Sound added");
      onClose();
    } catch (error) {
      toast(error instanceof Error ? error.message : "Could not save the sound", "error");
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={sound ? `Edit /${sound.sound_name}/` : "Add a sound"}
      description="Ten example words per sound is the house standard."
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit(onSubmit)} disabled={isSubmitting}>
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Save
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Category" htmlFor="category">
            <Select id="category" {...register("category")}>
              {Object.entries(SOUND_CATEGORY_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Sound" htmlFor="sound_name" error={errors.sound_name?.message} required>
            <Input id="sound_name" placeholder="sh" {...register("sound_name")} />
          </Field>
        </div>

        <Field label="How to teach it" htmlFor="description">
          <Textarea id="description" rows={2} placeholder="Mouth position, common confusions" {...register("description")} />
        </Field>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-medium text-ink">
              Example words
              <span className="ml-1.5 text-xs font-normal text-muted">{fields.length}</span>
            </p>
            <Button size="sm" variant="secondary" onClick={() => append({ ...BLANK_WORD })}>
              <Plus className="h-3.5 w-3.5" /> Add word
            </Button>
          </div>

          {errors.example_words?.message ? (
            <p className="mb-2 text-xs font-medium text-critical">{errors.example_words.message}</p>
          ) : null}

          <ul className="space-y-2">
            {fields.map((field, index) => (
              <li key={field.id} className="flex gap-2">
                <Input
                  className="w-28 shrink-0"
                  placeholder="word"
                  aria-label={`Word ${index + 1}`}
                  {...register(`example_words.${index}.word` as const)}
                />
                <Input
                  placeholder="Example sentence"
                  aria-label={`Sentence ${index + 1}`}
                  {...register(`example_words.${index}.example_sentence` as const)}
                />
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label={`Remove word ${index + 1}`}
                  onClick={() => remove(index)}
                >
                  <Trash2 className="h-4 w-4 text-muted" />
                </Button>
              </li>
            ))}
          </ul>
        </div>
      </form>
    </Modal>
  );
}
