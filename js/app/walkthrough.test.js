/* Tests for the walkthrough engine's role split and preconditions.
   Run:  node js/app/walkthrough.test.js

   The engine is full of DOM, so the decision-making functions are lifted out by name and run
   against stubs. What is being protected here is the boundary between a TRAINER run - which
   snapshots the device, seals sync and replaces the roster with a practice client - and a
   CLIENT run, which happens on a real person's own portal and must move nothing. */
const fs = require("fs"), path = require("path");
const R = path.resolve(__dirname, "..", "..") + path.sep;
const wt = fs.readFileSync(R + "js/app/walkthrough.js", "utf8");

const grab = (name) => {
  const start = wt.indexOf("function " + name + "(");
  if (start < 0) throw new Error("not found: " + name);
  let depth = 0;
  for (let i = wt.indexOf("{", start); i < wt.length; i++) {
    if (wt[i] === "{") depth++;
    else if (wt[i] === "}") { depth--; if (!depth) return wt.slice(start, i + 1); }
  }
  throw new Error("unbalanced: " + name);
};

const api = new Function("escapeHtml", [grab("walkthroughBlockedReason"), grab("walkthroughCardHtml")].join("\n")
  + "; return { walkthroughBlockedReason, walkthroughCardHtml };")((s) => String(s));

let pass = 0, fail = 0;
const t = (name, got, want) => {
  const ok = String(got) === String(want); ok ? pass++ : fail++;
  console.log((ok ? "  PASS  " : "  FAIL  ") + name.padEnd(58) + (ok ? "" : `\n         got ${got}\n        want ${want}`));
};

console.log("--- a tour that cannot run yet ---");
// A client with no workout assigned is exactly who opens these, and the trainer trick of
// fabricating one (walkthroughPrepareWorkout) is not available on a real person's portal.
t("no precondition means never blocked",      api.walkthroughBlockedReason({ id: "a" }), "");
t("a precondition returning null runs",       api.walkthroughBlockedReason({ requires: () => null }), "");
t("a reason blocks and is passed through",    api.walkthroughBlockedReason({ requires: () => "No workout yet" }), "No workout yet");
t("a precondition that throws does not block",api.walkthroughBlockedReason({ requires: () => { throw new Error("x"); } }), "");
t("a missing plan does not block",            api.walkthroughBlockedReason(null), "");

console.log("\n--- the card says so rather than failing on tap ---");
const open = api.walkthroughCardHtml({ id: "find", title: "Find your workout", blurb: "Where it lives" }, []);
const shut = api.walkthroughCardHtml({ id: "find", title: "Find your workout", blurb: "Where it lives",
  requires: () => "Your trainer has not sent you one yet" }, []);
t("an available tour is tappable",            open.includes('data-wt-start="find"'), true);
t("and is not disabled",                      open.includes("disabled"), false);
t("a blocked tour is not tappable",           shut.includes("data-wt-start"), false);
t("it is disabled",                           shut.includes("disabled"), true);
t("and shows the reason, not the blurb",      shut.includes("Your trainer has not sent you one yet") && !shut.includes("Where it lives"), true);
t("blocked cards are marked for styling",     shut.includes("wt-card-blocked"), true);

console.log("\n--- 'done before' ---");
t("shown once a tour has been run",           api.walkthroughCardHtml({ id: "find", title: "T", blurb: "B" }, ["find"]).includes("Done before"), true);
t("not shown on a blocked tour",              api.walkthroughCardHtml({ id: "find", title: "T", blurb: "B", requires: () => "later" }, ["find"]).includes("Done before"), false);
t("a missing seen list is safe",              api.walkthroughCardHtml({ id: "find", title: "T", blurb: "B" }, null).includes("<b>T</b>"), true);

