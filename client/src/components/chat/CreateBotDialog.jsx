import React, { useEffect, useRef, useState } from "react";
import Button, { IconButton } from "../ui/Button";
import { CloseIcon, FileIcon, SparklesIcon, UploadIcon } from "../ui/icons";
import { createBot, previewBotNames } from "../../services/botsApi";

const MIN_MESSAGES = 30;
const MAX_FILE_BYTES = 10 * 1024 * 1024;

const INPUT =
  "w-full rounded-lg border border-line bg-surface-2 px-3 text-base text-fg outline-none transition placeholder:text-fg-subtle focus:border-accent disabled:opacity-60";

/**
 * Three steps on one sheet: give it a name, hand over a WhatsApp export, pick
 * whose texting to copy. Mounted only while open, so every visit starts clean.
 */
export default function CreateBotDialog({ onClose, onCreated }) {
  const dialogRef = useRef(null);
  const fileRef = useRef(null);

  const [displayName, setDisplayName] = useState("");
  const [chatLog, setChatLog] = useState("");
  const [fileName, setFileName] = useState("");
  const [names, setNames] = useState(null);
  const [personName, setPersonName] = useState("");
  const [finding, setFinding] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  // A different chat means the old list of names no longer applies.
  function changeChat(text, name = "") {
    setChatLog(text);
    setFileName(name);
    setNames(null);
    setPersonName("");
    setError("");
  }

  function onFile(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > MAX_FILE_BYTES) {
      setError("That file is over 10 MB. Export the chat without media and try again.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => changeChat(String(reader.result || ""), file.name);
    reader.onerror = () => setError("Couldn’t read that file. Try pasting the chat instead.");
    reader.readAsText(file);
  }

  async function findNames() {
    setFinding(true);
    setError("");
    try {
      const found = await previewBotNames(chatLog);
      setNames(found);
      const eligible = found.filter((n) => n.count >= MIN_MESSAGES);
      if (eligible.length === 1) pickPerson(eligible[0].name);
      if (!eligible.length) {
        setError(`Nobody in this chat has ${MIN_MESSAGES} or more messages yet.`);
      }
    } catch (e) {
      setError(e.message || "Couldn’t read that chat");
    } finally {
      setFinding(false);
    }
  }

  function pickPerson(name) {
    setPersonName(name);
    if (name && !displayName.trim()) setDisplayName(name.split(/\s+/)[0].slice(0, 32));
  }

  async function create() {
    setCreating(true);
    setError("");
    try {
      const bot = await createBot({
        displayName: displayName.trim(),
        personName,
        chatLog,
      });
      await onCreated(bot);
      onClose();
    } catch (e) {
      setError(e.message || "Couldn’t create the AI friend");
      setCreating(false);
    }
  }

  const busy = finding || creating;
  const canCreate = Boolean(displayName.trim() && personName && !busy);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="create-bot-title"
      onCancel={(e) => {
        e.preventDefault();
        if (!creating) onClose();
      }}
      onClick={(e) => {
        // A click on the dimmed backdrop lands on the <dialog> itself.
        if (e.target === dialogRef.current && !creating) onClose();
      }}
      className="m-auto max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] max-w-lg overflow-hidden rounded-2xl border border-line bg-surface p-0 text-fg shadow-xl backdrop:bg-black/50"
    >
      <div className="flex max-h-[calc(100dvh-2rem)] flex-col">
        <header className="flex flex-none items-start gap-3 border-b border-line px-4 py-3">
          <span className="mt-0.5 grid h-9 w-9 flex-none place-items-center rounded-full bg-accent-soft text-accent-text">
            <SparklesIcon className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 id="create-bot-title" className="text-msg font-semibold text-fg">
              Create an AI friend
            </h2>
            <p className="text-label text-fg-muted">
              It learns how someone texts from a WhatsApp chat, then chats with you
              the same way.
            </p>
          </div>
          <IconButton
            size="iconSm"
            variant="ghost"
            label="Close"
            onClick={onClose}
            disabled={creating}
            className="-mr-1 flex-none"
          >
            <CloseIcon className="h-4 w-4" />
          </IconButton>
        </header>

        <div className="scrollbar-slim min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4">
          <Step number={1} label="Name" htmlFor="bot-display-name">
            <input
              id="bot-display-name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              maxLength={32}
              placeholder="e.g. Gayatri"
              autoComplete="off"
              disabled={creating}
              className={`h-10 ${INPUT}`}
            />
          </Step>

          <Step
            number={2}
            label="The chat"
            hint="In WhatsApp: open the chat → ⋮ → More → Export chat → Without media."
            htmlFor={fileName ? undefined : "bot-chat-log"}
          >
            <input
              ref={fileRef}
              type="file"
              accept=".txt,text/plain"
              onChange={onFile}
              className="sr-only"
              tabIndex={-1}
              aria-hidden="true"
            />
            {fileName ? (
              <div className="flex items-center gap-2 rounded-lg border border-line bg-surface-2 px-3 py-2">
                <FileIcon className="h-4 w-4 flex-none text-fg-subtle" />
                <span className="min-w-0 flex-1 truncate text-label text-fg">
                  {fileName}
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => changeChat("")}
                  disabled={busy}
                  className="-my-1 flex-none"
                >
                  Remove
                </Button>
              </div>
            ) : (
              <>
                <Button
                  onClick={() => fileRef.current?.click()}
                  disabled={busy}
                  block
                >
                  <UploadIcon className="h-4 w-4" />
                  Upload the .txt file
                </Button>
                <p className="my-2 text-center text-meta text-fg-subtle">or paste it</p>
                <textarea
                  id="bot-chat-log"
                  value={chatLog}
                  onChange={(e) => changeChat(e.target.value)}
                  rows={4}
                  placeholder="15/09/2026, 22:42 - Gayatri: hii"
                  disabled={busy}
                  className={`scrollbar-slim resize-y py-2 font-mono text-label ${INPUT}`}
                />
              </>
            )}
          </Step>

          <Step number={3} label="Whose texting should it copy?" htmlFor="bot-person">
            {names ? (
              <select
                id="bot-person"
                value={personName}
                onChange={(e) => pickPerson(e.target.value)}
                disabled={creating}
                className={`h-10 ${INPUT}`}
              >
                <option value="">Choose a person</option>
                {names.map((n) => (
                  <option key={n.name} value={n.name} disabled={n.count < MIN_MESSAGES}>
                    {n.name} — {n.count} message{n.count === 1 ? "" : "s"}
                    {n.count < MIN_MESSAGES ? " (too few)" : ""}
                  </option>
                ))}
              </select>
            ) : (
              <Button
                onClick={findNames}
                disabled={!chatLog.trim() || busy}
                block
              >
                {finding ? <Spinner /> : null}
                {finding ? "Reading names…" : "Find names in this chat"}
              </Button>
            )}
          </Step>

          {error ? (
            <p
              role="alert"
              className="rounded-xl border border-line bg-danger-soft px-3 py-2.5 text-label text-danger-text"
            >
              {error}
            </p>
          ) : null}
        </div>

        <footer className="flex-none border-t border-line px-4 py-3">
          {creating ? (
            <p role="status" className="mb-2 text-label text-fg-muted">
              Learning how {personName} texts. This takes about 20 seconds.
            </p>
          ) : (
            <p className="mb-2 text-meta text-fg-subtle">
              The chat is read once. Only a style summary and some example replies
              are kept.
            </p>
          )}
          <div className="flex gap-2">
            <Button onClick={onClose} disabled={creating} className="flex-1">
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={create}
              disabled={!canCreate}
              className="flex-1"
            >
              {creating ? <Spinner /> : null}
              {creating ? "Creating…" : "Create"}
            </Button>
          </div>
        </footer>
      </div>
    </dialog>
  );
}

function Step({ number, label, hint, htmlFor, children }) {
  const Label = htmlFor ? "label" : "p";
  return (
    <section>
      <Label
        htmlFor={htmlFor}
        className="mb-1.5 flex items-center gap-2 text-label font-medium text-fg"
      >
        <span className="grid h-5 w-5 flex-none place-items-center rounded-full border border-line bg-surface-2 text-meta text-fg-muted">
          {number}
        </span>
        {label}
      </Label>
      {hint ? <p className="mb-2 text-meta text-fg-subtle">{hint}</p> : null}
      {children}
    </section>
  );
}

function Spinner() {
  return (
    <span
      aria-hidden="true"
      className="h-4 w-4 flex-none animate-spin rounded-full border-2 border-current border-t-transparent motion-reduce:animate-none"
    />
  );
}
