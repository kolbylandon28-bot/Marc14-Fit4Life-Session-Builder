FIT4LIFE — MULTI-OWNER WEBSITE PACKAGE
Build date: 2026-08-11

WHAT THIS BUILD ADDS
- Three server-authorized roles: owner, trainer, and client.
- More than one active owner may have complete gym access.
- Owners can approve trainer requests, grant another owner, promote or demote
  staff, deactivate or reactivate staff, and review the membership audit trail.
- Trainers retain coaching, client, programming, assessment, report, calendar,
  exercise-library, and messaging access, but cannot change staff permissions.
- Clients remain limited to their own profile, assigned plans, logs, progress,
  messages, check-ins, and assessments.
- The final active owner cannot be demoted or deactivated, preventing a gym
  from accidentally locking itself out.
- Staff must create and verify their own Supabase login before an owner grants
  trainer or owner access. Staff and client access require separate logins.
- The new service-worker version replaces the previous cached interface.

REQUIRED SUPABASE STEP
Before testing Owner Access, run this separate file in Supabase SQL Editor:

  outputs/supabase-owner-role-security.sql

Run it after the existing supabase-trainer-accounts.sql migration. It is safe
to run again and does not delete client or workout data. Do not upload SQL
files to GitHub; they run directly inside Supabase.

GITHUB UPLOAD
1. Open the main branch of the FIT4LIFE GitHub repository.
2. Choose Add file → Upload files.
3. Upload the CONTENTS of this folder—not the outer folder as one nested folder.
4. The repository root must show index.html, cloud-sync.js, sw.js,
   manifest.webmanifest, both icon SVG files, the rock background,
   vercel.json, and the api folder.
5. Commit directly to main. Vercel should deploy the commit automatically.

FIRST OWNER WORKFLOW
1. Sign in with the account that already has the owner membership.
2. Open Coach → Owner Access.
3. The new staff member creates and verifies their own website login.
4. Enter that verified email, display name, and choose Trainer or Owner.
5. Grant access. The membership table—not browser metadata—controls the role.

VERIFICATION COMPLETED BEFORE PACKAGING
- 336 generated-session regression cases
- 2,417 generated exercises inspected
- 1,008 multiweek program-day checks
- 15-assignment cross-device synchronization and conflict recovery test
- Owner-only policy, function, user-interface, cloud-boundary, verified-email,
  staff/client separation, final-owner, and audit-trail contract checks
- Full existing runtime, cloud-sync, package, and JavaScript syntax checks

After Vercel says Ready, use the main production domain and hard-refresh once
so the new service worker replaces the prior cached build.