console.log("\n--- the practice machinery is trainer-only ---");
// Read as source, because running it needs the whole app. What matters is that every
// destructive step sits behind the clientRun guard.
const start = wt.slice(wt.indexOf("function startWalkthrough("), wt.indexOf("function endWalkthrough("));
t("the roster swap is guarded",               /if \(!clientRun\) \{[\s\S]*writeProfiles\(\[practiceClientProfile\(\)\]\)/.test(start), true);
t("blanking the stores is guarded",           /if \(!clientRun\) \{[\s\S]*PRACTICE_CLEARED_KEYS[\s\S]*?\n  \}/.test(start), true);
t("the snapshot is guarded",                  /!clientRun && !sandboxActive && !walkthroughTakeSnapshot\(\)/.test(start), true);
t("sealing sync is guarded",                  /if \(!clientRun\) window\.FIT4LIFE_PRACTICE_ACTIVE = true/.test(start), true);
t("the trainer builder prep is guarded",      /!clientRun && plan\.needs === "workout"/.test(start), true);
const end = wt.slice(wt.indexOf("function endWalkthrough("), wt.indexOf("function walkthroughSeen("));
t("a client run restores nothing",            /if \(run\.client\) \{[^}]*\}\s*\n\s*else if \(!sandboxActive\) \{ walkthroughRestoreSnapshot/.test(end), true);
t("and does not clear the practice flag",     /!run\.client && !sandboxActive\) window\.FIT4LIFE_PRACTICE_ACTIVE = false/.test(end), true);

console.log("\n--- a tap is not proof it worked ---");
t("a step may declare what settled means",    /typeof step\.settled !== "function"/.test(wt), true);
t("and waiting gives up rather than trapping",/waited >= 4000/.test(wt), true);

console.log("\n--- the client set exists and is separate ---");
const clientBlock = wt.slice(wt.indexOf("const CLIENT_WALKTHROUGHS"), wt.indexOf("function allWalkthroughs"));
const ids = [...clientBlock.matchAll(/id:\s*"([^"]+)"/g)].map((m) => m[1]);
t("four client walkthroughs",                 ids.length, 4);
t("every one is role client",                 (clientBlock.match(/role:\s*"client"/g) || []).length, 4);
t("none is role trainer",                     /role:\s*"trainer"/.test(clientBlock), false);
t("every id is namespaced client-",           ids.every((id) => id.indexOf("client-") === 0), true);
t("the rejected check-in tour is absent",     /check-?in/i.test(clientBlock.replace(/Report a limitation/g, "")), false);
t("every one declares a precondition",        (clientBlock.match(/requires:/g) || []).length, 4);

console.log("\n--- nothing that SENDS is ever tapped ---");
// A learner must never actually report pain they did not feel, or submit a review mid-guide.
const sendTargets = ['[data-wt="pain-submit"]', "#reviewSaveOnlyBtn"];
sendTargets.forEach((target) => {
  const step = clientBlock.split("{ say:").find((chunk) => chunk.includes(target));
  t("never tapped: " + target,                Boolean(step) && /advance:\s*"next"/.test(step) && /info:\s*true/.test(step), true);
});

console.log("\n--- every selector resolves against the real source ---");
const hay = ["index.html", "js/app/program-app.js", "js/app/navigation.js", "js/app/readiness-progress.js",
  "js/trainer/coaching-support.js"].map((f) => fs.readFileSync(R + f, "utf8")).join("\n");
