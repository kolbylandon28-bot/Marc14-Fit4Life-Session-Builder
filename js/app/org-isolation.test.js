/* Tests that nothing belonging to one branch survives a switch to another.
   Run:  node js/app/org-isolation.test.js

   The previous version of this file tested the WIPE against a fake five-entry key list. It
   proved the loop worked and never once proved the list was complete — so four separate
   sweeps each "finished" while seven real keys kept crossing branches, including one holding
   a branch's client email addresses and one mapping trainer names to logins, which was then
   written into another branch's client records.

   The wipe is now by PREFIX with a short keep list, and the important test here is the last
   one: it reads the whole repository and fails if any fit4life_ key is introduced that would
   survive a branch change without being argued onto that list. */
const fs = require("fs"), path = require("path");
const root = path.join(__dirname, "..", "..");
const src = fs.readFileSync(path.join(root, "cloud-sync.js"), "utf8");

let pass = 0, fail = 0;
const t = (name, got, want) => {
  const ok = JSON.stringify(got) === JSON.stringify(want); ok ? pass++ : fail++;
  console.log((ok ? "  PASS  " : "  FAIL  ") + name.padEnd(64) + (ok ? "" : "\n         got " + JSON.stringify(got) + "\n        want " + JSON.stringify(want)));
};

/* Run the real wipe against a real-shaped store. */
function runWipe(keys, { from = "user-a|org-1", to = "user-a|org-2" } = {}) {
  const store = {};
  keys.forEach((k) => { store[k] = "data"; });
  store["fit4life_account_cache_owner_v1"] = from;
  const localStorage = {
    get length() { return Object.keys(store).length; },
    key: (i) => Object.keys(store)[i],
    getItem: (k) => (k in store ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: (k) => { delete store[k]; }
  };
  const deleted = [];
  const win = { indexedDB: { deleteDatabase: (n) => deleted.push(n) } };
  const body = src.match(/const BRANCH_SAFE_KEYS = new Set\(\[[\s\S]*?\n  \]\);/)[0]
    + src.match(/function isolateSensitiveCacheForUser\([\s\S]*?\n  \}/)[0];
  const fn = new Function("localStorage", "window", "ACTIVE_BRANCH_KEY", "ACCOUNT_CACHE_OWNER_KEY",
    "pendingScopes", "persistPendingScopes",
    body + "; return isolateSensitiveCacheForUser;")(
      localStorage, win, "fit4life_active_branch_v1", "fit4life_account_cache_owner_v1",
      { cleared: 0, clear() { this.cleared++; } }, function () {});
  const [u, o] = to.split("|");
  fn(u, "owner", o);
  return { remaining: Object.keys(store).sort(), deletedDbs: deleted };
}

const SAMPLE = [
  "fit4life_profiles_v1", "fit4life_progress_v1", "fit4life_gym_brand_v1",
  "fit4life_gym_equipment_v1", "fit4life_active_branch_v1", "fit4life_pending_signup_v1",
  /* the seven that used to survive */
  "fit4life_booking_import_v1", "fit4life_trainer_aliases_v1", "fit4life_live_workouts_v1",
  "fit4life_active_area_v1", "fit4life_audit_hidden_trainers_v1",
  "fit4life_walkthrough_snapshot_v1", "fit4life_coach_filters_v1",
  /* and something nobody has written yet */
  "fit4life_some_future_key_v1"
];

const after = runWipe(SAMPLE);
t("a roster does not cross branches", after.remaining.includes("fit4life_profiles_v1"), false);
t("the booking-import cache does not either", after.remaining.includes("fit4life_booking_import_v1"), false);
t("nor the trainer aliases that get written into client rows", after.remaining.includes("fit4life_trainer_aliases_v1"), false);
t("nor a live workout", after.remaining.includes("fit4life_live_workouts_v1"), false);
t("nor the active work area", after.remaining.includes("fit4life_active_area_v1"), false);
t("A KEY NOBODY HAS WRITTEN YET is wiped by default", after.remaining.includes("fit4life_some_future_key_v1"), false);
t("InBody scan files are deleted too", after.deletedDbs, ["fit4life_inbody_files"]);

t("the branch choice survives, or switching bounces back", after.remaining.includes("fit4life_active_branch_v1"), true);
t("the scope marker survives", after.remaining.includes("fit4life_account_cache_owner_v1"), true);
t("branding survives so the page does not flash", after.remaining.includes("fit4life_gym_brand_v1"), true);
t("the pre-sign-in signup draft survives", after.remaining.includes("fit4life_pending_signup_v1"), true);

const sameBranch = runWipe(SAMPLE, { from: "user-a|org-1", to: "user-a|org-1" });
t("staying put wipes nothing", sameBranch.remaining.length, SAMPLE.length + 1);
const sameOrgNewUser = runWipe(SAMPLE, { from: "user-a|org-1", to: "user-b|org-1" });
t("a different person on the same device is wiped", sameOrgNewUser.remaining.includes("fit4life_profiles_v1"), false);

/* The keep list is the whole risk surface. Keep it short and deliberate. */
const keep = (src.match(/const BRANCH_SAFE_KEYS = new Set\(\[([\s\S]*?)\n  \]\);/) || [])[1] || "";
const keepCount = (keep.match(/"fit4life[^"]*"/g) || []).length + (keep.match(/\b(ACTIVE_BRANCH_KEY|ACCOUNT_CACHE_OWNER_KEY)\b/g) || []).length;
t("the keep list is small enough to audit by eye", keepCount <= 6, true);
t("it is documented", /The ONLY keys allowed to cross a branch change/.test(src), true);

/* THE COVERAGE TEST — the one the old file was missing.
   Read every source file, find every fit4life_ localStorage key, and prove each one is
   either wiped or deliberately kept. A new key added tomorrow fails this on day one. */
function allKeysInRepo() {
  const found = new Set();
  const walk = (dir) => {
    fs.readdirSync(dir, { withFileTypes: true }).forEach((e) => {
      if (e.name === "node_modules" || e.name.startsWith(".")) return;
      const full = path.join(dir, e.name);
      if (e.isDirectory()) return walk(full);
      if (!/\.(js|html)$/.test(e.name) || e.name.includes(".test.")) return;
      const text = fs.readFileSync(full, "utf8");
      (text.match(/"fit4life_[a-z0-9_]+"|'fit4life_[a-z0-9_]+'/g) || []).forEach((m) => found.add(m.slice(1, -1)));
    });
  };
  walk(root);
  return [...found];
}
const repoKeys = allKeysInRepo();
t("the repo actually uses fit4life_ keys", repoKeys.length > 5, true);
const survivors = runWipe(repoKeys).remaining.filter((k) => k !== "fit4life_account_cache_owner_v1");
const KEEP = ["fit4life_active_branch_v1", "fit4life_gym_brand_v1", "fit4life_gym_equipment_v1", "fit4life_pending_signup_v1"];
t("every key in the repo is wiped or deliberately kept", survivors.filter((k) => !KEEP.includes(k)), []);

console.log("\n" + pass + " passed, " + fail + " failed");
process.exit(fail ? 1 : 0);
