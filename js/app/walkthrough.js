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

/* ---- the client set ----------------------------------------------------

   Written for someone who has never used a fitness app and may be nervous about the gym.
   Separate from the trainer set in every way that matters: these run on the person's OWN
   portal, on their real workout, and move nothing. startWalkthrough refuses to snapshot,
   seal sync, swap the roster or blank a single store when role is "client".

   Two rules shaped every step below.

   1. A tap is fine for getting around. It is NOT fine for anything that sends. A learner
      pressing "Send to my trainer" would actually report pain they never felt, so the send
      buttons are described and left alone. The say text carries that, because info:true only
      neutralises the one highlighted node and is re-applied on a timer.

   2. Nothing may be targeted that might not be there. A client with no workout has no week
      strip, no day grid, no start button - and that client is exactly who opens these. Each
      tour states the condition it needs; the card says so and refuses the tap rather than
      stranding someone on step one. */

const CLIENT_WALKTHROUGH_GATES = {
  // Both of these start by tapping the bottom nav, which does not exist on the active-workout
  // screen - and the "?" is reachable from there, so without this check the tour would start
  // and strand on step one.
  onClientTab: function () {
    if (typeof activeClientProfile !== "function" || !activeClientProfile()) return "Sign in as yourself first and this guide will open.";
    if (typeof CLIENT_APP_VIEWS === "undefined" || typeof currentView === "undefined" || !CLIENT_APP_VIEWS.includes(currentView)) {
      return "Finish or leave your workout first - this guide starts from the tabs at the bottom.";
    }
    return "";
  },
  program: function () {
    const here = CLIENT_WALKTHROUGH_GATES.onClientTab();
    if (here) return here;
    const program = clientProgramSource(activeClientProfile());
    if (!program) return "Your coach has not sent you a workout yet. This guide will be here as soon as they do.";
    return "";
  },
  inWorkout: function () {
    if (typeof currentView !== "undefined" && currentView === "active-workout") return "";
    return "Start your workout first, then open this guide from the top of that screen.";
  },
  lastExercise: function () {
    if (typeof currentView === "undefined" || currentView !== "active-workout" || !activeWorkout) {
      return "Open this while you are in a workout and near the end of it.";
    }
    try {
      const data = activeAssignmentAndSession();
      const units = data.session ? activeWorkoutUnits(data.session, activeWorkout.shortened) : [];
      if (!units.length) return "Open this while you are in a workout and near the end of it.";
      if (activeWorkout.unitIndex !== units.length - 1) return "This one is about finishing. Open it when you reach the last exercise.";
    } catch (_) { return "Open this while you are in a workout and near the end of it."; }
    return "";
  },
};

