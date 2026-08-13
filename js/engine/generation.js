/* ---------- generation ---------- */
function applyCompoundAnchorContinuity(session) {
  const spec = session && session.spec; if (!spec || !spec.phaseCompoundAnchors) return session;
  const anchorName = spec.phaseCompoundAnchors[phaseSessionKey(spec)]; if (!anchorName) return session;
  const block = (session.blocks || []).find((item) => item.key === "strength" && item.items.length); if (!block) return session;
  const candidate = eligible(spec,spec.age).find((exercise) => exercise.name === anchorName && isPrimaryAnchor(exercise));
  if (!candidate) return session;
  const current = block.items[0], existing = session.blocks.flatMap((item) => item.items.map((exercise,index) => ({ block:item,exercise,index }))).find((item) => item.exercise.name === candidate.name);
  if (existing && existing.exercise !== current) {
    const prior = { ...current }; replaceExercise(block,0,existing.exercise); replaceExercise(existing.block,existing.index,prior);
  } else if (!existing && !replaceExercise(block,0,candidate)) return session;
  spec._lockedCompoundAnchor = candidate.name;
  session.rationale = "Compound continuity: " + candidate.name + " remains the phase benchmark while accessories and session architecture can rotate. " + session.rationale;
  return session;
}
function buildSessionStateAtSeed(seed, optionIndex) {
  const withOption = (person) => { const spec = cloneSpec(person); if (optionIndex != null) spec.optionIndex = optionIndex; return spec; };
  const built = state.mode === "solo"
    ? { type: "solo", data: buildBlendedSession(withOption(state.solo), seed), edits: {} }
    : { type: "group", data: buildGroupSession(withOption(state.p1), withOption(state.p2), seed), edits: {} };
  workoutPlans(built).forEach((plan) => { applyCoachAdjustmentToSession(plan.session); applyReadinessTrendToSession(plan.session); applyCompoundAnchorContinuity(plan.session); finalizeGeneratedSession(plan.session); }); return built;
}
function applyCoachAdjustmentToSession(session) {
  const adjustment = session && session.spec && session.spec.coachAdjustment; if (!adjustment || !adjustment.action) return session;
  const labels = { repeat:"Repeat the successful structure and keep clean loads before changing anything.", progress:"Coach decision: progress one variable only—add one rep or the smallest available load while keeping the same form.", reduce:"Coach decision: reduce demand from the prior workout; volume is trimmed and effort is capped at RPE 7.", pain_swap:"Coach decision: do not repeat the painful pattern unchanged. The reported area is filtered and every replacement must stay pain-free." };
  if (adjustment.action === "reduce") {
    session.blocks.forEach((block) => {
      if (["warmup","mobility","primer"].includes(block.key)) return;
      block.rx.sets = adjustSetCount(block.rx.sets,-1); block.rx.rpe = "Cap at RPE 7";
      block.items.forEach((exercise) => { exercise.rx = { ...(exercise.rx || block.rx), sets:adjustSetCount(exercise.rx && exercise.rx.sets || block.rx.sets,-1), rpe:"Cap at RPE 7" }; });
    });
    session.prescription.sets = adjustSetCount(session.prescription.sets,-1); session.prescription.rpe = "Cap at RPE 7";
  }
  session.rationale = (labels[adjustment.action] || "Coach-reviewed next-session direction.") + (adjustment.note ? " Trainer note: " + adjustment.note : "") + " " + session.rationale; return session;
}
function workoutPlans(sessionState) {
  if (!sessionState) return [];
  return sessionState.type === "solo"
    ? [{ label: sessionState.data.spec.client || "Client", session: sessionState.data }]
    : [{ label: sessionState.data.a.spec.client || "Partner 1", session: sessionState.data.a }, { label: sessionState.data.b.spec.client || "Partner 2", session: sessionState.data.b }];
}
function allPrimaryLiftRefs(sessionState) {
  return workoutPlans(sessionState).flatMap((plan) => {
    const blocks = plan.session.blocks || [];
    const block = blocks.find((item) => item.key === "strength" && item.items.length)
      || blocks.find((item) => !["warmup","mobility","finisher"].includes(item.key) && item.items.length)
      || blocks.find((item) => item.items.length);
    if (!block) return [];
    const items = block.key === "strength" ? block.items : block.items.slice(0,1);
    return items.map((exercise,index) => ({ ...plan, block, exercise, index }));
  });
}
function primaryLiftRefs(sessionState) {
  const seenPlans = new Set();
  return allPrimaryLiftRefs(sessionState).filter((ref) => { if (seenPlans.has(ref.session)) return false; seenPlans.add(ref.session); return true; });
}
function primaryLiftNames(sessionState) { return primaryLiftRefs(sessionState).map((item) => item.exercise.name); }
function distinctPrimaryLifts(options) {
  const used = new Set();
  options.forEach((option, optionIndex) => {
    primaryLiftRefs(option.session).forEach((ref) => {
      if (["cardio","recovery","mobility"].includes(resolvedTrainingRoute(ref.session.spec))) return;
      if (ref.session.spec._lockedCompoundAnchor) { used.add(ref.exercise.name); return; }
      if (optionIndex > 0 && used.has(ref.exercise.name)) {
        const spec = ref.session.spec, targets = spec.muscles || [], pp = targetPushPull(targets), area = targetArea(targets);
        const anchorRequired = isPrimaryAnchor(ref.exercise);
        const alternatives = eligibleFor(spec).filter((exercise) => exercise.name !== ref.exercise.name && !used.has(exercise.name)
          && exercise.finisher !== true && (anchorRequired ? isPrimaryAnchor(exercise) : (COMPOUND_PATTERNS.includes(exercise.pattern) || exercise.pattern === "conditioning")) && !ISO_NAMES.includes(exercise.name)
          && (!targets.length || muscleAllowed(exercise,targets))
          && (!pp || !pushPull(exercise) || pushPull(exercise) === pp)
          && (!area || bodyArea(exercise) === area || bodyArea(exercise) === "mixed"));
        if (alternatives.length) {
          const ranked = biasSort(alternatives,ref.session.spec.muscles || [],makeRng(option.seed + ref.index + 17),ref.session.spec.experience,emphasisOf(ref.block.items)).sort((a,b) => primaryAnchorRank(b,spec,true) - primaryAnchorRank(a,spec,true));
          const chosen = ranked[0], existing = ref.session.blocks.flatMap((block) => block.items.map((exercise,index) => ({ block,exercise,index }))).find((item) => item.exercise.name === chosen.name);
          if (existing) replaceExercise(existing.block,existing.index,ref.exercise);
          replaceExercise(ref.block,ref.index,chosen);
        }
      }
      const updated = ref.block.items[ref.index]; if (updated) used.add(updated.name);
    });
  });
}
function sessionProgrammingTokens(sessionState) {
  return workoutPlans(sessionState).flatMap((plan) => (plan.session.blocks || [])
    .filter((block) => block.key !== "warmup")
    .map((block) => {
      const grouping = (block.groups || []).map((group) => group.type).join(",") || "straight";
      const architecture = plan.session.optionArchitecture && plan.session.optionArchitecture.id || "standard";
      return architecture + ":" + block.key + ":" + grouping + ":" + (block.rx && block.rx.reps || "") + ":" + block.items.map((exercise) => movementFamily(exercise)).join(",");
    }));
}
function sessionArchitectureIds(sessionState) {
  return workoutPlans(sessionState).map((plan) => plan.session.optionArchitecture && plan.session.optionArchitecture.id).filter(Boolean);
}
function generateWorkoutOptions() {
  const chosen = [], usedSignatures = new Set();
  for (let optionIndex = 0; optionIndex < 3; optionIndex++) {
    const candidates = [];
    for (let attempt = 0; attempt < 56; attempt++) {
      const seed = ((state.seed + optionIndex * 982451653 + attempt * 104729) % 2147483646) + 1;
      const session = buildSessionStateAtSeed(seed,optionIndex), signature = sessionExerciseNames(session).join("|");
      if (!usedSignatures.has(signature)) candidates.push({ seed,session,signature });
    }
    if (!candidates.length) {
      const seed = ((state.seed + optionIndex * 982451653) % 2147483646) + 1;
      candidates.push({ seed,session:buildSessionStateAtSeed(seed,optionIndex),signature:"fallback-" + optionIndex });
    }
    const usedPrimary = new Set(chosen.flatMap((option) => primaryLiftNames(option.session))), usedFamilies = new Set(chosen.flatMap((option) => primaryLiftRefs(option.session).map((ref) => primaryAnchorFamily(ref.exercise))));
    let best = candidates[0], bestScore = -Infinity;
    candidates.forEach((candidate) => {
      const refs = primaryLiftRefs(candidate.session), names = refs.map((ref) => ref.exercise.name), families = refs.map((ref) => primaryAnchorFamily(ref.exercise));
      const nameNovelty = names.length ? names.filter((name) => !usedPrimary.has(name)).length / names.length : 0;
      const familyNovelty = families.length ? families.filter((family) => !usedFamilies.has(family)).length / families.length : 0;
      const contrast = chosen.length ? Math.min(...chosen.map((option) => changeRatio(sessionExerciseNames(option.session),sessionExerciseNames(candidate.session)))) : 0;
      const programmingContrast = chosen.length ? Math.min(...chosen.map((option) => changeRatio(sessionProgrammingTokens(option.session),sessionProgrammingTokens(candidate.session)))) : 0;
      const anchorQuality = refs.length ? refs.filter((ref) => isPrimaryAnchor(ref.exercise)).length / refs.length : 0;
      const architectureMatch = workoutPlans(candidate.session).every((plan) => plan.session.optionArchitecture && plan.session.optionArchitecture.id === optionArchitectureForSpec({ ...plan.session.spec, optionIndex }).id) ? 1 : 0;
      const score = contrast * 110 + programmingContrast * 90 + nameNovelty * 55 + familyNovelty * 35 + anchorQuality * 20 + architectureMatch * 40;
      if (score > bestScore) { best = candidate; bestScore = score; }
    });
    chosen.push(best); usedSignatures.add(best.signature);
  }
  distinctPrimaryLifts(chosen);
  return chosen.map((option,index) => ({ ...option, id: "workout-option-" + (index + 1) }));
}
function chooseWorkoutOption(index) {
  const option = state.sessionOptions[index]; if (!option) return false;
  state.seed = option.seed; state.session = option.session;
  const plans = workoutPlans(state.session);
  if (plans.some((plan) => !plan.session.sessionId)) assignSessionIds(state.session);
  byId("reshuffleBtn").style.display = "inline-flex"; byId("disclaimer").style.display = "block";
  renderOutput(); byId("output").scrollIntoView({ behavior:"smooth", block:"start" });
  showToast("Workout option " + String.fromCharCode(65 + index) + " selected — every movement remains editable");
  return true;
}
function compareWorkoutOptions() {
  if (!state.sessionOptions.length) return;
  state.session = null; byId("reshuffleBtn").style.display = "none"; renderOutput(); byId("output").scrollIntoView({ behavior:"smooth", block:"start" });
}
function generate() {
  if (state.mode === "solo" && !personReady(state.solo)) return;
  if (state.mode === "group" && (!personReady(state.p1) || !personReady(state.p2))) return;
  state.session = null; state.sessionOptions = generateWorkoutOptions();
  document.getElementById("reshuffleBtn").style.display = "none";
  document.getElementById("disclaimer").style.display = "block";
  renderOutput();
  document.getElementById("output").scrollIntoView({ behavior: "smooth", block: "start" });
}
function manualWorkoutPrescription(spec) {
  const base = RX_TABLE[spec.goal][spec.experience], aged = ageAdjustRx(base,spec.age,spec.goal), time = TIME_PROFILE[spec.minutes] || TIME_PROFILE[60];
  const main = { ...aged, sets:Math.max(2,aged.sets + time.setDelta), rest:scaleRest(aged.rest,time.restScale) };
  return { main, prescription:{ sets:String(main.sets), reps:main.reps, rest:main.rest, tempo:TEMPO_BY_GOAL[spec.goal], rpe:main.rpe }, time };
}
function startWorkoutFromScratch() {
  if (!requireTrainerMutation("build a workout from scratch")) return false;
  if (state.mode !== "solo") { setMode("solo"); showToast("From-scratch building starts with one client at a time"); return false; }
  if (!personReady(state.solo)) { showToast("Load a client and choose the goal, experience, and session length first"); return false; }
  const spec = cloneSpec(state.solo), setup = manualWorkoutPrescription(spec);
  const definitions = [
    ["warmup","Warm-up"],
    ["primer","Movement prep / primer"],
    ["strength","Primary lift"],
    ["secondary","Secondary strength"],
    ["accessory","Accessory work"],
    ["core","Trunk support"],
    ["conditioning","Conditioning"],
    ["mobility","Cool-down / mobility"],
  ];
  const blocks = definitions.map(([key,title]) => {
    const raw = blockRx(setup.main,key,spec.goal,spec.age);
    return { key, title, items:[], groups:[], rx:{ ...raw, rest:scaleRest(raw.rest,setup.time.restScale) }, manual:true };
  });
  const session = finalizeGeneratedSession({
    spec,
    goalLabel:(spec.goals || [spec.goal]).map((goal) => GOALS[goal] ? GOALS[goal].label : goal).join(" + "),
    prescription:setup.prescription,
    rationale:"Coach-built session. Every phase begins empty so the trainer can deliberately choose preparation, primary work, supporting movements, conditioning, and cool-down. The same equipment, cardio, age, preference, and limitation filters still apply to every added movement.",
    blocks,
    poolCount:eligibleFor(spec).length,
    optionArchitecture:{ id:"manual", title:"Coach-built from scratch", short:"Full phase-by-phase control", description:"The coach selects every movement while FIT4LIFE preserves whole-session filters and the approval audit." },
    trainingRoute:resolvedTrainingRoute(spec),
    manual:true,
  });
  session.manual = true;
  state.sessionOptions = [];
  state.session = { type:"solo", data:session, edits:{} };
  assignSessionIds(state.session);
  byId("reshuffleBtn").style.display = "none";
  byId("disclaimer").style.display = "block";
  renderOutput();
  byId("output").scrollIntoView({ behavior:"smooth", block:"start" });
  showToast("Blank workout created · add movements to each phase, then run the quality audit");
  return true;
}
function sessionExerciseNames(sessionState) {
  if (!sessionState) return [];
  const from = (s) => s.blocks.filter((b) => b.key !== "warmup").flatMap((b) => b.items.map((e) => e.name));
  return sessionState.type === "solo" ? from(sessionState.data) : [...from(sessionState.data.a), ...from(sessionState.data.b)];
}
function assignSessionIds(sessionState) {
  const make = () => "session-" + Date.now() + "-" + Math.random().toString(16).slice(2);
  if (!sessionState) return;
  if (sessionState.type === "solo") sessionState.data.sessionId = make();
  else { sessionState.data.a.sessionId = make(); sessionState.data.b.sessionId = make(); }
}
function changeRatio(before, after) {
  const a = new Set(before), b = new Set(after), union = new Set([...a, ...b]);
  if (!union.size) return 0;
  let shared = 0; a.forEach((x) => { if (b.has(x)) shared++; });
  const exerciseChange = 1 - shared / union.size;
  const length = Math.max(before.length, after.length);
  let moved = 0;
  for (let i = 0; i < length; i++) if (before[i] !== after[i]) moved++;
  const orderChange = length ? (moved / length) * 0.6 : 0;
  return Math.max(exerciseChange, orderChange);
}
function reshuffle() {
  if (!state.session) return;
  const before = sessionExerciseNames(state.session);
  let best = null, bestSeed = state.seed, bestRatio = -1;
  for (let attempt = 1; attempt <= 24; attempt++) {
    const seed = ((state.seed + attempt * 104729) % 2147483646) + 1;
    const candidate = state.mode === "solo"
      ? { type: "solo", data: buildBlendedSession(cloneSpec(state.solo), seed), edits: {} }
      : { type: "group", data: buildGroupSession(cloneSpec(state.p1), cloneSpec(state.p2), seed) };
    workoutPlans(candidate).forEach((plan) => { applyCoachAdjustmentToSession(plan.session); applyReadinessTrendToSession(plan.session); applyCompoundAnchorContinuity(plan.session); finalizeGeneratedSession(plan.session); });
    const ratio = changeRatio(before, sessionExerciseNames(candidate));
    if (ratio > bestRatio) { best = candidate; bestSeed = seed; bestRatio = ratio; }
    if (ratio >= 0.35) break;
  }
  state.seed = bestSeed; state.session = best; state.sessionOptions = []; assignSessionIds(state.session); renderOutput();
  const after = sessionExerciseNames(best), prior = new Set(before), changed = after.filter((name) => !prior.has(name)).length;
  showToast(changed ? "Reshuffled — " + changed + " exercises changed" : "Filters leave limited alternatives; order and pairings were refreshed");
}
function cloneSpec(p) {
  const goals = Array.isArray(p.goals) && p.goals.length ? [...p.goals] : (p.goal ? [p.goal] : []);
  const cardioModes = normalizeCardioPreferences(p.cardioModes || p.cardioMode);
  const profile = p.profileId ? loadProfiles().find((item) => item.id === p.profileId) : null, baselineContext = p.baselineContext || (profile ? baselineGeneratorContext(profile) : null);
  return { client: p.client || "", profileId: p.profileId || "", goal: goals[0] || p.goal, goals, trainingStyle:p.trainingStyle || "auto", cardioMode:cardioModes[0], cardioModes, coachAdjustment:p.coachAdjustment ? { ...p.coachAdjustment } : null, readinessTrend:p.readinessTrend ? JSON.parse(JSON.stringify(p.readinessTrend)) : null, baselineContext:baselineContext ? JSON.parse(JSON.stringify(baselineContext)) : null, experience: p.experience, age: p.age, minutes: p.minutes, muscles: [...p.muscles], injuries: [...p.injuries], zones: [...p.zones], trainingPhase:p.trainingPhase || "general", phaseStartedAt:p.phaseStartedAt || "", availableDays:Number(p.availableDays) || 3, sport:p.sport || "", sportSchedule:p.sportSchedule || "", competitionDate:p.competitionDate || "", exercisePreferences:{ ...(p.exercisePreferences || {}) }, exercisePrescriptions:{ ...(p.exercisePrescriptions || {}) }, exerciseSubstitutions:{ ...(p.exerciseSubstitutions || {}) }, limitationAssessments:{ ...(p.limitationAssessments || {}) }, phaseCompoundAnchors:{ ...(p.phaseCompoundAnchors || {}) } };
}
