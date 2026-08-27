/* ============================================================
   WALKTHROUGHS  ("Trainer Assistance")
   Step-by-step help that runs on the real screens.

   Safety model - nothing done in a walkthrough can reach a real
   client. On start we snapshot every fit4life* localStorage key,
   swap in a single practice client, and block every push to
   Supabase. On exit the snapshot is put back exactly.

   The snapshot is written to storage too, so closing the tab
   mid-walkthrough still restores on the next load.

   Steps wait for the user to tap the real control. Highlights are
   re-applied on a timer because the app re-renders constantly.
   ============================================================ */

const WALKTHROUGH_SNAPSHOT_KEY = "fit4life_walkthrough_snapshot_v1";
const WALKTHROUGH_SEEN_KEY = "fit4life_walkthrough_seen_v1";
const PRACTICE_CLIENT_ID = "walkthrough-practice-client";
/* Every store the trainer directory or workspace reads a client out of. Two entries here
   were previously wrong - fit4life_assignments_v1 and fit4life_records_v1 exist nowhere
   in the app, so assignments and progress were never actually sandboxed. */
const PRACTICE_CLEARED_KEYS = [
  "fit4life_assigned_workouts_v1", "fit4life_client_messages_v1", "fit4life_progress_v1",
  "fit4life_calendar_events_v1", "fit4life_inbody_v1", "fit4life_body_goals_v1",
  "fit4life_checkins_v1", "fit4life_athlete_metrics_v1",
];
const WALKTHROUGH_HIGHLIGHT_MS = 300;

function practiceClientProfile() {
  return {
    id: PRACTICE_CLIENT_ID,
    name: "Batman",
    username: "batman",
    age: 27,
    experience: 2,
    minutes: 60,
    goals: ["hypertrophy"],
    // A shoulder limitation is what makes the safety tags real: it rules out 103 movements
    // instead of 41, so the amber cautions and blocks in the picker are genuine. Chosen
    // because it leaves the lower-body main lift alone, which the rest of the demo uses.
    injuries: ["shoulder"],
    zones: ["cardio","platform","rack","crossfit","dumbbell","machine","cable","bodyweight"],
    membershipTier: "standard",
    sessionsPerWeek: 2,
    programmedDays: 3,
    email: "batman@fit4life.local",
    createdAt: "2026-01-01T00:00:00.000Z",
  };
}

/* ---- the library ---- */

// The warm-up is the wrong place to demonstrate tailoring: an elliptical takes no
// modifier, and pairing mobility work into a superset teaches the wrong thing.
const WORKING_BLOCK = '.block:not([data-block-key="warmup"])';
const WORKING = WORKING_BLOCK + " .ex";

