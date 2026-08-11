FIT4LIFE — TOMORROW-READY TRAINER + CLIENT RELEASE
Build date: 2026-08-11

THIS FOLDER IS THE UPDATED WEBSITE PACKAGE.
The source folder supplied for this update was preserved unchanged.

WHAT CHANGED
- Sign-in now routes an approved trainer/owner directly to the Trainer workspace
  and a client directly to the single client profile linked to that login.
- Client sessions use a second local account-isolation boundary in addition to
  Supabase row-level security. A client only accepts cloud records whose
  auth_user_id matches the signed-in user.
- Shared-device client logins clear the prior account's sensitive offline cache.
- Trainer access remains a separate verified request that approved staff must confirm.
- The dashboard attention queue now covers trainer requests, client account/profile
  requests, next-workout requests, unanswered messages, workout reviews, check-ins,
  pain/readiness concerns, progress receipts, recovery follow-ups, recognition,
  inactive clients, and saved automation alerts.
- Every attention item has a direct Open action. It routes to the exact client,
  workout builder/review, message composer, check-in reply, access queue, receipt,
  safety record, or coaching-support review that can resolve it.
- Trainers assign one workout at a time. A not-started assignment is retained as
  superseded history when replaced. A workout already in progress blocks another
  assignment, and a completed workout must be reviewed before the next is assigned.
- Clients can request their next workout. Assigning it automatically clears the request.
- The visible multiweek Program and Onboarding workflows are removed from navigation.
  Their stored legacy data and compatibility code are preserved for safe migration.
- The trainer client page now has five sections: Overview, Workouts, Progress,
  Communication, and Client details. The Overview starts with the next coaching action.
- Workout history includes session results, planned/logged sets, effort, energy,
  pain, notes, questions, substitutions, skips, changes, and coach feedback.
- Destructive client-data controls are moved into a collapsed danger area.
- The calendar is now a Monday–Sunday weekly schedule with Previous, Today, and Next
  controls, exact assignment dates/statuses, an unscheduled-workout queue, and the
  actionable coaching queue.
- The PWA cache version was bumped and all local JavaScript/CSS shell assets are
  explicitly included so deployed devices receive a consistent upgrade.

GITHUB / VERCEL UPLOAD
1. Keep a backup of the current production repository.
2. Upload the CONTENTS of this folder to the repository root. Do not upload this
   outer folder as a nested directory.
3. Confirm the repository root contains index.html, styles.css, cloud-sync.js,
   sw.js, manifest.webmanifest, vercel.json, the api folder, the js folder, icons,
   and the rock-background assets.
4. Commit to the branch connected to Vercel. This app has no build command.
5. Wait for Vercel to show Ready, then open the production domain and hard-refresh
   once so the new service worker replaces the prior cached shell.

PRODUCTION ACCEPTANCE CHECK
1. Sign in with a trainer account: it must open the Trainer workspace automatically.
2. Sign in with a client account: it must open only that client's Home page.
3. From a client account with no active workout, press Request next workout.
4. From the trainer dashboard, open that request; it must preload that client in
   the workout builder.
5. Approve and assign the workout. Confirm the request disappears and the client
   sees one active workout.
6. Start and complete the workout as the client. Confirm the trainer receives a
   workout-review action and cannot assign another until the review is complete.
7. Review it, then build the next workout. Confirm prior workout history remains.
8. Open Calendar, schedule an unscheduled assignment, and confirm it appears only
   on the selected date.
9. Test a trainer-access request and a client-access request; each notification
   must open its matching approval queue.
10. On a phone-sized screen, confirm the five client tabs, trainer client page,
    attention actions, and calendar queues remain readable and tappable.

BACKEND NOTE
This release keeps the existing Supabase schema, row-level-security policies, and
registration RPCs. It does not include or require a new SQL migration. Production
still needs SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY (or the supported
publishable-key equivalent) in the existing Vercel project.

VERIFICATION COMPLETED FOR THIS PACKAGE
- JavaScript syntax for cloud-sync.js, the Vercel API function, and every local JS file
- HTML parsing, duplicate-ID check, and inline-handler resolution
- CSS brace/structure check
- manifest.webmanifest and vercel.json JSON parsing
- SVG icon parsing and image-format checks
- service-worker shell reference/existence check for all 23 cached assets
- role-boundary, client record/sync filtering, and shared-device cache-isolation tests
- next-workout request creation/resolution and trainer attention tests
- one-active-workout, supersession, in-progress blocking, review-before-next, and
  reviewed-history preservation tests
- Monday–Sunday calendar date uniqueness test

The execution sandbox did not permit opening a local HTTP listening port, so the
package was not browser-served inside this task. Perform the production acceptance
check above after the Vercel deployment.
