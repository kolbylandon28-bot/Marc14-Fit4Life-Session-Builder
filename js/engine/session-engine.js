/* ---- Goal skeletons ---- */
const GOALS = {
  strength: {
    label: "Get stronger",
    blurb: "Heavy, low-rep compound work with long rest to build maximal force.",
    structure: ["warmup", "power_opt", "main_lift", "main_lift", "accessory", "finisher"],
    focusPatterns: ["squat", "hinge", "h_push", "v_pull"],
    conditioningShare: 0,
  },
  hypertrophy: {
    label: "Build muscle",
    blurb: "Moderate loads, higher volume, short rest to maximize muscle growth.",
    structure: ["warmup", "main_lift", "main_lift", "accessory", "accessory", "iso", "finisher"],
    focusPatterns: ["squat", "h_push", "h_pull", "hinge", "v_push", "v_pull"],
    conditioningShare: 0,
  },
  fatloss: {
    label: "Lose body fat",
    blurb: "Full-body strength paired with density circuits to burn calories and keep muscle.",
    structure: ["warmup", "main_lift", "circuit", "circuit", "conditioning", "finisher"],
    focusPatterns: ["squat", "hinge", "h_push", "h_pull"],
    conditioningShare: 0.35,
  },
  general: {
    label: "Feel fitter",
    blurb: "Balanced full-body training for strength, health, and feeling good.",
    structure: ["warmup", "main_lift", "main_lift", "accessory", "conditioning", "finisher"],
    focusPatterns: ["squat", "hinge", "h_push", "h_pull", "v_pull"],
    conditioningShare: 0.2,
  },
  athletic: {
    label: "Move faster & build power",
    blurb: "Power and speed first, then strength \u2014 train the nervous system fresh.",
    structure: ["warmup", "plyo", "power_opt", "main_lift", "main_lift", "accessory", "finisher"],
    focusPatterns: ["squat", "hinge", "h_push", "h_pull"],
    conditioningShare: 0.1,
  },
  conditioning: {
    label: "Improve stamina",
    blurb: "Engine-building intervals and full-body work to raise work capacity.",
    structure: ["warmup", "primer", "conditioning", "conditioning", "conditioning", "finisher"],
    focusPatterns: ["squat", "hinge"],
    conditioningShare: 0.7,
  },
  recovery: {
    label: "Move better & recover",
    blurb: "Low-intensity movement, mobility, and light work to restore and de-stress.",
    structure: ["warmup", "mobility", "mobility", "light_strength", "finisher", "mobility"],
    focusPatterns: ["hinge", "h_pull"],
    conditioningShare: 0,
  },
};

/* Coach-controlled programming policy. Generated plans are drafts until a
   trainer approves the quality audit. Compounds stay stable through a phase;
   accessories may rotate every two weeks; week four prompts a formal review. */
const PROGRAMMING_POLICY = Object.freeze({
  approvalMode: "every_workout",
  minimumAuditScore: 80,
  formalReviewWeeks: 4,
  accessoryRotationWeeks: 2,
  stableCompoundWeeks: 4,
});
const EXERCISE_PREFERENCE_VALUES = ["favorite","like","neutral","dislike","unfamiliar","discomfort","unavailable"];
const PREFERENCE_SCORE = { favorite:8, like:4, neutral:0, dislike:-5, unfamiliar:-3, discomfort:-100, unavailable:-100 };
function exerciseId(exercise) { return String(exercise && exercise.name || "movement").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/(^-|-$)/g,""); }
function exercisePreferenceFor(spec,exercise) { return String(spec && spec.exercisePreferences && spec.exercisePreferences[exerciseId(exercise)] || "neutral"); }
function phaseSessionKey(spec) {
  const focus = (spec && spec.muscles && spec.muscles.length ? [...spec.muscles].sort().join("-") : "full-body");
  return [spec && spec.trainingPhase || "general",spec && spec.goal || "general",resolvedTrainingRoute(spec || {}),focus].join("|");
}
function exercisePosition(block) {
  if (!block) return "accessory";
  if (["warmup","primer","mobility"].includes(block.key)) return "preparation";
  if (["power","plyo"].includes(block.key)) return "power";
  if (block.key === "strength") return "primary";
  if (["iso","finisher"].includes(block.key)) return "isolation";
  if (block.key === "conditioning") return "conditioning";
  return "accessory";
}
function exercisePurpose(exercise,block,spec) {
  const position = exercisePosition(block), goal = GOALS[spec && spec.goal] ? GOALS[spec.goal].label.toLowerCase() : "the selected goal";
  if (exercise && exercise.warmupStage && WARMUP_STAGE_DETAILS[exercise.warmupStage]) return WARMUP_STAGE_DETAILS[exercise.warmupStage].why;
  if (position === "preparation") return "Prepare " + ((exercise.muscles || []).map((m) => MUSCLE_LABELS[m] || m).join(", ").toLowerCase() || "the movement pattern") + " without creating fatigue.";
  if (position === "primary") return "Primary compound used to build " + goal + " with a repeatable movement benchmark.";
  if (position === "power") return "Train speed and intent while the client is fresh.";
  if (position === "conditioning") return "Develop the session’s planned aerobic or repeat-effort quality.";
  if (position === "isolation") return "Add targeted volume after the compound work without competing with the main lift.";
  return "Support the primary movement and fill the session’s muscle or pattern balance.";
}
function substitutionGroup(exercise,block) { return [exercisePosition(block),exercise.pattern || "general",exercise.region || "full"].join(":"); }
function progressionGuidance(exercise,block,spec) {
  if (exercisePosition(block) === "primary") return "Progress only after all prescribed reps show controlled form, full pain-free range, and the planned reps in reserve; then add the smallest load or one rep—not both.";
  return "Rotate or progress after clean completion; preserve this movement’s purpose and avoid adding load when form, range, recovery, or pain is not acceptable.";
}
function enrichSessionMetadata(session) {
  if (!session || !session.blocks) return session;
  session.trainingPhase = session.spec.trainingPhase || "general";
  session.purpose = (GOALS[session.spec.goal] && GOALS[session.spec.goal].blurb) || "Goal-aligned training";
  session.equipment = [...new Set(session.blocks.flatMap((block) => block.items.map((ex) => ZONE_LABELS[ex.zone] || ex.zone)))];
  session.estimatedFatigue = session.spec.goal === "strength" ? "High neural / moderate local" : ["conditioning","fatloss"].includes(session.spec.goal) ? "Moderate-high systemic" : session.spec.goal === "recovery" ? "Low" : "Moderate";
  session.blocks.forEach((block) => block.items.forEach((exercise) => {
    exercise.exerciseId = exerciseId(exercise);
    exercise.position = exercisePosition(block);
    exercise.purpose = exercisePurpose(exercise,block,session.spec);
    exercise.substitutionGroup = substitutionGroup(exercise,block);
    exercise.progressionGuidance = progressionGuidance(exercise,block,session.spec);
  }));
  return session;
}
/* Generated sessions always follow a fatigue-aware coaching sequence. Goal
   blending can replace a late block with a different block type, so normalize
   after every generation path instead of trusting the replacement position.
   Stable sorting preserves intentional order among blocks with the same job. */
const SESSION_BLOCK_PRIORITY = {
  warmup: 0,
  primer: 10,
  power: 20,
  plyo: 20,
  strength: 30,
  secondary: 40,
  circuit: 50,
  accessory: 60,
  iso: 70,
  core: 75,
  conditioning: 80,
  finisher: 90,
  mobility: 100,
};
function sessionBlockPriority(block) {
  return Object.prototype.hasOwnProperty.call(SESSION_BLOCK_PRIORITY,block && block.key)
    ? SESSION_BLOCK_PRIORITY[block.key]
    : 65;
}
function normalizeSessionBlockOrder(session) {
  if (!session || !Array.isArray(session.blocks)) return session;
  if (session.manualPhaseOrder === true) return session;
  session.blocks = session.blocks
    .map((block,index) => ({ block,index }))
    .sort((a,b) => sessionBlockPriority(a.block) - sessionBlockPriority(b.block) || a.index - b.index)
    .map((entry) => entry.block);
  return session;
}
function sessionBlockOrderIsValid(session) {
  const blocks = session && session.blocks || [];
  for (let index = 1; index < blocks.length; index += 1) {
    if (sessionBlockPriority(blocks[index]) < sessionBlockPriority(blocks[index - 1])) return false;
  }
  const strengthIndex = blocks.findIndex((block) => block.key === "strength" && block.items && block.items.length);
  if (strengthIndex < 0) return true;
  return blocks.slice(0,strengthIndex).every((block) => ["warmup","primer","power","plyo"].includes(block.key));
}
function auditWorkout(session) {
  enrichSessionMetadata(session);
  const blocks = session && session.blocks || [], spec = session && session.spec || {}, exercises = blocks.flatMap((block) => block.items || []);
  const route = resolvedTrainingRoute(spec), resistance = !["cardio","recovery","mobility"].includes(route);
  const primary = blocks.find((block) => block.key === "strength" && block.items.length);
  const safety = [];
  if (!exercises.length) safety.push("Workout is empty — add movements before coach approval.");
  const safePrimaryAvailable = resistance && eligibleFor(spec).some((exercise) => isPrimaryAnchor(exercise));
  if (safePrimaryAvailable && (!primary || !primary.items.some((exercise) => isPrimaryAnchor(exercise)))) safety.push("Resistance workout needs a categorized primary lift before coach approval.");
  if (session.manual && !blocks.some((block) => block.key === "warmup" && block.items.length)) safety.push("From-scratch workout needs a warm-up before coach approval.");
  exercises.forEach((exercise) => {
    exerciseConstraintIssues(exercise,spec,spec.age).filter((issue) => issue.hard).forEach((issue) => safety.push(exercise.name + ": " + issue.label));
  });
  const powerIndex = blocks.findIndex((block) => ["power","plyo"].includes(block.key)), strengthIndex = blocks.findIndex((block) => block.key === "strength");
  const detail = [
    ["Goal alignment",15,GOALS[spec.goal] ? 15 : 0],
    ["Client fit",15,safety.length ? 0 : 15],
    ["Exercise selection",15,!resistance || (primary && primary.items.some((exercise) => isPrimaryAnchor(exercise))) ? 15 : primary ? 11 : 7],
    ["Session order",10,sessionBlockOrderIsValid(session) && (!blocks.length || ["warmup","primer","conditioning","mobility"].includes(blocks[0].key)) && (powerIndex < 0 || strengthIndex < 0 || powerIndex < strengthIndex) ? 10 : 4],
    ["Volume / intensity",10,session.prescription && session.prescription.reps && session.prescription.rpe ? 10 : 7],
    ["Duration fit",10,exercises.length <= Math.max(5,Math.ceil((Number(spec.minutes) || 60) / 7) + 2) ? 10 : 8],
    ["Recovery context",10,spec.sportSchedule || spec.competitionDate ? 10 : 8],
    ["Progression",5,exercises.every((exercise) => exercise.progressionGuidance) ? 5 : 3],
    ["Coaching clarity",5,exercises.every((exercise) => exercise.cue || exercise.purpose) ? 5 : 3],
    ["Substitutions",5,exercises.every((exercise) => exercise.substitutionGroup) ? 5 : 3],
  ].map(([label,max,score]) => ({ label,max,score }));
  const score = safety.length ? Math.min(79,detail.reduce((sum,item) => sum + item.score,0)) : detail.reduce((sum,item) => sum + item.score,0);
  return { score, pass:score >= PROGRAMMING_POLICY.minimumAuditScore && !safety.length, safety, detail, checkedAt:new Date().toISOString() };
}
function applySavedExerciseProgramming(session) {
  if (!session || !session.spec) return session;
  const profile = session.spec.profileId && loadProfiles().find((item) => item.id === session.spec.profileId);
  const prescriptions = { ...(profile && profile.exercisePrescriptions || {}),...(session.spec.exercisePrescriptions || {}) };
  const substitutions = { ...(profile && profile.exerciseSubstitutions || {}),...(session.spec.exerciseSubstitutions || {}) };
  const phaseDefaults = profile && profile.programPhaseDefaults || {}, phaseAdditions = profile && profile.programPhaseAdditions || {}, exclusions = new Set(profile && profile.exerciseExclusions || []), orderDefaults = profile && profile.programExerciseOrderDefaults || {}, supersetDefaults = profile && profile.programSupersetDefaults || {}, phaseExclusions = new Set(profile && profile.programPhaseExclusions || []), phaseOrder = profile && profile.programPhaseOrder || [];
  session.spec.exercisePrescriptions = prescriptions; session.spec.exerciseSubstitutions = substitutions;
  session.blocks = (session.blocks || []).filter((block) => !phaseExclusions.has(block.key));
  if (phaseOrder.length) { session.blocks.sort((a,b) => { const ai = phaseOrder.indexOf(a.key), bi = phaseOrder.indexOf(b.key); return (ai < 0 ? 999 : ai) - (bi < 0 ? 999 : bi); }); session.manualPhaseOrder = true; }
  (session.blocks || []).forEach((block) => {
    if (phaseDefaults[block.key]) { block.title = phaseDefaults[block.key].title || block.title; block.purpose = phaseDefaults[block.key].purpose || block.purpose; }
    (phaseAdditions[block.key] || []).forEach((savedId) => {
      const addition = LIBRARY.find((item) => exerciseId(item) === savedId);
      if (addition && !(block.items || []).some((item) => item.name === addition.name) && !hardExerciseSafetyIssues(addition,session.spec).length) block.items.push({...addition,rx:{...(addition.rx || block.rx || {})}});
    });
    block.items = (block.items || []).filter((exercise) => exercise.baselineRequired || !exclusions.has(exerciseId(exercise)));
    (block.items || []).slice().forEach((exercise,index) => {
      const replacementId = substitutions[exerciseId(exercise)], replacement = replacementId && LIBRARY.find((item) => exerciseId(item) === replacementId);
      if (replacement && (!exercise.baselineRequired || replacement.pattern === exercise.pattern) && !exerciseConstraintIssues(replacement,session.spec,session.spec.age).some((issue) => issue.hard) && !session.blocks.some((candidate) => candidate.items.some((item) => item !== exercise && item.name === replacement.name))) {
        const retained = {rx:{...(exercise.rx || block.rx || {})},baselineDomains:exercise.baselineDomains,baselineRequired:exercise.baselineRequired,baselinePlanId:exercise.baselinePlanId,baselineSessionNumber:exercise.baselineSessionNumber,baselineProtocol:exercise.baselineProtocol,baselineMeasure:exercise.baselineMeasure,baselineMeasureLabel:exercise.baselineMeasureLabel};
        block.items[index] = {...replacement,...Object.fromEntries(Object.entries(retained).filter(([,value]) => value != null))};
      }
    });
    const savedOrder = orderDefaults[block.key] || [];
    if (savedOrder.length) block.items.sort((a,b) => { const ai = savedOrder.indexOf(exerciseId(a)), bi = savedOrder.indexOf(exerciseId(b)); return (ai < 0 ? 999 : ai) - (bi < 0 ? 999 : bi); });
    rebuildBlockGroups(block);
    const savedPair = supersetDefaults[block.key] || [], first = block.items.find((exercise) => exercise.name === savedPair[0]), second = block.items.find((exercise) => exercise.name === savedPair[1]);
    if (first && second && first !== second) rebuildBlockGroups(block,[first,second],[first.name,second.name]);
    (block.items || []).forEach((exercise) => {
      const saved = prescriptions[exerciseId(exercise)];
      if (saved) { exercise.rx = {...(exercise.rx || block.rx || {}),...saved}; if (saved.cue) exercise.cue = saved.cue; }
    });
  });
  return session;
}
function finalizeGeneratedSession(session) {
  if (!session) return session;
  applySavedExerciseProgramming(session);
  normalizeSessionBlockOrder(session);
  applyBaselinePersonalization(session);
  enrichSessionMetadata(session);
  const consultationNotes = [];
  if (Number(session.spec && session.spec.usualTrainingRpe)) consultationNotes.push("client usually reports training near RPE " + Number(session.spec.usualTrainingRpe));
  if (session.spec && session.spec.coachingPriorities && session.spec.coachingPriorities.length) consultationNotes.push("coach support priorities: " + session.spec.coachingPriorities.join(", ").replace(/_/g," "));
  if (consultationNotes.length) session.rationale = "Trainer Consultation context: " + consultationNotes.join("; ") + ". " + (session.rationale || "");
  session.approval = { status:"draft", required:true, policy:PROGRAMMING_POLICY.approvalMode, generatedAt:new Date().toISOString() };
  session.audit = auditWorkout(session);
  session.internalRationale = "Goal, client fit, exercise order, duration, equipment, history, and substitution purpose were audited before coach review.";
  return session;
}
function markSessionDraft(session,reason) {
  if (!session) return;
  session.approval = { ...(session.approval || {}), status:"draft", required:true, changedAt:new Date().toISOString(), changeReason:reason || "Workout edited" };
  session.audit = auditWorkout(session);
}
function sessionContainingBlock(block) { return workoutPlans(state.session).map((plan) => plan.session).find((session) => (session.blocks || []).includes(block)); }

