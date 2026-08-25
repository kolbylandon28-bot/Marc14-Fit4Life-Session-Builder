/* ---------- Goal-specific personalization baselines ----------
   Baselines are collected inside useful first workouts. They deliberately use
   submaximal, pain-free work instead of max tests, and they remain coach-gated
   before the generator may treat the results as programming evidence. */
const BASELINE_VERSION = 1;
const BASELINE_DOMAIN_LABELS = {
  movement:"Movement quality",
  strength:"Strength anchor",
  volume:"Volume tolerance",
  conditioning:"Cardio pace",
  power:"Power quality",
  recovery:"Comfortable movement",
};
const GOAL_BASELINE_DOMAINS = {
  strength:["movement","strength"],
  hypertrophy:["movement","volume"],
  fatloss:["movement","conditioning"],
  general:["movement","conditioning"],
  athletic:["movement","power","strength"],
  conditioning:["conditioning","movement"],
  recovery:["movement","recovery"],
};
const SECONDARY_BASELINE_DOMAIN = {strength:"strength",hypertrophy:"volume",fatloss:"conditioning",general:"conditioning",athletic:"power",conditioning:"conditioning",recovery:"recovery"};
function baselineGoalsFor(profile) {
  return [...new Set((profile && profile.goals || []).filter((goal) => GOAL_BASELINE_DOMAINS[goal]))].slice(0,2);
}
function baselineRequiredDomains(profile) {
  const goals = baselineGoalsFor(profile), primary = goals[0] || "general", domains = [...(GOAL_BASELINE_DOMAINS[primary] || GOAL_BASELINE_DOMAINS.general)];
  const secondary = goals[1] && SECONDARY_BASELINE_DOMAIN[goals[1]]; if (secondary && !domains.includes(secondary)) domains.push(secondary);
  return domains.slice(0,3);
}
function baselineEvidenceFor(profile) {
  if (!profile) return [];
  const entries = loadProgress().filter((entry) => entry && entry.type === "set" && entry.data && entry.data.calibration === true && (entry.profileId === profile.id || entry.data.profileId === profile.id || clientMatches(entry.client,profile.name)));
  return entries.flatMap((entry) => {
    const domains = Array.isArray(entry.data.baselineDomains) ? entry.data.baselineDomains : entry.data.baselineDomain ? [entry.data.baselineDomain] : [];
    return domains.map((domain) => ({ domain,entry,usable:Number(entry.data.baselinePain || 0) <= 1 && entry.data.baselineStopped !== true }));
  });
}
function baselineEvidenceByDomain(profile) {
  return baselineEvidenceFor(profile).reduce((groups,item) => { (groups[item.domain] ||= []).push(item); return groups; },{});
}
function baselineStateForProfile(profile) {
  if (!profile) return {status:"missing",required:[],complete:[],missing:[],evidence:[]};
  const required = baselineRequiredDomains(profile), evidence = baselineEvidenceFor(profile), groups = baselineEvidenceByDomain(profile), complete = required.filter((domain) => (groups[domain] || []).some((item) => item.usable)), missing = required.filter((domain) => !complete.includes(domain));
  const baseline = profile.baseline && typeof profile.baseline === "object" ? profile.baseline : {};
  const goals = baselineGoalsFor(profile), verifiedGoals = Array.isArray(baseline.goals) ? baseline.goals : [];
  const goalChanged = baseline.status === "established" && goals.join("|") !== verifiedGoals.join("|");
  let status = baseline.status || "missing";
  if (goalChanged) status = "due";
  else if (status !== "established" && !missing.length && required.length) status = "provisional";
  else if (status === "missing" && baseline.planId) status = "planned";
  return {status,required,complete,missing,evidence,groups,baseline,goalChanged};
}
function baselineCanTailor(profile) { return baselineStateForProfile(profile).status === "established"; }
function baselineStatusTitle(status) {
  return ({missing:"Baseline needed",planned:"Calibration assigned",provisional:"Evidence ready for coach review",established:"Personalization baseline established",due:"Baseline update needed"})[status] || "Baseline needed";
}
function baselineDomainChipsHtml(state) {
  return '<div class="baseline-domain-row">' + state.required.map((domain) => '<span class="baseline-domain-chip ' + (state.complete.includes(domain) ? 'done' : 'missing') + '">' + (state.complete.includes(domain) ? '✓ ' : '') + escapeHtml(BASELINE_DOMAIN_LABELS[domain] || domain) + '</span>').join("") + '</div>';
}
function renderProgramBaselineGate() {
  const out = byId("programBaselineGate"), profile = loadProfiles().find((item) => item.id === (byId("programProfile") && byId("programProfile").value));
  const build = byId("programBuildBtn"), calibration = byId("programCalibrationBtn"); if (!out) return null;
  if (!profile) {
    out.dataset.status = "missing"; out.innerHTML = '<div class="baseline-gate-copy"><span>Personalization baseline</span><h4>Select a client to check baseline readiness</h4><p>Tailored programming unlocks after useful first-workout calibration and coach verification.</p></div>';
    if (build) build.disabled = true; if (calibration) calibration.disabled = true; return null;
  }
  const state = baselineStateForProfile(profile), established = state.status === "established", reviewable = state.status === "provisional";
  const copy = established ? "Verified calibration results can now guide starting loads, effort, exercise familiarity, cardio pacing, and initial volume." : reviewable ? "The required observations were collected. Review the client’s pain response, confidence, effort, and exercise fit before unlocking tailored programming." : state.status === "planned" ? "The first workout is already set to collect the missing information without turning the visit into a testing-only session." : state.status === "due" ? "The client’s goals changed. Recheck only the missing goal-specific domains before the next tailored phase." : "Build one useful calibration workout for a once-weekly client, or split the anchors across two useful workouts when the client trains more often.";
  out.dataset.status = state.status; out.innerHTML = '<div class="baseline-gate-copy"><span>Personalization baseline · ' + escapeHtml(state.status) + '</span><h4>' + escapeHtml(baselineStatusTitle(state.status)) + '</h4><p>' + escapeHtml(copy) + '</p>' + baselineDomainChipsHtml(state) + '</div><div class="baseline-gate-actions">' + (reviewable || established ? '<button class="small-btn ' + (reviewable ? 'primary' : '') + '" onclick="openBaselineReview(\'' + escapeHtml(profile.id) + '\')">' + (reviewable ? 'Review evidence' : 'View baseline') + '</button>' : '') + (!established ? '<button class="small-btn" onclick="generateCalibrationProgram()">' + (state.status === 'planned' ? 'Rebuild calibration' : 'Build calibration') + '</button>' : '') + '</div>';
  if (build) build.disabled = !established; if (calibration) calibration.disabled = established; return state;
}
function baselineClientCardHtml(profile) {
  const state = baselineStateForProfile(profile), established = state.status === "established", reviewable = state.status === "provisional";
  const body = established ? "Your coach verified the starting evidence used to individualize exercise familiarity, effort, pace, load guidance, and early volume." : reviewable ? "You completed the required calibration anchors. Your coach is reviewing them before the app unlocks a tailored training phase." : state.status === "planned" ? "Your first workout includes a few clearly marked calibration sets. The rest of the session is normal training." : "Your trainer will build a short baseline into your first useful workout before assigning a fully tailored phase.";
  return '<section class="client-card wide baseline-client-card ' + (established ? 'established' : '') + '"><div class="client-section-label">Personalization baseline</div><div class="client-action-row"><div><b>' + escapeHtml(baselineStatusTitle(state.status)) + '</b><span>' + escapeHtml(body) + '</span>' + baselineDomainChipsHtml(state) + '</div>' + (reviewable ? '<span class="receipt-status">Coach review</span>' : '') + '</div></section>';
}
function baselineTrainerCardHtml(profile) {
  if (!profile) return "";
  const state = baselineStateForProfile(profile);
  return '<section class="analysis-panel"><h4 class="analysis-section-title">Personalization baseline · ' + escapeHtml(state.status) + '</h4><p>' + escapeHtml(state.status === 'established' ? 'Verified evidence is available to the workout generator.' : state.status === 'provisional' ? 'Required evidence is complete and waiting for trainer verification.' : 'Build calibration only when a coach wants extra starting evidence; normal single workouts remain available.') + '</p>' + baselineDomainChipsHtml(state) + '<div class="tool-actions"><button class="small-btn ' + (state.status === 'provisional' ? 'primary' : '') + '" onclick="openBaselineReview(\'' + escapeHtml(profile.id) + '\')">Review baseline</button><button class="small-btn ' + (["missing","planned","due"].includes(state.status) ? 'primary' : '') + '" onclick="openSelectedClientProgram()">' + (["missing","planned","due"].includes(state.status) ? 'Build calibration' : 'Open program builder') + '</button></div></section>';
}
function baselineGeneratorContext(profile) {
  if (!baselineCanTailor(profile)) return null;
  const evidence = baselineEvidenceFor(profile), usable = evidence.filter((item) => item.usable), entries = [...new Map(usable.map((item) => [item.entry.id,item.entry])).values()];
  const confidence = entries.map((entry) => Number(entry.data.baselineConfidence)).filter(Number.isFinite), effort = entries.map((entry) => Number(entry.data.rpe)).filter(Number.isFinite), pain = entries.map((entry) => Number(entry.data.baselinePain)).filter(Number.isFinite);
  return {
    version:BASELINE_VERSION,verifiedAt:profile.baseline && profile.baseline.verifiedAt || "",goals:baselineGoalsFor(profile),
    exerciseNames:[...new Set(entries.map((entry) => entry.label))],
    averageConfidence:confidence.length ? confidence.reduce((a,b) => a + b,0) / confidence.length : null,
    averageRpe:effort.length ? effort.reduce((a,b) => a + b,0) / effort.length : null,
    maxPain:pain.length ? Math.max(...pain) : 0,
    lowTolerance:(effort.length && effort.reduce((a,b) => a + b,0) / effort.length >= 8.5) || (confidence.length && confidence.reduce((a,b) => a + b,0) / confidence.length < 2.5) || (pain.length && Math.max(...pain) > 0),
  };
}
function applyBaselinePersonalization(session) {
  const context = session && session.spec && session.spec.baselineContext; if (!context || !context.verifiedAt) return session;
  if (session.baselineTranslation && session.baselineTranslation.verifiedAt === context.verifiedAt) return session;
  const known = new Set(context.exerciseNames || []), matched = [];
  (session.blocks || []).forEach((block) => {
    if (context.lowTolerance && !["warmup","primer","mobility","conditioning"].includes(block.key)) {
      const originalBlockSets = block.rx.sets;
      block.rx.sets = adjustSetCount(block.rx.sets,-1);
      block.items.forEach((exercise) => { const priorSets = exercise.rx && exercise.rx.sets || originalBlockSets; exercise.rx = { ...(exercise.rx || block.rx),sets:adjustSetCount(priorSets,-1),rpe:"RPE 6–7 · preserve clean reps" }; });
    }
    block.items.forEach((exercise) => { if (known.has(exercise.name)) { exercise.baselineMatched = true; exercise.baselineNote = "Starting guidance is supported by coach-verified calibration history."; matched.push(exercise.name); } });
  });
  session.baselineTranslation = {verifiedAt:context.verifiedAt,matchedExercises:[...new Set(matched)],volumeAdjusted:Boolean(context.lowTolerance),confidence:context.averageConfidence};
  session.rationale = "Baseline translation: " + (matched.length ? "familiar calibrated movements are reused where they fit" : "verified effort and tolerance guide the initial prescription") + (context.lowTolerance ? ", with conservative opening volume" : ", with standard opening volume") + ". " + session.rationale;
  return session;
}
function baselineEvidenceSummary(entry) {
  const data = entry && entry.data || {}, pieces = [];
  if (data.load != null) pieces.push(data.load + " " + (data.unit || "lb")); else if (data.unit === "bodyweight") pieces.push("Bodyweight");
  if (data.reps != null) pieces.push(data.reps + (data.unit === "session" ? " min / distance" : " reps")); if (data.rpe != null) pieces.push("RPE " + data.rpe);
  if (data.baselineConfidence != null) pieces.push("confidence " + data.baselineConfidence + "/5"); if (data.baselinePain != null) pieces.push(["no pain","mild awareness","movement changed","stopped"][Number(data.baselinePain)] || "pain checked");
  return pieces.join(" · ") || entry.value || "Recorded";
}
function openBaselineReview(profileId) {
  const profile = loadProfiles().find((item) => item.id === profileId); if (!profile) return null; const state = baselineStateForProfile(profile), out = byId("baselineReviewSummary");
  byId("baselineReviewProfileId").value = profile.id; byId("baselineReviewTitle").textContent = profile.name + " · personalization baseline"; byId("baselineReviewStatus").textContent = baselineStatusTitle(state.status); byId("baselineReviewNote").value = state.baseline.reviewNote || ""; byId("baselineReviewConfirmed").checked = state.status === "established";
  out.innerHTML = state.required.map((domain) => { const items = (state.groups[domain] || []).filter((item) => item.usable), latest = items[0] && items[0].entry; return '<div class="baseline-evidence-row ' + (latest ? '' : 'missing') + '"><div><span class="baseline-domain-label">' + escapeHtml(BASELINE_DOMAIN_LABELS[domain] || domain) + '</span><h4>' + (latest ? 'Usable evidence' : 'Still needed') + '</h4></div><div>' + (latest ? '<b>' + escapeHtml(latest.label) + '</b><p>' + escapeHtml(baselineEvidenceSummary(latest)) + ' · ' + new Date(latest.date).toLocaleDateString() + '</p>' : '<p>Complete a marked calibration anchor pain-free, record effort, and save confidence.</p>') + '</div></div>'; }).join("");
  byId("baselineReviewModal").classList.add("open"); return state;
}
function closeBaselineReview() { const modal = byId("baselineReviewModal"); if (modal) modal.classList.remove("open"); }
function establishClientBaseline() {
  if (!requireTrainerMutation("verify client baselines")) return false;
  const profileId = byId("baselineReviewProfileId").value, profiles = loadProfiles(), index = profiles.findIndex((profile) => profile.id === profileId); if (index < 0) return false;
  const state = baselineStateForProfile(profiles[index]); if (state.missing.length) { showToast("Baseline still needs: " + state.missing.map((domain) => BASELINE_DOMAIN_LABELS[domain] || domain).join(", ")); return false; }
  if (!byId("baselineReviewConfirmed").checked) { showToast("Confirm that you reviewed pain, effort, confidence, technique, and exercise fit"); return false; }
  const now = new Date().toISOString(), usableEntries = [...new Map(state.evidence.filter((item) => item.usable).map((item) => [item.entry.id,item.entry])).values()];
  profiles[index].baseline = { ...(profiles[index].baseline || {}),version:BASELINE_VERSION,status:"established",goals:baselineGoalsFor(profiles[index]),requiredDomains:state.required,verifiedAt:now,verifiedBy:currentAccountIdentity().displayName,reviewNote:byId("baselineReviewNote").value.trim(),evidenceIds:usableEntries.map((entry) => entry.id),exerciseNames:[...new Set(usableEntries.map((entry) => entry.label))] };
  profiles[index].exercisePreferences = { ...(profiles[index].exercisePreferences || {}) }; usableEntries.forEach((entry) => { if (Number(entry.data.baselinePain || 0) <= 1 && Number(entry.data.baselineConfidence || 3) >= 3) { const exercise = LIBRARY.find((item) => item.name === entry.label); if (exercise) profiles[index].exercisePreferences[exerciseId(exercise)] = "like"; } }); profiles[index].updatedAt = now;
  if (!writeProfiles(profiles)) { showToast("The verified baseline could not be saved. Keep this review open and try again."); return false; }
  if (!addProgressEntry({type:"baseline_verified",client:profiles[index].name,profileId:profiles[index].id,label:"Personalization baseline",value:"Coach verified",note:profiles[index].baseline.reviewNote,data:{domains:state.required,evidenceIds:profiles[index].baseline.evidenceIds}})) return false;
  closeBaselineReview(); renderProgramBaselineGate(); if (selectedTrainerClient && clientMatches(selectedTrainerClient,profiles[index].name)) renderTrainerAnalysis(selectedTrainerClient); showToast("Baseline established · tailored programming unlocked for " + profiles[index].name); return true;
}
function requestBaselineRetest() {
  if (!requireTrainerMutation("keep client calibration open")) return false; const profileId = byId("baselineReviewProfileId").value, profiles = loadProfiles(), profile = profiles.find((item) => item.id === profileId); if (!profile) return false;
  profile.baseline = { ...(profile.baseline || {}),status:"planned",reviewNote:byId("baselineReviewNote").value.trim(),updatedAt:new Date().toISOString() };
  if (!writeProfiles(profiles)) { showToast("The calibration review could not be saved. Keep this review open and try again."); return false; }
  closeBaselineReview(); renderProgramBaselineGate(); showToast("Calibration remains open · rebuild only the missing or questionable anchors"); return true;
}
const EXP_OPTIONS = [[1, "New — learning technique"], [2, "Intermediate — trains consistently"], [3, "Advanced — highly experienced"]];
const TIME_OPTIONS = [[30, "30 min"], [45, "45 min"], [60, "60 min"], [90, "90 min"]];
const ALL_ZONES = ["cardio", "platform", "rack", "crossfit", "dumbbell", "machine", "cable", "bodyweight"];
const ALL_INJURIES = [...BODY_AREA_LIMITATIONS,...LIFE_STAGE_LIMITATIONS,...MOVEMENT_RESTRICTIONS];
const MUSCLE_LIST = ["chest", "back", "shoulders", "quads", "hamstrings", "glutes", "arms", "calves", "core"];
const QUICK_REGIONS = [["push", "Push"], ["pull", "Pull"], ["legs", "Legs"], ["core", "Core"], ["full", "Full body"]];

