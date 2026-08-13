# FIT4LIFE — Session Builder

A trainer-led fitness coaching platform: workout programming, progress tracking, and
coach/client communication. Ships as a static, framework-free PWA with a Supabase
backend for shared/synced data.

Live: https://marc14-fit4-life-session-builder.vercel.app

This V12 release keeps the V5 role boundaries, V6 Action Center/calendar, V7 six-tab
client workspace, V8 interaction system, and V9 save reliability repairs. It adds a
permanent metallic-black F4L sign with evenly spaced letters and a theme-aware neon
outline, plus owner-controlled holiday scenes. The role-selection heading
stays inside a high-contrast translucent panel so background visuals cannot obscure it.

## V12 appearance controls

Owners can open **Settings → Themes, appearance & gym setup** and choose Neon blue,
New Year, Valentine’s, Independence Day, Halloween, Thanksgiving, or Christmas.
The choice is stored in the existing `brand_config` organization setting. Signed-in
devices receive live changes, while every device refreshes the setting on app open,
foreground return, reconnection, and a quiet periodic check. Trainers cannot publish
organization-wide themes; they use the owner-request workflow. Rerun the included
role-boundary SQL to install the V12 database guard and Realtime publication update.
No new Vercel variable is required.

Each preset changes the F4L neon outline, ambient lighting, top-bar badge, animated
atmosphere, and a polished 3D scene along the bottom of the rock wall. Each holiday
has distinct artwork. The rock background, application layout, controls, and gym
brand settings remain intact.

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
    action-calendar.js             Action queue, workout requests, calendar, audit history
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

## V6 Action Center

The trainer sidebar now includes one Action Center. It unifies safety issues,
unanswered messages, workout requests and reviews, access requests, owner approvals,
schedule changes, expiring work, and follow-ups. Actions deep-link to the exact source.
A snooze lasts 24 hours; it cannot falsely complete a task. Derived work disappears
only after its underlying record is complete. Shared tasks retain the V5 claim,
takeover, and 45-minute expiry behavior.

## V6 operational calendar

The calendar has day, week, month, and agenda views. It combines appointments, dated
workout assignments, coaching follow-ups, and team tasks. Filters cover client,
trainer/shared ownership, event type, status, service tier, and time of day. Calendar
changes require a reason, warn about trainer time conflicts, and append immutable-style
audit entries with actor and timestamp. Schedule changes may create actionable team
notices, and client Coach pages show their upcoming schedule.

Management has not finalized a rescheduling/fee cutoff. V6 makes that explicit and
records the evidence without enforcing a fee or deadline prematurely.

## V8 secondary-menu interaction audit

Assigned workouts use a purpose-built scheduling editor. Workout, client, coach, and
current status are shown as context instead of disabled appointment fields. Trainers
can change the date, optional start time, reason, and schedule-notice choice; saving
updates the assignment, audit history, Action Center notice, and visible calendar.

Normal calendar items keep fully editable Type, Status, Client, Trainer, date/time,
location, and internal-detail controls. All 21 secondary menus share one close/focus
manager, including dialogs created after startup. It normalizes button types, keeps
`aria-hidden` aligned with open state, closes the top menu with Escape, traps Tab
focus inside the active dialog, and delegates backdrop closing to each menu's real
cleanup function.

Legacy or partially synchronized workout assignments are handled defensively. A
missing session structure no longer prevents a trainer from opening the client page.

For local UI verification only, serve the site on `localhost` and append
`?interaction-test=1`. This seeds isolated browser data and bypasses cloud auth for
click-through testing. The mode is hostname-locked and cannot activate on Vercel.

Before production use, run `supabase-v5-role-boundaries.sql` in Supabase SQL Editor.
Interface guards improve clarity, while the SQL provides the database-side enforcement
for owner-only membership and destructive operations.

V8 does not require an additional SQL migration because calendar, Action Center, and
secondary-menu changes use the existing synchronized JSON record model.

## V9 save reliability audit

Assigned workouts now distinguish three jobs: reschedule the workout, record a
missed-workout follow-up, or cancel it. Each route validates only the fields it truly
needs, writes the assignment first, records history and optional notices, and then
closes the editor. A missed follow-up no longer fails just because its original date
and time are unchanged. Inline feedback stays visible in the open dialog, and global
toasts render above modal overlays.

The save audit also added result checks across profile editing, owner requests,
coaching notes and messages, Settings identity, progress receipts, workout status,
program defaults, calibration decisions, supersets, exercise substitutions, gym
settings, teams, templates, athlete monitoring, and automation controls. A failed
write is no longer followed by a false success message. Program/exercise flows that
mutate in-memory state restore the previous state when a required connected write
fails.

V9 uses the `20260813-v9-save-audit-r3` asset version and service-worker cache. It
does not require new Supabase SQL; the existing V5 role-boundary migration remains
the only required database setup artifact in this package.
