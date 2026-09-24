import React from "react";
import { EMOJI_PICKER } from "../../lib/constants";
import { IconButton } from "../ui/Button";
import {
  CloseIcon,
  FileIcon,
  ImageIcon,
  SendIcon,
  SmileIcon,
} from "../ui/icons";

/**
 * Where you write. Pinned to the bottom of the conversation column and never
 * scrolls, so on a phone it sits directly above the keyboard.
 *
 * "Send" is the one filled button on this screen; emoji and the two attach
 * buttons are quiet icon buttons, each with a spoken label.
 */
export default function MessageComposer({
  onDraftChange,
  onSend,
  disabled,
  placeholder,
  composer,
  showShiftHint = true,
}) {
  const {
    draft,
    emojiOpen,
    setEmojiOpen,
    uploading,
    uploadError,
    setUploadError,
    pendingAttachment,
    setPendingAttachment,
    fileInputRef,
    pdfInputRef,
    insertEmoji,
    attachFile,
    canSend,
  } = composer;

  return (
    <div className="flex-none border-t border-line bg-surface px-3 py-2.5">
      {uploadError ? (
        <div
          role="alert"
          className="mb-2 flex items-center justify-between gap-2 rounded-xl border border-line bg-danger-soft px-3 py-2 text-label text-danger-text"
        >
          <span className="min-w-0">{uploadError}</span>
          <IconButton
            size="iconSm"
            variant="ghost"
            label="Dismiss"
            onClick={() => setUploadError("")}
            className="flex-none"
          >
            <CloseIcon className="h-4 w-4" />
          </IconButton>
        </div>
      ) : null}

      {pendingAttachment ? (
        <div className="mb-2 flex items-center justify-between gap-2 rounded-xl border border-line bg-surface-2 px-3 py-2">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="grid h-9 w-9 flex-none place-items-center rounded-lg bg-surface-3 text-fg-muted">
              <FileIcon className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <div className="truncate text-label font-medium text-fg">
                {pendingAttachment.originalName || "Ready to send"}
              </div>
              <div className="truncate text-meta text-fg-subtle">
                {pendingAttachment.mime}
              </div>
            </div>
          </div>
          <IconButton
            size="iconSm"
            variant="ghost"
            label="Remove this file"
            onClick={() => setPendingAttachment(null)}
          >
            <CloseIcon className="h-4 w-4" />
          </IconButton>
        </div>
      ) : null}

      <div className="flex items-end gap-2">
        <div className="flex min-w-0 flex-1 items-end gap-0.5 rounded-2xl border border-line bg-surface-2 px-1.5 py-1">
          <IconButton
            size="iconSm"
            variant={emojiOpen ? "quiet" : "ghost"}
            label={emojiOpen ? "Close emoji list" : "Add an emoji"}
            aria-expanded={emojiOpen}
            onClick={() => setEmojiOpen((v) => !v)}
          >
            <SmileIcon className="h-5 w-5" />
          </IconButton>

          <textarea
            value={draft}
            onChange={(e) => onDraftChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                onSend();
              }
            }}
            rows={1}
            maxLength={2000}
            disabled={disabled}
            placeholder={placeholder}
            aria-label={placeholder || "Write a message"}
            className="max-h-32 min-w-0 flex-1 resize-none bg-transparent px-1.5 py-2 text-msg text-fg outline-none placeholder:text-fg-subtle disabled:opacity-60"
          />

          <IconButton
            size="iconSm"
            variant="ghost"
            label="Send a photo or video"
            disabled={uploading || disabled}
            onClick={() => fileInputRef.current?.click()}
          >
            <ImageIcon className="h-5 w-5" />
          </IconButton>

          <IconButton
            size="iconSm"
            variant="ghost"
            label="Send a PDF"
            disabled={uploading || disabled}
            onClick={() => pdfInputRef.current?.click()}
          >
            <FileIcon className="h-5 w-5" />
          </IconButton>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/gif,image/webp,video/mp4,video/webm,video/quicktime"
          className="hidden"
          tabIndex={-1}
          onChange={async (e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (file) await attachFile(file);
          }}
        />

        <input
          ref={pdfInputRef}
          type="file"
          accept="application/pdf"
          className="hidden"
          tabIndex={-1}
          onChange={async (e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (file) await attachFile(file);
          }}
        />

        <button
          type="button"
          onClick={onSend}
          disabled={disabled || !canSend}
          aria-label="Send message"
          title="Send message"
          className="grid h-11 w-11 flex-none place-items-center rounded-full bg-accent text-accent-fg transition hover:bg-accent-hover disabled:cursor-not-allowed disabled:bg-surface-3 disabled:text-fg-subtle"
        >
          <SendIcon className="h-5 w-5" />
        </button>
      </div>

      <div className="mt-1.5 flex min-h-[1rem] items-center gap-2 px-1 text-meta text-fg-subtle">
        {uploading ? (
          <span className="flex items-center gap-1.5 text-accent-text" role="status">
            <span className="h-3 w-3 animate-spin rounded-full border-2 border-accent/40 border-t-accent" />
            Uploading your file…
          </span>
        ) : showShiftHint ? (
          <span className="truncate">
            Enter sends · Shift + Enter starts a new line
          </span>
        ) : null}
      </div>

      {emojiOpen ? (
        <div className="mt-2 rounded-xl border border-line bg-surface-2 p-3">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-label font-semibold text-fg">Emoji</p>
            <IconButton
              size="iconSm"
              variant="ghost"
              label="Close emoji list"
              onClick={() => setEmojiOpen(false)}
            >
              <CloseIcon className="h-4 w-4" />
            </IconButton>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {EMOJI_PICKER.map((em) => (
              <button
                key={em}
                type="button"
                onClick={() => insertEmoji(em)}
                className="grid h-10 w-10 place-items-center rounded-lg border border-line bg-surface text-xl transition hover:bg-surface-3"
                aria-label={`Add the ${em} emoji`}
                title={em}
              >
                {em}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
