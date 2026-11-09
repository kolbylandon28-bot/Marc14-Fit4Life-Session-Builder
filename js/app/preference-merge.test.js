/* Tests that a client's preferences and injuries survive a sync.
   Run:  node js/app/preference-merge.test.js

   Before V162, activity.clientFeedbackProfile was spread wholesale over the local profile on
   every pull (cloud-sync.js) and written wholesale on every push. exercisePreferences and
   injuries both rode in that one blob with five independent writers, and a trainer sending a
   single reply pushes client_activity for every client - so a stale remote copy silently erased
   a fresh "this hurt me" or "I hate burpees". Those two fields decide what the generator is
   allowed to hand someone, which is why this is a safety bug and not a tidiness one. */
const fs = require("fs"), path = require("path");
const src = fs.readFileSync(path.join(__dirname, "..", "..", "cloud-sync.js"), "utf8");

let pass = 0, fail = 0;
const t = (name, got, want) => {
  const ok = JSON.stringify(got) === JSON.stringify(want); ok ? pass++ : fail++;
  console.log((ok ? "  PASS  " : "  FAIL  ") + name.padEnd(64) + (ok ? "" : "\n         got " + JSON.stringify(got) + "\n        want " + JSON.stringify(want)));
};
const grab = (name) => {
  const m = src.match(new RegExp("function " + name + "\\([\\s\\S]*?\\n  \\}"));
  if (!m) throw new Error("missing " + name);
  return m[0];
};
const sev = src.match(/const PREFERENCE_SEVERITY = \{[^}]*\};/)[0];
const api = new Function(
  sev + grab("recordTime") + grab("mergeRecords") + grab("newestObject") +
  grab("strictestPreference") + grab("mergePreferences") + grab("mergeInjuries") + grab("mergeFeedbackProfile") +
  "; return { mergePreferences, mergeInjuries, mergeFeedbackProfile, strictestPreference };"
)();
const { mergePreferences, mergeInjuries, mergeFeedbackProfile, strictestPreference } = api;

/* A restriction always beats a permission, whichever device is newer. */
t("discomfort beats like", strictestPreference("like", "discomfort"), "discomfort");
t("discomfort beats like the other way round", strictestPreference("discomfort", "like"), "discomfort");
t("dislike beats favorite", strictestPreference("favorite", "dislike"), "dislike");
t("unavailable beats neutral", strictestPreference("neutral", "unavailable"), "unavailable");
t("discomfort beats unavailable", strictestPreference("unavailable", "discomfort"), "discomfort");
t("an absent side yields to the present one", strictestPreference(null, "dislike"), "dislike");
t("an unknown local value yields to a known remote", strictestPreference("whatever", "dislike"), "dislike");
t("an unknown remote value never erases a known local", strictestPreference("discomfort", "whatever"), "discomfort");

t("a local dislike survives a remote copy that never saw it",
  mergePreferences({ burpee: "dislike" }, { squat: "like" }),
  { burpee: "dislike", squat: "like" });
t("a remote like cannot overwrite a local discomfort",
  mergePreferences({ lunge: "discomfort" }, { lunge: "like" }),
  { lunge: "discomfort" });
t("a remote discomfort does reach a local like",
  mergePreferences({ lunge: "like" }, { lunge: "discomfort" }),
  { lunge: "discomfort" });

/* An injury is a mark. Sync adds, never subtracts. */
t("injuries union", mergeInjuries(["knee"], ["shoulder"]), ["knee", "shoulder"]);
t("a local injury is not dropped by a remote copy without it", mergeInjuries(["knee"], []), ["knee"]);
t("a remote injury is adopted", mergeInjuries([], ["pelvicfloor"]), ["pelvicfloor"]);
t("no duplicates", mergeInjuries(["knee", "knee"], ["knee"]), ["knee"]);
t("blanks are dropped", mergeInjuries(["knee", "", "  "], [null]), ["knee"]);

/* The whole-profile path, which is what the pull actually calls. */
const local = { exercisePreferences: { burpee: "dislike" }, injuries: ["knee"], workoutFeedbackHistory: [{ id: "a" }] };
const staleRemote = { exercisePreferences: { squat: "like" }, injuries: [], workoutFeedbackHistory: [{ id: "b" }] };
const merged = mergeFeedbackProfile(local, staleRemote);
t("the burpee dislike survives a stale pull", merged.exercisePreferences.burpee, "dislike");
t("the remote preference is still adopted", merged.exercisePreferences.squat, "like");
t("the knee injury survives a stale pull", merged.injuries, ["knee"]);
t("feedback history is unioned, not replaced", merged.workoutFeedbackHistory.length, 2);
t("a missing remote leaves local untouched", mergeFeedbackProfile(local, null).exercisePreferences.burpee, "dislike");
t("a missing local adopts remote", mergeFeedbackProfile(null, staleRemote).exercisePreferences.squat, "like");

/* The shape, so the wholesale spread cannot come back. */
t("the pull no longer spreads the raw blob",
  !/\.\.\.\(activity\.clientFeedbackProfile \|\| \{\}\)/.test(src), true);
t("the pull routes through the merge", /mergeFeedbackProfile\(localBase, activity\.clientFeedbackProfile\)/.test(src), true);

console.log("\n" + pass + " passed, " + fail + " failed");
process.exit(fail ? 1 : 0);