const WALKTHROUGHS = [
  {
    id: "program-workout",
    role: "trainer",
    title: "Program a workout for a client",
    blurb: "The whole arc - set it up, build it, approve it, send it.",
    steps: [
      { say: "Start from your client list.", target: '[data-coach-nav="clients"]', advance: "click" },
      { say: "Tap the client you are programming for.", target: ".client-row", advance: "click" },
      { say: "Open a new workout for them.", target: '[data-wt="new-workout"]', advance: "click" },
      { say: "Their profile is already loaded - you never search for a client here. Their goal, experience, limitations and equipment all come from the questionnaire they filled in when they joined.", target: ".profile-loaded", advance: "next", info: true, go: walkthroughLoadPracticeIntoBuilder },
      { say: "Their goal is already picked from that questionnaire. This one setting drives more of the workout than anything else on the page.", target: '[data-wt="goal"]', advance: "next", info: true },
      { say: "Build muscle gives them two main lifts, two accessories and an isolation at 4 sets of 8-12 with 60-90 seconds rest. Lose body fat gives them one lift, then circuits and conditioning instead. Same client, same equipment, a completely different hour.", target: '[data-wt="goal"]', advance: "next", info: true },
      { say: "This is how they chase that goal, and the goal decides what is even offered - muscle gain gets lifting, or lifting plus a cardio block. A fat-loss client would also get a cardio-only option here. On auto the goal picks for you, which is usually right.", target: '[data-wt="training-route"]', advance: "next", info: true },
      { say: "Anything that hurts goes here, and this you do change. Nothing that stresses it will be programmed, warm-up included.", target: '[data-wt="injuries"]', advance: "next" },
      { say: "Untick whatever is broken or busy today. A machine you untick cannot appear anywhere in the session.", target: '[data-wt="zones"]', advance: "next" },
      { say: "Build it.", target: "#buildBtn", advance: "click" },
      { say: "Three genuinely different answers, not one shuffled three ways - plus a blank Option D at the end for when none of them is the intent. Read A, B and C and pick whichever suits today.", target: ".workout-choice-grid", advance: "next", info: true },
      { say: "Choose one. You can still change every movement afterwards.", target: '[data-wt="choose-option"]', advance: "click" },
      { say: "This is a draft. Nothing has reached the client yet.", target: "#output", advance: "next" },
      { say: "Approve the draft. This step is easy to miss and nothing sends without it.", target: '[data-wt="approve-draft"]', advance: "click" },
      { say: "Now send it. It asks you to name the workout first - that name is what the client sees on their phone.", target: '[data-wt="assign"]', advance: "click" },
      { say: "Name it and confirm. This is the moment it reaches them.", target: "[data-ask-ok]", advance: "click" },
    ],
    done: "Set it up, build, choose, approve, send. That is the whole loop.",
  },
  {
    id: "tailor-workout",
    role: "trainer",
    title: "Tailor a workout after it is built",
    blurb: "Sets and reps, notes, modifiers, swapping, adding, filters and supersets.",
    needs: "workout",
    steps: [
      // WORKING keeps the demo off the warm-up, where half of these controls do not apply -
      // an elliptical takes no modifier and pairing it into a superset makes no sense.
      { say: "Here is a built workout on a practice client. We are working on a real training movement, not the warm-up, because that is where these controls matter.", target: WORKING + " .ex-actions", advance: "next", info: true },
      { say: "The pencil opens everything about how this one movement is prescribed.", target: WORKING + " .ex-btn.edit", advance: "click" },
      { say: "Working sets is how many hard sets they do. Reps or duration takes a number, a range, or a time - and for one-sided movements write \u201ceach side\u201d.", target: "#prescriptionSets", advance: "next", info: true },
      { say: "Tempo controls speed - \u201c3-1-1\u201d is three seconds down, one at the bottom, one up. Rest is what they wait between sets.", target: "#prescriptionTempo", advance: "next", info: true },
      { say: "Target effort is how hard the set should feel. RPE 8 or \u201c2 reps in reserve\u201d both work - the client sees this on their phone.", target: "#prescriptionEffort", advance: "next", info: true },
      { say: "Target load can be a weight, or a rule like \u201cuse last successful load\u201d so it follows them as they get stronger.", target: "#prescriptionLoad", advance: "next", info: true },
      { say: "The coach cue is the one line they read mid-set. Keep it to the thing that goes wrong.", target: "#prescriptionCue", advance: "next", info: true },
      { say: "Scope decides how far an edit reaches. In a one-off workout like this it is locked to today only - it opens up when you are editing a multi-week program, where you can push the change across every matching week.", target: "#prescriptionScope", advance: "next", info: true },
      { say: "Save it.", target: '[onclick="savePrescriptionEditor()"]', advance: "click" },
      { say: "The notes box under a movement is what the client reads on their phone. Cues, a weight to start at, anything you would say out loud.", target: WORKING + ' [data-wt="coach-note"]', advance: "next", info: true },
      { say: "The lightning bolt runs a movement differently - burnout, drop set, 21s, tempo, pause. Tap it.", target: WORKING + " .ex-btn.modifier", advance: "click" },
      { say: "Only the ones that suit this movement are offered - a power clean has none, a cable curl has four. Warm-up, mobility, activation, rotation, olympic, plyometric and agility movements never take one.", target: ".ask-dialog", advance: "next", info: true },
      { say: "Apply one, or cancel to leave it on straight sets.", target: ".ask-dialog [data-ask-ok], .ask-dialog [data-ask-cancel]", advance: "click" },
      { say: "The arrows swap a movement for something that trains the same thing. Tap it.", target: WORKING + " .ex-btn.swap", advance: "click" },
      { say: "Swapping gives you three lists: recommended already fits this phase and this client, similar keeps the same movement pattern, and the workout bank is everything you own.", target: ".swap-toolbar", advance: "next", info: true },
      { say: "Or let shuffle decide. Either way the sets and reps you set carry across to whatever replaces it.", target: "#swapShuffleBtn", advance: "next", info: true },
      { say: "Pick a replacement from the list.", target: "#exerciseSwapOptions .swap-option", advance: "click" },
      { say: "Adding a movement rather than replacing one starts here. Tap it.", target: WORKING_BLOCK + " .add-ex", advance: "click" },
      { say: "This is a different picker to the swap one, because you are choosing something new rather than a like-for-like replacement. Fits this phase respects the section you are adding to; entire exercise bank drops that and lets you put anything anywhere.", target: ".swap-toolbar", advance: "next", info: true },
      { say: "These narrow it the way you actually think - by body part, then by movement pattern.", target: "#scratchFilterMenus", advance: "next", info: true },
      { say: "Equipment narrows it to what is free right now.", target: "#swapZoneFilter", advance: "next", info: true },
      { say: "Widen it to the entire exercise bank so you can see everything you own, not just what suits this phase.", target: "#swapBankBtn", advance: "click" },
      { say: "And this one is quietly hiding things from you. On \u201conly filter-matching\u201d you never see anything that breaks a client rule. Switch it to show overrides with warnings.", target: "#swapSafetyFilter", advance: "change" },
      { say: "Now read the tags on the right of each row. Green - matches all filters - means it fits their equipment, experience, age and every limitation they reported, and is safe to pick without thinking.", target: "#exerciseSwapOptions", advance: "next", info: true },
      { say: "Amber is a caution that names the problem - not a primary lift for this phase, or a finisher used outside the finisher phase. You can still pick those; it asks you to confirm and sends the workout back through coach approval. Anything above their experience or against a limitation is not a caution, it is a block.", target: "#exerciseSwapOptions", advance: "next", info: true },
      { say: "This practice client has a bad shoulder, so some movements are blocked outright. Tap one marked blocked by safety filter and watch what happens.", target: "#exerciseSwapOptions .swap-option.blocked", advance: "click" },
      { say: "It refuses, and tells you which limitation stopped it. That is the one warning you should not talk yourself past - it came from what the client told you.", target: "#exerciseSwapOptions", advance: "next", info: true },
      { say: "An amber one is allowed, but it stops and asks you to confirm first, and the workout goes back through coach approval before it reaches them. That is the trade for overriding.", target: "#exerciseSwapOptions", advance: "next", info: true },
      { say: "Pick one carrying the green tag and it goes straight in, no questions asked.", target: "#exerciseSwapOptions .swap-option:has(.swap-badge.safe)", advance: "click" },
      { say: "Now pair two of them. Tap create a superset.", target: WORKING_BLOCK + ' [data-wt="create-superset"]', advance: "click" },
      { say: "This is the part that matters - you choose which two. A1 is the first movement, A2 is what they alternate it with. Pick the pair you actually want; if A2 sits in another phase it gets moved here so they are done together.", target: ".superset-pair-grid", advance: "next", info: true },
      { say: "This line warns you if the pairing does not work - two of the same movement, or a pair that ties up equipment someone else is waiting on.", target: "#supersetEditorWarning", advance: "next", info: true },
      { say: "Create the pair.", target: '[onclick="saveSupersetEditor()"]', advance: "click" },
      { say: "Last one, and the simplest. The X on the right of any movement takes it out of the workout entirely - no dialog, no confirmation, it is just gone. Use it when a movement does not belong at all, rather than swapping it for something you do not want either.", target: WORKING + " .ex-btn.remove", advance: "next", info: true },
    ],
    done: "Edit, note, modify, swap, add, pair, remove. All of it changes only the workout in front of you.",
  },
  {
    id: "change-equipment",
    role: "trainer",
    title: "Handle a machine being unavailable",
    blurb: "Three different equipment filters, and only one of them changes the workout.",
    needs: "workout",
    steps: [
      { say: "A machine goes down. There are three equipment filters in this app and they do different jobs - this is the only one that changes what gets built. Untick a machine here before you build and nothing in the session can use it, warm-up included.", target: '[data-wt="zones"]', advance: "next", info: true },
      { say: "The other two only change what you are looking at. Here is the case where you find out mid-session with the workout already built - do not rebuild it, swap the one movement. Tap the arrows.", target: WORKING + " .ex-btn.swap", advance: "click" },
      { say: "Recommended already respects the equipment on their profile. To filter by hand you need the full bank. Tap workout bank.", target: "#swapBankBtn", advance: "click" },
      { say: "There it is - the second equipment filter. This one changes nothing about the workout. It only narrows the list you are browsing to movements that use what is actually free right now.", target: "#swapZoneFilter", advance: "next", info: true },
      { say: "Set it to what you have got. The broken machine stops being offered.", target: "#swapZoneFilter", advance: "change" },
      { say: "Every row still shows what it needs, so you can see at a glance whether a replacement is even possible today.", target: "#exerciseSwapOptions .swap-option-meta", advance: "next", info: true },
      { say: "One thing to expect: if the replacement trains a different pattern to the one it is replacing, the app stops and asks you to confirm, and the workout goes back through coach approval. A like-for-like swap goes straight through.", target: "#exerciseSwapOptions", advance: "next", info: true },
      { say: "Pick one. Your sets, reps and rest carry across to it.", target: "#exerciseSwapOptions .swap-option", advance: "click" },
      { say: "Third place, and the one people miss. Adding a movement has the same filter. Tap add.", target: WORKING_BLOCK + " .add-ex", advance: "click" },
      { say: "Open the entire exercise bank here too - that is where the filters live.", target: "#swapBankBtn", advance: "click" },
      { say: "Same equipment menu. Use it when a machine going down means you need a different movement altogether rather than a like-for-like swap.", target: "#swapZoneFilter", advance: "next", info: true },
      { say: "Close it when you are done.", target: '[onclick="closeExerciseSwap()"]', advance: "click" },
    ],
    done: "Untick it in the builder to keep it out of the whole session. Use the bank filter in either picker to work around it once the workout exists.",
  },
  {
    id: "update-limitations",
    role: "trainer",
    title: "Update what a client cannot do",
    blurb: "Today only, or from now on - two different places and they behave differently.",
    needs: "workout",
    steps: [
      { say: "A client turns up with something hurting. Where you record it decides whether it is remembered.", target: '[data-wt="injuries"]', advance: "next", info: true },
      { say: "Setting it here covers this session only. Nothing that stresses that area gets programmed - not the main lift, not the accessories, not the warm-up - and in the movement pickers those choices come back marked blocked by safety filter.", target: '[data-wt="injuries"]', advance: "next", info: true },
      { say: "But it is forgotten the moment you build their next workout. For anything that is not just today, it has to go on their profile. Open your client list.", target: '[data-coach-nav="clients"]', advance: "click" },
      { say: "Tap the client.", target: ".client-row", advance: "click" },
      { say: "Edit profile - this is the button, not new workout.", target: '[data-wt="edit-profile"]', advance: "click" },
      { say: "Here is the permanent version. Pick the area, then write down what actually happened - a future trainer covering for you reads this, so \u201cright shoulder, painful overhead since March\u201d beats ticking a box.", target: "#profileEditInjuries", advance: "next", info: true },
      { say: "Saved here, it is pre-filled on every workout you build for them from now on, and it follows them to any trainer who picks them up.", target: "#profileEditorSaveBtn", advance: "next", info: true },
      { say: "Save it.", target: "#profileEditorSaveBtn", advance: "click" },
    ],
    done: "Just today goes in the builder. Anything lasting goes on their profile, where it is remembered and shared.",
  },

];