/* A goal describes the adaptation; the training route describes how the
   client wants to pursue it. "Auto" is deliberately goal-specific so
   conditioning can produce a real cardio session while strength remains a
   resistance session. */
const TRAINING_ROUTES = {
  auto: { title: "Best match for this goal", desc: "Use the route that best fits the primary goal." },
  resistance: { title: "Resistance focused", desc: "Primary lifts, supporting strength, and goal-specific volume." },
  mixed: { title: "Weights + cardio", desc: "Keep a resistance anchor, then add a purposeful aerobic or interval block." },
  cardio: { title: "Cardio focused", desc: "Use a treadmill, stair climber, bike, rower, or other cardio mode as the main work." },
  performance: { title: "Speed + power", desc: "Sprint, jump, throw, change direction, and support it with athletic strength." },
  recovery: { title: "Easy cardio + mobility", desc: "Low-intensity aerobic work followed by mobility and trunk control." },
  mobility: { title: "Mobility only", desc: "Breathing, range of motion, and gentle control without a hard conditioning block." },
};
const GOAL_ROUTE_CHOICES = {
  strength: ["auto","resistance","mixed"],
  hypertrophy: ["auto","resistance","mixed"],
  fatloss: ["auto","mixed","cardio","resistance"],
  general: ["auto","mixed","cardio","resistance"],
  athletic: ["auto","performance","mixed","cardio"],
  conditioning: ["auto","cardio","mixed"],
  recovery: ["auto","recovery","mobility","resistance"],
};
const GOAL_AUTO_ROUTE = {
  strength: "resistance", hypertrophy: "resistance", fatloss: "mixed", general: "mixed",
  athletic: "performance", conditioning: "cardio", recovery: "recovery",
};
const GOAL_ROUTE_EXPLANATIONS = {
  strength: "Strength stays lift-first. The mixed route trims assistance and adds easy cardio after the primary work so the core strength job stays clear.",
  hypertrophy: "Muscle gain stays volume-first. Mixed sessions add short, low-impact cardio after lifting instead of replacing the growth work.",
  fatloss: "The default combines resistance work that helps retain muscle with cardio that raises weekly energy expenditure. Cardio-only and weights-only routes remain available.",
  general: "The default blends strength, aerobic work, and mobility. Choose cardio focused when the client mainly wants treadmill, stairs, bike, rower, or similar training.",
  athletic: "The default trains speed and power while fresh, then strength. A cardio route shifts the three choices toward aerobic base, tempo, and repeat intervals.",
  conditioning: "The three cardio choices become genuinely different: aerobic base, tempo/threshold, and interval work—not three lifting circuits.",
  recovery: "The default uses easy aerobic movement plus mobility. Mobility-only removes conditioning; resistance focused keeps loads light and technique driven.",
};
const CARDIO_MODALITIES = {
  any: { label: "Any available machine", words: [] },
  treadmill: { label: "Treadmill", words: ["treadmill","sprint intervals"] },
  stairs: { label: "Stair climber", words: ["stair climber"] },
  bike: { label: "Bike", words: ["bike"] },
  rower: { label: "Rower", words: ["row intervals","row sprint","rowing sprints","rower"] },
  elliptical: { label: "Elliptical", words: ["elliptical"] },
  ski: { label: "Ski erg", words: ["ski erg"] },
  versaclimber: { label: "VersaClimber", words: ["versaclimber"] },
  hiitmill: { label: "HIITMill", words: ["hiitmill"] },
  jumprope: { label: "Jump rope", words: ["jump rope"] },
};
function resolvedTrainingRoute(spec) {
  const requested = spec && spec.trainingStyle;
  return requested && requested !== "auto" ? requested : (GOAL_AUTO_ROUTE[spec && spec.goal] || "resistance");
}
function cardioModalityFor(ex) {
  if (ex && ex.cardioMode && CARDIO_MODALITIES[ex.cardioMode]) return ex.cardioMode;
  const name = String(ex && ex.name || "").toLowerCase();
  return Object.keys(CARDIO_MODALITIES).find((key) => key !== "any" && CARDIO_MODALITIES[key].words.some((word) => name.includes(word))) || "other";
}
function normalizeCardioPreferences(value) {
  const raw = Array.isArray(value) ? value : value ? [value] : ["any"];
  const valid = [...new Set(raw.filter((key) => CARDIO_MODALITIES[key]))];
  if (!valid.length || valid.includes("any")) return ["any"];
  return valid;
}
function toggleMultiChoiceValue(list,value,allowAny) {
  let next = Array.isArray(list) ? [...list] : [];
  if (allowAny && value === "any") return ["any"];
  next = next.filter((item) => item !== "any");
  next = next.includes(value) ? next.filter((item) => item !== value) : [...next,value];
  return next.length ? next : (allowAny ? ["any"] : []);
}
function multiChoiceButtonsHtml(options,selected,handler) {
  return options.map(([value,label]) => '<button type="button" class="multi-choice-btn' + (selected.includes(value) ? ' on' : '') + '" aria-pressed="' + selected.includes(value) + '" onclick="' + handler + '(\'' + value + '\')">' + escapeHtml(label) + '</button>').join("");
}
function cardioChoiceEntries() { return Object.entries(CARDIO_MODALITIES).map(([value,item]) => [value,item.label]); }
function cardioPreferencesFor(spec) { return normalizeCardioPreferences(spec && (spec.cardioModes || spec.cardioMode)); }
function matchesCardioPreference(ex, preference) {
  const preferences = normalizeCardioPreferences(preference);
  return preferences.includes("any") || preferences.includes(cardioModalityFor(ex));
}
function goalStructureForSpec(spec) {
  const route = resolvedTrainingRoute(spec), goal = spec.goal, option = Math.abs(Number(spec.optionIndex || 0)) % 3;
  if (route === "mobility") return ["warmup","mobility","mobility","core","mobility"];
  if (route === "recovery") return option === 0
    ? ["warmup","conditioning","mobility","mobility"]
    : option === 1 ? ["warmup","mobility","mobility","core"] : ["warmup","light_strength","conditioning","mobility"];
  if (route === "mixed") {
    const mixed = {
      strength:["warmup","power_opt","main_lift","accessory","conditioning"],
      hypertrophy:["warmup","main_lift","accessory","iso","conditioning"],
      fatloss:["warmup","main_lift","circuit","conditioning","conditioning"],
      general:["warmup","main_lift","accessory","conditioning","mobility"],
      athletic:["warmup","plyo","power_opt","main_lift","conditioning"],
      conditioning:["warmup","circuit","conditioning","conditioning"],
      recovery:["warmup","light_strength","conditioning","mobility"],
    };
    return mixed[goal] || GOALS[goal].structure;
  }
  if (route === "performance") return ["warmup","plyo","power_opt","main_lift","accessory","conditioning"];
  if (route === "resistance" && ["fatloss","general","conditioning"].includes(goal)) {
    return goal === "fatloss" ? ["warmup","main_lift","circuit","circuit","core"]
      : goal === "conditioning" ? ["warmup","primer","circuit","circuit","core"]
      : ["warmup","main_lift","main_lift","accessory","core"];
  }
  return GOALS[goal].structure;
}

/* ============================================================
   PRESCRIPTION ENGINE
   Sets/reps/rest = f(goal, experience, age, block type).
   RX_TABLE gives the MAIN-LIFT prescription per goal x experience.
   Age then adjusts it. Other blocks derive from the main lift.
   ============================================================ */
const RX_TABLE = {
  strength: {
    1: { sets: 3, reps: "5\u20136", rest: "2\u20133 min", rpe: "RPE 6\u20137 \u00b7 leave 3\u20134 in reserve, own the technique" },
    2: { sets: 4, reps: "4\u20136", rest: "3 min",     rpe: "RPE 7\u20138 \u00b7 leave 2\u20133 in reserve" },
    3: { sets: 5, reps: "2\u20135", rest: "3\u20135 min", rpe: "RPE 8\u20139 \u00b7 leave 1\u20132 in reserve, top set heavy" },
  },
  hypertrophy: {
    1: { sets: 3, reps: "10\u201312", rest: "75\u201390 sec", rpe: "RPE 6\u20137 \u00b7 leave 3\u20134 in reserve" },
    2: { sets: 4, reps: "8\u201312",  rest: "60\u201390 sec", rpe: "RPE 7\u20138 \u00b7 leave 2\u20133 in reserve" },
    3: { sets: 5, reps: "6\u201312",  rest: "60\u201375 sec", rpe: "RPE 8\u20139 \u00b7 last set within 1\u20132 of failure" },
  },
  fatloss: {
    1: { sets: 2, reps: "12\u201315", rest: "45\u201360 sec", rpe: "RPE 6\u20137 \u00b7 steady, keep moving" },
    2: { sets: 3, reps: "10\u201315", rest: "30\u201345 sec", rpe: "RPE 7\u20138 \u00b7 short rests, stay honest" },
    3: { sets: 4, reps: "10\u201315", rest: "30 sec",     rpe: "RPE 8 \u00b7 high density, minimal rest" },
  },
  general: {
    1: { sets: 2, reps: "10\u201312", rest: "75\u201390 sec", rpe: "RPE 5\u20137 \u00b7 comfortable and repeatable" },
    2: { sets: 3, reps: "8\u201312",  rest: "60\u201375 sec", rpe: "RPE 6\u20138 \u00b7 challenging but sustainable" },
    3: { sets: 4, reps: "6\u201310",  rest: "60\u201390 sec", rpe: "RPE 7\u20138 \u00b7 push the main lifts" },
  },
  athletic: {
    1: { sets: 3, reps: "5\u20136", rest: "90 sec\u20132 min", rpe: "RPE 6\u20137 \u00b7 crisp reps, no grinding" },
    2: { sets: 4, reps: "3\u20136", rest: "2\u20133 min",       rpe: "RPE 7\u20138 \u00b7 speed and quality over grind" },
    3: { sets: 5, reps: "2\u20135", rest: "3 min",           rpe: "RPE 8 \u00b7 max intent, stop when bar speed drops" },
  },
  conditioning: {
    1: { sets: 4, reps: "30s on / 60s off", rest: "as prescribed", rpe: "RPE 6\u20137 \u00b7 finish every round strong" },
    2: { sets: 6, reps: "40s on / 40s off", rest: "as prescribed", rpe: "RPE 7\u20138 \u00b7 pace it, hold output" },
    3: { sets: 8, reps: "45s on / 30s off", rest: "as prescribed", rpe: "RPE 8\u20139 \u00b7 hold output as fatigue builds" },
  },
  recovery: {
    1: { sets: 2, reps: "10\u201312 slow", rest: "as needed", rpe: "RPE 3\u20134 \u00b7 easy, never grind" },
    2: { sets: 2, reps: "10\u201312 slow", rest: "as needed", rpe: "RPE 3\u20135 \u00b7 easy, never grind" },
    3: { sets: 3, reps: "10\u201312 slow", rest: "as needed", rpe: "RPE 4\u20135 \u00b7 restorative, stay well shy of hard" },
  },
};

const TEMPO_BY_GOAL = {
  strength: "controlled down, explode up",
  hypertrophy: "2\u20133s down, 1s up, squeeze",
  fatloss: "smooth and steady",
  general: "controlled both directions",
  athletic: "explosive intent every rep",
  conditioning: "strong and repeatable",
  recovery: "slow and controlled",
};

/* Age adjusts the prescription: older = fewer sets, more rest, capped intensity */
function softenRPE(match, amount) {
  const nums = match.match(/\d+/g).map(Number).map((n) => Math.max(4, n - amount));
  return "RPE " + (nums.length > 1 ? nums[0] + "\u2013" + nums[1] : nums[0]);
}
function bumpRest(rest) {
  if (/as needed|as prescribed/.test(rest)) return rest;
  return rest + " (+15\u201330s)";
}
function ageAdjustRx(rx, age, goal) {
  const out = { ...rx };
  if (age >= 55) {
    out.sets = Math.max(2, rx.sets - 1);
    out.rest = bumpRest(rx.rest);
    out.rpe = rx.rpe.replace(/RPE \d+(\u2013\d+)?/, (m) => softenRPE(m, 2));
  } else if (age >= 45) {
    out.sets = Math.max(2, rx.sets - ((goal === "strength" || goal === "athletic") ? 1 : 0));
    out.rest = bumpRest(rx.rest);
    out.rpe = rx.rpe.replace(/RPE \d+(\u2013\d+)?/, (m) => softenRPE(m, 1));
  }
  return out;
}

/* Per-block prescription derived from the main-lift prescription */
/* The finisher's prescription depends on WHAT KIND of finisher it is. */
function finisherRx(kind, mainRx, goal) {
  if (kind === "pump") {
    return { sets: "2\u20133", reps: "15\u201320, last set to failure", rest: "30\u201345 sec" };
  }
  if (kind === "metcon") {
    return { sets: "3\u20134 rounds", reps: "30\u201340 sec hard / 20\u201330 sec easy", rest: "as prescribed" };
  }
  // core
  return { sets: "2\u20133", reps: "30\u201345 sec or 10\u201312 per side", rest: "30\u201345 sec" };
}

function accessoryReps(goal) {
  if (goal === "strength" || goal === "athletic") return "6\u20138";
  if (goal === "hypertrophy") return "10\u201312";
  if (goal === "fatloss") return "12\u201315";
  if (goal === "recovery") return "10\u201312 slow";
  return "10\u201312";
}
function accessoryRest(goal, age) {
  let base = (goal === "strength" || goal === "athletic") ? "90 sec\u20132 min"
    : goal === "fatloss" ? "30\u201345 sec" : "60\u201375 sec";
  if (age >= 45) base += " (+15s)";
  return base;
}
function blockRx(mainRx, blockKey, goal, age) {
  const s = mainRx.sets;
  switch (blockKey) {
    case "warmup":       return { sets: "1\u20132", reps: "8\u201310 easy / 30\u201360s", rest: "minimal" };
    case "mobility":     return { sets: "1\u20132", reps: "30\u201345s hold or 8\u201310 slow", rest: "minimal" };
    case "power":        return { sets: String(Math.min(5, Math.max(3, s))), reps: "2\u20133", rest: "2\u20133 min" };
    case "plyo":         return { sets: "3", reps: "3\u20135 per side", rest: "60\u201390 sec (full quality)" };
    case "primer":       return { sets: "2", reps: "30\u201345 sec easy", rest: "30 sec" };
    case "strength":     return { sets: String(s), reps: mainRx.reps, rest: mainRx.rest };
    case "secondary":    return { sets: String(Math.max(2, s - 1)), reps: (goal === "strength" || goal === "athletic") ? "6\u20138" : "8\u201312", rest: accessoryRest(goal, age) };
    case "accessory":    return { sets: String(Math.max(2, s - 1)), reps: accessoryReps(goal), rest: accessoryRest(goal, age) };
    case "iso":          return { sets: String(Math.max(2, s - 1)), reps: goal === "hypertrophy" ? "12\u201315" : "10\u201315", rest: "45\u201360 sec" };
    case "circuit":      return { sets: String(Math.max(2, s)), reps: "10\u201315 (or 40s work)", rest: "20\u201330 sec between stations" };
    case "conditioning": return { sets: String(goal === "conditioning" ? s : 4), reps: goal === "conditioning" ? mainRx.reps : "30\u201345s on / equal off", rest: "as prescribed" };
    case "core":         return { sets: "2\u20133", reps: "30\u201345 sec or 10\u201312 per side", rest: "30\u201345 sec" };
    case "finisher":     return { sets: "2\u20133", reps: "to near failure / 30\u201345 sec", rest: "30\u201345 sec" };
    default:             return { sets: String(s), reps: mainRx.reps, rest: mainRx.rest };
  }
}

