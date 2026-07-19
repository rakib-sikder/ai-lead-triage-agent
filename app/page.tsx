"use client";

import { useCallback, useRef, useState } from "react";
import Papa from "papaparse";
import { sampleLeads } from "@/lib/sample-leads";
import type { Classification, DraftReply, Lead, TriageEvent } from "@/lib/types";

type Status = "queued" | "classifying" | "drafting" | "done" | "skipped" | "error";

interface LeadRow extends Lead {
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

export default function Home() {
  const [leads, setLeads] = useState<LeadRow[]>([]);
  const [running, setRunning] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", company: "", message: "" });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const addLead = useCallback((lead: Omit<Lead, "id">) => {
    setLeads((prev) => [...prev, { ...lead, id: crypto.randomUUID(), status: "queued" }]);
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
        alert(data.error ?? "Something went wrong");
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
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100">
      <header className="border-b border-neutral-200 dark:border-neutral-800 px-6 py-4">
        <h1 className="text-lg font-semibold">LeadPilot</h1>
        <p className="text-sm text-neutral-500">
          AI agent that classifies inbound leads, scores intent, and drafts replies automatically — skipping cold/spam leads to save cost.
        </p>
      </header>

      <main className="mx-auto max-w-5xl p-6 space-y-6">
        <section className="rounded-xl border border-neutral-200 dark:border-neutral-800 p-5 space-y-4">
          <div className="flex flex-wrap items-center gap-2 justify-between">
            <h2 className="font-medium">Add leads</h2>
            <div className="flex gap-2">
              <button onClick={loadSample} className="text-sm rounded-lg border border-neutral-300 dark:border-neutral-700 px-3 py-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-900">
                Load sample leads
              </button>
              <button onClick={() => fileInputRef.current?.click()} className="text-sm rounded-lg border border-neutral-300 dark:border-neutral-700 px-3 py-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-900">
                Upload CSV
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleCsv(e.target.files[0])}
              />
            </div>
          </div>

          <form onSubmit={handleAddForm} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2 text-sm" />
            <input placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2 text-sm" />
            <input placeholder="Company (optional)" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} className="rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2 text-sm sm:col-span-2" />
            <textarea placeholder="Message" value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} className="rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2 text-sm sm:col-span-2" rows={2} />
            <button type="submit" className="rounded-lg bg-blue-600 text-white text-sm px-4 py-2 sm:col-span-2 sm:w-fit">
              Add lead
            </button>
          </form>
        </section>

        <section className="flex items-center justify-between">
          <h2 className="font-medium">Queue ({leads.length})</h2>
          <div className="flex gap-2">
            <button
              onClick={runAgent}
              disabled={running || leads.every((l) => l.status !== "queued" && l.status !== "error")}
              className="rounded-lg bg-neutral-900 dark:bg-white dark:text-neutral-900 text-white text-sm px-4 py-2 disabled:opacity-40"
            >
              {running ? "Running agent…" : "Run agent"}
            </button>
            <button
              onClick={exportCsv}
              disabled={leads.every((l) => !l.classification)}
              className="rounded-lg border border-neutral-300 dark:border-neutral-700 text-sm px-4 py-2 disabled:opacity-40"
            >
              Export CSV
            </button>
          </div>
        </section>

        <section className="space-y-3">
          {leads.length === 0 && (
            <p className="text-sm text-neutral-400 text-center py-10">No leads yet — add one above or load the sample set.</p>
          )}
          {leads.map((lead) => (
            <div key={lead.id} className="rounded-xl border border-neutral-200 dark:border-neutral-800 p-4 bg-white dark:bg-neutral-900">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <p className="font-medium">{lead.name} <span className="text-neutral-400 font-normal">— {lead.email}</span></p>
                  {lead.company && <p className="text-xs text-neutral-500">{lead.company}</p>}
                  <p className="text-sm mt-1 text-neutral-600 dark:text-neutral-300">{lead.message}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {lead.classification && (
                    <span className={`text-xs font-medium rounded-full px-2.5 py-1 ${CATEGORY_STYLE[lead.classification.category]}`}>
                      {lead.classification.category.toUpperCase()} · {lead.classification.qualityScore}/10
                    </span>
                  )}
                  <span className="text-xs text-neutral-400">{STEP_LABEL[lead.status]}</span>
                </div>
              </div>

              {lead.classification && (
                <div className="mt-3 text-sm space-y-1 border-t border-neutral-100 dark:border-neutral-800 pt-3">
                  <p><span className="text-neutral-400">Reasoning:</span> {lead.classification.reasoning}</p>
                  <p><span className="text-neutral-400">Suggested action:</span> {lead.classification.suggestedAction}</p>
                </div>
              )}

              {lead.draft && (
                <div className="mt-3 rounded-lg bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 p-3 text-sm">
                  <p className="font-medium">Subject: {lead.draft.subject}</p>
                  <p className="mt-1 whitespace-pre-wrap text-neutral-600 dark:text-neutral-300">{lead.draft.body}</p>
                </div>
              )}

              {lead.error && <p className="mt-2 text-sm text-red-600">⚠️ {lead.error}</p>}
            </div>
          ))}
        </section>
      </main>
    </div>
  );
}
