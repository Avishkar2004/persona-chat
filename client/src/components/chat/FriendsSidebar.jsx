import React, { useRef, useState } from "react";
import AiPill from "../ui/AiPill";
import Avatar from "../ui/Avatar";
import Button, { IconButton } from "../ui/Button";
import CreateBotDialog from "./CreateBotDialog";
import EmptyState from "./EmptyState";
import {
  CheckIcon,
  ChatIcon,
  CloseIcon,
  SparklesIcon,
  TrashIcon,
  UserPlusIcon,
} from "../ui/icons";
import { presenceText } from "../../lib/format";
import { displayHandle } from "../../lib/usernames";

/**
 * The "Direct messages" tab: one row per person you can message, the requests
 * waiting on you, and the box for adding someone new.
 *
 * Wording is deliberately plain — "username", not "handle"; "waiting for them
 * to accept", not "outgoing pending".
 */
export default function FriendsSidebar({
  loading,
  error,
  notice,
  onDismissError,
  onDismissNotice,
  submitting,
  state,
  addUsername,
  setAddUsername,
  canRequest,
  onRequest,
  onAccept,
  onDecline,
  onCancel,
  onRemove,
  onDeleteBot,
  onBotCreated,
  selectedFriend,
  onSelectFriend,
  presence = {},
}) {
  // Which person is one tap away from being removed (two-step, so nobody
  // deletes a friend by accident).
  const [confirmRemove, setConfirmRemove] = useState(null);
  const [creatingBot, setCreatingBot] = useState(false);
  const addInputRef = useRef(null);

  const incoming = state.incoming || [];
  const outgoing = state.outgoing || [];
  const friends = state.friends || [];

  // With nothing at all on the screen, "Add" becomes the one filled button.
  const firstTime = !loading && !friends.length && !incoming.length && !outgoing.length;

  return (
    <div
      id="panel-direct"
      role="tabpanel"
      aria-labelledby="tab-direct"
      className="flex min-h-0 flex-1 flex-col"
    >
      <div className="flex-none border-b border-line px-3 py-3">
        <label
          htmlFor="add-friend-username"
          className="block text-label font-medium text-fg"
        >
          Add someone by username
        </label>
        <div className="mt-1.5 flex gap-2">
          <div className="relative min-w-0 flex-1">
            <UserPlusIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-subtle" />
            <input
              id="add-friend-username"
              ref={addInputRef}
              value={addUsername}
              onChange={(e) => setAddUsername(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !submitting) onRequest();
              }}
              placeholder="e.g. john"
              autoComplete="off"
              className="h-10 w-full rounded-lg border border-line bg-surface-2 pl-9 pr-3 text-base text-fg outline-none transition placeholder:text-fg-subtle focus:border-accent"
            />
          </div>
          <Button
            variant={firstTime ? "primary" : "quiet"}
            onClick={onRequest}
            disabled={!canRequest || submitting}
          >
            Add
          </Button>
        </div>
        <Button
          variant="ghost"
          size="sm"
          block
          onClick={() => setCreatingBot(true)}
          className="mt-2"
        >
          <SparklesIcon className="h-4 w-4" />
          Create AI friend
        </Button>
        {creatingBot ? (
          <CreateBotDialog
            onClose={() => setCreatingBot(false)}
            onCreated={onBotCreated}
          />
        ) : null}
      </div>

      <div className="scrollbar-slim min-h-0 flex-1 overflow-y-auto px-3 py-3">
        {error ? (
          <Banner tone="error" onDismiss={onDismissError}>
            {error}
          </Banner>
        ) : null}
        {notice ? (
          <Banner tone="success" onDismiss={onDismissNotice}>
            {notice}
          </Banner>
        ) : null}

        {loading ? (
          <ul className="space-y-2">
            {[0, 1, 2].map((i) => (
              <li
                key={i}
                className="h-14 animate-pulse rounded-xl border border-line bg-surface-2"
              />
            ))}
            <li className="sr-only">Loading your chats…</li>
          </ul>
        ) : (
          <>
            {incoming.length ? (
              <section className="mb-4">
                <SectionTitle>
                  {incoming.length === 1
                    ? "1 person wants to chat"
                    : `${incoming.length} people want to chat`}
                </SectionTitle>
                <ul className="space-y-2">
                  {incoming.map((u) => (
                    <li
                      key={u.id}
                      className="rounded-xl border border-line bg-surface-2 p-2.5"
                    >
                      <div className="flex min-w-0 items-center gap-2">
                        <Avatar name={u.username} size="sm" />
                        <span className="truncate text-msg font-medium text-fg">
                          {displayHandle(u.username)}
                        </span>
                      </div>
                      <div className="mt-2.5 flex gap-2">
                        <Button
                          size="sm"
                          variant="positive"
                          onClick={() => onAccept(u.username)}
                          disabled={submitting}
                          className="flex-1"
                        >
                          <CheckIcon className="h-4 w-4" />
                          Accept
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => onDecline(u.username)}
                          disabled={submitting}
                          className="flex-1"
                        >
                          <CloseIcon className="h-4 w-4" />
                          Ignore
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            {outgoing.length ? (
              <section className="mb-4">
                <SectionTitle>Waiting for them to accept</SectionTitle>
                <ul className="space-y-2">
                  {outgoing.map((u) => (
                    <li
                      key={u.id}
                      className="flex items-center gap-2 rounded-xl border border-line px-2.5 py-2"
                    >
                      <Avatar name={u.username} size="sm" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-msg text-fg">
                          {displayHandle(u.username)}
                        </span>
                        <span className="block text-meta text-fg-subtle">
                          Request sent
                        </span>
                      </span>
                      <Button
                        size="sm"
                        onClick={() => onCancel(u.username)}
                        disabled={submitting}
                        className="flex-none"
                      >
                        Cancel
                      </Button>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            <section>
              {friends.length ? (
                <>
                  <SectionTitle>
                    {friends.length === 1 ? "1 chat" : `${friends.length} chats`}
                  </SectionTitle>
                  <ul className="space-y-1">
                    {friends.map((f) => {
                      const active = selectedFriend?.username === f.username;
                      const confirming = confirmRemove === f.username;
                      const here = presence[f.username];
                      // Before the server has said anything, fall back to the
                      // old copy rather than claiming someone is offline.
                      const status = presenceText(here);

                      if (confirming) {
                        return (
                          <li
                            key={f.id}
                            className="rounded-xl border border-line bg-surface-2 p-2.5"
                          >
                            <p className="text-label text-fg">
                              {f.isBot
                                ? `Delete the AI friend ${displayHandle(f.username)} and this chat?`
                                : `Remove ${displayHandle(f.username)} and delete this chat?`}
                            </p>
                            <div className="mt-2.5 flex gap-2">
                              <Button
                                size="sm"
                                variant="danger"
                                disabled={submitting}
                                onClick={() => {
                                  if (f.isBot) onDeleteBot(f);
                                  else onRemove(f.username);
                                  setConfirmRemove(null);
                                }}
                                className="flex-1"
                              >
                                <TrashIcon className="h-4 w-4" />
                                {f.isBot ? "Delete" : "Remove"}
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => setConfirmRemove(null)}
                                className="flex-1"
                              >
                                Keep
                              </Button>
                            </div>
                          </li>
                        );
                      }

                      return (
                        <li key={f.id} className="relative">
                          <button
                            type="button"
                            onClick={() => onSelectFriend(f)}
                            aria-current={active ? "true" : undefined}
                            className={[
                              "flex w-full items-center gap-2.5 rounded-xl border px-2.5 py-2 pr-11 text-left transition",
                              active
                                ? "border-accent bg-accent-soft"
                                : "border-transparent hover:bg-surface-2",
                            ].join(" ")}
                          >
                            <Avatar
                              name={f.username}
                              size="sm"
                              online={here?.online}
                            />
                            <span className="min-w-0 flex-1">
                              <span className="flex min-w-0 items-center gap-1.5">
                                <span className="truncate text-msg font-medium text-fg">
                                  {displayHandle(f.username)}
                                </span>
                                {f.isBot ? <AiPill /> : null}
                              </span>
                              <span
                                className={[
                                  "block truncate text-meta",
                                  here?.online
                                    ? "text-positive-text"
                                    : "text-fg-subtle",
                                ].join(" ")}
                              >
                                {status || (active ? "Open now" : "Tap to open")}
                              </span>
                            </span>
                            {active ? (
                              <CheckIcon className="h-4 w-4 flex-none text-accent-text" />
                            ) : null}
                          </button>

                          <span className="absolute right-1.5 top-1/2 -translate-y-1/2">
                            <IconButton
                              size="iconSm"
                              variant="ghost"
                              label={
                                f.isBot
                                  ? `Delete AI friend ${displayHandle(f.username)}`
                                  : `Remove ${displayHandle(f.username)}`
                              }
                              disabled={submitting}
                              onClick={() => setConfirmRemove(f.username)}
                            >
                              <TrashIcon className="h-4 w-4" />
                            </IconButton>
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </>
              ) : (
                <EmptyState
                  icon={ChatIcon}
                  title="You have no chats yet"
                  description="Add a friend by username to start. Type their username in the box above and press Add."
                  action={
                    firstTime ? null : (
                      <Button onClick={() => addInputRef.current?.focus()}>
                        Add a friend
                      </Button>
                    )
                  }
                />
              )}
            </section>
          </>
        )}
      </div>
    </div>
  );
}

function SectionTitle({ children }) {
  return (
    <h2 className="mb-2 text-meta font-semibold uppercase tracking-wide text-fg-subtle">
      {children}
    </h2>
  );
}

function Banner({ tone, onDismiss, children }) {
  const styles =
    tone === "success"
      ? "border-line bg-positive-soft text-positive-text"
      : "border-line bg-danger-soft text-danger-text";
  return (
    <div
      role="status"
      aria-live="polite"
      className={`mb-3 flex items-start justify-between gap-2 rounded-xl border px-3 py-2.5 text-label ${styles}`}
    >
      <span className="min-w-0">{children}</span>
      {onDismiss ? (
        <IconButton
          size="iconSm"
          variant="ghost"
          label="Dismiss this message"
          onClick={onDismiss}
          className="-my-1 -mr-1 flex-none"
        >
          <CloseIcon className="h-4 w-4" />
        </IconButton>
      ) : null}
    </div>
  );
}
