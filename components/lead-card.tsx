"use client";

import { useEffect, useRef, useState } from "react";
import { animate } from "animejs";
import { Check, Copy, Loader2, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Classification, DraftReply, Lead } from "@/lib/types";

type Status = "queued" | "classifying" | "drafting" | "done" | "skipped" | "error";

export interface LeadRow extends Lead {
  status: Status;
  classification?: Classification;
  draft?: DraftReply;
  error?: string;
}

const CATEGORY_STYLE: Record<string, string> = {
  hot: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
  warm: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  cold: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
  spam: "bg-neutral-200 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400",
};

const METER_FILL: Record<string, string> = {
  hot: "bg-red-500",
  warm: "bg-amber-500",
  cold: "bg-blue-500",
  spam: "bg-neutral-400",
};

const STEP_LABEL: Record<Status, string> = {
  queued: "Queued",
  classifying: "Classifying…",
  drafting: "Drafting reply…",
  done: "Done",
  skipped: "Skipped (low priority)",
  error: "Error",
};

function ScoreMeter({ score, category }: { score: number; category: string }) {
  return (
    <span className="flex items-center gap-1.5" aria-label={`Quality score ${score} out of 10`}>
      <span className="flex gap-px" aria-hidden>
        {Array.from({ length: 10 }, (_, i) => (
          <span
            key={i}
            className={cn(
              "h-2.5 w-1 rounded-[1px]",
              i < score ? (METER_FILL[category] ?? "bg-primary") : "bg-muted"
            )}
          />
        ))}
      </span>
      <span className="text-xs tabular-nums text-muted-foreground">{score}/10</span>
    </span>
  );
}

export function LeadCard({ lead, onRemove }: { lead: LeadRow; onRemove: (id: string) => void }) {
  const cardRef = useRef<HTMLDivElement>(null);
  const hadClassification = useRef(false);
  const [copied, setCopied] = useState(false);

  const busy = lead.status === "classifying" || lead.status === "drafting";

  useEffect(() => {
    if (lead.classification && !hadClassification.current && cardRef.current) {
      animate(cardRef.current, {
        scale: [1, 1.015, 1],
        duration: 420,
        ease: "outQuad",
      });
    }
    hadClassification.current = !!lead.classification;
  }, [lead.classification]);

  async function copyDraft() {
    if (!lead.draft) return;
    try {
      await navigator.clipboard.writeText(`Subject: ${lead.draft.subject}\n\n${lead.draft.body}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      // clipboard can be blocked; fail silently
    }
  }

  return (
    <div
      ref={cardRef}
      className="group animate-in fade-in slide-in-from-bottom-2 duration-300 rounded-2xl border border-border p-5 bg-card transition-colors hover:border-primary/40"
    >
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <p className="font-medium">
            {lead.name} <span className="text-muted-foreground font-normal">— {lead.email}</span>
          </p>
          {lead.company && <p className="text-xs text-muted-foreground">{lead.company}</p>}
          <p className="text-sm mt-1 text-neutral-600 dark:text-neutral-300">{lead.message}</p>
        </div>
        <div className="flex items-center gap-2.5 shrink-0">
          {lead.classification && (
            <>
              <Badge className={cn("font-medium", CATEGORY_STYLE[lead.classification.category])}>
                {lead.classification.category.toUpperCase()}
              </Badge>
              <ScoreMeter
                score={lead.classification.qualityScore}
                category={lead.classification.category}
              />
            </>
          )}
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            {busy && <Loader2 className="size-3 animate-spin text-primary" aria-hidden />}
            {STEP_LABEL[lead.status]}
          </span>
          {!busy && (
            <button
              onClick={() => onRemove(lead.id)}
              aria-label={`Remove ${lead.name}`}
              className="rounded p-1 text-muted-foreground opacity-0 transition-opacity hover:text-destructive focus-visible:opacity-100 group-hover:opacity-100"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>
      </div>

      {lead.classification && (
        <div className="mt-3 text-sm space-y-1 border-t border-border pt-3">
          <p>
            <span className="text-muted-foreground">Reasoning:</span> {lead.classification.reasoning}
          </p>
          <p>
            <span className="text-muted-foreground">Suggested action:</span>{" "}
            {lead.classification.suggestedAction}
          </p>
        </div>
      )}

      {lead.draft && (
        <div className="relative mt-3 rounded-lg bg-muted/50 border border-border p-3 text-sm">
          <p className="font-medium pr-8">Subject: {lead.draft.subject}</p>
          <p className="mt-1 whitespace-pre-wrap text-neutral-600 dark:text-neutral-300">{lead.draft.body}</p>
          <button
            onClick={copyDraft}
            aria-label="Copy draft reply"
            className="absolute right-2 top-2 rounded-md border border-border bg-background p-1.5 text-muted-foreground transition-colors hover:text-foreground"
          >
            {copied ? <Check className="size-3.5 text-primary" /> : <Copy className="size-3.5" />}
          </button>
        </div>
      )}

      {lead.error && <p className="mt-2 text-sm text-destructive">⚠️ {lead.error}</p>}
    </div>
  );
}
