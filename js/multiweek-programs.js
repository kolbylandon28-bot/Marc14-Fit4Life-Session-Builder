/* ---------- Wave 3: multi-week programs ---------- */
let currentProgram = null;
let focusedProgramWeekIndex = 0;
let focusedProgramDayIndex = 0;
let loadedProgramTemplate = null;
let programCardioModes = ["any"];
const programFilters = { injuries: [], zones: [] };
const TRAINING_WEEKDAYS = [[1,"Monday"],[2,"Tuesday"],[3,"Wednesday"],[4,"Thursday"],[5,"Friday"],[6,"Saturday"]];
function inferredTrainingDays(profile,count) {
  const wanted = Math.max(1,Math.min(6,Number(count || profile && profile.availableDays) || 3));
  const saved = [...new Set((profile && profile.trainingDays || []).map(Number).filter((day) => day >= 1 && day <= 6))].sort((a,b) => a - b);
  if (saved.length) return saved.slice(0,wanted);
  const patterns = {1:[1],2:[1,4],3:[1,3,5],4:[1,2,4,5],5:[1,2,3,4,5],6:[1,2,3,4,5,6]};
  return patterns[wanted] || patterns[3];
}
function renderProgramCardioChoices() {
  const out = byId("programCardioChips"); if (!out) return;
  out.innerHTML = multiChoiceButtonsHtml(cardioChoiceEntries(),programCardioModes,"toggleProgramCardioChoice");
}
function renderProgramSafetyChoices() {
  const out = byId("programInjuryChips"); if (!out) return;
  const chip = (key) => '<button type="button" class="chip' + (programFilters.injuries.includes(key) ? ' on' : '') + '" onclick="toggleProgramFilter(\'injuries\',\'' + key + '\',this)">' + escapeHtml(INJURY_LABELS[key] || key) + '</button>';
  const group = (title,keys) => '<div class="safety-choice-group"><b>' + title + '</b><div class="safety-choice-row">' + keys.map(chip).join('') + '</div></div>';
  const noneOn = programFilters.injuries.length ? "" : " on";
  out.innerHTML = '<button type="button" class="chip none-chip' + noneOn + '" onclick="clearProgramLimitations()">No limitations</button>'
    + group("Where is the limitation?",COMMON_BODY_LIMITATIONS)
    + group("Special considerations",COMMON_SPECIAL_LIMITATIONS);
}
function clearProgramLimitations() {
  programFilters.injuries = [];
  renderProgramSafetyChoices();
}
function toggleProgramCardioChoice(value) {
  programCardioModes = normalizeCardioPreferences(toggleMultiChoiceValue(programCardioModes,value,true));
  renderProgramCardioChoices();
  renderProgramBaselineGate();
}
function toggleProgramFilter(kind, value, button) {
  const list = programFilters[kind]; const index = list.indexOf(value);
  if (index >= 0) list.splice(index, 1); else list.push(value);
  if (button) button.classList.toggle("on", list.includes(value));
}
function paintProgramFilters() {
  document.querySelectorAll("#programInjuryChips .chip").forEach((b) => {
    if (b.classList.contains("none-chip")) { b.classList.toggle("on", programFilters.injuries.length === 0); return; }
    const match = (b.getAttribute("onclick") || "").match(/'([^']+)'\s*,this/);
    if (match) b.classList.toggle("on", programFilters.injuries.includes(match[1]));
  });
  document.querySelectorAll("#programZoneChips .chip").forEach((b) => b.classList.toggle("on", programFilters.zones.includes(b.getAttribute("onclick").match(/'([^']+)'\s*,this/)[1])));
}
function renderProgramProfileLookup() {
  const input = byId("programProfileLookup"), results = byId("programProfileLookupResults"); if (!input || !results) return [];
  const query = input.value.trim(); byId("programProfile").value = ""; results.innerHTML = "";
  if (query.length < 2) return [];
  const matches = findProfilesByLookup(query);
  if (!matches.length) { results.innerHTML = '<div class="lookup-note">No matching profile. Use the New Session lookup to send a trainer request or have an unlocked trainer create the client.</div>'; return []; }
  matches.forEach((profile) => { const button = document.createElement("button"), name = document.createElement("strong"), username = document.createElement("span"); button.type = "button"; button.className = "profile-result"; name.textContent = profile.name; username.textContent = "@" + profileUsername(profile); button.append(name, username); button.addEventListener("click", () => selectProgramProfile(profile.id)); results.appendChild(button); });
  return matches;
}
function selectProgramProfile(profileId) {
  const profile = loadProfiles().find((item) => item.id === profileId); if (!profile) return null;
  byId("programProfile").value = profile.id; byId("programProfileLookup").value = profile.name + " · @" + profileUsername(profile); byId("programProfileLookupResults").innerHTML = "";
  loadProgramProfile(); renderProgramBaselineGate(); return profile;
}
function syncProgramMode(preserveDays) {
  const mode = byId("programMode") && byId("programMode").value || "starter", weeks = byId("programWeeks"), days = byId("programDays"), note = byId("programModeNote");
  if (!weeks) return mode;
  if (mode === "starter") {
    weeks.value = "3"; weeks.disabled = true;
    if (!preserveDays && days) days.value = "2";
    if (note) note.innerHTML = "<b>Starter rhythm · recommended for new clients</b>Two recognizable workouts repeat for three weeks. Week 1 learns the plan, Week 2 repeats it with a small progression, and Week 3 builds confidence without swapping the exercise menu. A client review follows Week 1.";
  } else {
    weeks.disabled = false; if (weeks.value === "3") weeks.value = "8";
    if (note) note.innerHTML = "<b>Ongoing progressive program</b>Primary compounds remain consistent through four-week phases, accessories can rotate every two weeks, and every fourth week includes a formal coach review and fatigue reduction.";
  }
  return mode;
}
function loadProgramProfile() {
  const profile = loadProfiles().find((p) => p.id === byId("programProfile").value);
  if (!profile) return;
  const existingProgram = savedProgramFor(profile), mode = existingProgram && existingProgram.setup && existingProgram.setup.programMode || (Number(profile.experience) === 1 ? "starter" : "progressive");
  byId("programClient").value = profile.name; byId("programGoal").value = profile.goals[0] || "general";
  byId("programSecondaryGoal").value = profile.goals[1] || ""; byId("programExp").value = profile.experience;
  byId("programStyle").value = profile.trainingStyle || "auto"; programCardioModes = normalizeCardioPreferences(profile.cardioModes || profile.cardioMode); renderProgramCardioChoices();
  byId("programAge").value = profile.age; byId("programMinutes").value = profile.minutes || 60;
  byId("programMode").value = mode; byId("programDays").value = String(existingProgram && existingProgram.setup && existingProgram.setup.days || (mode === "starter" ? 2 : profile.availableDays || 3));
  if (mode === "progressive") byId("programWeeks").value = String(existingProgram && existingProgram.setup && existingProgram.setup.weeks || 8);
  syncProgramMode(true);
  programFilters.injuries = [...(profile.injuries || [])]; programFilters.zones = [...(profile.zones || [])];
  paintProgramFilters();
  const safety = document.querySelector(".program-safety-section");
  if (safety) safety.open = Boolean(programFilters.injuries.length || programFilters.zones.length);
  renderProgramBaselineGate();
  showToast("Loaded " + profile.name + " into the program builder");
}
function programSplit(days) {
  const splits = {
    1: [{ name: "Full body", muscles: [] }],
    2: [{ name: "Full body A", muscles: [] }, { name: "Full body B", muscles: [] }],
    3: [{ name: "Push", muscles: ["chest", "shoulders", "arms"] }, { name: "Pull", muscles: ["back", "arms"] }, { name: "Legs", muscles: ["quads", "glutes", "hamstrings", "calves"] }],
    4: [{ name: "Upper push", muscles: ["chest", "shoulders", "arms"] }, { name: "Lower · squat", muscles: ["quads", "glutes"] }, { name: "Upper pull", muscles: ["back", "arms"] }, { name: "Lower · hinge", muscles: ["hamstrings", "glutes"] }],
    5: [{ name: "Push", muscles: ["chest", "shoulders", "arms"] }, { name: "Pull", muscles: ["back", "arms"] }, { name: "Legs", muscles: ["quads", "glutes", "hamstrings", "calves"] }, { name: "Upper", muscles: ["chest", "back", "shoulders"] }, { name: "Posterior", muscles: ["hamstrings", "glutes", "back"] }],
  };
  return splits[days] || splits[3];
}
function focusProgramSplit(split, focus) {
  const copy = split.map((d) => ({ name: d.name, muscles: [...d.muscles] }));
  if (!focus) return copy;
  let index = copy.findIndex((d) => d.muscles.includes(focus));
  if (index < 0) {
    const lower = ["quads", "hamstrings", "glutes", "calves"].includes(focus);
    index = copy.findIndex((d) => d.muscles.some((m) => lower === ["quads", "hamstrings", "glutes", "calves"].includes(m)));
  }
  if (index < 0) index = 0;
  if (!copy[index].muscles.includes(focus)) copy[index].muscles.push(focus);
  copy[index].name += " · " + MUSCLE_LABELS[focus] + " emphasis";
  return copy;
}
function routeProgramSplit(setup) {
  const route = resolvedTrainingRoute(setup);
  if (route === "cardio") {
    const cardioDays = {
      1:[{name:"Aerobic base + movement",optionIndex:0}],
      2:[{name:"Aerobic base",optionIndex:0},{name:"Intervals",optionIndex:2}],
      3:[{name:"Aerobic base",optionIndex:0},{name:"Tempo",optionIndex:1},{name:"Intervals",optionIndex:2}],
      4:[{name:"Aerobic base",optionIndex:0},{name:"Intervals",optionIndex:2},{name:"Easy aerobic",optionIndex:0},{name:"Tempo",optionIndex:1}],
      5:[{name:"Aerobic base",optionIndex:0},{name:"Intervals",optionIndex:2},{name:"Easy aerobic",optionIndex:0},{name:"Tempo",optionIndex:1},{name:"Long aerobic",optionIndex:0}],
    };
    return (cardioDays[setup.days] || cardioDays[3]).map((day) => ({ ...day, muscles:[] }));
  }
  if (["recovery","mobility"].includes(route)) {
    const names = ["Easy aerobic reset","Mobility reset","Light movement practice","Mobility & trunk","Easy recovery"];
    return Array.from({length:setup.days},(_,index) => ({ name:names[index] || "Recovery", muscles:[], optionIndex:index % 3 }));
  }
  return focusProgramSplit(programSplit(setup.days),setup.focus);
}
function programPhase(week) {
  const cycle = Math.floor((week - 1) / 4) + 1;
  const slot = (week - 1) % 4;
  if (slot === 0) return { name: cycle === 1 ? "Foundation" : "Rebuild", setDelta: -1, rpe: "RPE 6–7", directive: "Own technique and establish repeatable loads. Finish every set with 3–4 reps in reserve." };
  if (slot === 1) return { name: "Build", setDelta: 0, rpe: "RPE 7–8", directive: "Use the same movements and add 2.5–5% when every rep is clean." };
  if (slot === 2) return { name: "Overload", setDelta: 1, rpe: "RPE 8–9", directive: "Peak the cycle: add one working set where shown, but stop before technique breaks." };
  return { name: "Deload", reviewTitle:"Formal Review + Deload", setDelta: -2, rpe: "RPE 5–6", directive: "Reduce load 10–15%, review the full four-week block with the coach, and decide whether to continue, deload again, change emphasis, or rebuild.", deload: true, reviewRequired:true };
}
function starterProgramPhase(week) {
  if (week === 1) return {
    name:"Learn the rhythm",
    setDelta:-1,
    rpe:"RPE 6–7 · 3–4 reps left",
    directive:"Learn the exercise order, establish comfortable starting loads, and finish every set knowing you could repeat the movement cleanly.",
    reviewRequired:true,
    reviewType:"starter_week_1",
    reviewTitle:"Week 1 client review",
    reviewPrompt:"Ask about workout difficulty, exercise clarity, session length, soreness, pain, confidence, and schedule fit before Week 2.",
  };
  if (week === 2) return {
    name:"Repeat with confidence",
    setDelta:0,
    rpe:"RPE 7 · about 3 reps left",
    directive:"Repeat the same workouts. Add only the smallest load or one clean rep when Week 1 felt controlled—never change both at once.",
  };
  return {
    name:"Own the routine",
    setDelta:0,
    rpe:"RPE 7–8 · 2–3 reps left",
    directive:"Keep the same exercise menu and show more control, smoother setup, and consistent effort. This is practice with progression, not a max-out week.",
    reviewRequired:true,
    reviewType:"starter_completion",
    reviewTitle:"Starter program transition",
    reviewPrompt:"Review adherence, confidence, pain, preferred exercises, and goal fit before moving into the next coach-approved phase.",
  };
}
function adjustSetCount(value, delta) {
  const n = parseInt(value, 10);
  return Number.isFinite(n) ? String(Math.max(1, n + delta)) : value;
}
function progressSession(base, phase) {
  const session = JSON.parse(JSON.stringify(base));
  const route = resolvedTrainingRoute(session.spec || {}), cardioArchitecture = session.optionArchitecture && session.optionArchitecture.id;
  session.blocks = session.blocks.filter((b) => !phase.deload || !["finisher", "plyo", "power"].includes(b.key));
  session.blocks.forEach((block) => {
    const routeManagedCardio = block.key === "conditioning" && ["cardio","mixed","recovery"].includes(route);
    const adjustable = !["warmup", "mobility", "primer"].includes(block.key) && !routeManagedCardio;
    if (adjustable) block.rx.sets = adjustSetCount(block.rx.sets, phase.setDelta);
    if (route === "cardio" && block.key === "conditioning") {
      if (cardioArchitecture === "aerobic") {
        block.rx.sets = "1";
        const duration = parseInt(block.rx.reps,10);
        if (Number.isFinite(duration)) block.rx.reps = Math.max(10,Math.round(duration * (phase.deload ? .7 : phase.setDelta > 0 ? 1.12 : 1))) + " min continuous";
      } else block.rx.sets = adjustSetCount(block.rx.sets,phase.setDelta);
      block.rx.rpe = phase.deload ? "RPE 3–5 · intentionally easy" : cardioArchitecture === "intervals" ? "RPE 8–9 · preserve output" : cardioArchitecture === "tempo" ? "RPE 7–8 · controlled hard" : "RPE 4–6 · conversational";
    } else if (!routeManagedCardio) block.rx.rpe = phase.rpe;
    if (phase.deload && block.items.length > 2) block.items = block.items.slice(0, Math.max(2, block.items.length - 1));
    block.items.forEach((ex) => { ex.rx = { ...block.rx }; });
    block.groups = block.items.map((ex) => ({ type: "straight", items: [ex] }));
  });
  session.prescription.sets = adjustSetCount(session.prescription.sets, phase.setDelta);
  session.prescription.rpe = phase.rpe;
  return session;
}
function rotateProgramAccessories(session,week,seed) {
  const rotationRound = Math.floor((week - 1) / PROGRAMMING_POLICY.accessoryRotationWeeks); if (rotationRound < 1) return session;
  const rotatable = new Set(["accessory","iso","circuit","core","finisher"]), used = new Set(session.blocks.flatMap((block) => block.items.map((exercise) => exercise.name)));
  session.blocks.forEach((block,bi) => {
    if (!rotatable.has(block.key)) return;
    block.items.forEach((exercise,ei) => {
      const pool = eligible(session.spec,session.spec.age).filter((candidate) => candidate.name !== exercise.name && !used.has(candidate.name) && candidate.pattern === exercise.pattern && (block.key === "finisher" ? candidate.finisher === true : candidate.finisher !== true));
      if (!pool.length) return;
      const ranked = biasSort(pool,session.spec.muscles || [],makeRng(seed + rotationRound * 1009 + bi * 97 + ei * 17),session.spec.experience,emphasisOf(block.items)), chosen = ranked[0];
      used.delete(exercise.name); used.add(chosen.name); replaceExercise(block,ei,chosen);
    });
  });
  enrichSessionMetadata(session); session.accessoryRotation = { cadenceWeeks:PROGRAMMING_POLICY.accessoryRotationWeeks, round:rotationRound, note:"Accessories rotated while primary compound benchmarks remained stable." }; return session;
}
function programPhaseForSetup(setup, week) {
  const phase = setup.programMode === "starter" ? starterProgramPhase(week) : programPhase(week), route = resolvedTrainingRoute(setup);
  const starter = setup.programMode === "starter";
  if (route === "cardio") {
    const directives = { Foundation:"Establish a repeatable pace and finish with room to continue.", Rebuild:"Re-establish smooth pacing before adding work again.", Build:"Add a small amount of time or one repeat only when the previous pace stayed even.", Overload:"Use the longest planned aerobic duration or one extra quality repeat—never both at once.", Deload:"Reduce cardio duration about 25–30% and keep the entire session conversational." };
    phase.directive = starter ? phase.directive + " Keep the cardio machine and session format familiar so pacing—not novelty—is the skill being practiced." : directives[phase.name] || phase.directive;
  } else if (["recovery","mobility"].includes(route)) {
    const recoveryDirective = phase.deload ? "Keep the week restorative: easy breathing, comfortable range, and no fatigue target." : "Progress control and comfortable range before adding duration or load.";
    phase.directive = starter ? phase.directive + " " + recoveryDirective : recoveryDirective;
  }
  return phase;
}
function calibrationProtocolFor(domain,exercise) {
  const bodyweight = exercise && exercise.zone === "bodyweight", cardio = domain === "conditioning";
  if (domain === "strength") return {sets:"3",reps:"5–8",rest:"90–120 sec",tempo:"Controlled",rpe:"RPE 6–7 · 3–4 reps left",instruction:"Use a familiar, pain-free load. This is not a max test."};
  if (domain === "volume") return {sets:"2",reps:"8–12",rest:"60–90 sec",tempo:"Controlled",rpe:"RPE 6–7 · stop before form changes",instruction:"Record a repeatable working load and how the second set feels."};
  if (cardio) return {sets:"1",reps:"8–12 min",rest:"As needed",tempo:"Even pace",rpe:"RPE 5–6 · able to speak in short sentences",instruction:"Use a familiar available machine and record the pace, level, distance, or minutes in the note."};
  if (domain === "power") return {sets:"3",reps:"3–5 crisp reps",rest:"75–120 sec",tempo:"Fast with control",rpe:"Stop before speed drops",instruction:"Use low fatigue. Quality and landing/control matter more than output."};
  if (domain === "recovery") return {sets:"2",reps:"6–8 each side or 30 sec",rest:"30–45 sec",tempo:"Slow and comfortable",rpe:"Easy",instruction:"Record comfortable range and confidence; no stretching through pain."};
  return {sets:"2",reps:bodyweight ? "6–10 controlled reps" : "6–8",rest:"60 sec",tempo:"Controlled",rpe:"RPE 5–6",instruction:"Use the largest pain-free range you can control confidently."};
}
function baselineCandidateForDomain(session,domain) {
  const blocks = session && session.blocks || [], ordered = {
    movement:["strength","secondary","accessory","core","primer","mobility"],
    strength:["strength","secondary"],
    volume:["accessory","secondary","strength","iso"],
    conditioning:["conditioning"],
    power:["power","plyo","strength"],
    recovery:["mobility","primer","core"],
  }[domain] || [];
  for (const key of ordered) {
    const block = blocks.find((item) => item.key === key && item.items && item.items.length); if (!block) continue;
    const exercise = block.items.find((item) => domain !== "movement" || ["squat","hinge","lunge","h_push","v_push","h_pull","v_pull","carry","core","mobility"].includes(item.pattern)); if (exercise) return {block,exercise};
  }
  return null;
}
function baselineLibraryCandidate(spec,domain,used) {
  const pool = eligibleFor(spec).filter((exercise) => !used.has(exercise.name) && exercise.finisher !== true);
  const test = {
    movement:(exercise) => ["squat","hinge","lunge","h_push","v_push","h_pull","v_pull","carry","core","mobility"].includes(exercise.pattern) && Number(exercise.exp || 1) <= Math.min(2,Number(spec.experience || 1)),
    strength:(exercise) => isPrimaryAnchor(exercise),
    volume:(exercise) => ["squat","hinge","lunge","h_push","v_push","h_pull","v_pull"].includes(exercise.pattern),
    conditioning:(exercise) => exercise.pattern === "conditioning" || exercise.region === "cardio",
    power:(exercise) => ["plyo","olympic"].includes(exercise.pattern),
    recovery:(exercise) => exercise.pattern === "mobility" || exercise.region === "mobility",
  }[domain];
  return pool.find(test || (() => true)) || null;
}
function attachCalibrationDomain(session,domain,planId,sessionNumber) {
  const used = new Set((session.blocks || []).flatMap((block) => (block.items || []).map((exercise) => exercise.name))), existing = baselineCandidateForDomain(session,domain); let block = existing && existing.block, exercise = existing && existing.exercise;
  if (!exercise) {
    const candidate = baselineLibraryCandidate(session.spec,domain,used); if (!candidate) return false;
    const key = domain === "conditioning" ? "conditioning" : domain === "power" ? "power" : domain === "recovery" ? "mobility" : domain === "strength" ? "strength" : "accessory";
    block = (session.blocks || []).find((item) => item.key === key);
    if (!block) { const rx = calibrationProtocolFor(domain,candidate); block = {key,title:(BASELINE_DOMAIN_LABELS[domain] || domain) + " calibration",items:[],groups:[],rx:{...rx}}; session.blocks.push(block); }
    exercise = JSON.parse(JSON.stringify(candidate)); block.items.push(exercise); block.groups = (block.items || []).map((item) => ({type:"straight",items:[item]}));
  }
  const domains = Array.isArray(exercise.baselineDomains) ? exercise.baselineDomains : [];
  if (!domains.includes(domain)) domains.push(domain);
  const protocol = calibrationProtocolFor(domain,exercise); exercise.baselineDomains = domains; exercise.baselinePlanId = planId; exercise.baselineSessionNumber = sessionNumber; exercise.baselineRequired = true; exercise.baselineProtocol = protocol.instruction; exercise.rx = {...(exercise.rx || block.rx || {}),sets:protocol.sets,reps:protocol.reps,rest:protocol.rest,tempo:protocol.tempo,rpe:protocol.rpe};
  return true;
}
function calibrationDomainSchedule(required,sessionCount) {
  if (sessionCount <= 1) return [required];
  const first = required.filter((domain) => ["movement","strength","power"].includes(domain)), second = required.filter((domain) => !first.includes(domain));
  if (!first.length && second.length) first.push(second.shift());
  if (!second.length && first.length > 1) second.push(first.pop());
  return [first,second].filter((domains) => domains.length);
}
function programSetupSnapshot(selectedProfile) {
  const cardioModes = normalizeCardioPreferences(programCardioModes), programMode = syncProgramMode(true);
  const setup = {client:byId("programClient").value.trim() || selectedProfile && selectedProfile.name || "Client",goal:byId("programGoal").value,secondaryGoal:byId("programSecondaryGoal").value,experience:Number(byId("programExp").value),age:Math.max(18,Math.min(90,Math.round(numberFrom("programAge",30)))),days:Number(byId("programDays").value),weeks:programMode === "starter" ? 3 : Number(byId("programWeeks").value),programMode,starter:programMode === "starter",minutes:Number(byId("programMinutes").value),focus:byId("programFocus").value,trainingStyle:byId("programStyle").value || "auto",cardioMode:cardioModes[0],cardioModes,injuries:[...programFilters.injuries],zones:[...programFilters.zones],profileId:selectedProfile && selectedProfile.id || "",trainingPhase:selectedProfile && selectedProfile.trainingPhase || "general",phaseStartedAt:selectedProfile && selectedProfile.phaseStartedAt || "",availableDays:selectedProfile && selectedProfile.availableDays || Number(byId("programDays").value),sport:selectedProfile && selectedProfile.sport || "",sportSchedule:selectedProfile && selectedProfile.sportSchedule || "",competitionDate:selectedProfile && selectedProfile.competitionDate || "",exercisePreferences:{...(selectedProfile && selectedProfile.exercisePreferences || {})},phaseCompoundAnchors:{...(selectedProfile && selectedProfile.phaseCompoundAnchors || {})},readinessTrend:readinessTrendContext(selectedProfile),baselineContext:selectedProfile ? baselineGeneratorContext(selectedProfile) : null,templateId:loadedProgramTemplate && loadedProgramTemplate.id || "",templateTitle:loadedProgramTemplate && loadedProgramTemplate.title || ""};
  setup.goals = [setup.goal,setup.secondaryGoal].filter((goal,index,list) => goal && list.indexOf(goal) === index).slice(0,2); return setup;
}
function generateCalibrationProgram() {
  if (!requireTrainerMutation("build client calibration workouts")) return null;
  const profiles = loadProfiles(), profileIndex = profiles.findIndex((profile) => profile.id === byId("programProfile").value), profile = profiles[profileIndex]; if (!profile) { showToast("Select a saved client profile first"); return null; }
  const intakeStatus = intakeCompletion(profile); if (intakeStatus.approvalBlocked) { showToast("Onboarding is incomplete · use Complete onboarding, finish the missing sections, and record the trainer readiness decision"); return null; }
  const setup = programSetupSnapshot(profile), required = baselineRequiredDomains({...profile,goals:setup.goals}), weeklyDays = Math.max(1,Math.min(5,Number(setup.days || profile.availableDays || 1))), anchorSessionCount = Math.min(2,weeklyDays), schedule = calibrationDomainSchedule(required,anchorSessionCount), split = routeProgramSplit({...setup,days:weeklyDays}), planId = "baseline-" + profile.id + "-" + Date.now(), seed = Math.floor(Date.now() / 1000) % 100000;
  const calibrationPhase = {setDelta:-1,rpe:"RPE 6–7 · leave 3–4 reps",deload:false};
  const days = split.map((day,index) => {
    const domains = schedule[index] || [], supportSession = domains.length === 0;
    const sessionSpec = {...setup,client:profile.name,profileId:profile.id,goals:setup.goals,muscles:day.muscles || [],optionIndex:Number.isFinite(Number(day.optionIndex)) ? Number(day.optionIndex) : index % 3,baselineContext:null,baselineMode:true};
    let session = buildBlendedSession(sessionSpec,seed + index * 97); session = progressSession(session,calibrationPhase); domains.forEach((domain) => attachCalibrationDomain(session,domain,planId,index + 1));
    session.calibration = {planId,sessionNumber:supportSession ? null : index + 1,totalSessions:schedule.length,weeklySession:index + 1,weeklySessions:weeklyDays,domains:[...domains],requiredDomains:[...required],goalSpecific:true,supportSession}; session.spec.baselineMode = true;
    session.goalLabel = supportSession ? "Foundation practice · " + setup.goals.map((goal) => GOALS[goal].label).join(" + ") : "Calibration " + (schedule.length > 1 ? String.fromCharCode(65 + index) + " · " : "· ") + setup.goals.map((goal) => GOALS[goal].label).join(" + ");
    session.purpose = supportSession ? "A conservative first-week workout that builds familiarity without adding another required baseline test." : "A useful training session with " + domains.length + " low-fatigue calibration anchor" + (domains.length === 1 ? "" : "s") + ".";
    session.rationale = (supportSession ? "This session fills the client’s selected weekly schedule while keeping first-week effort conservative. It does not add unnecessary testing. " : "Calibration is embedded in normal training. Only the marked anchors collect baseline evidence; the remaining movements build skill, fitness, and confidence. ") + session.rationale; finalizeGeneratedSession(session);
    return {name:supportSession ? (day.name || "Foundation practice " + (index + 1)) : schedule.length > 1 ? "Calibration " + String.fromCharCode(65 + index) + " · " + (day.name || "Training") : "Goal-specific calibration · " + (day.name || "Training"),session};
  });
  const phase = {name:"Establish starting points",setDelta:-1,rpe:"Submaximal · leave 3–4 reps",directive:"Complete the full first-week schedule at conservative effort. Only the clearly marked anchors collect baseline evidence; the other days build familiarity without extra testing.",reviewRequired:true,reviewTitle:"Coach baseline verification",reviewPrompt:"After the marked anchors are logged, review the required domains, pain response, confidence, effort, and equipment fit before generating the tailored phase."};
  setup.days = weeklyDays; setup.weeks = 1; setup.programMode = "calibration"; setup.starter = false; setup.baselineRequiredDomains = required; setup.baselinePlanId = planId; setup.calibrationAnchorSessions = schedule.length;
  currentProgram = {setup,weeks:[{number:1,phase,reviewRequired:true,reviewType:"baseline_verification",days}],calibration:true,baselinePlanId:planId,createdAt:new Date().toISOString(),lifecycle:"draft",versionNumber:1,versions:[],approval:{status:"draft",required:true}};
  profile.baseline = {...(profile.baseline || {}),version:BASELINE_VERSION,status:"planned",planId,goals:setup.goals,requiredDomains:required,plannedSessions:schedule.length,plannedWeekDays:weeklyDays,plannedAt:new Date().toISOString()}; profile.updatedAt = new Date().toISOString(); writeProfiles(profiles);
  renderProgram(); renderProgramBaselineGate(); byId("programPrintBtn").disabled = false; byId("programApproveBtn").disabled = false; byId("programSaveBtn").disabled = true; byId("programSaveOnlyBtn").disabled = true; showToast(weeklyDays + " first-week workout" + (weeklyDays === 1 ? "" : "s") + " built · " + schedule.length + " contain calibration anchors"); return currentProgram;
}
function generateProgram() {
  const selectedProfile = loadProfiles().find((profile) => profile.id === byId("programProfile").value);
  if (!selectedProfile) { showToast("Select a saved client profile before building a tailored program"); return null; }
  if (!baselineCanTailor(selectedProfile)) { showToast("Tailored programming is locked until " + selectedProfile.name + " completes calibration and a trainer verifies the baseline"); renderProgramBaselineGate(); return null; }
  const cardioModes = normalizeCardioPreferences(programCardioModes);
  const programMode = syncProgramMode(true);
  const setup = {
    client: byId("programClient").value.trim() || "Client",
    goal: byId("programGoal").value,
    secondaryGoal: byId("programSecondaryGoal").value,
    experience: Number(byId("programExp").value),
    age: Math.max(18, Math.min(90, Math.round(numberFrom("programAge", 30)))),
    days: Number(byId("programDays").value),
    weeks: programMode === "starter" ? 3 : Number(byId("programWeeks").value),
    programMode,
    starter:programMode === "starter",
    minutes: Number(byId("programMinutes").value),
    focus: byId("programFocus").value,
    trainingStyle: byId("programStyle").value || "auto", cardioMode: cardioModes[0], cardioModes,
    injuries: [...programFilters.injuries], zones: [...programFilters.zones],
    profileId:selectedProfile && selectedProfile.id || "", trainingPhase:selectedProfile && selectedProfile.trainingPhase || "general", phaseStartedAt:selectedProfile && selectedProfile.phaseStartedAt || "", availableDays:selectedProfile && selectedProfile.availableDays || Number(byId("programDays").value), sport:selectedProfile && selectedProfile.sport || "", sportSchedule:selectedProfile && selectedProfile.sportSchedule || "", competitionDate:selectedProfile && selectedProfile.competitionDate || "", exercisePreferences:{ ...(selectedProfile && selectedProfile.exercisePreferences || {}) }, phaseCompoundAnchors:{ ...(selectedProfile && selectedProfile.phaseCompoundAnchors || {}) }, readinessTrend:readinessTrendContext(selectedProfile),
    baselineContext:baselineGeneratorContext(selectedProfile), templateId:loadedProgramTemplate && loadedProgramTemplate.id || "", templateTitle:loadedProgramTemplate && loadedProgramTemplate.title || "",
  };
  setup.goals = [setup.goal, setup.secondaryGoal].filter((g, i, arr) => g && arr.indexOf(g) === i).slice(0, 2);
  const templateSplit = loadedProgramTemplate && Array.isArray(loadedProgramTemplate.sessions) && loadedProgramTemplate.sessions.length === setup.days
    ? loadedProgramTemplate.sessions.map((session,index) => ({ name:String(session.name || "Day " + (index + 1)).replace(/^Day\s+\d+\s*[·:–-]\s*/i,""),muscles:Array.isArray(session.muscles) ? [...session.muscles] : [],optionIndex:Number.isFinite(Number(session.optionIndex)) ? Number(session.optionIndex) : index % 3 }))
    : null;
  const split = templateSplit || routeProgramSplit(setup);
  const seed = Math.floor(Date.now() / 1000) % 100000;
  const bases = split.map((day, i) => ({
    name: day.name,
    session: buildBlendedSession({ client: setup.client, profileId:setup.profileId, goal: setup.goal, goals: setup.goals, trainingStyle:setup.trainingStyle, cardioMode:setup.cardioMode, cardioModes:setup.cardioModes, optionIndex:day.optionIndex, experience: setup.experience, age: setup.age, minutes: setup.minutes, muscles: day.muscles, injuries: setup.injuries, zones: setup.zones, trainingPhase:setup.trainingPhase, phaseStartedAt:setup.phaseStartedAt, availableDays:setup.availableDays, sport:setup.sport, sportSchedule:setup.sportSchedule, competitionDate:setup.competitionDate, exercisePreferences:setup.exercisePreferences, phaseCompoundAnchors:setup.phaseCompoundAnchors, readinessTrend:setup.readinessTrend, baselineContext:setup.baselineContext }, seed + i * 37),
  }));
  const weeks = Array.from({ length: setup.weeks }, (_, i) => {
    const number = i + 1, phase = programPhaseForSetup(setup,number);
    return { number, phase, reviewRequired:!!phase.reviewRequired, reviewType:phase.reviewType || "", days: bases.map((day,di) => { const progressed = progressSession(day.session,phase); if (number === 1) applyReadinessTrendToSession(progressed); applyCompoundAnchorContinuity(progressed); if (!setup.starter) rotateProgramAccessories(progressed,number,seed + di * 37); finalizeGeneratedSession(progressed); return { name:day.name,session:progressed }; }) };
  });
  currentProgram = { setup, weeks, starter:setup.starter, starterReviewWeek:setup.starter ? 1 : null, createdAt: new Date().toISOString(), lifecycle:"draft", versionNumber:1, versions:[], approval:{ status:"draft", required:true } };
  renderProgram();
  byId("programPrintBtn").disabled = false;
  byId("programApproveBtn").disabled = false; byId("programSaveBtn").disabled = true; byId("programSaveOnlyBtn").disabled = true;
  return currentProgram;
}
function programBlockExercisesHtml(block,weekIndex,dayIndex,blockIndex) {
  const groups = block.groups && block.groups.length ? block.groups : (block.items || []).map((exercise) => ({type:"straight",items:[exercise]}));
  return groups.map((group) => {
    const rows = (group.items || []).map((exercise,index) => {
      const exerciseIndex = block.items.indexOf(exercise);
      const calibration = Array.isArray(exercise.baselineDomains) && exercise.baselineDomains.length ? '<small class="baseline-domain-label">Calibration · ' + escapeHtml(exercise.baselineDomains.map((domain) => BASELINE_DOMAIN_LABELS[domain] || domain).join(' + ')) + '</small>' : '';
      const rx = exercise.rx || block.rx || {}, rest = rx.rest ? '<span class="program-ex-rest">Rest ' + escapeHtml(rx.rest) + '</span>' : '';
      return '<div class="program-ex"><div class="program-ex-copy"><strong>' + (group.type === "superset" ? '<b style="color:var(--blue-bright)">A' + (index + 1) + '</b> · ' : '') + escapeHtml(exercise.name) + '</strong>' + calibration + '</div><div class="program-ex-rx"><b>' + escapeHtml(rx.sets || '—') + ' × ' + escapeHtml(rx.reps || 'Coach set') + '</b>' + rest + '<span class="program-ex-actions"><button class="tiny-btn" type="button" onclick="openProgramPrescriptionEditor(' + weekIndex + ',' + dayIndex + ',' + blockIndex + ',' + exerciseIndex + ')">Edit</button><button class="tiny-btn" type="button" onclick="openProgramExerciseSwap(' + weekIndex + ',' + dayIndex + ',' + blockIndex + ',' + exerciseIndex + ')">Replace</button></span></div></div>';
    }).join("");
    return group.type === "superset" && group.items.length === 2 ? '<div class="program-superset-pair"><div class="program-superset-pair-label">Superset available · A1 + A2</div>' + rows + '</div>' : rows;
  }).join("");
}
function programBlockPurpose(block) {
  const key = String(block && block.key || '').toLowerCase(), title = String(block && block.title || '').toLowerCase();
  if (key.includes('warm') || title.includes('warm') || title.includes('prepare')) return 'Raise temperature, prepare the joints, and rehearse the patterns without creating fatigue.';
  if (key.includes('strength') || title.includes('primary') || title.includes('main lift')) return 'Complete the highest-priority work while technique, attention, and force production are fresh.';
  if (title.includes('secondary')) return 'Support the primary lift with complementary strength work and controlled volume.';
  if (key.includes('access') || title.includes('access')) return 'Fill the session’s muscle and movement balance without competing with the main work.';
  if (key.includes('condition') || title.includes('cardio') || title.includes('condition')) return 'Train the assigned energy-system target with clear effort, work, and recovery guidance.';
  if (key.includes('finish') || title.includes('finish')) return 'Finish with a brief targeted block that does not reduce the quality of earlier work.';
  if (key.includes('cool') || title.includes('cool') || title.includes('mobility')) return 'Downshift gradually and restore comfortable range before leaving the session.';
  return 'Complete this phase in order, using the assigned technique, effort, and rest targets.';
}
function programBlockHtml(block,weekIndex,dayIndex,blockIndex) {
  const hasSuperset = (block.groups || []).some((group) => group.type === "superset");
  return '<section class="focused-program-phase"><div class="focused-program-phase-head"><div class="focused-program-phase-title"><span class="focused-program-phase-index">' + (blockIndex + 1) + '</span><div><div class="program-block-label">Phase ' + (blockIndex + 1) + '</div><h4>' + escapeHtml(block.title) + '</h4><p>' + escapeHtml(programBlockPurpose(block)) + '</p></div></div><div class="program-superset-tools"><span>Optional paired block</span><div class="tool-actions"><button class="small-btn" onclick="openProgramSupersetEditor(' + weekIndex + ',' + dayIndex + ',' + blockIndex + ')">' + (hasSuperset ? 'Edit' : 'Create') + ' superset</button>' + (hasSuperset ? '<button class="small-btn" onclick="clearProgramSupersets(' + weekIndex + ',' + dayIndex + ',' + blockIndex + ')">Clear</button>' : '') + '</div></div></div><div class="focused-program-exercises">' + programBlockExercisesHtml(block,weekIndex,dayIndex,blockIndex) + '</div></section>';
}
function openProgramPrescriptionEditor(weekIndex,dayIndex,blockIndex,exerciseIndex) {
  if (!currentProgram || !currentProgram.weeks[weekIndex] || !currentProgram.weeks[weekIndex].days[dayIndex]) return false;
  const session = currentProgram.weeks[weekIndex].days[dayIndex].session, block = session.blocks[blockIndex]; if (!block || !block.items[exerciseIndex]) return false;
  const opened = openPrescriptionEditor(session,block,blockIndex,exerciseIndex,null,"");
  if (opened && prescriptionEditContext) Object.assign(prescriptionEditContext,{renderMode:"program",weekIndex,dayIndex,blockIndex});
  return opened;
}
function openProgramExerciseSwap(weekIndex,dayIndex,blockIndex,exerciseIndex) {
  if (!currentProgram || !currentProgram.weeks[weekIndex] || !currentProgram.weeks[weekIndex].days[dayIndex]) return false;
  const session = currentProgram.weeks[weekIndex].days[dayIndex].session, block = session.blocks[blockIndex], exercise = block && block.items && block.items[exerciseIndex];
  if (!exercise) return false;
  const opened = openExerciseSwap(session,block,exerciseIndex,exercise);
  if (!opened || !activeSwap) return false;
  Object.assign(activeSwap,{renderMode:"program",weekIndex,dayIndex,blockIndex,exerciseIndex});
  byId("programSwapFields").style.display = "grid";
  byId("programSwapScope").value = currentProgram.starter || currentProgram.setup && currentProgram.setup.programMode === "starter" ? "all" : "single";
  byId("swapShuffleBtn").style.display = "none";
  byId("exerciseSwapCopy").textContent = "Choose a replacement for " + exercise.name + ". You can change only this workout or carry the exercise through the same program day while each week keeps its own sets, reps, tempo, and rest.";
  return true;
}
function markCurrentProgramDraft(reason) {
  if (!currentProgram) return;
  currentProgram.lifecycle = "draft";
  currentProgram.approval = {status:"draft",required:true,changedAt:new Date().toISOString(),changeReason:reason};
  byId("programApproveBtn").disabled = false; byId("programSaveBtn").disabled = true; byId("programSaveOnlyBtn").disabled = true;
}
function applyProgramExerciseReplacement(context,exercise,scope) {
  if (!currentProgram || !context || !exercise) return {changed:0,skipped:0,message:"Program context is unavailable"};
  const startWeek = Number(context.weekIndex), weekIndexes = scope === "single" ? [startWeek] : currentProgram.weeks.map((_,index) => index).filter((index) => scope === "all" || index >= startWeek);
  let changed = 0, skipped = 0, blocked = 0, blockedReasons = [];
  weekIndexes.forEach((weekIndex) => {
    const day = currentProgram.weeks[weekIndex] && currentProgram.weeks[weekIndex].days[context.dayIndex]; if (!day || !day.session) return;
    const safetyIssues = hardExerciseSafetyIssues(exercise,day.session.spec || {});
    if (safetyIssues.length) { blocked += 1; blockedReasons.push(...safetyIssues.map((issue) => issue.label)); return; }
    const targetBlock = day.session.blocks.find((candidate) => candidate.key === context.block.key) || day.session.blocks[context.blockIndex];
    const target = targetBlock && targetBlock.items && targetBlock.items[context.exerciseIndex]; if (!target) return;
    const duplicate = day.session.blocks.some((candidate) => candidate.items.some((item) => item !== target && item.name === exercise.name));
    if (duplicate) { skipped += 1; return; }
    if (replaceExercise(targetBlock,context.exerciseIndex,exercise)) {
      enrichSessionMetadata(day.session); markSessionDraft(day.session,"Exercise replaced in multi-week program"); changed += 1;
    }
  });
  if (changed) markCurrentProgramDraft("Exercise replaced by coach in " + changed + " program workout" + (changed === 1 ? "" : "s"));
  return {changed,skipped,blocked,message:blocked ? "Safety filter blocked " + exercise.name + ": " + [...new Set(blockedReasons)].join(" · ") : skipped ? "The replacement already exists elsewhere in the selected workout" : ""};
}
function openProgramSupersetEditor(weekIndex,dayIndex,blockIndex) {
  if (!currentProgram || !currentProgram.weeks[weekIndex] || !currentProgram.weeks[weekIndex].days[dayIndex]) return false;
  const session = currentProgram.weeks[weekIndex].days[dayIndex].session, block = session.blocks[blockIndex]; if (!block) return false;
  return openSupersetEditor(session,block,blockIndex,null,"","program");
}
function clearProgramSupersets(weekIndex,dayIndex,blockIndex) {
  if (!currentProgram || !currentProgram.weeks[weekIndex] || !currentProgram.weeks[weekIndex].days[dayIndex]) return false;
  const session = currentProgram.weeks[weekIndex].days[dayIndex].session, block = session.blocks[blockIndex]; if (!block) return false;
  return clearBlockSupersets(session,block,"program");
}
function selectFocusedProgramWeek(index) {
  if (!currentProgram || !currentProgram.weeks.length) return false;
  focusedProgramWeekIndex = Math.max(0,Math.min(currentProgram.weeks.length - 1,Number(index) || 0));
  focusedProgramDayIndex = 0;
  renderProgram();
  return true;
}
function selectFocusedProgramDay(weekIndex,dayIndex) {
  if (!currentProgram || !currentProgram.weeks[weekIndex] || !currentProgram.weeks[weekIndex].days[dayIndex]) return false;
  focusedProgramWeekIndex = Number(weekIndex) || 0;
  focusedProgramDayIndex = Number(dayIndex) || 0;
  renderProgram();
  return true;
}
function focusedProgramWorkspaceHtml(program,savedAssignments,approved,starter) {
  focusedProgramWeekIndex = Math.max(0,Math.min(program.weeks.length - 1,Number(focusedProgramWeekIndex) || 0));
  const week = program.weeks[focusedProgramWeekIndex];
  focusedProgramDayIndex = Math.max(0,Math.min(week.days.length - 1,Number(focusedProgramDayIndex) || 0));
  const day = week.days[focusedProgramDayIndex], session = day.session || {}, blocks = session.blocks || [], exerciseCount = blocks.reduce((total,block) => total + (block.items || []).length,0);
  const weekTabs = '<nav class="focused-program-week-tabs" aria-label="Program weeks">' + program.weeks.map((item,index) => '<button class="focused-program-week-tab ' + (index === focusedProgramWeekIndex ? 'on' : '') + '" type="button" aria-pressed="' + (index === focusedProgramWeekIndex) + '" onclick="selectFocusedProgramWeek(' + index + ')"><b>Week ' + item.number + '</b><span>' + escapeHtml(item.phase && (item.phase.reviewTitle || item.phase.name) || 'Training') + '</span></button>').join('') + '</nav>';
  const checkpoint = week.reviewRequired ? '<div class="' + (starter ? 'starter-checkpoint' : 'formal-review-box') + '"><b>' + escapeHtml(week.phase.reviewTitle || 'Coach review') + '</b><p>' + escapeHtml(week.phase.reviewPrompt || 'Review adherence, pain, readiness, performance, technique, preferences, and goals before starting the next block.') + '</p></div>' : '';
  const dayRail = '<nav class="focused-program-day-rail" aria-label="Week ' + week.number + ' training days"><p>Select a workout day</p>' + week.days.map((item,index) => {
    const assigned = savedAssignments.some((assignment) => Number(assignment.programWeek) === week.number && Number(assignment.programDay) === index + 1), itemSession = item.session || {}, itemBlocks = itemSession.blocks || [], itemCount = itemBlocks.reduce((total,block) => total + (block.items || []).length,0), mode = itemSession.calibration ? itemSession.calibration.supportSession ? 'Foundation' : 'Evidence' : itemBlocks.length + ' phases';
    return '<button class="focused-program-day-button ' + (index === focusedProgramDayIndex ? 'on' : '') + '" type="button" aria-pressed="' + (index === focusedProgramDayIndex) + '" onclick="selectFocusedProgramDay(' + focusedProgramWeekIndex + ',' + index + ')"><span class="focused-program-day-number">' + (index + 1) + '</span><span class="focused-program-day-copy"><b>' + escapeHtml(item.name) + '</b><span>' + escapeHtml(mode) + ' · ' + itemCount + ' exercises</span></span><span class="focused-program-day-state ' + (assigned ? 'done' : '') + '">' + (assigned ? 'Assigned' : 'Draft') + '</span></button>';
  }).join('') + '</nav>';
  const assigned = savedAssignments.some((assignment) => Number(assignment.programWeek) === week.number && Number(assignment.programDay) === focusedProgramDayIndex + 1), calibrationMode = session.calibration ? session.calibration.supportSession ? 'Foundation workout' : 'Calibration evidence' : 'Coach-built workout';
  const selectedDay = '<article class="focused-program-detail"><header class="focused-program-day-head"><div><div class="result-label">Week ' + week.number + ' · Day ' + (focusedProgramDayIndex + 1) + ' of ' + week.days.length + '</div><h3>' + escapeHtml(day.name) + '</h3><p>' + escapeHtml(week.phase && week.phase.directive || 'Complete the phases in order and preserve the assigned technique, effort, and rest targets.') + '</p><div class="focused-program-day-meta"><span>' + escapeHtml(calibrationMode) + '</span><span>' + blocks.length + ' phases</span><span>' + exerciseCount + ' exercises</span><span>' + escapeHtml(String(program.setup.minutes || 60)) + ' min target</span></div></div><div class="tool-actions"><button class="small-btn" type="button" onclick="printProgram()">Print program</button></div></header><div class="focused-program-phases">' + blocks.map((block,index) => programBlockHtml(block,focusedProgramWeekIndex,focusedProgramDayIndex,index)).join('') + '</div><footer class="focused-program-day-foot"><div class="program-day-assignment ' + (assigned ? 'done' : '') + '">' + (assigned ? 'Registered to client' : 'Not assigned yet') + '</div>' + (approved && !program.calibration ? '<button class="small-btn primary" type="button" onclick="saveAndAssignCurrentProgram(' + week.number + ')">Assign all of Week ' + week.number + '</button>' : '<span class="result-note">' + (program.calibration ? 'Use the calibration-week assignment button above to keep the full first week together.' : 'Coach approval is required before assignment.') + '</span>') + '</footer></article>';
  return '<section class="focused-program-workspace">' + weekTabs + checkpoint + '<div class="focused-program-shell">' + dayRail + selectedDay + '</div></section>';
}
function renderProgram() {
  const out = byId("programOutput");
  if (!currentProgram) { out.className = "empty-state"; out.textContent = "Choose the client details and build a program."; return; }
  const p = currentProgram;
  out.className = "";
  const approved = p.approval && p.approval.status === "approved";
  const starter = p.setup.programMode === "starter" || p.starter;
  const continuityCopy = p.calibration ? "Only the marked anchors collect goal-specific evidence. The rest remains useful training, and no max testing is required." : (p.setup.templateTitle ? "Adapted from " + p.setup.templateTitle + ". " : "") + (starter ? "The same day templates repeat for all three weeks; only the prescription progresses. Week 1 includes a client fit review." : "Compounds stay consistent through the four-week phase; accessories rotate every two weeks.");
  const savedAssignments = p.id ? loadAssignedWorkouts().filter((item) => item.programId === p.id) : [];
  const versionLabel = 'Version ' + Number(p.versionNumber || 1) + ' · ' + String(p.lifecycle || (savedAssignments.length ? 'published' : approved ? 'approved' : 'draft')).replace(/_/g,' ');
  const profile = loadProfiles().find((item) => item.id === p.profileId || item.id === p.setup.profileId) || loadProfiles().find((item) => clientMatches(item.name,p.setup.client)), tailoredUnlocked = profile && baselineCanTailor(profile);
  const saveAssign = byId("programSaveBtn"); if (saveAssign) saveAssign.textContent = p.calibration ? "Save & assign calibration week" : "Save & assign full program";
  const assignmentActions = approved ? p.calibration
    ? '<div class="program-assignment-actions"><button class="small-btn primary" onclick="saveAndAssignCurrentProgram(\'all\')">Assign calibration week (' + p.setup.days + ' workout' + (p.setup.days === 1 ? '' : 's') + ')</button>' + (savedAssignments.length ? '<span class="program-assignment-state">' + savedAssignments.length + ' of ' + p.setup.days + ' workouts registered</span>' : '') + '</div>'
    : '<div class="program-assignment-actions"><button class="small-btn primary" onclick="saveAndAssignCurrentProgram(\'all\')">Assign full program</button><button class="small-btn" onclick="saveAndAssignCurrentProgram(\'week1\')">Assign Week 1 only</button>' + (p.weeks.length > 1 ? '<button class="small-btn" onclick="saveAndAssignCurrentProgram(\'remaining\')">Assign Weeks 2–' + p.weeks.length + '</button>' : '') + (savedAssignments.length ? '<span class="program-assignment-state">' + savedAssignments.length + ' workout' + (savedAssignments.length === 1 ? '' : 's') + ' registered</span>' : '') + '</div>' : '';
  const calibrationNextStep = p.calibration ? '<section class="program-calibration-summary"><b>' + (tailoredUnlocked ? 'Baseline verified · full program is ready to build' : 'What happens after this week') + '</b>' + (tailoredUnlocked ? 'The coach-verified baseline is available. The selected schedule remains ' + p.setup.days + ' days per week; build the tailored multi-week phase now.<div class="tool-actions" style="margin-top:10px"><button class="small-btn primary" onclick="generateProgram()">Build tailored ' + p.setup.days + '-day program</button></div>' : 'Assign all ' + p.setup.days + ' first-week workouts. Only ' + Number(p.setup.calibrationAnchorSessions || Math.min(2,p.setup.days)) + ' contain required anchors. After those are completed and reviewed, the trainer verifies the baseline and builds the tailored multi-week program.') + '</section>' : '';
  out.innerHTML = '<article class="utility-card"><div class="utility-head"><div><h3 class="utility-title">' + escapeHtml(p.setup.client) + ' · ' + escapeHtml(p.setup.goals.map((g) => GOALS[g].label).join(" + ")) + '</h3><div class="program-summary"><span><b>' + p.setup.weeks + '</b> week' + (p.setup.weeks === 1 ? '' : 's') + '</span><span><b>' + p.setup.days + '</b> day' + (p.setup.days === 1 ? '' : 's') + '/week</span><span><b>' + EXP_LABEL(p.setup.experience) + '</b> experience</span><span><b>' + escapeHtml(TRAINING_ROUTES[resolvedTrainingRoute(p.setup)].title) + '</b> route</span><span><b>' + p.setup.minutes + ' min</b> sessions</span><span><b>' + escapeHtml(versionLabel) + '</b></span></div>' + (p.calibration ? '<div class="program-calibration-summary"><b>Embedded calibration · useful training first</b>The marked anchors collect ' + escapeHtml((p.setup.baselineRequiredDomains || []).map((domain) => BASELINE_DOMAIN_LABELS[domain] || domain).join(' · ')) + '. Once those sets are logged, a trainer verifies the evidence and unlocks the tailored phase.</div>' : '') + '<div class="draft-status ' + (approved ? 'approved' : 'draft') + '"><b>' + (approved ? 'Coach approved ' + (p.calibration ? 'calibration' : 'program') : (p.calibration ? 'Calibration draft' : 'Program draft') + ' · approval required') + '</b><span>' + escapeHtml(continuityCopy) + '</span></div></div><span class="wave-badge">' + (p.calibration ? 'Baseline' : 'Program') + '</span></div></article>'
    + assignmentActions + calibrationNextStep
    + focusedProgramWorkspaceHtml(p,savedAssignments,approved,starter);
}
function printProgram() { if (currentProgram) window.print(); }
function approveCurrentProgram() {
  if (!requireTrainerMutation("approve programs") || !currentProgram) return false;
  const intakeProfile = loadProfiles().find((item) => item.id === currentProgram.setup.profileId) || loadProfiles().find((item) => clientMatches(item.name,currentProgram.setup.client));
  const intakeStatus = intakeProfile ? intakeCompletion(intakeProfile) : null;
  if (intakeStatus && intakeStatus.approvalBlocked) { showToast("Program approval blocked — finish " + intakeProfile.name + "’s onboarding and document the trainer baseline decision first"); return false; }
  if (intakeProfile && !currentProgram.calibration && !baselineCanTailor(intakeProfile)) { showToast("Program approval blocked — complete and verify the client’s calibration baseline first"); renderProgramBaselineGate(); return false; }
  const sessions = currentProgram.weeks.flatMap((week) => week.days.map((day) => day.session)); sessions.forEach((session) => { session.audit = auditWorkout(session); });
  const failed = sessions.filter((session) => !session.audit.pass); if (failed.length) { showToast("Program approval blocked: " + failed.length + " session audits need review"); renderProgram(); return false; }
  const approvedAt = new Date().toISOString(), approvedBy = currentAccountIdentity().displayName; sessions.forEach((session) => { session.approval = { ...(session.approval || {}),status:"approved",approvedAt,approvedBy,auditScore:session.audit.score }; }); currentProgram.approval = { status:"approved",approvedAt,approvedBy }; currentProgram.lifecycle = "approved";
  byId("programSaveBtn").disabled = false; byId("programSaveOnlyBtn").disabled = false; renderProgram(); showToast("Coach approved the program after all session audits passed"); return true;
}
function saveCurrentProgram(silent) {
  if (!requireTrainerMutation("save programs to client records")) return null;
  if (!currentProgram) return;
  if (!currentProgram.approval || currentProgram.approval.status !== "approved") { showToast("Coach approval is required before saving this program"); return null; }
  const p = currentProgram, wasNew = !p.id;
  const programs = loadSavedPrograms(), saved = JSON.parse(JSON.stringify(p)), profile = loadProfiles().find((item) => item.id === p.setup.profileId) || loadProfiles().find((item) => clientMatches(item.name,p.setup.client));
  saved.profileId = profile && profile.id || p.setup.profileId || "";
  const existing = programs.findIndex((item) => ((item.profileId && item.profileId === saved.profileId) || clientMatches(item.setup && item.setup.client,p.setup.client)) && Boolean(item.calibration) === Boolean(saved.calibration)), previous = existing >= 0 ? programs[existing] : null;
  const changed = Boolean(previous && programComparableJson(previous) !== programComparableJson(saved));
  saved.id = saved.id || (previous && previous.id) || "program-" + Date.now();
  saved.versions = previous ? JSON.parse(JSON.stringify(previous.versions || [])) : JSON.parse(JSON.stringify(saved.versions || []));
  if (previous && changed) saved.versions.unshift(programRevisionSnapshot(previous,saved.approval && saved.approval.changeReason || 'Program revised by coach'));
  saved.versions = saved.versions.slice(0,20);
  saved.versionNumber = previous ? Number(previous.versionNumber || 1) + (changed ? 1 : 0) : Number(saved.versionNumber || 1);
  saved.savedAt = new Date().toISOString(); saved.savedBy = currentAccountIdentity().displayName; saved.lifecycle = changed || !previous ? "approved" : previous.lifecycle || "approved";
  if (existing >= 0) programs[existing] = saved; else programs.unshift(saved); writeSavedPrograms(programs);
  currentProgram = JSON.parse(JSON.stringify(saved));
  if (wasNew) addProgressEntry({ type: "program", client: p.setup.client, profileId:saved.profileId, label: p.setup.goals.map((g) => GOALS[g].label).join(" + ") + " program", value: p.setup.weeks + " weeks · " + p.setup.days + " days/week", note: "Multi-week plan created" });
  if (!silent) showToast("Program saved. Use the assignment controls to register its workout days.");
  return saved;
}
function programScheduleBase(trainingDays) {
  const today = new Date(), day = today.getDay(), monday = new Date(today); monday.setHours(12,0,0,0); monday.setDate(today.getDate() - (day === 0 ? 6 : day - 1));
  const latestFirstWeek = new Date(monday); latestFirstWeek.setDate(monday.getDate() + Math.max.apply(null,trainingDays) - 1);
  if (latestFirstWeek < new Date(new Date().toDateString())) monday.setDate(monday.getDate() + 7);
  return monday;
}
function scheduledDateForProgram(base,weekNumber,weekday) {
  const date = new Date(base); date.setDate(base.getDate() + (Number(weekNumber) - 1) * 7 + Number(weekday) - 1); return date.toISOString().slice(0,10);
}
function assignProgramWeeks(program,weekNumbers) {
  const profile = loadProfiles().find((item) => item.id === program.profileId || item.id === program.setup.profileId) || loadProfiles().find((item) => clientMatches(item.name,program.setup.client));
  if (!profile) { showToast("Choose a saved client profile before assigning this program"); return []; }
  if (!program.calibration && !baselineCanTailor(profile)) { showToast("Program assignment blocked until the client baseline is coach-verified"); return []; }
  if (unresolvedClientSafetyHold(profile)) { showToast("Program assignment paused until the trainer reviews this client’s recent pain or discomfort report"); return []; }
  const selectedWeeks = program.weeks.filter((week) => weekNumbers.includes(Number(week.number))); if (!selectedWeeks.length) return [];
  const safetyConflicts = selectedWeeks.flatMap((week) => (week.days || []).flatMap((day) => sessionSafetyConflictsForProfile(day.session,profile).map((conflict) => "Week " + week.number + " · " + day.name + ": " + conflict)));
  if (safetyConflicts.length) { showToast("Program assignment blocked by current client safety filters: " + safetyConflicts.slice(0,3).join(" · ")); return []; }
  const trainingDays = inferredTrainingDays(profile,program.setup.days), scheduleBase = program.scheduleStart ? new Date(program.scheduleStart + "T12:00:00") : programScheduleBase(trainingDays), assignments = loadAssignedWorkouts(), registered = [];
  const validProgramDays = new Set(selectedWeeks.flatMap((week) => (week.days || []).map((day,index) => Number(week.number) + ":" + (index + 1))));
  for (let index = assignments.length - 1; index >= 0; index--) {
    const item = assignments[index], selectedWeek = weekNumbers.includes(Number(item.programWeek)), obsolete = item.profileId === profile.id && item.programId === program.id && selectedWeek && !validProgramDays.has(Number(item.programWeek) + ":" + Number(item.programDay));
    if (obsolete && assignmentStatus(item) === "assigned") assignments.splice(index,1);
  }
  selectedWeeks.forEach((week) => (week.days || []).forEach((day,dayIndex) => {
    const existingIndex = assignments.findIndex((item) => item.profileId === profile.id && item.programId === program.id && Number(item.programWeek) === Number(week.number) && Number(item.programDay) === dayIndex + 1);
    if (existingIndex >= 0 && ["in_progress","completed","reviewed"].includes(assignmentStatus(assignments[existingIndex]))) { registered.push(assignments[existingIndex]); return; }
    const workout = {type:"solo",data:JSON.parse(JSON.stringify(day.session)),edits:{}};
    assignSessionIds(workout);
    workout.data.spec = { ...(workout.data.spec || {}),client:profile.name,profileId:profile.id };
    const weekday = trainingDays[dayIndex % trainingDays.length], scheduledDate = scheduledDateForProgram(scheduleBase,week.number,weekday);
    const assignment = {id:existingIndex >= 0 ? assignments[existingIndex].id : "assignment-" + Date.now() + "-" + week.number + "-" + (dayIndex + 1) + "-" + Math.random().toString(16).slice(2),profileId:profile.id,client:profile.name,assignedAt:new Date().toISOString(),scheduledDate,scheduledWeekday:weekday,status:"assigned",programId:program.id,programWeek:week.number,programDay:dayIndex + 1,programDayName:day.name,phaseName:week.phase && week.phase.name || "",session:workout};
    if (existingIndex >= 0) assignments[existingIndex] = assignment; else assignments.push(assignment);
    registered.push(assignment);
  }));
  writeAssignedWorkouts(assignments);
  return registered;
}
function saveAndAssignCurrentProgram(scope) {
  if (!requireTrainerMutation("assign programs to clients") || !currentProgram) return null;
  if (!currentProgram.approval || currentProgram.approval.status !== "approved") { showToast("Coach approval is required before assigning this program"); return null; }
  if (!currentProgram.scheduleStart) {
    const profile = loadProfiles().find((item) => item.id === currentProgram.profileId || item.id === currentProgram.setup.profileId) || loadProfiles().find((item) => clientMatches(item.name,currentProgram.setup.client));
    const start = programScheduleBase(inferredTrainingDays(profile,currentProgram.setup.days)); currentProgram.scheduleStart = start.toISOString().slice(0,10);
  }
  const saved = saveCurrentProgram(true); if (!saved) return null;
  let weeks = saved.weeks.map((week) => Number(week.number));
  if (scope === "week1") weeks = [1];
  else if (scope === "remaining") weeks = weeks.filter((week) => week > 1);
  else if (Number.isFinite(Number(scope))) weeks = [Number(scope)];
  const registered = assignProgramWeeks(saved,weeks);
  saved.lifecycle = "published"; saved.publishedAt = new Date().toISOString(); saved.publishedBy = currentAccountIdentity().displayName;
  const programs = loadSavedPrograms(), savedIndex = programs.findIndex((item) => item.id === saved.id);
  if (savedIndex >= 0) { programs[savedIndex] = saved; writeSavedPrograms(programs); }
  currentProgram = JSON.parse(JSON.stringify(saved)); renderProgram();
  showToast(registered.length + " workout" + (registered.length === 1 ? "" : "s") + " registered and assigned to " + saved.setup.client);
  return registered;
}

