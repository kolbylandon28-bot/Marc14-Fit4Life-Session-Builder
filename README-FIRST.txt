FIT4LIFE — CURRENT VERIFIED WEBSITE PACKAGE
Build date: 2026-08-10

THIS is the current upload folder. Older ZIP files under outputs/ are historical releases.

GITHUB UPLOAD
1. Open the main branch of the FIT4LIFE GitHub repository.
2. Remove the previous website files only after keeping a backup.
3. Upload the CONTENTS of this folder—not this outer folder as one nested directory.
4. The repository root must show index.html, cloud-sync.js, sw.js,
   manifest.webmanifest, both icon SVG files, the rock background,
   vercel.json, and the api folder.
5. Commit directly to main. Vercel should deploy the commit automatically.

DO NOT upload the Supabase SQL files with this website package. SQL upgrades are run
separately in Supabase's SQL Editor and are not browser assets.

WHAT THIS BUILD ADDS AND HARDENS
- Every generated workout—including calibration and starter workouts—uses the
  same full editor for prescriptions, replacements, additions, supersets,
  exercise order, phase order, phase details, and workout details.
- Every program edit requires an explicit scope and keeps an auditable coach reason.
- Calibration ownership must be transferred, reassigned, or deliberately removed;
  it cannot disappear silently when an exercise or phase changes.
- Strength calibration includes safe, submaximal bench, squat, and deadlift anchors when
  the client's equipment, schedule, experience, and safety filters permit them.
- Limitation records distinguish severity, current client-reported ability, and
  the trainer's decision. Reviewed mild trials can be used; severe and medical
  holds remain hard stops.
- Profile changes show a downstream impact preview before updating a current
  draft or any not-yet-started assignment. Started and completed records stay intact.
- Approved program edits synchronize into matching not-yet-started assignments.
- Exercise replacements now update the exact visible program row and are checked
  across all selected weeks before the interface reports success.
- Every assignment in a multiweek program is synchronized.
- Assignment state and date-keyed habits are synchronized.
- Conflicting cross-device saves use record versions and merge before retrying.
- Trainer access requires an approved Supabase trainer or owner role; no shared PIN exists.
- Trainer replies use an inline composer instead of browser pop-ups.
- Keyboard focus, mobile touch targets, reduced motion, and support-text readability improved.
- Supabase JS is pinned to an exact version and cached with the offline shell.
- Installable app icons and correct root-level Vercel routing are included.

VERIFICATION COMPLETED BEFORE PACKAGING
- 336 generated-session regression cases
- 2,417 generated exercises inspected by the regression matrix
- 1,008 multiweek program-day checks
- workout replacement, assignment, calibration, intake, readiness, messaging,
  progress, and profile-management runtime checks
- 15-assignment cross-device serialization, conflict merge, daily-habit merge,
  and pull/apply restoration test
- package file references, manifest, route configuration, and JavaScript syntax checks

After Vercel says Ready, open the main production domain—not a protected preview URL—
and hard-refresh once so the new service worker replaces the old cached build.
