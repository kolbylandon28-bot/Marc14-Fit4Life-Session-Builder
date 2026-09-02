/* Tests for merging one workout edited on two devices.
   Run:  node js/app/sync-merge.test.js

   The case this protects: a trainer filling in a set from their own phone while the client
   holds theirs. The logged sets themselves were always safe - they are individual records in
   the progress log and merge by id. Everything else the workout screen remembers lived in one
   object that was merged newest-wins, so the later push replaced the earlier device's work
   outright and someone's entries vanished with no error. */
const fs = require("fs"), path = require("path");
const R = path.resolve(__dirname, "..", "..") + path.sep;
const src = fs.readFileSync(R + "cloud-sync.js", "utf8");

const grab = (name) => {
  const start = src.indexOf("function " + name + "(");
  if (start < 0) throw new Error("not found: " + name);
  let depth = 0;
  for (let i = src.indexOf("{", start); i < src.length; i++) {
    if (src[i] === "{") depth++;
    else if (src[i] === "}") { depth--; if (!depth) return src.slice(start, i + 1); }
  }
  throw new Error("unbalanced: " + name);
};

const api = new Function(
  [grab("recordTime"), grab("newestObject"), grab("mergeActiveWorkout")].join("\n")
  + "; return { mergeActiveWorkout };")();

let pass = 0, fail = 0;
const t = (name, got, want) => {
  const ok = String(got) === String(want); ok ? pass++ : fail++;
  console.log((ok ? "  PASS  " : "  FAIL  ") + name.padEnd(56) + (ok ? "" : `\n         got ${got}\n        want ${want}`));
};

const base = (over) => Object.assign({
  assignmentId: "a1", profileId: "p1", sessionId: "s1",
  unitIndex: 0, pairIndex: 0,
  setByExercise: {}, extraSets: {}, warmups: {},
  skippedSets: {}, skippedExercises: {}, supersetMode: {},
  shortened: false, startedAt: "2026-09-02T10:00:00.000Z",
}, over || {});

console.log("--- the reported case: they each did different things ---");
// Trainer, on their own phone: logged through set 2 of the squat and skipped a set of the row.
const trainer = base({
  updatedAt: "2026-09-02T10:05:00.000Z",
  setByExercise: { Squat: 2 },
  skippedSets: { "0::Row::3": { at: "2026-09-02T10:04:00.000Z" } },
});
// Client, on theirs, a moment later: added a warm-up and got further through the squat.
const client = base({
  updatedAt: "2026-09-02T10:06:00.000Z",
  setByExercise: { Squat: 3 },
  warmups: { Squat: 1 },
});
const both = api.mergeActiveWorkout(trainer, client);
t("the trainer's skipped set survives",        Boolean(both.skippedSets["0::Row::3"]), true);
t("the client's warm-up survives",             both.warmups.Squat, 1);
t("progress takes whoever got further",        both.setByExercise.Squat, 3);
t("and it is still one workout",               both.assignmentId, "a1");

console.log("\n--- and the same merge the other way round ---");
// Order must not decide who loses. This is the whole failure: newest-wins made it decide.
const flipped = api.mergeActiveWorkout(client, trainer);
t("the trainer's skip still survives",         Boolean(flipped.skippedSets["0::Row::3"]), true);
t("the client's warm-up still survives",       flipped.warmups.Squat, 1);
t("progress is the same either way",           flipped.setByExercise.Squat, both.setByExercise.Squat);

console.log("\n--- nothing a person did is ever unset ---");
const skippedExercise = api.mergeActiveWorkout(
  base({ skippedExercises: { "0::Row": { at: "x" } } }),
  base({ skippedExercises: {} }));
t("a skipped exercise is not un-skipped",      Boolean(skippedExercise.skippedExercises["0::Row"]), true);
t("extra sets take the higher count",          api.mergeActiveWorkout(base({ extraSets: { Squat: 2 } }), base({ extraSets: { Squat: 1 } })).extraSets.Squat, 2);
t("shortening holds if either shortened",      api.mergeActiveWorkout(base({ shortened: true }), base({ shortened: false })).shortened, true);
t("superset mode holds too",                   api.mergeActiveWorkout(base({ supersetMode: { 0: true } }), base({})).supersetMode[0], true);
t("the cursor takes the furthest exercise",    api.mergeActiveWorkout(base({ unitIndex: 3 }), base({ unitIndex: 1 })).unitIndex, 3);

console.log("\n--- either of them may end it ---");
const endedByClient = api.mergeActiveWorkout(
  base({ finishedAt: "2026-09-02T10:30:00.000Z", finishedBy: "client" }),
  base({}));
t("the end is carried to the other device",    endedByClient.finishedBy, "client");
// Whoever got there first owns it, so the other device reports who rather than reopening it.
const raced = api.mergeActiveWorkout(
  base({ finishedAt: "2026-09-02T10:30:00.000Z", finishedBy: "client" }),
  base({ finishedAt: "2026-09-02T10:31:00.000Z", finishedBy: "trainer" }));
t("the first to finish owns it",               raced.finishedBy, "client");
t("and its time is the earlier one",           raced.finishedAt, "2026-09-02T10:30:00.000Z");

console.log("\n--- things that must NOT merge ---");
const other = api.mergeActiveWorkout(
  base({ assignmentId: "a1", updatedAt: "2026-09-02T10:00:00.000Z", warmups: { Squat: 1 } }),
  base({ assignmentId: "a2", updatedAt: "2026-09-02T11:00:00.000Z" }));
