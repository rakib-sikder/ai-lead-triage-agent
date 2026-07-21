"use client";

import { PiggyBank } from "lucide-react";

import type { LeadRow } from "@/components/lead-card";
import { cn } from "@/lib/utils";

const CATEGORIES = ["hot", "warm", "cold", "spam"] as const;

const DOT: Record<(typeof CATEGORIES)[number], string> = {
  hot: "bg-red-500",
  warm: "bg-amber-500",
  cold: "bg-blue-500",
  spam: "bg-neutral-400",
};

export function TriageStats({ leads }: { leads: LeadRow[] }) {
  const classified = leads.filter((l) => l.classification);
  if (classified.length === 0) return null;

  const counts = Object.fromEntries(
    CATEGORIES.map((c) => [c, classified.filter((l) => l.classification!.category === c).length])
  ) as Record<(typeof CATEGORIES)[number], number>;

  // cold/spam never get the second (draft) model call — that's the money saved
  const skippedDrafts = counts.cold + counts.spam;

  return (
    <section
      aria-label="Triage summary"
      className="flex flex-wrap items-center gap-2 animate-in fade-in slide-in-from-bottom-1 duration-300"
    >
      {CATEGORIES.map((c) => (
        <span
          key={c}
          className="flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-sm"
        >
          <span aria-hidden className={cn("size-2 rounded-full", DOT[c])} />
          <span className="capitalize text-muted-foreground">{c}</span>
          <span className="font-medium tabular-nums">{counts[c]}</span>
        </span>
      ))}
      {skippedDrafts > 0 && (
        <span className="flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-sm text-muted-foreground">
          <PiggyBank className="size-3.5 text-primary" aria-hidden />
          {skippedDrafts} draft {skippedDrafts === 1 ? "call" : "calls"} skipped
        </span>
      )}
    </section>
  );
}
