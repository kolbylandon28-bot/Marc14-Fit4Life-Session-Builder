/* Tests the training-locations model.
   Run:  node js/app/training-locations.test.js

   A client used to have ONE equipment list. A real person trains in several places with
   different equipment in each, and the plan has to match the place they are standing in.
   Locations are now the source of truth; profile.zones is a live mirror of the active one,
   because nine other files read it and none of them should have to change. */
const L = require("./training-locations.js");

let pass = 0, fail = 0;
const t = (name, got, want) => {
  const ok = JSON.stringify(got) === JSON.stringify(want); ok ? pass++ : fail++;
  console.log((ok ? "  PASS  " : "  FAIL  ") + name.padEnd(64) + (ok ? "" : "\n         got " + JSON.stringify(got) + "\n        want " + JSON.stringify(want)));
};

/* ---- migration: nothing may change for an existing client ---- */
const legacy = { name: "Existing", zones: ["rack", "dumbbell"] };
const migrated = L.applyActiveLocation(legacy, {});
t("an existing client becomes one location", migrated.locations.length, 1);
t("their equipment is unchanged", migrated.zones, ["rack", "dumbbell"]);
t("and it is theirs to edit", L.locationIsEditable(migrated.locations[0]), true);
t("a client with nothing gets no phantom location", L.applyActiveLocation({ name: "New" }, {}).locations.length, 0);

/* ---- a gym supplies its own floor, locked ---- */
const gymCtx = { orgName: "Gold's Gym", orgZones: ["rack", "platform", "machine", "cable", "dumbbell"], orgHasFloor: true };
const member = L.applyActiveLocation({ name: "Member" }, gymCtx);
t("a gym member starts with the gym", member.locations[0].name, "Gold's Gym");
t("the gym's floor is theirs to use", member.zones, ["rack", "platform", "machine", "cable", "dumbbell"]);
t("but NOT to edit", L.locationIsEditable(member.locations[0]), false);
t("the gym is always listed first", member.locations[0].source, "org");

const memberWithHome = L.applyActiveLocation(
  { name: "Member", locations: [L.makeLocation({ name: "Home", kind: "home", zones: ["band"] })] }, gymCtx);
t("a member can add their own place", memberWithHome.locations.length, 2);
t("their own place is editable", L.locationIsEditable(memberWithHome.locations[1]), true);
t("the gym still cannot be edited", L.locationIsEditable(memberWithHome.locations[0]), false);

/* A client cannot smuggle an editable copy of the gym in. */
const forged = L.applyActiveLocation(
  { locations: [L.makeLocation({ id: "loc-org", name: "Gold's Gym", zones: ["bodyweight"], source: "org" })] }, gymCtx);
t("a forged org location is replaced by the real one", forged.locations[0].zones, gymCtx.orgZones);
t("and there is still only one of it", forged.locations.filter((x) => x.source === "org").length, 1);

/* ---- an employer or individual branch supplies nothing ---- */
const soloCtx = { orgHasFloor: false };
const employee = L.applyActiveLocation({
  name: "Employee",
  locations: [
    L.makeLocation({ name: "Planet Fitness", kind: "gym", zones: ["machine", "cardio", "dumbbell"] }),
    L.makeLocation({ name: "Garage", kind: "home", zones: ["dumbbell", "band"], notes: "dumbbells to 50lb" }),
    L.makeLocation({ name: "Hotels", kind: "travel", zones: ["bodyweight", "band"] })
  ]
}, soloCtx);
t("three places are kept", employee.locations.length, 3);
t("no gym is invented for them", employee.locations.some((x) => x.source === "org"), false);
t("the first is active by default", employee.zones, ["machine", "cardio", "dumbbell"]);

const travelling = L.applyActiveLocation({ ...employee, activeLocationId: employee.locations[2].id }, soloCtx);
t("switching to hotels narrows the equipment", travelling.zones, ["bodyweight", "band"]);
t("and carries that location's notes", L.applyActiveLocation({ ...employee, activeLocationId: employee.locations[1].id }, soloCtx).equipmentNotes, "dumbbells to 50lb");
t("a stale active id falls back rather than blanking", L.applyActiveLocation({ ...employee, activeLocationId: "gone" }, soloCtx).zones, ["machine", "cardio", "dumbbell"]);

