# FIT4LIFE V9 save audit

Date: 2026-08-13  
Asset set: `20260813-v9-save-audit-r3`

## Root cause of the reported calendar failure

The assigned-workout editor treated every save as a reschedule. It rejected a save
when date and time were unchanged—even when the trainer was documenting a missed
workout—and the rejection toast was behind the modal because the toast had a lower
stacking level. The interface therefore appeared to accept input while Save seemed
to do nothing.

## Calendar repair

- Added separate actions for Reschedule, Missed-workout follow-up, and Cancel.
- Added action-specific guidance, labels, validation, and success messages.
- Added visible inline feedback inside the dialog.
- Raised toast layering above secondary menus.
- Resolved originating schedule notices after follow-up/cancellation.
- Kept assigned-workout identity/status read-only while retaining editable schedule
  controls for normal appointments, follow-ups, and team tasks.
- Refused to close the dialog when the required storage write fails.

## Broader persistence audit

Write-result checks were added to the connected user workflows, including:

- client profile creation/editing and connected rename records;
- owner approval requests and decisions;
- coaching notes and trainer/client messages;
- progress receipts and workout start state;
- program save/publish/defaults, calibration review, prescriptions, supersets, and
  exercise substitution/addition;
- gym setup, teams, optional performance plans, monitoring, templates, and alert
  rules;
- trainer Settings sender identity.

Where a multi-record workflow cannot complete its required write, the dialog remains
open or the in-memory change is restored and the user receives a specific failure
message. A success message is shown only after the primary record is stored.

## Browser verification

Passed against a clean localhost origin using the app's hostname-locked interaction
test mode:

1. Missed-workout cancellation saved, closed the dialog, and cleared both Action
   Center and Calendar schedule badges.
2. Normal calendar appointment saved and remained after reload.
3. Client profile age edit saved and remained after reload.
4. Owner request submitted and appeared in the pending queue.
5. Coaching note saved and remained after reload.
6. Trainer reply saved and remained after reload.
7. Settings sender name saved and remained after reload.
8. Missing/unchanged calendar input produced visible inline validation while leaving
   the dialog open.
9. Final browser console: zero errors.

Static verification also passed for every JavaScript file, the service worker, and
226 application functions referenced from inline click handlers.

## Deployment

Upload this folder's contents to the existing GitHub repository root and deploy the
same Vercel Production project. Keep sharing:

`https://marc14-fit4-life-session-builder.vercel.app`

No new Supabase SQL is required for V9. Run `supabase-v5-role-boundaries.sql` only if
that existing role-boundary migration has not already been applied.
