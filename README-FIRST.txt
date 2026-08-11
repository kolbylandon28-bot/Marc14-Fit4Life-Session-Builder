FIT4LIFE — TRAINER PREVIEW + CLIENT WORKFLOW RELEASE V2
Build date: 2026-08-11

THIS FOLDER IS THE UPDATED WEBSITE PACKAGE.
The source folder supplied for this update was preserved unchanged.

WHAT CHANGED
- After sign-in, an approved trainer/owner chooses Trainer side or Client side.
  Client accounts still bypass that choice and open only their own linked profile.
- Trainer Client side includes a persistent client selector and a clear Return to
  trainer side action, so staff can verify any saved client experience without
  signing into that client account.
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
- The workout prescription editor now supports a working-set count for one movement
  or both A1/A2 movements in a superset. Client workout previews and active logging
  controls read those saved prescriptions, so four assigned sets produce four set
  selectors/logging targets for that movement.
- Trainer Messages now has a client search by name, username, or email while keeping
  reply-needed conversations at the top.
- The Business sidebar and Monitoring/imports page are removed from the live workflow.
  Legacy stored data remains untouched. Gym name, colors, and equipment controls now
  live in Settings.
- Client Details values now use explicit dark text on the light report cards.
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
1. Sign in with a trainer account: it must show the Trainer side / Client side choice.
2. Choose Trainer side and confirm the Trainer workspace opens.
3. Return to the role choice, choose Client side, switch between two saved clients,
   and confirm Home, Workout, Progress, Coach, and More update to the selected client.
4. Sign in with a client account: it must skip the role choice and open only that
   client's Home page. It must never display the trainer client selector.
5. From a client account with no active workout, press Request next workout.
6. From the trainer dashboard, open that request; it must preload that client in
   the workout builder.
7. Set one movement to 4 working sets. For a superset, edit one movement and select
   the option to apply the set count to both A1/A2 movements. Approve and assign.
8. On Client side, confirm the workout preview shows the saved counts and the active
   workout exposes four set selectors/logging targets for each 4-set movement.
9. Confirm the request disappears and the client sees one active workout.
10. Open Trainer Messages, search by name, username, and email, and confirm only the
   matching conversation remains while reply-needed ordering is preserved.
11. Open Client Details and confirm every value is dark and readable on its white card.
12. Confirm Business and Monitoring/imports are absent. Open Settings and confirm the
   gym name, primary color, accent color, and equipment controls are there.
13. Start and complete the workout as the client. Confirm the trainer receives a
   workout-review action and cannot assign another until the review is complete.
14. Review it, then build the next workout. Confirm prior workout history remains.
15. Open Calendar, schedule an unscheduled assignment, and confirm it appears only
   on the selected date.
16. Test a trainer-access request and a client-access request; each notification
   must open its matching approval queue.
17. On a phone-sized screen, confirm the role choice, preview selector, five client
   tabs, message search, Client Details, and calendar queues remain readable/tappable.

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
- trainer role-choice, client-only routing, preview switching, and client-boundary tests
- movement/superset set-count propagation and client log-target tests
- message client-search filtering, removed-navigation, Settings relocation, and
  Client Details contrast assertions

The execution sandbox did not permit opening a local HTTP listening port, so the
package was not browser-served inside this task. Perform the production acceptance
check above after the Vercel deployment.
