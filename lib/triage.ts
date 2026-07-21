import { GoogleGenAI, FunctionCallingConfigMode, type FunctionDeclaration } from "@google/genai";
import type { Classification, DraftReply, Lead } from "./types";

const MODEL = "gemini-3.1-flash-lite";

function getClient(): GoogleGenAI {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not configured on the server. Add it to .env.local and restart.");
  }
  return new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
}

const classifyTool: FunctionDeclaration = {
  name: "submit_classification",
  description: "Submit the triage classification for an inbound lead.",
  parametersJsonSchema: {
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

const draftTool: FunctionDeclaration = {
  name: "submit_draft_reply",
  description: "Submit a personalized email reply draft for this lead.",
  parametersJsonSchema: {
    type: "object",
    properties: {
      subject: { type: "string" },
      body: { type: "string", description: "Plain-text email body, friendly and specific to what the lead asked." },
    },
    required: ["subject", "body"],
  },
};

function extractFunctionArgs<T>(response: Awaited<ReturnType<GoogleGenAI["models"]["generateContent"]>>, toolName: string): T {
  const call = (response.functionCalls ?? []).find((c) => c.name === toolName);
  if (!call) throw new Error(`Model did not call ${toolName}`);
  return call.args as T;
}

export async function classifyLead(lead: Lead): Promise<Classification> {
  const client = getClient();
  const response = await client.models.generateContent({
    model: MODEL,
    contents: `Classify this inbound lead for a freelance software agency.\n\nName: ${lead.name}\nEmail: ${lead.email}\nCompany: ${lead.company ?? "unknown"}\nMessage: ${lead.message}`,
    config: {
      tools: [{ functionDeclarations: [classifyTool] }],
      toolConfig: {
        functionCallingConfig: {
          mode: FunctionCallingConfigMode.ANY,
          allowedFunctionNames: ["submit_classification"],
        },
      },
    },
  });
  return extractFunctionArgs<Classification>(response, "submit_classification");
}

export async function draftReply(lead: Lead, classification: Classification): Promise<DraftReply> {
  const client = getClient();
  const response = await client.models.generateContent({
    model: MODEL,
    contents: `Write a short, warm, specific reply to this lead. Reference their actual message — do not sound templated.\n\nName: ${lead.name}\nCompany: ${lead.company ?? "unknown"}\nMessage: ${lead.message}\n\nTriage notes: ${classification.reasoning} (category: ${classification.category})`,
    config: {
      tools: [{ functionDeclarations: [draftTool] }],
      toolConfig: {
        functionCallingConfig: {
          mode: FunctionCallingConfigMode.ANY,
          allowedFunctionNames: ["submit_draft_reply"],
        },
      },
    },
  });
  return extractFunctionArgs<DraftReply>(response, "submit_draft_reply");
}
