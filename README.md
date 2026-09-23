# Superhuman Coach · aOra v3

Aplicación fitness IA estática, móvil-first, con:
- Supabase Auth (email + password)
- Supabase Postgres + RLS
- Perfil longitudinal del atleta
- Evolución corporal + Chart.js
- Entrenamiento diario visual con SVGs
- Registro de ejercicios completados
- Adaptación por material, espacio, limitaciones y tiempo
- Chat aOra con Groq
- O viva como centro de la interfaz
- Sin backend propio

## 1. Supabase

1. Crea un proyecto gratuito en Supabase.
2. Authentication → Providers → Email: activa Email + Password.
3. SQL Editor → ejecuta `supabase/schema.sql`.
4. Project Settings → API: copia Project URL y la `anon` public key.
5. En el primer arranque, pega la URL y la anon/public key en el panel de configuración de la pantalla de login. Después también puedes editarlas en Perfil → Configuración.

**Nunca** uses `service_role` en este frontend.

## 2. Groq

Crea una API key de Groq y guárdala en Perfil → Configuración.
La clave se almacena únicamente en localStorage de este navegador.

Modelo predeterminado:
`openai/gpt-oss-120b`

Puedes cambiarlo por otro modelo disponible en tu cuenta.

## 3. Deploy

### GitHub Pages
Sube el contenido del repositorio a GitHub y activa Settings → Pages → Deploy from branch.

### Cloudflare Pages
Conecta el repositorio y usa:
- Build command: ninguno
- Output directory: `/`

## 4. Datos

Las tablas están protegidas por RLS:
- `profiles`
- `measurements`
- `workout_plans`
- `workout_logs`
- `chat_messages`

Cada fila lleva `user_id` y las políticas limitan el acceso al usuario autenticado.

## 5. Arquitectura

`index.html`
→ UI y navegación

`js/supabase.js`
→ Auth + base de datos

`js/groq.js`
→ system prompt + IA + generación de entrenamiento

`js/app.js`
→ estado de la aplicación, gráficos, perfil, mediciones, entrenamientos y chat

`supabase/schema.sql`
→ estructura + RLS + trigger de perfil

## 6. Seguridad

La arquitectura no incluye servidor propio. Por ello:
- Supabase anon key: puede estar en el cliente si RLS está bien configurado.
- Groq API key: es una credencial privada del usuario y se guarda en localStorage; un frontend estático no puede ocultarla frente a quien tenga acceso al navegador.
- Para una versión pública multiusuario, la evolución natural es añadir un backend/serverless proxy para Groq y rate limiting.

## 7. Flujo

Login → perfil → mediciones → aOra analiza → genera sesión → usuario completa ejercicios → siguiente sesión se adapta a la respuesta.


## i18n
Supported: English, Español, Français, Português, Deutsch, 中文简体, العربية (RTL), हिन्दी, Русский, Bahasa Indonesia, 日本語, 한국어, Türkçe. Browser language is detected on first visit; preference is stored in `localStorage` and, when logged in, in `profiles.language`. UI strings live in `i18n/*.json`. The active language is injected into aOra/Groq context and browser speech synthesis selects the corresponding locale. Existing Supabase projects should run the `alter table ... add column if not exists language` migration at the end of `supabase/schema.sql`.

## Activity module (photo-first)

The latest version adds an activity log inspired by Strava. Users can import a workout from a screenshot, have Groq Vision extract visible metrics, review/edit the result, and then save it to Supabase. It also includes manual logging, a chronological feed, basic weekly/monthly statistics, private Supabase Storage for screenshots, and activity-aware Coach context. See `ACTIVITY_SETUP.md`.


## Elite Activity Tracking

Superhuman Coach now includes a unified activity layer with GPS recording, photo/vision ingestion, manual logging, GPX/FIT/TCX imports, maps, splits, heatmaps, personal records, relative training load, gear mileage, and GPX/JSON export. The O receives recent activity data as part of its coaching context.

## aOra Athlete OS — Elite Activity Intelligence

The activity system unifies GPS tracking, screenshot/Vision ingestion, manual logging and GPX/FIT/TCX import into one activity model. It stores original route points plus an optional encoded polyline, supports private activity images, analytics, gear mileage and an explainable 7-day training-load signal used by the aOra coach.

GPS tracking is designed for foreground mobile/PWA use. Browser PWAs cannot guarantee continuous background location after the operating system suspends the web app; a future native wrapper can add platform background-location services if required.
