# FIT4LIFE — Session Builder

A trainer-led fitness coaching platform: workout programming, progress tracking, and
coach/client communication. Ships as a static, framework-free PWA with a Supabase
backend for shared/synced data.

Live: https://marc14-fit4-life-session-builder.vercel.app

This release combines the newer Update 3 workout/program editor with the V5
owner/trainer governance model. It does not replace the newer programming work with
the older V5 interface.

## Stack

- No build step, no framework — plain HTML/CSS/JS served statically.
- [Supabase](https://supabase.com) for auth, database, and realtime sync.
- Deployed on [Vercel](https://vercel.com) (static hosting + one serverless function).
- Installable PWA via a service worker and web app manifest.

## File layout

```
index.html                 Page shell + markup, loads styles and scripts in order
styles.css                 All app styling
js/                         App logic, grouped by domain (loaded in this order):
  engine/                      Workout generation and program rules
    exercise-library.js          Exercise database and edits
    session-engine.js            Session-building rules (goal skeletons, eligibility, block builders)
    session-builders.js          Public entry points: solo/group session generation
    personalization.js           Goal-specific personalization baselines
    generation.js                 Program/session generation flows
    multiweek-programs.js         Multi-week program logic
  app/                         Client-facing app shell + shared UI helpers
    navigation.js                 View routing/state
    program-app.js                Program-led client experience
    forms.js                      Form construction
    rendering.js                  Rendering helpers
    calculations-timers.js        Numeric calculations + rest/work timers
    readiness-progress.js         Readiness adjustments + local progress memory
    role-governance.js             Owner requests, task claims, note visibility, owner-only guards
  trainer/                     Trainer-only features
    trainer-hub.js                 Trainer dashboard + coaching analysis
    coaching-support.js            Connected coaching support features
  init.js                      Bootstraps the app on load (must load last)
cloud-sync.js               Supabase auth + data sync between localStorage and the cloud
sw.js                       Service worker (offline shell cache)
manifest.webmanifest        PWA manifest
api/supabase-config.js      Vercel serverless function exposing Supabase URL/anon key
vercel.json                 Security headers + service worker cache rules
supabase-v5-role-boundaries.sql  Owner-only database protections (run separately)
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

Push to the production branch connected to the existing Vercel project; no build
command is required. Keep the existing project and attached production domain:

`https://marc14-fit4-life-session-builder.vercel.app`

Vercel gives individual deployments generated URLs, but the production domain above
is the link to share. Do not create a new Vercel project for each release. Confirm the
domain under Project Settings → Domains and promote/deploy the intended commit to
Production. The app uses the same stable base for password-reset callbacks and gym
portal links. `/app`, `/login`, `/auth/callback`, and `/reset-password` rewrite to the
static app shell.

Every non-production `*.vercel.app` address generated from this release forward runs
an early canonical redirect to the Production domain before the application loads.
The redirect preserves query strings and URL hashes so authentication callbacks are
not lost. Generated commit-deployment URLs from older releases are immutable and
cannot be retroactively changed by this code. In Vercel Project Settings → Deployment
Protection, enable Vercel Authentication with Standard Protection so those historical
deployment URLs no longer publicly expose an old app, while the Production domain
continues to serve the newest promoted deployment.

## V5 permissions

| Capability | Owner | Trainer | Client |
|---|---:|---:|---:|
| View and coach every client | Yes | Yes | Own record only |
| Open client-side preview and switch clients | Yes | No | Own record only |
| Build/assign workouts, review, message, check in | Yes | Yes | Client actions only |
| Set or change primary coach | Yes | Request | No |
| Change shared exercise bank/templates | Yes | Request | No |
| Approve/deactivate trainers | Yes | No | No |
| Organization settings and backup/restore | Yes | Request | No |
| Delete/archive clients or clear protected holds | Yes | Request | No |

Shared clients have no primary coach. Assigned clients still remain visible to all
approved trainers; the primary coach identifies who leads routine follow-up. Shared
attention tasks support claim/takeover/expiry, and coaching notes explicitly separate
team-only, client-visible, and protected-safety content.

Before production use, run `supabase-v5-role-boundaries.sql` in Supabase SQL Editor.
Interface guards improve clarity, while the SQL provides the database-side enforcement
for owner-only membership and destructive operations.
