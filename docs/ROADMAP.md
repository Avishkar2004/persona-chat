# Chat App Roadmap

Current state: auth (JWT cookie), friends system, public rooms, friend DMs, uploads
(image/video/pdf), typing indicators, read receipts, light/dark theme.

Five gaps, ranked by value.

## 1. Real online presence

**Status:** done

The green dot on a friend now reflects a real socket.

- [`server/socket/presence.js`](../server/socket/presence.js) keeps a
  `Map<userId, socketCount>` — a count, not a boolean, so closing one of three
  tabs does not mark you offline.
- Every socket joins a `user:<id>` room, so
  [`server/socket.js`](../server/socket.js) can push `presence` to all of a
  friend's tabs. New sockets get a `presenceSnapshot` of the whole friends list;
  the client re-asks with `presenceSync` when that list changes.
- `lastSeenAt` on [`server/models/User.js`](../server/models/User.js) is stamped
  when the last socket closes, and rendered as "Last seen 5 minutes ago" in both
  the friends list and the conversation header.

## 2. Unread badges per friend

**Status:** not started · **Estimate:** ~40 min

Nothing counts unread messages. `readAt` is already stored on every message, so
this is one aggregate query — no schema change.

- Count messages where `kind: "dm"`, `to: <me>`, `readAt: null`, grouped by sender.
- Render a count pill in
  [`client/src/components/chat/FriendsSidebar.jsx`](../client/src/components/chat/FriendsSidebar.jsx).
- Clear it on `dmMarkRead`, which already exists in the socket layer.

## 3. Reply / edit / delete a message

**Status:** not started · **Estimate:** ~2 hours for all three

The WhatsApp look is in place but the interactions behind it are not.

- Add `replyTo`, `editedAt`, `deletedAt` to
  [`server/models/Message.js`](../server/models/Message.js).
- Add a hover menu to
  [`client/src/components/chat/MessageBubble.jsx`](../client/src/components/chat/MessageBubble.jsx).
- Deleted messages stay as rows and render as "This message was deleted" —
  simpler than removing them from every connected client's list.

## 4. Emoji reactions

**Status:** not started · **Estimate:** ~1 hour

- `reactions: [{ emoji, username }]` on the message schema.
- One socket event to toggle; re-sending the same emoji removes it.
- Render grouped counts under the bubble.

## 5. Notifications when the tab is inactive

**Status:** not started · **Estimate:** ~20 min

Cheapest win of the five.

- Gate on `document.hidden` so it never fires while the chat is visible.
- `Notification` API for the popup, short audio clip for the sound.
- Ask for permission on first send, not on page load.

## AI friend

**Status:** done

A bot that texts like a real person, learned from an uploaded WhatsApp export.
It is an ordinary `User` with `isBot: true`, so bubbles, blue ticks, typing and
presence all come from the existing friend-DM code.

- **Create:** "Create AI friend" in
  [`FriendsSidebar.jsx`](../client/src/components/chat/FriendsSidebar.jsx) opens
  [`CreateBotDialog.jsx`](../client/src/components/chat/CreateBotDialog.jsx).
  `POST /api/bots/preview` lists senders; `POST /api/bots` builds the bot
  ([`server/routes/bots.js`](../server/routes/bots.js)).
- **Parsing:** [`server/services/chatLog.js`](../server/services/chatLog.js)
  reads both iOS and Android export formats, drops media, deleted and system
  lines, and redacts links, emails and phone numbers.
- **Persona:** [`server/services/botProfile.js`](../server/services/botProfile.js)
  makes one Gemini call for a style profile (recent ~400 exchanges), then adds
  40 real exchanges spread across the whole log. Stored as `botPersona`
  (`select: false`); the raw log is never stored. Prompts live in
  [`botPrompts.js`](../server/services/botPrompts.js).
- **Replying:** [`server/services/bot.js`](../server/services/bot.js), called
  from the `dmMessage` socket handler. Marks read, waits 0.8–2 s, types, sends
  1–4 bubbles paced by length. One reply per room at a time; texts that arrive
  mid-reply queue one more pass, so a burst gets one answer.
- **Limits:** 20 bot replies per owner per minute (extras dropped). Bots cannot
  log in, cannot receive friend requests, and are always shown online.
- **Config** (`server/.env`): `GEMINI_API_KEY` required. `BOT_ANALYZE_MODEL` and
  `BOT_REPLY_MODEL` default to `gemini-3.5-flash`. Pro models have no free-tier
  quota.

Not done yet:

- Rate limit and in-flight state are in memory, so they reset on restart and
  do not work across several server processes.
- No way to re-train a bot on a newer export; delete and create again.

## Known issues (not features)

- **No rate limiting** on the `sendMessage` and `dmMessage` socket handlers in
  [`server/socket.js`](../server/socket.js). A client can flood MongoDB with
  writes as fast as it can emit.
- **`/uploads` is served publicly** by
  [`server/index.js`](../server/index.js). Filenames are random, but anyone with
  a URL can read a private attachment while logged out.
