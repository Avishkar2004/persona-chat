/**
 * Turns a WhatsApp "Export chat" .txt into messages, and messages into the
 * exchanges an AI friend learns from.
 *
 * Both export formats are accepted:
 *   iOS:     [15/09/26, 10:42:13 PM] Name: text
 *   Android: 15/09/2026, 22:42 - Name: text
 * Day/month order does not matter — only the order of lines in the file is used.
 */

// Invisible direction marks WhatsApp sprinkles into iOS exports.
const INVISIBLE = /[‎‏‪-‮﻿]/g;

const HEADER =
  /^\[?\d{1,4}[/.-]\d{1,2}[/.-]\d{1,4},?\s+\d{1,2}[:.]\d{2}(?:[:.]\d{2})?(?:\s*[AaPp]\.?\s?[Mm]\.?)?\]?\s*(?:-\s+)?(.*)$/;

// Whole-message placeholders that carry no words from the person.
const DROP_TEXT = [
  /^<media omitted>$/i,
  /^(image|video|audio|sticker|gif|document|contact card) omitted$/i,
  /^<attached: .*>$/i,
  /^this message was deleted\.?$/i,
  /^you deleted this message\.?$/i,
  /^messages and calls are end-to-end encrypted/i,
  /^missed (voice|video) call/i,
  /^waiting for this message/i,
  /^null$/i,
  /^view once (photo|video|message)/i,
];

const EDITED = /\s*<this message was edited>\s*$/i;

const MAX_LINE_CHARS = 300;

function redact(text) {
  return text
    .replace(/https?:\/\/\S+|www\.\S+/gi, "[link]")
    .replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, "[email]")
    .replace(/\+?\d[\d\s-]{8,}\d/g, "[phone number]");
}

function cleanText(text) {
  const trimmed = text.replace(EDITED, "").trim();
  if (!trimmed || DROP_TEXT.some((re) => re.test(trimmed))) return "";
  return redact(trimmed);
}

/**
 * @param {string} raw - the exported .txt contents
 * @returns {{ name: string, text: string }[]} in file order
 */
export function parseChatLog(raw) {
  const messages = [];
  // null while inside a system line, so its continuation lines are dropped too.
  let current = null;

  for (const rawLine of String(raw || "").split(/\r?\n/)) {
    const line = rawLine.replace(INVISIBLE, "");
    const header = HEADER.exec(line);

    if (!header) {
      if (current) current.lines.push(line);
      continue;
    }

    // "Name: text". A header without "Name: " is a system line
    // ("X added Y", "You blocked this contact").
    const rest = header[1];
    const colon = rest.indexOf(": ");
    if (colon <= 0) {
      current = null;
      continue;
    }

    current = { name: rest.slice(0, colon).trim(), lines: [rest.slice(colon + 2)] };
    messages.push(current);
  }

  return messages
    .map((m) => ({ name: m.name, text: cleanText(m.lines.join("\n")) }))
    .filter((m) => m.name && m.text);
}

/** Senders with message counts, busiest first — for the name dropdown. */
export function countSenders(messages) {
  const counts = new Map();
  for (const m of messages) counts.set(m.name, (counts.get(m.name) || 0) + 1);
  return [...counts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);
}

/** Consecutive messages from the same sender, merged into one turn. */
function toTurns(messages) {
  const turns = [];
  for (const m of messages) {
    const last = turns[turns.length - 1];
    if (last && last.name === m.name) last.lines.push(m.text);
    else turns.push({ name: m.name, lines: [m.text] });
  }
  return turns;
}

/**
 * Every place personName replied to someone: the other side's turn(s) since
 * personName last spoke, then personName's reply.
 */
export function buildExchanges(messages, personName) {
  const turns = toTurns(messages);
  const exchanges = [];

  for (let i = 1; i < turns.length; i++) {
    if (turns[i].name !== personName) continue;

    let start = i;
    while (start > 0 && turns[start - 1].name !== personName) start--;
    if (start === i) continue;

    // In a busy group, only the last few turns before the reply matter.
    exchanges.push({ them: turns.slice(Math.max(start, i - 3), i), reply: turns[i], start });
  }
  return { turns, exchanges };
}

function formatTurn(turn) {
  return turn.lines
    .flatMap((text) => text.split("\n"))
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) =>
      line.length > MAX_LINE_CHARS ? `${line.slice(0, MAX_LINE_CHARS)}…` : line,
    )
    .map((line) => `${turn.name}: ${line}`)
    .join("\n");
}

/** Plain "Name: text" transcript, from turn `fromTurn` to the end. */
export function formatTranscript(turns, fromTurn = 0) {
  return turns.slice(fromTurn).map(formatTurn).join("\n");
}

/** `count` exchanges spread evenly over the whole log, oldest first. */
export function pickSpreadExamples(exchanges, count) {
  if (exchanges.length <= count) return exchanges;
  const step = (exchanges.length - 1) / (count - 1);
  return Array.from({ length: count }, (_, k) => exchanges[Math.round(k * step)]);
}

export function formatExample(exchange) {
  return [
    "<example>",
    ...exchange.them.map(formatTurn),
    formatTurn(exchange.reply),
    "</example>",
  ].join("\n");
}
