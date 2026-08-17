/* ---------- Required client Trainer Consultation ---------- */
const CLIENT_CONSULTATION_VERSION = 1;
const CLIENT_CONSULTATION_FITNESS = [
  ["beginner","Beginner","Newer to exercise or still learning consistent form"],
  ["intermediate","Intermediate","About 6+ months of consistent experience"],
  ["advanced","Advanced","About 2+ years with strong exercise technique"],
];
const CLIENT_CONSULTATION_INTERESTS = [
  ["sports","Sports"],["running","Running"],["strength","Strength training"],["bodybuilding","Body building"],
  ["swimming","Swimming"],["functional","Functional training"],["aerobics","Aerobics"],["walking","Walking"],
];
const CLIENT_CONSULTATION_GOALS = [
  ["hypertrophy","Build muscle / hypertrophy"],["body_composition","Improve body composition"],["strength","Gain strength"],
  ["endurance","Improve endurance"],["athletic","Improve athletic performance"],["powerlifting","Train for powerlifting"],
  ["rehab","Injury rehab or prehab (with clearance)"],["confidence","Gain confidence and active habits"],
  ["mental_health","Improve mental health through movement"],["feel_good","Feel good"],["weight_loss","Lose weight"],["new_to_gym","New to the gym"],
];
const CLIENT_CONSULTATION_SUPPORT = [
  ["accountability","Accountability partner"],["technique","Proper exercise form and technique"],
  ["confidence","Help build confidence"],["physical_qualities","Strength, endurance, mobility, and flexibility"],
  ["independence","Learn how to structure workouts independently"],["gym_comfort","Feel comfortable in the gym"],
  ["community","Find a supportive group"],
];
const CLIENT_CONSULTATION_LIMITATIONS = [
  ["knee","Knee"],["shoulder","Shoulder"],["lowback","Lower back"],["wrist","Wrist"],
  ["hip","Hip"],["elbow","Elbow"],["ankle","Ankle"],["neck","Neck"],
  ["foot","Foot / toes"],["handgrip","Hand / grip"],["thoracic","Upper back / ribs"],["abdominal","Abdominal wall"],
];
const CLIENT_CONSULTATION_GOAL_MAP = {
  hypertrophy:"hypertrophy",body_composition:"fatloss",strength:"strength",endurance:"conditioning",athletic:"athletic",
  powerlifting:"strength",rehab:"recovery",confidence:"general",mental_health:"general",feel_good:"general",weight_loss:"fatloss",new_to_gym:"general",
};
let clientConsultationStep = 1;
let clientConsultationRequiredMode = false;
let trainerConsultationProfileId = "";

function isByuiEmail(value) {
  return /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@byui\.edu$/i.test(String(value || "").trim());
}
window.fit4lifeIsByuiEmail = isByuiEmail;

