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

t("a registration request takes the active branch first",
  /const requestOrganization = cloudOrganizationId \|\| portalOrganizationId/.test(src), true);
t("it no longer depends on the stripped URL parameter",
  /if \(portalOrganizationId\) row\.organization_id = portalOrganizationId;/.test(src), false);
t("a refusal with a known branch is reported, not swallowed",
  /response\.error\.code === "42501" && !requestOrganization/.test(src), true);
t("and it leaves a trace someone can find",
  /fit4lifeRegistrationRequestFailed/.test(src), true);
t("a genuinely missing table is still quiet",
  /response\.error\.code === "42P01"/.test(src), true);

console.log("\n" + pass + " passed, " + fail + " failed");
process.exit(fail ? 1 : 0);
