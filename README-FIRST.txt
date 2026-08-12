FIT4LIFE — UPDATE 3 + STABLE LINK + V5 GOVERNANCE
Build date: 2026-08-12

THIS is the versioned upload folder. It preserves the newer Update 3 workout and
multiweek-program editor while adding the agreed V5 owner/trainer boundaries.

USE THE SAME PUBLIC LINK AFTER EVERY DEPLOYMENT
Public production link:
https://marc14-fit4-life-session-builder.vercel.app

1. Keep using the SAME Vercel project.
2. Deploy the repository's production branch (normally main).
3. Do not create a new Vercel project for each upload.
4. Share the production domain above—not a generated preview/deployment URL.
5. In Vercel Project Settings > Domains, confirm the domain above is attached to
   this project and points to the latest Production deployment.
6. After Vercel reports Ready, open the Production link and confirm V5 appears. This
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
