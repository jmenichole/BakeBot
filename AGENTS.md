# AGENTS.md

## Cursor Cloud specific instructions

Bake Ops is a single Next.js 15 app (in `app/`) backed by Supabase (Postgres + Auth). The
root `package.json` delegates to `app/` (it is not a real npm workspace). Standard commands
live in the root and `app/package.json`; see `CLAUDE.md` for a fuller overview. Note the
repo's `README.md` / `SETUP.md` describe an outdated Express/Postgres architecture that no
longer exists — the actual backend is Next.js API routes + Supabase.

### Commands (from repo root)
- Dev server: `npm run dev:app` → http://localhost:3000
- Lint: `npm run lint`
- Tests: `npm test --prefix app` (Jest; currently only `app/src/lib/pricing.test.ts`)
- Build: `npm run build`

### Local Supabase (required for auth, dashboard, orders, etc.)
The dependency update script only installs npm packages. Docker, the Supabase CLI, and the
local Supabase stack are runtime infrastructure and are NOT started by the update script —
start them yourself when you need auth/DB:

1. Ensure the Docker daemon is running (this environment needs it started manually and with
   specific flags). If `docker info` fails:
   - `sudo dockerd > /tmp/dockerd.log 2>&1 &` (Docker is configured for `fuse-overlayfs`
     with `containerd-snapshotter` disabled in `/etc/docker/daemon.json`, and uses
     `iptables-legacy` — required for this VM's kernel).
   - `sudo chmod 666 /var/run/docker.sock` so the `ubuntu` user can talk to Docker.
2. Start Supabase: `supabase start` (run from repo root; pulls images on first run, ~1 min
   thereafter). It prints the API URL and keys.
3. Populate `app/.env.local` with the printed values:
   - `NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY=<ANON_KEY>`
   - `SUPABASE_SERVICE_ROLE_SECRET_KEY=<SERVICE_ROLE_KEY>`
   - `NEXT_PUBLIC_APP_URL=http://localhost:3000`
   `app/.env.local` is gitignored; `app/.env.example` documents every variable. Restart the
   dev server after editing `.env.local` (Next.js only reads env at startup).

### Non-obvious gotchas
- Migration `supabase/migrations/007b_settings_and_cleanup.sql` is SILENTLY SKIPPED by
  `supabase start`/`db reset` because its filename doesn't match the CLI's
  `<timestamp>_name.sql` pattern (all other migrations use numeric prefixes that the CLI
  still accepts). After starting Supabase, apply it manually or the `bakers.email_leads` /
  `bakers.order_updates` columns used by the settings page will be missing:
  `docker exec -i $(docker ps --filter name=supabase_db --format '{{.Names}}' | head -1) psql -U postgres -d postgres < supabase/migrations/007b_settings_and_cleanup.sql`
- Local Supabase runs with email confirmations disabled (`supabase/config.toml`), so signups
  are auto-confirmed — after signing up you can log in immediately (no inbox step; Mailpit is
  at http://127.0.0.1:54324 if needed).
- There is no DB trigger that creates a `bakers` profile row. The row is lazily created by an
  upsert in `app/src/app/dashboard/layout.tsx` the first time an authenticated user loads the
  dashboard, so visit `/dashboard` before expecting order/settings queries to resolve.
- AI cake design (`/api/chat`, `/api/generate`) needs `AI_IMAGE_API_KEY` (Google Gemini),
  email needs `RESEND_API_KEY`, and payments need Stripe keys. All degrade gracefully / are
  optional; the core signup → dashboard → order flow works without them.
- Running `npm install` at the repo root creates a root `package-lock.json`; this is expected
  (root only depends on husky) and can be left untracked.