const CLIENT_WALKTHROUGHS = [
  {
    id: "client-find-workout",
    role: "client",
    title: "Find and start today's workout",
    blurb: "Where your workout lives, and how to open it.",
    requires: CLIENT_WALKTHROUGH_GATES.program,
    steps: [
      { say: "Your workout lives behind this button. Tap Workout.", target: '[data-client-tab="program"]', advance: "click" },
      { say: "Your coach may plan several weeks at a time. This row is those weeks, and the one lit up is the week you are in.", target: "#view-client-program .week-strip", advance: "next", info: true },
      { say: "These seven boxes are the days of that week. Today has a ring around it. A box saying Rest day is not a mistake - rest is part of what your coach planned.", target: "#view-client-program .day-grid", advance: "next", info: true },
      { say: "Tap a day to look at it. The workout underneath changes to match the day you picked.", target: "#view-client-program .day-grid .day-card:not([disabled])", advance: "click" },
      { say: "This is the workout for that day: every exercise, in the order you do them, with how many rounds and how many times. Reading it changes nothing and you have not started.", target: "#view-client-program .workout-preview", advance: "next", info: true },
      { say: "These are your options for today. Use shortened workout is for a day you are pushed for time. Report a limitation is how you tell your coach something hurts before you begin.", target: "#view-client-program .workout-preview .secondary-actions", advance: "next", info: true },
      { say: "This button opens the workout. Press it and the first exercise fills the screen, and your coach can see you have started. Leave it for now - press Next, then start when you are ready.", target: '[data-wt="client-start-workout"]', advance: "next", info: true },
    ],
    done: "Workout tab, pick the day, read it through, then start. That is the whole thing.",
  },
  {
    id: "client-log-sets",
    role: "client",
    title: "Log your sets as you go",
    blurb: "What the numbers mean, and how to write down what you did.",
    requires: CLIENT_WALKTHROUGH_GATES.inWorkout,
    steps: [
      { say: "This is the exercise you are on right now. The big line is its name, and underneath is a note from your coach on doing it well.", target: "#activeWorkoutContent .active-exercise-head", advance: "next", info: true },
      { say: "This is the plan for it. Sets is how many rounds you do. Reps is how many times you repeat the movement in one round. Rest is how long you wait between rounds.", target: "#activeWorkoutContent .active-prescription", advance: "next", info: true },
      { say: "This row is where you write down what you actually did. Fill it in after each round rather than at the end. There is a box for how many you did, one for how hard it felt, and one for weight when the exercise uses any.", target: "#activeSetMount .active-set-row", advance: "next", info: true },
      { say: "Put in the real number, even when it is under the plan. A real number is far more use to your coach than a tidy one.", target: "#activeSetReps", advance: "next", info: true },
      { say: "This saves the round and moves you to the next. What you type reaches your coach as you go, so press it once the round is genuinely done.", target: '[data-wt="log-set"]', advance: "next", info: true },
      { say: "If you cannot do a round, use Skip set. That is not a failure. Your coach sees the skip and can change the plan, which they cannot do if you leave it blank.", target: '[data-wt="skip-set"]', advance: "next", info: true },
      { say: "Once every round here is written down or skipped, this button turns on and takes you to the next exercise. Until then it stays off on purpose, so nothing gets lost.", target: '[data-wt="continue-unit"], [data-wt="finish-workout"]', advance: "next", info: true },
    ],
    done: "Write down each round as you finish it, then move on. That is all the app asks of you.",
  },
  {
    id: "client-report-pain",
    role: "client",
    title: "Tell your trainer something hurt",
    blurb: "How to report pain, and what happens after you send it.",
    // Deliberately NOT gated on having a workout. Someone with nothing assigned yet who has
    // hurt themselves is exactly who needs to know how to say so, and gating this told them
    // to wait for a workout that has nothing to do with it.
    requires: CLIENT_WALKTHROUGH_GATES.onClientTab,
    steps: [
      { say: "Anything you need to tell your coach starts here. Tap Coach.", target: '[data-client-tab="coach"]', advance: "click" },
      { say: "This card is for pain or discomfort. Open it - opening the form sends nothing.", target: '[data-wt="client-report-pain"]', advance: "click",
        go: function () { if (typeof closeClientPainReport === "function") closeClientPainReport(); } },
      { say: "These four colours are the whole scale. Green is no pain. Yellow is noticing something while everything still moves normally. Orange is when it changes how you move. Red is sharp, severe, or getting worse.", target: "#clientPainModal .pain-level-guide", advance: "next", info: true },
      // Deliberately not a change step. The control opens on Green, so a client whose honest
      // answer IS green alters nothing, no event fires, and the step has no Next and no Skip.
      { say: "Pick the colour that matches what you felt, then press Next. Choosing one sends nothing.", target: "#clientPainLevel", advance: "next", info: true },
      { say: "This line now tells you what to do about it, and what your coach will do next. Read it before you go on.", target: "#clientPainAction", advance: "next", info: true },
      { say: "Answering Yes here moves the report up to orange on its own, because something that changes how you move is treated as more serious. That is deliberate, so answer it honestly.", target: "#clientPainMovementChanged", advance: "next", info: true },
      { say: "The note is where you say it in your own words: where you felt it, what you were doing, and whether you stopped. A short honest note is worth more than a long one.", target: "#clientPainDetails", advance: "next", info: true },
      { say: "This button sends the report. Leave it alone for now. When you do send one for real your coach gets it straight away, and if you chose orange or red the app holds your next workout until they have read it and replied.", target: '[data-wt="pain-submit"]', advance: "next", info: true },
      { say: "Cancel closes the form and throws away everything you typed, and nothing reaches your coach. Use it now to leave.", target: '[data-wt="pain-cancel"]', advance: "click" },
    ],
    done: "Coach tab, Report pain, pick the colour, say what happened, send. Telling someone early is what keeps you training.",
  },
  {
    id: "client-finish-review",
    role: "client",
    title: "Finish and review a workout",
    blurb: "The last button, the short form after it, and who sees what.",
    requires: CLIENT_WALKTHROUGH_GATES.lastExercise,
    steps: [
      { say: "You are on the last exercise, so this button now says Finish workout. It sends nothing on its own - it opens a short form first.", target: '[data-wt="finish-workout"]', advance: "next", info: true },
      { say: "Press it now. If it is still off, there is a round on this exercise that has not been written down or skipped yet.", target: '[data-wt="finish-workout"]', advance: "click",
        go: function () { if (typeof closeWorkoutReview === "function") closeWorkoutReview(); },
        settled: function () { const modal = document.getElementById("reviewModal"); return modal && modal.classList.contains("open"); } },
      // Opens pre-set to 7, so picking 7 fires nothing and the step would have no way out.
      { say: "This form is how your coach knows what to change for next time. Set this to the number that matches how the session felt - four is easy, ten is as hard as you can go - then press Next. Honest is more use than brave.", target: "#reviewDifficulty", advance: "next", info: true },
      { say: "This asks whether anything hurt. Orange or red puts your workouts on hold until your coach has read it and replied, so choose those only when they are true. If nothing hurt, leave it on green.", target: "#reviewPain", advance: "next", info: true },
      { say: "Anything you write here reaches your coach as a message when you send the form. It is the place for a question you did not want to stop the workout for.", target: "#reviewQuestions", advance: "next", info: true },
      { say: "This button sends the whole form to your coach and marks the workout done. Nothing has been sent while this guide has been running.", target: "#reviewSaveOnlyBtn", advance: "next", info: true },
    ],
    done: "The form is still open. Fill it in and send it when you are ready, or close it and come back later.",
  },
];