function clientConsultationComplete(profile) {
  const consultation = profile && profile.consultation;
  return Boolean(consultation && consultation.version >= CLIENT_CONSULTATION_VERSION && consultation.status === "submitted" && consultation.submittedAt);
}
function clientNeedsRequiredConsultation() {
  return (window.fit4lifeCloudRole || "") === "client" && !clientConsultationComplete(activeClientProfile());
}
function consultationOptionButtons(items,name,selected,type) {
  const chosen = new Set(Array.isArray(selected) ? selected : selected ? [selected] : []), inputType = type || "checkbox";
  return items.map(([value,label,copy]) => '<label class="consultation-option"><input type="' + inputType + '" name="' + name + '" value="' + escapeHtml(value) + '"' + (chosen.has(value) ? ' checked' : '') + '><span><b>' + escapeHtml(label) + '</b>' + (copy ? '<small>' + escapeHtml(copy) + '</small>' : '') + '</span></label>').join("");
}
function selectedConsultationValues(name) {
  return [...document.querySelectorAll('input[name="' + name + '"]:checked')].map((input) => input.value);
}
function selectedConsultationValue(name) { const input = document.querySelector('input[name="' + name + '"]:checked'); return input ? input.value : ""; }
function consultationText(id) { const input = byId(id); return input ? String(input.value || "").trim() : ""; }
function consultationRpeLabel(value) {
  const score = Number(value) || 1;
  if (score <= 2) return "Very easy";
  if (score <= 4) return "Light";
  if (score <= 6) return "Moderate";
  if (score <= 8) return "Vigorous";
  if (score === 9) return "Very hard";
  return "Max effort";
}
function renderConsultationRpe(value) { const out = byId("consultationRpeOutput"); if (out) out.textContent = (Number(value) || 1) + " · " + consultationRpeLabel(value); }
function syncConsultationLimitationVisibility() {
  const visible = selectedConsultationValue("consultation_has_limitations") === "yes";
  document.querySelectorAll(".consultation-limitations-detail").forEach((item) => item.classList.toggle("show",visible));
}
function enforceConsultationSecondaryLimit() {
  const checked = [...document.querySelectorAll('input[name="consultation_secondary_goal"]:checked')];
  if (checked.length > 2) { checked[checked.length - 1].checked = false; showToast("Choose no more than two secondary goals"); }
}
function initializeConsultationChoices(consultation) {
  byId("consultationFitnessLevel").innerHTML = consultationOptionButtons(CLIENT_CONSULTATION_FITNESS,"consultation_fitness",consultation.fitnessLevel,"radio");
  byId("consultationInterests").innerHTML = consultationOptionButtons(CLIENT_CONSULTATION_INTERESTS,"consultation_interest",consultation.interests);
  byId("consultationHasLimitations").innerHTML = consultationOptionButtons([["no","No current limitations"],["yes","Yes — adaptations may be needed"]],"consultation_has_limitations",consultation.limitations && consultation.limitations.hasLimitations,"radio");
  byId("consultationLimitationAreas").innerHTML = consultationOptionButtons(CLIENT_CONSULTATION_LIMITATIONS,"consultation_limitation_area",consultation.limitations && consultation.limitations.areas);
  byId("consultationSupport").innerHTML = consultationOptionButtons(CLIENT_CONSULTATION_SUPPORT,"consultation_support",consultation.supportPriorities);
  const primary = byId("consultationPrimaryGoal");
  primary.innerHTML = '<option value="">Choose one main goal…</option>' + CLIENT_CONSULTATION_GOALS.map(([value,label]) => '<option value="' + escapeHtml(value) + '">' + escapeHtml(label) + '</option>').join("");
  primary.value = consultation.primaryGoal || "";
  byId("consultationSecondaryGoals").innerHTML = consultationOptionButtons(CLIENT_CONSULTATION_GOALS,"consultation_secondary_goal",consultation.secondaryGoals);
  document.querySelectorAll('input[name="consultation_secondary_goal"]').forEach((input) => input.addEventListener("change",enforceConsultationSecondaryLimit));
  document.querySelectorAll('input[name="consultation_has_limitations"]').forEach((input) => input.addEventListener("change",syncConsultationLimitationVisibility));
  syncConsultationLimitationVisibility();
}
function consultationDefault(profile) {
  const identity = window.fit4lifeCloudIdentity || {}, stored = profile && profile.consultation || {}, prior = stored.pendingEdits && stored.draft ? {...stored,...stored.draft} : stored;
  return {
    ...prior,version:CLIENT_CONSULTATION_VERSION,status:prior.status || "draft",
    identity:{...(prior.identity || {}),fullName:profile && profile.name || identity.displayName || "",email:identity.email || profile && profile.email || "",phone:prior.identity && prior.identity.phone || profile && (profile.phone || profile.contactPhone) || "",age:prior.identity && prior.identity.age || profile && profile.age || ""},
    fitnessLevel:prior.fitnessLevel || "",pastActivities:prior.pastActivities || "",usualRpe:Number(prior.usualRpe) || 5,
    interests:[...(prior.interests || [])],primaryGoal:prior.primaryGoal || "",secondaryGoals:[...(prior.secondaryGoals || [])],
    favoriteExercises:prior.favoriteExercises || "",leastFavoriteExercises:prior.leastFavoriteExercises || "",unfamiliarExercises:prior.unfamiliarExercises || "",
    limitations:{hasLimitations:prior.limitations && prior.limitations.hasLimitations || "",areas:[...(prior.limitations && prior.limitations.areas || [])],details:prior.limitations && prior.limitations.details || ""},
    supportPriorities:[...(prior.supportPriorities || [])],supportOther:prior.supportOther || "",consent:{...(prior.consent || {})},
  };
}
function populateClientConsultation(profile) {
  const consultation = consultationDefault(profile);
  byId("consultationName").value = consultation.identity.fullName;
  byId("consultationEmail").value = consultation.identity.email;
  byId("consultationPhone").value = consultation.identity.phone;
  byId("consultationAge").value = consultation.identity.age;
  byId("consultationPastActivities").value = consultation.pastActivities;
  byId("consultationRpe").value = consultation.usualRpe;
  renderConsultationRpe(consultation.usualRpe);
  byId("consultationFavorites").value = consultation.favoriteExercises;
  byId("consultationDislikes").value = consultation.leastFavoriteExercises;
  byId("consultationUnfamiliar").value = consultation.unfamiliarExercises;
  byId("consultationLimitationDetails").value = consultation.limitations.details;
  byId("consultationSupportOther").value = consultation.supportOther;
  byId("consultationTruth").checked = Boolean(consultation.consent.truth);
  byId("consultationPrivacy").checked = Boolean(consultation.consent.privacy);
  byId("consultationNotMedical").checked = Boolean(consultation.consent.notMedical);
  initializeConsultationChoices(consultation);
}
function readClientConsultationForm(profile,status) {
  const prior = profile && profile.consultation || {}, now = new Date().toISOString();
  return {
    ...prior,version:CLIENT_CONSULTATION_VERSION,status:status || prior.status || "draft",revision:Number(prior.revision || 0),
    identity:{fullName:consultationText("consultationName"),email:consultationText("consultationEmail").toLowerCase(),phone:consultationText("consultationPhone"),age:Number(consultationText("consultationAge")) || null},
    fitnessLevel:selectedConsultationValue("consultation_fitness"),pastActivities:consultationText("consultationPastActivities"),usualRpe:Number(byId("consultationRpe").value) || 5,
    interests:selectedConsultationValues("consultation_interest"),primaryGoal:byId("consultationPrimaryGoal").value,secondaryGoals:selectedConsultationValues("consultation_secondary_goal").filter((goal) => goal !== byId("consultationPrimaryGoal").value).slice(0,2),
    favoriteExercises:consultationText("consultationFavorites"),leastFavoriteExercises:consultationText("consultationDislikes"),unfamiliarExercises:consultationText("consultationUnfamiliar"),
    limitations:{hasLimitations:selectedConsultationValue("consultation_has_limitations"),areas:selectedConsultationValues("consultation_limitation_area"),details:consultationText("consultationLimitationDetails")},
    supportPriorities:selectedConsultationValues("consultation_support"),supportOther:consultationText("consultationSupportOther"),
    consent:{truth:byId("consultationTruth").checked,privacy:byId("consultationPrivacy").checked,notMedical:byId("consultationNotMedical").checked},
    updatedAt:now,lastClientEditedAt:now,
  };
}
function consultationSetAlert(message,error) {
  const out = byId("consultationAlert"); if (!out) return;
  out.textContent = message || ""; out.classList.toggle("show",Boolean(message)); out.classList.toggle("error",Boolean(error));
}
function validateConsultationStep(step,data) {
  const fail = (message,id) => { consultationSetAlert(message,true); if (id && byId(id)) byId(id).focus(); return false; };
  consultationSetAlert("",false);
  if (step === 1) {
    if (!isByuiEmail(data.identity.email)) return fail("Client access requires a verified BYU-I email ending in @byui.edu. Sign out and contact the Fit4Life team if your login email needs to be corrected.","consultationEmail");
    if (String(data.identity.phone || "").replace(/\D/g,"").length < 7) return fail("Enter a phone number the coaching team can use.","consultationPhone");
    if (!data.identity.age || data.identity.age < 13 || data.identity.age > 100) return fail("Enter an age from 13 to 100.","consultationAge");
    if (!data.fitnessLevel) return fail("Choose your current fitness level.");
  }
  if (step === 2) {
    if (!data.pastActivities) return fail("Describe your past physical activity. You can enter “None yet.”","consultationPastActivities");
    if (!data.interests.length) return fail("Choose at least one type of exercise that interests you.");
  }
  if (step === 3) {
    if (!data.primaryGoal) return fail("Choose one main fitness goal.","consultationPrimaryGoal");
    if (!data.favoriteExercises) return fail("List favorite exercises, or enter “None yet.”","consultationFavorites");
    if (!data.leastFavoriteExercises) return fail("List least favorite exercises, or enter “None.”","consultationDislikes");
    if (!data.unfamiliarExercises) return fail("List unfamiliar exercises, or enter “None.”","consultationUnfamiliar");
  }
  if (step === 4) {
    if (!data.limitations.hasLimitations) return fail("Tell us whether you have any current limitations.");
    if (data.limitations.hasLimitations === "yes" && !data.limitations.areas.length) return fail("Choose the area affected by the limitation.");
    if (data.limitations.hasLimitations === "yes" && !data.limitations.details) return fail("Describe the limitation or adaptation your trainer should review.","consultationLimitationDetails");
    if (!data.supportPriorities.length && !data.supportOther) return fail("Choose at least one way you would like your trainer to help.");
  }
  if (step === 5 && (!data.consent.truth || !data.consent.privacy || !data.consent.notMedical)) return fail("Confirm all three statements before submitting.");
  return true;
}
function consultationLabel(items,value) { const match = items.find((item) => item[0] === value); return match ? match[1] : value || "Not answered"; }
function consultationListLabels(items,values) { return (values || []).map((value) => consultationLabel(items,value)).join(", ") || "None selected"; }
function renderConsultationReview(data) {
  const out = byId("consultationReview"); if (!out) return;
  const limitations = data.limitations.hasLimitations === "yes" ? consultationListLabels(CLIENT_CONSULTATION_LIMITATIONS,data.limitations.areas) + (data.limitations.details ? " · " + data.limitations.details : "") : "No current limitations reported";
  out.innerHTML = [
    ["Client",data.identity.fullName + " · " + data.identity.email],["Fitness level",consultationLabel(CLIENT_CONSULTATION_FITNESS,data.fitnessLevel) + " · usual effort " + data.usualRpe + "/10"],
    ["Activity interests",consultationListLabels(CLIENT_CONSULTATION_INTERESTS,data.interests)],["Main goal",consultationLabel(CLIENT_CONSULTATION_GOALS,data.primaryGoal)],
    ["Secondary goals",consultationListLabels(CLIENT_CONSULTATION_GOALS,data.secondaryGoals)],["Limitations",limitations],
    ["Trainer support",consultationListLabels(CLIENT_CONSULTATION_SUPPORT,data.supportPriorities) + (data.supportOther ? " · " + data.supportOther : "")],
  ].map(([label,value]) => '<div class="consultation-review-row"><span>' + escapeHtml(label) + '</span><b>' + escapeHtml(value) + '</b></div>').join("");
}
function showConsultationStep(step) {
  clientConsultationStep = Math.max(1,Math.min(5,Number(step) || 1));
  document.querySelectorAll(".consultation-panel").forEach((panel) => panel.classList.toggle("active",Number(panel.dataset.consultationStep) === clientConsultationStep));
  const nav = byId("consultationStepNav");
  if (nav) nav.innerHTML = ["About you","Background","Goals","Support","Review"].map((label,index) => '<button type="button" class="' + (index + 1 === clientConsultationStep ? "on" : index + 1 < clientConsultationStep ? "done" : "") + '" onclick="goToConsultationStep(' + (index + 1) + ')"><i>' + (index + 1) + '</i><span>' + label + '</span></button>').join("");
  const fill = byId("consultationProgressFill"); if (fill) fill.style.width = (clientConsultationStep / 5 * 100) + "%";
  byId("consultationBackBtn").style.visibility = clientConsultationStep === 1 ? "hidden" : "visible";
  byId("consultationNextBtn").style.display = clientConsultationStep === 5 ? "none" : "inline-flex";
  byId("consultationSubmitBtn").style.display = clientConsultationStep === 5 ? "inline-flex" : "none";
  if (clientConsultationStep === 5) renderConsultationReview(readClientConsultationForm(activeClientProfile(),"draft"));
  consultationSetAlert("",false); window.scrollTo(0,0);
}
function goToConsultationStep(step) {
  if (step > clientConsultationStep) {
    const data = readClientConsultationForm(activeClientProfile(),"draft");
    for (let current = clientConsultationStep; current < step; current++) if (!validateConsultationStep(current,data)) return false;
  }
  showConsultationStep(step); return true;
}
function changeConsultationStep(delta) {
  const next = clientConsultationStep + Number(delta || 0), data = readClientConsultationForm(activeClientProfile(),"draft");
  if (delta > 0 && !validateConsultationStep(clientConsultationStep,data)) return false;
  showConsultationStep(next); return true;
}
function openClientConsultation(required) {
  if ((window.fit4lifeCloudRole || "") !== "client") { showToast("Only the signed-in client can edit consultation answers"); return false; }
  const profile = activeClientProfile(); if (!profile) { show("client-menu"); return false; }
  clientConsultationRequiredMode = Boolean(required) || !clientConsultationComplete(profile);
  populateClientConsultation(profile); show("client-consultation"); showConsultationStep(1);
  if (!isByuiEmail((window.fit4lifeCloudIdentity || {}).email || profile.email)) consultationSetAlert("Client accounts require a verified BYU-I email ending in @byui.edu. Sign out and contact Fit4Life to correct this account before continuing.",true);
  return true;
}

