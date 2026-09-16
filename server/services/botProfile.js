import { ANALYZE_PROMPT, PERSONA_TEMPLATE, fillTemplate } from "./botPrompts.js";
import {
  buildExchanges,
  formatExample,
  formatTranscript,
  pickSpreadExamples,
} from "./chatLog.js";
import { generateText } from "./llm.js";

/**
 * Chat log → the system prompt an AI friend replies with. One model call
 * writes a style profile from the recent part of the log; real examples from
 * across the whole log are pasted in next to it.
 */

const ANALYZE_MODEL = () => process.env.BOT_ANALYZE_MODEL || "gemini-3.5-flash";

const ANALYZE_EXCHANGES = 400;
const EXAMPLE_COUNT = 40;
// Keeps a huge group export from turning into a minute-long analysis call.
const MAX_TRANSCRIPT_CHARS = 150_000;

export async function buildPersona({ messages, personName, displayName, ownerUsername }) {
  const { turns, exchanges } = buildExchanges(messages, personName);

  const recent = exchanges.slice(-ANALYZE_EXCHANGES);
  const transcript = formatTranscript(turns, recent[0]?.start ?? 0).slice(
    -MAX_TRANSCRIPT_CHARS,
  );

  const profile = (
    await generateText({
      model: ANALYZE_MODEL(),
      system: fillTemplate(ANALYZE_PROMPT, { personName }),
      messages: [{ role: "user", content: transcript }],
      maxTokens: 8000,
      thinking: "LOW",
    })
  ).trim();
  if (!profile) throw new Error("Style analysis came back empty");

  const examples = pickSpreadExamples(exchanges, EXAMPLE_COUNT)
    .map(formatExample)
    .join("\n\n");

  return fillTemplate(PERSONA_TEMPLATE, {
    displayName,
    ownerUsername,
    personName,
    profile,
    examples,
  });
}