function walkthroughById(id) { return WALKTHROUGHS.find((item) => item.id === id) || null; }
function walkthroughsForRole(role) { return WALKTHROUGHS.filter((item) => item.role === role); }

/* ---- sandbox ---- */

function walkthroughStorageKeys() {
  const keys = [];
  for (let i = 0; i < localStorage.length; i += 1) {
    const key = localStorage.key(i);
    if (key && key.indexOf("fit4life") === 0 && key !== WALKTHROUGH_SNAPSHOT_KEY) keys.push(key);
  }
  return keys;
}
function walkthroughTakeSnapshot() {
  // If practice data is somehow already in storage - a session that died before it could
  // restore - snapshotting it would enshrine Batman as a real client on the way back out.
  purgePracticeProfiles();
  const snap = {};
  walkthroughStorageKeys().forEach((key) => { snap[key] = localStorage.getItem(key); });
  try { localStorage.setItem(WALKTHROUGH_SNAPSHOT_KEY, JSON.stringify(snap)); return true; }
  catch (_) { showToast("Not enough room on this device to start a walkthrough safely"); return false; }
}
function walkthroughRestoreSnapshot() {
  let snap = null;
  try { snap = JSON.parse(localStorage.getItem(WALKTHROUGH_SNAPSHOT_KEY) || "null"); } catch (_) { snap = null; }
  if (!snap) return false;
  walkthroughStorageKeys().forEach((key) => { if (!(key in snap)) localStorage.removeItem(key); });
  Object.keys(snap).forEach((key) => {
    if (snap[key] == null) localStorage.removeItem(key); else localStorage.setItem(key, snap[key]);
  });
  localStorage.removeItem(WALKTHROUGH_SNAPSHOT_KEY);
  purgePracticeProfiles();
  return true;
}
// A tab closed mid-walkthrough leaves practice data behind; put the real data back on the next load.
/* Batman, Superman and Spider-Man exist for practice and must never appear beside real
   people. Whatever went wrong - a snapshot lost, a tab killed at the wrong moment, a
   restore that half ran - this removes them from real storage unconditionally. */
