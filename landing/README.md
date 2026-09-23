# aOra — ByteREX tech Landing Page

Premium pre-launch landing page for **aOra / Superhuman Coach**.

## Stack
- Static HTML/CSS/JS
- Supabase JS v2 via CDN
- Supabase Postgres + RLS for waitlist
- No build step
- Vercel / Cloudflare Pages ready

## Setup
1. Create a Supabase project.
2. Run `supabase.sql` in Supabase SQL Editor.
3. Copy the project's public URL and publishable/anon key into `config.js`.
4. Deploy this folder as the site root.

**Never use a Supabase `service_role` key in `config.js`.**

## Anti-spam
- Honeypot field
- Client-side minimum submission interval
- Server-side RLS validation
- Unique lowercase email index

For a public launch with meaningful traffic, add Turnstile/hCaptcha or a small serverless rate-limit endpoint.

## Legal
`Privacy Policy` and `Terms` are placeholders and should be replaced with real legal pages before collecting production leads.
