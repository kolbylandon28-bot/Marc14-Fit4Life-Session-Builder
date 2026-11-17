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

console.log("\n--- signing up is trainer-initiated ---");
const sync = fs.readFileSync(R + "cloud-sync.js", "utf8");
const sql = fs.readFileSync(R + "RUN-THIS-IN-SUPABASE-PREAPPROVED-EMAILS.sql", "utf8");
t("the address is checked before signup",     /fit4life_email_is_preapproved/.test(sync), true);
t("a typo is refused, not queued",            /has not added this address yet/.test(sync), true);
// A public form that could ask "is this address registered?" and get anything richer than a
// boolean would let anyone read the roster one guess at a time.
t("the check answers only yes or no",         /returns boolean/.test(sql), true);
t("and is scoped to one gym",                 /p\.organization_id = target_organization/.test(sql), true);
t("archived clients do not count",            /status, 'active'\) <> 'archived'/.test(sql), true);
// Better off than on-but-broken: if the function is missing the app says so and lets people in,
// rather than locking every client out of a pilot that is already running.
t("a missing function does not lock anyone out", /pre-approval check unavailable - allowing signup/.test(sync), true);

console.log("\n--- both addresses reach the server ---");
// V88 put personal addresses in bookingEmail and only pushed the BYU-I one, so a client who
// came from the booking import with a gmail address had email null on the server - and the
// claim RPC matches on that column. They could never get in at all.
t("the booking address is pushed too",        /booking_email: normalizedEmail\(profile\.bookingEmail\)/.test(sync), true);
t("and read back",                            /bookingEmail: row\.booking_email/.test(sync), true);
// Selects are built rather than literal now, so the property to check is that the built list
// carries the column when the database has it.
t("the column is added if missing",           /add column if not exists booking_email/.test(sql), true);
t("and both are matched on",                  /lower\(p\.email\)[\s\S]{0,80}lower\(p\.booking_email\)/.test(sql), true);

