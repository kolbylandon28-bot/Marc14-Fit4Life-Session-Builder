FIT4LIFE — V12 IMMERSIVE HOLIDAY THEMES
Build date: 2026-08-13 · owner-theme connection repair: 2026-08-17

THIS is the versioned upload folder. It preserves Update 3 programming, the stable
production link, V5 owner/trainer boundaries, and the V6 Action Center/calendar.
V7 repaired Action Center commands and replaced the crowded trainer-facing client
record with a focused six-tab coaching workspace. V8 made secondary menus
interactive and keyboard-safe. V9 made their save actions reliable and visible.
V10 adds the permanent neon-blue F4L rock-background sign and owner-controlled
holiday accent presets without replacing the core portal design.
V11 gives that sign an evenly spaced metallic-black face with a crisp blue outline,
and places the role-selection question inside a high-contrast translucent panel.
V12 makes the F4L outline theme-aware and adds six cinematic 3D holiday scenes,
matching ambient particles, and real scene previews in the owner picker.
The August 17 connection repair publishes the confirmed gym membership to the
theme controls immediately, retries the organization link once when necessary,
clears that context safely at sign-out, and installs the missing owner-only
`update_my_organization_setup` Supabase function used to publish a theme. The r5
repair also includes an owner-protected direct update fallback while Supabase's API
schema cache is refreshing. The r6 SQL first upgrades older `organizations` tables
with the three shared-settings columns before creating any trigger or function.

USE THE SAME PUBLIC LINK AFTER EVERY DEPLOYMENT
Public production link:
https://marc14-fit4-life-session-builder.vercel.app

1. Keep using the SAME Vercel project.
2. Deploy the repository's production branch (normally main).
3. Do not create a new Vercel project for each upload.
4. Share the production domain above—not a generated preview/deployment URL.
5. In Vercel Project Settings > Domains, confirm the domain above is attached to
   this project and points to the latest Production deployment.
6. After Vercel reports Ready, open the Production link and confirm V12 appears. This
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

V10 NEON + THEME PRESETS
- V10 introduced the large fluorescent-blue F4L sign behind the portal content on
  the black rock wall. V12 now recolors its outline and glow with the active preset.
- Settings > Themes, appearance & gym setup now includes Neon blue, New Year,
  Valentine’s, Independence Day, Halloween, Thanksgiving, and Christmas.
- The original presets added edge lighting, background glow, and a top-bar badge.
  V12 expands them with themed 3D scene artwork and ambient particles without
  replacing the rock background, rearranging the portal, or overriding gym colors.
- Themes are manual and remain selected until an owner changes them. There are no
  automatic holiday dates that could unexpectedly change the client portal.
- Only the owner can publish a preset. Trainers can request an organization-setting
  change through the existing owner approval workflow.
- The selected preset is stored inside the existing gym brand configuration. Live
  Supabase organization updates, app-open/foreground/online refreshes, and a periodic
  fallback check keep trainer and client devices synchronized. Rerun the included
  role-boundary SQL for the V12 database guard and Realtime publication update; no
  new environment variable is required.
- See THEME-GUIDE.md for the short operating guide.

V11 VISUAL REFINEMENTS
- F, 4, and L use even positive tracking so the 4 and L no longer overlap.
- The F4L face is crisp metallic black with a separate bright-blue edge and restrained
  glow. The dark face remains legible instead of turning into a solid blue block.
- The role-selection heading and supporting explanation now sit in a dark translucent
  rounded panel with a thin blue edge, keeping the question readable over the sign.
- The sign remains behind all content and cannot intercept clicks.
- V11 has its own asset and service-worker version so browsers request the refinement
  immediately after the Production deployment.

V12 IMMERSIVE THEMES
- The F4L neon outline and glow now adopt the selected preset color while preserving
  the crisp metallic-black face and even letter spacing.
- Halloween adds a 3D jack-o'-lantern, cauldron, and falling magical embers.
- Thanksgiving adds a turkey, football, pumpkins, autumn tree, and falling leaves.
- Christmas adds a snowy tree, Santa, presents, and falling snow.
- New Year, Valentine’s, and Independence Day have their own matching 3D scenes and
  restrained atmospheric details.
- Scene artwork stays at the bottom of the rock wall, behind all application panels,
  and cannot intercept clicks. Reduced-motion devices do not animate particles.
- Theme thumbnails now preview the actual scene instead of showing color alone.
- All six compressed holiday-scene assets are included in the PWA shell cache for
  reliable refreshes and offline use. Rerun the included role-boundary SQL for the
  V12 theme guard and Realtime publication update; no new environment variable is
  needed.