function purgePracticeProfiles() {
  try {
    const practice = practiceProfileIds();
    const stored = JSON.parse(localStorage.getItem(PROFILES_KEY) || "[]");
    if (!Array.isArray(stored)) return false;
    const cleaned = stored.filter((profile) => profile && !practice.includes(profile.id));
    if (cleaned.length === stored.length) return false;
    localStorage.setItem(PROFILES_KEY, JSON.stringify(cleaned));
    return true;
  } catch (_) { return false; }
}

function walkthroughRecoverIfInterrupted() {
  document.body.classList.remove("sandbox-on");
  const strayRemoved = purgePracticeProfiles();
  if (!localStorage.getItem(WALKTHROUGH_SNAPSHOT_KEY)) return strayRemoved;
  walkthroughRestoreSnapshot();
  return true;
}

/* ---- run state ---- */

let walkthroughRun = null;
let sandboxActive = false;

function walkthroughActive() { return !!walkthroughRun; }
/* Either kind of practice - a guided walkthrough or the free-roam sandbox. Everything that
   has to be faked or blocked keys off this, not off walkthroughs specifically. */
function practiceModeActive() { return sandboxActive || !!walkthroughRun; }

function startWalkthrough(id) {
  const plan = walkthroughById(id);
  if (!plan) return false;
  if (walkthroughRun) endWalkthrough(true);
  // In the sandbox a snapshot already exists and the real data is already put away. Taking
  // another would snapshot the practice data and restore that instead.
  if (!sandboxActive && !walkthroughTakeSnapshot()) return false;

  window.FIT4LIFE_PRACTICE_ACTIVE = true;
  walkthroughRun = {
    id: plan.id,
    plan: plan,
    index: 0,
    returnView: (document.querySelector(".view.active") || {}).id || null,
    returnDestination: (typeof openCoachDestination === "function" && openCoachDestination.current) || null,
    timer: null,
    onClick: null,
  };

  // one practice client, nobody real
  writeProfiles([practiceClientProfile()]);
  // The directory can be left filtered to "my clients" or with a search typed in, either of
  // which hides the practice client and leaves the step with nothing to point at.
  try {
    if (typeof selectTrainerClient === "function") selectTrainerClient(practiceClientProfile().name);
    const search = document.getElementById("trainerClientSearch"); if (search) search.value = "";
    const scope = document.getElementById("trainerClientScope"); if (scope) scope.value = "all";
  } catch (_) {}
  // The client directory unions profiles with progress, InBody, body goals, check-ins and
  // athlete metrics, so blanking profiles alone still left real people on screen. Set them
  // unconditionally - the snapshot puts every one of them back on exit.
  PRACTICE_CLEARED_KEYS.forEach((key) => localStorage.setItem(key, "[]"));

  walkthroughCloseDialogs();
  if (plan.needs === "workout") walkthroughPrepareWorkout();
  document.body.classList.add("walkthrough-on");
  walkthroughRenderBar();
  walkthroughGoToStep(0);
  return true;
}

function endWalkthrough(quiet) {
  if (!walkthroughRun) return;
  const run = walkthroughRun;
  walkthroughRun = null;
  if (!sandboxActive) window.FIT4LIFE_PRACTICE_ACTIVE = false;
  walkthroughClearStep(run);
  const bar = document.getElementById("walkthroughBar"); if (bar) bar.remove();
  document.body.classList.remove("walkthrough-on");
  walkthroughCloseDialogs();
  // The sandbox owns the snapshot while it runs; it restores on its own exit instead.
  if (!sandboxActive) walkthroughRestoreSnapshot();
  else seedPracticeRoster();

  if (run.returnView) {
    document.querySelectorAll(".view").forEach((view) => view.classList.remove("active"));
    const target = document.getElementById(run.returnView);
    if (target) target.classList.add("active");
  }
  if (run.returnDestination && typeof openCoachDestination === "function") openCoachDestination(run.returnDestination);
  else if (typeof renderOutput === "function") renderOutput();
  if (typeof renderTrainerDirectory === "function") renderTrainerDirectory();
  if (!quiet) showToast(sandboxActive ? "Walkthrough closed \u2014 still in practice mode"
    : "Walkthrough closed \u2014 you are back on your real clients");
}

/* A dialog left open from a previous run sits on top of the next one and makes the
   whole walkthrough look broken. Start and finish from a clean screen. */
function walkthroughCloseDialogs() {
  document.querySelectorAll(".modal-backdrop.open").forEach((node) => node.classList.remove("open"));
  document.querySelectorAll(".ask-backdrop").forEach((node) => node.remove());
}

