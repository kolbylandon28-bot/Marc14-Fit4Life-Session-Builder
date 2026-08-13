FIT4LIFE — V6 ACTION CENTER + OPERATIONAL CALENDAR
Build date: 2026-08-13

THIS is the versioned upload folder. It preserves Update 3 programming, the stable
production link, and all V5 owner/trainer boundaries. V6 adds Batch 2 (one actionable
trainer queue) and Batch 3 (an operational coaching calendar).

USE THE SAME PUBLIC LINK AFTER EVERY DEPLOYMENT
Public production link:
https://marc14-fit4-life-session-builder.vercel.app

1. Keep using the SAME Vercel project.
2. Deploy the repository's production branch (normally main).
3. Do not create a new Vercel project for each upload.
4. Share the production domain above—not a generated preview/deployment URL.
5. In Vercel Project Settings > Domains, confirm the domain above is attached to
   this project and points to the latest Production deployment.
6. After Vercel reports Ready, open the Production link and confirm V6 appears. This
   release version-tags its app files, forces shell revalidation, and updates the
   service worker without relying on its browser cache.
7. In Project Settings > Deployment Protection, enable Vercel Authentication with
   Standard Protection. This keeps old generated deployment snapshots private while
   leaving the Production domain public.

The app's canonical URL, password-reset callback, shared gym link, and supported
entry paths now resolve through that fixed production domain. vercel.json rewrites
/app, /login, /auth/callback, and /reset-password to the static app shell.

Starting with this release, opening any non-production *.vercel.app address that
contains this code immediately replaces it with the Production domain. Login, gym,
password-reset, and verification query/hash information is preserved. Vercel commit
deployment URLs created before this code was deployed are immutable old snapshots;
current code cannot rewrite those already-built pages. Standard Deployment Protection
is therefore required to stop those older generated URLs from publicly serving old
versions. Resend the Production link once to anyone who received an old generated URL.

V5 ROLE RULES
- Owner: trainer workspace plus client-side preview and client switcher.
- Trainer: trainer workspace only. No client-side preview.
- Client: only the client record connected to the signed-in account.
- All approved trainers can view and coach every active client.
- A primary coach is a responsibility label, not an access restriction.
- Trainers can perform normal coaching work, but cannot approve staff, change the
  shared exercise bank, reassign a primary coach, change organization settings,
  run organization backup/restore, delete client data, or clear protected safety
  holds without owner approval.
- Restricted actions create an owner request with requester, client context, time,
  decision, and owner response.
- Shared attention items can be claimed, taken over with confirmation, completed,
  or released after the 45-minute claim expires.
- Coaching notes have explicit Team, Client feedback, or Protected safety visibility.

V6 BATCH 2 — ACTION CENTER
- Action Center combines safety reports, unanswered messages, workout requests,
  workout/check-in reviews, client/trainer access, owner approvals, schedule changes,
  expiring work, and inactive-client follow-up.
- Each action opens its originating client and workflow instead of a generic page.
- Duplicate task IDs collapse into one action. Shared tasks may be claimed or taken
  over, and their existing 45-minute claim expiry remains active.
- Snooze delays a reminder for 24 hours. It does not complete the work.
- Derived actions close only after their underlying message, review, request,
  approval, assignment, or safety decision is complete.
- Clients without an active workout can request the next workout once; assigning a
  newer workout automatically fulfills that request.

V6 BATCH 3 — OPERATIONAL CALENDAR
- Day, week, month, and agenda views with previous/next/today controls.
- Appointments, dated workout assignments, follow-ups, and team tasks.
- Filters for client, trainer (including shared/unassigned), event type, status,
  service tier, and time of day.
- Appointment statuses: Scheduled, Rescheduled, Completed, Cancelled, and Missed.
- Every calendar creation, edit, reschedule, and status change records the staff
  member, time, before/after data, and reason.
- Existing schedule changes require a reason; trainer conflicts are detected before
  saving. Client-specific calendar items synchronize to that client's plan record.
- Rescheduling policy is intentionally labeled as a management draft. V6 records
  late/change history but does not impose a fee or notice cutoff until policy is set.
- Client Coach pages now show upcoming appointments and dated workouts.

NO NEW SUPABASE SQL IS REQUIRED FOR V6
The V6 queue and calendar use the existing sync_records JSON architecture. The V5
role-boundary SQL is still required if it has not already been run.

REQUIRED SUPABASE STEP
Run supabase-v5-role-boundaries.sql in Supabase SQL Editor before relying on the new
owner-only database protections. It tightens membership and destructive operations
and prevents the last active owner from being removed.

GITHUB / VERCEL UPLOAD
1. Keep a backup of the current repository.
2. Upload the CONTENTS of this folder to the repository root.
3. The root must contain index.html, cloud-sync.js, sw.js, manifest.webmanifest,
   vercel.json, api/, js/, the two icon SVG files, and the rock background assets.
4. Commit to the same production branch connected to the existing Vercel project.

Do not serve the SQL file as an app feature. It is included as an owner setup artifact
and must be run separately in Supabase SQL Editor.
