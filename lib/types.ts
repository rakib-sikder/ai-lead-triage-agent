export interface Lead {
  id: string;
  name: string;
  email: string;
  company?: string;
  message: string;
}

export type Category = "hot" | "warm" | "cold" | "spam";

export interface Classification {
  category: Category;
  qualityScore: number; // 1-10
  reasoning: string;
  suggestedAction: string;
}

export interface DraftReply {
  subject: string;
  body: string;
}

export type TriageEvent =
  | { type: "step"; leadId: string; step: "classifying" | "drafting" | "done" | "skipped" }
  | { type: "classified"; leadId: string; classification: Classification }
  | { type: "drafted"; leadId: string; draft: DraftReply }
  | { type: "error"; leadId: string; message: string };
