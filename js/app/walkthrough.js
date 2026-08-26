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
    blurb: "The whole arc - set it up, build it, approve it, send it.",
    steps: [
      { say: "Start from your client list.", target: '[data-coach-nav="clients"]', advance: "click" },
      { say: "Tap the client you are programming for.", target: ".client-row", advance: "click" },
      { say: "Open a new workout for them.", target: '[data-wt="new-workout"]', advance: "click" },
      { say: "Nothing on this screen is yours to fill in. Everything below was answered by the client on their questionnaire when they joined.", target: ".profile-loaded", advance: "next", info: true },
      { say: "Their goal is already picked from that questionnaire. This one setting drives more of the workout than anything else on the page.", target: '[data-wt="goal"]', advance: "next", info: true },
      { say: "Build muscle gives them two main lifts, two accessories and an isolation at 4 sets of 8-12 with 60-90 seconds rest. Lose body fat gives them one lift, then circuits and conditioning instead. Same client, same equipment, a completely different hour.", target: '[data-wt="goal"]', advance: "next", info: true },
      { say: "This is how they chase that goal - lifting, cardio or a mix. On auto the goal decides, which is usually right. Change it only when today needs to be different from their normal.", target: '[data-wt="training-route"]', advance: "next", info: true },
      { say: "Anything that hurts goes here, and this you do change. Nothing that stresses it will be programmed, warm-up included.", target: '[data-wt="injuries"]', advance: "next" },
      { say: "Untick whatever is broken or busy today. A machine you untick cannot appear anywhere in the session.", target: '[data-wt="zones"]', advance: "next" },
      { say: "Build it.", target: "#buildBtn", advance: "click" },
      { say: "Three genuinely different answers, not one shuffled three ways. Read them and pick the one that suits today.", target: ".workout-choice-grid", advance: "next" },
      { say: "Choose one. You can still change every movement afterwards.", target: '[data-wt="choose-option"]', advance: "click" },
      { say: "This is a draft. Nothing has reached the client yet.", target: "#output", advance: "next" },
      { say: "Approve the draft. This step is easy to miss and nothing sends without it.", target: '[data-wt="approve-draft"]', advance: "click" },
      { say: "Now send it. This is the moment it appears on their phone.", target: '[data-wt="assign"]', advance: "click" },
    ],
    done: "Set it up, build, choose, approve, send. That is the whole loop.",
  },
  {
    id: "tailor-workout",
    role: "trainer",
    title: "Tailor a workout after it is built",
    blurb: "Sets and reps, coaching notes, modifiers, swaps, supersets, removing a movement.",
    needs: "workout",
    steps: [
      { say: "Here is a built workout on a practice client. Every movement has its own controls down the right-hand side.", target: ".ex-actions", advance: "next" },
      { say: "The pencil changes sets, reps, rest and effort for that one movement only.", target: ".ex-btn.edit", advance: "click" },
      { say: "Set what you actually want, then save.", target: ".modal-backdrop.open", advance: "next" },
      { say: "The notes box under a movement is what the client reads on their phone. Cues, tempo, a weight to start at.", target: '[data-wt="coach-note"]', advance: "next" },
      { say: "The lightning bolt runs a movement differently - burnout, drop set, 21s, tempo, pause. Only the ones that suit it are offered.", target: ".ex-btn.modifier", advance: "click" },
      { say: "Pick how it should be run, or straight sets to undo it. It changes the name the client sees and the prescription.", target: ".ask-dialog", advance: "next" },
      { say: "The arrows swap a movement for one that trains the same thing - use it when a machine is taken.", target: ".ex-btn.swap", advance: "click" },
      { say: "Shuffle for another suggestion, or pick from the list. Your sets and reps carry across.", target: ".modal-backdrop.open", advance: "next" },
      { say: "The X removes a movement outright.", target: ".ex-btn.remove", advance: "next" },
      { say: "And this pairs two movements into a superset, so they alternate at one station.", target: '[data-wt="create-superset"]', advance: "next" },
    ],
    done: "Every one of those changes only the workout in front of you.",
  },
  {
    id: "change-equipment",
    role: "trainer",
    title: "Handle a machine being unavailable",
    blurb: "Before you build, or after - two different fixes.",
    needs: "workout",
    steps: [
      { say: "If a machine is down before you build, untick it here and nothing in the session will use it.", target: '[data-wt="zones"]', advance: "next" },
      { say: "If you only find out mid-session, do not rebuild. Swap the single movement instead.", target: ".ex-btn.swap", advance: "click" },
      { say: "Pick a replacement that uses what is free. The sets and reps stay as you set them.", target: ".modal-backdrop.open", advance: "next" },
    ],
    done: "Untick it before you build; swap it after. Never rebuild the whole session.",
  },
  {
    id: "update-limitations",
    role: "trainer",
    title: "Update what a client cannot do",
    blurb: "Record an injury so it is respected from now on, not just today.",
    needs: "workout",
    steps: [
      { say: "Limitations set here apply to this session only.", target: '[data-wt="injuries"]', advance: "next" },
      { say: "To make it stick for every future workout it has to go on their profile. Open their client details.", target: '[data-coach-nav="clients"]', advance: "click" },
      { say: "Tap the client.", target: ".client-row", advance: "click" },
      { say: "Edit their profile and record it there. Every workout built from now on will respect it.", target: '[data-wt="new-workout"]', advance: "next" },
    ],
    done: "Session-only goes in the builder. Permanent goes on their profile.",
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
  document.querySelectorAll(".wt-target").forEach((el) => el.classList.remove("wt-target", "wt-info"));
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

// Existing in the DOM is not the same as being on screen. A hidden view still holds
// its buttons, so matching on existence alone left the bar waiting for a tap on
// something the trainer could not see or reach.
function walkthroughVisible(el) {
  if (!el || el.offsetParent === null) return false;
  const box = el.getBoundingClientRect();
  return box.width > 0 && box.height > 0;
}
function walkthroughApplyHighlight(step) {
  const found = step && step.target ? Array.from(document.querySelectorAll(step.target)).filter(walkthroughVisible) : [];
  const el = found[0] || null;
  document.querySelectorAll(".wt-target").forEach((node) => { if (node !== el) node.classList.remove("wt-target"); });
  if (!step || !step.target) return true;
  if (el) el.classList.toggle("wt-info", !!step.info);
  if (el && !el.classList.contains("wt-target")) {
    el.classList.add("wt-target");
    // a control below the fold looks like nothing happened
    if (typeof el.scrollIntoView === "function") {
      const box = el.getBoundingClientRect();
      if (box.bottom > window.innerHeight - 130 || box.top < 60) el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }
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
  walkthroughApplyHighlight(step);
  walkthroughRun.timer = setInterval(() => {
    if (!walkthroughRun) return;
    // Waiting for a tap on a control that is not on screen is how someone gets stranded,
    // so once it has been absent for a moment, say so and offer a way past.
    if (walkthroughApplyHighlight(step)) {
      walkthroughRun.missingSince = null;
      if (walkthroughRun.missing) { walkthroughRun.missing = false; walkthroughRenderBar(); }
      return;
    }
    if (!walkthroughRun.missingSince) walkthroughRun.missingSince = Date.now();
    if (!walkthroughRun.missing && Date.now() - walkthroughRun.missingSince > 1400) {
      walkthroughRun.missing = true;
      walkthroughRenderBar();
    }
  }, WALKTHROUGH_HIGHLIGHT_MS);

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
  const missing = !!walkthroughRun.missing;
  const waiting = step.advance === "click" && !missing;
  bar.innerHTML = '<div class="wt-bar-inner' + (missing ? ' wt-stuck' : '') + '">'
    + '<div class="wt-bar-copy"><span class="wt-count">Step ' + (walkthroughRun.index + 1) + ' of ' + steps.length + '</span>'
    + '<p>' + escapeHtml(step.say) + '</p>'
    + (waiting ? '<span class="wt-waiting">Waiting for you to tap it</span>' : '')
    + (step.info && !missing ? '<span class="wt-info-note">Reading only \u2014 nothing to change here</span>' : '')
    + (missing ? '<span class="wt-missing">That control is not on this screen right now \u2014 skip past it or step back.</span>' : '') + '</div>'
    + '<div class="wt-bar-actions">'
    + (walkthroughRun.index > 0 ? '<button class="small-btn" data-wt-back>Back</button>' : '')
    + (waiting ? '' : '<button class="small-btn primary" data-wt-next>' + (missing ? 'Skip' : 'Next') + '</button>')
    + '<button class="small-btn wt-exit" data-wt-exit>I\u2019ve got it</button>'
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