// Both sets, so a client tour is findable by id and by role without the trainer list knowing
// anything about it.
function allWalkthroughs() { return WALKTHROUGHS.concat(CLIENT_WALKTHROUGHS); }
function walkthroughById(id) { return allWalkthroughs().find((item) => item.id === id) || null; }
/* A trainer's tour can fabricate whatever it needs - walkthroughPrepareWorkout builds a
   workout on the practice client before the first step runs. A client's tour runs on their own
   real portal and can invent nothing, so a tour of "start today's workout" aimed at somebody
   who has not been sent one would point at a button that is not there. That person - brand new,
   nothing assigned yet - is exactly who opens these. A plan may declare a precondition
   returning a plain-English reason it cannot run yet, or null when it can. */
function walkthroughBlockedReason(plan) {
  if (!plan || typeof plan.requires !== "function") return "";
  try { return plan.requires() || ""; } catch (_) { return ""; }
}
function walkthroughsForRole(role) { return allWalkthroughs().filter((item) => item.role === role); }

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
  // A snapshot already present means practice is running somewhere else on this device.
  // Taking a second one would capture the blanked practice state as the real data, and
  // whichever tab left first would restore empty arrays over everything.
  if (localStorage.getItem(WALKTHROUGH_SNAPSHOT_KEY)) {
    showToast("Practice mode is already open in another tab. Leave it there first.");
    return false;
  }
  // If practice data is somehow already in storage - a session that died before it could
  // restore - snapshotting it would enshrine Batman as a real client on the way back out.
  purgePracticeProfiles();
  const snap = {};
  walkthroughStorageKeys().forEach((key) => { snap[key] = localStorage.getItem(key); });
  try {
    localStorage.setItem(WALKTHROUGH_SNAPSHOT_KEY, JSON.stringify(snap));
    // Read it back. Practice mode replaces the real roster, so the snapshot is the only copy
    // of it - entering without a backup that provably round-trips risks the real clients.
    const check = JSON.parse(localStorage.getItem(WALKTHROUGH_SNAPSHOT_KEY) || "null");
    if (!check || check[PROFILES_KEY] !== snap[PROFILES_KEY]) throw new Error("snapshot did not read back");
    return true;
  } catch (_) {
    localStorage.removeItem(WALKTHROUGH_SNAPSHOT_KEY);
    showToast("Practice mode needs to back up your clients first, and this device would not let it. Nothing was changed.");
    return false;
  }
}
function walkthroughRestoreSnapshot() {
  let snap = null;
  try { snap = JSON.parse(localStorage.getItem(WALKTHROUGH_SNAPSHOT_KEY) || "null"); } catch (_) { snap = null; }
  // No snapshot means the restore cannot run - but leaving without purging would hand the
  // practice roster over as the real one. Clean up regardless, then report the failure.
  if (!snap) { purgePracticeProfiles(); return false; }
  walkthroughStorageKeys().forEach((key) => { if (!(key in snap)) localStorage.removeItem(key); });
  Object.keys(snap).forEach((key) => {
    if (snap[key] == null) localStorage.removeItem(key); else localStorage.setItem(key, snap[key]);
  });
  localStorage.removeItem(WALKTHROUGH_SNAPSHOT_KEY);
  purgePracticeProfiles();
  // LIBRARY is built once at load from the stored bank edits. Restoring storage does not
  // rebuild it, so without this the in-memory library keeps whatever practice did to it and
  // real workouts get generated from it for the rest of the session.
  if (typeof applyExerciseLibraryEdits === "function") { try { applyExerciseLibraryEdits(); } catch (_) {} }
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
    // By brand first, so a client invented during practice goes too, then by id as a
    // backstop for anything written before branding existed.
    const cleaned = stored.filter((profile) => profile && profile._practice !== true && !practice.includes(profile.id));
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
  const blocked = walkthroughBlockedReason(plan);
  if (blocked) { if (typeof showToast === "function") showToast(blocked); return false; }
  if (walkthroughRun) endWalkthrough(true);
  // A client walks through their OWN portal, on their own real workout. Everything the trainer
  // path does below - snapshotting, sealing sync, replacing the roster with the practice client
  // and blanking eight stores - is right for a trainer rehearsing on somebody fictional and
  // would destroy the data of the very person being taught. None of it runs for a client.
  const clientRun = plan.role === "client";
  // In the sandbox a snapshot already exists and the real data is already put away. Taking
  // another would snapshot the practice data and restore that instead.
  if (!clientRun && !sandboxActive && !walkthroughTakeSnapshot()) return false;

  if (!clientRun) window.FIT4LIFE_PRACTICE_ACTIVE = true;
  walkthroughRun = {
    id: plan.id,
    plan: plan,
    client: clientRun,
    index: 0,
    returnView: (document.querySelector(".view.active") || {}).id || null,
    returnDestination: (typeof openCoachDestination === "function" && openCoachDestination.current) || null,
    timer: null,
    onClick: null,
  };

  if (!clientRun) {
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
  }

  walkthroughCloseDialogs();
  if (!clientRun && plan.needs === "workout") walkthroughPrepareWorkout();
  document.body.classList.add("walkthrough-on");
  // The client's bottom nav is fixed at the bottom of the screen and the tour bar sits on top
  // of it, so without this a step saying "tap the Workout tab" points at something the bar is
  // covering and the reachability probe rejects it.
  document.body.classList.toggle("walkthrough-client", clientRun);
  // show() hides these while a tour runs, but a tour that never changes view never calls it,
  // so the "?" sat live on top of its own walkthrough.
  ["trainerHelpBtn", "clientHelpBtn"].forEach((id) => {
    const button = document.getElementById(id); if (button) button.classList.remove("show");
  });
  walkthroughRenderBar();
  walkthroughGoToStep(0);
  return true;
}