const WARMUP_STAGE_DETAILS = Object.freeze({
  raise: {
    label: "1 · Raise",
    explanation: "Increase temperature and breathing gradually.",
    why: "Raise temperature and circulation without creating fatigue.",
    rx: { sets:"1",reps:"3–5 min easy",rest:"minimal" },
  },
  open: {
    label: "2 · Open",
    explanation: "Move the joints needed today through a controlled, comfortable range.",
    why: "Open the range needed for today’s main patterns without forcing a stretch.",
    rx: { sets:"1",reps:"6–8 controlled per side",rest:"minimal" },
  },
  activate: {
    label: "3 · Activate",
    explanation: "Switch on the stabilizers and brace used in the working sets.",
    why: "Activate the stabilizers and bracing pattern used in the workout.",
    rx: { sets:"1–2",reps:"8–12 quality reps",rest:"20–30 sec" },
  },
  rehearse: {
    label: "4 · Rehearse",
    explanation: "Practice the first compound with light ramp sets before working weight.",
    why: "Rehearse the primary lift and confirm pain-free technique before loading it.",
    rx: { sets:"2–4 ramp sets",reps:"3–5 reps",rest:"30–60 sec" },
  },
  downshift: {
    label: "Downshift",
    explanation: "Lower breathing first, then restore comfortable range.",
    why: "Lower the session intensity gradually and finish in a comfortable range.",
    rx: { sets:"1",reps:"3–5 min easy / 30–45 sec",rest:"minimal" },
  },
});
function warmupExercise(exercise,stage) {
  const detail = WARMUP_STAGE_DETAILS[stage] || WARMUP_STAGE_DETAILS.activate;
  return { ...exercise,warmupStage:stage,warmupStageLabel:detail.label,warmupStageExplanation:detail.explanation,warmupRx:{ ...detail.rx } };
}

const ZONE_LABELS = {
  cardio: "Cardio", platform: "Platform", rack: "Rack", crossfit: "CrossFit",
  dumbbell: "Free weights", machine: "Machine", cable: "Cable", bodyweight: "Bodyweight",
};

/* ============================================================
   SUPERSET / STATION ETIQUETTE
   A busy gym floor cannot spare 4-5 stations for one client. Supersets are
   only allowed where a single station supports multiple movements:
     - dumbbell : a bench + a pair of DBs covers many exercises
     - cable    : one stack, swap attachments
     - rack     : one rack/barbell, swap the movement
     - bodyweight: needs no station at all
   Machines and cardio equipment are each their own station and are NEVER
   superset together \u2014 that ties up gear other members are waiting on.
   ============================================================ */
const SUPERSET_ZONES = ["dumbbell", "cable", "rack", "bodyweight"];
/* Zones that hog dedicated equipment and must stay as straight sets. */
const NO_SUPERSET_ZONES = ["machine", "cardio", "platform", "crossfit"];

function canSuperset(ex) { return SUPERSET_ZONES.includes(ex.zone); }

/* Two exercises may be paired only if they occupy the SAME single station:
   two dumbbell moves (one bench + DBs), two cable moves (one stack), two rack
   moves (one barbell). A bodyweight move needs no station, so it can tuck into
   any pairing. Different stations never pair \u2014 that would tie up two spots. */
function pairable(a, b) {
  if (!canSuperset(a) || !canSuperset(b)) return false;
  if (a.primary && b.primary) return false;                 // do not fatigue two major anchors together
  if (a.zone === b.zone) return true;                       // same station
  return a.zone === "bodyweight" || b.zone === "bodyweight"; // one needs nothing
}

/* Group a block's exercises into supersets of at most 2, honoring the rules.
   We deliberately keep supersets OCCASIONAL and courteous: at most one or two
   pairs per block, and only when two movements genuinely share one station.
   Everything else stays a straight set. Returns [{type, items}]. */
function buildSupersets(items, maxPairs) {
  const groups = [];
  const remaining = [...items];
  let pairsMade = 0;
  const cap = (maxPairs == null) ? 2 : maxPairs;
  while (remaining.length) {
    const first = remaining.shift();
    if (pairsMade >= cap || !canSuperset(first)) {
      groups.push({ type: "straight", items: [first] });
      continue;
    }
    // prefer a SAME-zone partner (true shared station) over a bodyweight tuck-in
    let idx = remaining.findIndex((e) => e.zone === first.zone && canSuperset(e));
    if (idx < 0) idx = remaining.findIndex((e) => pairable(first, e));
    if (idx >= 0) {
      const partner = remaining.splice(idx, 1)[0];
      groups.push({ type: "superset", items: [first, partner], station: stationLabel(first, partner) });
      pairsMade++;
    } else {
      groups.push({ type: "straight", items: [first] });
    }
  }
  return groups;
}

/* Human label for where the superset happens, e.g. "at the dumbbell bench". */
function stationLabel(a, b) {
  const z = a.zone !== "bodyweight" ? a.zone : b.zone;
  return z === "dumbbell" ? "one dumbbell station"
    : z === "cable" ? "one cable station"
    : z === "rack" ? "one rack / barbell"
    : "no equipment needed";
}

const INJURY_LABELS = {
  knee: "Knee", shoulder: "Shoulder", lowback: "Lower back", wrist: "Wrist",
  hip: "Hip", elbow: "Elbow", ankle: "Ankle", neck: "Neck",
  foot: "Foot / toes", handgrip: "Hand / grip", thoracic: "Upper back / ribs", abdominal: "Abdominal wall",
  pregnancy: "Pregnancy / postpartum", postpartum: "Postpartum return",
  balance: "Balance / fall risk", pelvicfloor: "Pelvic-floor symptoms", medicalhold:"Medical / clinician hold",
  noimpact: "Avoid impact", noballistic: "Avoid explosive / ballistic work", nooverhead: "Avoid overhead work",
  nodeepknee: "Limit deep knee bend", nodeephip: "Limit deep hip bend", nohinge: "Avoid hip hinging",
  noaxialload: "Avoid spinal / axial loading", nospinalflexion: "Avoid spinal flexion",
  nospinalextension: "Avoid spinal extension", norotation: "Avoid loaded rotation",
  nogrip: "Avoid loaded gripping", nosingleleg: "Avoid single-leg / balance work",
  nofloor: "Avoid floor transfers", nosupine: "Avoid flat-on-back positions",
  noprone: "Avoid face-down / plank positions", nostraining: "Avoid high bracing / pressure",
  lowintensity: "Low-intensity training only",
};
const BODY_AREA_LIMITATIONS = ["knee","shoulder","lowback","wrist","hip","elbow","ankle","neck","foot","handgrip","thoracic","abdominal"];
const MOVEMENT_RESTRICTIONS = ["noimpact","noballistic","nooverhead","nodeepknee","nodeephip","nohinge","noaxialload","nospinalflexion","nospinalextension","norotation","nogrip","nosingleleg","nofloor","nosupine","noprone","nostraining","lowintensity"];
const LIFE_STAGE_LIMITATIONS = ["pregnancy","postpartum","balance","pelvicfloor","medicalhold"];
const COMMON_BODY_LIMITATIONS = ["knee","shoulder","lowback","wrist","hip","elbow","ankle","neck","handgrip"];
const COMMON_SPECIAL_LIMITATIONS = ["pregnancy","balance","noimpact","medicalhold","nohinge","nooverhead"];
const COMMON_LIMITATIONS = [...COMMON_BODY_LIMITATIONS,...COMMON_SPECIAL_LIMITATIONS];
const PAIN_LEVELS = {
  green:{rank:0,label:"Green · No pain",color:"#55c98a",legacy:"none",action:"Continue as planned. Keep normal technique and range."},
  yellow:{rank:1,label:"Yellow · Mild awareness; movement normal",color:"#e4c85b",legacy:"mild",action:"Reduce load, range, speed, or complexity if helpful. Movement must stay normal. Monitor it and tell the trainer."},
  orange:{rank:2,label:"Orange · Movement changed",color:"#ed9448",legacy:"changed",action:"Stop that exercise. Use a pain-free substitute only; the trainer must review the report before the next workout."},
  red:{rank:3,label:"Red · Severe, sharp, or worsening",color:"#e86666",legacy:"stopped",action:"End the workout. Do not test the painful movement again today; seek appropriate qualified evaluation."},
};
const LEGACY_PAIN_LEVELS = {none:"green",mild:"yellow",changed:"orange",stopped:"red","0":"green","1":"yellow","2":"orange","3":"red"};
function normalizePainLevel(value,movementChanged) {
  let key = PAIN_LEVELS[value] ? value : LEGACY_PAIN_LEVELS[String(value)] || "green";
  if (movementChanged === true || movementChanged === "yes") {
    if (PAIN_LEVELS[key].rank < PAIN_LEVELS.orange.rank) key = "orange";
  }
  return key;
}
function painLevelInfo(value,movementChanged) { return PAIN_LEVELS[normalizePainLevel(value,movementChanged)]; }
function painRequiresSafetyHold(value,movementChanged) { return painLevelInfo(value,movementChanged).rank >= PAIN_LEVELS.orange.rank; }
function painNeedsCoachNotice(value) { return painLevelInfo(value).rank > PAIN_LEVELS.green.rank; }
function legacyPainValue(value,movementChanged) { return painLevelInfo(value,movementChanged).legacy; }
function painLocationOptions(includeBlank) {
  return [...(includeBlank ? [["","Choose an area…"]] : []),...BODY_AREA_LIMITATIONS.map((key) => [key,INJURY_LABELS[key]])];
}
const LIMITATION_SEVERITY = {
  mild:{rank:1,label:"Mild / occasional"},
  moderate:{rank:2,label:"Moderate / needs modification"},
  severe:{rank:3,label:"Severe, worsening, or movement-changing"},
};
function normalizedLimitationAssessment(value) {
  const item = value && typeof value === "object" ? value : {};
  return {
    severity:LIMITATION_SEVERITY[item.severity] ? item.severity : "moderate",
    ability:["normal","modified","cannot"].includes(item.ability) ? item.ability : "modified",
    decision:["avoid","modified","allow","hold"].includes(item.decision) ? item.decision : "avoid",
    note:String(item.note || ""),reviewedAt:item.reviewedAt || "",reviewedBy:item.reviewedBy || "",
  };
}
function limitationAssessmentFor(spec,tag) { return normalizedLimitationAssessment(spec && spec.limitationAssessments && spec.limitationAssessments[tag]); }
function limitationIsAbsoluteHold(spec,tag) {
  const assessment = limitationAssessmentFor(spec,tag);
  return tag === "medicalhold" || assessment.decision === "hold" || assessment.severity === "severe" || assessment.ability === "cannot";
}
function exerciseOverrideCovers(exercise,tag) {
  const override = exercise && exercise.safetyOverride;
  return Boolean(override && override.active !== false && Array.isArray(override.limitations) && override.limitations.includes(tag) && override.reason && override.approvedBy && override.approvedAt);
}
function exerciseGeneralOverrideCovers(exercise,code) {
  const override = exercise && exercise.safetyOverride;
  return Boolean(override && override.active !== false && Array.isArray(override.codes) && override.codes.includes(code) && override.reason && override.approvedBy && override.approvedAt);
}
const LIMITATION_RULES = {
  knee:{demands:["deep_knee_flexion","impact","ballistic"]},
  shoulder:{demands:["overhead","hanging","shoulder_extension"]},
  lowback:{demands:["axial_load","unsupported_torso","spinal_flexion","spinal_extension","spinal_rotation"]},
  wrist:{demands:["wrist_extension","front_rack"]},
  hip:{demands:["deep_hip_flexion","ballistic"]},
  ankle:{demands:["impact","ballistic"]},
  foot:{demands:["impact","ballistic","repetitive_step"]},
  handgrip:{demands:["loaded_grip","hanging","loaded_carry"]},
  thoracic:{demands:["axial_load","unsupported_torso","spinal_rotation"]},
  abdominal:{demands:["high_abdominal_pressure","spinal_flexion"]},
  pregnancy:{demands:["impact","ballistic","supine","prone","high_abdominal_pressure"],maxImpact:1},
  postpartum:{demands:["impact","ballistic","high_abdominal_pressure"],maxImpact:1},
  balance:{demands:["balance_challenge","single_leg","ballistic","impact"]},
  pelvicfloor:{demands:["impact","ballistic","high_abdominal_pressure"]},
  medicalhold:{blockAll:true},
  noimpact:{demands:["impact"],maxImpact:0},
  noballistic:{demands:["ballistic"]},
  nooverhead:{demands:["overhead","hanging"]},
  nodeepknee:{demands:["deep_knee_flexion"]},
  nodeephip:{demands:["deep_hip_flexion"]},
  nohinge:{demands:["hip_hinge"]},
  noaxialload:{demands:["axial_load"]},
  nospinalflexion:{demands:["spinal_flexion"]},
  nospinalextension:{demands:["spinal_extension"]},
  norotation:{demands:["spinal_rotation"]},
  nogrip:{demands:["loaded_grip","hanging","loaded_carry"]},
  nosingleleg:{demands:["single_leg","balance_challenge"]},
  nofloor:{demands:["floor_transfer"]},
  nosupine:{demands:["supine"]},
  noprone:{demands:["prone"]},
  nostraining:{demands:["high_abdominal_pressure"]},
  lowintensity:{demands:["impact","ballistic"],maxImpact:0,blockFinishers:true},
};

/* How many working exercises fit in the time (excludes warm-up)?
   Grounded in real math: a set + its rest is ~1.5 min at short rest, ~3 min at
   long rest. 30 min minus a ~6 min warm-up leaves ~24 min of work. We keep the
   count honest so a short session is DENSE, not rushed. */
const SLOTS_BY_TIME = { 30: 3, 45: 5, 60: 7, 90: 10 };

/* Time pressure also compresses the prescription. A 30-minute session earns its
   keep by cutting a set and tightening rest, not by cramming in more exercises. */
const TIME_PROFILE = {
  30: { setDelta: -1, restScale: 0.7, note: "Short session \u2014 fewer exercises, one less set, tighter rest. Density over volume." },
  45: { setDelta: 0,  restScale: 0.85, note: "" },
  60: { setDelta: 0,  restScale: 1.0, note: "" },
  90: { setDelta: 1,  restScale: 1.0, note: "Long session \u2014 extra set and extra accessory volume." },
};

/* Turn a rest string into an approximate number of MINUTES (midpoint). */
function restToMinutes(rest) {
  if (/as needed|as prescribed|minimal/.test(rest)) return 0.5;
  const base = rest.replace(/\s*\(.*\)$/, "");
  const nums = (base.match(/\d+/g) || []).map(Number);
  if (!nums.length) return 1;
  const mid = nums.length > 1 ? (nums[0] + nums[1]) / 2 : nums[0];
  return /min/.test(base) ? mid : mid / 60;
}

