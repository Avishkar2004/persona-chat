# ChatApp (React + Express + MongoDB)

A simple chat app starter with **cookie-based authentication**and a protected “Chat” page.

## Project structure

- `client/`: React app (CRACO + Tailwind)
- `server/`: Express API + MongoDB (Mongoose)

## Prerequisites

- Node.js (recommended: latest LTS)
- MongoDB running locally or a MongoDB connection string

## Setup

### 1) Server env

Create / update `server/.env`:

```env
PORT=8000
MONGO_URI=mongodb://localhost:27017/Persona-Chat
CLIENT_ORIGIN=http://localhost:3000
JWT_SECRET=According-to-you
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

## Authentication API

Base URL: `http://localhost:8000`

- `POST /api/auth/register`
  - body: `{ "email": "...", "username": "...", "password": "..." }`
- `POST /api/auth/login`
  - body: `{ "emailOrUsername": "...", "password": "..." }`
- `POST /api/auth/logout`
- `GET /api/auth/me` (requires auth cookie)

Notes:
- The server sets an httpOnly cookie named `token`.
- The client uses `fetch(..., { credentials: "include" })` so cookies are sent.
- Chat messages (rooms + DMs) are stored in MongoDB and reload when you open a room or friend chat (last 100 messages per conversation).

## Health check

- `GET /api/health` → `{ ok: true }`