const CAUTION_TEXT = {
  knee: "Knee-loading movements are filtered out. Cue pain-free range only, load lighter before deeper, and stop anything that pinches.",
  shoulder: "Overhead and shoulder-stressing movements are filtered out. Favor neutral-grip and supported options, keep range pain-free.",
  lowback: "Spine-loading movements are filtered out. Cue a braced neutral spine, hinge from the hips, and avoid end-range rounding.",
  wrist: "Wrist-loading movements are filtered out. Use neutral-grip and strap options where helpful.",
  hip: "Hip-stressing movements are filtered out. Work in comfortable range and progress range before load.",
  elbow: "Elbow-stressing movements are filtered out. Keep pressing and curling pain-free and controlled.",
  ankle: "Ankle-loading and impact movements are filtered out. Favor supported, low-impact options.",
  neck: "Neck-stressing movements are filtered out. Keep the head neutral and avoid loaded overhead positions.",
  pregnancy: "Conservative pregnancy filters remove high-impact, ballistic hinge, fall-risk, prolonged flat-back/prone, and maximal-finisher choices. A qualified prenatal clinician and the trainer must still individualize the plan.",
  postpartum: "High-impact and ballistic choices are filtered while the client returns gradually. Clearance, symptoms, delivery recovery, and pelvic-floor tolerance should guide progression.",
  balance: "Unilateral, high-impact, plyometric, and Olympic movements are filtered to reduce fall risk. Favor stable support and controlled changes of direction.",
  pelvicfloor: "High-impact, ballistic, and maximal metabolic finishers are filtered. Use symptom-guided breathing and pressure management, and refer persistent symptoms to a qualified clinician.",

  // Plain-language versions for the tags that had none. A client picks several of these
  // themselves, so the explanation has to make sense to them, not to the engine.
  foot: "Exercises that load or push off your foot and toes are left out until it settles.",
  handgrip: "Exercises that need a hard grip are swapped for ones that do not.",
  thoracic: "Exercises that twist or compress your upper back and ribs are left out.",
  abdominal: "Hard bracing and direct ab work are left out while this heals.",
  medicalhold: "Training is paused until the person treating you clears you to start again.",
  noimpact: "No jumping, running or landing - your sessions stay on the ground.",
  noballistic: "Fast, explosive movements are replaced with steady, controlled ones.",
  nooverhead: "Nothing is pressed or held above your head.",
  nodeepknee: "Your knees stay in a comfortable range - no deep squatting or kneeling.",
  nodeephip: "Your hips stay in a comfortable range - nothing that folds you up deeply.",
  nohinge: "Bending forward from the hips, like a deadlift, is left out.",
  noaxialload: "Nothing rests weight down through your spine, so no bars across your back or shoulders.",
  nospinalflexion: "Rounding or curling your back forward is left out, including sit-ups.",
  nospinalextension: "Arching your back backwards is left out.",
  norotation: "Twisting under load is left out.",
  nogrip: "Anything you have to grip hard is swapped for machines or straps.",
  nosingleleg: "You stay on both feet - no single-leg or balance work.",
  nofloor: "Nothing asks you to get down to the floor and back up.",
  nosupine: "No exercises lying flat on your back.",
  noprone: "No exercises lying face down, including planks.",
  nostraining: "Nothing that makes you hold your breath and strain - the effort stays moderate.",
  lowintensity: "Everything stays light and easy for now."
};

let state = {
  mode: "solo",
  solo: { client: "", goal: "", goals: [], trainingStyle:"auto", cardioMode:"any", cardioModes:["any"], experience: "", age: 30, minutes: 60, muscles: [], injuries: [], zones: [] },
  p1: { client: "", goal: "", goals: [], trainingStyle:"auto", cardioMode:"any", cardioModes:["any"], experience: "", age: 30, minutes: 60, muscles: [], injuries: [], zones: [] },
  p2: { client: "", goal: "", goals: [], trainingStyle:"auto", cardioMode:"any", cardioModes:["any"], experience: "", age: 30, minutes: 60, muscles: [], injuries: [], zones: [] },
  seed: Math.floor(Math.random() * 100000),
  session: null,   // rendered session state (with live edits)
  sessionOptions: [], // three contrasting generated directions awaiting trainer choice
};
