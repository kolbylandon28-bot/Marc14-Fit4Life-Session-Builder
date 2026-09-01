/* Tests for turning consultation free text into exercise preferences.
   Run:  node js/app/consultation.test.js

   The matcher lives in a file full of DOM globals, so it is lifted out by name and run
   against the real exercise library. Every case below is something a client would plausibly
   type; the ones marked as recording nothing do so because the movement genuinely is not in
   the library, not because the matcher gave up. */
const fs = require("fs"), path = require("path");
const R = path.resolve(__dirname, "..", "..") + path.sep;
const lib = fs.readFileSync(R + "js/engine/exercise-library.js", "utf8");
const cc = fs.readFileSync(R + "js/app/client-consultation.js", "utf8");
const norm = cc.match(/function normalizedConsultationExerciseText[\s\S]*?\n}/)[0];
const match = cc.match(/function consultationExerciseMatches\(text\) \{[\s\S]*?\n\}\n/)[0];

const api = new Function("console", lib + `
function exerciseId(e){return String(e&&e.name||"movement").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/(^-|-$)/g,"");}
${norm}
${match}
return { match: consultationExerciseMatches, size: LIBRARY.length };`)(console);

let pass = 0, fail = 0;
const t = (name, got, want) => {
  const ok = String(got) === String(want); ok ? pass++ : fail++;
  console.log((ok ? "  PASS  " : "  FAIL  ") + name.padEnd(56) + (ok ? "" : `\n         got ${got}\n        want ${want}`));
};
const n = (text) => api.match(text).length;
const has = (text, id) => api.match(text).includes(id);

console.log("--- a family name records the whole family, not nothing ---");
// The old rule kept a match only when exactly one candidate survived, so these four - the
// most likely answers anyone would give - all recorded nothing at all.
t("bench press finds the bench presses",      n("bench press") >= 8, true);
t("squat finds the squats",                   n("squat") >= 15, true);
t("deadlift finds the deadlifts",             n("deadlift") >= 5, true);
t("planks finds the planks",                  n("planks") >= 4, true);

console.log("\n--- plurals ---");
t("squats matches squat",                     n("squats"), n("squat"));
t("plural does not change the result",        n("deadlifts"), n("deadlift"));

console.log("\n--- a sentence, not a name ---");
t("both movements in one sentence",           has("I really don't like doing squats or deadlifts", "conventional-deadlift")
                                              && has("I really don't like doing squats or deadlifts", "goblet-squat"), true);
t("a longer phrase beats a bare word",        n("I love leg day, especially leg press"), 1);
t("and finds the right one",                  has("I love leg day, especially leg press", "leg-press"), true);

console.log("\n--- aliases settle what substrings get wrong ---");
t("bicep curls are bicep curls",              has("bicep curls", "dumbbell-curl"), true);
t("and are NOT hamstring curls",              has("bicep curls", "seated-hamstring-curl"), false);
t("running finds the treadmill",              has("running", "incline-treadmill"), true);

console.log("\n--- restraint ---");
t("a single letter matches nothing",          n("e"), 0);
t("'none' matches nothing",                   n("none"), 0);
t("empty matches nothing",                    n(""), 0);
t("a movement not in the library is dropped", n("burpees"), 0);
t("nothing tags more than a quarter of the bank",
  ["press", "squat", "curl", "row", "raise", "up"].every((word) => n(word) <= Math.max(8, Math.round(api.size / 4))), true);

console.log("\n--- exact names still win outright ---");
t("an exact name matches only itself",        n("cable chest fly"), 1);
t("a specific name is not widened",           n("lat pulldown"), 1);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
