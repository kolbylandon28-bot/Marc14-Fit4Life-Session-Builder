/* ---------- Wave 2: calculations ---------- */
function calculateOneRm() {
  const weight = numberFrom("oneRmWeight", 0);
  const reps = Math.max(1, Math.min(20, Math.round(numberFrom("oneRmReps", 1))));
  const unit = byId("oneRmUnit").value;
  const out = byId("oneRmResult");
  if (weight <= 0) { out.innerHTML = '<div class="result-note">Enter a weight greater than zero.</div>'; return null; }
  const estimate = reps === 1 ? weight : weight * (1 + reps / 30);
  const roundTo = unit === "kg" ? 0.5 : 1;
  const rounded = Math.round(estimate / roundTo) * roundTo;
  const percentages = [95, 90, 85, 80, 75, 70, 65, 60];
  out.innerHTML = '<div class="result-label">Estimated one-rep max</div><div class="result-hero">' + rounded + ' ' + unit + '</div><div class="data-list">'
    + percentages.map((pct) => '<div class="data-row"><span>' + pct + '% training load</span><b>' + (Math.round((rounded * pct / 100) / roundTo) * roundTo) + ' ' + unit + '</b></div>').join("")
    + '</div><p class="result-note">Estimate only. Use the lowest load that matches the intended RPE and preserves technique.</p>';
  return rounded;
}

function syncPlateUnit() {
  const kg = byId("plateUnit").value === "kg";
  byId("plateBar").value = kg ? 20 : 45;
  byId("plateTarget").value = kg ? 100 : 225;
  calculatePlates();
}
function calculatePlates() {
  const target = numberFrom("plateTarget", 0);
  const bar = numberFrom("plateBar", 0);
  const unit = byId("plateUnit").value;
  const plates = unit === "kg" ? [25, 20, 15, 10, 5, 2.5, 1.25] : [45, 35, 25, 10, 5, 2.5];
  const out = byId("plateResult");
  if (target < bar || bar < 0) { out.innerHTML = '<div class="result-note">Target weight must be at least the bar weight.</div>'; return null; }
  let perSide = (target - bar) / 2;
  const original = perSide;
  const load = [];
  plates.forEach((plate) => {
    const count = Math.floor((perSide + 1e-8) / plate);
    if (count > 0) { load.push({ plate, count }); perSide -= count * plate; }
  });
  perSide = Math.max(0, Math.round(perSide * 100) / 100);
  const loaded = target - perSide * 2;
  out.innerHTML = '<div class="result-label">Each side</div><div class="result-hero">' + (load.length ? load.map((x) => x.count + '×' + x.plate).join(' + ') : 'Empty bar') + '</div>'
    + '<div class="data-list"><div class="data-row"><span>Per side</span><b>' + original + ' ' + unit + '</b></div><div class="data-row"><span>Loaded total</span><b>' + loaded + ' ' + unit + '</b></div></div>'
    + (perSide > 0.001 ? '<p class="result-note">Exact target needs a smaller plate. This setup is ' + (perSide * 2) + ' ' + unit + ' light.</p>' : '<p class="result-note">Collars are not included in the total.</p>');
  return { target, loaded, load, remainder: perSide };
}

function buildWarmupRamp() {
  const working = numberFrom("warmWeight", 0);
  const goal = byId("warmGoal").value;
  const unit = byId("warmUnit").value;
  const increment = unit === "kg" ? 2.5 : 5;
  const out = byId("warmResult");
  if (working <= 0) { out.innerHTML = '<div class="result-note">Enter the planned working weight.</div>'; return null; }
  const ramps = goal === "strength"
    ? [[0, "8–10"], [0.4, "5"], [0.55, "4"], [0.7, "3"], [0.82, "1–2"], [0.9, "1"]]
    : goal === "hypertrophy" ? [[0, "8–10"], [0.45, "6"], [0.65, "4"], [0.8, "2"]]
      : [[0, "8–10"], [0.5, "5"], [0.7, "3"]];
  const bar = unit === "kg" ? 20 : 45;
  const sets = ramps.map(([pct, reps], i) => ({
    label: i === 0 ? "Empty bar / very light" : Math.round(pct * 100) + "%",
    weight: i === 0 ? Math.min(bar, working) : Math.max(increment, Math.round((working * pct) / increment) * increment),
    reps,
  })).filter((s, i, arr) => i === 0 || s.weight < working && s.weight !== arr[i - 1].weight);
  out.innerHTML = '<div class="result-label">Ramp to ' + working + ' ' + unit + '</div><div class="data-list">'
    + sets.map((s, i) => '<div class="data-row"><span>Set ' + (i + 1) + ' · ' + s.label + '</span><b>' + s.weight + ' ' + unit + ' × ' + s.reps + '</b></div>').join("")
    + '</div><p class="result-note">These are preparation sets, not working sets. Rest only as needed until the final ramp.</p>';
  return sets;
}

