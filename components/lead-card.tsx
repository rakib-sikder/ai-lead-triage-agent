"use client";

import { useEffect, useRef } from "react";
import { animate } from "animejs";

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

const STEP_LABEL: Record<Status, string> = {
  queued: "Queued",
  classifying: "Classifying…",
  drafting: "Drafting reply…",
  done: "Done",
  skipped: "Skipped (low priority)",
  error: "Error",
};

export function LeadCard({ lead }: { lead: LeadRow }) {
  const cardRef = useRef<HTMLDivElement>(null);
  const hadClassification = useRef(false);

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

  return (
    <div
      ref={cardRef}
      className="animate-in fade-in slide-in-from-bottom-2 duration-300 rounded-2xl border border-border p-5 bg-card transition-colors hover:border-primary/40"
    >
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <p className="font-medium">
            {lead.name} <span className="text-muted-foreground font-normal">— {lead.email}</span>
          </p>
          {lead.company && <p className="text-xs text-muted-foreground">{lead.company}</p>}
          <p className="text-sm mt-1 text-neutral-600 dark:text-neutral-300">{lead.message}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {lead.classification && (
            <Badge className={cn("font-medium", CATEGORY_STYLE[lead.classification.category])}>
              {lead.classification.category.toUpperCase()} · {lead.classification.qualityScore}/10
            </Badge>
          )}
          <span className="text-xs text-muted-foreground">{STEP_LABEL[lead.status]}</span>
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
        <div className="mt-3 rounded-lg bg-muted/50 border border-border p-3 text-sm">
          <p className="font-medium">Subject: {lead.draft.subject}</p>
          <p className="mt-1 whitespace-pre-wrap text-neutral-600 dark:text-neutral-300">{lead.draft.body}</p>
        </div>
      )}

      {lead.error && <p className="mt-2 text-sm text-destructive">⚠️ {lead.error}</p>}
    </div>
  );
}