function walkthroughClearStep(run) {
  const state = run || walkthroughRun; if (!state) return;
  if (state.timer) { clearInterval(state.timer); state.timer = null; }
  if (state.onClick) { document.removeEventListener("click", state.onClick, true); state.onClick = null; }
  if (state.onChange) { document.removeEventListener("change", state.onChange, true); state.onChange = null; }
  document.querySelectorAll(".wt-target").forEach((el) => el.classList.remove("wt-target", "wt-info"));
}

/* Steps 4 to 7 tell the trainer their client's answers are already filled in. If they
   skipped or mis-tapped the two steps that load the client, those fields are empty and
   the walkthrough is lying to them - and Build stays refused because there is no goal.
   Guarantee it instead of depending on the taps landing. */
function walkthroughLoadPracticeIntoBuilder() {
  if (typeof state === "undefined" || !state.solo) return false;
  const loaded = state.solo.profileId === PRACTICE_CLIENT_ID
    && typeof personReady === "function" && personReady(state.solo);
  if (loaded) return true;
  try {
    if (typeof selectTrainerClient === "function") selectTrainerClient(practiceClientProfile().name);
    if (typeof openSelectedClientSession === "function") openSelectedClientSession();
    if (typeof renderForms === "function") renderForms();
    if (typeof updateHint === "function") updateHint();
  } catch (_) { return false; }
  return true;
}

/* Walkthroughs about editing a workout need one on screen. Launched cold from
   Settings there is nothing to point at, so build one on the practice client first. */
function walkthroughPrepareWorkout() {
  const practice = practiceClientProfile();
  if (typeof state === "undefined" || !state.solo) return false;
  // Replace the spec rather than assigning over it. Assigning left a real client's
  // profileId, coach adjustment, readiness trend, limitation assessments and sport behind,
  // and those fed the "practice" build. A fresh object is what clears them.
  state.mode = "solo";
  state.session = null;
  state.sessionOptions = [];
  state.solo = {
    client: practice.name, profileId: "", username: "",
    goal: "hypertrophy", goals: ["hypertrophy"],
    trainingStyle: "auto", cardioMode: "any", cardioModes: ["any"],
    coachAdjustment: null, readinessTrend: null,
    experience: practice.experience, age: practice.age, minutes: practice.minutes,
    muscles: [], injuries: (practice.injuries || []).slice(), zones: practice.zones.slice(),
  };
  document.querySelectorAll(".view").forEach((view) => view.classList.remove("active"));
  const builder = document.getElementById("view-builder"); if (builder) builder.classList.add("active");
  try {
    // Without these the chips keep whatever they last painted - equipment reading empty,
    // limitations reading "none", or a real client's still on screen.
    if (typeof refreshProfileSelects === "function") refreshProfileSelects();
    if (typeof renderForms === "function") renderForms();
    if (typeof setMode === "function") setMode("solo");
    if (typeof updateHint === "function") updateHint();
    if (typeof generate === "function") generate();
    if (typeof chooseWorkoutOption === "function") chooseWorkoutOption(0);
  } catch (_) { return false; }
  const built = state.session && state.session.data && (state.session.data.blocks || []).length;
  if (!built) { showToast("Could not build a practice workout on this device"); return false; }
  return true;
}

function walkthroughVisible(el) {
  if (!el) return false;
  const style = getComputedStyle(el);
  if (style.display === "none" || style.visibility === "hidden" || style.opacity === "0") return false;
  const box = el.getBoundingClientRect();
  // Either dimension is enough. A flex column of buttons measures zero wide while
  // being perfectly visible, and demanding both dimensions rejected it.
  if (box.width <= 0 && box.height <= 0) return false;
  // offsetParent is null for every position:fixed element whether it is on screen or
  // not, so it only tells us about a hidden ancestor for everything else. Using it on
  // a fixed element rejected every open dialog and stranded the step on top of it.
  if (style.position !== "fixed" && el.offsetParent === null) return false;
  // On a phone the coach nav becomes a fixed bottom bar that this walkthrough's own bar
  // sits on top of. A covered element passes every check above, so the step waited
  // forever for a tap that could not land and never offered Skip. Probe a few points:
  // any one of them reachable is enough, since a partly covered control is still tappable.
  const points = [
    [box.left + box.width / 2, box.top + box.height / 2],
    [box.left + box.width * 0.2, box.top + box.height * 0.3],
    [box.left + box.width * 0.8, box.top + box.height * 0.7],
  ];
  let probed = false;
  for (const [x, y] of points) {
    if (x < 0 || y < 0 || x > window.innerWidth || y > window.innerHeight) continue;
    probed = true;
    const top = document.elementFromPoint(x, y);
    if (!top || el.contains(top) || top.contains(el)) return true;
  }
  return !probed;
}

/* A step that waits for a tap on a control the browser will not accept a tap on is the
   same dead end as one that is off screen - a disabled Build button looks present and
   never fires. Read-only steps are exempt: they set pointer-events:none deliberately. */
function walkthroughInteractable(el, step) {
  if (!el || !step || step.info) return true;
  if (step.advance !== "click" && step.advance !== "change") return true;
  if (el.disabled === true || el.getAttribute("aria-disabled") === "true") return false;
  if (getComputedStyle(el).pointerEvents === "none") return false;
  return true;
}
/* A control can be off the bottom of a scrolling rail, or under our own bar. Bring it into
   view before judging whether it is reachable, otherwise the occlusion test condemns
   something a single scroll would have fixed. */
