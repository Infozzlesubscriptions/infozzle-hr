# Infozzle HR Portal

A responsive React administration portal for MD and HR teams. The frontend is API-driven; it contains no fallback business data or static dashboard metrics.

## Stack

- React 19, TypeScript, Vite, Tailwind CSS 4
- React Router, TanStack Query, Axios
- React Hook Form and Zod
- Recharts and FullCalendar
- Vitest and Testing Library

## Setup

```bash
npm install
copy .env.example .env
npm run dev
```

Set `VITE_API_BASE_URL` to the backend API root, without a trailing slash. It defaults to `/api/v1`; Vite proxies `/api` to `http://localhost:4000` in development. Production deployments use `vercel.json` to route client-side URLs to the SPA.

## Authentication contract

The client keeps the access token in memory and sends it as `Authorization: Bearer <token>`. Refresh and logout use `withCredentials`, allowing the backend to keep a secure, HTTP-only refresh cookie.

- `POST /auth/login` body: `{ email, password }`; response: `{ accessToken, user }`
- `POST /auth/refresh` response: `{ accessToken, user }`
- `POST /auth/logout`

The refresh endpoint is called on startup and once after a `401`. Concurrent refreshes are deduplicated. Only `MD` and `HR` users enter the app, but every authorization decision must also be enforced by the backend.

## API resources

The UI uses conventional REST endpoints rooted at `VITE_API_BASE_URL`:

- `/dashboard`, `/departments`, `/employees`
- `/leave`, `/leave/balances`, `/wfh`, `/wfh/usage`
- `/calendar/events`, `/calendar/holidays`
- `/onboarding` and onboarding task endpoints
- `/reports/:report`, `/notifications`, `/audit-logs`
- `/settings`, `/settings/company`, `/settings/wfh`, `/settings/leave-types`, `/settings/users`

The Axios interceptor unwraps successful JSON `{ success, data, meta }` envelopes into `response.data` while preserving the `AxiosResponse`; Blob responses remain untouched. Backend `{ error }` envelopes drive displayed errors.

## Quality commands

```bash
npm run typecheck
npm test
npm run build
```