- Only an authenticated owner can publish a theme. Trainers see the current theme and
  may request a change, but cannot preview or save a different theme on their device.
- The owner theme control no longer waits for a second organization-settings read
  before recognizing the membership's organization ID. If the browser catches the
  connection during startup, the control retries it once before asking for a refresh.
- The app shell uses a new August 17 cache version so an installed app or previously
  opened browser cannot continue serving the faulty connection script.
- The included SQL now creates the exact owner-only RPC used by the theme publisher.
  Run the complete SQL file again even if an earlier V5/V12 copy was already run.
- For the shortest repair, run `RUN-THIS-IN-SUPABASE-THEME-FIX.sql`. Its final Results
  row verifies the required columns, function, authenticated execution grant, and
  Realtime publication.
- If Supabase has not refreshed the RPC schema cache yet, r5 safely falls back to the
  organizations table. The same SQL installs owner-only RLS and a database trigger,
  so trainers and clients still cannot publish themes through that fallback.
- If Supabase rejects a future publish, the app now leaves the specific database
  message visible instead of replacing it with a generic failure notice.

V7 CLIENT WORKSPACE
- The client record now has six task-based tabs: Overview, Workouts, Progress,
  Check-ins, Messages, and Client details.
- Program, Coaching, Assessments, Nutrition, Notes, and Documents are no longer
  separate top-level tabs. Useful notes and documents are grouped under Details.
- Workout filters are collapsed until a trainer needs them.
- The default Overview prioritizes the current workout, recent activity, coaching
  focus, messages, check-ins, and pain-report status.
- Onboarding prompts and readiness notifications are removed from the live workflow.
  Existing stored data is preserved for a later external intake integration.
- Normal single workouts no longer require the retired onboarding or calibration
  workflow. The workout quality audit, profile safety conflicts, and unresolved pain
  holds still block unsafe assignment.
- Delete controls live in a collapsed administrative area and remain owner-protected.

V7 ACTION FIXES
- Handle now receives the complete client/task arguments and opens the real source.
- Workout requests open the selected client directly in the single-workout builder.
- Tomorrow snoozes the action for 24 hours and refreshes the queue immediately.

V8 SECONDARY-MENU + CALENDAR FIXES
- Assigned workouts no longer open a misleading form full of grey, disabled
  appointment controls. The modal shows a read-only workout/client/coach/status
  summary and editable Date, optional Start time, Reason, notice, and history.
- Changing an assigned workout now persists both scheduledDate and scheduledTime,
  records the before/after audit entry, and updates the calendar chip immediately.
- Normal appointment, follow-up, and team-task menus retain editable Type, Status,
  Client, Trainer, date/time, location, and details controls.
- All 21 secondary menus use one interaction manager: modal buttons default to
  type="button", open/closed aria state stays accurate, Escape closes the top menu,
  Tab remains inside the open menu, and backdrop clicks use the correct closer.
- Dynamically created menus receive the same behavior as menus present at startup.
- Incomplete legacy workout-session data can no longer crash the client workspace;
  the record remains visible with zero planned efforts until it is replaced/rebuilt.
- A localhost-only `?interaction-test=1` route is available for safe click-through
  testing. It cannot activate on the Vercel production or preview domains.

V9 SAVE RELIABILITY FIXES
- Missed-workout handling is now separate from rescheduling. A trainer can record a
  follow-up without changing the date, reschedule only after changing the date/time,
  or cancel the assigned workout with a documented reason.
- Validation and storage failures appear inside the active calendar window. Toasts
  also render above open dialogs instead of being hidden behind the modal overlay.
- Successful follow-up and cancellation resolve the originating schedule task so
  stale Action Center and Calendar badges do not remain.
- Normal appointments and team/follow-up calendar items still save independently.
- Profile edits, owner requests, coaching notes, trainer messages, sender identity,
  progress receipts, workout start state, monitoring records, program defaults,
  calibration decisions, supersets, and exercise substitutions now check the write
  result before closing or reporting success.
- Failed program/exercise changes are rolled back where needed so the screen does not
  show an unsaved change as complete.
- V9 uses a new service-worker shell and versioned asset URLs so browsers request the
  repaired files immediately after production deployment.

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

NO NEW SUPABASE SQL IS REQUIRED FOR V9
The V9 save-reliability changes use the existing sync_records JSON architecture. The V5
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
