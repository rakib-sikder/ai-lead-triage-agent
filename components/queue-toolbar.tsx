"use client";

import { useRef } from "react";
import { animate } from "animejs";
import { ArrowDown01, Download, Play, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type CategoryFilter = "all" | "hot" | "warm" | "cold" | "spam";

const FILTERS: CategoryFilter[] = ["all", "hot", "warm", "cold", "spam"];

interface QueueToolbarProps {
  count: number;
  running: boolean;
  canRun: boolean;
  canExport: boolean;
  hasClassified: boolean;
  filter: CategoryFilter;
  sortByScore: boolean;
  onRun: () => void;
  onExport: () => void;
  onFilterChange: (f: CategoryFilter) => void;
  onSortToggle: () => void;
  onClearAll: () => void;
}

export function QueueToolbar({
  count,
  running,
  canRun,
  canExport,
  hasClassified,
  filter,
  sortByScore,
  onRun,
  onExport,
  onFilterChange,
  onSortToggle,
  onClearAll,
}: QueueToolbarProps) {
  const runRef = useRef<HTMLButtonElement>(null);

  const handleRun = () => {
    if (runRef.current) {
      animate(runRef.current, { scale: [1, 0.94, 1], duration: 220, ease: "outQuad" });
    }
    onRun();
  };

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h2 className="font-medium">Queue ({count})</h2>
        <div className="flex gap-2">
          <Button ref={runRef} onClick={handleRun} disabled={running || !canRun} className="rounded-full">
            <Play className="size-3.5" />
            {running ? "Running agent…" : "Run agent"}
          </Button>
          <Button variant="outline" onClick={onExport} disabled={!canExport} className="rounded-full">
            <Download className="size-3.5" />
            Export CSV
          </Button>
          {count > 0 && (
            <Button
              variant="outline"
              onClick={onClearAll}
              disabled={running}
              aria-label="Clear all leads"
              className="rounded-full"
            >
              <Trash2 className="size-3.5" />
            </Button>
          )}
        </div>
      </div>

      {hasClassified && (
        <div className="flex items-center gap-1.5 flex-wrap">
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => onFilterChange(f)}
              aria-pressed={filter === f}
              className={cn(
                "rounded-full border px-3 py-1 text-xs capitalize transition-colors",
                filter === f
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-muted-foreground hover:border-primary/50 hover:text-foreground"
              )}
            >
              {f}
            </button>
          ))}
          <button
            onClick={onSortToggle}
            aria-pressed={sortByScore}
            className={cn(
              "ml-1 flex items-center gap-1 rounded-full border px-3 py-1 text-xs transition-colors",
              sortByScore
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card text-muted-foreground hover:border-primary/50 hover:text-foreground"
            )}
          >
            <ArrowDown01 className="size-3" aria-hidden />
            Score
          </button>
        </div>
      )}
    </section>
  );
}