function normalizedConsultationExerciseText(value) { return String(value || "").toLowerCase().replace(/[^a-z0-9]+/g," ").trim(); }
function consultationExerciseMatches(text) {
  if (typeof LIBRARY === "undefined") return [];
  const answers = String(text || "").split(/[,;\n]+/).map(normalizedConsultationExerciseText).filter((item) => item && !/^(none|none yet|n\/a|na)$/.test(item));
  const matches = [];
  answers.forEach((answer) => {
    const exact = LIBRARY.find((exercise) => normalizedConsultationExerciseText(exercise.name) === answer);
    const candidates = exact ? [exact] : answer.length >= 4 ? LIBRARY.filter((exercise) => normalizedConsultationExerciseText(exercise.name).includes(answer) || answer.includes(normalizedConsultationExerciseText(exercise.name))) : [];
    if (candidates.length === 1) matches.push(exerciseId(candidates[0]));
  });
  return [...new Set(matches)];
}
function consultationTrainingStyle(data) {
  if (data.primaryGoal === "rehab") return "recovery";
  const interests = new Set(data.interests || []), resistance = ["strength","bodybuilding"].some((key) => interests.has(key)), cardio = ["running","swimming","aerobics","walking"].some((key) => interests.has(key));
  if (interests.has("sports") || interests.has("functional") || data.primaryGoal === "athletic") return "performance";
  if (resistance && cardio) return "mixed";
  if (resistance) return "resistance";
  if (cardio) return "cardio";
  return "auto";
}
function applyClientConsultationToProfile(profile,data) {
  const previousDerivedInjuries = [...(profile.consultationDerivedInjuries || [])], previousDerivedPreferences = [...(profile.consultationDerivedPreferenceIds || [])];
  const baseManual = [...new Set([...(profile.manualInjuries || profile.injuries || [])].filter((tag) => !previousDerivedInjuries.includes(tag)))];
  const derivedInjuries = data.limitations.hasLimitations === "yes" ? [...new Set(data.limitations.areas || [])] : [];
  const manualInjuries = [...new Set([...baseManual,...derivedInjuries])], injuries = [...new Set([...(profile.injuries || []).filter((tag) => !previousDerivedInjuries.includes(tag)),...manualInjuries])];
  const assessments = {...(profile.limitationAssessments || {})};
  previousDerivedInjuries.filter((tag) => !derivedInjuries.includes(tag)).forEach((tag) => { if (!baseManual.includes(tag)) delete assessments[tag]; });
  derivedInjuries.forEach((tag) => { assessments[tag] = normalizedLimitationAssessment(assessments[tag] || {severity:"moderate",ability:"modified",decision:"modified",note:"Client-reported in Trainer Consultation; trainer review required."}); });
  const preferences = {...(profile.exercisePreferences || {})}; previousDerivedPreferences.forEach((id) => delete preferences[id]);
  const favoriteIds = consultationExerciseMatches(data.favoriteExercises), dislikeIds = consultationExerciseMatches(data.leastFavoriteExercises), unfamiliarIds = consultationExerciseMatches(data.unfamiliarExercises);
  favoriteIds.forEach((id) => { preferences[id] = "favorite"; }); dislikeIds.forEach((id) => { preferences[id] = "dislike"; }); unfamiliarIds.forEach((id) => { preferences[id] = "unfamiliar"; });
  const goalIds = [data.primaryGoal,...(data.secondaryGoals || [])].map((goal) => CLIENT_CONSULTATION_GOAL_MAP[goal]).filter(Boolean), goals = [...new Set(goalIds)].slice(0,2);
  return {
    ...profile,consultation:data,email:data.identity.email || profile.email || "",phone:data.identity.phone || "",contactPhone:data.identity.phone || "",age:Number(data.identity.age) || Number(profile.age) || 30,
    experience:{beginner:1,intermediate:2,advanced:3}[data.fitnessLevel] || Number(profile.experience) || 1,goals:goals.length ? goals : profile.goals || ["general"],trainingStyle:consultationTrainingStyle(data),
    pastPhysicalActivities:data.pastActivities,fitnessInterests:[...(data.interests || [])],usualTrainingRpe:Number(data.usualRpe) || 5,coachingPriorities:[...(data.supportPriorities || [])],coachingPreferenceNote:data.supportOther || "",
    favoriteExerciseNotes:data.favoriteExercises,leastFavoriteExerciseNotes:data.leastFavoriteExercises,unfamiliarMovements:data.unfamiliarExercises,
    consultationDerivedInjuries:derivedInjuries,manualInjuries,injuries,limitationAssessments:assessments,consultationLimitationDetails:data.limitations.details || "",
    consultationDerivedPreferenceIds:[...new Set([...favoriteIds,...dislikeIds,...unfamiliarIds])],exercisePreferences:preferences,
    limitationReviewRequired:derivedInjuries.length > 0 || Boolean(data.limitations.details),updatedAt:data.updatedAt || new Date().toISOString(),
  };
}
async function persistClientConsultation(status) {
  const profile = activeClientProfile(); if (!profile) return false;
  const effectiveStatus = status === "draft" && clientConsultationComplete(profile) ? "submitted" : status;
  const data = readClientConsultationForm(profile,effectiveStatus);
  delete data.draft;
  data.pendingEdits = status === "draft" && clientConsultationComplete(profile);
  if (status === "submitted") {
    for (let step = 1; step <= 5; step++) if (!validateConsultationStep(step,data)) { showConsultationStep(step); return false; }
    data.status = "submitted"; data.pendingEdits = false; delete data.syncPending; data.submittedAt = data.updatedAt; data.lastClientSubmittedAt = data.updatedAt; data.revision = profile.consultation && profile.consultation.status === "pending_sync" ? Math.max(1,Number(profile.consultation.revision || 1)) : Number(profile.consultation && profile.consultation.revision || 0) + 1; data.reviewedAt = null; data.reviewedBy = "";
  }
  const profiles = loadProfiles(), index = profiles.findIndex((item) => item.id === profile.id); if (index < 0) return false;
  profiles[index] = status === "submitted" ? applyClientConsultationToProfile(profiles[index],data) : clientConsultationComplete(profiles[index]) ? {...profiles[index],consultation:{...profiles[index].consultation,draft:data,pendingEdits:true,updatedAt:data.updatedAt},updatedAt:data.updatedAt} : {...profiles[index],consultation:data,updatedAt:data.updatedAt};
  if (!writeProfiles(profiles)) { consultationSetAlert("This browser could not save the consultation. Try again before leaving this page.",true); return false; }
  if (status !== "submitted") { consultationSetAlert("Draft saved on this device. It will continue syncing when your account is online.",false); if (typeof window.fit4lifeCloudSaveProfileNow === "function") window.fit4lifeCloudSaveProfileNow(); return true; }
  consultationSetAlert("Saving your consultation securely…",false); byId("consultationSubmitBtn").disabled = true;
  const cloudSaved = typeof window.fit4lifeCloudSaveProfileNow === "function" ? await window.fit4lifeCloudSaveProfileNow() : false;
  byId("consultationSubmitBtn").disabled = false;
  if (!cloudSaved) {
    const pendingProfiles = loadProfiles(), pendingIndex = pendingProfiles.findIndex((item) => item.id === profile.id);
    if (pendingIndex >= 0) { const pendingAt = new Date().toISOString(); pendingProfiles[pendingIndex] = {...pendingProfiles[pendingIndex],consultation:{...pendingProfiles[pendingIndex].consultation,status:"pending_sync",syncPending:true,updatedAt:pendingAt},updatedAt:pendingAt}; writeProfiles(pendingProfiles); }
    consultationSetAlert("Your answers are saved on this device, but they have not reached the shared Fit4Life record yet. Check your connection and press Submit consultation again.",true); return false;
  }
  clientConsultationRequiredMode = false; showToast("Trainer Consultation submitted"); openClientTab("home"); return true;
}
function saveClientConsultationDraft() { return persistClientConsultation("draft"); }
function submitClientConsultation() { return persistClientConsultation("submitted"); }
async function saveClientConsultationAndSignOut() {
  const saved = await persistClientConsultation("draft"); if (!saved) return false;
  if (typeof window.fit4lifeCloudSaveProfileNow === "function") await window.fit4lifeCloudSaveProfileNow();
  if (typeof window.fit4lifeCloudSignOut === "function") await window.fit4lifeCloudSignOut();
  return true;
}

