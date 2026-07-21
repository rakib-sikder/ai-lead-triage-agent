"use client";

import { useCallback, useRef, useState } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import Papa from "papaparse";
import { Inbox } from "lucide-react";
import { toast } from "sonner";

import { sampleLeads } from "@/lib/sample-leads";
import type { Classification, DraftReply, Lead, TriageEvent } from "@/lib/types";
import { AmbientBackground } from "@/components/ambient-background";
import { ThemeToggle } from "@/components/theme-toggle";
import { LogoMark } from "@/components/logo-mark";
import { LeadForm } from "@/components/lead-form";
import { QueueToolbar, type CategoryFilter } from "@/components/queue-toolbar";
import { LeadCard, type LeadRow } from "@/components/lead-card";
import { TriageStats } from "@/components/triage-stats";

export default function Home() {
  const [leads, setLeads] = useState<LeadRow[]>([]);
  const [running, setRunning] = useState(false);
  const [filter, setFilter] = useState<CategoryFilter>("all");
  const [sortByScore, setSortByScore] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", company: "", message: "" });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
      tl.from("[data-reveal='logo']", { opacity: 0, scale: 0.5, duration: 0.5, ease: "back.out(2.2)" })
        .from("[data-reveal='title']", { opacity: 0, x: -10, duration: 0.4 }, "<0.05")
        .from("[data-reveal='form']", { opacity: 0, y: 16, duration: 0.5 }, "-=0.15")
        .from("[data-reveal='toolbar']", { opacity: 0, y: 12, duration: 0.4 }, "-=0.25")
        .from("[data-reveal='list']", { opacity: 0, y: 12, duration: 0.45 }, "-=0.2");
    },
    { scope: rootRef }
  );

  const addLead = useCallback((lead: Omit<Lead, "id">) => {
    setLeads((prev) => [...prev, { ...lead, id: crypto.randomUUID(), status: "queued" }]);
  }, []);

  const removeLead = useCallback((id: string) => {
    setLeads((prev) => prev.filter((l) => l.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    setLeads([]);
    setFilter("all");
  }, []);

  const handleAddForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.message) return;
    addLead(form);
    setForm({ name: "", email: "", company: "", message: "" });
  };

  const handleCsv = (file: File) => {
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        for (const row of results.data) {
          const name = row.name ?? row.Name;
          const email = row.email ?? row.Email;
          const message = row.message ?? row.Message;
          if (!name || !email || !message) continue;
          addLead({ name, email, company: row.company ?? row.Company ?? "", message });
        }
      },
    });
  };

  const loadSample = () => sampleLeads.forEach(addLead);

  const runAgent = useCallback(async () => {
    const queued = leads.filter((l) => l.status === "queued" || l.status === "error");
    if (queued.length === 0 || running) return;
    setRunning(true);

    try {
      const res = await fetch("/api/triage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leads: queued.map(({ status, classification, draft, error, ...lead }) => lead) }),
      });

      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => ({ error: "Something went wrong" }));
        toast.error(data.error ?? "Something went wrong");
        setRunning(false);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      const applyEvent = (event: TriageEvent) => {
        setLeads((prev) =>
          prev.map((lead) => {
            if (lead.id !== event.leadId) return lead;
            if (event.type === "step") return { ...lead, status: event.step };
            if (event.type === "classified") return { ...lead, classification: event.classification };
            if (event.type === "drafted") return { ...lead, draft: event.draft };
            if (event.type === "error") return { ...lead, status: "error", error: event.message };
            return lead;
          })
        );
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.trim()) continue;
          applyEvent(JSON.parse(line) as TriageEvent);
        }
      }
    } finally {
      setRunning(false);
    }
  }, [leads, running]);

  const visibleLeads = leads
    .filter((l) => filter === "all" || l.classification?.category === filter)
    .sort((a, b) =>
      sortByScore
        ? (b.classification?.qualityScore ?? -1) - (a.classification?.qualityScore ?? -1)
        : 0
    );

  const exportCsv = () => {
    const rows = leads.map((l) => ({
      name: l.name,
      email: l.email,
      company: l.company ?? "",
      category: l.classification?.category ?? "",
      qualityScore: l.classification?.qualityScore ?? "",
      reasoning: l.classification?.reasoning ?? "",
      suggestedAction: l.classification?.suggestedAction ?? "",
      draftSubject: l.draft?.subject ?? "",
      draftBody: l.draft?.body ?? "",
    }));
    const csv = Papa.unparse(rows);
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "lead-triage-results.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div ref={rootRef} className="relative min-h-screen text-foreground">
      <AmbientBackground />

      <header className="border-b border-border bg-background/70 backdrop-blur-xl px-6 py-5 sticky top-0 z-10">
        <div className="mx-auto max-w-5xl flex items-center gap-3">
          <LogoMark />
          <div data-reveal="title" className="flex-1">
            <h1 className="text-lg font-semibold leading-tight">LeadPilot</h1>
            <p className="text-sm text-muted-foreground">
              Classifies inbound leads, scores intent, and drafts replies — skipping cold/spam to save cost.
            </p>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="mx-auto max-w-5xl p-6 space-y-8">
        <div data-reveal="form">
          <LeadForm
            form={form}
            fileInputRef={fileInputRef}
            onFormChange={setForm}
            onSubmit={handleAddForm}
            onLoadSample={loadSample}
            onCsv={handleCsv}
          />
        </div>

        <div data-reveal="toolbar" className="space-y-4">
          <QueueToolbar
            count={leads.length}
            running={running}
            canRun={leads.some((l) => l.status === "queued" || l.status === "error")}
            canExport={leads.some((l) => !!l.classification)}
            hasClassified={leads.some((l) => !!l.classification)}
            filter={filter}
            sortByScore={sortByScore}
            onRun={runAgent}
            onExport={exportCsv}
            onFilterChange={setFilter}
            onSortToggle={() => setSortByScore((s) => !s)}
            onClearAll={clearAll}
          />
          <TriageStats leads={leads} />
        </div>

        <section data-reveal="list" className="space-y-3">
          {leads.length === 0 && (
            <div className="text-center py-14 text-muted-foreground">
              <Inbox className="mx-auto mb-2 size-8 opacity-50" />
              <p className="text-sm">No leads yet — add one above or load the sample set.</p>
            </div>
          )}
          {visibleLeads.length === 0 && leads.length > 0 && (
            <p className="text-center py-10 text-sm text-muted-foreground">
              No {filter} leads in the queue.
            </p>
          )}
          {visibleLeads.map((lead) => (
            <LeadCard key={lead.id} lead={lead} onRemove={removeLead} />
          ))}
        </section>
      </main>
    </div>
  );
}