/* ---------- Wave 2: timers ---------- */
function formatClock(seconds) {
  const s = Math.max(0, Math.ceil(seconds));
  return String(Math.floor(s / 60)).padStart(2, "0") + ":" + String(s % 60).padStart(2, "0");
}
function trainerBeep(frequency) {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (AudioCtx) {
      const ctx = new AudioCtx(), osc = ctx.createOscillator(), gain = ctx.createGain();
      osc.frequency.value = frequency || 760; gain.gain.value = 0.06;
      osc.connect(gain); gain.connect(ctx.destination); osc.start(); osc.stop(ctx.currentTime + 0.12);
    }
    if (navigator.vibrate) navigator.vibrate(120);
  } catch (_) {}
}
let trainerWakeLock = null;
async function syncTrainerWakeLock() {
  const active = restTimer.running || intervalTimer.running;
  try {
    if (active && !trainerWakeLock && navigator.wakeLock) trainerWakeLock = await navigator.wakeLock.request("screen");
    if (!active && trainerWakeLock) { await trainerWakeLock.release(); trainerWakeLock = null; }
  } catch (_) { trainerWakeLock = null; }
}
function updateFullscreenButtons() {
  [["restTimerCard", "restFullscreenBtn"], ["intervalTimerCard", "intervalFullscreenBtn"]].forEach(([cardId, btnId]) => {
    const card = byId(cardId), btn = byId(btnId);
    if (!card || !btn) return;
    const active = document.fullscreenElement === card || card.classList.contains("timer-fullscreen");
    btn.textContent = active ? "Exit fullscreen" : "Fullscreen";
  });
}
async function toggleTimerFullscreen(cardId) {
  const card = byId(cardId);
  if (!card) return;
  try {
    if (document.fullscreenElement === card && document.exitFullscreen) await document.exitFullscreen();
    else if (card.requestFullscreen) await card.requestFullscreen();
    else card.classList.toggle("timer-fullscreen");
  } catch (_) { card.classList.toggle("timer-fullscreen"); }
  updateFullscreenButtons();
}
if (document.addEventListener) document.addEventListener("fullscreenchange", updateFullscreenButtons);
const restTimer = { selected: 90, remaining: 90, id: null, running: false, deadline: 0 };
function syncRestTimerClock() {
  if (!restTimer.running || !restTimer.deadline) return;
  restTimer.remaining = Math.max(0,Math.ceil((restTimer.deadline - Date.now()) / 1000));
  if (restTimer.remaining <= 0) {
    clearInterval(restTimer.id);
    restTimer.id = null;
    restTimer.running = false;
    restTimer.deadline = 0;
    trainerBeep(880);
    syncTrainerWakeLock();
  }
}
function restTimerSnapshot() {
  syncRestTimerClock();
  return { selected:restTimer.selected,remaining:restTimer.remaining,running:restTimer.running,deadline:restTimer.deadline || 0 };
}
function saveRestTimerState() {
  if (!activeWorkout) return;
  activeWorkout.restTimer = restTimerSnapshot();
  saveActiveWorkoutState();
}
function scheduleRestTimerTicks() {
  clearInterval(restTimer.id);
  restTimer.id = restTimer.running ? setInterval(() => {
    const wasRunning = restTimer.running;
    syncRestTimerClock();
    paintRestTimer();
    if (wasRunning && !restTimer.running) saveRestTimerState();
  },250) : null;
}
function restoreRestTimerSnapshot(snapshot) {
  clearInterval(restTimer.id);
  const saved = snapshot && typeof snapshot === 'object' ? snapshot : {};
  restTimer.selected = Math.max(1,Number(saved.selected) || 90);
  restTimer.remaining = Math.max(0,Number(saved.remaining) || restTimer.selected);
  restTimer.running = Boolean(saved.running && Number(saved.deadline));
  restTimer.deadline = restTimer.running ? Number(saved.deadline) : 0;
  syncRestTimerClock();
  scheduleRestTimerTicks();
  paintRestTimer();
  syncTrainerWakeLock();
}
function paintRestTimer() {
  syncRestTimerClock();
  const display = byId("restTimerDisplay");
  if (display) {
    display.textContent = formatClock(restTimer.remaining);
    display.classList.toggle("running", restTimer.running);
  }
  const startButton = byId("restStartBtn");
  if (startButton) startButton.textContent = restTimer.running ? "Pause" : (restTimer.remaining < restTimer.selected ? "Resume" : "Start");
  const activeDisplay = byId("activeRestDisplay"), activeToggle = byId("activeRestToggle");
  if (activeDisplay) activeDisplay.textContent = formatClock(restTimer.remaining);
  if (activeToggle) activeToggle.textContent = restTimer.running ? "Pause" : (restTimer.remaining < restTimer.selected ? "Resume" : "Start");
}
function setRestTimer(seconds) {
  clearInterval(restTimer.id); Object.assign(restTimer, { selected: seconds, remaining: seconds, id: null, running: false, deadline: 0 });
  document.querySelectorAll("#view-tools .preset").forEach((b) => b.classList.toggle("on", b.textContent === formatClock(seconds).replace(/^0/, "")));
  paintRestTimer(); syncTrainerWakeLock(); saveRestTimerState();
}
function toggleRestTimer() {
  if (restTimer.running) {
    syncRestTimerClock();
    clearInterval(restTimer.id);
    restTimer.id = null;
    restTimer.running = false;
    restTimer.deadline = 0;
    paintRestTimer();
    syncTrainerWakeLock();
    saveRestTimerState();
    return;
  }
  if (restTimer.remaining <= 0) restTimer.remaining = restTimer.selected;
  restTimer.running = true;
  restTimer.deadline = Date.now() + restTimer.remaining * 1000;
  scheduleRestTimerTicks();
  paintRestTimer();
  syncTrainerWakeLock();
  saveRestTimerState();
}
function resetRestTimer() { setRestTimer(restTimer.selected); }
if (document.addEventListener) document.addEventListener("visibilitychange", () => {
  if (!document.hidden) {
    syncRestTimerClock();
    scheduleRestTimerTicks();
    paintRestTimer();
    saveRestTimerState();
  }
});

