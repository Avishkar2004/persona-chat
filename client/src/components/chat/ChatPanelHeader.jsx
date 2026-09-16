import React, { useState } from "react";
import AiPill from "../ui/AiPill";
import Avatar from "../ui/Avatar";
import ConnectionStatus from "./ConnectionStatus";
import Button, { IconButton } from "../ui/Button";
import { ArrowLeftIcon, TrashIcon, UsersIcon } from "../ui/icons";

/**
 * Who (or what) you are looking at. On a phone this is also the way back to
 * the chat list — the arrow on the left.
 */
export default function ChatPanelHeader({
  title,
  subtitle,
  avatarName,
  avatarOnline,
  isGroup = false,
  isBot = false,
  onDeleteBot,
  connected,
  onBack,
}) {
  // Deleting an AI friend also wipes the chat, so it takes two taps.
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <header className="flex flex-none items-center gap-2 border-b border-line bg-surface px-2 py-2 sm:px-3">
      {onBack ? (
        <IconButton
          variant="ghost"
          label="Back to your chats"
          onClick={onBack}
          className="md:hidden"
        >
          <ArrowLeftIcon className="h-5 w-5" />
        </IconButton>
      ) : null}

      {isGroup ? (
        <span className="grid h-10 w-10 flex-none place-items-center rounded-full bg-surface-3 text-fg-muted">
          <UsersIcon className="h-5 w-5" />
        </span>
      ) : avatarName ? (
        <Avatar name={avatarName} size="md" online={avatarOnline} />
      ) : null}

      {confirmDelete ? (
        <>
          <p className="min-w-0 flex-1 text-label text-fg">
            Delete {title} and this chat?
          </p>
          <Button
            size="sm"
            variant="danger"
            onClick={() => {
              setConfirmDelete(false);
              onDeleteBot();
            }}
            className="flex-none"
          >
            Delete
          </Button>
          <Button size="sm" onClick={() => setConfirmDelete(false)} className="flex-none">
            Keep
          </Button>
        </>
      ) : (
        <>
          <div className="min-w-0 flex-1">
            <h2 className="flex min-w-0 items-center gap-1.5 text-msg font-semibold text-fg">
              <span className="truncate">{title}</span>
              {isBot ? <AiPill /> : null}
            </h2>
            {subtitle ? (
              <p className="truncate text-meta text-fg-subtle">{subtitle}</p>
            ) : null}
          </div>

          <ConnectionStatus connected={connected} />

          {isBot && onDeleteBot ? (
            <IconButton
              variant="ghost"
              label="Delete AI friend"
              onClick={() => setConfirmDelete(true)}
            >
              <TrashIcon className="h-5 w-5" />
            </IconButton>
          ) : null}
        </>
      )}
    </header>
  );
}