function endWalkthrough(quiet) {
  if (!walkthroughRun) return;
  const run = walkthroughRun;
  walkthroughRun = null;
  if (!run.client && !sandboxActive) window.FIT4LIFE_PRACTICE_ACTIVE = false;
  walkthroughClearStep(run);
  const bar = document.getElementById("walkthroughBar"); if (bar) bar.remove();
  document.body.classList.remove("walkthrough-on");
  try { document.body.style.removeProperty("--wt-bar-h"); } catch (_) {}
  // The sweep exists to clear a dialog left over from a previous PRACTICE run. A client run
  // has no such history, and one of its tours ends with the review form deliberately open -
  // closing it here made the closing card's "the form is still open" a lie, and quietly threw
  // away the difficulty the client had just been asked to set.
  if (!run.client) walkthroughCloseDialogs();
  document.body.classList.remove("walkthrough-client");
  // A client run took no snapshot and moved nobody's data, so there is nothing to put back -
  // restoring here would overwrite their live portal with a snapshot that was never taken.
  // The sandbox owns the snapshot while it runs; it restores on its own exit instead.
  if (run.client) { /* nothing was moved */ }
  else if (!sandboxActive) { walkthroughRestoreSnapshot(); purgePracticeProfiles(); }
  else seedPracticeRoster();

  if (run.client) {
    // Back through show(), which also restores the "?" hidden on the way in.
    // Rather than toggling .active directly: it is what keeps
    // currentView honest and repaints the bottom nav and the "?" for the view landed on.
    // The trainer renderers below are not just useless here - renderOutput is the coaching
    // builder, and running it over a client's screen is how the wrong app appears.
    const back = String(run.returnView || "").replace(/^view-/, "");
    if (back && typeof show === "function") show(back);
    if (!quiet) showToast("Guide closed \u2014 nothing was sent to your coach");
    return;
  }
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
// Set by walkthroughApplyHighlight when the target exists but is not usable yet, so the bar
// can say that instead of claiming the control is missing entirely.
let walkthroughBlockedHint = "";
function walkthroughApplyHighlight(step) {
  let matches = [];
  // :has() is used by one step; an engine without it must not throw out of the timer
  try { matches = step && step.target ? Array.from(document.querySelectorAll(step.target)) : []; }
  catch (_) { matches = []; }
  // Interactability does not depend on scroll position, so it is judged FIRST - otherwise a
  // disabled control gets scrolled to the middle of the screen and only then rejected, which
  // reads as the tour pointing at something and immediately denying it exists.
  walkthroughBlockedHint = "";
  const usable = matches.filter((node) => walkthroughInteractable(node, step));
  if (!usable.length && matches.length) {
    // Present, just not usable yet. The control itself already explains why, so borrow it.
    const blocked = matches.find(walkthroughVisible) || matches[0];
    walkthroughBlockedHint = (blocked && blocked.title) || "";
  }
  // Scroll only a candidate we might actually accept, then judge reachability.
  if (usable.length) walkthroughNudgeIntoView(usable[0]);
  const found = usable.filter(walkthroughVisible);
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
      const advance = () => { if (walkthroughRun && walkthroughRun.index === at) walkthroughGoToStep(at + 1); };
      // A tap is not proof the thing happened. Approving a draft can be refused by the audit
      // and the tour still marched on to talk about assigning it. Where a step can say what
      // "it worked" looks like, wait for that instead - and give up after a few seconds rather
      // than trapping anyone, letting the next step's own missing-target handling take over.
      if (typeof step.settled !== "function") { setTimeout(advance, 260); return; }
      let waited = 0;
      const poll = setInterval(() => {
        if (!walkthroughRun || walkthroughRun.index !== at) { clearInterval(poll); return; }
        let settled = false;
        try { settled = !!step.settled(); } catch (_) { settled = false; }
        waited += 160;
        if (settled || waited >= 4000) { clearInterval(poll); advance(); }
      }, 160);
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
  const forClient = Boolean(plan && plan.role === "client");
  const existing = document.getElementById("walkthroughDoneBackdrop"); if (existing) existing.remove();
  const backdrop = el("div","modal-backdrop open ask-backdrop");
  backdrop.id = "walkthroughDoneBackdrop";
  backdrop.innerHTML = '<div class="ask-dialog wt-done-dialog">'
    + '<span class="wt-done-eyebrow">' + (forClient ? 'All done' : 'Demo finished') + '</span>'
    + '<h4>' + (forClient ? 'That is how it works' : 'You finished this trainer demo') + '</h4>'
    + (plan && plan.done ? '<p class="wt-done-line">' + escapeHtml(plan.done) + '</p>' : '')
    + '<p class="wt-done-real">' + (forClient
        ? 'That was your own screens, and nothing was sent to your coach while the guide was running. '
          + 'You can open this again any time from the question mark at the top.'
        : sandboxActive
        ? 'That was all on a practice client. You are still in practice mode, so keep exploring - nothing is real until you leave it.'
        : 'Everything you just did was on the practice client and has been thrown away. '
          + 'You are back on your real clients now, so anything you change from here is real.') + '</p>'
    + '<div class="tool-actions">'
    + '<button class="small-btn" data-wt-done-more>Show me something else</button>'
    + '<button class="small-btn primary" data-wt-done-ok>' + (forClient ? 'Got it' : 'Back to my clients') + '</button>'
    + '</div></div>';
  document.body.appendChild(backdrop);
  const close = () => backdrop.remove();
  backdrop.querySelector("[data-wt-done-ok]").addEventListener("click", close);
  backdrop.querySelector("[data-wt-done-more]").addEventListener("click", () => {
    close();
    // Sending a client to the trainer's settings page was the old behaviour of this button.
    if (forClient) { if (typeof openClientAssistance === "function") openClientAssistance(); }
    else if (typeof openTrainerAssistance === "function") openTrainerAssistance();
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
    + (missing ? '<span class="wt-missing">' + (walkthroughBlockedHint
        ? escapeHtml(walkthroughBlockedHint)
        : 'That control is not on this screen right now \u2014 skip past it or step back.') + '</span>' : '') + '</div>'
    + '<div class="wt-bar-actions">'
    + '<button class="small-btn wt-find" data-wt-find hidden>Show me</button>'
    + (walkthroughRun.index > 0 ? '<button class="small-btn" data-wt-back>Back</button>' : '')
    + (waiting ? '' : '<button class="small-btn primary" data-wt-next>' + (missing ? 'Skip' : 'Next') + '</button>')
    + '<button class="small-btn wt-exit" data-wt-exit>I\u2019ve got it</button>'
    + '</div></div>';
  // The nav above the bar is positioned from this, and the bar's height changes with the
   // length of each step's text, so it is re-measured on every render.
  try { document.body.style.setProperty("--wt-bar-h", bar.offsetHeight + "px"); } catch (_) {}
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

/* One card renderer for both sides. A tour that cannot run yet says so on the card and is not
   tappable, rather than accepting the tap and stranding someone on step one. */
function walkthroughCardHtml(plan, seen) {
  const blocked = walkthroughBlockedReason(plan);
  return '<button class="wt-card' + (blocked ? ' wt-card-blocked' : '') + '"'
    + (blocked ? ' disabled' : ' data-wt-start="' + escapeHtml(plan.id) + '"') + '>'
    + '<b>' + escapeHtml(plan.title) + '</b>'
    + '<span>' + escapeHtml(blocked || plan.blurb) + '</span>'
    + (!blocked && (seen || []).indexOf(plan.id) >= 0 ? '<em class="wt-done">Done before</em>' : '')
    + '</button>';
}

function trainerAssistancePanelHtml() {
  const seen = walkthroughSeen();
  const cards = walkthroughsForRole("trainer").map((plan) => walkthroughCardHtml(plan, seen)).join("");
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

/* A modal rather than a screen. The "?" is in the topbar so it reaches every client view -
   including the active workout, which the bottom nav does not appear on and which "Log your
   sets" can only be run from. Sending them to a settings page to find this would drop them
   out of the workout they are in the middle of. startWalkthrough closes it on the way past:
   walkthroughCloseDialogs clears every .modal-backdrop.open. */
function clientAssistanceMarkup() {
  const seen = walkthroughSeen();
  const cards = walkthroughsForRole("client").map((plan) => walkthroughCardHtml(plan, seen)).join("");
  return '<div id="clientAssistanceModal" class="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="clientAssistanceTitle">'
    + '<div class="review-dialog"><h2 id="clientAssistanceTitle">Show me how</h2>'
    + '<p>Pick anything you want walked through. It happens on your own screens, at your pace, '
    + 'and you can stop at any point. Nothing is sent to your coach while a guide is running.</p>'
    + '<div class="wt-card-grid">' + cards + '</div>'
    + '<div class="tool-actions"><button class="small-btn" onclick="closeClientAssistance()">Close</button></div>'
    + '</div></div>';
}
function openClientAssistance() {
  let modal = document.getElementById("clientAssistanceModal");
  if (!modal) {
    const wrap = document.createElement("div");
    wrap.innerHTML = clientAssistanceMarkup();
    document.body.appendChild(wrap.firstChild);
    modal = document.getElementById("clientAssistanceModal");
  } else {
    // Rebuilt every time: which tours can run depends on where the person is standing.
    modal.outerHTML = clientAssistanceMarkup();
    modal = document.getElementById("clientAssistanceModal");
  }
  if (!modal) return false;
  modal.querySelectorAll("[data-wt-start]").forEach((button) => {
    button.onclick = () => { closeClientAssistance(); startWalkthrough(button.dataset.wtStart); };
  });
  modal.classList.add("open");
  return true;
}
function closeClientAssistance() {
  const modal = document.getElementById("clientAssistanceModal");
  if (modal) modal.classList.remove("open");
  return true;
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
  window.openClientAssistance = openClientAssistance;
  window.closeClientAssistance = closeClientAssistance;
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
  purgePracticeProfiles();
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