const intervalTimer = { id: null, running: false, phase: "work", remaining: 40, round: 1, work: 40, rest: 20, rounds: 8 };
function paintIntervalTimer() {
  const display = byId("intervalDisplay");
  display.textContent = formatClock(intervalTimer.remaining);
  display.classList.toggle("running", intervalTimer.running);
  const done = intervalTimer.round > intervalTimer.rounds;
  byId("intervalStatus").textContent = done ? "Complete" : (intervalTimer.phase === "work" ? "Work" : "Recover") + " · round " + intervalTimer.round + " of " + intervalTimer.rounds;
  byId("intervalStartBtn").textContent = intervalTimer.running ? "Pause" : (done ? "Restart" : "Start");
}
function resetIntervalTimer() {
  clearInterval(intervalTimer.id);
  Object.assign(intervalTimer, {
    id: null, running: false, phase: "work", round: 1,
    work: Math.max(5, Math.round(numberFrom("intervalWork", 40))),
    rest: Math.max(0, Math.round(numberFrom("intervalRest", 20))),
    rounds: Math.max(1, Math.round(numberFrom("intervalRounds", 8))),
  });
  intervalTimer.remaining = intervalTimer.work;
  paintIntervalTimer(); syncTrainerWakeLock();
}
function toggleIntervalTimer() {
  if (intervalTimer.running) { clearInterval(intervalTimer.id); intervalTimer.running = false; paintIntervalTimer(); syncTrainerWakeLock(); return; }
  if (intervalTimer.round > intervalTimer.rounds) resetIntervalTimer();
  intervalTimer.running = true; paintIntervalTimer(); syncTrainerWakeLock();
  intervalTimer.id = setInterval(() => {
    intervalTimer.remaining--;
    if (intervalTimer.remaining <= 0) {
      trainerBeep(intervalTimer.phase === "work" ? 620 : 880);
      if (intervalTimer.phase === "work" && intervalTimer.rest > 0) { intervalTimer.phase = "rest"; intervalTimer.remaining = intervalTimer.rest; }
      else {
        intervalTimer.phase = "work"; intervalTimer.round++;
        if (intervalTimer.round > intervalTimer.rounds) { clearInterval(intervalTimer.id); intervalTimer.running = false; intervalTimer.remaining = 0; trainerBeep(1040); syncTrainerWakeLock(); }
        else intervalTimer.remaining = intervalTimer.work;
      }
    }
    paintIntervalTimer();
  }, 1000);
}