function walkthroughOffScreen(el) {
  if (!el) return false;
  const box = el.getBoundingClientRect();
  return box.bottom > window.innerHeight - 150 || box.top < 60;
}
/* Bring the control into view when a step starts, and then leave the page alone. This used
   to run on the highlight timer, so scrolling away to see where something sits in relation
   to everything else snapped you straight back within 300ms. */
function walkthroughNudgeIntoView(el, force) {
  if (!el) return;
  if (!force && walkthroughRun && walkthroughRun.scrolled) return;
  if (!walkthroughOffScreen(el)) { if (walkthroughRun) walkthroughRun.scrolled = true; return; }
  // scrollIntoView alone is unreliable here - it scrolls the nearest scrollable ancestor,
  // which for a control inside a panel is often already at its limit and moves nothing.
  // Do that for the container, then move the page explicitly.
  if (typeof el.scrollIntoView === "function") { try { el.scrollIntoView({ block: "center" }); } catch (_) {} }
  const box = el.getBoundingClientRect();
  const usable = window.innerHeight - 150;
  if (box.top < 60 || box.bottom > usable) {
    const target = box.top + window.scrollY - Math.max(80, (usable - box.height) / 2);
    window.scrollTo({ top: Math.max(0, target), behavior: force ? "smooth" : "auto" });
  }
  if (walkthroughRun) walkthroughRun.scrolled = true;
}
function walkthroughApplyHighlight(step) {
  let matches = [];
  // :has() is used by one step; an engine without it must not throw out of the timer
  try { matches = step && step.target ? Array.from(document.querySelectorAll(step.target)) : []; }
  catch (_) { matches = []; }
  // scroll the first candidate into view once, then judge reachability
  if (matches.length) walkthroughNudgeIntoView(matches[0]);
  const found = matches.filter(walkthroughVisible).filter((node) => walkthroughInteractable(node, step));
  const el = found[0] || null;
  document.querySelectorAll(".wt-target").forEach((node) => { if (node !== el) node.classList.remove("wt-target"); });
  if (!step || !step.target) return true;
  if (el) el.classList.toggle("wt-info", !!step.info);
  if (el && !el.classList.contains("wt-target")) el.classList.add("wt-target");
  return !!el;
}
function walkthroughGoToStep(index) {
  if (!walkthroughRun) return;
  walkthroughClearStep();
  const steps = walkthroughRun.plan.steps;
  if (index >= steps.length) { walkthroughFinish(); return; }
  walkthroughRun.index = index;
  const step = steps[index];

  if (typeof step.go === "function") { try { step.go(); } catch (_) {} }

  // Apply it now so the step never starts with nothing lit, then keep re-applying:
  // the app re-renders constantly and would otherwise drop the class.
  walkthroughRun.missing = false;
  walkthroughRun.missingSince = null;
  walkthroughRun.scrolled = false;
  walkthroughApplyHighlight(step);
  walkthroughRun.timer = setInterval(() => {
    if (!walkthroughRun) return;
    // Waiting for a tap on a control that is not on screen is how someone gets stranded,
    // so once it has been absent for a moment, say so and offer a way past.
    if (walkthroughApplyHighlight(step)) {
      walkthroughRun.missingSince = null;
      if (walkthroughRun.missing) { walkthroughRun.missing = false; walkthroughRenderBar(); }
      // Scrolling away is allowed now, so offer a way back rather than dragging them there.
      const bar = document.getElementById("walkthroughBar");
      const find = bar && bar.querySelector("[data-wt-find]");
      if (find) find.hidden = !walkthroughOffScreen(document.querySelector(".wt-target"));
      return;
    }
    if (!walkthroughRun.missingSince) walkthroughRun.missingSince = Date.now();
    if (!walkthroughRun.missing && Date.now() - walkthroughRun.missingSince > 1400) {
      walkthroughRun.missing = true;
      walkthroughRenderBar();
    }
  }, WALKTHROUGH_HIGHLIGHT_MS);

  if (step.advance === "change" && step.target) {
    walkthroughRun.onChange = (event) => {
      if (!walkthroughRun) return;
      const hit = event.target && event.target.closest && event.target.closest(step.target);
      if (!hit || !walkthroughVisible(hit)) return;
      const at = walkthroughRun.index;
      setTimeout(() => { if (walkthroughRun && walkthroughRun.index === at) walkthroughGoToStep(at + 1); }, 300);
    };
    document.addEventListener("change", walkthroughRun.onChange, true);
  }
  if (step.advance === "click" && step.target) {
    walkthroughRun.onClick = (event) => {
      if (!walkthroughRun) return;
      const hit = event.target && event.target.closest && event.target.closest(step.target);
      if (!hit || !walkthroughVisible(hit)) return;
      const at = walkthroughRun.index;
      setTimeout(() => { if (walkthroughRun && walkthroughRun.index === at) walkthroughGoToStep(at + 1); }, 260);
    };
    document.addEventListener("click", walkthroughRun.onClick, true);
  }
  walkthroughRenderBar();
}

function walkthroughFinish() {
  const plan = walkthroughRun && walkthroughRun.plan;
  endWalkthrough(true);
  // After the restore, not before: exiting puts the whole snapshot back, which would
  // wipe this the instant it was written and the "done before" mark would never stick.
  const seen = walkthroughSeen();
  if (plan && seen.indexOf(plan.id) < 0) { seen.push(plan.id); walkthroughWriteSeen(seen); }
  showWalkthroughFinished(plan);
}

/* The end of a walkthrough is the moment practice stops and real clients start.
   A toast slides away and is easy to miss, so this is a card they have to dismiss. */