/* Scale a human-readable rest string ("60\u201390 sec", "3\u20135 min") by a factor. */
function scaleRest(rest, factor) {
  if (factor === 1 || /as needed|as prescribed|minimal/.test(rest)) return rest;
  // strip any previously appended parenthetical
  const base = rest.replace(/\s*\(.*\)$/, "");
  const isMin = /min/.test(base);
  const nums = base.match(/\d+/g);
  if (!nums) return rest;
  const scaled = nums.map((n) => {
    let v = Math.round(Number(n) * factor);
    if (isMin) { v = Math.max(1, v); }
    else { v = Math.max(15, Math.round(v / 5) * 5); }   // snap seconds to 5s
    return v;
  });
  const unit = isMin ? " min" : " sec";
  if (scaled.length > 1) {
    // Never collapse a range to "20\u201320" \u2014 if the floor squashed them together,
    // either widen by one step or print a single value.
    if (scaled[1] <= scaled[0]) {
      const step = isMin ? 1 : 10;
      scaled[1] = scaled[0] + step;
    }
    return scaled[0] + "\u2013" + scaled[1] + unit;
  }
  return scaled[0] + unit;
}

/* patterns that count as compound multi-joint lifts (for main-lift selection) */
const COMPOUND_PATTERNS = ["squat", "hinge", "lunge", "h_push", "v_push", "h_pull", "v_pull", "olympic"];
/* isolation-ish exercise names that should never be a "main lift" */
const ISO_NAMES = [
  // arms
  "Dumbbell curl","Cable curl","Incline dumbbell curl","Hammer curl","Preacher curl",
  "Triceps pushdown","Overhead triceps extension","Cable overhead triceps extension","Skull crusher",
  // shoulders / upper back
  "Lateral raise","Cable lateral raise","Face pull","Rear delt fly","Reverse pec deck",
  "Straight-arm pulldown","Barbell shrug",
  // chest
  "Cable chest fly",
  // legs
  "Calf raise","Seated calf raise","Standing calf raise (single-leg)",
  "Leg extension","Seated hamstring curl","Nordic hamstring curl","Sissy squat",
  "Glute bridge","Cable pull-through",
  // core-ish loadable iso
  "Cable crunch",
];

/* A primary lift is an anchor the workout can be organized around—not merely
   the hardest movement in a list. This keeps skill/accessory movements such as
   archer push-ups, dips, leg extensions, curls, and back extensions out of the
   highlighted main-lift slot. */
function isPrimaryAnchor(ex) {
  if (!ex || ex.finisher === true || ex.region === "mobility" || ISO_NAMES.includes(ex.name)) return false;
  const name = ex.name.toLowerCase();
  if (ex.pattern === "squat") return /squat/.test(name);
  if (ex.pattern === "hinge") return /deadlift|\brdl\b|romanian deadlift/.test(name);
  if (ex.pattern === "lunge") return /lunge|split squat/.test(name);
  if (ex.pattern === "h_push") return /bench press|incline dumbbell press|floor press/.test(name);
  if (ex.pattern === "v_push") return /overhead press|barbell press|dumbbell press|shoulder press|landmine press/.test(name);
  if (ex.pattern === "h_pull") return /row/.test(name);
  if (ex.pattern === "v_pull") return /pull-up|chin-up/.test(name);
  if (ex.pattern === "carry") return true;
  if (["core","rotation"].includes(ex.pattern)) return !name.includes("throw") && /pallof|ab wheel|rollout|landmine rotation|cable chop|cable lift|woodchop|rotation/.test(name);
  return ex.pattern === "olympic";
}
function primaryAnchorFamily(ex) {
  if (!ex) return "lead";
  const name = ex.name.toLowerCase();
  if (["squat","hinge","lunge"].includes(ex.pattern)) return ex.pattern;
  if (ex.pattern === "h_push") {
    if (name.includes("incline")) return "incline-bench";
    if (name.includes("decline")) return "decline-bench";
    return "flat-bench";
  }
  if (ex.pattern === "v_push") return "overhead-press";
  if (ex.pattern === "v_pull") return "pull-up";
  if (ex.pattern === "h_pull") return /chest-supported|seal row/.test(name) ? "supported-row" : "row";
  if (["core","carry","rotation"].includes(ex.pattern)) return "trunk-strength";
  return ex.pattern || "lead";
}
/* A broad movement family is intentionally coarser than the highlighted
   primary-lift family. Flat, incline, pause, and decline bench presses are all
   one bench stimulus for session-design purposes. This prevents a workout from
   looking varied on paper while repeating the same job five different ways. */
function movementFamily(ex) {
  if (!ex) return "other";
  const name = ex.name.toLowerCase();
  if (/bench press|incline dumbbell press|floor press|larsen press|machine chest press/.test(name)) return "bench";
  if (/\bdip\b/.test(name)) return "dip";
  if (/push-up/.test(name)) return "push-up";
  if (/chest fly|cable fly/.test(name)) return "chest-fly";
  if (/overhead press|shoulder press|seated dumbbell press|standing dumbbell press|arnold press|z-press|landmine press|half-kneeling cable press/.test(name)) return "overhead-press";
  if (/lateral raise/.test(name)) return "lateral-raise";
  if (/triceps|skull crusher/.test(name)) return "triceps-isolation";
  if (/curl/.test(name) && !/leg curl|hamstring curl/.test(name)) return "biceps-isolation";
  if (ex.pattern === "h_pull" && /row/.test(name)) return "row";
  if (ex.pattern === "v_pull" || /pull-up|chin-up|pulldown/.test(name)) return "vertical-pull";
  if (ex.pattern === "squat") return /calf|extension|sissy/.test(name) ? "knee-isolation" : "squat";
  if (ex.pattern === "hinge") return /leg curl|hamstring curl|nordic/.test(name) ? "hamstring-isolation" : "hinge";
  if (ex.pattern === "lunge") return "lunge";
  if (["core","rotation","carry"].includes(ex.pattern)) return ex.pattern;
  if (["plyo","olympic","conditioning","mobility"].includes(ex.pattern)) return ex.pattern;
  return ex.pattern || "other";
}
function movementFamilyLimit(family) {
  const limits = {
    bench: 1, dip: 1, "push-up": 1, "chest-fly": 1, "overhead-press": 1,
    "lateral-raise": 1, "triceps-isolation": 1, "biceps-isolation": 1,
    row: 2, "vertical-pull": 1, squat: 1, hinge: 1, lunge: 1,
    "knee-isolation": 1, "hamstring-isolation": 1,
  };
  return limits[family] == null ? 2 : limits[family];
}
function withinMovementFamilyLimit(ex, selected) {
  const family = movementFamily(ex), count = selected.filter((item) => movementFamily(item) === family).length;
  if (count >= movementFamilyLimit(family)) return false;
  const pressFamilies = ["bench","overhead-press","dip","push-up","h_push","v_push"];
  if (pressFamilies.includes(family) && selected.filter((item) => pressFamilies.includes(movementFamily(item))).length >= 3) return false;
  return true;
}
function complementaryPrimaryPatterns(primary, targets) {
  if (!primary) return [];
  const map = {
    h_push: ["v_push"], v_push: ["h_push"],
    h_pull: ["v_pull"], v_pull: ["h_pull"],
    squat: ["hinge","lunge"], hinge: ["squat","lunge"], lunge: ["squat","hinge"],
  };
  const patterns = map[primary.pattern] || [];
  return patterns.filter((pattern) => {
    if (pattern === "v_push") return !targets.length || targets.includes("shoulders");
    return true;
  });
}
const OPTION_ARCHITECTURES = [
  {
    id: "focused", title: "Heavy + focused", short: "Straight sets · one core lift · one complementary strength pattern",
    description: "Prioritizes the core lift while fresh, then adds one complementary strength movement and targeted assistance without repeating the same lift family.",
  },
  {
    id: "volume", title: "Volume + supersets", short: "Moderate-load volume · same-station pairings · balanced muscle coverage",
    description: "Keeps one core lift, then uses efficient same-station pairings and isolation work to build volume without stacking redundant presses, rows, or squat variations.",
  },
  {
    id: "athletic", title: "Power + athletic density", short: "Explosive work first · one core lift · unilateral, trunk, and density work",
    description: "Places fast, low-fatigue work before the core lift, then shifts to stability and a short athletic finish instead of another near-identical strength workout.",
  },
];
const CARDIO_ARCHITECTURES = [
  { id:"aerobic", title:"Aerobic base", short:"Continuous conversational work · sustainable pace · low fatigue", description:"Builds aerobic capacity with one continuous, repeatable effort that stays controlled enough to speak in short sentences." },
  { id:"tempo", title:"Tempo / threshold", short:"Longer controlled efforts · easy recovery · pace discipline", description:"Uses repeatable work bouts near a comfortably hard pace, with enough easy recovery to keep output consistent." },
  { id:"intervals", title:"Intervals", short:"Short hard efforts · programmed recovery · repeatable output", description:"Alternates purposeful hard efforts with enough recovery to preserve technique and avoid turning every round into a fade." },
];
const RECOVERY_ARCHITECTURES = [
  { id:"recovery-aerobic", title:"Easy aerobic reset", short:"Low-intensity cardio · nasal-breathing pace · mobility finish", description:"Uses gentle machine work to raise circulation, then restores comfortable range of motion without chasing fatigue." },
  { id:"mobility-reset", title:"Mobility reset", short:"Range of motion · breathing · trunk control", description:"Removes hard conditioning and centers the session on mobility, breathing, and controlled trunk work." },
  { id:"light-technique", title:"Light movement practice", short:"Easy strength pattern · gentle cardio · mobility", description:"Keeps one low-impact strength pattern for confidence and technique, followed by easy aerobic work and mobility." },
];
function optionArchitectureForSpec(spec) {
  const route = resolvedTrainingRoute(spec), index = Math.abs(Number(spec.optionIndex || 0)) % 3;
  if (route === "cardio") return CARDIO_ARCHITECTURES[index];
  if (route === "recovery" || route === "mobility") return RECOVERY_ARCHITECTURES[index];
  const base = OPTION_ARCHITECTURES[index];
  const goals = Array.isArray(spec.goals) ? spec.goals : [spec.goal];
  if (base.id === "athletic" && !goals.includes("athletic")) {
    return { ...base, title: "Stability + density", short: "One core lift · unilateral control · trunk work · efficient finish", description: "Keeps the core lift, then changes the training problem with unilateral control, trunk stability, and efficient support work instead of repeating the same compound family." };
  }
  return base;
}
function optionStrategyForSpec(spec) {
  const index = Number(spec.optionIndex || 0) % 3, targets = spec.muscles || [], area = targetArea(targets), pp = targetPushPull(targets);
  if (area === "lower") return [{ pattern:"squat",style:"squat" },{ pattern:"hinge",style:"deadlift" },{ pattern:"lunge",style:"lunge" }][index];
  if (pp === "push" && targets.includes("chest")) return [{ pattern:"h_push",style:"flat-bench" },{ pattern:"h_push",style:"incline-bench" },{ pattern:"h_push",style:"decline-bench" }][index];
  if (pp === "push") return [{ pattern:"v_push",style:"overhead-press" },{ pattern:"h_push",style:"flat-bench" },{ pattern:"v_push",style:"angled-press" }][index];
  if (pp === "pull") return [{ pattern:"h_pull",style:"row" },{ pattern:"v_pull",style:"pull-up" },{ pattern:"h_pull",style:"supported-row" }][index];
  return [{ pattern:"squat",style:"squat" },{ pattern:"hinge",style:"deadlift" },{ pattern:"h_push",style:"flat-bench" }][index];
}
function primaryAnchorRank(ex, spec, useStrategy) {
  if (!isPrimaryAnchor(ex)) return -1000;
  const name = ex.name.toLowerCase(), strategy = optionStrategyForSpec(spec), family = primaryAnchorFamily(ex); let score = 50;
  if (name === "barbell back squat") score = 130;
  else if (name === "barbell front squat") score = 126;
  else if (/pause back squat|tempo front squat/.test(name)) score = 118;
  else if (/conventional deadlift|trap bar deadlift/.test(name)) score = 115;
  else if (/barbell bench press|dumbbell bench press/.test(name)) score = 112;
  else if (/bench press|incline dumbbell press/.test(name)) score = 108;
  else if (/weighted pull-up|weighted chin-up/.test(name)) score = 108;
  else if (/pull-up|chin-up|barbell bent row|pendlay row|t-bar row/.test(name)) score = 100;
  else if (/deadlift|\brdl\b|romanian deadlift|lunge|split squat|squat|\brow\b/.test(name)) score = 90;
  if (!useStrategy) return score;
  if (ex.pattern === strategy.pattern) score += 180;
  if (family === strategy.style) score += 90;
  if (strategy.style === "angled-press" && (name.includes("landmine") || name.includes("incline"))) score += 90;
  return score;
}
function pickPrimaryAnchor(pool, patterns, used, rng, spec, emphasis, useStrategy) {
  let candidates = pool.filter((ex) => isPrimaryAnchor(ex) && !used.has(ex.name) && (!patterns || !patterns.length || patterns.includes(ex.pattern)));
  const targets = spec.muscles || [];
  if (targets.length) candidates = candidates.filter((ex) => muscleAllowed(ex,targets));
  if (!candidates.length) return null;
  const biased = biasSort(candidates,targets,rng,spec.experience,emphasis).sort((a,b) => primaryAnchorRank(b,spec,useStrategy) - primaryAnchorRank(a,spec,useStrategy) || expScore(b,spec.experience) - expScore(a,spec.experience) || a.name.localeCompare(b.name));
  const strategy = optionStrategyForSpec(spec), tolerance = useStrategy && /bench/.test(strategy.style) ? 3 : 8;
  const best = primaryAnchorRank(biased[0],spec,useStrategy), peers = biased.filter((ex) => primaryAnchorRank(ex,spec,useStrategy) >= best - tolerance).slice(0,4);
  const seedIndex = Math.abs((rng.initialSeed || 1) + used.size * 17) % peers.length;
  const chosen = peers[seedIndex] || biased[0]; used.add(chosen.name); return chosen;
}

/* muscle groups + the quick-pick regions that expand into them */
const MUSCLES = ["chest","back","shoulders","quads","hamstrings","glutes","arms","calves","core"];
const REGION_MUSCLES = {
  push: ["chest","shoulders","arms"],
  pull: ["back","arms"],
  legs: ["quads","hamstrings","glutes","calves"],
  core: ["core"],
  full: [...MUSCLES],
};
const MUSCLE_LABELS = {
  chest:"Chest", back:"Back", shoulders:"Shoulders", quads:"Quads",
  hamstrings:"Hamstrings", glutes:"Glutes", arms:"Arms", calves:"Calves", core:"Core",
};

/* does an exercise hit any of the targeted muscles? and how strongly (# of matches) */
function muscleScore(ex, targets) {
  if (!targets || !targets.length) return 0;
  if (!ex.muscles) return 0;
  let s = 0;
  ex.muscles.forEach((m) => { if (targets.includes(m)) s++; });
  return s;
}

/* ============================================================
   MUSCLE RELEVANCE GATE + SESSION COHERENCE
   Two rules the engine now enforces on every WORKING block:
     1. GATE  - if the trainer picked muscles, an exercise must actually
                train at least one of them. No push presses on leg day.
     2. COHERENCE - accessories should reinforce the muscles the main lifts
                already hit, so the session compounds instead of scattering.
   ============================================================ */

/* The PRIME MOVER is the first muscle listed for an exercise. The library is
   authored so the primary target leads (e.g. "Meadows row" -> back first).
   This lets us say "a row is a BACK movement" even though it also trains arms. */
function primeMover(ex) {
  return (ex.muscles && ex.muscles.length) ? ex.muscles[0] : null;
}

/* What fraction of an exercise's muscles are on-target?
   1.0 = every muscle it trains is a target (a pure leg movement on leg day).
   Used to prefer focused movements over ones that spray effort elsewhere. */
