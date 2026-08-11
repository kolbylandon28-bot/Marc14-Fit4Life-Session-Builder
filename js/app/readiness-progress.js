/* ---------- Wave 4: readiness ---------- */
let currentReadiness = null;
const READINESS_FOCUS = { "": [], push: ["chest", "shoulders", "arms"], pull: ["back", "arms"], legs: ["quads", "glutes", "hamstrings", "calves"], core: ["core"] };
function renderReadinessProfileLookup() {
  const input = byId("readyClient"), hidden = byId("readyProfile"), results = byId("readyProfileLookupResults"); if (!input || !hidden || !results) return [];
  hidden.value = ""; results.innerHTML = ""; const query = input.value.trim(); if (query.length < 2) return [];
  const matches = findProfilesByLookup(query);
  if (!matches.length) { results.innerHTML = '<div class="lookup-note">No matching profile. You can still check readiness anonymously, or send a profile request from New Session.</div>'; return []; }
  matches.forEach((profile) => { const button = document.createElement("button"), name = document.createElement("strong"), username = document.createElement("span"); button.type = "button"; button.className = "profile-result"; name.textContent = profile.name; username.textContent = "@" + profileUsername(profile); button.append(name,username); button.addEventListener("click", () => selectReadinessProfile(profile.id)); results.appendChild(button); }); return matches;
}
function selectReadinessProfile(profileId) {
  const profile = loadProfiles().find((item) => item.id === profileId); if (!profile) return null;
  byId("readyProfile").value = profile.id; byId("readyClient").value = profile.name + " · @" + profileUsername(profile); byId("readyProfileLookupResults").innerHTML = ""; return profile;
}
function updateReadinessPainFields() {
  const hasPain = Number(byId("readyPain") && byId("readyPain").value || 0) > 0;
  ["readyPainAreaField","readyPainMovementField","readyPainExerciseField"].forEach((id) => { const field = byId(id); if (field) field.hidden = !hasPain; });
  if (hasPain && byId("readyPainArea") && !byId("readyPainArea").options.length) fillSelectOptions(byId("readyPainArea"),painLocationOptions(true),"");
  if (!hasPain) { if (byId("readyPainArea")) byId("readyPainArea").value = ""; if (byId("readyPainMovement")) byId("readyPainMovement").value = "no"; if (byId("readyPainExercise")) byId("readyPainExercise").value = ""; }
}
function syncReadinessPainLevel() {
  if (byId("readyPainMovement").value === "yes" && Number(byId("readyPain").value) < 2) byId("readyPain").value = "2";
  updateReadinessPainFields();
}
function updateReadinessSorenessFields() {
  const targeted = Number(byId("readySoreness") && byId("readySoreness").value || 0) >= 4, field = byId("readySorenessAreaField"), select = byId("readySorenessArea");
  if (field) field.hidden = !targeted;
  if (targeted && select && !select.options.length) fillSelectOptions(select,painLocationOptions(true),"");
  if (!targeted && select) select.value = "";
}
function readinessProfile(score, pain) {
  if (pain >= 3 || score < 35) return { key: "recovery", title: "Recovery only", volume: 0.55, rpe: 5, color: "var(--danger)", message: "Skip hard training. Use gentle mobility or stop; sharp or worsening pain needs qualified evaluation." };
  if (pain >= 2 || score < 50) return { key: "reduce", title: "Reduce and simplify", volume: 0.7, rpe: 6, color: "var(--warn)", message: "Remove power work and finishers, reduce working sets, and keep every movement pain-free." };
  if (score < 70) return { key: "adjust", title: "Train with adjustment", volume: 0.85, rpe: 7, color: "var(--warn)", message: "Keep the planned focus, trim accessory volume, and cap effort at RPE 7." };
  if (score < 85) return { key: "normal", title: "Train as planned", volume: 1, rpe: 8, color: "var(--blue-bright)", message: "Proceed with the plan and use the warm-up to confirm today's loads." };
  return { key: "ready", title: "Ready to perform", volume: 1, rpe: 9, color: "#63c68b", message: "Full planned volume is appropriate. Progress load only while speed and technique stay strong." };
}
function calculateReadiness() {
  const selectedProfile = loadProfiles().find((profile) => profile.id === byId("readyProfile").value);
  if (pendingReadinessStart && (!selectedProfile || selectedProfile.id !== pendingReadinessStart.profileId)) { showToast("Use the profile connected to the assigned workout"); return null; }
  const movementChanged = byId("readyPainMovement") && byId("readyPainMovement").value === "yes";
  if (movementChanged && Number(byId("readyPain").value) < 2) byId("readyPain").value = "2";
  const values = {
    sleepHours:numberFrom("readySleepHours",7.5) || 7.5, sleep: numberFrom("readySleep", 3), energy: numberFrom("readyEnergy", 3),
    soreness: numberFrom("readySoreness", 3), sorenessArea:byId("readySorenessArea") && byId("readySorenessArea").value || "", stress: numberFrom("readyStress", 3), pain: numberFrom("readyPain", 0), painLevel:normalizePainLevel(byId("readyPain").value,movementChanged), painArea:byId("readyPainArea") && byId("readyPainArea").value || "", painExercise:byId("readyPainExercise") && byId("readyPainExercise").value.trim() || "", movementChanged, motivation:numberFrom("readyMotivation",3) || 3, overall:numberFrom("readyOverall",3) || 3, illness:byId("readyIllness").value || "none",
  };
  if (values.pain > 0 && !values.painArea) { values.painArea = "unspecified"; showToast("Add the body area when possible so your trainer can choose a safer alternative"); }
  const sleepDurationPenalty = values.sleepHours >= 7 && values.sleepHours <= 9 ? 0 : values.sleepHours >= 6 && values.sleepHours < 10 ? 5 : values.sleepHours >= 5 ? 10 : 16;
  let score = Math.round(values.sleep * 5 + values.energy * 5 + (6 - values.soreness) * 4 + (6 - values.stress) * 4 + ((3 - values.pain) / 3) * 10 - sleepDurationPenalty + (values.motivation - 3) * 2.5 + (values.overall - 3) * 3);
  if (values.pain >= 2) score = Math.min(score, 49);
  if (values.pain >= 3) score = Math.min(score, 25);
  if (values.illness === "mild") score = Math.min(score,60);
  if (values.illness === "significant") score = Math.min(score,25);
  score = Math.max(0, Math.min(100, score));
  currentReadiness = { ...values, score, ...readinessProfile(score, values.pain), client: selectedProfile ? selectedProfile.name : "Client", profileId: selectedProfile ? selectedProfile.id : "", purpose:pendingReadinessStart ? "pre_workout" : "general", assignmentId:pendingReadinessStart && pendingReadinessStart.assignmentId || "", createdAt: new Date().toISOString() };
  const adjustmentPlan = readinessAdjustmentPlan(currentReadiness);
  currentReadiness.adjustmentPlan = adjustmentPlan;
  currentReadiness.blockStart = adjustmentPlan.blockStart;
  const r = currentReadiness, out = byId("readinessResult");
  out.style.display = "grid";
  out.innerHTML = '<div class="score-ring" style="--score:' + r.score + ';--score-color:' + r.color + '"><strong>' + r.score + '</strong></div><div><div class="result-label">Readiness score</div><div class="readiness-status">' + r.title + '</div><p class="readiness-copy">' + r.message + '</p><p class="readiness-copy"><b>Today:</b> ' + escapeHtml(adjustmentPlan.changes.join(" · ") || "Use the coach-approved workout as written. High readiness does not add unplanned work.") + '</p>' + (portalRole === "client" && !pendingReadinessStart ? '<div class="tool-actions"><button class="small-btn primary" onclick="openClientTab(\'home\')">Return to client home</button><button class="small-btn" onclick="openClientTab(\'progress\')">View my history</button></div>' : '') + '</div>';
  if (portalRole !== "client" && byId("tuneSessionBtn")) byId("tuneSessionBtn").textContent = "Build tuned session";
  if (selectedProfile) byId("logClient").value = selectedProfile.name;
  addProgressEntry({ type: "readiness", profileId:r.profileId, client: r.client, label: r.title, value: r.score + "/100", note: "Sleep quality " + r.sleep + " · energy " + r.energy + " · soreness " + r.soreness + (r.sorenessArea ? " at " + (INJURY_LABELS[r.sorenessArea] || r.sorenessArea) : "") + " · stress " + r.stress + " · pain " + painLevelInfo(r.painLevel).label + (r.painArea ? " at " + (INJURY_LABELS[r.painArea] || r.painArea) : "") + " · illness " + r.illness, data:{...r,adjustmentPlan:{...adjustmentPlan,changes:[...adjustmentPlan.changes]},coachNotice:r.pain > 0 || r.score < 50 || r.illness !== "none",safetyHold:adjustmentPlan.safetyHold} });
  if (pendingReadinessStart) {
    const gate = byId("readinessStartGate"), gateCopy = byId("readinessGateCopy"), actions = byId("readinessGateActions");
    if (gate) gate.style.display = "block";
    if (gateCopy) gateCopy.textContent = adjustmentPlan.blockStart ? "Hard training is paused today. Your trainer can see this check. Use appropriate qualified medical guidance for severe, sharp, worsening, or unexplained symptoms." : adjustmentPlan.changes.length ? "The assigned workout is ready with a temporary adjustment for today. The coach’s master program remains unchanged." : "The coach-approved workout is ready as written. No extra volume was added.";
    if (actions) actions.innerHTML = adjustmentPlan.blockStart ? '<button class="small-btn primary" onclick="openClientTab(\'coach\')">Message my trainer</button><button class="small-btn" onclick="openClientTab(\'home\')">Return home</button>' : '<button class="small-btn primary" onclick="continueReadinessAdjustedWorkout()">' + (adjustmentPlan.changes.length ? 'Start today’s adjusted workout' : 'Start assigned workout') + '</button>';
  }
  renderProgressHistory();
  return r;
}
function tuneSessionForReadiness(session, readiness) {
  if (readiness.key === "ready" || readiness.key === "normal") {
    session.rationale = "Readiness " + readiness.score + "/100: " + readiness.message + " " + session.rationale;
    return session;
  }
  if (readiness.key === "reduce") session.blocks = session.blocks.filter((b) => !["finisher", "plyo", "power"].includes(b.key));
  session.blocks.forEach((block) => {
    const working = !["warmup", "mobility", "primer"].includes(block.key);
    if (working) {
      block.rx.sets = adjustSetCount(block.rx.sets, readiness.key === "adjust" ? -1 : -2);
      block.rx.rpe = "Cap at RPE " + readiness.rpe;
      if (block.items.length > 2) block.items = block.items.slice(0, Math.max(2, Math.ceil(block.items.length * readiness.volume)));
      block.items.forEach((ex) => { ex.rx = { ...block.rx }; });
      block.groups = block.items.map((ex) => ({ type: "straight", items: [ex] }));
    }
  });
  session.prescription.sets = adjustSetCount(session.prescription.sets, readiness.key === "adjust" ? -1 : -2);
  session.prescription.rpe = "Cap at RPE " + readiness.rpe;
  session.rationale = "Readiness " + readiness.score + "/100: " + readiness.message + " " + session.rationale;
  return session;
}
function buildReadinessSession() {
  if (portalRole === "client") { showToast("Readiness was saved. Your trainer controls changes to the assigned workout."); return null; }
  const ready = currentReadiness || calculateReadiness();
  const profile = loadProfiles().find((item) => item.id === ready.profileId);
  const plannedGoal = byId("readyGoal").value;
  const recoveryOnly = ready.key === "recovery";
  const spec = {
    client: ready.client, profileId:profile && profile.id || "",
    goal: recoveryOnly ? "recovery" : plannedGoal,
    experience: Number(byId("readyExp").value), age: Math.max(18, Math.min(90, Math.round(numberFrom("readyAge", 30)))),
    minutes: Number(byId("readyMinutes").value), muscles: recoveryOnly ? [] : READINESS_FOCUS[byId("readyFocus").value], injuries: [...(profile && profile.injuries || [])], limitationAssessments:JSON.parse(JSON.stringify(profile && profile.limitationAssessments || {})), zones: [...(profile && profile.zones || [])], trainingPhase:profile && profile.trainingPhase || "general", sport:profile && profile.sport || "", sportSchedule:profile && profile.sportSchedule || "", competitionDate:profile && profile.competitionDate || "", exercisePreferences:{ ...(profile && profile.exercisePreferences || {}) }, exercisePrescriptions:{ ...(profile && profile.exercisePrescriptions || {}) }, exerciseSubstitutions:{ ...(profile && profile.exerciseSubstitutions || {}) }, phaseCompoundAnchors:{ ...(profile && profile.phaseCompoundAnchors || {}) },
  };
  let session = buildSession(spec, Math.floor(Date.now() / 1000) % 100000);
  session = tuneSessionForReadiness(session, ready);
  applyCompoundAnchorContinuity(session); finalizeGeneratedSession(session); session.readiness = { ...ready };
  state.solo = cloneSpec(spec);
  state.mode = "solo";
  state.sessionOptions = [];
  state.session = { type: "solo", data: session, edits: {} };
  assignSessionIds(state.session);
  renderForms(); setMode("solo"); show("builder"); renderOutput();
  byId("reshuffleBtn").style.display = "none";
  byId("disclaimer").style.display = "block";
  addProgressEntry({ type: "session", client: ready.client, label: session.goalLabel + " session", value: ready.score + "/100 readiness", note: ready.title });
  return session;
}