t("two different workouts are not blended",    other.assignmentId, "a2");
t("so nothing bleeds between them",            other.warmups.Squat === undefined, true);
// A half-typed row on one device must not appear on the other.
t("a stray edit box is not carried across",    JSON.stringify(api.mergeActiveWorkout(base({ editingSetByExercise: { Squat: 2 } }), base({})).editingSetByExercise), "{}");

console.log("\n--- absent sides ---");
t("nothing plus something is something",       api.mergeActiveWorkout(null, base({ unitIndex: 2 })).unitIndex, 2);
t("something plus nothing is unchanged",       api.mergeActiveWorkout(base({ unitIndex: 2 }), null).unitIndex, 2);
t("nothing plus nothing is nothing",           api.mergeActiveWorkout(null, null), null);
t("the earlier start time is kept",            api.mergeActiveWorkout(base({ startedAt: "2026-09-02T10:00:00.000Z" }), base({ startedAt: "2026-09-02T09:00:00.000Z" })).startedAt, "2026-09-02T09:00:00.000Z");

console.log("\n--- how the session is being run ---");
const app = fs.readFileSync(R + "js/app/program-app.js", "utf8");
// Asked at assign rather than at build, because a week programmed on Sunday does not yet know
// whether Thursday has a trainer on it.
t("the question is asked when assigning",     /askForChoice\("Who is running this workout\?"/.test(app), true);
t("three states, not two",                    ["With a trainer", "Floor hours", "On their own"].every((s) => app.includes(s)), true);
t("it defaults to with a trainer",            /selected: soloAtBuild \? "solo" : "trainer"/.test(app), true);
t("and rides on the assignment",              /supervision, session \}/.test(app), true);
t("an older assignment reads as trainer-led", /value === "solo" \|\| value === "floor" \|\| value === "trainer" \? value : "trainer"/.test(app), true);

console.log("\n--- a hold exists because nobody was there ---");
// Trainer present: they already answered, out loud, before this got typed. It is still logged
// and still raises a coach task - it just does not lock the next workout. Floor hours still
// holds, because the trainer may not have been at that rack.
t("no hold when a trainer is running it",     /safetyHold:activeAssignmentSupervision\(\) !== "trainer" &&/.test(app), true);
t("the pain entry is still written",          /addProgressEntry\(\{type:"pain"/.test(app), true);

console.log("\n--- either of them may end it ---");
t("finishing stamps who did",                 /activeWorkout\.finishedBy = \(typeof window[^;]*"client" : "trainer"/.test(app), true);
t("and only the first finish counts",         /if \(activeWorkout && !activeWorkout\.finishedAt\)/.test(app), true);
t("the other device is told, not left open",  /renderWorkoutEndedElsewhere\(\)/.test(app), true);
t("naming whose device it was",               /finishedBy === "client" \? "your client/.test(app), true);
t("and it does not fire on your own finish",  /activeWorkout\.finishedBy === me\) return false/.test(app), true);

console.log("\n--- a trainer filling in from their own side ---");
const nav = fs.readFileSync(R + "js/app/navigation.js", "utf8");
const hub = fs.readFileSync(R + "js/trainer/trainer-hub.js", "utf8");
// One slot could hold one client's workout, so with two people training at once the trainer
// saw whichever arrived first and could not reach the other.
t("live workouts are kept per client",        /liveWorkoutsByProfile\[profile\.id\] = activity\.activeWorkout/.test(src), true);
t("and looked up by client",                  /fit4lifeLiveWorkoutFor = function/.test(src), true);
// Derived from the pull. Pushing it back would make the trainer's device claim authorship of
// a session it only watched.
t("the cache is not a synced key",            /CLOUD_KEYS\.liveWorkouts|liveWorkouts:/.test(src), false);
t("a trainer's own slot is not clobbered",    /if \(cloudRole === "client"\) writeJson\(CLOUD_KEYS\.activeWorkout/.test(src), true);

console.log("\n--- reached from the client's page, not the owner preview ---");
t("the card lives on the client page",        /liveWorkoutCardHtml\(profile\)/.test(hub), true);
t("and only while a workout is running",      /if \(!live \|\| live\.finishedAt\) return ""/.test(hub), true);
t("the opener is trainer-side",               /function openTrainerLiveWorkout\(profileId\)/.test(app), true);
t("it refuses when nobody is training",       /They are not in a workout right now/.test(app), true);
t("and refuses a finished workout",           /That workout has already been finished/.test(app), true);

console.log("\n--- the trainer stays a trainer ---");
// active-workout is a client-only view and a trainer is normally bounced out of it. The one
// exception is deliberately opening a client's running session, and only for as long as it lasts.
t("one exception to the client-only guard",   /clientOnlyView && !trainerInLiveWorkout/.test(nav), true);
t("scoped to the live-workout view alone",    /view === "active-workout" && Boolean\(trainerLiveWorkoutProfileId\)/.test(nav), true);
t("and it cannot get stuck on",               /if \(view !== "active-workout"\) trainerLiveWorkoutProfileId = ""/.test(nav), true);
t("with a banner saying whose screen it is",  /Filling in for/.test(app), true);
t("and a way back to their page",             /closeTrainerLiveWorkout\(\)/.test(app), true);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
