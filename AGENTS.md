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
3. Apply the local DB setup (REQUIRED — without it authenticated writes fail; see gotchas):
   `docker exec -i $(docker ps --filter name=supabase_db --format '{{.Names}}' | head -1) psql -U postgres -d postgres < supabase/dev-local-setup.sql`
4. Populate `app/.env.local` with the printed values:
   - `NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY=<ANON_KEY>`
   - `SUPABASE_SERVICE_ROLE_SECRET_KEY=<SERVICE_ROLE_KEY>`
   - `NEXT_PUBLIC_APP_URL=http://localhost:3000`
   `app/.env.local` is gitignored; `app/.env.example` documents every variable. Restart the
   dev server after editing `.env.local` (Next.js only reads env at startup).

### Non-obvious gotchas
- `supabase/dev-local-setup.sql` (step 3 above) is REQUIRED and idempotent. It reconciles
  three pre-existing gaps between the committed migrations and what the app expects — do NOT
  skip it, or signup/order/settings writes will fail:
  1. Migration `007b_settings_and_cleanup.sql` is SILENTLY SKIPPED by `supabase start`
     because its filename doesn't match the CLI's `<timestamp>_name.sql` pattern.
  2. The app references `bakers` columns no migration creates (`is_beta_tester`, `role`,
     `zip_code`, `email`).
  3. The migrations enable RLS + policies but never GRANT DML on public tables to the Data
     API roles (`anon`/`authenticated`), so every authenticated read/write returns
     `permission denied for table ...` (42501) until grants are applied. RLS still enforces
     row-level access after the grants.
- Local Supabase runs with email confirmations disabled (`supabase/config.toml`), so signups
  are auto-confirmed — after signing up you can log in immediately (no inbox step; Mailpit is
  at http://127.0.0.1:54324 if needed).
- The `bakers` profile row is created by a trigger installed by `dev-local-setup.sql` (and,
  as a fallback, an upsert in `app/src/app/dashboard/layout.tsx` on first dashboard load).
- AI cake design (`/api/chat`, `/api/generate`) needs `AI_IMAGE_API_KEY` (Google Gemini),
  email needs `RESEND_API_KEY`, and payments need Stripe keys. All degrade gracefully / are
  optional; the core signup → dashboard → order flow works without them.
- Running `npm install` at the repo root creates a root `package-lock.json`; this is expected
  (root only depends on husky) and can be left untracked.
