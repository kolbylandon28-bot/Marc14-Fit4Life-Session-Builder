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
const WALKTHROUGH_HIGHLIGHT_MS = 300;

function practiceClientProfile() {
  return {
    id: PRACTICE_CLIENT_ID,
    name: "Practice Client",
    username: "practice",
    age: 27,
    experience: 2,
    minutes: 60,
    goals: ["hypertrophy"],
    injuries: [],
    zones: ["cardio","platform","rack","crossfit","dumbbell","machine","cable","bodyweight"],
    membershipTier: "standard",
    sessionsPerWeek: 2,
    programmedDays: 3,
    email: "practice@fit4life.local",
    createdAt: "2026-01-01T00:00:00.000Z",
  };
}

/* ---- the library ---- */

const WALKTHROUGHS = [
  {
    id: "program-workout",
    role: "trainer",
    title: "Program a workout for a client",
    blurb: "Build one, pick an approach, approve it and send it.",
    steps: [
      { say: "Start from your client list.", target: '[data-coach-nav="clients"]', advance: "click" },
      { say: "Tap the client you are programming for.", target: ".client-row", advance: "click" },
      { say: "Open a new workout for them.", target: '[data-wt="new-workout"]', advance: "click" },
      { say: "Their goal, experience and equipment are already filled in from their profile. Change anything you want for today.", target: "#soloFields", advance: "next" },
      { say: "Build it.", target: "#buildBtn", advance: "click" },
      { say: "You get three different answers, not one. Read the cards and pick the approach that suits them today.", target: ".workout-choice-grid", advance: "next" },
      { say: "Choose one.", target: '[data-wt="choose-option"]', advance: "click" },
      { say: "This is your draft. Nothing has reached the client yet - you can still change every movement.", target: "#output", advance: "next" },
      { say: "Approve the draft when you are happy with it.", target: '[data-wt="approve-draft"]', advance: "click" },
      { say: "Now send it. This is the moment it appears on their phone.", target: '[data-wt="assign"]', advance: "click" },
    ],
    done: "That is the whole loop. Build, choose, approve, send.",
  },
  {
    id: "edit-sets-reps",
    role: "trainer",
    title: "Change the sets and reps on a movement",
    blurb: "Tailor any single movement without rebuilding the workout.",
    needs: "workout",
    steps: [
      { say: "Here is a workout on the practice client. Every movement has its own controls on the right.", target: ".ex-actions", advance: "next" },
      { say: "Tap the pencil on the movement you want to change.", target: ".ex-btn.edit", advance: "click" },
      { say: "Set the sets, reps, rest and effort you actually want, then save. Only this movement changes.", target: ".modal-backdrop.open", advance: "next" },
    ],
    done: "The rest of the workout is untouched.",
  },
  {
    id: "swap-movement",
    role: "trainer",
    title: "Swap a movement out",
    blurb: "When a machine is taken or a movement does not suit them.",
    needs: "workout",
    steps: [
      { say: "Here is a workout on the practice client. Tap the swap arrows on a movement you want to replace.", target: ".ex-btn.swap", advance: "click" },
      { say: "You get replacements that train the same thing. Shuffle for another, or pick one from the list.", target: ".modal-backdrop.open", advance: "next" },
    ],
    done: "The prescription carries over, so the sets and reps stay as you set them.",
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
  return true;
}
// A tab closed mid-walkthrough leaves practice data behind; put the real data back on the next load.
function walkthroughRecoverIfInterrupted() {
  if (!localStorage.getItem(WALKTHROUGH_SNAPSHOT_KEY)) return false;
  walkthroughRestoreSnapshot();
  return true;
}

/* ---- run state ---- */

let walkthroughRun = null;

function walkthroughActive() { return !!walkthroughRun; }

function startWalkthrough(id) {
  const plan = walkthroughById(id);
  if (!plan) return false;
  if (walkthroughRun) endWalkthrough(true);
  if (!walkthroughTakeSnapshot()) return false;

  window.FIT4LIFE_WALKTHROUGH_ACTIVE = true;
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
  ["fit4life_assignments_v1","fit4life_client_messages_v1","fit4life_records_v1","fit4life_calendar_events_v1"]
    .forEach((key) => { if (localStorage.getItem(key) != null) localStorage.setItem(key, "[]"); });

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
  window.FIT4LIFE_WALKTHROUGH_ACTIVE = false;
  walkthroughClearStep(run);
  const bar = document.getElementById("walkthroughBar"); if (bar) bar.remove();
  document.body.classList.remove("walkthrough-on");
  walkthroughRestoreSnapshot();

  if (run.returnView) {
    document.querySelectorAll(".view").forEach((view) => view.classList.remove("active"));
    const target = document.getElementById(run.returnView);
    if (target) target.classList.add("active");
  }
  if (run.returnDestination && typeof openCoachDestination === "function") openCoachDestination(run.returnDestination);
  else if (typeof renderOutput === "function") renderOutput();
  if (typeof renderTrainerDirectory === "function") renderTrainerDirectory();
  if (!quiet) showToast("Back to your real clients");
}

function walkthroughClearStep(run) {
  const state = run || walkthroughRun; if (!state) return;
  if (state.timer) { clearInterval(state.timer); state.timer = null; }
  if (state.onClick) { document.removeEventListener("click", state.onClick, true); state.onClick = null; }
  document.querySelectorAll(".wt-target").forEach((el) => el.classList.remove("wt-target"));
}

/* Walkthroughs about editing a workout need one on screen. Launched cold from
   Settings there is nothing to point at, so build one on the practice client first. */
function walkthroughPrepareWorkout() {
  const practice = practiceClientProfile();
  if (typeof state === "undefined" || !state.solo) return false;
  Object.assign(state.solo, {
    client: practice.name, goal: "hypertrophy", goals: ["hypertrophy"],
    experience: practice.experience, age: practice.age, minutes: practice.minutes,
    muscles: [], injuries: [], zones: practice.zones.slice(),
  });
  document.querySelectorAll(".view").forEach((view) => view.classList.remove("active"));
  const builder = document.getElementById("view-builder"); if (builder) builder.classList.add("active");
  try {
    if (typeof generate === "function") generate();
    if (typeof chooseWorkoutOption === "function") chooseWorkoutOption(0);
  } catch (_) { return false; }
  return true;
}

function walkthroughApplyHighlight(step) {
  const el = step && step.target ? document.querySelector(step.target) : null;
  document.querySelectorAll(".wt-target").forEach((node) => { if (node !== el) node.classList.remove("wt-target"); });
  if (el && !el.classList.contains("wt-target")) {
    el.classList.add("wt-target");
    // a control below the fold looks like nothing happened
    if (typeof el.scrollIntoView === "function") {
      const box = el.getBoundingClientRect();
      if (box.bottom > window.innerHeight - 130 || box.top < 60) el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }
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
  walkthroughApplyHighlight(step);
  walkthroughRun.timer = setInterval(() => {
    if (!walkthroughRun) return;
    walkthroughApplyHighlight(step);
  }, WALKTHROUGH_HIGHLIGHT_MS);

  if (step.advance === "click" && step.target) {
    walkthroughRun.onClick = (event) => {
      if (!walkthroughRun) return;
      const hit = event.target && event.target.closest && event.target.closest(step.target);
      if (!hit) return;
      const at = walkthroughRun.index;
      setTimeout(() => { if (walkthroughRun && walkthroughRun.index === at) walkthroughGoToStep(at + 1); }, 260);
    };
    document.addEventListener("click", walkthroughRun.onClick, true);
  }
  walkthroughRenderBar();
}

function walkthroughFinish() {
  const plan = walkthroughRun && walkthroughRun.plan;
  const seen = walkthroughSeen(); if (plan && seen.indexOf(plan.id) < 0) { seen.push(plan.id); walkthroughWriteSeen(seen); }
  const message = plan && plan.done ? plan.done : "Done.";
  endWalkthrough(true);
  showToast(message);
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
  const waiting = step.advance === "click";
  bar.innerHTML = '<div class="wt-bar-inner">'
    + '<div class="wt-bar-copy"><span class="wt-count">Step ' + (walkthroughRun.index + 1) + ' of ' + steps.length + '</span>'
    + '<p>' + escapeHtml(step.say) + '</p>'
    + (waiting ? '<span class="wt-waiting">Waiting for you to tap it</span>' : '') + '</div>'
    + '<div class="wt-bar-actions">'
    + (walkthroughRun.index > 0 ? '<button class="small-btn" data-wt-back>Back</button>' : '')
    + (waiting ? '' : '<button class="small-btn primary" data-wt-next>Next</button>')
    + '<button class="small-btn wt-exit" data-wt-exit>I’ve got it</button>'
    + '</div></div>';
  const back = bar.querySelector("[data-wt-back]");
  if (back) back.onclick = () => walkthroughGoToStep(walkthroughRun.index - 1);
  const next = bar.querySelector("[data-wt-next]");
  if (next) next.onclick = () => walkthroughGoToStep(walkthroughRun.index + 1);
  bar.querySelector("[data-wt-exit]").onclick = () => endWalkthrough(false);
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
    + '<div class="wt-card-grid">' + cards + '</div></section>';
}

function bindWalkthroughCards(root) {
  (root || document).querySelectorAll("[data-wt-start]").forEach((button) => {
    button.onclick = () => startWalkthrough(button.getAttribute("data-wt-start"));
  });
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
