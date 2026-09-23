# aOra Activity Module

## What it does

The Activities module is photo-first: a user can upload a screenshot from Apple Fitness, Garmin, Strava, Nike Run Club, Hevy, Strong or another training app. The browser sends the image to the configured Groq vision model, extracts only visible metrics, and shows an editable confirmation form before anything is stored.

Supported extraction fields:

- activity type
- duration
- distance
- pace
- calories
- average/max heart rate
- visible date/time
- source app when recognizable
- strength exercises, sets, reps and load when visible

The module also supports manual logging, a chronological feed, weekly/monthly summaries, a 7-day chart, and activity details.

## Supabase migration

Run the complete `supabase/schema.sql` in the Supabase SQL Editor. The activity migration creates:

- `activities`
- `activity_exercises`
- RLS policies for both tables
- the private `activity-images` Storage bucket
- per-user Storage policies
- indexes and update timestamps

Personal screenshots are stored in a **private** bucket under `<user_id>/<uuid>.<extension>`. The UI requests short-lived signed URLs only for the authenticated owner.

## Vision model

The default model is:

`meta-llama/llama-4-scout-17b-16e-instruct`

It can be changed in the Profile → Technical configuration field **Groq Vision model**. The app deliberately does not treat OCR output as final truth: every extracted value is editable and must be confirmed by the user.

## API-key architecture note

This version keeps the existing static-app architecture, where the Groq key is held in browser localStorage. That is suitable for a prototype but not for a public production deployment. For production, move the vision request behind a Supabase Edge Function or other server-side proxy and enforce rate limits/quotas there.

## Coach integration

The Coach context now receives the latest 30 confirmed activities, including strength exercise details. aOra can use them to manage fatigue, training load, recovery and progression. It must not claim access to live wearable data and must not invent missing metrics.


## Elite Activity Layer (v8)

The activity module now combines three ingestion paths: live GPS, screenshot/OCR vision, and GPX/FIT/TCX import. The feed is shared by all sources.

### Data model
- `activities.route_data`: detailed route points as JSONB, preserving latitude, longitude, timestamp, altitude, accuracy and speed where available.
- `activities.started_at` / `ended_at`: activity boundaries.
- `activities.moving_duration_seconds`: moving-time field reserved for GPS/file integrations.
- `activities.avg_speed_kmh`, `max_speed_kmh`, `elevation_gain_m`, `elevation_loss_m`: derived metrics.
- `gear`: optional user equipment inventory for mileage/wear tracking.

### Import formats
GPX and TCX are parsed directly in the browser. FIT parsing uses the MIT-licensed `fit-file-parser` browser distribution from jsDelivr. Imported activities are normalized into the same `activities` schema. Multiple files can be selected at once.

### Analytics
The UI includes a rolling heatmap, observed distance/time trends, simple personal-best heuristics for 1/5/10 km and longest activity, and a directional relative training-load heuristic. These are coaching analytics, not medical readiness scores.

### Privacy
Routes and activity metadata remain protected by Supabase RLS. Export is available as JSON and GPX for activities with route points.

### PWA limitation
The browser implementation is optimized for foreground mobile tracking. iOS/Android browsers can suspend web apps in the background, so uninterrupted background recording is not guaranteed. A future native wrapper can add platform foreground services/background location if required.

## v9 Elite layer

- `activities.route_data` preserves timestamped GPS points; `route_polyline` stores a compact encoded route for transport/rendering.
- `extraction_method` accepts `manual`, `vision`, `gps`, and `file`.
- `gear` is persisted in Supabase and supports mileage ceilings for shoes/bikes/other equipment.
- The Athlete OS panel exposes an explainable 7-day relative load signal. It is a coaching heuristic, not a clinical readiness score.