function purity(ex, targets) {
  const m = ex.muscles || [];
  if (!m.length || !targets || !targets.length) return 0;
  const hits = m.filter((x) => targets.includes(x)).length;
  return hits / m.length;
}

/* HARD GATE: is this exercise allowed in a working block given the targets?
   It isn't enough to merely touch a target muscle -- a push press touches glutes
   but is 2/3 a shoulder movement. We require that the MAJORITY of what the
   exercise trains is on-target (purity >= 0.5), OR that it hits at least two
   target muscles (a true compound for this session).
   Core/mobility/conditioning blocks bypass this via gate=false. */
function muscleAllowed(ex, targets) {
  if (!targets || !targets.length) return true;      // no target = anything goes
  const hits = muscleScore(ex, targets);
  if (hits === 0) return false;
  // The exercise's PRIME MOVER must be a targeted muscle. This is what stops
  // "arms" from dragging rows and pull-ups onto a chest/shoulders push day:
  // a row's prime mover is BACK, which isn't targeted.
  const pm = primeMover(ex);
  if (pm && !targets.includes(pm)) {
    // Lower-body anchor lifts are intentionally allowed to bridge closely
    // related leg targets when at least half their work still serves the day.
    // Example: a dumbbell RDL remains a valid glute-focused hinge option even
    // if the trainer selected quads + glutes but did not also tap hamstrings.
    if (!(isPrimaryAnchor(ex) && bodyArea(ex) === "lower" && purity(ex,targets) >= 0.5)) return false;
  }
  // and the majority of its work should be on-target
  return purity(ex, targets) >= 0.5;
}

/* TARGET BALANCE: among the muscles the trainer picked, which are still
   under-trained in this session? Accessories prefer those, so a chest/shoulder/
   arms day doesn't become nine curls. */
function underServed(targets, emphasis) {
  if (!targets || !targets.length) return [];
  const counts = targets.map((m) => [m, emphasis[m] || 0]);
  const min = Math.min(...counts.map((c) => c[1]));
  return counts.filter((c) => c[1] <= min + 1).map((c) => c[0]);
}
/* score: does this exercise train a target muscle that's lagging behind? */
function balanceScore(ex, targets, emphasis) {
  if (!targets || !targets.length) return 0;
  const lagging = underServed(targets, emphasis);
  const m = ex.muscles || [];
  return m.filter((x) => lagging.includes(x)).length;
}

/* COHERENCE: build the "emphasis" set from what the session has already
   selected. Accessories then prefer exercises that reinforce that emphasis. */
function emphasisOf(items) {
  const counts = {};
  items.forEach((e) => (e.muscles || []).forEach((m) => { counts[m] = (counts[m] || 0) + 1; }));
  return counts;
}
/* How well does this exercise reinforce what we've already trained? */
function coherenceScore(ex, emphasis) {
  const m = ex.muscles || [];
  if (!m.length) return 0;
  let s = 0;
  m.forEach((mm) => { s += (emphasis[mm] || 0); });
  return s / m.length;   // average reinforcement per muscle it trains
}

/* Which broad body area is this exercise? Used to keep upper/lower coherent. */
function bodyArea(ex) {
  const m = ex.muscles || [];
  const lower = ["quads", "hamstrings", "glutes", "calves"];
  const upper = ["chest", "back", "shoulders", "arms"];
  const hasLower = m.some((x) => lower.includes(x));
  const hasUpper = m.some((x) => upper.includes(x));
  if (hasLower && !hasUpper) return "lower";
  if (hasUpper && !hasLower) return "upper";
  if (hasLower && hasUpper) return "mixed";
  return "core";
}

/* PUSH vs PULL, decided by movement PATTERN (not muscle), so that "arms"
   can't bridge a chest day into rows or a back day into bench press. */
const PUSH_PATTERNS = ["h_push", "v_push"];
const PULL_PATTERNS = ["h_pull", "v_pull"];
function pushPull(ex) {
  if (PUSH_PATTERNS.includes(ex.pattern)) return "push";
  if (PULL_PATTERNS.includes(ex.pattern)) return "pull";
  return null;
}
/* If the targets are clearly a push day or a pull day, lock the pattern family.
   chest/shoulders -> push. back -> pull. arms alone is ambiguous (allow both). */
function targetPushPull(targets) {
  if (!targets || !targets.length) return null;
  const pushMuscles = targets.filter((m) => ["chest", "shoulders"].includes(m)).length;
  const pullMuscles = targets.filter((m) => ["back"].includes(m)).length;
  if (pushMuscles && !pullMuscles) return "push";
  if (pullMuscles && !pushMuscles) return "pull";
  return null;   // both, or arms-only: no lock
}
/* If the targets are all lower (or all upper), we know the session's area. */
function targetArea(targets) {
  if (!targets || !targets.length) return null;
  const lower = ["quads", "hamstrings", "glutes", "calves"];
  const upper = ["chest", "back", "shoulders", "arms"];
  const allLower = targets.every((m) => lower.includes(m) || m === "core");
  const allUpper = targets.every((m) => upper.includes(m) || m === "core");
  if (allLower && !allUpper) return "lower";
  if (allUpper && !allLower) return "upper";
  return null;   // mixed / full body
}

/* ---- Age scaling: older trainees get impact caps + extra warmup + volume trim ---- */
function ageProfile(age) {
  if (age >= 55) return { impactCap: 1, plyoOK: false, warmupBonus: 2, volumeMult: 0.85, note: "Extra warm-up and low-impact options prioritized for this age." };
  if (age >= 45) return { impactCap: 2, plyoOK: false, warmupBonus: 1, volumeMult: 0.9, note: "Impact kept moderate; joints warmed thoroughly." };
  if (age >= 35) return { impactCap: 3, plyoOK: true, warmupBonus: 1, volumeMult: 1.0, note: "" };
  return { impactCap: 3, plyoOK: true, warmupBonus: 0, volumeMult: 1.0, note: "" };
}

/* ---- Deterministic shuffle so "reshuffle" gives variety but a given seed is stable ---- */
function makeRng(seed) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  const next = () => (s = (s * 16807) % 2147483647) / 2147483647;
  next.initialSeed = Number(seed) || 1; return next;
}
function shuffle(arr, rng) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function gymAllowsExercise(exercise) {
  const equipment = currentGymEquipment(), zones = Array.isArray(equipment.zones) ? equipment.zones : [];
  if (zones.length && !zones.includes(exercise.zone)) return false;
  const name = String(exercise && exercise.name || "").toLowerCase();
  const blocked = Array.isArray(equipment.blockedKeywords) ? equipment.blockedKeywords : [];
  if (blocked.some((keyword) => keyword && name.includes(String(keyword).toLowerCase()))) return false;
  const modes = Array.isArray(equipment.cardioModes) ? equipment.cardioModes : [];
  const modality = cardioModalityFor(exercise);
  if (modes.length && modality !== "other" && !modes.includes(modality)) return false;
  return true;
}

function pregnancyMovementRisk(exercise) {
  const demands = new Set(inferExerciseDemands(exercise));
  if (demands.has("impact") || demands.has("ballistic") || Number(exercise && exercise.impact) >= 2) return "Pregnancy impact / ballistic filter";
  if (demands.has("supine") || demands.has("prone")) return "Pregnancy position filter (flat-back / face-down)";
  if (exercise && exercise.finisher && exercise.ftype === "metcon") return "Pregnancy high-intensity finisher filter";
  return "";
}
function coachingLimitationIssues(exercise,spec) {
  const limitations = [...new Set(spec && spec.injuries || [])], issues = [], demands = new Set(inferExerciseDemands(exercise));
  limitations.forEach((tag) => {
    const rule = LIMITATION_RULES[tag]; if (!rule) return;
    const conflicts = (rule.demands || []).filter((demand) => demands.has(demand));
    const impactConflict = rule.maxImpact != null && Number(exercise && exercise.impact || 0) > Number(rule.maxImpact);
    const finisherConflict = Boolean(rule.blockFinishers && exercise && exercise.finisher);
    if (!rule.blockAll && !conflicts.length && !impactConflict && !finisherConflict) return;
    const detail = conflicts.slice(0,2).map((key) => MOVEMENT_DEMAND_LABELS[key] || key).join(" / ");
    const assessment = limitationAssessmentFor(spec,tag), absolute = limitationIsAbsoluteHold(spec,tag);
    const reviewedNormalTrial = assessment.decision === "allow" && assessment.ability === "normal" && assessment.severity === "mild" && assessment.reviewedAt;
    const documentedExerciseOverride = !absolute && exerciseOverrideCovers(exercise,tag);
    issues.push({
      code:LIFE_STAGE_LIMITATIONS.includes(tag) ? tag : "movement_restriction",
      limitation:tag,
      label:(INJURY_LABELS[tag] || tag) + " conflict" + (rule.blockAll ? " · exercise is paused until cleared" : detail ? " · " + detail : impactConflict ? " · impact level" : " · high-intensity finisher") + (documentedExerciseOverride ? " · coach override documented" : reviewedNormalTrial ? " · mild/normal trial approved" : ""),
      hard:!(documentedExerciseOverride || reviewedNormalTrial),absolute,
    });
  });
  return issues;
}
/* ---------- regression ladder ---------- */
// Movements were matched by pattern but never ordered by difficulty, so "this is too
// hard" could hand back something harder. A rank orders each pattern from easiest to
// hardest; the step down is resolved at the time against the gym's equipment and the
// client's limitations, because a fixed chain would point at a dumbbell the gym does
// not own or a movement their knee rules out.
//
// Ranks are seeded from experience level, then adjusted for the things that actually
// make a movement harder to run unsupervised: free weight over machine, standing over
// supported, one limb over two, and a barbell over everything.
function movementDifficultyRank(exercise) {
  if (!exercise) return 99;
  if (Number.isFinite(Number(exercise.difficultyRank))) return Number(exercise.difficultyRank);
  let rank = (Number(exercise.exp) || 1) * 10;
  const zone = exercise.zone, name = String(exercise.name || "").toLowerCase();
  if (zone === "machine") rank -= 6;                       // supported path, hardest to do wrong
  else if (zone === "cable") rank -= 4;
  else if (zone === "crossfit" && /trx/.test(name)) rank -= 5;  // assistable by foot position
  else if (zone === "bodyweight") rank -= 2;
  else if (zone === "platform" || zone === "rack") rank += 4;   // barbell off a rack
  if (exercise.unilateral) rank += 2;                      // balance demand
  if (Number(exercise.impact) >= 2) rank += 2;
  if (/assisted|machine|supported|box|goblet/.test(name)) rank -= 2;
  if (/barbell|deficit|slider|bulgarian|single-arm|single-leg/.test(name)) rank += 2;
  return rank;
}
// The easiest available option below where they are, respecting everything that would
// normally rule a movement out.
// A step on the ladder has to be the same job done more simply, not a different job.
// Isolation work and finishers share a pattern tag with real compounds but are not
// substitutes for them.
function ladderComparable(candidate,exercise) {
  if (!candidate || candidate.hidden === true || candidate.finisher === true) return false;
  if (candidate.name === exercise.name || candidate.pattern !== exercise.pattern) return false;
  if (ISO_NAMES.includes(candidate.name) && !ISO_NAMES.includes(exercise.name)) return false;
  if (/calf raise|leg extension|wall sit|burnout|drop set/i.test(candidate.name)) return false;
  return true;
}
function easierAlternativesFor(exercise,spec,age) {
  if (!exercise) return [];
  const currentRank = movementDifficultyRank(exercise);
  return LIBRARY
    .filter((candidate) => ladderComparable(candidate,exercise)
      && movementDifficultyRank(candidate) < currentRank
      && !exerciseConstraintIssues(candidate,spec,age).some((issue) => issue.hard))
    .sort((a,b) => movementDifficultyRank(b) - movementDifficultyRank(a));
}
function harderAlternativesFor(exercise,spec,age) {
  if (!exercise) return [];
  const currentRank = movementDifficultyRank(exercise);
  return LIBRARY
    .filter((candidate) => ladderComparable(candidate,exercise)
      && movementDifficultyRank(candidate) > currentRank
      && !exerciseConstraintIssues(candidate,spec,age).some((issue) => issue.hard))
    .sort((a,b) => movementDifficultyRank(a) - movementDifficultyRank(b));
}
// One rung, not a leap: the closest easier option rather than the easiest that exists.
function regressExercise(exercise,spec,age) { return easierAlternativesFor(exercise,spec,age)[0] || null; }
function progressExercise(exercise,spec,age) { return harderAlternativesFor(exercise,spec,age)[0] || null; }
/* ---------- solo-day supervision ---------- */
// A trainer day and a solo day are not the same workout. On a solo day nobody is there
// to spot a first attempt, correct a bar path, or stop a set going wrong - so a movement
// that genuinely needs eyes on the first exposure should not debut there.
// This is not a difficulty cap: anything the client has already performed stays available,
// and every movement remains available on trainer days.
function needsSupervisionFirstTime(exercise) {
  if (!exercise) return false;
  if (Number(exercise.exp) >= 3) return true;
  if (exercise.pattern === "olympic") return true;
  // Loaded barbell compounds off a rack or platform: the failure modes are the ones a
  // coach exists to prevent.
  return ["rack","platform"].includes(exercise.zone) && ["squat","hinge","h_push","v_push"].includes(exercise.pattern);
}
function clientHasPerformed(spec,exercise) {
  const profileId = spec && spec.profileId, client = spec && spec.client, name = String(exercise && exercise.name || "").toLowerCase();
  if (!name || typeof loadProgress !== "function") return false;
  return loadProgress().some((entry) => entry && entry.type === "set"
    && String(entry.label || "").toLowerCase() === name
    && (profileId ? entry.profileId === profileId || (entry.data && entry.data.profileId === profileId) : clientMatches(entry.client,client)));
}
function soloDayBlocksExercise(exercise,spec) {
  if (!spec || !spec.soloDay) return false;
  if (!needsSupervisionFirstTime(exercise)) return false;
  return !clientHasPerformed(spec,exercise);
}
function exerciseConstraintIssues(exercise,spec,age) {
  const issues = [], zones = spec && spec.zones && spec.zones.length ? spec.zones : null, limitations = spec && spec.injuries || [], prof = ageProfile(age == null ? spec && spec.age : age), avoid = exercise && Array.isArray(exercise.avoid) ? exercise.avoid : [];
  if (!exercise || exercise.safetyReviewed === false) issues.push({ code:"safety_metadata",label:"Exercise safety classification is not trainer-reviewed",hard:true });
  // Retired movements stay in the library with their data intact; they simply are not
  // offered for programming until someone clears the flag.
  if (exercise && exercise.hidden === true) issues.push({ code:"retired_movement",label:"Retired from programming",hard:true });
  if (!gymAllowsExercise(exercise)) issues.push({ code:"gym_equipment",label:"Not in this gym's equipment setup",hard:true });
  if (soloDayBlocksExercise(exercise,spec)) issues.push({ code:"solo_day_supervision",label:"First attempt at this movement should happen on a day with a trainer",hard:true });
  if (zones && !zones.includes(exercise.zone)) issues.push({ code:"client_equipment",label:"Equipment unavailable for this client",hard:true });
  const cardioPreferences = cardioPreferencesFor(spec || {}), modality = cardioModalityFor(exercise);
  if (!cardioPreferences.includes("any") && modality !== "other" && !cardioPreferences.includes(modality)) issues.push({ code:"cardio_equipment",label:"Cardio machine not selected as available",hard:true });
  limitations.forEach((tag) => {
    if (!avoid.includes(tag)) return;
    const assessment = limitationAssessmentFor(spec || {},tag), absolute = limitationIsAbsoluteHold(spec || {},tag);
    const reviewedNormalTrial = assessment.decision === "allow" && assessment.ability === "normal" && assessment.severity === "mild" && assessment.reviewedAt;
    const documentedExerciseOverride = !absolute && exerciseOverrideCovers(exercise,tag);
    issues.push({
      code:"limitation",limitation:tag,absolute,
      label:(INJURY_LABELS[tag] || tag) + " conflict · exercise-specific exclusion" + (documentedExerciseOverride ? " · coach override documented" : reviewedNormalTrial ? " · mild/normal trial approved" : ""),
      hard:!(documentedExerciseOverride || reviewedNormalTrial),
    });
  });
  issues.push(...coachingLimitationIssues(exercise,spec || {}));
  if (Number(exercise.exp || 1) > Number(spec && spec.experience || 1)) { const covered = exerciseGeneralOverrideCovers(exercise,"experience"); issues.push({ code:"experience",label:"Above selected experience" + (covered ? " · coach override documented" : ""),hard:!covered }); }
  if (Number(exercise.impact || 0) > prof.impactCap || (exercise.pattern === "plyo" && !prof.plyoOK)) { const covered = exerciseGeneralOverrideCovers(exercise,"impact"); issues.push({ code:"impact",label:"Age / impact caution" + (covered ? " · coach override documented" : ""),hard:!covered }); }
  const preference = exercisePreferenceFor(spec || {},exercise); if (["discomfort","unavailable"].includes(preference)) { const covered = exerciseGeneralOverrideCovers(exercise,"preference"); issues.push({ code:"preference",label:(preference === "discomfort" ? "Marked as causing discomfort" : "Marked unavailable") + (covered ? " · coach override documented" : ""),hard:!covered }); }
  return issues.filter((issue,index,array) => array.findIndex((candidate) => candidate.code === issue.code && candidate.label === issue.label) === index);
}
function safetySpecForProfile(session,profile) {
  const original = session && session.spec || {}, cardioModes = normalizeCardioPreferences(profile && (profile.cardioModes || profile.cardioMode) || original.cardioModes || original.cardioMode);
  const painAreas = currentSafetyPainAreas(profile);
  return {
    ...original,
    profileId:profile && profile.id || original.profileId,
    client:profile && profile.name || original.client,
    age:Number(profile && profile.age || original.age || 30),
    experience:Number(profile && profile.experience || original.experience || 1),
    injuries:[...new Set([...(profile && profile.injuries || original.injuries || []),...painAreas])],
    zones:[...(profile && profile.zones || original.zones || [])],
    cardioMode:cardioModes[0],
    cardioModes,
    exercisePreferences:{ ...(original.exercisePreferences || {}),...(profile && profile.exercisePreferences || {}) },
    limitationAssessments:{ ...(original.limitationAssessments || {}),...(profile && profile.limitationAssessments || {}) },
    usualTrainingRpe:Number(profile && profile.usualTrainingRpe || original.usualTrainingRpe) || null,
    coachingPriorities:[...(profile && profile.coachingPriorities || original.coachingPriorities || [])],
    coachingPreferenceNote:profile && profile.coachingPreferenceNote || original.coachingPreferenceNote || "",
  };
}
function currentSafetyPainAreas(profile) {
  if (!profile) return [];
  const reviewedTime = new Date(profile.coachAdjustment && profile.coachAdjustment.reviewedAt || 0).getTime();
  const progressAreas = loadProgress().filter((entry) => progressEntryBelongsToClient(entry,profile) && new Date(entry.date || entry.createdAt || 0).getTime() > reviewedTime).map((entry) => {
    if (entry.type === "pain" && painRequiresSafetyHold(entry.data && (entry.data.level || entry.data.pain || entry.value),entry.data && entry.data.movementChanged)) return entry.data && (entry.data.injuryArea || entry.data.area);
    if (entry.type === "workout" && entry.data && painRequiresSafetyHold(entry.data.painLevel || entry.data.pain,entry.data.movementChanged)) return entry.data.injuryArea;
    if (entry.type === "readiness" && entry.data && Number(entry.data.pain || 0) >= 2) return entry.data.painArea;
    return "";
  });
  const checkInAreas = checkInsForProfile(profile.id).filter((item) => new Date(item.createdAt || item.date || 0).getTime() > reviewedTime && painRequiresSafetyHold(item.painLevel || item.pain,item.movementChanged)).map((item) => item.painArea || "");
  return [...new Set([...progressAreas,...checkInAreas].filter((area) => BODY_AREA_LIMITATIONS.includes(area)))];
}
function auditSessionForCurrentProfile(session,profile) {
  if (!session) return {pass:false,safety:["Workout is unavailable."],detail:[],score:0};
  const copy = JSON.parse(JSON.stringify(session)); copy.spec = safetySpecForProfile(copy,profile); return auditWorkout(copy);
}
function sessionSafetyConflictsForProfile(session,profile) {
  if (!session) return ["Workout is unavailable."];
  const spec = safetySpecForProfile(session,profile), conflicts = [];
  (session.blocks || []).forEach((block) => (block.items || []).forEach((exercise) => {
    exerciseConstraintIssues(exercise,spec,spec.age).filter((issue) => issue.hard).forEach((issue) => conflicts.push(exercise.name + ": " + issue.label));
  }));
  return [...new Set(conflicts)];
}
function unresolvedClientSafetyHold(profile) {
  if (!profile) return null;
  const progressHolds = loadProgress().filter((entry) => progressEntryBelongsToClient(entry,profile) && (
    entry.type === "pain" && painRequiresSafetyHold(entry.data && (entry.data.level || entry.data.pain || entry.value),entry.data && entry.data.movementChanged)
    || entry.type === "substitution" && entry.data && entry.data.reason === "discomfort"
    || entry.type === "workout" && entry.data && painRequiresSafetyHold(entry.data.painLevel || entry.data.pain,entry.data.movementChanged)
  ));
  const checkInHolds = checkInsForProfile(profile.id).filter((item) => painRequiresSafetyHold(item.painLevel || item.pain,item.movementChanged)).map((item) => ({...item,type:"checkin",date:item.createdAt || item.date,data:item}));
  const latest = [...progressHolds,...checkInHolds].sort((a,b) => String(b.date || b.createdAt || "").localeCompare(String(a.date || a.createdAt || "")))[0];
  if (!latest) return null;
  const reportTime = new Date(latest.date || latest.createdAt || 0).getTime(), reviewedTime = new Date(profile.coachAdjustment && profile.coachAdjustment.reviewedAt || 0).getTime();
  return reportTime > reviewedTime ? latest : null;
}

