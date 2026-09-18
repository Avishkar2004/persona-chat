# Persona Chat (React + Express + MongoDB)

A real-time chat app with rooms, friends and DMs. You can also create an
**AI friend** from a WhatsApp chat export: it learns how one person in that
chat texts, then replies to you in a DM the way they would.

## Features

- **Accounts:** sign up / log in with an httpOnly JWT cookie
- **Rooms:** public `General` and `Help` rooms
- **Friends:** send, accept, decline, cancel and remove friend requests
- **DMs:** typing indicator, read receipts (ticks), emoji, and image / video / PDF attachments
- **Online presence:** a green dot for friends who are online, "Last seen 5 minutes ago" for those who are not
- **AI friends:** built from a WhatsApp export using Google Gemini
- **Themes:** Light, Dark or System

Messages are stored in MongoDB and reload when you open a room or DM (last 100
per conversation).

## Project structure

- `client/`: React app (CRACO + Tailwind)
- `server/`: Express API + Socket.IO + MongoDB (Mongoose)
- `docs/ROADMAP.md`: what is done, what is next, known issues

## Prerequisites

- Node.js 24
- MongoDB running locally, or a MongoDB Atlas connection string
- A Gemini API key from [Google AI Studio](https://aistudio.google.com/apikey) (only needed for AI friends)

## Setup

### 1) Server env

Create `server/.env`:

```env
PORT=8000
MONGO_URI=mongodb://localhost:27017/Persona-Chat
CLIENT_ORIGIN=http://localhost:3000
JWT_SECRET=<any long random string>
GEMINI_API_KEY=<your key>

# Optional: Gemini models used by AI friends (both default to gemini-3.5-flash)
# BOT_ANALYZE_MODEL=gemini-3.5-flash
# BOT_REPLY_MODEL=gemini-3.5-flash
```

### 2) Install dependencies

```bash
cd server && npm install
cd ../client && npm install
```

### 3) Run in dev

In one terminal:

```bash
cd server
npm run dev
```

In another terminal:

```bash
cd client
npm start
```

Open `http://localhost:3000`.

## AI friends

1. In WhatsApp, open a chat → ⋮ → More → Export chat → **Without media**
2. In the app, open Friends → **Create AI friend**
3. Upload the `.txt` file (or paste it), pick whose texting style to copy, and give it a name
4. Open the new friend's DM and send a message

How it works:

- Both iOS and Android export formats are read. Media, deleted messages and
  system lines are dropped; links, emails and phone numbers are redacted.
- One Gemini call writes a style profile from the recent part of the chat, and
  40 real exchanges from across the whole chat are added as examples. Only this
  profile is saved. The raw export is never stored.
- The person needs at least 30 messages in the export. The file limit is 10 MB.
- Replies read the message, pause, show "typing…", then send 1 to 4 short
  bubbles. Limit: 20 AI replies per user per minute.
- AI friends cannot log in or receive friend requests. Deleting one also
  deletes its DM history.

WhatsApp exports are private. `ChatWithFriend/` and `server/uploads/` are in
`.gitignore`, so keep exports in a gitignored folder.

## API

Base URL: `http://localhost:8000`. Every `/api` route except register, login,
logout and health needs the auth cookie.

### Auth

- `POST /api/auth/register`: body `{ "email", "username", "password" }` (password at least 8 characters)
- `POST /api/auth/login`: body `{ "emailOrUsername", "password" }`
- `POST /api/auth/logout`
- `GET /api/auth/me`

The server sets an httpOnly cookie named `token`. The client uses
`fetch(..., { credentials: "include" })` so the cookie is sent.

### Friends

- `GET /api/friends/state`: returns `{ friends, incoming, outgoing }`

These take body `{ "username" }`:

- `POST /api/friends/request`
- `POST /api/friends/accept`
- `POST /api/friends/decline`
- `POST /api/friends/cancel`
- `POST /api/friends/remove`

### Uploads

- `POST /api/uploads`: multipart field `file` (image, video or PDF, up to 25 MB). Returns `{ url, mime, originalName }`
- `GET /uploads/<file>`: serves uploaded files (public, no cookie needed)

### AI friends

- `POST /api/bots/preview`: body `{ "chatLog" }`. Returns the senders in the export with message counts
- `POST /api/bots`: body `{ "chatLog", "personName", "displayName" }`. Creates the AI friend
- `DELETE /api/bots/:id`

### Health check

- `GET /api/health` → `{ ok: true }`

### Socket.IO

Rooms, DMs, typing, read receipts and presence run over Socket.IO on the same
port, authenticated by the same cookie. Events are in `server/socket.js`.

## Deploy (one service)

In production the Express server also serves the React build, so the app, API,
Socket.IO and auth cookie all share one URL. The root `package.json` has the
scripts any Node host needs:

- Build command: `npm run build`
- Start command: `npm start`

Environment variables:

```env
NODE_ENV=production
MONGO_URI=<MongoDB Atlas connection string>
JWT_SECRET=<long random string>
GEMINI_API_KEY=<your key>
CLIENT_ORIGIN=https://<your-app-url>
# Optional: where uploads are stored, e.g. a mounted persistent volume
UPLOAD_DIR=/data/uploads
```

For MongoDB Atlas, allow access from anywhere (`0.0.0.0/0`) under Network
Access, since free hosts have no fixed IP.

### Render (free plan)

1. New → Web Service → connect this GitHub repo
2. Leave Root Directory empty, set the build and start commands above, pick the Free instance
3. Add the environment variables above (skip `UPLOAD_DIR`)

The free plan sleeps after 15 minutes idle (the next visit takes about a minute)
and its disk is wiped whenever it sleeps, restarts or redeploys, so uploaded
files do not last there.