function clientConsultationStatusLabel(profile) {
  if (!clientConsultationComplete(profile)) return "Required setup not submitted";
  const data = profile.consultation;
  return data.reviewedAt && new Date(data.reviewedAt) >= new Date(data.lastClientSubmittedAt || data.submittedAt) ? "Reviewed by coaching team" : "Submitted · trainer review pending";
}
function clientConsultationClientCardHtml(profile,trainerPreview) {
  if (!profile) return "";
  const data = profile.consultation || {}, label = clientConsultationStatusLabel(profile), goal = consultationLabel(CLIENT_CONSULTATION_GOALS,data.primaryGoal);
  return '<section class="client-card wide"><div class="client-section-label">Trainer Consultation</div><div class="client-action-row"><span><b>' + escapeHtml(label) + '</b><span>' + escapeHtml(goal) + ' · ' + escapeHtml(consultationLabel(CLIENT_CONSULTATION_FITNESS,data.fitnessLevel)) + '. These answers shape goals, experience, exercise preferences, coaching support, and limitation filters.</span></span>' + (trainerPreview ? '' : '<button class="small-btn" onclick="openClientConsultation(false)">Review or update</button>') + '</div></section>';
}
function consultationAnswerRows(profile) {
  const data = profile && profile.consultation || {}, limitations = data.limitations || {};
  return [
    ["BYU-I email",data.identity && data.identity.email || profile && profile.email || "Not recorded"],["Phone",data.identity && data.identity.phone || profile && profile.phone || "Not recorded"],
    ["Fitness level",consultationLabel(CLIENT_CONSULTATION_FITNESS,data.fitnessLevel)],["Past activity",data.pastActivities || "Not recorded"],["Usual effort",data.usualRpe ? data.usualRpe + "/10 · " + consultationRpeLabel(data.usualRpe) : "Not recorded"],
    ["Exercise interests",consultationListLabels(CLIENT_CONSULTATION_INTERESTS,data.interests)],["Primary goal",consultationLabel(CLIENT_CONSULTATION_GOALS,data.primaryGoal)],["Secondary goals",consultationListLabels(CLIENT_CONSULTATION_GOALS,data.secondaryGoals)],
    ["Favorite exercises",data.favoriteExercises || "None recorded"],["Least favorite exercises",data.leastFavoriteExercises || "None recorded"],["Unfamiliar exercises",data.unfamiliarExercises || "None recorded"],
    ["Limitations",limitations.hasLimitations === "yes" ? consultationListLabels(CLIENT_CONSULTATION_LIMITATIONS,limitations.areas) + (limitations.details ? " · " + limitations.details : "") : "No current limitations reported"],
    ["Requested trainer support",consultationListLabels(CLIENT_CONSULTATION_SUPPORT,data.supportPriorities) + (data.supportOther ? " · " + data.supportOther : "")],
  ];
}
function trainerConsultationSummaryHtml(profile) {
  if (!profile) return "";
  if (!clientConsultationComplete(profile)) return '<section class="analysis-panel consultation-summary-card"><div class="analysis-panel-head"><div><h4 class="analysis-section-title">Trainer Consultation</h4><p>The client has not submitted the required consultation yet.</p></div><span class="loop-status warn">Waiting</span></div></section>';
  const data = profile.consultation, pending = !data.reviewedAt || new Date(data.reviewedAt) < new Date(data.lastClientSubmittedAt || data.submittedAt), limitations = data.limitations && data.limitations.hasLimitations === "yes";
  return '<section class="analysis-panel consultation-summary-card ' + (limitations && pending ? 'needs-safety-review' : '') + '"><div class="analysis-panel-head"><div><h4 class="analysis-section-title">Trainer Consultation</h4><p>Submitted ' + new Date(data.lastClientSubmittedAt || data.submittedAt).toLocaleString() + ' · revision ' + Number(data.revision || 1) + '</p></div><button class="small-btn ' + (pending ? 'primary' : '') + '" onclick="openTrainerConsultationReview(\'' + escapeHtml(profile.id) + '\')">' + (pending ? 'Review answers' : 'Open answers') + '</button></div><div class="client-fact-grid">'
    + [["Goal",consultationLabel(CLIENT_CONSULTATION_GOALS,data.primaryGoal)],["Experience",consultationLabel(CLIENT_CONSULTATION_FITNESS,data.fitnessLevel)],["Usual effort",data.usualRpe + "/10"],["Limitations",limitations ? consultationListLabels(CLIENT_CONSULTATION_LIMITATIONS,data.limitations.areas) : "None reported"]].map(([label,value]) => '<div class="client-fact"><span>' + escapeHtml(label) + '</span><b>' + escapeHtml(value) + '</b></div>').join("") + '</div></section>';
}
function openTrainerConsultationReview(profileId) {
  if (!["owner","trainer"].includes(window.fit4lifeCloudRole || "")) { showToast("Trainer access is required"); return false; }
  const profile = loadProfiles().find((item) => item.id === profileId); if (!profile || !clientConsultationComplete(profile)) { showToast("No submitted consultation is available"); return false; }
  trainerConsultationProfileId = profile.id; byId("trainerConsultationTitle").textContent = "Review " + profile.name;
  byId("trainerConsultationContent").innerHTML = '<div class="trainer-consultation-status"><b>' + escapeHtml(clientConsultationStatusLabel(profile)) + '</b><span>Client answers remain preserved exactly as submitted. Normalized goals, experience, preferences, and conservative limitation filters are already attached to the profile.</span></div><div class="consultation-review">' + consultationAnswerRows(profile).map(([label,value]) => '<div class="consultation-review-row"><span>' + escapeHtml(label) + '</span><b>' + escapeHtml(value) + '</b></div>').join("") + '</div>';
  const reviewed = profile.consultation.reviewedAt && new Date(profile.consultation.reviewedAt) >= new Date(profile.consultation.lastClientSubmittedAt || profile.consultation.submittedAt); byId("trainerConsultationReviewBtn").disabled = Boolean(reviewed); byId("trainerConsultationReviewBtn").textContent = reviewed ? "Reviewed" : "Mark reviewed";
  byId("trainerConsultationModal").classList.add("open"); return true;
}
function closeTrainerConsultationReview() { byId("trainerConsultationModal").classList.remove("open"); trainerConsultationProfileId = ""; }
async function markTrainerConsultationReviewed() {
  const profiles = loadProfiles(), index = profiles.findIndex((profile) => profile.id === trainerConsultationProfileId); if (index < 0) return false;
  const now = new Date().toISOString(), identity = currentAccountIdentity(); profiles[index] = {...profiles[index],consultation:{...profiles[index].consultation,reviewedAt:now,reviewedBy:identity.displayName || identity.email || "Fit4Life trainer",updatedAt:now},limitationReviewRequired:false,updatedAt:now};
  if (!writeProfiles(profiles)) return false;
  const cloudSaved = typeof window.fit4lifeCloudSaveProfileNow === "function" ? await window.fit4lifeCloudSaveProfileNow() : false;
  closeTrainerConsultationReview(); if (typeof renderTrainerHub === "function") renderTrainerHub(profiles[index].name); if (typeof renderTrainerAttention === "function") renderTrainerAttention();
  showToast(cloudSaved ? "Consultation marked reviewed" : "Review saved on this device; waiting to sync"); return true;
}
function openTrainerConsultationLimitations() {
  const id = trainerConsultationProfileId; closeTrainerConsultationReview(); if (id) openProfileEditor(id);
}