/* ---- Eligibility: filter the library for this person ---- */
function eligible(spec, age) {
  return LIBRARY.filter((ex) => {
    return !exerciseConstraintIssues(ex,spec,age).some((issue) => issue.hard);
  }).map((ex) => ({ ...ex, _preference:exercisePreferenceFor(spec,ex) }));
}

/* Dedicated finishers must ONLY appear in the finisher block, never as a main
   lift or accessory. buildBlocks uses this to strip them from the working pool. */
function workingPool(pool) {
  return pool.filter((ex) => ex.finisher !== true);
}

/* ---- Pick helpers (muscle-aware) ----
   When `targets` muscles are set, candidates that hit them are strongly
   preferred, but we always keep the rest as fallback so a session never
   fails to fill and stays balanced/safe. */
/* Experience fit: advanced lifters should PREFER advanced movements, not merely
   be permitted them. An exercise at the trainee's level scores highest; one level
   below is fine; two levels below is a weak choice for them. */
function expScore(ex, experience) {
  const gap = experience - ex.exp;   // 0 = perfect fit, 1 = one easier, 2 = much easier
  if (gap === 0) return 3;
  if (gap === 1) return 1;
  return 0;                          // gap >= 2: notably below their level
}

/* Combined bias: muscle match dominates, experience fit breaks ties and
   pushes advanced trainees toward harder variations. */
function biasSort(list, targets, rng, experience, emphasis) {
  const shuffled = shuffle(list, rng);
  const hasTargets = targets && targets.length;
  const hasEmph = emphasis && Object.keys(emphasis).length;
  if (!hasTargets && !experience && !hasEmph) return shuffled;
  return shuffled.sort((a, b) => {
    const prefA = PREFERENCE_SCORE[a._preference || "neutral"] || 0, prefB = PREFERENCE_SCORE[b._preference || "neutral"] || 0;
    if (prefA !== prefB) return prefB - prefA;
    if (hasTargets) {
      // 1. relevance: does it train a target muscle at all?
      const rA = muscleScore(a, targets) > 0 ? 1 : 0;
      const rB = muscleScore(b, targets) > 0 ? 1 : 0;
      if (rA !== rB) return rB - rA;
      // 2. purity: prefer movements whose effort is CONCENTRATED on the targets
      //    (a squat on leg day beats a push press that only shares glutes)
      const pA = purity(a, targets), pB = purity(b, targets);
      if (Math.abs(pA - pB) > 0.15) return pB - pA;
    }
    // 3. balance across the TARGETED muscles: feed the lagging ones first so a
    //    push day doesn't turn into nine curls while chest sits at two sets.
    if (hasTargets && hasEmph) {
      const bA = balanceScore(a, targets, emphasis), bB = balanceScore(b, targets, emphasis);
      if (bA !== bB) return bB - bA;
    }
    // 4. coherence: reinforce the muscles the session is already hammering
    if (hasEmph) {
      const cA = coherenceScore(a, emphasis), cB = coherenceScore(b, emphasis);
      if (Math.abs(cA - cB) > 0.3) return cB - cA;
    }
    // 4. experience fit
    const eA = experience ? expScore(a, experience) : 0;
    const eB = experience ? expScore(b, experience) : 0;
    if (eA !== eB) return eB - eA;
    // 5. final tiebreak: richer coverage of targets
    const mA = hasTargets ? muscleScore(a, targets) : 0;
    const mB = hasTargets ? muscleScore(b, targets) : 0;
    return mB - mA;
  });
}

/* Reshuffles need genuine variety, but never at the cost of relevance. Choose
   among the top few only when they have the same experience fit, movement
   family, body area, and nearly the same target-muscle purity. */
function variedTop(options, rng, targets, experience) {
  if (!options.length) return null;
  const top = options[0];
  const peers = options.slice(0, 8).filter((ex) => {
    if (experience && expScore(ex, experience) !== expScore(top, experience)) return false;
    if (bodyArea(ex) !== bodyArea(top)) return false;
    if (pushPull(ex) !== pushPull(top)) return false;
    if (targets && targets.length && Math.abs(purity(ex, targets) - purity(top, targets)) > 0.2) return false;
    return true;
  });
  return peers[Math.floor(rng() * peers.length)] || top;
}

function pickByPattern(pool, patterns, used, rng, targets, experience, emphasis) {
  for (const p of patterns) {
    let cands = pool.filter((e) => e.pattern === p && !used.has(e.name));
    if (targets && targets.length) {
      const gated = cands.filter((e) => muscleAllowed(e, targets));
      if (gated.length) cands = gated;
    }
    const options = biasSort(cands, targets, rng, experience, emphasis);
    if (options.length) { const chosen = variedTop(options, rng, targets, experience); used.add(chosen.name); return chosen; }
  }
  return null;
}
function pickByRegion(pool, region, used, rng, excludePatterns, targets, experience, emphasis) {
  let options = pool.filter((e) => e.region === region && !used.has(e.name));
  if (excludePatterns) options = options.filter((e) => !excludePatterns.includes(e.pattern));
  if (targets && targets.length) {
    const gated = options.filter((e) => muscleAllowed(e, targets));
    if (gated.length) options = gated;
  }
  options = biasSort(options, targets, rng, experience, emphasis);
  if (options.length) { const chosen = variedTop(options, rng, targets, experience); used.add(chosen.name); return chosen; }
  return null;
}
/* pickAny applies the HARD muscle gate for working blocks.
   Pass gate=false for blocks that legitimately ignore targets (core, mobility,
   conditioning, warmup) so a leg-day core piece is still allowed. */
function pickAny(pool, filterFn, used, rng, targets, experience, emphasis, gate) {
  const useGate = gate !== false;
  let cands = pool.filter((e) => filterFn(e) && !used.has(e.name));
  if (useGate && targets && targets.length) {
    const gated = cands.filter((e) => muscleAllowed(e, targets));
    if (gated.length) cands = gated;          // strict: only on-target movements
    else return null;                          // nothing relevant -> add nothing
  }
  const options = biasSort(cands, targets, rng, experience, emphasis);
  if (options.length) { const chosen = variedTop(options, rng, targets, experience); used.add(chosen.name); return chosen; }
  return null;
}

