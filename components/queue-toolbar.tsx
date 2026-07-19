"use client";

import { useRef } from "react";
import { animate } from "animejs";
import { Download, Play } from "lucide-react";

import { Button } from "@/components/ui/button";

interface QueueToolbarProps {
  count: number;
  running: boolean;
  canRun: boolean;
  canExport: boolean;
  onRun: () => void;
  onExport: () => void;
}

export function QueueToolbar({ count, running, canRun, canExport, onRun, onExport }: QueueToolbarProps) {
  const runRef = useRef<HTMLButtonElement>(null);

  const handleRun = () => {
    if (runRef.current) {
      animate(runRef.current, { scale: [1, 0.94, 1], duration: 220, ease: "outQuad" });
    }
    onRun();
  };

  return (
    <section className="flex items-center justify-between">
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
      </div>
    </section>
  );
}
