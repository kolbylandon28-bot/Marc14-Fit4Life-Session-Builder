/* Tests that a generated variant can never violate a limitation its base movement respects.
   Run:  node js/engine/variant-safety.test.js

   What this protects: expandWithModifiers() invents burnouts, drop sets, circuits and intervals
   from base movements. A burnout is to failure; a circuit is continuous. Either can break a
   limitation the base movement honours. Before 2026-11-09 eligible() filtered only the bases and
   handed the expanded list straight to the generator, so "Glute bridge to failure" reached a
   pelvic-floor client and "Reverse lunge burnout" reached a pregnancy-flagged one. 30% of specs
   leaked; the three worst flags were pregnancy, abdominal and pelvicfloor. */
const fs = require("fs"), path = require("path");
const dir = __dirname;
const src = ['exercise-library.js','session-engine.js','session-builders.js','personalization.js']
  .map((f) => fs.readFileSync(path.join(dir, f), "utf8")).join("\n");

let pass = 0, fail = 0;
const t = (name, got, want) => {
  const ok = JSON.stringify(got) === JSON.stringify(want); ok ? pass++ : fail++;
  console.log((ok ? "  PASS  " : "  FAIL  ") + name.padEnd(68) + (ok ? "" : "\n         got " + JSON.stringify(got) + "\n        want " + JSON.stringify(want)));
};

const ZONES = ["cardio","platform","rack","crossfit","dumbbell","machine","cable","bodyweight","band","kettlebell","household","outdoor"];
const api = new Function(
  "function currentGymEquipment(){return " + JSON.stringify(ZONES) + ";}\n" + src +
  "; return { LIBRARY, eligible, exerciseConstraintIssues, expandWithModifiers };")();
const { LIBRARY, eligible, exerciseConstraintIssues } = api;

const hardFor = (ex, spec, age) => exerciseConstraintIssues(ex, spec, age).some((i) => i.hard);
const leaks = (spec, age) => eligible(spec, age).filter((ex) => hardFor(ex, spec, age));

t("the library loaded", LIBRARY.length > 200, true);

/* The three flags that leaked worst, at every goal and experience level. */
const FLAGS = ["pregnancy","abdominal","pelvicfloor","noimpact","noballistic","nooverhead","lowback","knee","shoulder","balance"];
let probed = 0, leaked = 0;
for (const inj of FLAGS) {
  for (const goal of ["strength","hypertrophy","fatloss","athletic","general"]) {
    for (const experience of [1,2,3]) {
      probed++;
      if (leaks({ goal, experience, minutes:45, injuries:[inj], zones:null, soloDay:"trainer" }, 35).length) leaked++;
    }
  }
}
t("no spec hands the generator a hard-blocked movement", leaked, 0);
t("and enough specs were actually probed to mean something", probed >= 150, true);

/* Named cases from the 2026-11-09 measurement, so a regression names itself. */
const named = (inj, goal) => leaks({ goal, experience:2, minutes:45, injuries:[inj], zones:null, soloDay:"trainer" }, 35).map((e) => e.name);
t("pregnancy gets no to-failure or circuit variant", named("pregnancy","hypertrophy"), []);
t("abdominal gets none either", named("abdominal","general"), []);
t("pelvic floor gets none either", named("pelvicfloor","general"), []);

/* The shape of the fix, so a refactor cannot quietly drop the second filter. */
const eligibleSrc = fs.readFileSync(path.join(dir, "session-engine.js"), "utf8")
  .match(/function eligible\([\s\S]*?\n}/)[0];
t("eligible() filters the EXPANDED list, not just the bases",
  /expandWithModifiers\([\s\S]*?\)\s*\.filter\(/.test(eligibleSrc), true);

/* A base movement that is safe must still survive - the fix must not over-filter. */
const clean = eligible({ goal:"hypertrophy", experience:2, minutes:60, injuries:[], zones:null, soloDay:"trainer" }, 30);
t("an unflagged client still gets a full pool", clean.length > LIBRARY.length, true);

console.log("\n" + pass + " passed, " + fail + " failed");
process.exit(fail ? 1 : 0);