/* ---------- Wave 4: local progress memory ---------- */
const PROGRESS_KEY = "fit4life_progress_v1";
const PROFILES_KEY = "fit4life_profiles_v1";
const PROFILE_REQUESTS_KEY = "fit4life_profile_requests_v1";
const INTAKE_DAY_IDS = [1,2,3,4,5,6].map((day) => "intakeDay" + day);
const INTAKE_EQUIPMENT_FIELDS = {bodyweight:"intakeEquipBodyweight",dumbbell:"intakeEquipDumbbell",rack:"intakeEquipRack",machine:"intakeEquipMachine",cable:"intakeEquipCable",cardio:"intakeEquipCardio",platform:"intakeEquipPlatform",crossfit:"intakeEquipCrossfit"};
const GOAL_CONTRACT_FIELD_IDS = ["intakeStatedGoal","intakeGoalMetricType","intakeGoalExercise","intakeGoalMetricLabel","intakeGoalBaseline","intakeGoalCurrent","intakeGoalTarget","intakeGoalUnit","intakeGoalTargetDate","intakeGoalMilestone1","intakeGoalMilestone2","intakeGoalMilestone3"];
const INTAKE_FIELD_IDS = ["intakePreferredName","intakeEmail","intakePhone","intakePrimaryGoal","intakeSecondaryGoal",...GOAL_CONTRACT_FIELD_IDS,"intakeSuccess","intakeWhy","intakeDaysPerWeek","intakeSessionMinutes",...INTAKE_DAY_IDS,"intakeLocation","intakeOccupation","intakeBarriers",...Object.values(INTAKE_EQUIPMENT_FIELDS),"intakeEquipmentNotes","intakeHeart","intakeChest","intakeDizzy","intakeBoneJoint","intakeMedication","intakeOtherMedical","intakeCurrentPain","intakeMedicalNotes","intakeSleep","intakeStress","intakeActivity","intakeNutritionSupport","intakeConfidence","intakeCoachingStyle","intakeUnfamiliar","intakeEmergencyName","intakeEmergencyRelation","intakeEmergencyPhone","intakeTruth","intakePrivacy","intakeNotMedical","intakeTrainerDecision","intakeTrainerNote","intakeTrainerReviewed"];
const INTAKE_SAFETY_FIELDS = ["heart","chest","dizzy","boneJoint","medication","otherMedical"];
function uniqueProfileValues(values) { return [...new Set((Array.isArray(values) ? values : []).filter(Boolean))]; }
function intakeTextHas(text,patterns) {
  const source = String(text || "").toLowerCase();
  return patterns.some((pattern) => {
    const match = source.match(pattern); if (!match) return false;
    const before = source.slice(Math.max(0,match.index - 18),match.index);
    return !/(?:\bno\b|\bnot\b|\bwithout\b|\bdenies?\b)\s+(?:current\s+|active\s+|any\s+)?$/.test(before);
  });
}
function intakeDerivedLimitations(intakeValue) {
  const intake = intakeValue || {}, text = [intake.currentPain,intake.medicalNotes].filter(Boolean).join(" · "), limitations = [];
  const add = (key,patterns) => { if (intakeTextHas(text,patterns)) limitations.push(key); };
  add("knee",[/\bknees?\b/]); add("shoulder",[/\bshoulders?\b/]); add("lowback",[/\blower\s+back\b/,/\blow\s+back\b/,/\blumbar\b/]);
  add("wrist",[/\bwrists?\b/]); add("hip",[/\bhips?\b/]); add("elbow",[/\belbows?\b/]); add("ankle",[/\bankles?\b/]);
  add("neck",[/\bneck\b/]); add("foot",[/\bfeet\b/,/\bfoot\b/,/\btoes?\b/]); add("handgrip",[/\bhands?\b/,/\bgrip\b/]);
  add("thoracic",[/\bupper\s+back\b/,/\bribs?\b/,/\bthoracic\b/]); add("abdominal",[/\babdominal\b/,/\babdomen\b/,/\bhernia\b/]);
  add("pregnancy",[/\bpregnan(?:t|cy)\b/]); add("postpartum",[/\bpost[ -]?partum\b/]);
  if (intake.health && intake.health.dizzy === "yes") limitations.push("balance");
  if (/(?:avoid|limit|restrict|cannot|can't|pain(?:ful)?\s+with)\b[^.]{0,35}\boverhead\b/i.test(text)) limitations.push("nooverhead");
  if (/(?:avoid|limit|restrict|cannot|can't|pain(?:ful)?\s+with)\b[^.]{0,35}\b(?:hinge|hinging|deadlift)\b/i.test(text)) limitations.push("nohinge");
  return uniqueProfileValues(limitations).filter((key) => Object.prototype.hasOwnProperty.call(INJURY_LABELS,key));
}
function profileWithIntakeFilters(profileValue,options) {
  const profile = profileValue || {}, intake = profile.intake && typeof profile.intake === "object" ? profile.intake : null;
  if (!intake || !Object.keys(intake).length) return profile;
  const schedule = intake.schedule || {}, goals = Array.isArray(intake.goals) && intake.goals.length ? uniqueProfileValues(intake.goals).slice(0,2) : profile.goals;
  const zones = Array.isArray(intake.equipmentZones) && intake.equipmentZones.length ? uniqueProfileValues(intake.equipmentZones) : profile.zones;
  const trainingDays = Array.isArray(schedule.trainingDays) && schedule.trainingDays.length ? uniqueProfileValues(schedule.trainingDays.map(Number)).filter((day) => day >= 1 && day <= 6).sort((a,b) => a - b) : profile.trainingDays;
  const previousDerived = uniqueProfileValues(profile.intakeDerivedInjuries || []), nonDerivedProfileInjuries = (profile.injuries || []).filter((key) => !previousDerived.includes(key));
  const explicitManual = Array.isArray(profile.manualInjuries) ? uniqueProfileValues([...profile.manualInjuries,...nonDerivedProfileInjuries]) : nonDerivedProfileInjuries;
  const derived = intakeDerivedLimitations(intake), manualInjuries = uniqueProfileValues(explicitManual), injuries = uniqueProfileValues([...manualInjuries,...derived]);
  const next = {
    ...profile,goals:goals && goals.length ? goals : profile.goals,availableDays:Number(schedule.daysPerWeek) || Number(profile.availableDays) || 3,
    minutes:Number(schedule.sessionMinutes) || Number(profile.minutes) || 60,trainingDays:trainingDays && trainingDays.length ? trainingDays : profile.trainingDays,
    zones:zones && zones.length ? zones : profile.zones,manualInjuries,injuries,intakeDerivedInjuries:derived,
    preferredName:intake.identity && intake.identity.preferredName || profile.preferredName || "",contactEmail:intake.identity && intake.identity.email || profile.contactEmail || "",
    contactPhone:intake.identity && intake.identity.phone || profile.contactPhone || "",trainingLocation:intake.location || profile.trainingLocation || "",
    occupation:intake.occupation || profile.occupation || "",consistencyBarriers:intake.barriers || profile.consistencyBarriers || "",equipmentNotes:intake.equipmentNotes || profile.equipmentNotes || "",
    sleepBaseline:intake.sleep || profile.sleepBaseline || "",stressBaseline:intake.stress || profile.stressBaseline || "",activityBaseline:intake.activity || profile.activityBaseline || "",
    nutritionSupport:intake.nutritionSupport || profile.nutritionSupport || "",confidence:intake.confidence || profile.confidence || "",coachingStyle:intake.coachingStyle || profile.coachingStyle || "",
    unfamiliarMovements:intake.unfamiliar || profile.unfamiliarMovements || "",emergencyContact:intake.emergency || profile.emergencyContact || {},
    onboardingStatus:intake.status || profile.onboardingStatus || "in_progress",onboardingPercent:Number(intake.percentComplete) || Number(profile.onboardingPercent) || 0,
    onboardingUpdatedAt:intake.updatedAt || profile.onboardingUpdatedAt || "",onboardingCompletedAt:intake.submittedAt || profile.onboardingCompletedAt || ""
  };
  if (options && options.touch) next.updatedAt = new Date().toISOString();
  return next;
}
const GOAL_METRIC_DEFAULTS = {
  sessions_week:{label:"Completed workouts per week",unit:"workouts"},
  exercise_load:{label:"Working weight",unit:"lb"},
  exercise_reps:{label:"Completed reps or seconds",unit:"reps"},
  body_weight:{label:"Body weight",unit:"lb"},
  body_fat:{label:"Body-fat percentage",unit:"%"},
  cardio:{label:"Cardio time or distance",unit:"minutes"},
  custom:{label:"Personal progress measure",unit:""}
};
function goalNumber(value) {
  if (value === "" || value == null) return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}
function goalCategoryLabel(profile,intake) {
  const goal = (intake && intake.goals || profile && profile.goals || [])[0];
  return goal && GOALS[goal] ? GOALS[goal].label : goal || "Personal training goal";
}
function normalizeGoalContract(contractValue,profile,intakeValue) {
  const contract = contractValue && typeof contractValue === "object" ? contractValue : {}, intake = intakeValue || profile && profile.intake || {};
  const metricType = String(contract.metricType || ""), defaults = GOAL_METRIC_DEFAULTS[metricType] || {};
  const rawMilestones = Array.isArray(contract.milestones) ? contract.milestones : [];
  return {
    version:1,
    statedGoal:String(contract.statedGoal || "").trim(),
    deeperReason:String(contract.deeperReason || intake.why || "").trim(),
    metricType,
    metricLabel:String(contract.metricLabel || "").trim(),
    exercise:String(contract.exercise || "").trim(),
    baselineValue:goalNumber(contract.baselineValue),
    currentValue:goalNumber(contract.currentValue),
    targetValue:goalNumber(contract.targetValue),
    unit:String(contract.unit || defaults.unit || "").trim(),
    targetDate:String(contract.targetDate || "").slice(0,10),
    milestones:rawMilestones.map((item,index) => typeof item === "string"
      ? {id:"milestone-" + (index + 1),label:item.trim(),completed:false,completedAt:""}
      : {id:item.id || "milestone-" + (index + 1),label:String(item.label || "").trim(),completed:Boolean(item.completed),completedAt:item.completedAt || ""}).filter((item) => item.label),
    definitionOfSuccess:String(contract.definitionOfSuccess || intake.successDefinition || "").trim(),
    createdAt:contract.createdAt || intake.createdAt || "",
    updatedAt:contract.updatedAt || intake.updatedAt || "",
    lastReviewedAt:contract.lastReviewedAt || ""
  };
}
function goalContractFor(profile) {
  const intake = profile && profile.intake || {};
  return normalizeGoalContract(intake.goalContract || profile && profile.goalContract || {},profile,intake);
}
function goalContractIsComplete(contractValue) {
  const contract = normalizeGoalContract(contractValue);
  return Boolean(contract.statedGoal && contract.deeperReason && contract.metricType && contract.metricLabel && contract.targetValue != null && contract.targetDate && contract.milestones.length && contract.definitionOfSuccess);
}
function goalContractCurrentEvidence(profile,contractValue) {
  const contract = normalizeGoalContract(contractValue,profile), type = contract.metricType;
  if (type === "sessions_week") {
    const cutoff = Date.now() - 7 * 86400000;
    const completed = assignmentsForClient(profile.id).filter((assignment) => {
      if (!["completed","reviewed"].includes(assignmentStatus(assignment))) return false;
      const date = assignment.completedAt || assignment.clientReview && assignment.clientReview.completedAt || assignment.updatedAt || assignment.assignedAt;
      return date && new Date(date).getTime() >= cutoff;
    });
    return {value:completed.length,source:"Completed workouts in the last 7 days",automatic:true};
  }
  if (type === "exercise_load" || type === "exercise_reps") {
    const matches = trainerEntriesFor(profile.name).filter((entry) => entry.type === "set" && entry.data && (!contract.exercise || String(entry.label || "").toLowerCase() === contract.exercise.toLowerCase())).sort((a,b) => String(b.date || "").localeCompare(String(a.date || "")));
    const data = matches[0] && matches[0].data || {}, value = type === "exercise_load" ? goalNumber(data.load) : goalNumber(data.reps);
    return {value,source:matches[0] ? "Latest logged " + (contract.exercise || matches[0].label) : "No matching exercise result yet",automatic:true};
  }
  if (type === "body_weight" || type === "body_fat") {
    const scan = inBodyScansFor(profile.name)[0], value = scan ? goalNumber(type === "body_weight" ? scan.weight : scan.pbf) : null;
    return {value,source:scan ? "Latest body-composition scan · " + new Date(scan.date + "T12:00:00").toLocaleDateString() : "No body-composition scan yet",automatic:true};
  }
  return {value:contract.currentValue,source:contract.currentValue == null ? "Current value needs an update" : "Client or trainer update",automatic:false};
}
function goalContractProgress(profile) {
  const contract = goalContractFor(profile), evidence = goalContractCurrentEvidence(profile,contract), current = goalNumber(evidence.value), baseline = goalNumber(contract.baselineValue), target = goalNumber(contract.targetValue);
  let percent = null;
  if (current != null && baseline != null && target != null) {
    percent = target === baseline ? current === target ? 100 : 0 : Math.max(0,Math.min(100,Math.round((current - baseline) / (target - baseline) * 100)));
  }
  const targetTime = contract.targetDate ? new Date(contract.targetDate + "T23:59:59").getTime() : NaN;
  const daysRemaining = Number.isFinite(targetTime) ? Math.ceil((targetTime - Date.now()) / 86400000) : null;
  const completedMilestones = contract.milestones.filter((item) => item.completed).length;
  return {contract,current,baseline,target,percent,evidence,daysRemaining,completedMilestones,totalMilestones:contract.milestones.length};
}
function goalValueLabel(value,unit) {
  return value == null ? "Not recorded" : String(Math.round(value * 100) / 100) + (unit ? " " + unit : "");
}
function updateGoalContractFields() {
  const typeField = byId("intakeGoalMetricType"); if (!typeField) return;
  const type = typeField.value, defaults = GOAL_METRIC_DEFAULTS[type] || {}, exerciseField = byId("intakeGoalExerciseField"), currentField = byId("intakeGoalCurrentField");
  if (exerciseField) exerciseField.classList.toggle("goal-contract-field-hidden",!["exercise_load","exercise_reps","cardio"].includes(type));
  if (currentField) currentField.classList.toggle("goal-contract-field-hidden",["sessions_week","exercise_load","exercise_reps","body_weight","body_fat"].includes(type));
  const label = byId("intakeGoalMetricLabel"), unit = byId("intakeGoalUnit"), baseline = byId("intakeGoalBaseline");
  if (type && label && !label.value.trim()) label.value = defaults.label || "";
  if (type && unit && !unit.value.trim()) unit.value = defaults.unit || "";
  if (type === "sessions_week" && baseline && !baseline.value) baseline.value = "0";
  const date = byId("intakeGoalTargetDate"); if (date) date.min = new Date().toISOString().slice(0,10);
}
function goalContractDateLabel(contract,progress) {
  if (!contract.targetDate) return "Date not set";
  const date = new Date(contract.targetDate + "T12:00:00").toLocaleDateString();
  if (progress.daysRemaining == null) return date;
  if (progress.daysRemaining < 0) return date + " · review overdue";
  if (progress.daysRemaining === 0) return date + " · today";
  return date + " · " + progress.daysRemaining + " days";
}
function goalContractClientHtml(profile,mode) {
  const progress = goalContractProgress(profile), contract = progress.contract, complete = goalContractIsComplete(contract), full = mode === "progress";
  if (!contract.statedGoal && !contract.deeperReason) {
    return '<section class="client-card wide goal-contract-card"><div class="client-section-label">Your goal contract</div><div class="goal-contract-head"><div><h3>Define what you are working toward</h3><p>A clear reason, measurable target, date, milestones, and definition of success help you and your trainer make better decisions.</p></div><button class="small-btn primary" onclick="openClientGoalContract(\'' + escapeHtml(profile.id) + '\')">Build my goal</button></div></section>';
  }
  const title = contract.statedGoal || goalCategoryLabel(profile,profile.intake), percent = progress.percent;
  const progressHtml = percent == null
    ? '<div class="goal-contract-track" style="--goal-progress:0%"><i></i></div><div class="goal-contract-progress-copy"><span>' + escapeHtml(progress.evidence.source) + '</span><b>Baseline needed</b></div>'
    : '<div class="goal-contract-track" style="--goal-progress:' + percent + '%"><i></i></div><div class="goal-contract-progress-copy"><span>' + escapeHtml(progress.evidence.source) + '</span><b>' + percent + '% toward target</b></div>';
  const milestones = full ? contract.milestones.map((item,index) => '<button class="goal-contract-milestone-dark ' + (item.completed ? 'done' : '') + '" onclick="toggleGoalMilestone(\'' + escapeHtml(profile.id) + '\',' + index + ')"><i>' + (item.completed ? '✓' : index + 1) + '</i><span>' + escapeHtml(item.label) + '</span></button>').join("")
    : (() => { const index = contract.milestones.findIndex((item) => !item.completed), item = contract.milestones[index]; return item ? '<div class="goal-contract-milestone-dark"><i>' + (index + 1) + '</i><span>Next milestone · ' + escapeHtml(item.label) + '</span></div>' : contract.milestones.length ? '<div class="goal-contract-milestone-dark done"><i>✓</i><span>Every milestone is complete</span></div>' : ''; })();
  const currentLabel = goalValueLabel(progress.current,contract.unit), targetLabel = goalValueLabel(progress.target,contract.unit);
  return '<section class="client-card wide goal-contract-card"><div class="client-section-label">' + (complete ? 'Your goal contract' : 'Goal contract · needs details') + '</div><div class="goal-contract-head"><div><h3>' + escapeHtml(title) + '</h3><p>' + escapeHtml(contract.metricLabel || 'Add one measurable target to track this goal honestly.') + '</p></div><button class="small-btn" onclick="openClientGoalContract(\'' + escapeHtml(profile.id) + '\')">' + (complete ? 'Review goal' : 'Finish goal') + '</button></div>'
    + (contract.deeperReason ? '<div class="goal-contract-why"><b>Why this matters to you</b>' + escapeHtml(contract.deeperReason) + '</div>' : '')
    + progressHtml
    + '<div class="goal-contract-targets"><div class="goal-contract-target"><span>Current</span><b>' + escapeHtml(currentLabel) + '</b></div><div class="goal-contract-target"><span>Target</span><b>' + escapeHtml(targetLabel) + '</b></div><div class="goal-contract-target"><span>Target date</span><b>' + escapeHtml(goalContractDateLabel(contract,progress)) + '</b></div></div>'
    + (milestones ? '<div class="goal-contract-milestones-dark">' + milestones + '</div>' : '')
    + (full && contract.definitionOfSuccess ? '<div class="goal-contract-definition"><b>Your definition of success:</b> ' + escapeHtml(contract.definitionOfSuccess) + '</div>' : '')
    + (full && !progress.evidence.automatic && contract.metricType ? '<div class="tool-actions"><button class="small-btn" onclick="updateGoalCurrentValue(\'' + escapeHtml(profile.id) + '\')">Update current value</button></div>' : '')
    + '</section>';
}
function trainerGoalContractSummaryHtml(profile) {
  const progress = goalContractProgress(profile), contract = progress.contract, complete = goalContractIsComplete(contract);
  const milestoneRows = contract.milestones.length ? contract.milestones.map((item,index) => '<button class="goal-contract-milestone-dark ' + (item.completed ? 'done' : '') + '" onclick="toggleGoalMilestone(\'' + escapeHtml(profile.id) + '\',' + index + ')"><i>' + (item.completed ? '✓' : index + 1) + '</i><span>' + escapeHtml(item.label) + '</span></button>').join("") : '<div class="analysis-history-item"><span>No milestones entered.</span></div>';
  return '<section class="analysis-panel" style="margin-top:14px"><div class="analysis-panel-head"><div><h4 class="analysis-section-title">Goal contract</h4><p style="font-size:9px;color:var(--text-faint);margin-top:4px">' + (complete ? 'The client’s reason and measurable target are connected to real progress evidence.' : 'This goal still needs a reason, measurable target, target date, milestone, or definition of success.') + '</p></div><button class="small-btn primary" onclick="openClientGoalContract(\'' + escapeHtml(profile.id) + '\')">' + (complete ? 'Review contract' : 'Finish contract') + '</button></div>'
    + '<div class="simple-stat-grid"><div class="simple-stat"><b>' + escapeHtml(goalValueLabel(progress.current,contract.unit)) + '</b><span>Current</span></div><div class="simple-stat"><b>' + escapeHtml(goalValueLabel(progress.target,contract.unit)) + '</b><span>Target</span></div><div class="simple-stat"><b>' + (progress.percent == null ? '—' : progress.percent + '%') + '</b><span>Measured progress</span></div><div class="simple-stat"><b>' + progress.completedMilestones + '/' + progress.totalMilestones + '</b><span>Milestones</span></div></div>'
    + '<div class="analysis-grid" style="margin-top:12px"><div class="analysis-history"><div class="analysis-history-item"><b>Stated goal</b><span>' + escapeHtml(contract.statedGoal || 'Not entered') + '</span></div><div class="analysis-history-item"><b>Deeper reason</b><span>' + escapeHtml(contract.deeperReason || 'Not entered') + '</span></div><div class="analysis-history-item"><b>Measure</b><span>' + escapeHtml((contract.metricLabel || 'Not entered') + (progress.evidence.source ? ' · ' + progress.evidence.source : '')) + '</span></div></div><div class="analysis-history"><div class="analysis-history-item"><b>Target date</b><span>' + escapeHtml(goalContractDateLabel(contract,progress)) + '</span></div><div class="analysis-history-item"><b>Definition of success</b><span>' + escapeHtml(contract.definitionOfSuccess || 'Not entered') + '</span></div></div></div>'
    + '<h4 class="analysis-section-title" style="margin-top:14px">Milestones · tap to update</h4><div class="goal-contract-milestones-dark">' + milestoneRows + '</div>'
    + (!progress.evidence.automatic && contract.metricType ? '<div class="tool-actions"><button class="small-btn" onclick="updateGoalCurrentValue(\'' + escapeHtml(profile.id) + '\')">Update current value</button></div>' : '') + '</section>';
}
function openClientGoalContract(profileId) {
  const profile = loadProfiles().find((item) => item.id === (profileId || activeClientProfileId())); if (!profile) return false;
  if (!openClientIntake(profile.id,portalRole === "trainer" ? "trainer" : "client")) return false;
  const section = document.querySelector('#clientIntakeDialog [data-intake-key="goals"]');
  if (section) {
    document.querySelectorAll("#clientIntakeDialog .intake-section").forEach((item) => { item.open = item === section; });
    setTimeout(() => section.scrollIntoView({behavior:"smooth",block:"start"}),50);
  }
  return true;
}
function refreshGoalContractViews(profile) {
  if (portalRole === "client" && CLIENT_APP_VIEWS.includes(currentView)) renderClientAppView(currentView);
  else if (portalRole === "trainer") { selectedTrainerClient = profile.name; renderTrainerHub(profile.name); }
}
function toggleGoalMilestone(profileId,index) {
  const profiles = loadProfiles(), profileIndex = profiles.findIndex((item) => item.id === profileId); if (profileIndex < 0) return false;
  const profile = profiles[profileIndex], contract = goalContractFor(profile), milestone = contract.milestones[Number(index)]; if (!milestone) return false;
  milestone.completed = !milestone.completed; milestone.completedAt = milestone.completed ? new Date().toISOString() : ""; contract.updatedAt = new Date().toISOString();
  const intake = {...(profile.intake || {}),goalContract:contract,why:contract.deeperReason,successDefinition:contract.definitionOfSuccess,updatedAt:contract.updatedAt};
  profiles[profileIndex] = {...profile,intake,updatedAt:contract.updatedAt};
  if (!writeProfiles(profiles)) return false;
  if (milestone.completed) addProgressEntry({type:"goal_milestone",client:profile.name,label:milestone.label,value:"Completed",note:"Goal contract milestone"});
  refreshGoalContractViews(profiles[profileIndex]);
  showToast(milestone.completed ? "Milestone completed" : "Milestone reopened");
  return true;
}
function updateGoalCurrentValue(profileId) {
  const profiles = loadProfiles(), profileIndex = profiles.findIndex((item) => item.id === profileId); if (profileIndex < 0) return false;
  const profile = profiles[profileIndex], contract = goalContractFor(profile), evidence = goalContractCurrentEvidence(profile,contract);
  if (evidence.automatic) { showToast("This value updates automatically from " + evidence.source.toLowerCase()); return false; }
  const answer = prompt("Current " + (contract.metricLabel || "goal value") + (contract.unit ? " (" + contract.unit + ")" : ""),contract.currentValue == null ? "" : contract.currentValue);
  if (answer == null) return false;
  const value = goalNumber(answer); if (value == null) { showToast("Enter a valid number"); return false; }
  contract.currentValue = value; contract.updatedAt = new Date().toISOString();
  const intake = {...(profile.intake || {}),goalContract:contract,updatedAt:contract.updatedAt};
  profiles[profileIndex] = {...profile,intake,updatedAt:contract.updatedAt};
  if (!writeProfiles(profiles)) return false;
  addProgressEntry({type:"goal_update",client:profile.name,label:contract.metricLabel || "Goal progress",value:goalValueLabel(value,contract.unit),data:{metricType:contract.metricType,currentValue:value,unit:contract.unit}});
  refreshGoalContractViews(profiles[profileIndex]); showToast("Goal progress updated"); return true;
}
function intakeSafetySignature(intake) { return JSON.stringify({health:intake && intake.health || {},currentPain:String(intake && intake.currentPain || "").trim()}); }
function intakeReviewSignature(intake) {
  const goal = normalizeGoalContract(intake && intake.goalContract || {},null,intake || {});
  const reviewGoal = {statedGoal:goal.statedGoal,deeperReason:goal.deeperReason,metricType:goal.metricType,metricLabel:goal.metricLabel,exercise:goal.exercise,baselineValue:goal.baselineValue,targetValue:goal.targetValue,unit:goal.unit,targetDate:goal.targetDate,milestones:goal.milestones.map((item) => item.label),definitionOfSuccess:goal.definitionOfSuccess};
  return JSON.stringify({identity:intake && intake.identity || {},goals:intake && intake.goals || [],goalContract:reviewGoal,schedule:intake && intake.schedule || {},equipmentZones:intake && intake.equipmentZones || [],health:intake && intake.health || {},currentPain:String(intake && intake.currentPain || "").trim(),lifestyle:[intake && intake.sleep,intake && intake.stress,intake && intake.activity],coaching:[intake && intake.confidence,intake && intake.coachingStyle],emergency:intake && intake.emergency || {},consent:intake && intake.consent || {}});
}
function intakeSafetyRequired(intake) {
  if (!intake) return false;
  return INTAKE_SAFETY_FIELDS.some((key) => intake.health && intake.health[key] === "yes") || Boolean(String(intake.currentPain || "").trim());
}
function intakeCompletion(profile,intakeValue) {
  const intake = intakeValue || profile && profile.intake || {}, health = intake.health || {}, consent = intake.consent || {}, emergency = intake.emergency || {}, identity = intake.identity || {}, schedule = intake.schedule || {};
  const goals = Array.isArray(intake.goals) && intake.goals.length ? intake.goals : profile && profile.goals || [];
  const goalContract = normalizeGoalContract(intake.goalContract || {},profile,intake);
  const equipmentZones = Array.isArray(intake.equipmentZones) && intake.equipmentZones.length ? intake.equipmentZones : profile && profile.zones || [];
  const trainingDays = Array.isArray(schedule.trainingDays) && schedule.trainingDays.length ? schedule.trainingDays : profile && profile.trainingDays || [];
  const checks = [
    {key:"identity",ready:Boolean((identity.preferredName || profile && profile.name) && (identity.email || profile && profile.email))},
    {key:"goals",ready:Boolean(goals.length && goalContractIsComplete(goalContract))},
    {key:"schedule",ready:Boolean((schedule.daysPerWeek || profile && profile.availableDays) && (schedule.sessionMinutes || profile && profile.minutes) && trainingDays.length && intake.location)},
    {key:"equipment",ready:Boolean(equipmentZones.length)},
    {key:"health",ready:INTAKE_SAFETY_FIELDS.every((key) => ["yes","no"].includes(health[key]))},
    {key:"lifestyle",ready:Boolean(intake.sleep && intake.stress && intake.activity)},
    {key:"experience",ready:Boolean(intake.confidence && intake.coachingStyle)},
    {key:"emergency",ready:Boolean(emergency.name && emergency.phone && emergency.relationship)},
    {key:"consent",ready:Boolean(consent.truth && consent.privacy && consent.notMedical)}
  ];
  const complete = checks.filter((item) => item.ready).length, clientComplete = complete === checks.length, safetyRequired = intakeSafetyRequired(intake);
  const trainerReviewComplete = Boolean(intake.reviewedAt && intake.trainerDecision && intake.trainerReviewed), safetyReviewed = !safetyRequired || trainerReviewComplete;
  const hardSafetyBlocked = safetyRequired && !trainerReviewComplete || intake.trainerDecision === "hold";
  return {checks,complete,total:checks.length,percent:Math.round(complete / checks.length * 100),clientComplete,safetyRequired,safetyReviewed,trainerReviewComplete,programmingBlocked:hardSafetyBlocked,approvalBlocked:!clientComplete || !trainerReviewComplete || intake.trainerDecision === "hold",status:clientComplete ? trainerReviewComplete ? "complete" : "trainer_review" : "in_progress"};
}
function intakeFromFields(existing,trainerMode) {
  const value = (id) => String(byId(id) && byId(id).value || "").trim(), checked = (id) => Boolean(byId(id) && byId(id).checked);
  const goals = [value("intakePrimaryGoal"),value("intakeSecondaryGoal")].filter((goal,index,array) => goal && array.indexOf(goal) === index);
  const trainingDays = INTAKE_DAY_IDS.map((id,index) => checked(id) ? index + 1 : null).filter(Boolean);
  const equipmentZones = Object.entries(INTAKE_EQUIPMENT_FIELDS).filter(([,id]) => checked(id)).map(([zone]) => zone);
  const previousContract = normalizeGoalContract(existing && existing.goalContract || {},null,existing || {});
  const milestoneLabels = [value("intakeGoalMilestone1"),value("intakeGoalMilestone2"),value("intakeGoalMilestone3")];
  const now = new Date().toISOString();
  const goalContract = {
    version:1,statedGoal:value("intakeStatedGoal"),deeperReason:value("intakeWhy"),metricType:value("intakeGoalMetricType"),metricLabel:value("intakeGoalMetricLabel"),exercise:value("intakeGoalExercise"),
    baselineValue:goalNumber(value("intakeGoalBaseline")),currentValue:goalNumber(value("intakeGoalCurrent")),targetValue:goalNumber(value("intakeGoalTarget")),unit:value("intakeGoalUnit"),targetDate:value("intakeGoalTargetDate"),
    milestones:milestoneLabels.map((label,index) => {
      const prior = previousContract.milestones[index], unchanged = prior && prior.label === label;
      return label ? {id:unchanged ? prior.id : "milestone-" + (index + 1),label,completed:unchanged && prior.completed,completedAt:unchanged ? prior.completedAt : ""} : null;
    }).filter(Boolean),
    definitionOfSuccess:value("intakeSuccess"),createdAt:previousContract.createdAt || now,updatedAt:now,lastReviewedAt:previousContract.lastReviewedAt || ""
  };
  const intake = {
    version:3,
    identity:{preferredName:value("intakePreferredName"),email:value("intakeEmail").toLowerCase(),phone:value("intakePhone")},
    goals,
    goalContract,successDefinition:goalContract.definitionOfSuccess,why:goalContract.deeperReason,location:value("intakeLocation"),occupation:value("intakeOccupation"),barriers:value("intakeBarriers"),
    schedule:{daysPerWeek:Number(value("intakeDaysPerWeek")) || null,sessionMinutes:Number(value("intakeSessionMinutes")) || null,trainingDays},
    equipmentZones,equipmentNotes:value("intakeEquipmentNotes"),
    health:{heart:value("intakeHeart"),chest:value("intakeChest"),dizzy:value("intakeDizzy"),boneJoint:value("intakeBoneJoint"),medication:value("intakeMedication"),otherMedical:value("intakeOtherMedical")},
    currentPain:value("intakeCurrentPain"),medicalNotes:value("intakeMedicalNotes"),sleep:value("intakeSleep"),stress:value("intakeStress"),activity:value("intakeActivity"),nutritionSupport:value("intakeNutritionSupport"),
    confidence:value("intakeConfidence"),coachingStyle:value("intakeCoachingStyle"),unfamiliar:value("intakeUnfamiliar"),
    emergency:{name:value("intakeEmergencyName"),relationship:value("intakeEmergencyRelation"),phone:value("intakeEmergencyPhone")},
    consent:{truth:checked("intakeTruth"),privacy:checked("intakePrivacy"),notMedical:checked("intakeNotMedical")},
    trainerDecision:trainerMode ? value("intakeTrainerDecision") : existing && existing.trainerDecision || "",
    trainerNote:trainerMode ? value("intakeTrainerNote") : existing && existing.trainerNote || "",
    trainerReviewed:trainerMode ? checked("intakeTrainerReviewed") : Boolean(existing && existing.trainerReviewed),
    reviewedAt:existing && existing.reviewedAt || "",reviewedBy:existing && existing.reviewedBy || "",
    submittedAt:existing && existing.submittedAt || "",updatedAt:new Date().toISOString(),lastEditorRole:trainerMode ? "trainer" : "client"
  };
  return intake;
}
function setIntakeFields(intakeValue) {
  const profile = arguments[1] || {}, intake = intakeValue || {}, identity = intake.identity || {}, schedule = intake.schedule || {}, health = intake.health || {}, emergency = intake.emergency || {}, consent = intake.consent || {};
  const profileGoals = profile.goals || [], goalContract = normalizeGoalContract(intake.goalContract || {},profile,intake), values = {intakePreferredName:identity.preferredName || profile.name,intakeEmail:identity.email || profile.email || (portalRole === "client" ? currentAccountIdentity().email : ""),intakePhone:identity.phone,intakePrimaryGoal:(intake.goals || profileGoals)[0],intakeSecondaryGoal:(intake.goals || profileGoals)[1],intakeStatedGoal:goalContract.statedGoal,intakeGoalMetricType:goalContract.metricType,intakeGoalExercise:goalContract.exercise,intakeGoalMetricLabel:goalContract.metricLabel,intakeGoalBaseline:goalContract.baselineValue,intakeGoalCurrent:goalContract.currentValue,intakeGoalTarget:goalContract.targetValue,intakeGoalUnit:goalContract.unit,intakeGoalTargetDate:goalContract.targetDate,intakeGoalMilestone1:goalContract.milestones[0] && goalContract.milestones[0].label,intakeGoalMilestone2:goalContract.milestones[1] && goalContract.milestones[1].label,intakeGoalMilestone3:goalContract.milestones[2] && goalContract.milestones[2].label,intakeSuccess:goalContract.definitionOfSuccess,intakeWhy:goalContract.deeperReason,intakeDaysPerWeek:schedule.daysPerWeek || profile.availableDays,intakeSessionMinutes:schedule.sessionMinutes || profile.minutes,intakeLocation:intake.location,intakeOccupation:intake.occupation,intakeBarriers:intake.barriers,intakeEquipmentNotes:intake.equipmentNotes,intakeHeart:health.heart,intakeChest:health.chest,intakeDizzy:health.dizzy,intakeBoneJoint:health.boneJoint,intakeMedication:health.medication,intakeOtherMedical:health.otherMedical,intakeCurrentPain:intake.currentPain,intakeMedicalNotes:intake.medicalNotes,intakeSleep:intake.sleep,intakeStress:intake.stress,intakeActivity:intake.activity,intakeNutritionSupport:intake.nutritionSupport,intakeConfidence:intake.confidence,intakeCoachingStyle:intake.coachingStyle,intakeUnfamiliar:intake.unfamiliar,intakeEmergencyName:emergency.name,intakeEmergencyRelation:emergency.relationship,intakeEmergencyPhone:emergency.phone,intakeTrainerDecision:intake.trainerDecision,intakeTrainerNote:intake.trainerNote};
  Object.keys(values).forEach((id) => { if (byId(id)) byId(id).value = values[id] == null ? "" : values[id]; });
  const selectedDays = schedule.trainingDays && schedule.trainingDays.length ? schedule.trainingDays.map(Number) : profile.trainingDays || inferredTrainingDays(profile,profile.availableDays || 3);
  INTAKE_DAY_IDS.forEach((id,index) => { if (byId(id)) byId(id).checked = selectedDays.includes(index + 1); });
  const selectedZones = intake.equipmentZones && intake.equipmentZones.length ? intake.equipmentZones : profile.zones || [];
  Object.entries(INTAKE_EQUIPMENT_FIELDS).forEach(([zone,id]) => { if (byId(id)) byId(id).checked = selectedZones.includes(zone); });
  [["intakeTruth",consent.truth],["intakePrivacy",consent.privacy],["intakeNotMedical",consent.notMedical],["intakeTrainerReviewed",intake.trainerReviewed]].forEach(([id,value]) => { if (byId(id)) byId(id).checked = Boolean(value); });
  updateGoalContractFields();
}
function clientIntakeTrainerMode() {
  const dialog = byId("clientIntakeDialog");
  return Boolean(dialog && dialog.classList.contains("trainer-mode") && trainerIsUnlocked());
}
function paintClientIntakeStatus() {
  const profile = loadProfiles().find((item) => item.id === byId("clientIntakeProfileId").value); if (!profile) return;
  const trainerMode = clientIntakeTrainerMode(), intake = intakeFromFields(profile.intake || {},trainerMode), status = intakeCompletion(profile,intake), safety = byId("clientIntakeSafetyMessage");
  byId("clientIntakePercent").textContent = status.percent + "%";
  byId("clientIntakeStatus").textContent = status.status === "complete" ? "Ready" : status.status === "trainer_review" ? "Trainer review required" : "In progress";
  byId("clientIntakeProgressCopy").textContent = status.complete + " of " + status.total + " onboarding sections ready";
  byId("clientIntakeProgressBar").style.width = status.percent + "%";
  byId("clientIntakeNextCopy").textContent = status.status === "complete" ? "Onboarding and trainer review are complete." : status.status === "trainer_review" ? "Client sections are complete. A trainer must review and document the baseline decision." : "Finish the next incomplete client section; progress is saved when you close.";
  byId("clientIntakeSaveBtn").textContent = status.status === "trainer_review" && trainerMode ? "Complete trainer review" : status.percent === 100 ? "Submit onboarding" : "Save progress";
  safety.className = "intake-safety" + (status.safetyRequired ? "" : " good");
  safety.textContent = status.safetyRequired ? "Trainer review required: at least one health-readiness answer or current limitation needs a documented coaching decision before difficult programming." : "No safety-review trigger has been entered. The trainer should still review the complete intake and current symptoms.";
}
function goToNextIncompleteIntakeSection() {
  const profile = loadProfiles().find((item) => item.id === byId("clientIntakeProfileId").value); if (!profile) return false;
  const trainerMode = clientIntakeTrainerMode(), status = intakeCompletion(profile,intakeFromFields(profile.intake || {},trainerMode));
  const next = status.checks.find((check) => !check.ready), key = next ? next.key : status.trainerReviewComplete ? "" : "trainer";
  if (!key) { showToast("Every onboarding step is complete"); return true; }
  if (key === "trainer" && !trainerMode) { showToast("Your client sections are complete. Your trainer will finish the review."); return false; }
  const section = document.querySelector('#clientIntakeDialog [data-intake-key="' + key + '"]');
  if (!section) return false;
  document.querySelectorAll("#clientIntakeDialog .intake-section").forEach((item) => { item.open = item === section; });
  section.scrollIntoView({behavior:"smooth",block:"start"});
  const field = section.querySelector("input,select,textarea"); if (field) setTimeout(() => field.focus(),250);
  return true;
}
function openClientIntake(profileId,mode) {
  const profile = loadProfiles().find((item) => item.id === profileId); if (!profile) { showToast("Choose a client first"); return false; }
  const requestedTrainerMode = mode === "trainer" || portalRole === "trainer", trainerMode = requestedTrainerMode && trainerIsUnlocked();
  byId("clientIntakeProfileId").value = profile.id;
  byId("clientIntakeTitle").textContent = (trainerMode ? "Review " : "") + profile.name + " · onboarding";
  byId("clientIntakeCopy").textContent = trainerMode ? "Review what the client submitted, document any safety decision, and finish missing coaching context." : "Answer one short section at a time. Your saved answers stay on your client profile, synchronize across signed-in devices, and help filter future workouts. You can return whenever you need.";
  byId("clientIntakeDialog").classList.toggle("trainer-mode",trainerMode);
  setIntakeFields(profile.intake || {},profile);
  INTAKE_FIELD_IDS.forEach((id) => {
    const field = byId(id); if (!field) return;
    field.onchange = () => { if (id === "intakeGoalMetricType") updateGoalContractFields(); paintClientIntakeStatus(); };
    field.oninput = paintClientIntakeStatus;
  });
  paintClientIntakeStatus();
  byId("clientIntakeModal").classList.add("open");
  return true;
}
function openClientOnboarding() {
  const profile = activeClientProfile();
  portalRole = "client";
  if (!profile) {
    showToast("Connect your client profile first, then open onboarding");
    openClientWorkout();
    return false;
  }
  return openClientIntake(profile.id,"client");
}
function openIntakeFromProfileEditor() {
  const id = byId("profileEditId").value;
  if (!id) { showToast("Create the profile first, then open its intake checklist"); return; }
  closeProfileEditor(); openClientIntake(id,"trainer");
}
function closeClientIntake() { byId("clientIntakeModal").classList.remove("open"); }
async function saveClientIntake() {
  const profileId = byId("clientIntakeProfileId").value, profiles = loadProfiles(), index = profiles.findIndex((item) => item.id === profileId); if (index < 0) return null;
  const trainerMode = clientIntakeTrainerMode(), previous = profiles[index].intake || {}, intake = intakeFromFields(previous,trainerMode);
  if (intakeReviewSignature(previous) !== intakeReviewSignature(intake) && !trainerMode) { intake.reviewedAt = ""; intake.reviewedBy = ""; intake.trainerReviewed = false; intake.trainerDecision = ""; }
  const statusBeforeReview = intakeCompletion(profiles[index],intake);
  if (trainerMode && intake.trainerReviewed && intake.trainerDecision) { intake.reviewedAt = new Date().toISOString(); intake.reviewedBy = currentAccountIdentity().displayName; }
  else if (trainerMode && (!intake.trainerReviewed || !intake.trainerDecision)) { intake.reviewedAt = ""; intake.reviewedBy = ""; }
  if (statusBeforeReview.complete === statusBeforeReview.total && !intake.submittedAt) intake.submittedAt = new Date().toISOString();
  const status = intakeCompletion(profiles[index],intake); intake.status = status.status; intake.percentComplete = status.percent; intake.safetyReviewRequired = status.safetyRequired;
  const emailUpdate = trainerMode && !profiles[index].email && intake.identity && intake.identity.email ? {email:intake.identity.email} : {};
  profiles[index] = profileWithIntakeFilters({...profiles[index],...emailUpdate,intake},{touch:true});
  if (!writeProfiles(profiles)) return null;
  const saveButtons = [...document.querySelectorAll("#clientIntakeModal .tool-actions button")];
  saveButtons.forEach((button) => { button.disabled = true; });
  const mainSaveButton = byId("clientIntakeSaveBtn"), originalSaveLabel = mainSaveButton && mainSaveButton.textContent;
  if (mainSaveButton) mainSaveButton.textContent = "Saving to profile…";
  let cloudSaved = null;
  try {
    if (typeof window.fit4lifeCloudSaveProfileNow === "function") cloudSaved = await window.fit4lifeCloudSaveProfileNow(profileId);
  } catch (_) { cloudSaved = false; }
  saveButtons.forEach((button) => { button.disabled = false; });
  if (mainSaveButton && originalSaveLabel) mainSaveButton.textContent = originalSaveLabel;
  closeClientIntake();
  if (portalRole === "client") renderClientHome(profiles[index]);
  else { selectedTrainerClient = profiles[index].name; renderTrainerHub(profiles[index].name); }
  renderTrainerAttention();
  const saveCopy = cloudSaved === false ? "Saved on this device · cloud upload is waiting for a connection" : "Saved to client profile";
  showToast(status.programmingBlocked ? saveCopy + " · trainer safety decision required before difficult programming" : status.status === "complete" ? saveCopy + " · onboarding and trainer review complete" : status.status === "trainer_review" ? saveCopy + " · trainer review is next" : saveCopy + " · " + status.percent + "% complete");
  return intake;
}

let profileEditorTarget = null;
let profileEditorDraft = { muscles: [], injuries: [], zones: [], preferences:{}, cardioModes:["any"], trainingDays:[1,3,5] };
function loadProgress() {
  try {
    const data = JSON.parse(localStorage.getItem(PROGRESS_KEY) || "[]");
    return Array.isArray(data) ? data : [];
  } catch (_) { return []; }
}
function writeProgress(entries) {
  try { localStorage.setItem(PROGRESS_KEY, JSON.stringify(entries.slice(0, 1500))); return true; }
  catch (_) { const status = byId("storageStatus"); if (status) status.textContent = "This browser blocked local storage. Export entries before closing the page."; return false; }
}
function loadProfiles() {
  try {
    const data = JSON.parse(localStorage.getItem(PROFILES_KEY) || "[]");
    return Array.isArray(data) ? data.map((profile) => profileWithIntakeFilters(profile)) : [];
  } catch (_) { return []; }
}
function writeProfiles(profiles) {
  try { localStorage.setItem(PROFILES_KEY, JSON.stringify(profiles.slice(0, 100))); return true; }
  catch (_) { showToast("This browser could not save the client profile"); return false; }
}
function clientMatches(a, b) { return String(a || "Client").trim().toLowerCase() === String(b || "Client").trim().toLowerCase(); }
function normalizeProfileName(value) {
  let text = String(value || "").trim().toLowerCase();
  try { text = text.normalize("NFKD").replace(/[\u0300-\u036f]/g, ""); } catch (_) {}
  return text.replace(/[^a-z0-9]+/g, " ").trim().replace(/\s+/g, " ");
}
function normalizeUsername(value) {
  return String(value || "").trim().toLowerCase().replace(/^@+/, "").replace(/\s+/g, "-").replace(/[^a-z0-9._-]/g, "").replace(/[-_.]{2,}/g, "-").replace(/^[-_.]+|[-_.]+$/g, "");
}
function usernameFromName(name) {
  const base = normalizeProfileName(name).replace(/\s+/g, "-");
  return base.length >= 3 ? base : (base ? base + "-client" : "client");
}
function profileUsername(profile) { return normalizeUsername(profile && profile.username) || usernameFromName(profile && profile.name); }
function editDistance(a, b) {
  a = String(a || ""); b = String(b || ""); if (a === b) return 0; if (!a.length) return b.length; if (!b.length) return a.length;
  let previous = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let i = 1; i <= a.length; i++) { const current = [i]; for (let j = 1; j <= b.length; j++) current[j] = Math.min(current[j - 1] + 1, previous[j] + 1, previous[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); previous = current; }
  return previous[b.length];
}
function findProfileConflict(profiles, name, username, excludeId) {
  const normalizedName = normalizeProfileName(name), compactName = normalizedName.replace(/\s/g, ""), normalizedUser = normalizeUsername(username);
  for (const profile of profiles || []) {
    if (!profile || profile.id === excludeId) continue;
    const existingName = normalizeProfileName(profile.name), existingCompact = existingName.replace(/\s/g, ""), existingUser = profileUsername(profile);
    if (normalizedUser && normalizedUser === existingUser) return { profile, reason: "username" };
    if (normalizedName && normalizedName === existingName) return { profile, reason: "name" };
    if (compactName.length >= 5 && existingCompact.length >= 5 && editDistance(compactName, existingCompact) <= 1) return { profile, reason: "similar" };
  }
  return null;
}
function findProfilesByLookup(query) {
  const nameQuery = normalizeProfileName(query), compactQuery = nameQuery.replace(/\s/g, ""), userQuery = normalizeUsername(query);
  if (!nameQuery && !userQuery) return [];
  return loadProfiles().map((profile) => {
    const name = normalizeProfileName(profile.name), compact = name.replace(/\s/g, ""), username = profileUsername(profile); let score = 99;
    if (userQuery && username === userQuery) score = 0;
    else if (name === nameQuery) score = 1;
    else if (userQuery && username.startsWith(userQuery)) score = 2;
    else if (name.startsWith(nameQuery) || name.includes(nameQuery)) score = 3;
    else if (compactQuery.length >= 5 && editDistance(compactQuery, compact) <= 2) score = 4;
    return { profile, score };
  }).filter((item) => item.score < 99).sort((a,b) => a.score - b.score || a.profile.name.localeCompare(b.profile.name)).slice(0,6).map((item) => item.profile);
}
function loadProfileRequests() {
  try { const data = JSON.parse(localStorage.getItem(PROFILE_REQUESTS_KEY) || "[]"); return Array.isArray(data) ? data : []; }
  catch (_) { return []; }
}
function writeProfileRequests(requests) {
  try { localStorage.setItem(PROFILE_REQUESTS_KEY, JSON.stringify((requests || []).slice(0,100))); return true; }
  catch (_) { showToast("This browser could not save the profile request"); return false; }
}
function requestProfileCreation(name, username) {
  name = String(name || "").trim(); username = normalizeUsername(username || usernameFromName(name));
  if (normalizeProfileName(name).length < 2) { showToast("Enter the client’s full name"); return null; }
  if (username.length < 3) { showToast("Use a username with at least three letters or numbers"); return null; }
  const existing = findProfileConflict(loadProfiles(), name, username);
  if (existing) { showToast(existing.reason === "similar" ? "A very similar profile already exists. Search for it before requesting another." : "That name or username already belongs to a saved profile."); return null; }
  const requests = loadProfileRequests(), pending = findProfileConflict(requests, name, username);
  if (pending) { showToast("A matching profile request is already waiting for a trainer"); return null; }
  const request = { id: "request-" + Date.now() + "-" + Math.random().toString(16).slice(2), name, username, createdAt: new Date().toISOString() };
  if (!writeProfileRequests([request, ...requests])) return null; showToast("Profile request sent to the trainers"); return request;
}
function profileRecordFromTarget(target, name, username) {
  target = target || {};
  const cardioModes = normalizeCardioPreferences(target.cardioModes || target.cardioMode);
  return {
    name: String(name || target.client || "").trim(), username: normalizeUsername(username || target.username || usernameFromName(name || target.client)), email:String(target.email || "").trim().toLowerCase(),
    goals: [...new Set(((target.goals && target.goals.length ? target.goals : [target.goal || "general"]).filter(Boolean)))].slice(0,2),
    trainingStyle: target.trainingStyle || "auto", cardioMode: cardioModes[0], cardioModes,
    experience: Number(target.experience) || 1, age: Number(target.age) || 30, minutes: Number(target.minutes) || 60,
    muscles: [...(target.muscles || [])], injuries: [...(target.injuries || [])], manualInjuries:[...(target.injuries || [])], zones: [...(target.zones || [])],
    trainingPhase:target.trainingPhase || "general", availableDays:Number(target.availableDays) || 3, trainingDays:inferredTrainingDays(target,Number(target.availableDays) || 3),
    sport:String(target.sport || "").trim(), sportSchedule:String(target.sportSchedule || "").trim(), competitionDate:target.competitionDate || "",
    exercisePreferences:{ ...(target.exercisePreferences || {}) },
    exercisePrescriptions:{ ...(target.exercisePrescriptions || {}) },
    exerciseSubstitutions:{ ...(target.exerciseSubstitutions || {}) },
    limitationAssessments:JSON.parse(JSON.stringify(target.limitationAssessments || {})),
    phaseCompoundAnchors:{ ...(target.phaseCompoundAnchors || {}) },
  };
}
function createClientProfile(record) {
  if (!requireTrainerMutation("create client profiles")) return null;
  const next = profileRecordFromTarget(record, record && record.name, record && record.username);
  if (normalizeProfileName(next.name).length < 2) { showToast("Add the client’s full name before creating the profile"); return null; }
  if (next.username.length < 3) { showToast("Use a username with at least three letters or numbers"); return null; }
  const profiles = loadProfiles(), conflict = findProfileConflict(profiles, next.name, next.username);
  if (conflict) { showToast(conflict.reason === "similar" ? "A very similar client profile already exists. Open it before creating another." : "That name or username is already assigned to a client profile."); return null; }
  next.id = "profile-" + Date.now() + "-" + Math.random().toString(16).slice(2); next.lastReview = null; next.phaseStartedAt = new Date().toISOString(); next.updatedAt = new Date().toISOString();
  if (!writeProfiles([next, ...profiles])) return null; refreshProfileSelects(); showToast("Created " + next.name + " without adding a duplicate"); return next;
}
function approveProfileRequest(requestId) {
  if (!requireTrainerMutation("approve profile requests")) return null;
  const requests = loadProfileRequests(), request = requests.find((item) => item.id === requestId); if (!request) return null;
  const profile = createClientProfile({ name: request.name, username: request.username, goals: ["general"], experience: 1, age: 30, minutes: 60, muscles: [], injuries: [], zones: [] });
  if (!profile) return null;
  writeProfileRequests(requests.filter((item) => item.id !== requestId)); selectedTrainerClient = profile.name; renderTrainerHub(profile.name); openProfileEditor(profile.id); return profile;
}
function dismissProfileRequest(requestId) {
  if (!requireTrainerMutation("dismiss profile requests")) return false;
  const requests = loadProfileRequests(); if (!requests.some((item) => item.id === requestId)) return false;
  writeProfileRequests(requests.filter((item) => item.id !== requestId)); renderProfileRequests(); showToast("Profile request dismissed"); return true;
}
function profileGuidance(profile) {
  const review = profile && profile.lastReview;
  if (profile && profile.coachAdjustment && profile.coachAdjustment.action) {
    const labels = { repeat:"repeat the successful plan", progress:"progress one variable", reduce:"reduce load or volume", pain_swap:"replace the painful pattern" };
    return "Coach-approved next step: " + (labels[profile.coachAdjustment.action] || "review the plan") + (profile.coachAdjustment.note ? ". Note: " + profile.coachAdjustment.note : ".");
  }
  if (!review) return "Profile saved. Goals, limitations, and equipment will be ready next time.";
  if (review.pain && review.pain !== "none") return "Last workout reported " + (review.injuryArea ? INJURY_LABELS[review.injuryArea].toLowerCase() : "pain") + ". It is now filtered from future sessions; reassess before loading it again.";
  if (review.difficulty >= 9 || review.completion === "stopped") return "The last workout was too demanding. Start the next session with less load or volume.";
  if (review.difficulty <= 6 && review.completion === "all" && review.energy >= 3) return "The last workout was completed comfortably. A small rep or load increase may be appropriate.";
  return "The last workout was manageable. Repeat clean loads and progress only where form stayed strong.";
}
function saveProfileFromTarget(target) {
  if (!requireTrainerMutation("save client profiles")) return null;
  const active = loadProfiles().find((profile) => profile.id === target.profileId);
  const next = active ? updateClientProfile(active.id, profileRecordFromTarget(target, target.client, active.username)) : createClientProfile(profileRecordFromTarget(target, target.client, target.username));
  if (!next) return null; target.profileId = next.id; target.client = next.name; target.username = next.username; refreshProfileSelects(); showToast("Saved " + next.name + " as a reusable client profile"); return next;
}
function updateClientProfile(profileId, updates) {
  if (!requireTrainerMutation("edit client profiles")) return null;
  const profiles = loadProfiles(), index = profiles.findIndex((profile) => profile.id === profileId); if (index < 0) return null;
  const previous = profiles[index], name = String(updates.name || "").trim(), username = normalizeUsername(updates.username || previous.username || usernameFromName(name));
  if (!name) { showToast("Add the client name before saving changes"); return null; }
  if (username.length < 3) { showToast("Use a username with at least three letters or numbers"); return null; }
  const conflict = findProfileConflict(profiles, name, username, profileId); if (conflict) { showToast(conflict.reason === "similar" ? "That name is nearly identical to another client. Confirm the existing profile first." : "Another saved profile already uses that name or username"); return null; }
  const goals = [...new Set((updates.goals || previous.goals || ["general"]).filter(Boolean))].slice(0,2);
  const phaseChanged = updates.trainingPhase && updates.trainingPhase !== previous.trainingPhase;
  const cardioModes = normalizeCardioPreferences(updates.cardioModes || updates.cardioMode || previous.cardioModes || previous.cardioMode);
  const availableDays = Number(updates.availableDays || previous.availableDays) || 3, trainingDays = [...new Set((updates.trainingDays || previous.trainingDays || inferredTrainingDays(previous,availableDays)).map(Number).filter((day) => day >= 1 && day <= 6))].sort((a,b) => a - b);
  const trainerInjuries = [...(updates.injuries || previous.manualInjuries || previous.injuries || [])], now = new Date().toISOString();
  const previousIntake = previous.intake && typeof previous.intake === "object" ? previous.intake : null;
  const syncedIntake = previousIntake ? {
    ...previousIntake,goals:goals.length ? [...goals] : ["general"],
    schedule:{...(previousIntake.schedule || {}),daysPerWeek:availableDays,sessionMinutes:Number(updates.minutes) || Number(previous.minutes) || 60,trainingDays:trainingDays.length ? [...trainingDays] : inferredTrainingDays(previous,availableDays)},
    equipmentZones:[...(updates.zones || previous.zones || [])],updatedAt:now,lastEditorRole:"trainer"
  } : previousIntake;
  const limitationAssessments = Object.fromEntries(trainerInjuries.map((tag) => [tag,normalizedLimitationAssessment(updates.limitationAssessments && updates.limitationAssessments[tag] || previous.limitationAssessments && previous.limitationAssessments[tag])]));
  const next = profileWithIntakeFilters({ ...previous, ...updates, name, username, goals: goals.length ? goals : ["general"], trainingStyle:updates.trainingStyle || previous.trainingStyle || "auto", cardioMode:cardioModes[0], cardioModes, experience: Number(updates.experience) || 1, age: Number(updates.age) || 30, minutes: Number(updates.minutes) || 60, muscles: [...(updates.muscles || previous.muscles || [])], injuries:trainerInjuries,manualInjuries:trainerInjuries,limitationAssessments,zones: [...(updates.zones || previous.zones || [])], trainingPhase:updates.trainingPhase || previous.trainingPhase || "general", phaseStartedAt:phaseChanged ? now : previous.phaseStartedAt || previous.updatedAt || now, availableDays, trainingDays:trainingDays.length ? trainingDays : inferredTrainingDays(previous,availableDays), sport:String(updates.sport != null ? updates.sport : previous.sport || "").trim(), sportSchedule:String(updates.sportSchedule != null ? updates.sportSchedule : previous.sportSchedule || "").trim(), competitionDate:updates.competitionDate != null ? updates.competitionDate : previous.competitionDate || "", exercisePreferences:{ ...(updates.exercisePreferences || previous.exercisePreferences || {}) }, exercisePrescriptions:{ ...(updates.exercisePrescriptions || previous.exercisePrescriptions || {}) },exerciseSubstitutions:{ ...(updates.exerciseSubstitutions || previous.exerciseSubstitutions || {}) }, phaseCompoundAnchors:phaseChanged ? {} : { ...(updates.phaseCompoundAnchors || previous.phaseCompoundAnchors || {}) }, intake:syncedIntake,updatedAt:now });
  profiles[index] = next; if (!writeProfiles(profiles)) return null;
  if (!clientMatches(previous.name, next.name) || previous.name !== next.name) {
    const entries = loadProgress(); entries.forEach((entry) => { if (clientMatches(entry.client, previous.name)) entry.client = next.name; }); writeProgress(entries);
    const scans = loadInBodyScans(); scans.forEach((scan) => { if (clientMatches(scan.client, previous.name)) scan.client = next.name; }); writeInBodyScans(scans);
    const bodyGoals = loadBodyGoals(); bodyGoals.forEach((goal) => { if (clientMatches(goal.client, previous.name)) goal.client = next.name; }); writeBodyGoals(bodyGoals);
    const assignments = loadAssignedWorkouts(); assignments.forEach((assignment) => { if (assignment.profileId === profileId || clientMatches(assignment.client,previous.name)) { assignment.client = next.name; workoutPlans(assignment.session).forEach((plan) => { plan.session.spec.client = next.name; plan.session.spec.profileId = next.id; }); } }); writeAssignedWorkouts(assignments);
    const checkins = loadCheckIns(); checkins.forEach((item) => { if (item.profileId === profileId || clientMatches(item.client,previous.name)) item.client = next.name; }); writeCheckIns(checkins);
    const metrics = loadAthleteMetrics(); metrics.forEach((item) => { if (item.profileId === profileId || clientMatches(item.client,previous.name)) item.client = next.name; }); writeAthleteMetrics(metrics);
    const mentalPlans = loadMentalPlans(); mentalPlans.forEach((item) => { if (item.profileId === profileId || clientMatches(item.client,previous.name)) item.client = next.name; }); writeLocalArray(MENTAL_PLANS_KEY,mentalPlans,500);
    const automationAlerts = loadAutomationAlerts(); automationAlerts.forEach((item) => { if (item.profileId === profileId || clientMatches(item.client,previous.name)) item.client = next.name; }); writeLocalArray(AUTOMATION_ALERTS_KEY,automationAlerts,500);
    if (clientMatches(selectedTrainerClient, previous.name)) selectedTrainerClient = next.name;
  }
  [state.solo,state.p1,state.p2].forEach((target) => { if (target && target.profileId === profileId) Object.assign(target, { profileId: next.id, client: next.name, username: next.username, goal: next.goals[0], goals: [...next.goals], trainingStyle:next.trainingStyle || "auto", cardioMode:next.cardioMode || "any", cardioModes:normalizeCardioPreferences(next.cardioModes || next.cardioMode), coachAdjustment:next.coachAdjustment ? { ...next.coachAdjustment } : null, experience: next.experience, age: next.age, minutes: next.minutes, muscles: [...next.muscles], injuries: [...next.injuries], limitationAssessments:{...(next.limitationAssessments || {})}, zones: [...next.zones], trainingPhase:next.trainingPhase || "general", phaseStartedAt:next.phaseStartedAt || "", availableDays:Number(next.availableDays) || 3, sport:next.sport || "", sportSchedule:next.sportSchedule || "", competitionDate:next.competitionDate || "", exercisePreferences:{ ...(next.exercisePreferences || {}) }, exercisePrescriptions:{...(next.exercisePrescriptions || {})}, exerciseSubstitutions:{...(next.exerciseSubstitutions || {})}, phaseCompoundAnchors:{ ...(next.phaseCompoundAnchors || {}) } }); });
  return next;
}
function renderProfileEditorChoices() {
  const groups = [["profileEditMuscles","muscles",MUSCLE_LIST,MUSCLE_LABELS],["profileEditInjuries","injuries",COMMON_LIMITATIONS,INJURY_LABELS],["profileEditZones","zones",ALL_ZONES,ZONE_LABELS]];
  groups.forEach(([id,key,items,labels]) => { const container = byId(id); if (!container) return; container.innerHTML = items.map((value) => '<button type="button" class="profile-editor-choice' + (profileEditorDraft[key].includes(value) ? ' on' : '') + '" aria-pressed="' + profileEditorDraft[key].includes(value) + '" onclick="toggleProfileEditorChoice(\'' + key + '\',\'' + value + '\')">' + escapeHtml(labels[value] || value) + '</button>').join(""); });
  const cardio = byId("profileEditCardioChips"); if (cardio) cardio.innerHTML = multiChoiceButtonsHtml(cardioChoiceEntries(),profileEditorDraft.cardioModes || ["any"],"toggleProfileEditorCardio");
  const days = byId("profileEditTrainingDays"); if (days) days.innerHTML = multiChoiceButtonsHtml(TRAINING_WEEKDAYS.map(([value,label]) => [String(value),label]),(profileEditorDraft.trainingDays || []).map(String),"toggleProfileEditorTrainingDay");
  renderProfileLimitationAssessments();
}
function toggleProfileEditorChoice(key, value) {
  if (!profileEditorDraft[key]) return; const index = profileEditorDraft[key].indexOf(value); if (index >= 0) { profileEditorDraft[key].splice(index,1); if (key === "injuries" && profileEditorDraft.limitationAssessments) delete profileEditorDraft.limitationAssessments[value]; } else { profileEditorDraft[key].push(value); if (key === "injuries") profileEditorDraft.limitationAssessments[value] = normalizedLimitationAssessment(value === "medicalhold" ? {severity:"severe",ability:"cannot",decision:"hold"} : {}); } renderProfileEditorChoices();
}
function renderProfileLimitationAssessments() {
  const list = byId("profileLimitationAssessments"); if (!list) return;
  const selected = profileEditorDraft.injuries || [], assessments = profileEditorDraft.limitationAssessments || (profileEditorDraft.limitationAssessments = {});
  if (!selected.length) { list.innerHTML = '<div class="lookup-note">No current limitation selected.</div>'; return; }
  list.innerHTML = selected.map((tag) => {
    const item = normalizedLimitationAssessment(assessments[tag]), absolute = tag === "medicalhold" || item.severity === "severe" || item.ability === "cannot" || item.decision === "hold";
    assessments[tag] = item;
    return '<article class="limitation-assessment-card"><div class="limitation-assessment-head"><b>' + escapeHtml(INJURY_LABELS[tag] || tag) + '</b><span>' + (absolute ? 'Hard stop' : item.decision === 'allow' ? 'Trial allowed' : item.decision === 'modified' ? 'Modified trial' : 'Filtered') + '</span></div><div class="limitation-assessment-grid">'
      + '<div class="compact-field"><label>Current severity</label><select onchange="setProfileLimitationAssessment(\'' + tag + '\',\'severity\',this.value)"><option value="mild"' + (item.severity === 'mild' ? ' selected' : '') + '>Mild / occasional</option><option value="moderate"' + (item.severity === 'moderate' ? ' selected' : '') + '>Moderate / needs modification</option><option value="severe"' + (item.severity === 'severe' ? ' selected' : '') + '>Severe, worsening, or changes movement</option></select></div>'
      + '<div class="compact-field"><label>Client says they can</label><select onchange="setProfileLimitationAssessment(\'' + tag + '\',\'ability\',this.value)"><option value="normal"' + (item.ability === 'normal' ? ' selected' : '') + '>Move normally</option><option value="modified"' + (item.ability === 'modified' ? ' selected' : '') + '>Move with modification</option><option value="cannot"' + (item.ability === 'cannot' ? ' selected' : '') + '>Cannot do this pattern now</option></select></div>'
      + '<div class="compact-field"><label>Trainer decision</label><select onchange="setProfileLimitationAssessment(\'' + tag + '\',\'decision\',this.value)"><option value="avoid"' + (item.decision === 'avoid' ? ' selected' : '') + '>Keep filtered out</option><option value="modified"' + (item.decision === 'modified' ? ' selected' : '') + '>Allow only documented modified exercises</option><option value="allow"' + (item.decision === 'allow' ? ' selected' : '') + '>Allow a coached normal trial</option><option value="hold"' + (item.decision === 'hold' ? ' selected' : '') + '>Hold / seek qualified guidance</option></select></div>'
      + '<div class="compact-field wide"><label>What is tolerated, what aggravates it, and coaching modifications</label><input type="text" value="' + escapeHtml(item.note) + '" onchange="setProfileLimitationAssessment(\'' + tag + '\',\'note\',this.value)" placeholder="Example: box squat to comfortable depth; avoid twisting under load"></div></div>'
      + '<div class="limitation-assessment-warning ' + (absolute ? 'hard' : '') + '">' + (absolute ? 'This remains a hard stop. A client’s confidence cannot clear severe, movement-changing, or medically held activity.' : item.decision === 'allow' ? 'The generator may use this area only because the trainer documented mild severity, normal movement, and an approved trial. Reassess if symptoms change.' : item.decision === 'modified' ? 'The generator still filters conflicts. A trainer can approve a specific modified exercise with a visible override and reason.' : 'Conflicting exercises stay filtered through warm-up, work sets, conditioning, and cool-down.') + '</div></article>';
  }).join('');
}
function setProfileLimitationAssessment(tag,key,value) {
  if (!profileEditorDraft.limitationAssessments) profileEditorDraft.limitationAssessments = {};
  const item = normalizedLimitationAssessment(profileEditorDraft.limitationAssessments[tag]); item[key] = value;
  if (tag === "medicalhold") { item.severity = "severe"; item.ability = "cannot"; item.decision = "hold"; }
  if ((item.severity === "severe" || item.ability === "cannot") && item.decision === "allow") item.decision = "hold";
  item.reviewedAt = new Date().toISOString(); item.reviewedBy = currentAccountIdentity().displayName;
  profileEditorDraft.limitationAssessments[tag] = item; renderProfileLimitationAssessments();
}
function toggleProfileEditorCardio(value) {
  profileEditorDraft.cardioModes = normalizeCardioPreferences(toggleMultiChoiceValue(profileEditorDraft.cardioModes,value,true)); renderProfileEditorChoices();
}
function toggleProfileEditorTrainingDay(value) {
  const day = Number(value), selected = profileEditorDraft.trainingDays || [], next = selected.includes(day) ? selected.filter((item) => item !== day) : [...selected,day].sort((a,b) => a - b);
  if (!next.length) { showToast("Choose at least one usual training day"); return; }
  profileEditorDraft.trainingDays = next; const count = byId("profileEditDays"); if (count) count.value = String(Math.min(5,Math.max(2,next.length))); renderProfileEditorChoices();
}
function renderProfileExercisePreferences() {
  const list = byId("profilePreferenceList"); if (!list) return;
  const entries = Object.entries(profileEditorDraft.preferences || {}).filter(([,value]) => value && value !== "neutral").sort((a,b) => a[0].localeCompare(b[0]));
  list.innerHTML = entries.length ? entries.map(([id,value]) => { const ex = LIBRARY.find((item) => exerciseId(item) === id); return '<div class="preference-row"><span><b>' + escapeHtml(ex ? ex.name : id) + '</b><small>' + escapeHtml(value) + '</small></span><button type="button" class="mini-btn" onclick="removeProfileExercisePreference(\'' + escapeHtml(id) + '\')">Remove</button></div>'; }).join("") : '<div class="lookup-note">No exercise preferences saved. Neutral is assumed.</div>';
}
function setProfileExercisePreference() {
  const typed = byId("profilePreferenceExercise").value.trim(), exercise = LIBRARY.find((item) => item.name.toLowerCase() === typed.toLowerCase());
  if (!exercise) { showToast("Choose an exercise from the exercise bank"); return false; }
  const value = byId("profilePreferenceValue").value;
  if (!EXERCISE_PREFERENCE_VALUES.includes(value)) return false;
  if (value === "neutral") delete profileEditorDraft.preferences[exerciseId(exercise)]; else profileEditorDraft.preferences[exerciseId(exercise)] = value;
  byId("profilePreferenceExercise").value = ""; renderProfileExercisePreferences(); return true;
}
function removeProfileExercisePreference(id) { delete profileEditorDraft.preferences[id]; renderProfileExercisePreferences(); }
function prepareProfileEditorMenus() {
  byId("profileEditPrimary").innerHTML = GOAL_OPTIONS.map(([value,label]) => '<option value="' + value + '">' + escapeHtml(label) + '</option>').join("");
  byId("profileEditSecondary").innerHTML = '<option value="">No secondary goal</option>' + GOAL_OPTIONS.map(([value,label]) => '<option value="' + value + '">' + escapeHtml(label) + '</option>').join("");
  byId("profileEditExperience").innerHTML = EXP_OPTIONS.map(([value,label]) => '<option value="' + value + '">' + escapeHtml(label) + '</option>').join("");
  byId("profileEditMinutes").innerHTML = TIME_OPTIONS.map(([value,label]) => '<option value="' + value + '">' + escapeHtml(label) + '</option>').join("");
  byId("profileExerciseNames").innerHTML = LIBRARY.map((exercise) => '<option value="' + escapeHtml(exercise.name) + '"></option>').join("");
}
function prepareProfileTrainerMenu(selectedId,selectedName) {
  const select = byId('profileEditTrainer'); if (!select) return;
  const identity = currentAccountIdentity(), trainers = Array.isArray(window.fit4lifeCloudTrainers) ? window.fit4lifeCloudTrainers.slice() : [];
  if (identity.id && ['owner','trainer'].includes(identity.role) && !trainers.some((trainer) => trainer.user_id === identity.id)) trainers.push({user_id:identity.id,display_name:identity.displayName,email:identity.email,role:identity.role});
  if (selectedId && !trainers.some((trainer) => trainer.user_id === selectedId)) trainers.push({user_id:selectedId,display_name:selectedName || 'Assigned trainer',email:'',role:'trainer'});
  select.innerHTML = '<option value="">Coaching team / not assigned</option>' + trainers.sort((a,b) => String(a.display_name || '').localeCompare(String(b.display_name || ''))).map((trainer) => '<option value="' + escapeHtml(trainer.user_id) + '" data-name="' + escapeHtml(trainer.display_name || trainer.email || 'Trainer') + '" data-email="' + escapeHtml(trainer.email || '') + '">' + escapeHtml(trainer.display_name || trainer.email || 'Trainer') + (trainer.role === 'owner' ? ' · Owner' : '') + '</option>').join('');
  select.value = selectedId || (identity.role === 'trainer' ? identity.id : '');
}
function setProfileEditorDeleteControls(visible) {
  ["profileEditorDeleteBtn","profileEditorDeleteAllBtn","profileEditorDeleteNote"].forEach((id) => { const element = byId(id); if (element) element.style.display = visible ? "" : "none"; });
  if (byId("profileEditorIntakeBtn")) byId("profileEditorIntakeBtn").style.display = visible ? "" : "none";
}
function openCreateProfileEditor() {
  if (!requireTrainerMutation("create client profiles")) return null;
  profileEditorTarget = null; profileEditorDraft = { muscles:[],injuries:[],zones:[],preferences:{},cardioModes:["any"],trainingDays:[1,3,5],limitationAssessments:{} };
  prepareProfileEditorMenus(); byId("profileEditId").value = ""; byId("profileEditName").value = ""; byId("profileEditUsername").value = ""; byId("profileEditEmail").value = "";
  byId("profileEditPrimary").value = "general"; byId("profileEditSecondary").value = ""; byId("profileEditStyle").value = "auto";
  byId("profileEditExperience").value = "1"; byId("profileEditAge").value = "30"; byId("profileEditMinutes").value = "60"; byId("profileEditPhase").value = "general"; byId("profileEditDays").value = "3";
  byId("profileEditSport").value = ""; byId("profileEditSchedule").value = ""; byId("profileEditCompetition").value = "";
  prepareProfileTrainerMenu('', '');
  renderProfileEditorChoices(); renderProfileExercisePreferences(); byId("profileEditorTitle").textContent = "Create client profile"; byId("profileEditorCopy").textContent = "Create the client record now. A workout or multi-week program can be assigned later—neither is created by this form."; byId("profileEditorSaveBtn").textContent = "Create profile"; setProfileEditorDeleteControls(false); byId("profileEditorModal").classList.add("open"); setTimeout(() => byId("profileEditName").focus(),20);
}
function openProfileEditor(profileId, target) {
  if (!requireTrainerMutation("edit client profiles")) return null;
  const profile = loadProfiles().find((item) => item.id === profileId); if (!profile) { showToast("Choose a saved profile to edit"); return; }
  profileEditorTarget = target || null; profileEditorDraft = { muscles: [...(profile.muscles || [])], injuries: [...(profile.injuries || [])], zones: [...(profile.zones || [])], preferences:{ ...(profile.exercisePreferences || {}) },cardioModes:normalizeCardioPreferences(profile.cardioModes || profile.cardioMode),trainingDays:inferredTrainingDays(profile,profile.availableDays || 3),limitationAssessments:JSON.parse(JSON.stringify(profile.limitationAssessments || {})) };
  byId("profileEditId").value = profile.id; byId("profileEditName").value = profile.name; byId("profileEditUsername").value = profileUsername(profile); byId("profileEditEmail").value = profile.email || "";
  prepareProfileEditorMenus();
  byId("profileEditPrimary").value = profile.goals && profile.goals[0] || "general"; byId("profileEditSecondary").value = profile.goals && profile.goals[1] || "";
  byId("profileEditStyle").value = profile.trainingStyle || "auto";
  byId("profileEditExperience").value = String(profile.experience || 1); byId("profileEditAge").value = String(profile.age || 30); byId("profileEditMinutes").value = String(profile.minutes || 60);
  byId("profileEditPhase").value = profile.trainingPhase || "general"; byId("profileEditDays").value = String(profile.availableDays || 3); byId("profileEditSport").value = profile.sport || ""; byId("profileEditSchedule").value = profile.sportSchedule || ""; byId("profileEditCompetition").value = profile.competitionDate || "";
  prepareProfileTrainerMenu(profile.assignedTrainerId || '',profile.assignedTrainerName || '');
  renderProfileEditorChoices(); renderProfileExercisePreferences(); byId("profileEditorTitle").textContent = "Edit " + profile.name; byId("profileEditorCopy").textContent = "Change the client’s basic setup here. Renaming a client also updates their saved workout history, InBody scans, and optional body goals."; byId("profileEditorSaveBtn").textContent = "Save changes"; setProfileEditorDeleteControls(true); byId("profileEditorModal").classList.add("open");
}
function closeProfileEditor() { byId("profileEditorModal").classList.remove("open"); profileEditorTarget = null; }
let profileImpactState = null;
function comparableProfileValue(value) {
  if (Array.isArray(value)) return [...value].map(String).sort();
  if (value && typeof value === "object") return Object.keys(value).sort().reduce((out,key) => { out[key] = comparableProfileValue(value[key]); return out; },{});
  return value == null ? "" : value;
}
function profileProgrammingChanges(previous,next) {
  if (!previous || !next) return [];
  const fields = [
    ["goals","Goals"],["trainingStyle","Training route"],["cardioModes","Cardio equipment"],
    ["experience","Experience"],["age","Age"],["minutes","Session length"],
    ["muscles","Muscle emphasis"],["injuries","Limitations"],["limitationAssessments","Limitation severity / permission"],
    ["zones","Available equipment"],["availableDays","Days per week"],["trainingDays","Training days"],
  ];
  return fields.filter(([key]) => JSON.stringify(comparableProfileValue(previous[key])) !== JSON.stringify(comparableProfileValue(next[key]))).map(([key,label]) => ({key,label}));
}
function profileSessionSpec(session,profile) {
  const spec = safetySpecForProfile(session,profile);
  return {
    ...spec,goal:profile.goals && profile.goals[0] || spec.goal || "general",goals:[...(profile.goals || spec.goals || [spec.goal || "general"])],
    trainingStyle:profile.trainingStyle || spec.trainingStyle || "auto",minutes:Number(profile.minutes || spec.minutes || 60),
    availableDays:Number(profile.availableDays || spec.availableDays || 3),muscles:[...(profile.muscles || spec.muscles || [])],
    trainingPhase:profile.trainingPhase || spec.trainingPhase || "general",exercisePrescriptions:{...(profile.exercisePrescriptions || {})},
    exerciseSubstitutions:{...(profile.exerciseSubstitutions || {})},baselineContext:baselineGeneratorContext(profile),
  };
}
function safeProfileReplacement(session,block,exercise,profile,used) {
  const spec = profileSessionSpec(session,profile), needsAnchor = block.key === "strength" && isPrimaryAnchor(exercise), calibration = Array.isArray(exercise.baselineDomains) && exercise.baselineDomains.length;
  return LIBRARY.filter((candidate) => !used.has(candidate.name) && candidate.name !== exercise.name)
    .filter((candidate) => candidate.pattern === exercise.pattern)
    .filter((candidate) => !needsAnchor || isPrimaryAnchor(candidate))
    .filter((candidate) => !calibration || candidate.pattern === exercise.pattern)
    .filter((candidate) => !hardExerciseSafetyIssues(candidate,spec).length)
    .sort((a,b) => Number(b.region === exercise.region) - Number(a.region === exercise.region) || Number(a.exp || 1) - Number(b.exp || 1) || a.name.localeCompare(b.name))[0] || null;
}
function repairSessionForProfile(session,profile) {
  const copy = JSON.parse(JSON.stringify(session || {})), changes = [], unresolved = [];
  copy.spec = profileSessionSpec(copy,profile);
  const used = new Set((copy.blocks || []).flatMap((block) => (block.items || []).map((exercise) => exercise.name)));
  (copy.blocks || []).forEach((block) => {
    (block.items || []).forEach((exercise,index) => {
      const issues = hardExerciseSafetyIssues(exercise,copy.spec);
      if (!issues.length) return;
      const replacement = safeProfileReplacement(copy,block,exercise,profile,used);
      if (!replacement) { unresolved.push(exercise.name + ": " + issues.map((issue) => issue.label).join(", ")); return; }
      const retained = {
        rx:{...(exercise.rx || block.rx || {})},baselineDomains:exercise.baselineDomains,baselineRequired:exercise.baselineRequired,
        baselinePlanId:exercise.baselinePlanId,baselineSessionNumber:exercise.baselineSessionNumber,baselineProtocol:exercise.baselineProtocol,baselineMeasure:exercise.baselineMeasure,baselineMeasureLabel:exercise.baselineMeasureLabel,
      };
      used.delete(exercise.name); used.add(replacement.name);
      block.items[index] = {...replacement,...Object.fromEntries(Object.entries(retained).filter(([,value]) => value != null))};
      changes.push(exercise.name + " → " + replacement.name);
    });
    rebuildBlockGroups(block);
  });
  if (unresolved.length) return {ok:false,session:copy,changes,unresolved};
  normalizeSessionBlockOrder(copy); enrichSessionMetadata(copy); copy.audit = auditWorkout(copy);
  if (!copy.audit.pass) return {ok:false,session:copy,changes,unresolved:[...(copy.audit.safety || ["Workout audit did not pass"]) ]};
  return {ok:true,session:copy,changes,unresolved:[]};
}
function openProfileImpactReview(previous,profile,changes) {
  const assigned = loadAssignedWorkouts().filter((item) => item.profileId === profile.id && assignmentStatus(item) === "assigned");
  const currentMatches = currentProgram && (currentProgram.profileId === profile.id || currentProgram.setup && currentProgram.setup.profileId === profile.id);
  profileImpactState = {previous,profile,changes,assignmentIds:assigned.map((item) => item.id),currentMatches};
  byId("profileImpactSummary").innerHTML = '<b>Changed:</b> ' + escapeHtml(changes.map((item) => item.label).join(" · ")) + '<br><span>Selected items will be re-audited against the new profile. Unsafe exercises are replaced only with a same-pattern safe option. Goal changes do not silently redesign a program—regenerate it when the training goal itself changed.</span>';
  const items = [];
  if (currentMatches) items.push('<label class="profile-impact-check"><input type="checkbox" data-impact-kind="current" checked><span><b>Current program draft</b><small>Update its profile filters, repair conflicts, and require coach reapproval.</small></span></label>');
  assigned.forEach((item) => items.push('<label class="profile-impact-check"><input type="checkbox" data-impact-kind="assignment" data-impact-id="' + escapeHtml(item.id) + '" checked><span><b>' + escapeHtml(item.programDayName || item.session && item.session.data && item.session.data.goalLabel || "Assigned workout") + '</b><small>' + escapeHtml(item.scheduledDate || "Not yet started") + ' · completed and in-progress work is excluded.</small></span></label>'));
  if (!items.length) items.push('<div class="lookup-note">No draft or not-yet-started workouts need review. Completed history was left unchanged.</div>');
  byId("profileImpactItems").innerHTML = items.join(""); byId("profileImpactModal").classList.add("open");
}
function closeProfileImpactModal() { if (byId("profileImpactModal")) byId("profileImpactModal").classList.remove("open"); profileImpactState = null; }
function applyProfileImpactUpdates() {
  if (!requireTrainerMutation("update unfinished programming after profile changes") || !profileImpactState) return false;
  const profile = loadProfiles().find((item) => item.id === profileImpactState.profile.id) || profileImpactState.profile;
  const selected = [...byId("profileImpactItems").querySelectorAll('input[type="checkbox"]:checked')], problems = [], applied = [];
  if (selected.some((input) => input.dataset.impactKind === "current") && currentProgram) {
    const repaired = currentProgram.weeks.flatMap((week) => (week.days || []).map((day) => ({day,result:repairSessionForProfile(day.session,profile)})));
    const failed = repaired.filter((item) => !item.result.ok);
    if (failed.length) problems.push("Current program: " + failed.flatMap((item) => item.result.unresolved).slice(0,3).join(" · "));
    else {
      repaired.forEach((item) => { item.day.session = item.result.session; });
      currentProgram.setup = {...currentProgram.setup,...profileSessionSpec({spec:currentProgram.setup},profile)};
      markCurrentProgramDraft("Client profile changed; unfinished programming was re-audited"); applied.push("current program"); renderProgram();
    }
  }
  const assignmentIds = new Set(selected.filter((input) => input.dataset.impactKind === "assignment").map((input) => input.dataset.impactId)), assignments = loadAssignedWorkouts();
  assignmentIds.forEach((id) => {
    const index = assignments.findIndex((item) => item.id === id && assignmentStatus(item) === "assigned"); if (index < 0) return;
    const plan = workoutPlans(assignments[index].session)[0], repaired = plan && repairSessionForProfile(plan.session,profile);
    if (!repaired || !repaired.ok) { problems.push((assignments[index].programDayName || "Assigned workout") + ": " + ((repaired && repaired.unresolved || ["could not be audited"]).slice(0,2).join(" · "))); return; }
    repaired.session.approval = {status:"approved",approvedAt:new Date().toISOString(),approvedBy:currentAccountIdentity().displayName,reason:"Profile-impact review"};
    if (assignments[index].session.type === "solo") assignments[index].session.data = repaired.session;
    else if (assignments[index].session.data && assignments[index].session.data.a && assignments[index].session.data.a.sessionId === plan.session.sessionId) assignments[index].session.data.a = repaired.session;
    else if (assignments[index].session.data) assignments[index].session.data.b = repaired.session;
    assignments[index].profileImpactUpdatedAt = new Date().toISOString(); assignments[index].profileImpactUpdatedBy = currentAccountIdentity().displayName; applied.push(assignments[index].programDayName || "assigned workout");
  });
  if (assignmentIds.size) writeAssignedWorkouts(assignments);
  if (problems.length) { byId("profileImpactSummary").innerHTML = '<b>Some selected work could not be changed safely.</b><br>' + escapeHtml(problems.join(" · ")); showToast("Profile saved, but some workout updates need manual coach review"); return false; }
  closeProfileImpactModal(); showToast(applied.length ? "Updated " + applied.length + " unfinished programming item" + (applied.length === 1 ? "" : "s") : "Profile saved; existing workouts kept unchanged"); return true;
}
function saveProfileEditor() {
  if (!requireTrainerMutation("edit client profiles")) return null;
  const profileId = byId("profileEditId").value, goals = [byId("profileEditPrimary").value,byId("profileEditSecondary").value].filter(Boolean);
  const cardioModes = normalizeCardioPreferences(profileEditorDraft.cardioModes);
  const trainerSelect = byId('profileEditTrainer'), trainerOption = trainerSelect && trainerSelect.selectedOptions[0];
  const updates = { name: byId("profileEditName").value, username: byId("profileEditUsername").value, email:byId("profileEditEmail").value.trim().toLowerCase(), goals, trainingStyle:byId("profileEditStyle").value, cardioMode:cardioModes[0], cardioModes, experience: Number(byId("profileEditExperience").value), age: Number(byId("profileEditAge").value), minutes: Number(byId("profileEditMinutes").value), muscles: [...profileEditorDraft.muscles], injuries: [...profileEditorDraft.injuries], limitationAssessments:JSON.parse(JSON.stringify(profileEditorDraft.limitationAssessments || {})), zones: [...profileEditorDraft.zones], trainingPhase:byId("profileEditPhase").value, availableDays:Number(byId("profileEditDays").value), trainingDays:[...(profileEditorDraft.trainingDays || [])], sport:byId("profileEditSport").value, sportSchedule:byId("profileEditSchedule").value, competitionDate:byId("profileEditCompetition").value, exercisePreferences:{ ...profileEditorDraft.preferences }, assignedTrainerId:trainerSelect ? trainerSelect.value : '', assignedTrainerName:trainerOption && trainerSelect.value ? trainerOption.dataset.name || trainerOption.textContent.split(' · ')[0] : '', assignedTrainerEmail:trainerOption && trainerSelect.value ? trainerOption.dataset.email || '' : '' };
  const creating = !profileId, previous = creating ? null : loadProfiles().find((item) => item.id === profileId), profile = creating ? createClientProfile(updates) : updateClientProfile(profileId,updates);
  if (!profile) return null;
  const programmingChanges = creating ? [] : profileProgrammingChanges(previous,profile);
  if (profileEditorTarget) loadProfileIntoTarget(profile,profileEditorTarget);
  byId("profileEditorModal").classList.remove("open"); profileEditorTarget = null; refreshProfileSelects(); renderForms(); renderTrainerHub(profile.name);
  if (programmingChanges.length) { openProfileImpactReview(previous,profile,programmingChanges); showToast("Profile saved · review the effect on unfinished programming"); }
  else showToast(creating ? "Created " + profile.name + " without assigning a workout or program" : "Updated " + profile.name + " and kept all connected history");
  return profile;
}
function deleteClientProfile(profileId, target) {
  if (!requireTrainerMutation("delete client profiles")) return false;
  const profiles = loadProfiles(), profile = profiles.find((item) => item.id === profileId); if (!profile) { showToast("Choose a saved profile to delete"); return false; }
  if (!window.confirm("Delete " + profile.name + "’s saved profile? Completed workouts, reviews, InBody scans, and body goals will be kept.")) return false;
  if (!writeProfiles(profiles.filter((item) => item.id !== profileId))) return false;
  if (window.fit4lifeCloudDeleteProfile) window.fit4lifeCloudDeleteProfile(profileId,false);
  writeAssignedWorkouts(loadAssignedWorkouts().filter((item) => item.profileId !== profileId));
  writeLocalArray(TEAMS_KEY,loadTeams().map((team) => ({ ...team,profileIds:(team.profileIds || []).filter((id) => id !== profileId) })),200);
  if (advancedState && advancedState.profileId === profileId) advancedState.profileId = "";
  if (target && target.profileId === profileId) target.profileId = "";
  [state.solo,state.p1,state.p2].forEach((item) => { if (item && item.profileId === profileId) item.profileId = ""; });
  byId("profileEditorModal").classList.remove("open"); profileEditorTarget = null; refreshProfileSelects(); renderForms(); renderTrainerHub(profile.name); showToast("Profile and assigned workout deleted. " + profile.name + "’s completed workout and scan history was kept."); return true;
}
function deleteProfileFromEditor() { return deleteClientProfile(byId("profileEditId").value, profileEditorTarget); }
function updateSelectedProgramProfileFromSetup() {
  if (!requireTrainerMutation("update client profiles")) return null;
  const id = byId("programProfile").value, profile = loadProfiles().find((item) => item.id === id);
  if (!profile) { showToast("Choose a saved client profile first"); return null; }
  const cardioModes = normalizeCardioPreferences(programCardioModes), goals = [byId("programGoal").value,byId("programSecondaryGoal").value].filter((goal,index,list) => goal && list.indexOf(goal) === index).slice(0,2);
  const availableDays = Number(byId("programDays").value) || profile.availableDays || 3;
  const previous = JSON.parse(JSON.stringify(profile)), updated = updateClientProfile(profile.id,{
    name:profile.name,username:profile.username,email:profile.email,goals:goals.length ? goals : ["general"],
    trainingStyle:byId("programStyle").value || "auto",cardioMode:cardioModes[0],cardioModes,
    experience:Number(byId("programExp").value),age:Math.max(18,Math.min(90,Math.round(numberFrom("programAge",profile.age || 30)))),
    minutes:Number(byId("programMinutes").value) || profile.minutes || 60,availableDays,
    injuries:[...programFilters.injuries],zones:[...programFilters.zones],muscles:[...(profile.muscles || [])],trainingDays:inferredTrainingDays(profile,availableDays),
    trainingPhase:profile.trainingPhase || "general",sport:profile.sport || "",sportSchedule:profile.sportSchedule || "",competitionDate:profile.competitionDate || "",
    exercisePreferences:{...(profile.exercisePreferences || {})},phaseCompoundAnchors:{...(profile.phaseCompoundAnchors || {})},
    assignedTrainerId:profile.assignedTrainerId || "",assignedTrainerName:profile.assignedTrainerName || "",assignedTrainerEmail:profile.assignedTrainerEmail || ""
  });
  if (!updated) return null;
  selectProgramProfile(updated.id);
  const changes = profileProgrammingChanges(previous,updated);
  if (changes.length) { openProfileImpactReview(previous,updated,changes); showToast("Profile saved · review its impact on unfinished programming"); }
  else showToast("Updated " + updated.name + " from the program setup");
  return updated;
}
function editSelectedProgramProfile() { const id = byId("programProfile").value; if (!id) { showToast("Choose a saved client profile first"); return; } openProfileEditor(id); }
function deleteSelectedProgramProfile() { const id = byId("programProfile").value; if (!id) { showToast("Choose a saved client profile first"); return false; } return deleteClientProfile(id); }
function deleteAllSelectedProgramClient() { const id = byId("programProfile").value, profile = loadProfiles().find((item) => item.id === id); if (!profile) { showToast("Choose a saved client profile first"); return; } openCompleteDeleteClient(profile.name); }
function clientDeletionCounts(client) {
  const matchingProfiles = loadProfiles().filter((item) => clientMatches(item.name, client)), profileIds = new Set(matchingProfiles.map((item) => item.id));
  const entries = loadProgress().filter((entry) => clientMatches(entry.client, client)), scans = loadInBodyScans().filter((scan) => clientMatches(scan.client, client)), goals = loadBodyGoals().filter((goal) => clientMatches(goal.client, client));
  const meta = loadSummaryMeta(), notes = entries.filter((entry) => meta[entry.id]).length, requests = loadProfileRequests().filter((item) => clientMatches(item.name,client)).length, assignments = loadAssignedWorkouts().filter((item) => clientMatches(item.client,client)).length;
  const checkins = loadCheckIns().filter((item) => profileIds.has(item.profileId) || clientMatches(item.client,client)).length;
  const athleteMetrics = loadAthleteMetrics().filter((item) => profileIds.has(item.profileId) || clientMatches(item.client,client)).length;
  const mentalPlans = loadMentalPlans().filter((item) => profileIds.has(item.profileId) || clientMatches(item.client,client)).length;
  const alerts = loadAutomationAlerts().filter((item) => profileIds.has(item.profileId) || clientMatches(item.client,client)).length;
  const receipts = loadProgressReceipts().filter((item) => profileIds.has(item.profileId) || clientMatches(item.client,client)).length;
  const teamMemberships = loadTeams().filter((team) => (team.profileIds || []).some((id) => profileIds.has(id))).length;
  return { profiles: matchingProfiles.length, entries: entries.length, scans: scans.length, goals: goals.length, notes, requests, assignments, checkins, athleteMetrics, mentalPlans, alerts, receipts, teamMemberships };
}
function openCompleteDeleteClient(clientOrProfileId) {
  if (!requireTrainerMutation("permanently delete client data")) return null;
  const profile = loadProfiles().find((item) => item.id === clientOrProfileId), client = String(profile ? profile.name : clientOrProfileId || "").trim();
  if (!client) { showToast("Choose a client to permanently delete"); return; }
  const counts = clientDeletionCounts(client); byId("completeDeleteClient").value = client; byId("completeDeleteConfirm").value = ""; byId("completeDeleteButton").disabled = true;
  byId("completeDeleteTitle").textContent = "Permanently delete " + client;
  byId("completeDeleteSummary").textContent = "This will remove " + counts.profiles + " profile, " + counts.assignments + " assigned workout, " + counts.entries + " workout/history records, " + counts.notes + " trainer records, " + counts.scans + " InBody scans, " + counts.goals + " body-goal records, " + counts.checkins + " check-ins, " + counts.receipts + " progress receipts, " + counts.athleteMetrics + " athlete-monitoring records, " + counts.mentalPlans + " mental-performance plan, " + counts.alerts + " automation alerts, " + counts.teamMemberships + " team membership, and " + counts.requests + " pending requests from this device.";
  byId("profileEditorModal").classList.remove("open"); byId("completeDeleteModal").classList.add("open"); setTimeout(() => byId("completeDeleteConfirm").focus(), 0);
}
function openCompleteDeleteFromEditor() {
  const profile = loadProfiles().find((item) => item.id === byId("profileEditId").value); openCompleteDeleteClient(profile ? profile.name : byId("profileEditName").value);
}
function closeCompleteDeleteModal() { byId("completeDeleteModal").classList.remove("open"); byId("completeDeleteConfirm").value = ""; byId("completeDeleteButton").disabled = true; profileEditorTarget = null; }
function updateCompleteDeleteState() {
  const expected = String(byId("completeDeleteClient").value || "").trim().toLowerCase(), entered = String(byId("completeDeleteConfirm").value || "").trim().toLowerCase(); byId("completeDeleteButton").disabled = !expected || entered !== expected;
}
function resetDeletedClientTarget(target, client) {
  if (!target || !clientMatches(target.client, client)) return; Object.assign(target, { client: "", profileId: "", goal: "", goals: [], experience: "", age: 30, minutes: 60, muscles: [], injuries: [], zones: [] });
}
function purgeClientData(client) {
  if (!requireTrainerMutation("permanently delete client data")) return null;
  client = String(client || "").trim(); if (!client) return null;
  const profilesToDelete = loadProfiles().filter((profile) => clientMatches(profile.name,client)), profileIds = new Set(profilesToDelete.map((profile) => profile.id));
  const matchesAdvancedClient = (item) => profileIds.has(item.profileId) || clientMatches(item.client,client);
  const counts = clientDeletionCounts(client), entries = loadProgress(), deletedEntryIds = new Set(entries.filter((entry) => clientMatches(entry.client, client)).map((entry) => entry.id));
  if (!writeProfiles(loadProfiles().filter((profile) => !clientMatches(profile.name, client)))) return null;
  if (window.fit4lifeCloudDeleteProfile) profilesToDelete.forEach((profile) => window.fit4lifeCloudDeleteProfile(profile.id,true));
  if (!writeProfileRequests(loadProfileRequests().filter((request) => !clientMatches(request.name, client)))) return null;
  if (!writeProgress(entries.filter((entry) => !clientMatches(entry.client, client)))) return null;
  const scans = loadInBodyScans(), deletedScans = scans.filter((scan) => clientMatches(scan.client, client)); deletedScans.forEach((scan) => deleteInBodyAttachment(scan.id));
  if (!writeInBodyScans(scans.filter((scan) => !clientMatches(scan.client, client)))) return null;
  if (!writeBodyGoals(loadBodyGoals().filter((goal) => !clientMatches(goal.client, client)))) return null;
  if (!writeAssignedWorkouts(loadAssignedWorkouts().filter((assignment) => !clientMatches(assignment.client,client)))) return null;
  if (!writeSavedPrograms(loadSavedPrograms().filter((program) => !profileIds.has(program.profileId) && !clientMatches(program.setup && program.setup.client,client)))) return null;
  if (!writeLocalArray(CLIENT_MESSAGES_KEY,loadLocalArray(CLIENT_MESSAGES_KEY).filter((item) => !matchesAdvancedClient(item)),1000)) return null;
  if (!writeProgressReceipts(loadProgressReceipts().filter((item) => !matchesAdvancedClient(item)))) return null;
  if (!writeLocalArray(PROGRESS_RECEIPT_RESPONSES_KEY,loadLocalArray(PROGRESS_RECEIPT_RESPONSES_KEY).filter((item) => !matchesAdvancedClient(item)),1000)) return null;
  if (!writeCheckIns(loadCheckIns().filter((item) => !matchesAdvancedClient(item)))) return null;
  if (!writeAthleteMetrics(loadAthleteMetrics().filter((item) => !matchesAdvancedClient(item)))) return null;
  if (!writeLocalArray(MENTAL_PLANS_KEY,loadMentalPlans().filter((item) => !matchesAdvancedClient(item)),500)) return null;
  if (!writeLocalArray(AUTOMATION_ALERTS_KEY,loadAutomationAlerts().filter((item) => !matchesAdvancedClient(item)),500)) return null;
  if (!writeLocalArray(TEAMS_KEY,loadTeams().map((team) => ({ ...team,profileIds:(team.profileIds || []).filter((id) => !profileIds.has(id)) })),200)) return null;
  const meta = loadSummaryMeta(); deletedEntryIds.forEach((id) => { delete meta[id]; }); if (!writeSummaryMeta(meta)) return null;
  [state.solo,state.p1,state.p2].forEach((target) => resetDeletedClientTarget(target, client));
  if (profileEditorTarget) resetDeletedClientTarget(profileEditorTarget, client);
  if (state.session && state.session.data) {
    const data = state.session.data, specs = state.session.type === "group" ? [data.a && data.a.spec,data.b && data.b.spec] : [data.spec];
    if (specs.some((spec) => spec && clientMatches(spec.client, client))) state.session = null;
  }
  state.sessionOptions = state.sessionOptions.filter((option) => !workoutPlans(option.session).some((plan) => clientMatches(plan.session.spec.client,client)));
  if (clientMatches(selectedTrainerClient, client)) selectedTrainerClient = "";
  if (profileIds.has(activeClientProfileId())) { try { localStorage.removeItem(ACTIVE_CLIENT_KEY); localStorage.removeItem(ACTIVE_WORKOUT_KEY); } catch (_) {} activeWorkout = null; }
  return counts;
}
function confirmCompleteClientDelete() {
  if (!requireTrainerMutation("permanently delete client data")) return null;
  updateCompleteDeleteState(); if (byId("completeDeleteButton").disabled) { showToast("Type the client’s full name exactly to confirm"); return null; }
  const client = byId("completeDeleteClient").value, counts = purgeClientData(client); if (!counts) return null;
  closeCompleteDeleteModal(); closeProfileEditor(); refreshProfileSelects(); renderForms(); renderProgressHistory(); renderTrainerHub();
  if (!state.session) { const output = byId("output"), reshuffle = byId("reshuffleBtn"); if (output) output.innerHTML = ""; if (reshuffle) reshuffle.style.display = "none"; }
  showToast(client + " and all connected client data were permanently deleted"); return counts;
}
function refreshProfileSelects() {
  const profiles = loadProfiles();
  const hidden = byId("programProfile"), lookup = byId("programProfileLookup");
  if (hidden && hidden.value && !profiles.some((profile) => profile.id === hidden.value)) {
    hidden.value = ""; if (lookup) lookup.value = "";
  }
  const readyHidden = byId("readyProfile"), readyLookup = byId("readyClient");
  if (readyHidden && readyHidden.value && !profiles.some((profile) => profile.id === readyHidden.value)) { readyHidden.value = ""; if (readyLookup) readyLookup.value = ""; }
  syncTrainerOnlyControls(); refreshHistoryFilters();
}
function addProgressEntry(entry) {
  const entries = loadProgress();
  const record = { id: Date.now() + "-" + Math.random().toString(16).slice(2), date: new Date().toISOString(), ...entry };
  entries.unshift(record);
  writeProgress(entries);
  return record;
}
function latestSetFor(client, exercise) {
  const entry = loadProgress().find((item) => item.type === "set" && clientMatches(item.client, client) && item.label === exercise && item.data);
  return entry ? entry.data : null;
}
function getSessionSets(sessionId, exercise) {
  if (!sessionId) return [];
  return loadProgress().filter((item) => item.type === "set" && item.sessionId === sessionId && (!exercise || item.label === exercise));
}
function logExerciseSet(session, exercise, loadInput, repsInput, unitSelect, rpeSelect, setNumber, existingEntryId) {
  const load = loadInput.value === "" ? null : Number(loadInput.value);
  const reps = repsInput.value === "" ? null : Number(repsInput.value);
  const unit = unitSelect.value || "lb", rpe = rpeSelect.value === "" ? null : Number(rpeSelect.value);
  const calibrationDomains = Array.isArray(exercise.baselineDomains) ? [...exercise.baselineDomains] : [], calibration = calibrationDomains.length > 0;
  const baselineConfidence = calibration && byId("activeBaselineConfidence") ? Number(byId("activeBaselineConfidence").value) : null, baselinePain = calibration && byId("activeBaselinePain") ? Number(byId("activeBaselinePain").value) : null;
  if (load == null && reps == null) { showToast(unit === "session" ? "Enter completed minutes or distance first" : "Enter the completed weight or reps first"); return false; }
  if (calibration && rpe == null) { showToast("Choose an effort score for this calibration set"); return false; }
  const pieces = [];
  if (load != null) pieces.push(load + (unit === "bodyweight" ? "" : " " + unit));
  else if (unit === "bodyweight") pieces.push("Bodyweight");
  if (reps != null) pieces.push(reps + (unit === "session" ? " min / distance" : " reps"));
  if (rpe != null) pieces.push("RPE " + rpe);
  const entries = loadProgress(), now = new Date().toISOString(), record = {
    id: existingEntryId || Date.now() + "-" + Math.random().toString(16).slice(2), date: now,
    type: "set", client: session.spec.client || "Client", profileId:session.spec.profileId || "", sessionId: session.sessionId, label: exercise.name,
    value: pieces.join(" · "), note: calibration ? "Logged from embedded calibration" : "Logged from workout",
    data: { load, reps, unit, rpe, setNumber:Number(setNumber) || null, prescribed: exercise.rx || null, goal: session.goalLabel, profileId:session.spec.profileId || "", calibration, baselineDomains:calibrationDomains, baselinePlanId:exercise.baselinePlanId || session.calibration && session.calibration.planId || "", baselineConfidence, baselinePain, baselineStopped:baselinePain === 3 },
  };
  const existingIndex = existingEntryId ? entries.findIndex((entry) => entry.id === existingEntryId) : -1;
  if (existingIndex >= 0) entries[existingIndex] = { ...entries[existingIndex],...record,id:existingEntryId,updatedAt:now };
  else entries.unshift(record);
  if (!writeProgress(entries)) return false;
  if (calibration && baselinePain >= 2) addProgressEntry({type:"baseline_safety_flag",client:session.spec.client || "Client",profileId:session.spec.profileId || "",sessionId:session.sessionId,label:exercise.name,value:baselinePain === 3 ? "Calibration stopped" : "Movement changed",note:"Trainer review required before this result can be used as a baseline.",data:{coachNotice:true,baselinePlanId:exercise.baselinePlanId || "",baselineDomains:calibrationDomains,painLevel:baselinePain}});
  touchAssignmentFromSession(session.sessionId); renderProgressHistory(); showToast(exercise.name + " set " + (Number(setNumber) || "") + " saved"); return record;
}
function saveManualProgress() {
  if (!requireTrainerMutation("add manual client records")) return null;
  const client = byId("logClient").value.trim() || "Client";
  const label = byId("logExercise").value.trim();
  if (!label) { showToast("Add an exercise or session name first"); return; }
  const load = byId("logLoad").value, reps = byId("logReps").value, unit = byId("logUnit").value, rpe = byId("logRpe").value;
  const pieces = [];
  if (load) pieces.push(load + (unit === "lb" || unit === "kg" ? " " + unit : ""));
  if (reps) pieces.push(reps + " reps");
  if (rpe) pieces.push("RPE " + rpe);
  addProgressEntry({ type: "set", client, label, value: pieces.join(" · ") || unit, note: byId("logNotes").value.trim(), data: { load: load === "" ? null : Number(load), reps: reps === "" ? null : Number(reps), unit, rpe: rpe === "" ? null : Number(rpe) } });
  byId("logExercise").value = ""; byId("logLoad").value = ""; byId("logReps").value = ""; byId("logNotes").value = "";
  refreshHistoryFilters(); renderProgressHistory(); showToast("Progress entry saved on this device");
}
function reviewSessions() {
  if (!state.session) return [];
  if (state.session.type === "solo") return [{ key: "solo", label: state.session.data.spec.client || "Client", session: state.session.data }];
  return [
    { key: "a", label: state.session.data.a.spec.client || "Partner 1", session: state.session.data.a },
    { key: "b", label: state.session.data.b.spec.client || "Partner 2", session: state.session.data.b },
  ];
}
function updateReviewPainFields() {
  const hasPain = byId("reviewPain") && byId("reviewPain").value !== "none";
  ["reviewInjuryAreaField","reviewMovementChangedField","reviewPainScoreField","reviewPainExerciseField","reviewInjuryDetailsField","reviewPainActionField"].forEach((id) => { const field = byId(id); if (field) field.hidden = !hasPain; });
  if (!hasPain) {
    if (byId("reviewInjuryArea")) byId("reviewInjuryArea").value = "";
    if (byId("reviewMovementChanged")) byId("reviewMovementChanged").value = "no";
    if (byId("reviewPainScore")) byId("reviewPainScore").value = "";
    if (byId("reviewPainExercise")) byId("reviewPainExercise").value = "";
    if (byId("reviewInjuryDetails")) byId("reviewInjuryDetails").value = "";
  } else {
    const info = painLevelInfo(byId("reviewPain").value,byId("reviewMovementChanged") && byId("reviewMovementChanged").value);
    const out = byId("reviewPainActionField"); if (out) { out.style.setProperty("--pain-color",info.color); out.innerHTML = "<b>" + escapeHtml(info.label) + "</b>" + escapeHtml(info.action); }
  }
}
function syncReviewPainLevel() {
  if (byId("reviewMovementChanged").value === "yes" && painLevelInfo(byId("reviewPain").value).rank < PAIN_LEVELS.orange.rank) byId("reviewPain").value = "changed";
  updateReviewPainFields();
}
function openWorkoutReview() {
  const sessions = reviewSessions();
  if (!sessions.length) { showToast("Build a workout before adding a review"); return; }
  const select = byId("reviewClient"); select.innerHTML = "";
  sessions.forEach((item) => { const option = document.createElement("option"); option.value = item.key; option.textContent = item.label + " · " + item.session.goalLabel; select.appendChild(option); });
  byId("reviewDifficulty").value = "7"; byId("reviewCompletion").value = "all"; byId("reviewEnergy").value = "3";
  byId("reviewRir").value = "2"; byId("reviewForm").value = "strong"; byId("reviewRange").value = "full"; byId("reviewTimeFit").value = "yes";
  byId("reviewPain").value = "none";
  fillSelectOptions(byId("reviewInjuryArea"),painLocationOptions(true),"");
  byId("reviewMovementChanged").value = "no"; byId("reviewPainScore").value = ""; byId("reviewPainExercise").value = ""; byId("reviewInjuryDetails").value = ""; byId("reviewNotes").value = "";
  byId("reviewLiked").value = ""; byId("reviewDisliked").value = ""; byId("reviewQuestions").value = "";
  const optional = byId("reviewModal").querySelector(".review-more"); if (optional) optional.open = false;
  byId("reviewSaveAnalysisBtn").style.display = portalRole === "trainer" && trainerIsUnlocked() ? "inline-flex" : "none";
  byId("reviewSaveOnlyBtn").textContent = portalRole === "client" ? "Save workout review" : "Save only";
  updateReviewPainFields();
  byId("reviewModal").classList.add("open");
}
function closeWorkoutReview() { byId("reviewModal").classList.remove("open"); }
function updateProfileFromReview(session, review) {
  const name = String(session.spec.client || "").trim();
  if (!name || name === "Client" || portalRole !== "trainer" || !trainerIsUnlocked()) return null;
  const profiles = loadProfiles();
  const profile = profiles.find((p) => p.id === session.spec.profileId) || profiles.find((p) => clientMatches(p.name, name));
  if (!profile) return null;
  profile.lastReview = review; profile.updatedAt = new Date().toISOString();
  if (painRequiresSafetyHold(review.painLevel || review.pain,review.movementChanged) && review.injuryArea && !profile.injuries.includes(review.injuryArea)) profile.injuries.push(review.injuryArea);
  writeProfiles(profiles); refreshProfileSelects(); return profile;
}
function completeAssignmentFromReview(session, review) {
  const assignments = loadAssignedWorkouts(), index = assignments.findIndex((item) => assignmentSessionIds(item).includes(session.sessionId)); if (index < 0) return null;
  assignments[index] = { ...assignments[index], status:"completed", completedAt:new Date().toISOString(), clientReview:{ ...review } };
  if (!writeAssignedWorkouts(assignments)) return null; return assignments[index];
}
function recommendedCoachAction(review) {
  if (!review) return "repeat";
  if (["changed","stopped"].includes(review.pain)) return "pain_swap";
  if (Number(review.difficulty) >= 9 || review.completion === "stopped" || Number(review.energy) <= 2) return "reduce";
  if (review.pain === "none" && review.completion === "all" && review.formQuality === "strong" && review.rangeOfMotion === "full" && Number(review.rir) >= 3 && Number(review.difficulty) <= 7 && Number(review.energy) >= 3) return "progress";
  return "repeat";
}
function formalReviewStatus(profile) {
  if (!profile) return { due:false,count:0,days:0 };
  const since = new Date(profile.lastFormalReviewAt || profile.phaseStartedAt || profile.updatedAt || Date.now()).getTime(), workouts = loadProgress().filter((entry) => entry.type === "workout" && clientMatches(entry.client,profile.name) && new Date(entry.createdAt || entry.date || 0).getTime() >= since);
  const days = Math.max(0,Math.floor((Date.now() - since) / 86400000)); return { due:workouts.length >= PROGRAMMING_POLICY.formalReviewWeeks || days >= 28, count:workouts.length, days };
}
let coachAdjustmentAssignmentId = "";
function closeCoachAdjustment() { byId("coachAdjustmentModal").classList.remove("open"); coachAdjustmentAssignmentId = ""; }
function openCoachAdjustment(profileId) {
  if (!requireTrainerMutation("review and adjust a client plan")) return null;
  const profile = loadProfiles().find((item) => item.id === profileId), clientAssignments = assignmentsForClient(profileId);
  const assignment = clientAssignments.find((item) => assignmentStatus(item) === "completed" && !item.coachReviewedAt) || clientAssignments.find((item) => assignmentStatus(item) === "completed") || clientAssignments[0];
  if (!profile || !assignment) { showToast("Assign a workout before reviewing the coaching loop"); return null; }
  coachAdjustmentAssignmentId = assignment.id;
  const review = assignment.clientReview || {}, sets = assignmentProgressStats(assignment);
  const formal = formalReviewStatus(profile);
  byId("coachAdjustmentProfileId").value = profile.id; byId("coachAdjustmentTitle").textContent = "Review " + profile.name;
  byId("coachAdjustmentSummary").textContent = (review.completion ? "Client completed: " + review.completion + " · difficulty " + review.difficulty + "/10 · energy " + review.energy + "/5" : "The client has not submitted a finish review yet.") + (review.pain && review.pain !== "none" ? " · pain: " + (review.injuryArea ? INJURY_LABELS[review.injuryArea] : review.pain) : " · no pain reported") + " · " + sets.logged + " of " + sets.planned + " planned efforts logged" + (review.notes ? " · “" + review.notes + "”" : "");
  byId("coachAdjustmentAction").value = recommendedCoachAction(review); byId("coachAdjustmentNote").value = assignment.coachNote || "";
  byId("coachFormalReviewComplete").checked = false; byId("coachFormalDecision").value = "continue"; byId("coachFormalNote").value = ""; byId("formalReviewBox").open = formal.due; byId("formalReviewSummary").textContent = formal.due ? "Four-week formal review · due now" : "Four-week formal review · " + formal.count + "/4 workouts";
  byId("coachAdjustmentModal").classList.add("open"); return assignment;
}
function saveCoachAdjustment(buildNext) {
  if (!requireTrainerMutation("save a coaching decision")) return null;
  const profileId = byId("coachAdjustmentProfileId").value, action = byId("coachAdjustmentAction").value, note = byId("coachAdjustmentNote").value.trim(), assignments = loadAssignedWorkouts();
  const index = assignments.findIndex((item) => item.id === coachAdjustmentAssignmentId && item.profileId === profileId); if (index < 0) return null;
  const reviewedAt = new Date().toISOString(), assignment = assignments[index], review = assignment.clientReview || {};
  let formalReceiptSeed = null;
  assignments[index] = { ...assignment, status:"reviewed", coachReviewedAt:reviewedAt, nextAction:action, coachNote:note };
  if (!writeAssignedWorkouts(assignments)) return null;
  const profiles = loadProfiles(), profileIndex = profiles.findIndex((item) => item.id === profileId); if (profileIndex >= 0) {
    const profile = profiles[profileIndex], injuries = [...(profile.injuries || [])];
    if (["changed","stopped"].includes(review.pain) && review.injuryArea && !injuries.includes(review.injuryArea)) injuries.push(review.injuryArea);
    const completesFormal = byId("coachFormalReviewComplete").checked, formalDecision = byId("coachFormalDecision").value, formalNote = byId("coachFormalNote").value.trim();
    if (completesFormal) formalReceiptSeed = {profileId:profile.id,formalDecision,formalNote};
    profiles[profileIndex] = { ...profile, injuries, coachAdjustment:{ action,note,reviewedAt,sourceSessionId:assignmentSessionIds(assignment)[0] || "" }, ...(completesFormal ? { lastFormalReviewAt:reviewedAt, formalReview:{ decision:formalDecision,note:formalNote,reviewedAt }, phaseCompoundAnchors:["change","rebuild"].includes(formalDecision) ? {} : { ...(profile.phaseCompoundAnchors || {}) } } : {}), updatedAt:reviewedAt }; writeProfiles(profiles); selectedTrainerClient = profile.name;
  }
  closeCoachAdjustment(); refreshProfileSelects(); renderTrainerHub(selectedTrainerClient);
  if (formalReceiptSeed) {
    const formalProfile = loadProfiles().find((item) => item.id === formalReceiptSeed.profileId), draft = formalProfile && buildProgressReceiptDraft(formalProfile,"formal",formalReceiptSeed);
    if (draft) upsertProgressReceipt(draft);
    renderTrainerAttention();
    if (!buildNext && draft) { openProgressReceiptEditor(formalProfile.id,"formal",draft.id); showToast("Formal decision saved. Review the client-facing receipt before publishing."); return assignments[index]; }
    showToast("Coaching decision saved. A formal receipt draft is waiting for publication.");
  } else showToast("Coaching decision saved for the next workout");
  if (buildNext) openSelectedClientSession(); return assignments[index];
}
function sessionPersonalRecords(sessionId) {
  const all = loadProgress().filter((entry) => entry.type === 'set' && entry.data && entry.data.load != null && Number(entry.data.load) > 0), current = all.filter((entry) => entry.sessionId === sessionId), records = [];
  current.forEach((entry) => { const previousBest = Math.max(0,...all.filter((item) => item.sessionId !== sessionId && item.label === entry.label && item.data.unit === entry.data.unit).map((item) => Number(item.data.load) || 0)); if (Number(entry.data.load) > previousBest) records.push(entry.label + ' · ' + entry.data.load + ' ' + entry.data.unit); }); return [...new Set(records)];
}
function saveWorkoutReview(openAnalysis) {
  const chosen = reviewSessions().find((item) => item.key === byId("reviewClient").value);
  if (!chosen) { showToast("Choose the workout to review"); return null; }
  const session = chosen.session, sets = getSessionSets(session.sessionId);
  const existingReview = loadProgress().find((entry) => entry.type === "workout" && entry.sessionId === session.sessionId && entry.data);
  if (portalRole === "client" && existingReview) { closeWorkoutReview(); showToast("This workout review was already sent to your trainer"); return existingReview.data; }
  const movementChanged = byId("reviewMovementChanged").value === "yes";
  let painValue = byId("reviewPain").value;
  if (movementChanged && painLevelInfo(painValue).rank < PAIN_LEVELS.orange.rank) { painValue = "changed"; byId("reviewPain").value = painValue; }
  const painLevel = normalizePainLevel(painValue,movementChanged), injuryArea = byId("reviewInjuryArea").value, injuryDetails = byId("reviewInjuryDetails").value.trim(), painExercise = byId("reviewPainExercise").value.trim() || (painRequiresSafetyHold(painLevel,movementChanged) ? injuryDetails : ""), rawPainScore = byId("reviewPainScore").value;
  if (painValue !== "none" && !injuryArea) { showToast("Choose the body area so the safety filter and trainer know what to review"); byId("reviewInjuryArea").focus(); return null; }
  if (painRequiresSafetyHold(painLevel,movementChanged) && injuryDetails.length < 5) { showToast("Briefly describe which movement caused the pain and what changed"); byId("reviewInjuryDetails").focus(); return null; }
  const review = {
    difficulty: Number(byId("reviewDifficulty").value), completion: byId("reviewCompletion").value,
    energy: Number(byId("reviewEnergy").value), pain: legacyPainValue(painLevel,movementChanged), painLevel, movementChanged, painScore:rawPainScore === "" ? null : Math.max(0,Math.min(10,Number(rawPainScore))), painExercise,
    rir:Number(byId("reviewRir").value), formQuality:byId("reviewForm").value, rangeOfMotion:byId("reviewRange").value, timeFit:byId("reviewTimeFit").value,
    injuryArea, injuryDetails, notes: byId("reviewNotes").value.trim(), liked:byId("reviewLiked").value.trim(), disliked:byId("reviewDisliked").value.trim(), questions:byId("reviewQuestions").value.trim(),
    goals: [...(session.spec.goals || [session.spec.goal]).filter(Boolean)], duration: session.spec.minutes,
    prescribedExercises: session.blocks.reduce((sum, block) => sum + block.items.length, 0), loggedSets: sets.length,
    actualDuration:activeWorkout && activeWorkout.startedAt ? Math.max(1,Math.round((Date.now() - new Date(activeWorkout.startedAt).getTime()) / 60000)) : session.spec.minutes,
    personalRecords:sessionPersonalRecords(session.sessionId),
  };
  const injuryText = review.pain !== "none" ? " · " + (review.injuryArea ? INJURY_LABELS[review.injuryArea] : "Pain reported") : " · No pain reported";
  addProgressEntry({
    type: "workout", client: session.spec.client || chosen.label, sessionId: session.sessionId,
    label: session.goalLabel + " workout review", value: sets.length + " logged sets · difficulty " + review.difficulty + "/10",
    note: (review.completion === "all" ? "Completed" : "Completion: " + review.completion) + injuryText + (review.notes ? " · " + review.notes : ""), data: review,
  });
  const completedAssignment = completeAssignmentFromReview(session,review), profileUpdated = updateProfileFromReview(session, review); refreshHistoryFilters(); renderProgressHistory(); closeWorkoutReview();
  showToast(review.pain === "changed" || review.pain === "stopped"
    ? (profileUpdated ? "Review saved — injury area added to future filters" : "Review and injury report saved for the trainer")
    : review.questions ? "Workout review saved — your question is highlighted for the trainer" : review.pain === "mild" ? "Workout review saved — discomfort is highlighted for the trainer" : "Workout review and summary saved");
  if (portalRole === "client" && completedAssignment) { activeWorkout = null; saveActiveWorkoutState(); activateClientProfile(completedAssignment.profileId); }
  if (openAnalysis) openTrainerHub(session.spec.client || chosen.label);
  return review;
}
function refreshHistoryFilters() {
  const select = byId("historyClientFilter"); if (!select) return;
  const current = select.value;
  const names = [...loadProfiles().map((p) => p.name), ...loadProgress().map((e) => e.client).filter(Boolean)]
    .filter((name, index, arr) => arr.findIndex((other) => clientMatches(other, name)) === index)
    .sort((a, b) => a.localeCompare(b));
  select.innerHTML = '<option value="">Choose a client…</option>';
  names.forEach((name) => { const option = document.createElement("option"); option.value = name; option.textContent = name; select.appendChild(option); });
  if (names.some((name) => clientMatches(name, current))) select.value = names.find((name) => clientMatches(name, current));
}

function selectProgressHistoryClient() {
  const client = byId("historyClientFilter") && byId("historyClientFilter").value || "";
  const summary = byId("clientSummary");
  if (summary) summary.innerHTML = "";
  if (!client && byId("historyTypeFilter")) byId("historyTypeFilter").value = "";
  renderProgressHistory();
}