/* ---- Block builders map a structure token to actual exercises ---- */
function buildBlocks(spec, fullPool, rng, slotBudget) {
  // Dedicated finishers (drop sets, 21s, burnouts, holds) are reserved for the
  // finisher block. Every other block draws from a pool with them removed.
  const pool = fullPool.filter((e) => e.finisher !== true);
  const g = GOALS[spec.goal];
  const prof = ageProfile(spec.age);
  const used = new Set();
  const blocks = [];
  const targets = spec.muscles || [];
  const xp = spec.experience;
  const architecture = optionArchitectureForSpec(spec);


  // If muscles are targeted, REBUILD the focus pattern list from the muscles
  // themselves rather than merely reordering the goal's defaults. On leg day
  // the main-lift rotation must be squat/hinge/lunge -- never h_push.
  let focus = g.focusPatterns.slice();
  if (targets.length) {
    // patterns that actually train each target muscle
    const MUSCLE_PATTERNS = {
      quads:      ["squat", "lunge"],
      hamstrings: ["hinge", "lunge"],
      glutes:     ["hinge", "squat", "lunge"],
      calves:     ["squat"],
      chest:      ["h_push"],
      shoulders:  ["v_push", "h_push"],
      back:       ["h_pull", "v_pull"],
      arms:       ["h_pull", "v_push", "h_push"],
      core:       ["core", "carry", "rotation"],
    };
    const wanted = [];
    targets.forEach((m) => (MUSCLE_PATTERNS[m] || []).forEach((p) => { if (!wanted.includes(p)) wanted.push(p); }));

    // score by how many eligible exercises of that pattern hit the targets
    const patternHits = (pat) => pool.filter((e) => e.pattern === pat && muscleScore(e, targets) > 0).length;
    const viable = wanted.filter((p) => patternHits(p) > 0).sort((a, b) => patternHits(b) - patternHits(a));

    if (viable.length) {
      focus = viable;
      // keep any goal-default patterns that ALSO serve the targets, at the back
      g.focusPatterns.forEach((p) => { if (!focus.includes(p) && patternHits(p) > 0) focus.push(p); });
    }
  }
  if (spec.optionIndex != null) {
    const optionStrategy = optionStrategyForSpec(spec);
    const strategyAvailable = pool.some((ex) => ex.pattern === optionStrategy.pattern && isPrimaryAnchor(ex) && (!targets.length || muscleAllowed(ex,targets)));
    if (strategyAvailable) focus = [optionStrategy.pattern, ...focus.filter((pattern) => pattern !== optionStrategy.pattern)];
  }

  // ---- WARM-UP: specific to what this session actually trains ----
  // Structure: 1 general temp-raiser, then prep for the day's area(s).
  // A push day gets shoulder/scap work, not couch stretches.
  // Trainer programming principle: warm-ups should prepare the actual session,
  // not be a random list. Sessions of 45+ minutes receive a temperature raiser,
  // movement-specific mobility, and an activation/bracing movement.
  const warmupCount = Math.min(3, spec.minutes >= 45 ? 3 : 2);
  const area = targetArea(targets);            // "upper" | "lower" | null
  const pp = targetPushPull(targets);          // "push" | "pull" | null

  // Infer the area from the goal's main patterns when no muscles are picked.
  let sessionAreas;
  if (area === "upper") sessionAreas = ["upper"];
  else if (area === "lower") sessionAreas = ["lower"];
  else sessionAreas = ["upper", "lower"];      // full body / no target

  const isWarmup = (e) => Array.isArray(e.preps) && e.preps.length;
  const warmupPool = pool.filter(isWarmup);

  // relevance score. Prep that is EXCLUSIVE to today's family scores highest:
  // a lat stretch (pull-only) beats a cuff drill that preps both push and pull.
  const wScore = (e) => {
    let sc = 0;
    if (pp) {
      const other = pp === "push" ? "pull" : "push";
      if (e.preps.includes(pp) && !e.preps.includes(other)) sc += 4;   // exclusive
      else if (e.preps.includes(pp)) sc += 2;                          // serves both
    }
    // area match, rewarding exclusivity again
    if (area) {
      const otherArea = area === "upper" ? "lower" : "upper";
      if (e.preps.includes(area) && !e.preps.includes(otherArea)) sc += 3;
      else if (e.preps.includes(area)) sc += 1;
    } else {
      sessionAreas.forEach((a) => { if (e.preps.includes(a)) sc += 1; });
    }
    return sc;
  };

  // Every warm-up has the same shape, and each step has exactly one job:
  //   Raise (get warm) -> Open (range for today) -> Activate (switch on) -> Rehearse (the lift).
  // Rehearse is appended later, once the primary lift is actually chosen.
  //
  // The shape never changes, only the contents. A client learns it once and then always
  // knows where they are, which is what makes a warm-up easy to follow - far more than
  // any individual drill being simple.
  //
  // A slot is left EMPTY rather than filled with something irrelevant. Padding a lower-body
  // warm-up with a shoulder drill is how a warm-up stops meaning anything, and it was the
  // main reason these did not feel connected to the workout.
  const warmup = [];
  const chosenWarmupNames = () => new Set(warmup.map((item) => item.name));
  const relevant = (candidates) => candidates.filter((e) => !chosenWarmupNames().has(e.name) && wScore(e) > 0);

  // 1 · Raise. Prefer a temperature raiser that also serves today's area.
  // Raise means raise temperature, so it has to be something you can actually do for
  // several easy minutes. Sorting all "general" prep by relevance let a shoulder stretch
  // win this slot on upper-body days and told the client to hold it for 3-5 minutes.
  // Real temperature raisers first; only fall back to other general prep if the gym
  // filters leave no cardio option at all.
  const raisers = warmupPool.filter((e) => e.preps.includes("general") && e.region === "cardio");
  const generalFallback = warmupPool.filter((e) => e.preps.includes("general") && e.region !== "cardio");
  const generals = (raisers.length ? shuffle(raisers, rng) : shuffle(generalFallback, rng))
    .sort((a, b) => wScore(b) - wScore(a));
  if (generals.length) {
    const raiseItem = warmupExercise(generals[0],"raise");
    // A 3-5 minute raise eats a fifth of a 30 minute session. Scale it to the time
    // the client actually has, rather than spending their session getting warm.
    const shortSession = Number(spec.minutes) && Number(spec.minutes) < 45;
    if (shortSession) raiseItem.warmupRx = { ...raiseItem.warmupRx, reps:"2–3 min easy" };
    warmup.push(raiseItem);
  }

  const specific = shuffle(warmupPool.filter((e) => e.region !== "cardio"), rng)
    .sort((a, b) => wScore(b) - wScore(a));

  // 2 · Open. Controlled range for the patterns today actually uses.
  const rangePrep = relevant(specific).find((e) => e.region === "mobility");
  if (rangePrep) warmup.push(warmupExercise(rangePrep,"open"));

  // 3 · Activate. Dropped first when the session is short: the ramp sets in Rehearse
  // already switch on the working muscles for the pattern being trained.
  if (warmup.length < warmupCount) {
    const activationPrep = relevant(specific).find((e) => e.region !== "mobility");
    if (activationPrep) warmup.push(warmupExercise(activationPrep,"activate"));
  }

  // Keep the printed order matching the promised sequence no matter what was available.
  const stageOrder = { raise:0, open:1, activate:2, rehearse:3 };
  warmup.sort((a, b) => (stageOrder[a.warmupStage] ?? 9) - (stageOrder[b.warmupStage] ?? 9));

  warmup.forEach((e) => used.add(e.name));
  if (warmup.length) {
    const steps = warmup.map((item) => WARMUP_STAGE_DETAILS[item.warmupStage] && WARMUP_STAGE_DETAILS[item.warmupStage].label.replace(/^\d+ · /,"")).filter(Boolean).concat("Rehearse");
    // Minutes follow the steps actually present, so the header never promises a
    // four-step warm-up when only three were built.
    const stageMinutes = { raise:(Number(spec.minutes) && Number(spec.minutes) < 45) ? 3 : 4, open:1, activate:2 };
    const estimate = warmup.reduce((total,item) => total + (stageMinutes[item.warmupStage] || 1),0) + 3 + prof.warmupBonus;
    blocks.push({ key: "warmup", title: "Warm-up · prepare, don’t fatigue",
      note: "~" + estimate + " min · " + steps.join(" → "), items: warmup });
  }

  // Walk the goal's structure, consuming slots
  let slots = slotBudget;
  let focusIdx = 0;

  const strengthBlock = { key: "strength", title: "Primary lift", items: [] };
  const secondaryBlock = { key: "secondary", title: architecture.id === "focused" ? "Secondary strength" : "Supporting strength", items: [] };
  const accessoryBlock = { key: "accessory", title: "Accessory work", items: [] };
  const isoBlock = { key: "iso", title: "Isolation finisher", items: [] };
  const coreBlock = { key: "core", title: "Trunk support", items: [] };
  const circuitBlock = { key: "circuit", title: "Strength circuit", items: [], circuit: true };
  const conditioningBlock = { key: "conditioning", title: "Conditioning", items: [] };
  const powerBlock = { key: "power", title: "Power & explosiveness", items: [] };
  const plyoBlock = { key: "plyo", title: "Plyometrics", items: [] };
  const mobilityBlock = { key: "mobility", title: "Mobility flow", items: [] };
  const finisherBlock = { key: "finisher", title: "Finisher", items: [] };
  const primerBlock = { key: "primer", title: "Movement primer", items: [] };

  for (const token of goalStructureForSpec(spec)) {
    // The finisher is always allowed to run — it never competes for slots.
    if (slots <= 0 && token !== "finisher") continue;
    switch (token) {
      case "warmup": break; // already handled
      case "main_lift": {
        const isFirst = strengthBlock.items.length === 0;
        if (isFirst) {
          const pat = focus[focusIdx % focus.length]; focusIdx++;
          const emph = emphasisOf(strengthBlock.items);
          let ex = pickPrimaryAnchor(pool,[pat],used,rng,spec,emph,spec.optionIndex != null);
          if (!ex) ex = pickPrimaryAnchor(pool,focus,used,rng,spec,emph,spec.optionIndex != null);
          if (!ex) ex = pickPrimaryAnchor(pool,null,used,rng,spec,emph,spec.optionIndex != null);
          if (ex) { strengthBlock.items.push(ex); slots--; }
          break;
        }

        // The trainer's pattern is one clear core lift, then a different job.
        // A second bench angle is not a second primary pattern. Focused and
        // volume options may add one complementary movement; the athletic/
        // density option deliberately spends that time on power, trunk, or
        // conditioning instead.
        if (architecture.id === "athletic") break;
        const primary = strengthBlock.items[0];
        const complementary = complementaryPrimaryPatterns(primary,targets);
        const selected = [...strengthBlock.items, ...secondaryBlock.items];
        const emph = emphasisOf(selected);
        let ex = pickPrimaryAnchor(pool,complementary,used,rng,spec,emph,false);
        if (ex && !withinMovementFamilyLimit(ex,selected)) ex = null;
        if (ex) {
          secondaryBlock.items.push(ex);
          secondaryBlock.title = architecture.id === "volume" ? "Secondary hypertrophy" : "Secondary strength";
          slots--;
        }
        break;
      }
      case "light_strength": {
        const emphL = emphasisOf(strengthBlock.items);
        const ex = pickAny(pool, (e) => ["lower", "pull", "push"].includes(e.region) && e.impact <= 1 && e.finisher !== "pump", used, rng, targets, xp, emphL);
        if (ex) { strengthBlock.title = "Light strength"; strengthBlock.items.push(ex); slots--; }
        break;
      }
      case "accessory": {
        // Accessory work must (a) train the targeted muscles, and (b) reinforce
        // what the main lifts already hit. Pattern variety is a TIEBREAK inside
        // that set -- it can never pull in an off-target movement.
        const tokenAccessoryCap = architecture.id === "volume" ? 2 : 1;
        if (spec.optionIndex != null && accessoryBlock.items.length >= tokenAccessoryCap) break;
        const selected = [...strengthBlock.items, ...secondaryBlock.items, ...accessoryBlock.items, ...isoBlock.items];
        const emph = emphasisOf(selected);
        const patCount = {};
        selected.forEach((e) => { patCount[e.pattern] = (patCount[e.pattern] || 0) + 1; });
        const area = targetArea(targets);
        const pp = targetPushPull(targets);
        const baseFilter = (e) => ["lower", "push", "pull"].includes(e.region)
          && !["mobility", "plyo", "olympic", "conditioning"].includes(e.pattern)
          && !ISO_NAMES.includes(e.name)   // accessories are compound; iso block handles isolation
          && e.finisher !== "pump"          // burnout movements belong in the finisher only
          && withinMovementFamilyLimit(e,selected)
          && (!area || bodyArea(e) === area || bodyArea(e) === "mixed")
          && (!pp || !pushPull(e) || pushPull(e) === pp);   // no bench on a pull day
        // Prefer a pattern we've used less, but ONLY among on-target exercises
        // (pickAny gates on targets, so these can never go off-muscle).
        let ex = pickAny(pool, (e) => baseFilter(e) && (patCount[e.pattern] || 0) === 0, used, rng, targets, xp, emph);
        if (!ex) ex = pickAny(pool, (e) => baseFilter(e) && (patCount[e.pattern] || 0) <= 1, used, rng, targets, xp, emph);
        if (!ex) ex = pickAny(pool, baseFilter, used, rng, targets, xp, emph);
        if (ex) { accessoryBlock.items.push(ex); slots--; }
        break;
      }
      case "iso": {
        // Isolation finisher: low-impact, single-joint-ish work on the muscles
        // this session is actually training. Region is NOT hard-coded -- on leg
        // day this yields leg extensions / curls / calf raises, not skull crushers.
        const selected = [...strengthBlock.items, ...secondaryBlock.items, ...accessoryBlock.items, ...isoBlock.items];
        const emph = emphasisOf(selected);
        const area = targetArea(targets);
        const ppIso = targetPushPull(targets);
        const isoFilter = (e) => e.impact <= 1
          && ["lower", "push", "pull"].includes(e.region)
          && !["mobility", "plyo", "olympic", "conditioning"].includes(e.pattern)
          && e.finisher !== "pump"
          && withinMovementFamilyLimit(e,selected)
          && (!area || bodyArea(e) === area || bodyArea(e) === "mixed")
          && (!ppIso || !pushPull(e) || pushPull(e) === ppIso);
        // prefer true isolation movements, then any on-target low-impact work
        let ex = pickAny(pool, (e) => isoFilter(e) && ISO_NAMES.includes(e.name), used, rng, targets, xp, emph);
        if (!ex) ex = pickAny(pool, (e) => isoFilter(e) && e.impact === 0, used, rng, targets, xp, emph);
        if (!ex) ex = pickAny(pool, isoFilter, used, rng, targets, xp, emph);
        if (ex) { isoBlock.items.push(ex); slots--; }
        break;
      }
      case "circuit": {
        const emph = emphasisOf([...strengthBlock.items, ...circuitBlock.items]);
        const base = (e) => e.impact <= 2 && e.pattern !== "mobility" && e.pattern !== "plyo" && e.finisher !== "pump";
        // Prefer movements that can share a station with what's already here,
        // so the "circuit" doesn't sprawl across the whole gym floor.
        const existing = circuitBlock.items;
        let ex = null;
        if (existing.length) {
          const anchor = existing[existing.length - 1];
          ex = pickAny(pool, (e) => base(e) && pairable(anchor, e), used, rng, targets, xp, emph);
        }
        if (!ex) ex = pickAny(pool, (e) => base(e) && canSuperset(e), used, rng, targets, xp, emph);
        if (!ex) ex = pickAny(pool, base, used, rng, targets, xp, emph);
        if (ex) { circuitBlock.items.push(ex); slots--; }
        break;
      }
      case "conditioning": {
        const route = resolvedTrainingRoute(spec), preference = cardioPreferencesFor(spec);
        const cardioWork = (e) => e.pattern === "conditioning" && (e.zone === "cardio" || e.region === "cardio") && matchesCardioPreference(e,preference);
        let ex = route === "recovery" ? pickAny(pool,(e) => e.region === "cardio" && e.pattern === "mobility" && matchesCardioPreference(e,preference),used,rng,[],xp,null,false) : null;
        if (!ex && ["mixed","performance"].includes(route)) ex = pickAny(pool,(e) => cardioWork(e) && / cardio$/i.test(e.name),used,rng,[],xp,null,false);
        if (!ex) ex = pickAny(pool,cardioWork,used,rng,[],xp,null,false);
        if (!ex && preference.includes("any")) ex = pickAny(pool,(e) => e.pattern === "conditioning",used,rng,[],xp,null,false);
        if (!ex) ex = pickAny(pool,(e) => e.region === "cardio" && matchesCardioPreference(e,preference),used,rng,[],xp,null,false);
        if (ex) {
          if (route === "recovery") conditioningBlock.title = "Easy aerobic work";
          else if (["mixed","performance"].includes(route)) conditioningBlock.title = "Cardio training";
          conditioningBlock.items.push(ex); slots--;
        }
        break;
      }
      case "core": {
        const ex = pickAny(pool,(e) => ["core","rotation","carry"].includes(e.pattern) && e.impact <= 1,used,rng,[],xp,null,false);
        if (ex) { coreBlock.items.push(ex); slots--; }
        break;
      }
      case "primer": {
        const ex = pickAny(pool, (e) => e.impact <= 1 && e.finisher !== "pump" && (e.pattern === "conditioning" || e.pattern === "hinge"), used, rng, targets, xp, null, false);
        if (ex) { primerBlock.items.push(ex); slots--; }
        break;
      }
      case "power_opt": {
        if (spec.experience >= 2) {
          // Power work is a WORKING block: it must serve the targeted muscles.
          // On an arms day there is no relevant power movement, so we skip it.
          const emphP = emphasisOf(strengthBlock.items);
          const areaP = targetArea(targets);
          const powerFilter = (e) => (e.pattern === "olympic" || e.pattern === "plyo")
            && ageProfile(spec.age).plyoOK
            && (!areaP || bodyArea(e) === areaP || bodyArea(e) === "mixed");
          const ex = pickAny(pool, powerFilter, used, rng, targets, xp, emphP);
          if (ex) { powerBlock.items.push(ex); slots--; }
        }
        break;
      }
      case "plyo": {
        if (ageProfile(spec.age).plyoOK) {
          const emphPl = emphasisOf(strengthBlock.items);
          const areaPl = targetArea(targets);
          const plyoFilter = (e) => e.pattern === "plyo"
            && (!areaPl || bodyArea(e) === areaPl || bodyArea(e) === "mixed");
          const ex = pickAny(pool, plyoFilter, used, rng, targets, xp, emphPl);
          if (ex) { plyoBlock.items.push(ex); slots--; }
        } else {
          const ex = pickAny(pool, (e) => e.pattern === "conditioning" && e.impact <= 1, used, rng, targets, xp, null, false);
          if (ex) { conditioningBlock.items.push(ex); slots--; }
        }
        break;
      }
      case "mobility": {
        const ex = pickAny(pool, (e) => e.pattern === "mobility" && !used.has(e.name), used, rng, targets, xp, null, false);
        if (ex) { mobilityBlock.items.push(ex); slots--; }
        break;
      }
      case "finisher": {
        // Prefer DEDICATED finishers (drop sets, 21s, burnouts, holds) that are
        // built to smoke a muscle. Match them to what we trained today.
        const emphF = emphasisOf([...strengthBlock.items, ...accessoryBlock.items, ...isoBlock.items, ...circuitBlock.items]);
        const trainedCore = targets.length && targets.every((m) => m === "core");
        const ppF = targetPushPull(targets);
        const areaF = targetArea(targets);
        let chosen = null, kind = null;

        // which muscles did the session actually hammer?
        const trainedMuscles = Object.keys(emphF).filter((m) => emphF[m] > 0);
        const wantMuscles = targets.length ? targets : trainedMuscles;

        const finisherPool = fullPool.filter((e) => e.finisher === true);
        // a dedicated finisher fits if it smokes one of the muscles we want, and
        // sits in the right push/pull + upper/lower family.
        const fits = (e) => {
          const fm = e.fmuscles || [];
          if (e.ftype === "metcon") return true;                 // metcon suits any day
          if (!wantMuscles.length) return true;
          if (!fm.some((m) => wantMuscles.includes(m))) return false;
          if (ppF && pushPull(e) && pushPull(e) !== ppF) return false;
          if (areaF && bodyArea(e) !== areaF && bodyArea(e) !== "mixed" && bodyArea(e) !== "core") return false;
          return true;
        };

        // pick finisher TYPE by goal, then find a dedicated finisher of that type
        const wantType = (spec.goal === "fatloss" || spec.goal === "conditioning") ? "metcon"
          : (spec.goal === "recovery") ? "gentle"
          : (targets.length && !trainedCore) ? "pump" : "core";

        // Recovery days end with easy trunk control, never a burnout.
        if (wantType === "gentle") {
          chosen = pickAny(pool, (e) => e.region === "core" && e.impact === 0 && !e.finisher && e.exp <= 2, used, rng, [], xp, null, false);
          if (chosen) { finisherBlock.items.push(chosen); finisherBlock.kind = "core"; finisherBlock.title = "Core finisher"; break; }
        }

        // 1) dedicated finisher of the desired type that fits the muscles
        chosen = pickAny(fullPool, (e) => e.finisher === true && e.ftype === wantType && fits(e), used, rng, wantMuscles, xp, emphF, false);
        // 2) any dedicated finisher that fits
        if (!chosen) chosen = pickAny(fullPool, (e) => e.finisher === true && fits(e), used, rng, wantMuscles, xp, emphF, false);
        // 3) allow a REPEAT dedicated finisher (they're one-off burnouts; reuse is fine)
        if (!chosen) {
          const reuse = finisherPool.filter((e) => (e.ftype === wantType || wantType === "core") && fits(e));
          if (reuse.length) chosen = biasSort(reuse, wantMuscles, rng, xp, emphF)[0];
        }
        // 4) legacy fallbacks: metcon conditioning / core region
        if (!chosen && wantType === "metcon") {
          chosen = pickAny(fullPool, (e) => e.pattern === "conditioning" && (e.region === "full" || e.region === "cardio"), used, rng, targets, xp, null, false);
        }
        if (!chosen) {
          chosen = pickAny(fullPool, (e) => e.region === "core", used, rng, targets, xp, emphF, false);
        }

        if (chosen) {
          const ft = chosen.ftype || (chosen.region === "core" ? "core" : (chosen.pattern === "conditioning" ? "metcon" : "pump"));
          finisherBlock.items.push(chosen);
          finisherBlock.kind = ft;
          finisherBlock.title = ft === "pump" ? "Pump finisher"
            : ft === "metcon" ? "Metabolic finisher"
            : "Core finisher";
        }
        break;
      }
    }
  }

  // If slots remain (longer sessions), top up accessory/pull-push balance
  while (slots > 0 && !["mobility","recovery"].includes(resolvedTrainingRoute(spec))) {
    const selected = [...strengthBlock.items, ...secondaryBlock.items, ...accessoryBlock.items, ...isoBlock.items, ...coreBlock.items];
    const emph = emphasisOf(selected);
    const patCount = {};
    selected.forEach((e) => { patCount[e.pattern] = (patCount[e.pattern] || 0) + 1; });
    const area = targetArea(targets);
    const ppTop = targetPushPull(targets);
    const baseFilter = (e) => ["lower", "push", "pull"].includes(e.region) && e.impact <= 2
      && !["mobility", "plyo", "olympic", "conditioning"].includes(e.pattern)
      && !ISO_NAMES.includes(e.name) && e.finisher !== "pump"
      && withinMovementFamilyLimit(e,selected)
      && (!area || bodyArea(e) === area || bodyArea(e) === "mixed")
      && (!ppTop || !pushPull(e) || pushPull(e) === ppTop);
    const accessoryCap = architecture.id === "volume" ? 2 : 1;
    const isoCap = architecture.id === "volume" ? 2 : 1;

    // Long hypertrophy sessions earn useful set volume, not five more compound
    // presses. First add a missing isolation family, then at most a small number
    // of complementary accessories.
    if (["hypertrophy","general"].includes(spec.goal) && isoBlock.items.length < isoCap) {
      const isoFilter = (e) => e.impact <= 1 && ["lower","push","pull"].includes(e.region)
        && ISO_NAMES.includes(e.name) && e.finisher !== "pump"
        && withinMovementFamilyLimit(e,selected)
        && (!area || bodyArea(e) === area || bodyArea(e) === "mixed")
        && (!ppTop || !pushPull(e) || pushPull(e) === ppTop);
      const iso = pickAny(pool,isoFilter,used,rng,targets,xp,emph);
      if (iso) { isoBlock.items.push(iso); slots--; continue; }
    }
    if (accessoryBlock.items.length < accessoryCap) {
      let ex = pickAny(pool, (e) => baseFilter(e) && (patCount[e.pattern] || 0) === 0, used, rng, targets, xp, emph);
      if (!ex) ex = pickAny(pool, (e) => baseFilter(e) && (patCount[e.pattern] || 0) <= 1, used, rng, targets, xp, emph);
      if (!ex) ex = pickAny(pool, baseFilter, used, rng, targets, xp, emph);
      if (ex) { accessoryBlock.items.push(ex); slots--; continue; }
    }
    if (!coreBlock.items.length && spec.minutes >= 60) {
      const core = pickAny(pool,(e) => ["core","rotation","carry"].includes(e.pattern) && e.impact <= 1,used,rng,[],xp,null,false);
      if (core) { coreBlock.items.push(core); slots--; continue; }
    }
    if (architecture.id === "athletic" && (spec.goals || []).includes("athletic") && !conditioningBlock.items.length) {
      const conditioning = pickAny(pool,(e) => e.pattern === "conditioning" && e.impact <= 1,used,rng,[],xp,null,false);
      if (conditioning) { conditioningBlock.items.push(conditioning); slots--; continue; }
    }
    // Preserve coaching and recovery time once every useful job is covered.
    // Unused theoretical slots are better than redundant filler.
    break;
  }

  // Assemble in a sensible order, dropping empties
  const warmupBlock = blocks.find((block) => block.key === "warmup");
  const firstLoadedBlock = strengthBlock.items.length ? strengthBlock : secondaryBlock.items.length ? secondaryBlock : null;
  if (warmupBlock && firstLoadedBlock) {
    const anchor = firstLoadedBlock.items[0], detail = WARMUP_STAGE_DETAILS.rehearse;
    warmupBlock.items.push({
      ...anchor,
      name:anchor.name + " · ramp-up sets",
      cue:"Begin with an empty bar or very light load. Add weight in small jumps while keeping reps low; arrive at the working sets warm, not tired.",
      finisher:false,
      warmupStage:"rehearse",
      warmupStageLabel:detail.label,
      warmupStageExplanation:detail.explanation,
      warmupRx:{ ...detail.rx },
    });
  }
  const ordered = [powerBlock, plyoBlock, primerBlock, strengthBlock, secondaryBlock, circuitBlock, accessoryBlock, isoBlock, coreBlock, conditioningBlock, mobilityBlock, finisherBlock];
  ordered.forEach((b) => { if (b.items.length) blocks.push(b); });
  return blocks;
}

