# FIT4LIFE Update 3 + V5 implementation notes

## Stable production link

- Fixed public base: `https://marc14-fit4-life-session-builder.vercel.app`
- Canonical and Open Graph URLs point to that production domain.
- Password-reset and verification callbacks use the configured production base and
  preserve the optional `gym` slug.
- Shared gym links use the production base instead of the current preview origin.
- Vercel rewrites `/app`, `/login`, `/auth/callback`, and `/reset-password` to the
  static application shell.
- Before the application loads, any non-production `*.vercel.app` address containing
  this release redirects to the production root while preserving its query string and
  URL hash. This covers future preview, branch, and generated deployment links.
- The service-worker cache name was advanced, app code is fetched network-first,
  service-worker update checks bypass browser caching, and Vercel revalidates the app
  shell. Versioned asset requests prevent an older worker from serving older scripts
  during the first visit after deployment.

The fixed link remains stable only when deployments continue to use the same Vercel
project and attached production domain. Generated preview deployment URLs are not the
link to distribute. Old generated commit URLs are immutable snapshots, so a link made
before this release cannot be changed from inside the new build. Enable Vercel
Authentication with Standard Deployment Protection to prevent historical generated
URLs from continuing to expose old builds publicly, and resend the production link to
anyone who previously received a generated URL.

## V5 roles and boundaries

- Owners land on the side chooser and can open trainer workspace or client preview.
- Trainers land directly in trainer workspace and are blocked from every client-side
  route, profile activation path, and client workout lookup.
- Clients receive only rows connected to their own authenticated account; local cached
  records are isolated when a different client signs in on the same device.
- All trainers see all clients. Directory filters add All, My primary, and Shared.
- Sending a message to a shared client no longer silently assigns the sender as primary.
- Only owners can approve/deactivate trainers or list the trainer approval queue.
- Shared exercise-bank changes, organization tools, primary-coach reassignment,
  destructive operations, protected safety overrides, and backup/restore are guarded
  as owner-only actions. Trainers are routed to an owner-request form.

## Team coordination

- Owner requests include category, summary, instructions, client/subject context,
  requester identity, timestamps, decision, decision maker, and owner response.
- A requester cannot approve their own request.
- Attention items support claim, takeover confirmation, a 45-minute expiry, and release
  when marked handled.
- Normal attention items put the signed-in trainer's primary clients first within the
  same priority; urgent safety and communication work remains first for everyone.

## Notes and client visibility

- Team note: all approved staff, never client-visible.
- Client feedback: all approved staff plus that client.
- Protected safety note: approved staff only; owners can archive it.
- Client-facing feedback explicitly explains the shared-coaching model.

## Preserved Update 3 behavior

- `js/engine/multiweek-programs.js` and `js/app/rendering.js` are unchanged from the
  supplied Update 3 folder.
- Trainers can still edit sets per movement or superset. The saved prescription drives
  `plannedSetsForActive`, which creates the exact number of client logging inputs.
- The newer workout/program editor, assignment synchronization, supersets, and audit
  flow remain intact.

## Removed or relocated

- Business was removed from the coach sidebar; legacy Business navigation resolves to
  Settings.
- Appearance and gym setup now open from Settings.
- The low-readiness dashboard card and readiness/onboarding attention notifications are
  removed.
- Client More no longer shows the generic habits panel or unnecessary 1RM tool. RPE/RIR
  remains, and plate math appears only when the assigned workout uses a loaded bar.

## Database enforcement

Run `supabase-v5-role-boundaries.sql` in Supabase SQL Editor. It adds database-side
owner protection for staff-role changes and destructive client operations and protects
the last active owner. UI guards are not a substitute for the SQL policies/functions.
