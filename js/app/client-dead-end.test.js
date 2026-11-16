/* Tests that a signed-in client is never stranded with nothing to press.
   Run:  node js/app/client-dead-end.test.js

   A real client — the owner's sister — signed in, landed on the right branch, and saw
   "No client access assigned ... Contact that gym's trainer." The button underneath
   ALREADY re-ran the claim, so one tap would have connected her the moment her profile
   existed. The words told her it was hopeless.

   She was also invisible from the trainer's side: the registration_requests insert only
   set organization_id when a ?gym= portal org had been resolved, and the switcher strips
   that parameter — so the row was orphaned, the insert refused, and the refusal was
   swallowed as "self-signup is not installed". No profile, no request, nothing to see. */
const fs = require("fs"), path = require("path");
const src = fs.readFileSync(path.join(__dirname, "..", "..", "cloud-sync.js"), "utf8");

let pass = 0, fail = 0;
const t = (name, got, want) => {
  const ok = JSON.stringify(got) === JSON.stringify(want); ok ? pass++ : fail++;
  console.log((ok ? "  PASS  " : "  FAIL  ") + name.padEnd(62) + (ok ? "" : "\n         got " + JSON.stringify(got) + "\n        want " + JSON.stringify(want)));
};

t("the dead-end copy no longer says contact the trainer", /Contact that gym's trainer/.test(src), false);
t("it tells her to try again instead", /press Check again/.test(src), true);
t("the button is relabelled for that state", /setText\("cloudPendingCheck", "Check again"\)/.test(src), true);
t("the heading is not a refusal", /No client access assigned/.test(src), false);
t("the button still re-runs the claim", /fit4lifeCloudCheckApproval[\s\S]{0,700}await handleSession\(sessionResponse\.data\.session\)/.test(src), true);

/* This used to assert the literal `cloudOrganizationId || portalOrganizationId` at both call
   sites. That pair was not enough: requestedPortalSlug() reads ?gym= and NOTHING ELSE, and the
   manifest start_url is "/", so every PWA relaunch arrived with no parameter, portalOrganizationId
   fell back to the is_default branch, and a pending client was scoped to the wrong one - her real
   row missed, a SECOND pending request filed next door, and then 22023 'registration is ambiguous'
   on every attempt after that with nothing in the app able to clear either row. The order is now
   three deep and asserted as an order, not as one literal. */
const branchResolver = (src.match(/async function requestBranchId\(\)[\s\S]*?\n  \}/) || [""])[0];
t("the branch resolver exists", branchResolver.length > 0, true);
t("a registration request takes the active branch first",
  /if \(cloudOrganizationId\) return cloudOrganizationId;/.test(branchResolver), true);
t("then the branch her own signup recorded",
  /const fromSignup = await signupMetadataBranchId\(\);/.test(branchResolver), true);
t("and the ?gym= link only last",
  /return fromSignup \|\| portalOrganizationId \|\| "";/.test(branchResolver), true);
t("the signup branch comes from user_metadata, which nothing can strip",
  /user_metadata \|\| \{\}\)\.organization_slug/.test(src), true);
t("and is resolved through the same RPC the portal uses",
  /signupMetadataBranchId\(\)[\s\S]{0,600}rpc\("resolve_gym_portal"/.test(src), true);
t("a failed resolve is not cached as an answer",
  /if \(!row \|\| !row\.organization_id\) return "";/.test(src), true);
/* Lookup, file and the realtime watch must agree, or one of them reads a branch the others
   never write. All three go through the one resolver. */
/* Four now: the lookup, the file, the realtime watch, and the claim. The claim used to
   read portalOrganizationId directly, so it could land in one branch while her request sat
   in another. */
t("every registration path shares the one resolver",
  (src.match(/await requestBranchId\(\)/g) || []).length, 4);
t("it no longer depends on the stripped URL parameter",
  /if \(portalOrganizationId\) row\.organization_id = portalOrganizationId;/.test(src), false);
t("the realtime watch no longer reads the bare portal id",
  /const watchedOrganization = cloudOrganizationId \|\| portalOrganizationId/.test(src), false);
/* Was pinned to `code === "42501" && !requestOrganization`. The function now refuses to
   insert at all without a branch, so that clause could never be true and a real 42501 was
   the only thing it would have excused. A missing table is the ONLY expected error now. */
t("a refusal with a known branch is reported, not swallowed",
  /const expected = response\.error\.code === "42P01";/.test(src), true);
t("no branch means no insert is attempted",
  /if \(!requestOrganization\) \{[\s\S]{0,220}?return null;/.test(src), true);
t("and it leaves a trace someone can find",
  /fit4lifeRegistrationRequestFailed/.test(src), true);
t("a genuinely missing table is still quiet",
  /response\.error\.code === "42P01"/.test(src), true);
/* The NOT NULL columns. registration_requests.username has no default and full_name carries
   a >= 2 character CHECK, so an insert omitting either raises 23502/23514 every time. That
   is what stranded 18 signed-up accounts: the recovery path could never write its own row. */
t("the insert supplies username",
  /username: identity\.username/.test(src), true);
t("username is derived, not left blank",
  /replace\(\/\[\^a-z0-9\._-\]\+\/g, "-"\)/.test(src), true);
t("full_name clears the two-character check",
  /if \(fullName\.length < 2\)/.test(src), true);
t("there is a last-resort identity when metadata and email give nothing",
  /"client-" \+ String\(user\.id \|\| ""\)\.slice\(0, 8\)/.test(src), true);
t("a trainer request is not filed as a client request",
  /meta\.requested_role === "trainer"/.test(src) && !/requested_role: meta\.requested_role/.test(src), true);
t("requested_role is pinned to client, which is all the RLS policy allows",
  /requested_role: "client"/.test(src), true);

console.log("\n" + pass + " passed, " + fail + " failed");
process.exit(fail ? 1 : 0);