function cardioPrescriptionForSpec(spec, architecture) {
  const minutes = Number(spec.minutes) || 60, xp = Number(spec.experience) || 1, older = Number(spec.age) >= 55;
  if (architecture.id === "aerobic") {
    const duration = ({ 30:18, 45:28, 60:40, 90:60 })[minutes] || Math.max(18,Math.round(minutes * .65));
    return { sets:"1", reps:duration + " min continuous", rest:"none", tempo:"smooth, repeatable pace", rpe:"RPE 4–6 · conversational; finish able to continue" };
  }
  if (architecture.id === "tempo") {
    const protocol = minutes <= 30 ? [3,4] : minutes <= 45 ? [4,4] : minutes <= 60 ? [4,6] : [5,8];
    if (older) protocol[0] = Math.max(3,protocol[0] - 1);
    return { sets:String(protocol[0]), reps:protocol[1] + " min controlled hard", rest:(older ? "3" : "2") + " min easy", tempo:"even output across every repeat", rpe:(older ? "RPE 6–7" : "RPE 7–8") + " · comfortably hard, never a sprint" };
  }
  let rounds = xp === 1 ? 6 : xp === 2 ? 8 : 10;
  if (minutes >= 60) rounds += 2;
  if (older) rounds = Math.max(5,rounds - 2);
  const work = xp === 1 ? 30 : xp === 2 ? 45 : 60, recovery = older ? Math.max(90,work * 2) : xp === 1 ? 60 : xp === 2 ? 75 : 60;
  return { sets:String(rounds), reps:work + " sec hard", rest:recovery + " sec easy", tempo:"repeat the same output; stop before form fades", rpe:(older ? "RPE 7–8" : "RPE 8–9") + " · hard but repeatable" };
}
function mixedConditioningPrescription(spec, architecture) {
  const goal = spec.goal, minutes = Number(spec.minutes) || 60, route = resolvedTrainingRoute(spec), older = Number(spec.age) >= 55;
  if (route === "recovery") {
    return { sets:"1", reps:(minutes <= 30 ? "10–15" : "15–25") + " min easy", rest:"none", rpe:"RPE 2–4 · relaxed breathing; stop if symptoms worsen" };
  }
  if (["strength","hypertrophy"].includes(goal)) {
    return { sets:"1", reps:(minutes <= 45 ? "8–12" : "12–18") + " min continuous", rest:"none", rpe:"RPE 4–5 · easy aerobic work after lifting" };
  }
  if (goal === "athletic" || architecture.id === "athletic") {
    return { sets:older ? "6" : "8", reps:"30 sec fast", rest:older ? "90 sec easy" : "60 sec easy", rpe:(older ? "RPE 7" : "RPE 8") + " · repeat the same output" };
  }
  if (architecture.id === "volume") return { sets:"4", reps:"3 min tempo", rest:"90 sec easy", rpe:"RPE 7 · controlled, sustainable pace" };
  return { sets:"1", reps:(minutes <= 45 ? "12–18" : "18–25") + " min continuous", rest:"none", rpe:"RPE 5–6 · conversational to moderately challenging" };
}
function buildCardioSession(spec, seed, pool) {
  const rng = makeRng(seed || 1), g = GOALS[spec.goal], architecture = optionArchitectureForSpec(spec), preference = cardioPreferencesFor(spec);
  const cardioBase = pool.filter((ex) => ex.finisher !== true && ex.pattern === "conditioning" && (ex.zone === "cardio" || ex.region === "cardio"));
  let candidates = cardioBase.filter((ex) => matchesCardioPreference(ex,preference));
  const preferredUnavailable = !candidates.length && !preference.includes("any");
  if (!candidates.length) candidates = pool.filter((ex) => ex.finisher !== true && ex.pattern === "conditioning");
  const protocolNeutral = candidates.filter((ex) => / cardio$/i.test(ex.name));
  if (protocolNeutral.length) candidates = protocolNeutral;
  const sorted = shuffle(candidates,rng).sort((a,b) => cardioModalityFor(a).localeCompare(cardioModalityFor(b)) || a.name.localeCompare(b.name));
  const offset = Math.floor(rng() * Math.max(1,sorted.length)), index = (offset + Math.abs(Number(spec.optionIndex || 0))) % Math.max(1,sorted.length);
  const chosen = sorted[index];
  const mainRx = cardioPrescriptionForSpec(spec,architecture);
  const warmupPool = pool.filter((ex) => ex.finisher !== true && Array.isArray(ex.preps) && ex.preps.includes("general") && (cardioModalityFor(ex) === "other" || matchesCardioPreference(ex,preference)));
  const sameModeWarmup = warmupPool.find((ex) => chosen && cardioModalityFor(ex) === cardioModalityFor(chosen));
  const warmups = [];
  if (sameModeWarmup) warmups.push(warmupExercise(sameModeWarmup,"raise"));
  else if (warmupPool.length) warmups.push(warmupExercise(shuffle(warmupPool,rng)[0],"raise"));
  const mobilityPool = shuffle(pool.filter((ex) => ex.finisher !== true && ex.pattern === "mobility" && ex.region === "mobility"),rng);
  const dynamicPrep = mobilityPool.find((ex) => Array.isArray(ex.preps) && (ex.preps.includes("lower") || ex.preps.includes("upper") || ex.preps.includes("general")));
  if (dynamicPrep && spec.minutes >= 45) warmups.push(warmupExercise(dynamicPrep,"open"));
  const cooldowns = mobilityPool.filter((ex) => !dynamicPrep || ex.name !== dynamicPrep.name).slice(0,spec.minutes >= 45 ? 2 : 1);
  const blocks = [];
  if (warmups.length) blocks.push({ key:"warmup", title:"Cardio warm-up · build the pace", note:"Raise → Open → Rehearse the exact machine at an easy pace", items:warmups, rx:{ sets:"1", reps:"5–8 min easy / 6–8 dynamic reps", rest:"minimal" } });
  if (chosen) blocks.push({ key:"conditioning", title:architecture.title, note:architecture.short, items:[chosen], rx:mainRx });
  if (cooldowns.length) blocks.push({ key:"mobility", title:"Cool-down · downshift, then restore", note:"First lower the heart rate, then use easy range work—never force end range while fatigued", items:cooldowns.map((ex) => warmupExercise(ex,"downshift")), rx:{ sets:"1–2", reps:"3–5 min easy / 30–45 sec per position", rest:"minimal" } });
  blocks.forEach((block) => {
    block.items = block.items.map((ex) => ({ ...ex, rx:{ ...(ex.warmupRx || block.rx) } }));
    block.groups = block.items.map((ex) => ({ type:"straight", items:[ex] }));
  });
  const modality = chosen ? (CARDIO_MODALITIES[cardioModalityFor(chosen)] && CARDIO_MODALITIES[cardioModalityFor(chosen)].label || chosen.name) : "available conditioning mode";
  const preferenceNote = preferredUnavailable ? " None of the selected cardio machines remained after the equipment and limitation filters, so the workout uses only another filter-matching conditioning option or leaves the main cardio block empty for coach review." : "";
  const goalNotes = {
    conditioning:"Stamina is trained through a distinct aerobic-base, tempo, or interval prescription instead of a resistance circuit.",
    fatloss:"This cardio-focused route raises aerobic work while keeping the pace repeatable enough to accumulate useful weekly volume.",
    general:"This route builds cardiovascular fitness and confidence on familiar gym equipment without requiring a weight-training block.",
    athletic:"This route develops the aerobic or repeat-effort engine that supports sport work; speed and power remain available through the performance route.",
    recovery:"The effort remains easy enough to promote movement and circulation without adding a hard training stress.",
  };
  return finalizeGeneratedSession({ spec, goalLabel:g.label, prescription:mainRx, rationale:(goalNotes[spec.goal] || "Cardio is the primary training stimulus for this session.") + " Main mode: " + modality + ". " + architecture.description + preferenceNote, blocks, poolCount:pool.length, optionArchitecture:architecture, trainingRoute:"cardio" });
}
