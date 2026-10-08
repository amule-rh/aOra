# aOra — ByteREX tech

Pre-launch landing + Superhuman Coach product in one deployable repository.

## Structure

- `/` — public aOra landing page and waitlist
- `/app/` — Superhuman Coach / aOra athlete application
- `/app/supabase/schema.sql` — unified database schema, RLS, activity/GPS/gear tables and waitlist

## Deploy

Connect this repository to Vercel with no build command and the repository root as the project root.

Vercel serves the landing at `/` and redirects `/app` to `/app/` for the application. Landing assets are rooted under `/landing/` so the root rewrite is safe.

## Supabase

Run `app/supabase/schema.sql` in the Supabase SQL editor. Use only the public anon/publishable key in browser configuration. Never expose `service_role`.

For the landing, set the same public Supabase URL/key in `landing/config.js`.

For the application, the existing setup flow stores the public Supabase configuration locally in the browser.

## AI security

The current product keeps the user's Groq key in browser localStorage. This is suitable for a prototype/private beta, not a hardened public SaaS. Before public scale, move Groq calls behind a serverless/edge function with authentication and rate limiting.
