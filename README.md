# FIT4LIFE — Session Builder

A trainer-led fitness coaching platform: workout programming, progress tracking, and
coach/client communication. Ships as a static, framework-free PWA with a Supabase
backend for shared/synced data.

Live: https://marc14-fit4-life-session-builder.vercel.app

## Stack

- No build step, no framework — plain HTML/CSS/JS served statically.
- [Supabase](https://supabase.com) for auth, database, and realtime sync.
- Deployed on [Vercel](https://vercel.com) (static hosting + one serverless function).
- Installable PWA via a service worker and web app manifest.

## File layout

```
index.html                 Page shell + markup, loads styles and scripts in order
styles.css                 All app styling
js/                         App logic, split by feature area (loaded in this order):
  exercise-library.js         Exercise database and edits
  session-engine.js           Session-building rules (goal skeletons, eligibility, block builders)
  session-builders.js         Public entry points: solo/group session generation
  personalization.js          Goal-specific personalization baselines
  navigation.js                View routing/state
  program-app.js              Program-led client experience
  forms.js                    Form construction
  generation.js                Program/session generation flows
  rendering.js                 Rendering helpers
  calculations-timers.js       Numeric calculations + rest/work timers
  multiweek-programs.js        Multi-week program logic
  readiness-progress.js        Readiness adjustments + local progress memory
  trainer-hub.js               Trainer dashboard + coaching analysis
  coaching-support.js          Connected coaching support features
  init.js                      Bootstraps the app on load (must load last)
cloud-sync.js               Supabase auth + data sync between localStorage and the cloud
sw.js                       Service worker (offline shell cache)
manifest.webmanifest        PWA manifest
api/supabase-config.js      Vercel serverless function exposing Supabase URL/anon key
vercel.json                 Security headers + service worker cache rules
```

The `js/` files share one global scope by design (no bundler, no modules) — they're
loaded via sequential `<script>` tags in `index.html` in the exact order listed above.
`init.js` must stay last since it calls functions defined in every other file.

## Local development

No build step required. Serve the directory with any static file server, e.g.:

```bash
npx serve .
```

Then open the printed local URL. Note: without a running Vercel dev server, `api/supabase-config.js`
won't respond, so the app will show its "not connected" cloud state — that's expected locally
unless you also run `vercel dev`.

## Environment variables (Vercel)

Set these in the Vercel project's Environment Variables settings so
`api/supabase-config.js` can hand them to the client at runtime:

- `SUPABASE_URL` — your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — your Supabase anon/publishable key

(A few alternate variable names are also accepted as fallbacks — see
`api/supabase-config.js` — but the two above are the canonical ones to set.)

## Deployment

Push to the connected GitHub branch; Vercel auto-builds and deploys (no build command
needed — it's served as-is). `vercel.json` sets security headers and service worker
cache-control rules.
