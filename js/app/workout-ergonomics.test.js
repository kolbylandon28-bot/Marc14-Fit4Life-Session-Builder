/* Tests the phone ergonomics of logging a set.
   Run:  node js/app/workout-ergonomics.test.js

   Measured in a browser at 390x844 by the audit: the weight box a client types into sits
   about 1,765px down the page — roughly two full phone screens below a goal reminder, a
   readiness score, a clickable index of all seven exercises, a video poster and a wall of
   coaching detail. Five independent passes over the code landed on the same thing.

   These tests cover the small fixes. The reordering of the screen itself is a separate,
   larger change. */
const fs = require("fs"), path = require("path");
const root = path.join(__dirname, "..", "..");
const css = fs.readFileSync(path.join(root, "styles.css"), "utf8");
const js = fs.readFileSync(path.join(__dirname, "program-app.js"), "utf8");

let pass = 0, fail = 0;
const t = (name, got, want) => {
  const ok = JSON.stringify(got) === JSON.stringify(want); ok ? pass++ : fail++;
  console.log((ok ? "  PASS  " : "  FAIL  ") + name.padEnd(62) + (ok ? "" : "\n         got " + JSON.stringify(got) + "\n        want " + JSON.stringify(want)));
};

/* iOS zooms the page whenever a focused field is under 16px. Once per set, all workout. */
t("phone fields are 16px so iOS does not zoom",
  /@media\(max-width:560px\)\{\s*input:not\(\[type=checkbox\]\)[\s\S]{0,220}select,textarea\{font-size:16px\}/.test(css), true);
t("the rule is phone-only, so trainer forms do not reflow",
  css.indexOf("select,textarea{font-size:16px}") > css.indexOf("@media(max-width:560px)"), true);

/* 7px grey uppercase on the three things a client reads mid-set. */
t("set labels are no longer 7px", /\.active-set-row label\{[^}]*font:600 7px/.test(css), false);
t("they are 10px and a readable colour",
  /\.active-set-row label\{[^}]*font:600 10px var\(--mono\)[^}]*color:var\(--text-dim\)/.test(css), true);

/* Six columns do not fit 390px: Log came out half-width beside a dropdown and Skip was
   orphaned on its own line under the set number. */
t("the phone set row uses named areas", /grid-template-areas:"num weight reps" "num effort effort" "log log log" "skip skip skip"/.test(css), true);
t("Log is full width", /button\[data-wt="log-set"\]\{grid-area:log;min-height:52px;width:100%/.test(css), true);
t("Log clears a 44px touch target", Number((css.match(/data-wt="log-set"\]\{grid-area:log;min-height:(\d+)px/) || [])[1]) >= 44, true);
t("Skip is full width and quieter, not an orphan",
  /button\[data-wt="skip-set"\]\{grid-area:skip;width:100%[^}]*color:var\(--text-faint\)/.test(css), true);

/* The only permanently visible bar named the block, not the movement. */
t("the pinned bar names the exercise", /byId\('activeWorkoutStep'\)\.textContent = exercise\.name;/.test(js), true);
t("it no longer shows the block and position", /activeWorkoutStep'\)\.textContent = unit\.block\.title/.test(js), false);

t("the stylesheet still parses", (css.match(/\{/g) || []).length === (css.match(/\}/g) || []).length, true);

console.log("\n" + pass + " passed, " + fail + " failed");
process.exit(fail ? 1 : 0);
