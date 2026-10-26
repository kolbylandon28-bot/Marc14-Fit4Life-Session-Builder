/* Tests for which side of the building a client belongs to.
   Run:  node js/app/client-areas.test.js

   What these protect: a pool trainer sees pool clients and not gym ones, somebody who uses
   both sides shows up on both rosters, and a client nobody has placed yet is never hidden
   from everyone at once - a record that vanishes from every screen is worse than one that
   turns up on an extra. */
const fs = require("fs"), path = require("path");
const src = fs.readFileSync(path.join(__dirname, "readiness-progress.js"), "utf8");
const hub = fs.readFileSync(path.join(__dirname, "..", "trainer", "trainer-hub.js"), "utf8");

let pass = 0, fail = 0;
const t = (name, got, want) => {
  const ok = JSON.stringify(got) === JSON.stringify(want); ok ? pass++ : fail++;
  console.log((ok ? "  PASS  " : "  FAIL  ") + name.padEnd(62) + (ok ? "" : "\n         got " + JSON.stringify(got) + "\n        want " + JSON.stringify(want)));
};

/* The two helpers, lifted out so the real logic is exercised rather than its source text. */
let ACTIVE = "", ALL = [];
const api = new Function("loadProfiles", "activeWorkArea",
  src.match(/function profileInArea[\s\S]*?\n}\nfunction profilesInActiveArea[\s\S]*?\n}/)[0]
  + "; return { profileInArea, profilesInActiveArea };")(() => ALL, () => ACTIVE);

const client = (name, areas) => ({ id: "p-" + name.toLowerCase(), name, areas });
const gymOnly = client("GymOnly", ["gym"]);
const both = client("Both", ["gym", "pool"]);
const poolOnly = client("PoolOnly", ["pool"]);
const unplaced = client("Unplaced", []);
const legacy = { id: "p-legacy", name: "Legacy" };           // saved before areas existed

/* ---------- one client against one area ---------- */
t("a gym client is in the gym", api.profileInArea(gymOnly, "gym"), true);
t("and not in the pool", api.profileInArea(gymOnly, "pool"), false);
t("someone on both sides is in the gym", api.profileInArea(both, "gym"), true);
t("and in the pool too", api.profileInArea(both, "pool"), true);
t("a client nobody placed is shown anywhere", api.profileInArea(unplaced, "pool"), true);
t("so is one saved before areas existed", api.profileInArea(legacy, "pool"), true);
t("with no area in mind, everyone counts", api.profileInArea(poolOnly, ""), true);

/* ---------- the roster for the area you are standing in ---------- */
ALL = [gymOnly, both, poolOnly, unplaced, legacy];

ACTIVE = "gym";
t("the gym roster leaves out pool-only clients",
  api.profilesInActiveArea().map((p) => p.name), ["GymOnly", "Both", "Unplaced", "Legacy"]);

ACTIVE = "pool";
t("the pool roster leaves out gym-only clients",
  api.profilesInActiveArea().map((p) => p.name), ["Both", "PoolOnly", "Unplaced", "Legacy"]);

ACTIVE = "";
t("with no area picked nobody is filtered out",
  api.profilesInActiveArea().map((p) => p.name), ["GymOnly", "Both", "PoolOnly", "Unplaced", "Legacy"]);

ACTIVE = "maintenance";
t("an area with no clients of its own still shows the unplaced",
  api.profilesInActiveArea().map((p) => p.name), ["Unplaced", "Legacy"]);

t("a caller can pass its own list instead of a fresh load",
  api.profilesInActiveArea([gymOnly, poolOnly]).map((p) => p.name), []);

/* ---------- the record and the editor ---------- */
t("a new client joins the area the trainer is standing in", /areas: \[\.\.\.new Set\(\(Array\.isArray\(target\.areas\)/.test(src), true);
t("the editor seeds the areas it was given", /profileEditorDraft = \{ areas: \[\.\.\.\(profile\.areas \|\| \[\]\)\]/.test(src), true);
t("and saves them back", /areas: \[\.\.\.\(profileEditorDraft\.areas \|\| \[\]\)\]/.test(src), true);
t("moving a client between areas is a capability, not a hard-coded role",
  /fit4lifeCan\("clients\.areas\.edit"\)/.test(src), true);

/* ---------- the roster must not compare rebuilt objects ---------- */
// loadProfiles builds new objects on every call, so holding two lists and comparing by
// identity marked every client as being somewhere else and emptied the roster.
t("the roster compares clients by id, not by object identity", /here\.has\(profile\.id\)/.test(hub), true);
t("and loads the list once", /const everyone = loadProfiles\(\);/.test(hub), true);
t("names from progress and scans are dropped when the client is elsewhere",
  /!elsewhere\.some\(\(other\) => clientMatches\(other, name\)\)/.test(hub), true);

console.log("\n" + pass + " passed, " + fail + " failed");
process.exit(fail ? 1 : 0);
