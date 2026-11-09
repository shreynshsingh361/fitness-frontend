# FitTrack frontend

The web app for FitTrack: track steps, compete with friends and groups, log workouts, a food diary and water, and see
your day on a dashboard. Next.js 16 + TypeScript + Tailwind CSS.

This is a **completely separate project** from the backend (`fitness-backend`). It has no database, no secrets and no
backend code. It only makes HTTP calls to the API gateway, and the one thing it must be told is that gateway's address.

## What you need first

The backend must be running (default `http://localhost:8080`). In the `fitness-backend` folder:

```bash
docker compose up --build
```

Check it: http://localhost:8080/health/services should say `"status":"ok"`.

## Run it

**With Docker** (from this folder):

```bash
docker compose up --build
```

**Or directly, for development** (needs Node.js 20+):

```bash
npm install
npm run dev
```

Either way, open http://localhost:3000, create an account, and log a workout and some food.

## Configuration

| Variable | Default | Meaning |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | `http://localhost:8080` | Address of the API gateway, as the **browser** sees it |

It is written into the JavaScript at build time (see [`.env.example`](.env.example)), so after changing it rebuild
(`docker compose up --build`) or restart `npm run dev`.

The backend also has to allow this app's address (CORS). The defaults cover `http://localhost:3000` and
`http://127.0.0.1:3000`. If you serve the app from somewhere else, add that address to `CORS_ORIGINS` in the backend.

## How it talks to the backend

- All API knowledge is in [`lib/api.ts`](lib/api.ts). Nothing else calls `fetch`.
- [`lib/types.ts`](lib/types.ts) mirrors the API contract, which is owned by the backend
  (`fitness-backend/contracts/openapi.yaml`). When the API changes, update the types here.
- **Login.** After login the tokens are kept in `localStorage` ([`lib/session.ts`](lib/session.ts)). Every request sends the
  access token. If one comes back 401 (expired), the app quietly trades its refresh token for a new pair and retries once;
  several requests failing at the same moment share one refresh, because refresh tokens work only once.
- **No duplicates on retry.** Creating a workout or a diary entry sends a `client_op_id` (a random UUID made once per
  action). If the request is retried after a network failure, the backend returns the saved record instead of adding it twice.
- **Dates** are sent as `YYYY-MM-DD` in the user's own time zone, because "today" depends on where the user is.

## Project layout

```
fitness-frontend/
├── app/                 pages (Next.js App Router)
│   ├── login, register
│   └── (app)/           everything behind the login guard:
│       ├── steps, friends, groups, workouts, nutrition, settings, dashboard
│       ├── groups/[id]/      one group: leaderboard, chat, members, admin settings
│       └── join/             invite links; signed-out visitors return here after signing in
├── components/          shared UI (ui.tsx), nav bar, login/register form, step chart
├── lib/                 api.ts, session.ts, auth.ts, hooks.ts, types.ts, dates.ts, id.ts, format.ts
├── Dockerfile           multi-stage build -> small standalone server
├── docker-compose.yml   runs only this app
└── next.config.ts
```

## Checks

```bash
npm run lint
npm run build
```

## Things to know about this Next.js version

`next.config.ts` turns on `cacheComponents`. With it, calling `new Date()`, `Math.random()` or `crypto.randomUUID()` while a
page *renders* fails the build, because pages are prerendered. So non-deterministic values are only read in event handlers
and effects: `useToday()` in [`lib/hooks.ts`](lib/hooks.ts) gives the local date, and `newId()` in [`lib/id.ts`](lib/id.ts)
makes UUIDs. Colours follow the system light/dark setting automatically.

## Known gaps

- **Steps come only from the mobile app.** A web page cannot read a phone's step sensor, Apple Health or Health Connect, and steps cannot be typed in, so the web app shows steps the phone app synced.
- Group chat re-fetches every 5 seconds instead of using a live connection, and there are no push notifications.
- The green buttons and (in light mode) green links have a contrast of about 3.65:1, below the 4.5:1 WCAG AA minimum for small text.
- Buttons and inputs are 32–38 px tall; phones are happier with 44 px.
- No charts or trends yet, only today's numbers and a 7-day summary.
- There is no manual light/dark switch; it only follows the system.
- Tokens live in `localStorage`, which JavaScript on the page can read. Safer for production: keep the refresh token in an `httpOnly` cookie.
