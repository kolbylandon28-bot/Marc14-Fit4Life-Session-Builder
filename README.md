# FIT4LIFE — Trainer & Client Hub

FIT4LIFE is a trainer-led coaching PWA for assigning one workout at a time,
executing it from a protected client account, reviewing the result, and deciding
what comes next.

Live production domain: <https://marc14-fit4-life-session-builder.vercel.app>

## Release workflow

Approved trainers and owners choose Trainer side or Client side after sign-in.
The trainer Client side has a persistent selector for previewing any saved client.
Clients sign in directly to the one protected client profile connected to their
Supabase account and never receive the trainer choice or selector. Trainer permission
remains a separately approved staff role.

Readiness-check notifications are retired. Historical readiness records are
left intact for compatibility, but they no longer create Trainer Hub cards, action-
queue tasks, pain/safety notices, or automation alerts. Direct pain reports, workout
reviews, check-ins, and recovery follow-ups remain active coaching notifications.

The primary loop is:

1. Client requests a workout, or the trainer chooses a client.
2. Trainer builds, reviews, approves, and assigns one workout.
3. Client completes the workout and submits results/feedback.
4. Trainer receives a direct review action, reviews the evidence, and records the
   next coaching decision.
5. Only then is the next workout assigned.

Multiweek Programs and Onboarding are not exposed in this release. Existing stored
records and compatibility logic are retained so older accounts are not damaged and
future migration/integration remains possible.

## Trainer workspace

- Action-first dashboard with exact deep-links for access, messages, requests,
  safety concerns, workout/check-in reviews, progress updates, and follow-ups.
- One-workout builder and one-active-workout enforcement.
- Client directory with a five-section client record: Overview, Workouts,
  Progress, Communication, and Client details.
- Detailed workout history and evidence-based summaries.
- Monday–Sunday workout calendar, unscheduled assignment queue, and action queue.
- Trainer access management, exercise library, progress logging, coaching support,
  reports, and settings.
- Searchable client conversations by name, username, or email.
- Gym colors, identity, and equipment controls inside Settings.

## Client workspace

- Home page with one primary next action.
- One current workout and completed-workout history.
- Next-workout request when no active assignment exists.
- Workout execution, substitutions, readiness, pain reporting, check-ins,
  messages, progress receipts, and optional progress/body data.
- A simplified More page with RPE/RIR help, plain-language workout terms,
  contextual exercise guidance, and account controls.
- Plate math only when the current assignment uses loaded bar equipment. The client
  view does not expose standalone timers, 1RM estimation, or generic daily habits.
- No trainer directory, role switching, onboarding page, or multiweek program UI.

## Trainer client preview

- Trainers may open Client side from the post-sign-in role choice.
- A persistent selector switches the preview among saved clients.
- The selected client’s real assignment, progress, messages, and profile data are
  shown so the trainer can verify the live experience.
- Client accounts cannot use the selector or enter trainer-only pages.

## Workout set counts

The prescription editor accepts 1–12 working sets. A trainer can update one movement
or apply only the set-count change to both movements in an A1/A2 superset. Client
workout previews and active set logging derive their controls from the saved per-
exercise prescription, so the visible/loggable set count stays synchronized.

## Security and data boundaries

- Supabase authentication, organization memberships, and row-level security remain
  the authoritative access layer.
- The browser applies a second client-only filter: profile rows must have an
  `auth_user_id` matching the signed-in user, and sync records must belong to that
  exact linked profile.
- A different client signing in on the same device clears the prior account's
  sensitive local cache while preserving only shared gym branding/equipment.
- Clients cannot grant trainer access or mutate trainer-only records.

## Stack

- Plain HTML, CSS, and JavaScript; no framework and no build step.
- Supabase for authentication, database records, row-level security, RPCs, and
  realtime synchronization.
- Vercel static hosting plus `api/supabase-config.js`.
- Installable PWA via `manifest.webmanifest` and `sw.js`.

## File layout

```text
index.html                     App shell and accessible page/modal markup
styles.css                     Responsive visual system
cloud-sync.js                  Auth, roles, account isolation, and cloud sync
js/engine/                     Exercise and workout-generation logic
js/app/                        Navigation, forms, client flow, workout execution
js/trainer/                    Trainer Hub and coaching-support features
js/init.js                     Bootstraps the app after all dependencies load
api/supabase-config.js         Vercel function exposing public Supabase config
sw.js                          Versioned offline application shell
manifest.webmanifest           Installable-app metadata
vercel.json                    Hosting routes, headers, and service-worker policy
```

The JavaScript files intentionally share browser global scope and must remain in the
script order defined at the bottom of `index.html`. `js/init.js` loads last.

## Local development

Serve the directory with a static server. To exercise the live Supabase config
endpoint locally, use `vercel dev`; a generic static server cannot execute the
`api/supabase-config.js` function.

## Vercel environment

Set the existing Vercel project variables:

- `SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` or the supported publishable-key equivalent

Push the folder contents to the repository branch connected to Vercel. There is no
build command. After deployment, hard-refresh the production site once so the new
service-worker cache replaces the previous shell.

See `README-FIRST.txt` for the exact production acceptance checklist.
See `VERIFICATION.txt` for the checks completed before packaging this release.