const targets = [...new Set([...clientBlock.matchAll(/target:\s*'([^']+)'|target:\s*"([^"]+)"/g)].map((m) => m[1] || m[2]))];
t("targets found in the tours",               targets.length > 15, true);
const unresolved = [];
targets.forEach((sel) => {
  sel.split(",").forEach((one) => {
    const hooks = [...one.matchAll(/\[data-wt="([^"]+)"\]/g)].map((m) => m[1]);
    hooks.forEach((hook) => {
      if (hay.indexOf('data-wt="' + hook + '"') < 0 && hay.indexOf("dataset.wt = '" + hook + "'") < 0
          && hay.indexOf("'" + hook + "'") < 0) unresolved.push(hook);
    });
    const ids2 = [...one.matchAll(/#([A-Za-z][\w-]*)/g)].map((m) => m[1]);
    ids2.forEach((id) => { if (hay.indexOf('id="' + id + '"') < 0 && hay.indexOf('"' + id + '"') < 0) unresolved.push("#" + id); });
    const tabs = [...one.matchAll(/\[data-client-tab="([^"]+)"\]/g)].map((m) => m[1]);
    tabs.forEach((tab) => { if (hay.indexOf('data-client-tab="' + tab + '"') < 0) unresolved.push("tab:" + tab); });
  });
});
t("no selector points at nothing",            unresolved.length ? unresolved.join(", ") : 0, 0);

console.log("\n--- the hooks the tours depend on ---");
["client-start-workout", "log-set", "skip-set", "continue-unit", "finish-workout",
 "client-report-pain", "pain-submit", "pain-cancel"].forEach((hook) => {
  t("hook present: " + hook,                  hay.indexOf(hook) >= 0, true);
});
// Superset blocks replace the plain row's buttons, so both paths need the same two names or
// every superset exercise strands the log-sets tour.
t("log-set is on both the row and superset",  (hay.match(/log-set/g) || []).length >= 2, true);
t("skip-set is on both",                      (hay.match(/skip-set/g) || []).length >= 2, true);

console.log("\n--- the ways an adversarial pass got a client stuck ---");
// A change step on a control that opens with a value already selected fires nothing when the
// client's honest answer IS that value, and a change step has no Next and no Skip to offer.
t("no advance:change in the client set",      (clientBlock.match(/advance:\s*"change"/g) || []).length, 0);

// The bar is ~168px tall on a phone. Lifting it 74px and raising the nav above it left the nav
// covering the bar's own Back / Next / exit row, with no way forward and no way out.
const css = fs.readFileSync(R + "styles.css", "utf8");
t("the nav is stacked above the measured bar", /walkthrough-on\.walkthrough-client \.client-bottom-nav\{[^}]*--wt-bar-h/.test(css), true);
t("and outranks the trainer-era media rule",   css.indexOf("body.walkthrough-on.walkthrough-client") >= 0, true);
t("the bar height is measured every render",   /setProperty\("--wt-bar-h"/.test(wt), true);
t("and cleared on exit",                       /removeProperty\("--wt-bar-h"\)/.test(wt), true);

// One tour ends with the review form deliberately open. Sweeping every dialog closed on exit
// made its closing line a lie and discarded the difficulty the client had just been asked for.
t("a client exit leaves dialogs standing",     /if \(!run\.client\) walkthroughCloseDialogs\(\)/.test(wt), true);
const finishPlan = clientBlock.slice(clientBlock.indexOf("client-finish-review"));
// The closing line must hold whether or not the form ended up open - the tour now runs even
// when the client is nowhere near the last exercise, so an unconditional claim would be false.
t("the closing line never assumes the form",  /done:\s*"If the form is open/.test(finishPlan), true);
t("and does not state it outright",           /done:\s*"The form is still open/.test(finishPlan), false);

// The "?" is reachable from the active workout, and show() hides it while a tour runs - but a
// tour that never changes view never calls show().
t("the help buttons are hidden on start",      /\["trainerHelpBtn", "clientHelpBtn"\]\.forEach/.test(wt), true);

console.log("\n--- gates match what each tour actually needs ---");
const gates = wt.slice(wt.indexOf("const CLIENT_WALKTHROUGH_GATES"), wt.indexOf("const CLIENT_WALKTHROUGHS"));
t("a tour starting at the tabs checks it is there", /CLIENT_APP_VIEWS\.includes\(currentView\)/.test(gates), true);
// Someone with nothing assigned who has hurt themselves is exactly who needs this one.
const painPlan = clientBlock.slice(clientBlock.indexOf("client-report-pain"), clientBlock.indexOf("client-finish-review"));
t("reporting pain does not require a workout", /requires:\s*CLIENT_WALKTHROUGH_GATES\.onClientTab/.test(painPlan), true);
t("but finding a workout does",                /requires:\s*CLIENT_WALKTHROUGH_GATES\.program/.test(clientBlock), true);
t("the two workout tours share one gate",     (clientBlock.match(/CLIENT_WALKTHROUGH_GATES\.hasWorkout/g) || []).length, 2);
// They used to demand you were already in a workout - and the finish one demanded you were on
// the LAST exercise, so a whole workout had to be completed before the guide about finishing
// one would open. They now walk you in, and the steps that do skip themselves once you are.
t("neither demands you are already there",    /GATES\.(inWorkout|lastExercise)/.test(clientBlock), false);
t("the superseded gates are gone",            /inWorkout:|lastExercise:/.test(gates), false);
t("steps can opt out of applying",            /typeof step\.skipIf === "function"/.test(wt), true);
t("and Back does not trap on a skip",         /walkthroughGoToStep\(back \? index - 1 : index \+ 1, back\)/.test(wt), true);
t("Back is passed the direction",             /walkthroughGoToStep\(walkthroughRun\.index - 1, true\)/.test(wt), true);
const navSteps = (clientBlock.match(/skipIf/g) || []).length;
t("conditional steps are actually used",      navSteps >= 8, true);
// A form step pointed at a dialog that is not open would strand; they are conditional on it.
t("the review form steps wait for the form",  (clientBlock.match(/reviewModal[\s\S]{0,80}classList\.contains\("open"\)/g) || []).length >= 4, true);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