function showWalkthroughFinished(plan) {
  const existing = document.getElementById("walkthroughDoneBackdrop"); if (existing) existing.remove();
  const backdrop = el("div","modal-backdrop open ask-backdrop");
  backdrop.id = "walkthroughDoneBackdrop";
  backdrop.innerHTML = '<div class="ask-dialog wt-done-dialog">'
    + '<span class="wt-done-eyebrow">Demo finished</span>'
    + '<h4>You finished this trainer demo</h4>'
    + (plan && plan.done ? '<p class="wt-done-line">' + escapeHtml(plan.done) + '</p>' : '')
    + '<p class="wt-done-real">' + (sandboxActive
        ? 'That was all on a practice client. You are still in practice mode, so keep exploring - nothing is real until you leave it.'
        : 'Everything you just did was on the practice client and has been thrown away. '
          + 'You are back on your real clients now, so anything you change from here is real.') + '</p>'
    + '<div class="tool-actions">'
    + '<button class="small-btn" data-wt-done-more>Show me something else</button>'
    + '<button class="small-btn primary" data-wt-done-ok>Back to my clients</button>'
    + '</div></div>';
  document.body.appendChild(backdrop);
  const close = () => backdrop.remove();
  backdrop.querySelector("[data-wt-done-ok]").addEventListener("click", close);
  backdrop.querySelector("[data-wt-done-more]").addEventListener("click", () => {
    close(); if (typeof openTrainerAssistance === "function") openTrainerAssistance();
  });
  backdrop.addEventListener("click", (event) => { if (event.target === backdrop) close(); });
  document.addEventListener("keydown", function onKey(event) {
    if (event.key !== "Escape") return;
    document.removeEventListener("keydown", onKey); close();
  });
}

function walkthroughSeen() {
  try { const raw = JSON.parse(localStorage.getItem(WALKTHROUGH_SEEN_KEY) || "[]"); return Array.isArray(raw) ? raw : []; }
  catch (_) { return []; }
}
function walkthroughWriteSeen(list) {
  try { localStorage.setItem(WALKTHROUGH_SEEN_KEY, JSON.stringify(list)); } catch (_) {}
}

/* ---- the bar ---- */

function walkthroughRenderBar() {
  if (!walkthroughRun) return;
  let bar = document.getElementById("walkthroughBar");
  if (!bar) {
    bar = document.createElement("div");
    bar.id = "walkthroughBar";
    bar.className = "walkthrough-bar";
    document.body.appendChild(bar);
  }
  const steps = walkthroughRun.plan.steps, step = steps[walkthroughRun.index];
  const missing = !!walkthroughRun.missing;
  const waiting = (step.advance === "click" || step.advance === "change") && !missing;
  bar.innerHTML = '<div class="wt-bar-inner' + (missing ? ' wt-stuck' : '') + '">'
    + '<div class="wt-bar-copy"><span class="wt-count">Step ' + (walkthroughRun.index + 1) + ' of ' + steps.length + '</span>'
    + '<p>' + escapeHtml(step.say) + '</p>'
    + (waiting ? '<span class="wt-waiting">' + (step.advance === "change" ? "Waiting for you to change it" : "Waiting for you to tap it") + '</span>' : '')
    + (step.info && !missing ? '<span class="wt-info-note">Reading only \u2014 nothing to change here</span>' : '')
    + (missing ? '<span class="wt-missing">That control is not on this screen right now \u2014 skip past it or step back.</span>' : '') + '</div>'
    + '<div class="wt-bar-actions">'
    + '<button class="small-btn wt-find" data-wt-find hidden>Show me</button>'
    + (walkthroughRun.index > 0 ? '<button class="small-btn" data-wt-back>Back</button>' : '')
    + (waiting ? '' : '<button class="small-btn primary" data-wt-next>' + (missing ? 'Skip' : 'Next') + '</button>')
    + '<button class="small-btn wt-exit" data-wt-exit>I\u2019ve got it</button>'
    + '</div></div>';
  const back = bar.querySelector("[data-wt-back]");
  if (back) back.onclick = () => walkthroughGoToStep(walkthroughRun.index - 1);
  const next = bar.querySelector("[data-wt-next]");
  if (next) next.onclick = () => walkthroughGoToStep(walkthroughRun.index + 1);
  bar.querySelector("[data-wt-exit]").onclick = () => endWalkthrough(false);
  const find = bar.querySelector("[data-wt-find]");
  if (find) find.onclick = () => {
    const el = document.querySelector(".wt-target");
    if (el) walkthroughNudgeIntoView(el, true);
  };
}

/* ---- the library screen ---- */

function trainerAssistancePanelHtml() {
  const seen = walkthroughSeen();
  const cards = walkthroughsForRole("trainer").map((plan) =>
    '<button class="wt-card" data-wt-start="' + escapeHtml(plan.id) + '">'
    + '<b>' + escapeHtml(plan.title) + '</b>'
    + '<span>' + escapeHtml(plan.blurb) + '</span>'
    + (seen.indexOf(plan.id) >= 0 ? '<em class="wt-done">Done before</em>' : '')
    + '</button>').join("");
  return '<section class="coach-module-card" id="trainerAssistance" style="grid-column:1/-1">'
    + '<h3>Trainer Assistance</h3>'
    + '<p>Pick anything you want shown. Each one walks you through it on the real screens, on a practice client, '
    + 'so nothing you do here touches a real person. Leave whenever you have got it.</p>'
    + '<div class="wt-card-grid">' + cards + '</div>'
    + '<div class="wt-sandbox-invite"><div><b>Or just have a look around</b>'
    + '<span>Practice mode gives you three made-up clients and the run of the whole app. '
    + 'Nothing is saved, nothing syncs, and your real clients are put away until you leave.</span></div>'
    + '<button class="small-btn primary" data-sandbox-start>Start practice mode</button></div>'
    + '</section>';
}

