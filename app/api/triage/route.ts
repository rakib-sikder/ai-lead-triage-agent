import { NextRequest } from "next/server";
import { classifyLead, draftReply } from "@/lib/triage";
import type { Lead, TriageEvent } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 120;

function sseLine(event: TriageEvent): string {
  return JSON.stringify(event) + "\n";
}

export async function POST(req: NextRequest) {
  const { leads } = (await req.json()) as { leads: Lead[] };

  if (!Array.isArray(leads) || leads.length === 0) {
    return new Response(JSON.stringify({ error: "No leads provided" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return new Response(
      JSON.stringify({
        error: "ANTHROPIC_API_KEY is not configured on the server. Add it to .env.local and restart the dev server.",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      const emit = (event: TriageEvent) => controller.enqueue(encoder.encode(sseLine(event)));

      for (const lead of leads) {
        try {
          emit({ type: "step", leadId: lead.id, step: "classifying" });
          const classification = await classifyLead(lead);
          emit({ type: "classified", leadId: lead.id, classification });

          if (classification.category === "hot" || classification.category === "warm") {
            emit({ type: "step", leadId: lead.id, step: "drafting" });
            const draft = await draftReply(lead, classification);
            emit({ type: "drafted", leadId: lead.id, draft });
          } else {
            emit({ type: "step", leadId: lead.id, step: "skipped" });
          }

          emit({ type: "step", leadId: lead.id, step: "done" });
        } catch (err) {
          const message = err instanceof Error ? err.message : "Unknown error";
          emit({ type: "error", leadId: lead.id, message });
        }
      }

      controller.close();
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "application/x-ndjson; charset=utf-8" },
  });
}
