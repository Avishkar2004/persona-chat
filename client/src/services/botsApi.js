import { api } from "../api";

/** Everyone who sent messages in a chat export, busiest first. */
export async function previewBotNames(chatLog) {
  const data = await api("/api/bots/preview", {
    method: "POST",
    body: JSON.stringify({ chatLog }),
  });
  return data.names || [];
}

export async function createBot({ displayName, personName, chatLog }) {
  const data = await api("/api/bots", {
    method: "POST",
    body: JSON.stringify({ displayName, personName, chatLog }),
  });
  return data.bot;
}

export function deleteBot(id) {
  return api(`/api/bots/${encodeURIComponent(id)}`, { method: "DELETE" });
}