console.log("\n--- the app must work before the SQL is run ---");
// Asking Postgres for a column that does not exist rejects the WHOLE query. Four of the
// profile reads rethrow, so a missing booking_email emptied the entire client roster on the
// trainer side - the app broke on upload and only recovered once the SQL was run.
// Reads name no columns at all now. "*" cannot ask for something that is missing, so there is
// no flag for a read to depend on and nothing to get wrong before the migration is run.
t("reads name no columns",                    /select\("id,organization_id[^"]*"\)/.test(sync), false);
t("they select everything instead",           (sync.match(/from\("client_profiles"\)[\s\S]{0,120}?select\("\*"\)/g) || []).length >= 4, true);
// The earlier attempt probed at startup, before there was a session - so RLS answered instead
// of Postgres and the missing-column code never appeared. Detected on the write instead, which
// is the one place Postgres itself rejects it.
t("the missing column is noticed on a write", /function noteMissingBookingEmail/.test(sync), true);
t("only 42703 or the column name counts",     /code !== "42703" && !\/booking_email\/\.test\(message\)/.test(sync), true);
t("the upsert retries without it",            /noteMissingBookingEmail\(response\.error\)\) \{[\s\S]{0,200}upsert\(rows/.test(sync), true);
t("and no startup probe remains",             /probeBookingEmailColumn/.test(sync), false);
t("the upsert omits it when absent",          /profilesHaveBookingEmail \? \{ booking_email/.test(sync), true);
t("the probe runs before anything reads",     sync.indexOf("await probeBookingEmailColumn") < sync.indexOf("await loadPortalContext"), true);
t("and it says which file to run",            /RUN-THIS-IN-SUPABASE-PREAPPROVED-EMAILS\.sql/.test(sync), true);

console.log("\n--- functions must be reachable from where they are called ---");
// liveWorkoutCardHtml sat at column 0 but before the closing brace of the function above it,
// so it was nested and did not exist outside that function. renderTrainerAnalysis called it on
// every client click, threw ReferenceError, and the client page never rendered. Indentation
// shows nothing here and brace counting trips over regex literals, so ask the engine instead:
// load the script the way the browser does and see what is actually reachable. Declarations
// hoist before any statement runs, so top-level code wanting a real browser can throw without
// changing the answer. window points at the context so window.x = fn lands like it does live.
const vm = require("vm");
function scriptGlobals(source) {
  const ctx = vm.createContext({});
  ctx.window = ctx; ctx.globalThis = ctx;
  try { new vm.Script(source).runInContext(ctx, { timeout: 5000 }); } catch (e) { /* hoisting already happened */ }
  return ctx;
}
const appScripts = [];
(function walk(dir) {
  fs.readdirSync(dir, { withFileTypes: true }).forEach((e) => {
    const p = dir + path.sep + e.name;
    if (e.isDirectory()) walk(p);
    else if (e.name.endsWith(".js") && !e.name.includes(".test.")) appScripts.push(p);
  });
})(R + "js");
appScripts.push(R + "cloud-sync.js");

const hubSrc = fs.readFileSync(R + "js/trainer/trainer-hub.js", "utf8");
const hubGlobals = scriptGlobals(hubSrc);
["liveWorkoutCardHtml", "renderTrainerAnalysis", "trainerClientDetailsContent",
 "trainerClientOverviewContent", "trainerAssignmentLoopHtml"].forEach((name) => {
  t("reachable: " + name,                     typeof hubGlobals[name], "function");
});
// A check that cannot fail is not a check. This is the shipped text with the declaration put
// back inside the function that swallowed it.
const broken = hubSrc
  .replace(/^function liveWorkoutCardHtml\(profile\) \{/m, "function trapItHere() {\nfunction liveWorkoutCardHtml(profile) {")
  .replace(/^function renderTrainerAnalysis\(client\) \{/m, "}\nfunction renderTrainerAnalysis(client) {");
t("and the check fails on the shipped bug",   typeof scriptGlobals(broken).liveWorkoutCardHtml, "undefined");

// Every declaration in every script has to survive being loaded, not just this one file.
const trapped = appScripts.filter((file) => {
  const source = fs.readFileSync(file, "utf8");
  const globals = scriptGlobals(source);
  return (source.match(/^function ([A-Za-z0-9_$]+)\s*\(/gm) || [])
    .map((line) => line.replace(/^function /, "").replace(/\s*\($/, ""))
    .some((name) => typeof globals[name] !== "function");
});
t("no script has a trapped declaration",      trapped.map((f) => f.replace(R, "")).join(", "), "");

// An onclick in a generated string is resolved by name at click time, so a handler that is not
// reachable is a button that silently does nothing - the same failure, one layer out.
const reachable = new Set();
appScripts.forEach((file) => {
  const globals = scriptGlobals(fs.readFileSync(file, "utf8"));
  Object.keys(globals).forEach((k) => { if (typeof globals[k] === "function") reachable.add(k); });
});
const handlers = new Set();
appScripts.forEach((file) => {
  const source = fs.readFileSync(file, "utf8");
  for (const m of source.matchAll(/on(?:click|change|input|submit)=\\?"([A-Za-z0-9_$]+)\(/g)) handlers.add(m[1]);
});
t("inline handlers are worth checking",       handlers.size > 150, true);
t("every inline handler resolves",            [...handlers].filter((h) => !reachable.has(h)).join(", "), "");

console.log("\n--- a client account has to find its own profile ---");
// A client sees only rows stamped with their auth_user_id. Nothing stamped it for anyone who
// already had a membership, so they saw zero profiles, got dropped on the old lookup menu, and
// never reached the questionnaire either - it is gated behind having a profile.
const linkerSrc = sync.match(/async function linkOwnClientProfile\(\)[\s\S]*?\n  \}/)[0];
function runLinker(responses, orgId) {
  const calls = [];
  const cloudClient = { rpc: async (name, args) => { calls.push({ name, args }); return responses[name] || { error: { message: "not installed" } }; } };
  const fn = new Function("cloudClient", "cloudOrganizationId", linkerSrc + "; return linkOwnClientProfile;")(cloudClient, orgId || "");
  return fn().then((ok) => ({ ok, calls }));
}
const ORG = "org-1";
return (async () => {
  let r = await runLinker({ fit4life_link_my_client_profile: { data: 1 } }, ORG);
  t("the additive function is asked first",    r.calls[0].name, "fit4life_link_my_client_profile");
  t("it is scoped to the organization",        r.calls[0].args.target_organization, ORG);
  t("linking one profile counts as linked",    r.ok, true);
  t("and nothing else is called",              r.calls.length, 1);

  r = await runLinker({ fit4life_link_my_client_profile: { data: 0 } }, ORG);
  t("matching nothing is not a link",          r.ok, false);
  t("a no-match does not fall through",        r.calls.length, 1);

  // Before the migration is run that function does not exist, so the older claim still has to
  // be tried - otherwise shipping the code before the SQL would help nobody.
  r = await runLinker({ claim_my_client_profile_for_org: { data: null } }, ORG);
  t("an uninstalled function falls back",      r.calls.map((c) => c.name).join(" then "),
                                               "fit4life_link_my_client_profile then claim_my_client_profile_for_org");
  t("and the fallback counts as linked",       r.ok, true);
  r = await runLinker({ claim_my_client_profile: { data: null } }, "");
  t("with no org, the plain claim is used",    r.calls[1].name, "claim_my_client_profile");
  r = await runLinker({}, ORG);
  t("both failing is not a link",              r.ok, false);

  console.log("\n--- and the pull must not strand them ---");
  t("the link is asked for when nothing is visible",
    /cloudRole === "client" && !visibleProfileRows\.length && !clientProfileLinkTried/.test(sync), true);
  t("tried once per session, not every sync",  /clientProfileLinkTried = true;/.test(sync), true);
  t("a successful link re-reads the profiles", /if \(await linkOwnClientProfile\(\)\)[\s\S]{0,200}from\("client_profiles"\)/.test(sync), true);
  t("the re-read is scoped to the org",        /relinked[\s\S]{0,160}eq\("organization_id", cloudOrganizationId\)/.test(sync), true);
  // Overwriting the device list with nothing left them with no way back in, because the
  // lookup searches that same list.
  t("an unlinked client's list is not wiped",  /const clientHasNoVisibleRow = cloudRole === "client" && !profiles\.length && !profileRows\.length/.test(sync), true);
  t("archiving still takes effect",            /!profileRows\.length/.test(sync), true);
  t("the write is guarded by it",              /if \(!clientHasNoVisibleRow\) writeJson\(CLOUD_KEYS\.profiles/.test(sync), true);
  // The database treats a missing status as active; the code demanded the exact string.
  t("a row with no status counts as active",   /\(row\.status \|\| "active"\) === "active"/.test(sync), true);
  t("pending is still not active",             (function () { const f = (row) => (row.status || "active") === "active";
    return [f({}), f({ status: "active" }), f({ status: "pending" }), f({ status: "archived" })].join(","); })(), "true,true,false,false");

  console.log("\n--- the SQL that does the linking ---");
  const linkSql = fs.readFileSync(R + "RUN-THIS-IN-SUPABASE-CLIENT-PROFILE-LINK.sql", "utf8");
  t("it adds the column it depends on",        /add column if not exists booking_email/.test(linkSql), true);
  t("it matches the caller's verified address", /from auth\.users u\s*\n\s*where u\.id = auth\.uid\(\)/.test(linkSql), true);
  t("on either address",                       /coalesce\(p\.email[\s\S]{0,80}coalesce\(p\.booking_email/.test(linkSql), true);
  t("it never takes a claimed profile",        (linkSql.match(/p\.auth_user_id is null/g) || []).length >= 2, true);
  t("it refuses when more than one matches",   /if match_count <> 1 then\s*\n\s*return 0;/.test(linkSql), true);
  t("it skips archived rows",                  /coalesce\(p\.status, 'active'\) <> 'archived'/.test(linkSql), true);
  t("anon cannot call it",                     /grant execute on function public\.fit4life_link_my_client_profile\(uuid\) to anon/.test(linkSql), false);
  t("signed-in accounts can",                  /grant execute on function public\.fit4life_link_my_client_profile\(uuid\) to authenticated/.test(linkSql), true);

  /* The consultation clobber, found 2026-11-16 from a real report: a client submitted her
     consultation and the trainer saw nothing. clientIntake was protected in this merge;
     clientConsultation was not, so it fell through the plain spread and whichever side pushed
     last won. The trainer's copy carried an empty consultation, so his sync erased her answers
     with no error on either side. */
  const bundleApi = new Function(
    [grab("recordTime"), grab("newestObject"), grab("mergeActiveWorkout"), grab("mergeRecords"),
     grab("meaningfulIntake"), grab("intakeTime"), grab("consultationTime"),
     grab("mergeBundlePayload")].join("\n")
    + "; return { mergeBundlePayload };")();
  const mb = (a, b) => bundleApi.mergeBundlePayload("client_activity", a, b);

  const answered = { status: "submitted", goals: ["strength"], updatedAt: "2026-11-16T10:00:00Z" };
  const newer    = { status: "submitted", goals: ["fatloss"],  updatedAt: "2026-11-16T18:00:00Z" };
  const clientSide  = { clientConsultation: answered, clientConsultationUpdatedAt: "2026-11-16T10:00:00Z",
                        clientConsultationProfile: { phone: "555" } };
  const trainerSide = { clientConsultation: {}, clientConsultationUpdatedAt: null,
                        clientConsultationProfile: {} };

  t("a trainer's empty consultation cannot erase a submitted one",
    JSON.stringify(mb(clientSide, trainerSide).clientConsultation), JSON.stringify(answered));
  t("and it survives in the other push order too",
    JSON.stringify(mb(trainerSide, clientSide).clientConsultation), JSON.stringify(answered));
  t("the submitted-at stamp travels with it",
    mb(clientSide, trainerSide).clientConsultationUpdatedAt, "2026-11-16T10:00:00Z");
  t("the derived profile is not blanked either",
    JSON.stringify(mb(clientSide, trainerSide).clientConsultationProfile), JSON.stringify({ phone: "555" }));
  t("two answered consultations go by time, not by who pushed last",
    mb({ clientConsultation: newer,    clientConsultationUpdatedAt: "2026-11-16T18:00:00Z" },
       { clientConsultation: answered, clientConsultationUpdatedAt: "2026-11-16T10:00:00Z" }
      ).clientConsultation.goals[0], "fatloss");
  t("the intake it was modelled on still behaves the same way",
    JSON.stringify(mb({ clientIntake: { answers: { a: 1 } } }, { clientIntake: {} }).clientIntake),
    JSON.stringify({ answers: { a: 1 } }));

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})();
