# Millytour

Millytour is a Vite + React travel platform with a local Express REST backend and SQLite database.

## Local development

```bash
npm install
npm run dev
```

The command starts Vite at `http://localhost:5173`, Express at `http://127.0.0.1:4000`, and initializes `data/millytour.db`. The browser communicates with the backend through `/api`.

## Environment

Copy `.env.example` to `.env.local` and set server-only values there. Private AI and Telegram keys are read by Express and are never exposed through Vite.

Important variables include `GROQ_API_KEY`, `GROQ_MODEL`, `TELEGRAM_MAIN_BOT_TOKEN`, `TELEGRAM_AUTH_BOT_TOKEN`, `TELEGRAM_STATS_BOT_TOKEN`, `OWNER_TELEGRAM_ID`, and optional payment provider variables.

## Architecture

```text
React/Vite -> Express REST API -> SQLite
Telegram   -> Express REST API -> SQLite
Groq       <- Express REST API
```

The existing React routes and UI remain in `src/pages` and `src/components`. REST bindings live in `src/api/client.ts`; database initialization and server routes live in `server/index.mjs`.
