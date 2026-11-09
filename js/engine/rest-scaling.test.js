/* Tests that a rest string survives being scaled for a short session.
   Run:  node js/engine/rest-scaling.test.js

   What this protects. Before 2026-11-09:
   - "90 sec-2 min" was read as the numbers 90 and 2, averaged to 46, then seen as "min" - so
     restToMinutes returned 46 MINUTES instead of 1.75, and a 45-minute strength session printed
     "rest 77-78 min". accessoryRest() hands that string to the secondary and accessory phases for
     both the strength and athletic goals, at every experience level and age.
   - Scaling deleted every word around the numbers. "full, 60-90 sec" became "45-70 sec", and the
     age extension "(+15-30s)" that ageAdjustRx() adds for clients 45+ vanished from 30- and
     45-minute sessions entirely. */
const fs = require("fs"), path = require("path");
const api = new Function(fs.readFileSync(path.join(__dirname, "session-engine.js"), "utf8")
  + "; return { restToMinutes, scaleRest, scaleRestNumbers, restHasMixedUnits, mixedRestSeconds };")();

let pass = 0, fail = 0;
const t = (name, got, want) => {
  const ok = JSON.stringify(got) === JSON.stringify(want); ok ? pass++ : fail++;
  console.log((ok ? "  PASS  " : "  FAIL  ") + name.padEnd(62) + (ok ? "" : "\n         got " + JSON.stringify(got) + "\n        want " + JSON.stringify(want)));
};
const DASH = "–";

/* The bug itself. */
t("a mixed-unit rest is read in seconds, not averaged raw",
  api.restToMinutes("90 sec" + DASH + "2 min"), 1.75);
t("mixedRestSeconds carries the unit backwards from the right",
  api.mixedRestSeconds("90 sec" + DASH + "2 min"), [90, 120]);
t("and a mixed rest scales to seconds, not tens of minutes",
  api.scaleRest("90 sec" + DASH + "2 min", 0.85), "75" + DASH + "100 sec");

/* Plain strings must be untouched - this is what makes the port safe. */
t("a plain seconds range is unchanged", api.scaleRest("60" + DASH + "90 sec", 0.85), "50" + DASH + "75 sec");
t("a plain minutes range is unchanged", api.scaleRest("2" + DASH + "3 min", 0.75), "2" + DASH + "3 min");
t("factor 1 returns the string untouched", api.scaleRest("90 sec" + DASH + "2 min", 1), "90 sec" + DASH + "2 min");
t("'as needed' is left alone", api.scaleRest("as needed", 0.75), "as needed");

/* The words. */
t("a trailing phrase survives scaling",
  api.scaleRest("20" + DASH + "30 sec between stations", 0.75), "15" + DASH + "25 sec between stations");
t("a leading phrase survives scaling",
  api.scaleRest("full, 60" + DASH + "90 sec", 0.85), "full, 50" + DASH + "75 sec");
t("a parenthetical survives scaling",
  api.scaleRest("60" + DASH + "90 sec (full quality)", 0.85), "50" + DASH + "75 sec (full quality)");
t("the 45+/55+ age extension is no longer deleted",
  api.scaleRest("2" + DASH + "3 min (+15" + DASH + "30s)", 0.75), "2" + DASH + "3 min (+15" + DASH + "30s)");

/* The regression that started it: no rest string in the app may scale into double-digit minutes. */
const REST_STRINGS = ["20" + DASH + "30 sec between stations","2" + DASH + "3 min","3 min","30 sec","30" + DASH + "45 sec","3" + DASH + "5 min","45" + DASH + "60 sec","60" + DASH + "75 sec","60" + DASH + "90 sec (full quality)","60" + DASH + "90 sec","75" + DASH + "90 sec","90 sec" + DASH + "2 min","2 min","30 sec between rounds","30" + DASH + "60 sec","60 sec","75" + DASH + "120 sec","90 sec easy","90 sec","90" + DASH + "120 sec","full, 60" + DASH + "90 sec"];
let absurd = [];
for (const r of REST_STRINGS) for (const f of [0.75, 0.85, 1.0]) {
  if (api.restToMinutes(api.scaleRest(r, f)) > 10) absurd.push(r + " @" + f + " -> " + api.scaleRest(r, f));
}
t("no rest in the app scales past 10 minutes", absurd, []);

console.log("\n" + pass + " passed, " + fail + " failed");
process.exit(fail ? 1 : 0);
