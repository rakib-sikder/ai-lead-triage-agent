import Anthropic from "@anthropic-ai/sdk";
import type { Classification, DraftReply, Lead } from "./types";

const MODEL = "claude-sonnet-4-5";

function getClient(): Anthropic {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY is not configured on the server. Add it to .env.local and restart.");
  }
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
}

const classifyTool: Anthropic.Tool = {
  name: "submit_classification",
  description: "Submit the triage classification for an inbound lead.",
  input_schema: {
    type: "object",
    properties: {
      category: {
        type: "string",
        enum: ["hot", "warm", "cold", "spam"],
        description:
          "hot = ready to buy / explicit budget+timeline, warm = genuine interest but early stage, cold = vague or low-intent, spam = irrelevant/promotional/bot-like",
      },
      qualityScore: { type: "integer", minimum: 1, maximum: 10 },
      reasoning: { type: "string", description: "One or two sentences explaining the classification." },
      suggestedAction: {
        type: "string",
        description: "A concrete next step, e.g. 'Auto-reply and route to sales', 'Ignore', 'Escalate to a human for the RFP details'.",
      },
    },
    required: ["category", "qualityScore", "reasoning", "suggestedAction"],
  },
};

const draftTool: Anthropic.Tool = {
  name: "submit_draft_reply",
  description: "Submit a personalized email reply draft for this lead.",
  input_schema: {
    type: "object",
    properties: {
      subject: { type: "string" },
      body: { type: "string", description: "Plain-text email body, friendly and specific to what the lead asked." },
    },
    required: ["subject", "body"],
  },
};

function extractToolInput<T>(message: Anthropic.Message, toolName: string): T {
  const block = message.content.find(
    (b): b is Anthropic.ToolUseBlock => b.type === "tool_use" && b.name === toolName
  );
  if (!block) throw new Error(`Model did not call ${toolName}`);
  return block.input as T;
}

export async function classifyLead(lead: Lead): Promise<Classification> {
  const client = getClient();
  const message = await client.messages.create({
    model: MODEL,
    max_tokens: 512,
    tools: [classifyTool],
    tool_choice: { type: "tool", name: "submit_classification" },
    messages: [
      {
        role: "user",
        content: `Classify this inbound lead for a freelance software agency.\n\nName: ${lead.name}\nEmail: ${lead.email}\nCompany: ${lead.company ?? "unknown"}\nMessage: ${lead.message}`,
      },
    ],
  });
  return extractToolInput<Classification>(message, "submit_classification");
}

export async function draftReply(lead: Lead, classification: Classification): Promise<DraftReply> {
  const client = getClient();
  const message = await client.messages.create({
    model: MODEL,
    max_tokens: 512,
    tools: [draftTool],
    tool_choice: { type: "tool", name: "submit_draft_reply" },
    messages: [
      {
        role: "user",
        content: `Write a short, warm, specific reply to this lead. Reference their actual message — do not sound templated.\n\nName: ${lead.name}\nCompany: ${lead.company ?? "unknown"}\nMessage: ${lead.message}\n\nTriage notes: ${classification.reasoning} (category: ${classification.category})`,
      },
    ],
  });
  return extractToolInput<DraftReply>(message, "submit_draft_reply");
}
