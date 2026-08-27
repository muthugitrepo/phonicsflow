import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap",
  {
    variants: {
      tone: {
        neutral: "bg-plane text-ink-2 ring-1 ring-line",
        brand: "bg-brand-soft text-brand-strong ring-1 ring-brand-ring",
        good: "bg-[#e8f6e8] text-[#006300] ring-1 ring-[#bfe6bf]",
        warning: "bg-[#fdf3dd] text-[#7a5300] ring-1 ring-[#f6e0a8]",
        critical: "bg-[#fbeaea] text-[#a02525] ring-1 ring-[#f2c7c7]",
      },
    },
    defaultVariants: { tone: "neutral" },
  },
);

export function Badge({
  className,
  tone,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ tone }), className)} {...props} />;
}