function bindWalkthroughCards(root) {
  const scope = root || document;
  scope.querySelectorAll("[data-wt-start]").forEach((button) => {
    button.onclick = () => startWalkthrough(button.getAttribute("data-wt-start"));
  });
  const sandbox = scope.querySelector("[data-sandbox-start]");
  if (sandbox) {
    sandbox.textContent = sandboxRunning() ? "Leave practice mode" : "Start practice mode";
    sandbox.onclick = () => { if (sandboxRunning()) exitSandbox(false); else startSandbox(); };
  }
}

function openTrainerAssistance() {
  if (typeof openCoachDestination === "function") openCoachDestination("settings");
  setTimeout(() => {
    const panel = document.getElementById("trainerAssistance");
    if (panel) panel.scrollIntoView({ behavior: "smooth", block: "start" });
  }, 120);
}

if (typeof window !== "undefined") {
  window.startWalkthrough = startWalkthrough;
  window.endWalkthrough = endWalkthrough;
  window.openTrainerAssistance = openTrainerAssistance;
  window.walkthroughActive = walkthroughActive;
  window.walkthroughRecoverIfInterrupted = walkthroughRecoverIfInterrupted;
}

/* ============================================================
   SANDBOX
   Free roam. Same sandboxing as a walkthrough - snapshot every
   fit4life key, swap in fake clients, block every push - but no
   steps. Wander the whole app and break nothing.

   A walkthrough started inside it nests: it reuses this snapshot
   and does not restore on its own, so leaving the sandbox is the
   single point where real data comes back.
   ============================================================ */

function practiceRoster() {
  const base = practiceClientProfile();
  return [
    base,
    { id: "practice-client-2", name: "Superman", username: "superman",
      age: 35, experience: 3, minutes: 60, goals: ["strength"], injuries: [],
      zones: base.zones.slice(), membershipTier: "premium", sessionsPerWeek: 3, programmedDays: 6,
      email: "superman@fit4life.local", createdAt: "2026-01-01T00:00:00.000Z" },
    { id: "practice-client-3", name: "Spider-Man", username: "spiderman",
      age: 21, experience: 1, minutes: 45, goals: ["athletic"], injuries: [],
      zones: base.zones.slice(), membershipTier: "starter", sessionsPerWeek: 1, programmedDays: 3,
      email: "spiderman@fit4life.local", createdAt: "2026-01-01T00:00:00.000Z" },
  ];
}
function practiceProfileIds() { return practiceRoster().map((profile) => profile.id); }

function seedPracticeRoster() {
  writeProfiles(practiceRoster());
  PRACTICE_CLEARED_KEYS.forEach((key) => localStorage.setItem(key, "[]"));
  try {
    if (typeof selectTrainerClient === "function") selectTrainerClient(practiceClientProfile().name);
    const search = document.getElementById("trainerClientSearch"); if (search) search.value = "";
    const scope = document.getElementById("trainerClientScope"); if (scope) scope.value = "all";
  } catch (_) {}
}

function sandboxRunning() { return sandboxActive; }

function startSandbox() {
  if (typeof requireTrainerMutation === "function" && !requireTrainerMutation()) return false;
  if (sandboxActive) return true;
  if (walkthroughActive()) endWalkthrough(true);
  if (!walkthroughTakeSnapshot()) return false;

  sandboxActive = true;
  window.FIT4LIFE_PRACTICE_ACTIVE = true;
  seedPracticeRoster();
  document.body.classList.add("sandbox-on");
  renderSandboxBanner();
  if (typeof openCoachDestination === "function") openCoachDestination("clients");
  showToast("Practice mode on — nothing you do now is real");
  return true;
}

function exitSandbox(quiet) {
  if (!sandboxActive) return;
  if (walkthroughActive()) endWalkthrough(true);
  sandboxActive = false;
  window.FIT4LIFE_PRACTICE_ACTIVE = false;
  walkthroughCloseDialogs();
  walkthroughRestoreSnapshot();
  document.body.classList.remove("sandbox-on");
  const banner = document.getElementById("sandboxBanner"); if (banner) banner.remove();
  // the builder may still hold a practice client who no longer exists
  if (typeof state !== "undefined" && state.solo && practiceProfileIds().includes(state.solo.profileId)) {
    state.solo.profileId = ""; state.solo.client = "";
    state.session = null; state.sessionOptions = [];
  }
  try {
    if (typeof renderForms === "function") renderForms();
    if (typeof renderOutput === "function") renderOutput();
    if (typeof renderTrainerDirectory === "function") renderTrainerDirectory();
    if (typeof openCoachDestination === "function") openCoachDestination("clients");
  } catch (_) {}
  if (!quiet) showToast("Practice mode off — you are back on your real clients");
}

function renderSandboxBanner() {
  let banner = document.getElementById("sandboxBanner");
  if (!banner) {
    banner = document.createElement("div");
    banner.id = "sandboxBanner";
    banner.className = "sandbox-banner";
    document.body.appendChild(banner);
  }
  banner.innerHTML = '<div class="sandbox-banner-inner">'
    + '<span class="sandbox-dot" aria-hidden="true"></span>'
    + '<div class="sandbox-copy"><b>Practice mode</b>'
    + '<span>Three made-up clients. Go anywhere, change anything — none of it is saved and your real clients cannot be touched.</span></div>'
    + '<button class="small-btn sandbox-exit" data-sandbox-exit>Leave practice</button>'
    + '</div>';
  banner.querySelector("[data-sandbox-exit]").onclick = () => exitSandbox(false);
}

if (typeof window !== "undefined") {
  window.startSandbox = startSandbox;
  window.exitSandbox = exitSandbox;
  window.sandboxRunning = sandboxRunning;
  window.practiceModeActive = practiceModeActive;
}
