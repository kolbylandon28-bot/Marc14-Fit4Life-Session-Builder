/* Tests that the weight field says WHICH weight it wants.
   Run:  node js/app/load-mode.test.js

   The field was labelled "Weight". Holding two 50lb dumbbells, a client has no way to know
   whether to enter 50 or 100 — and the app had no way to know which they meant, so every
   "you lifted more than last time" comparison rested on a guess.

   The rule: a dumbbell or kettlebell is logged as ONE implement, because that is what a
   lifter means and what the rack is labelled with. A barbell is logged as everything on it,
   bar included. Where only one implement is used — a goblet squat — the two are the same
   number, so asking per-implement is always safe. */
const fs = require("fs"), path = require("path");
const src = fs.readFileSync(path.join(__dirname, "program-app.js"), "utf8");

let pass = 0, fail = 0;
const t = (name, got, want) => {
  const ok = JSON.stringify(got) === JSON.stringify(want); ok ? pass++ : fail++;
  console.log((ok ? "  PASS  " : "  FAIL  ") + name.padEnd(58) + (ok ? "" : "\n         got " + JSON.stringify(got) + "\n        want " + JSON.stringify(want)));
};
const modes = src.match(/const LOAD_MODES = \{[\s\S]*?\n\};/)[0];
const api = new Function(modes
  + src.match(/function loadModeFor\(exercise\) \{[\s\S]*?\n\}/)[0]
  + src.match(/function weightFieldLabel\(exercise\) \{[\s\S]*?\n\}/)[0]
  + "; return { loadModeFor, weightFieldLabel };")();
const label = (zone) => api.weightFieldLabel({ zone });
const mode = (zone) => api.loadModeFor({ zone }).mode;

t("a dumbbell is one dumbbell", label("dumbbell"), "Weight · each dumbbell");
t("a kettlebell is one bell", label("kettlebell"), "Weight · each bell");
t("a barbell on a rack is everything on it", label("rack"), "Weight · bar + plates");
t("so is a lifting platform", label("platform"), "Weight · bar + plates");
t("a machine is its stack", label("machine"), "Weight · the stack");
t("a cable is its stack", label("cable"), "Weight · the stack");
t("bodyweight gets no qualifier", label("bodyweight"), "Weight");
t("a band gets no qualifier", label("band"), "Weight");
t("an unknown zone falls back rather than lying", label("spaceship"), "Weight");
t("a missing exercise does not throw", api.weightFieldLabel(undefined), "Weight");

t("dumbbells are per implement", mode("dumbbell"), "per_dumbbell");
t("barbells are total", mode("rack"), "total");
t("the default is total, never per-implement", mode("bodyweight"), "total");

/* Both set-entry paths must ask the same way — the solo row and the superset partner. */
t("the main set row is labelled", /activeSetField\(weightFieldLabel\(exercise\),load\)/.test(src), true);
t("the superset partner row is labelled", /activeSetField\(weightFieldLabel\(partner\),load\)/.test(src), true);
t("no bare Weight label is left", /activeSetField\('Weight',load\)/.test(src), false);

console.log("\n" + pass + " passed, " + fail + " failed");
process.exit(fail ? 1 : 0);
