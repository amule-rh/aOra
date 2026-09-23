# Superhuman Coach — Affiliate monetization

## Data model

`affiliate_products` is a public, read-only catalog for the frontend. It stores product metadata, eligibility signals, regional destinations and optional affiliate URLs.

Important fields:
- `slug`: stable ID used by the AI token, e.g. `creatine-monohydrate`.
- `category`: supplements / equipment / apparel / recovery / books.
- `goals`, `levels`, `tags`: recommendation matching.
- `space_requirement`: `any` or `small` and can be expanded later.
- `regions`: `EU` / `US`.
- `destination_urls`: normal merchant URLs; these are safe fallbacks and do not imply commission.
- `affiliate_urls`: URLs from programs for which Superhuman Coach is actually approved.
- `priority`: catalog ordering only; it is never passed to the model as a commission ranking.
- `active`: only active rows are readable through the public RLS policy.

`profiles.affiliate_region` stores the user's selected shopping region.

## How to activate commissions

1. Apply `supabase/schema.sql` to an existing/new Supabase project.
2. Run `supabase/affiliate_seed.sql`.
3. Join the affiliate programs you are eligible for.
4. Replace the empty `affiliate_urls` JSON values with the exact tracking URLs supplied by each program.
5. Keep `destination_urls` as non-affiliate fallbacks.
6. Never put an affiliate network's private API key or a Supabase `service_role` key in this static frontend.

## Recommendation flow

Browser/profile -> region -> eligible catalog -> deterministic client-side ranking -> Groq context.

The model can only refer to products present in the supplied catalog and only by exact `[PRODUCT:slug]` tokens. The UI turns valid tokens into product cards. If no product adds value, the model is instructed not to recommend one.

The catalog is deliberately not sorted by commission. Product utility is the matching criterion.

## Region detection

Automatic selection uses browser language/time-zone signals only. It does not request precise location. The user can change EU/US manually; the choice is stored in `localStorage` and, when logged in, in `profiles.affiliate_region`.

## Production recommendation

For a public multi-user launch, move Groq calls behind a server/serverless proxy. A browser-exposed Groq key is not a production secret. Affiliate catalog writes should also happen from a trusted admin environment, not the public client.
