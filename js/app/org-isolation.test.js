/* Tests that one organization's cached data can never appear under another's.
   Run:  node js/app/org-isolation.test.js

   What this protects. Before 2026-11-09 the local cache was keyed on the USER alone, and only ever
   cleared when role === "client". An owner of two gyms kept the first gym's roster, profiles and
   pending-sync queue in localStorage while signed into the second. Observed live: Journey
   Financial Services branding in the topbar with BYU-Idaho's work areas underneath. The pending
   queue lives in those same keys, so the stale rows could also sync UP into the wrong gym.
   Separately, applyMembershipContext trusted the ?gym= slug even when the session resolved to a
   different organization, which is what put one customer's name over another's data. */
const fs = require("fs"), path = require("path");
const src = fs.readFileSync(path.join(__dirname, "..", "..", "cloud-sync.js"), "utf8");

let pass = 0, fail = 0;
const t = (name, got, want) => {
  const ok = JSON.stringify(got) === JSON.stringify(want); ok ? pass++ : fail++;
  console.log((ok ? "  PASS  " : "  FAIL  ") + name.padEnd(66) + (ok ? "" : "\n         got " + JSON.stringify(got) + "\n        want " + JSON.stringify(want)));
};

const grab = (name) => {
  const found = src.match(new RegExp("function " + name + "\\([\\s\\S]*?\\n  \\}"));
  if (!found) throw new Error("could not find " + name + " in cloud-sync.js");
  return found[0];
};

/* Run the real function against a fake localStorage. */
function runIsolation(calls) {
  const store = {};
  const wiped = [];
  const CLOUD_KEYS = { profiles:"k_profiles", progress:"k_progress", checkins:"k_checkins", gymBrand:"k_brand", gymEquipment:"k_equip" };
  const localStorage = {
    getItem: (k) => (k in store ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: (k) => { wiped.push(k); delete store[k]; },
  };
  const pendingScopes = { cleared: 0, clear() { this.cleared++; } };
  const fn = new Function("localStorage", "CLOUD_KEYS", "ACCOUNT_CACHE_OWNER_KEY", "pendingScopes", "persistPendingScopes",
    grab("isolateSensitiveCacheForUser") + "; return isolateSensitiveCacheForUser;")(
      localStorage, CLOUD_KEYS, "owner_key", pendingScopes, function () {});
  Object.values(CLOUD_KEYS).forEach((k) => { store[k] = "data"; });
  calls.forEach(([u, r, o]) => fn(u, r, o));
  return { store, wiped, cleared: pendingScopes.cleared };
}

const sameOrg = runIsolation([["user-a", "owner", "org-1"], ["user-a", "owner", "org-1"]]);
t("staying in one gym keeps the cache", sameOrg.wiped.length, 0);

const switched = runIsolation([["user-a", "owner", "org-1"], ["user-a", "owner", "org-2"]]);
t("switching gyms wipes the roster", switched.wiped.includes("k_profiles"), true);
t("switching gyms wipes progress", switched.wiped.includes("k_progress"), true);
t("switching gyms clears the pending-sync queue", switched.cleared, 1);
t("but keeps the branding so the page does not flash", switched.wiped.includes("k_brand"), false);
t("and keeps the equipment config", switched.wiped.includes("k_equip"), false);

const asTrainer = runIsolation([["user-a", "trainer", "org-1"], ["user-a", "trainer", "org-2"]]);
t("an owner or trainer is wiped too, not only a client", asTrainer.wiped.includes("k_profiles"), true);

const otherUser = runIsolation([["user-a", "owner", "org-1"], ["user-b", "owner", "org-1"]]);
t("a different person on the same device is wiped", otherUser.wiped.includes("k_profiles"), true);

const first = runIsolation([["user-a", "owner", "org-1"]]);
t("a first-ever sign-in wipes nothing", first.wiped.length, 0);

/* The shape of both fixes, so a refactor cannot quietly undo them. */
t("the cache scope includes the organization",
  /const scope = String\(userId \|\| ""\) \+ "\|" \+ String\(organizationId \|\| ""\)/.test(src), true);
t("the call site passes the organization",
  /isolateSensitiveCacheForUser\(cloudUser\.id, cloudRole, cloudOrganizationId\)/.test(src), true);
t("a mismatched ?gym= slug is dropped rather than displayed",
  /portalOrganizationId !== membership\.organization_id/.test(src), true);

console.log("\n" + pass + " passed, " + fail + " failed");
process.exit(fail ? 1 : 0);