/* ---- fail closed, but only where there is no floor to fall back on ---- */
t("no location in a solo branch blocks generation",
  Boolean(L.generationBlockedReason({ name: "New" }, soloCtx)), true);
t("no location in a gym branch does NOT block, the floor covers it",
  L.generationBlockedReason({ name: "New" }, gymCtx), "");
t("an empty location in a solo branch blocks",
  Boolean(L.generationBlockedReason({ locations: [L.makeLocation({ name: "Home", zones: [] })] }, soloCtx)), true);
t("the message names the place", /Home/.test(L.generationBlockedReason({ locations: [L.makeLocation({ name: "Home", zones: [] })] }, soloCtx)), true);
t("a declared location does not block", L.generationBlockedReason(employee, soloCtx), "");

/* ---- input hygiene ---- */
t("an unknown zone is dropped", L.normalizeZoneList(["rack", "teleporter", "band"]), ["rack", "band"]);
t("duplicates are dropped", L.normalizeZoneList(["band", "band"]), ["band"]);
t("rubbish does not throw", L.normalizeZoneList("not an array"), []);
t("a nameless place still gets a name", L.makeLocation({ kind: "home" }).name, "Home");
t("an unknown kind is tolerated", L.makeLocation({ kind: "spaceship" }).kind, "other");
t("a very long name is cut", L.makeLocation({ name: "x".repeat(200) }).name.length, 60);
t("the summary reads plainly", L.locationSummary(L.makeLocation({ name: "Garage", zones: ["band"] })), "Garage · 1 equipment type");
t("an empty one says so", /nothing ticked/.test(L.locationSummary(L.makeLocation({ name: "Garage" }))), true);

/* The gate existed and nothing called it. generationBlockedReason was written with a comment
   explaining the exact failure - "declaring nothing used to hand over the ENTIRE library,
   barbells included" - and then was never wired to a caller, so the failure it describes was
   live the whole time. session-engine.js:1179 reads an empty zones list as "no filter", so
   silence meant a full commercial gym, not an unknown. Assert the WIRING, not just the rule. */
const mw = require("fs").readFileSync(require("path").join(__dirname, "..", "engine", "multiweek-programs.js"), "utf8");

t("the equipment gate has a caller at all",
  /function equipmentBlockedReason/.test(mw), true);
t("it routes through generationBlockedReason",
  /generationBlockedReason\(profile, trainingLocationContext\(\)\)/.test(mw), true);
t("a full program refuses when equipment is unknown",
  /const equipmentBlock = equipmentBlockedReason\(selectedProfile\);[\s\S]{0,120}?return null;/.test(mw), true);
t("so does a calibration session",
  /const calibrationBlock = equipmentBlockedReason\(profile\);[\s\S]{0,120}?return null;/.test(mw), true);
t("the equipment panel opens when nothing is ticked, not only when something is",
  /!programFilters\.zones\.length/.test(mw), true);

/* Two explicit entries, so the mode is a recorded decision rather than a guess from a dropdown. */
t("a Return rhythm exists for someone who trained before",
  /function returnProgramPhase/.test(mw), true);
t("it rebuilds load rather than teaching the movements",
  /Work from where you are now, not where you were/.test(mw), true);
t("it holds three weeks like the starter",
  /\(programMode === "starter" \|\| programMode === "return"\) \? 3/.test(mw), true);
t("but it does not force his days down to two",
  /mode === "return"[\s\S]{0,400}?weeks\.value = "3"; weeks\.disabled = true;/.test(mw), true);
t("both entry buttons exist",
  /function buildStarterProgram/.test(mw) && /function buildReturnProgram/.test(mw), true);
t("experience highlights a button, it never hides one",
  /classList\.toggle\("primary"/.test(mw), true);
t("week one of a return is reviewed, like week one of a starter",
  /reviewType:"return_week_1"/.test(mw), true);

console.log("\n" + pass + " passed, " + fail + " failed");
process.exit(fail ? 1 : 0);
