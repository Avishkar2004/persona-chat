import { GoogleGenAI } from "@google/genai";

/**
 * The one place that talks to Gemini.
 *
 * Gemini 3 models think before answering, and those thought tokens count
 * against `maxOutputTokens`. A chat reply capped at 300 tokens can spend all
 * of it thinking and come back empty, so callers pick a thinking level.
 */

let client = null;

function getClient() {
  if (!process.env.GEMINI_API_KEY) throw new Error("Missing GEMINI_API_KEY");
  client ||= new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  return client;
}

const RETRYABLE = new Set([429, 500, 503]);
// Flash models return 503 "high demand" in spikes that often outlast one retry.
const RETRY_DELAYS_MS = [2000, 5000];
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * @param {object} args
 * @param {string} args.model
 * @param {string} args.system
 * @param {{ role: "user"|"assistant", content: string }[]} args.messages
 * @param {number} args.maxTokens
 * @param {"MINIMAL"|"LOW"|"MEDIUM"|"HIGH"} [args.thinking]
 * @returns {Promise<string>} every text part joined, thoughts excluded
 */
export async function generateText({ model, system, messages, maxTokens, thinking }) {
  const request = {
    model,
    contents: messages.map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    })),
    config: {
      systemInstruction: system,
      maxOutputTokens: maxTokens,
      ...(thinking ? { thinkingConfig: { thinkingLevel: thinking } } : {}),
    },
  };

  for (let attempt = 0; ; attempt++) {
    try {
      const response = await getClient().models.generateContent(request);
      const parts = response.candidates?.[0]?.content?.parts || [];
      return parts
        .filter((part) => part.text && !part.thought)
        .map((part) => part.text)
        .join("");
    } catch (err) {
      if (attempt >= RETRY_DELAYS_MS.length || !RETRYABLE.has(err?.status)) throw err;
      await sleep(RETRY_DELAYS_MS[attempt]);
    }
  }
}
