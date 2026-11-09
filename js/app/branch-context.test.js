/* Tests the branch-resolution and module-gating rules added in V162.
   Run:  node js/app/branch-context.test.js

   Why these exist. Before V162 the app took memberships[0] - the oldest - and the database
   took `limit 1` ordered only by owner-first. With two owner memberships both picked
   arbitrarily, so BYU-Idaho's work areas opened under Journey Financial Services' name.
   The rule now is: one membership resolves silently, more than one must be CHOSEN, and the
   facility layer is off for a branch that has no building. */
const fs = require("fs"), path = require("path");
const root = path.join(__dirname, "..", "..");
const cloudSrc = fs.readFileSync(path.join(root, "cloud-sync.js"), "utf8");
const switcherSrc = fs.readFileSync(path.join(root, "js", "app", "branch-switcher.js"), "utf8");

let pass = 0, fail = 0;
const t = (name, got, want) => {
  const ok = JSON.stringify(got) === JSON.stringify(want); ok ? pass++ : fail++;
  console.log((ok ? "  PASS  " : "  FAIL  ") + name.padEnd(64) + (ok ? "" : "\n         got " + JSON.stringify(got) + "\n        want " + JSON.stringify(want)));
};
const grab = (src, name) => {
  const m = src.match(new RegExp("function " + name + "\\([\\s\\S]*?\\n  \\}"));
  if (!m) throw new Error("could not find " + name);
  return m[0];
};

/* ---- pickMembership: the refuse-to-guess rule ---- */
function runPick(rows, { stored = "", portal = "" } = {}) {
  const win = {};
  const localStorage = { getItem: () => stored || null, setItem() {}, removeItem() {} };
  const fn = new Function("localStorage", "ACTIVE_BRANCH_KEY", "portalOrganizationId", "window",
    grab(cloudSrc, "storedBranchId") + grab(cloudSrc, "pickMembership") + "; return pickMembership;"
  )(localStorage, "k", portal, win);
  return { picked: fn(rows), needsChoice: win.fit4lifeBranchChoiceNeeded === true };
}
const byui = { organization_id: "org-byui", role: "owner" };
const journey = { organization_id: "org-journey", role: "owner" };

t("no memberships picks nothing", runPick([]).picked, null);
t("one membership resolves silently", runPick([byui]).picked, byui);
t("one membership never asks", runPick([byui]).needsChoice, false);
t("two memberships refuse to guess", runPick([byui, journey]).picked, null);
t("two memberships ask instead", runPick([byui, journey]).needsChoice, true);
t("a remembered branch wins", runPick([byui, journey], { stored: "org-journey" }).picked, journey);
t("a remembered branch asks nothing", runPick([byui, journey], { stored: "org-journey" }).needsChoice, false);
t("a stale remembered branch still asks", runPick([byui, journey], { stored: "org-gone" }).needsChoice, true);
t("a ?gym= link resolves it", runPick([byui, journey], { portal: "org-byui" }).picked, byui);
t("the remembered branch beats the link", runPick([byui, journey], { stored: "org-journey", portal: "org-byui" }).picked, journey);

/* ---- moduleEnabled: defaults come from org_type, so no data migration ---- */
function runModule(orgType, modules) {
  const win = { fit4lifeOrgType: orgType, fit4lifeOrgModules: modules };
  const defaults = cloudSrc.match(/const MODULE_DEFAULTS = \{[\s\S]*?\n  \};/)[0];
  return new Function("window", defaults + grab(cloudSrc, "moduleEnabled") + "; return moduleEnabled;")(win);
}
t("BYU-Idaho keeps its facility", runModule("university", {})("facility"), true);
t("BYU-Idaho keeps volunteers", runModule("university", {})("volunteers"), true);
t("BYU-Idaho keeps the booking import", runModule("university", {})("booking_import"), true);
t("an employer gets no facility", runModule("employer", {})("facility"), false);
t("an employer gets no time clock", runModule("employer", {})("timeclock"), false);
t("an employer gets no volunteer shifts", runModule("employer", {})("volunteers"), false);
t("an employer still gets coaching consultation", runModule("employer", {})("consultation"), true);
t("a gym gets a facility but no volunteers", [runModule("gym", {})("facility"), runModule("gym", {})("volunteers")], [true, false]);
t("an individual branch gets no facility", runModule("individual", {})("facility"), false);
t("an explicit flag beats the preset", runModule("employer", { facility: true })("facility"), true);
t("an explicit false beats the preset", runModule("university", { volunteers: false })("volunteers"), false);
t("an unknown org_type keeps the facility rather than regressing", runModule("something-new", {})("facility"), true);
t("a missing org_type keeps the facility", runModule(undefined, {})("facility"), true);

/* ---- the shape of the fixes, so a refactor cannot quietly undo them ---- */
t("the branch choice survives the cache wipe", /ACTIVE_BRANCH_KEY = "fit4life_active_branch_v1"/.test(cloudSrc)
  && !/activeBranch:\s*"fit4life_active_branch/.test(cloudSrc), true);
t("area RPCs send the branch explicitly", /payload\.org_id = cloudOrganizationId/.test(cloudSrc), true);
t("no bare rpc call is left on the org-scoped readers",
  !/cloudClient\.rpc\("list_fit4life_(work_areas|staff_areas|trainer_audits|audit_trainers|staff_invites|trainer_tiers)"\)/.test(cloudSrc), true);
t("org settings now fetch type and modules", /org_type,modules,config,is_template/.test(cloudSrc), true);
t("the switcher hides itself for a single-branch account", /rows\.length < 2/.test(switcherSrc), true);

const { branchTypeLabel } = require("./branch-switcher.js");
t("an employer branch reads as a business", branchTypeLabel({ org_type: "employer" }), "Business");
t("an individual branch reads as people", branchTypeLabel({ org_type: "individual" }), "People");
t("an unknown type still reads as something", branchTypeLabel({ org_type: "" }), "Branch");

console.log("\n" + pass + " passed, " + fail + " failed");
process.exit(fail ? 1 : 0);
