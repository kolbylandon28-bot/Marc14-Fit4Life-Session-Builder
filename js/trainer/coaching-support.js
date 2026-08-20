/* ---------- Connected coaching support ---------- */
const CHECKINS_KEY = "fit4life_checkins_v1";
const ATHLETE_METRICS_KEY = "fit4life_athlete_metrics_v1";
const GYM_BRAND_KEY = "fit4life_gym_brand_v1";
const GYM_EQUIPMENT_KEY = "fit4life_gym_equipment_v1";
let portalThemeSaveInFlight = false;
const TEAMS_KEY = "fit4life_teams_v1";
const MENTAL_PLANS_KEY = "fit4life_mental_plans_v1";
const MARKET_PROGRAMS_KEY = "fit4life_market_programs_v1";
const WEARABLE_CONNECTIONS_KEY = "fit4life_wearable_connections_v1";
const AUTOMATIONS_KEY = "fit4life_automations_v1";
const AUTOMATION_ALERTS_KEY = "fit4life_automation_alerts_v1";
function loadLocalArray(key) { try { const data = JSON.parse(localStorage.getItem(key) || "[]"); return Array.isArray(data) ? data : []; } catch (_) { return []; } }
function writeLocalArray(key,items,limit) { try { localStorage.setItem(key,JSON.stringify((items || []).slice(0,limit || 1000))); return true; } catch (_) { showToast("This browser could not save that coaching record"); return false; } }
function loadLocalObject(key,fallback) { try { const data = JSON.parse(localStorage.getItem(key) || "null"); return data && typeof data === "object" && !Array.isArray(data) ? data : (fallback || {}); } catch (_) { return fallback || {}; } }
function writeLocalObject(key,value) { try { localStorage.setItem(key,JSON.stringify(value || {})); return true; } catch (_) { showToast("This browser could not save those settings"); return false; } }
function loadCheckIns() { return loadLocalArray(CHECKINS_KEY); }
function writeCheckIns(items) { return writeLocalArray(CHECKINS_KEY,items,1000); }
function checkInsForProfile(profileId) { return loadCheckIns().filter((item) => item.profileId === profileId).sort((a,b) => String(b.createdAt || b.date).localeCompare(String(a.createdAt || a.date))); }
function loadAthleteMetrics() { return loadLocalArray(ATHLETE_METRICS_KEY); }
function writeAthleteMetrics(items) { return writeLocalArray(ATHLETE_METRICS_KEY,items,2000); }
function athleteMetricsForProfile(profileId) { return loadAthleteMetrics().filter((item) => item.profileId === profileId).sort((a,b) => String(b.date).localeCompare(String(a.date))); }
function loadTeams() { return loadLocalArray(TEAMS_KEY); }
function loadMentalPlans() { return loadLocalArray(MENTAL_PLANS_KEY); }
function loadMarketPrograms() { return loadLocalArray(MARKET_PROGRAMS_KEY); }
function loadAutomations() { return loadLocalArray(AUTOMATIONS_KEY); }
function loadAutomationAlerts() { return loadLocalArray(AUTOMATION_ALERTS_KEY); }

let selectedCheckInProfileId = "";
let selectedCheckInReviewType = "weekly";
let selectedRecoveryAssignmentId = "";
function setClientCheckInMode() {
  const recovery = selectedCheckInReviewType === "recovery_24_48";
  document.querySelectorAll(".weekly-checkin-field").forEach((field) => field.classList.toggle("checkin-field-hidden",recovery));
  const recoveryFields = byId("checkInRecoveryFields"); if (recoveryFields) recoveryFields.classList.toggle("show",recovery);
  if (byId("checkInPageQuestion")) byId("checkInPageQuestion").textContent = recovery ? "How did your body respond?" : "How is training going?";
  if (byId("checkInPageTitle")) byId("checkInPageTitle").textContent = recovery ? "24–48h Recovery Pulse" : "Weekly Check-in";
  if (byId("checkInPageCopy")) byId("checkInPageCopy").textContent = recovery ? "A quick follow-up after training—not another assessment. Four taps help your trainer catch recovery or pain concerns early." : "Share the information your trainer needs to adjust the plan. Your answers stay connected to your secure profile.";
  if (byId("checkInPainLabel")) byId("checkInPainLabel").textContent = recovery ? "Pain or discomfort since the workout" : "Pain this week";
  if (byId("checkInSubmitBtn")) byId("checkInSubmitBtn").textContent = recovery ? "Send recovery pulse" : "Send weekly check-in";
}
function openClientCheckIn(reviewType,assignmentId) {
  // Recovery pulse retired: any request for one falls back to the weekly check-in.
  selectedCheckInReviewType = reviewType === "starter_week_1" ? reviewType : "weekly";
  selectedRecoveryAssignmentId = selectedCheckInReviewType === "recovery_24_48" ? String(assignmentId || "") : "";
  portalRole = "client"; show("checkin"); selectedCheckInProfileId = ""; byId("checkInLookup").value = ""; byId("checkInProfileId").value = ""; byId("checkInLookupResults").innerHTML = ""; byId("checkInForm").classList.remove("show"); byId("checkInConfirmation").style.display = "none";
  setClientCheckInMode();
  byId("checkInPain").value = "0"; fillSelectOptions(byId("checkInPainArea"),painLocationOptions(true),""); byId("checkInPainMovement").value = "no"; updateCheckInPainFields();
  if (byId("checkInRecovery")) byId("checkInRecovery").value = "4";
  if (byId("checkInRecoverySoreness")) byId("checkInRecoverySoreness").value = "2";
  if (byId("checkInNextReadiness")) byId("checkInNextReadiness").value = "yes";
  if (byId("checkInPainTrend")) byId("checkInPainTrend").value = "none";
  if (byId("checkInRecoveryNote")) byId("checkInRecoveryNote").value = "";
  setTimeout(() => byId("checkInLookup").focus(),20);
}
function updateCheckInPainFields() {
  const hasPain = Number(byId("checkInPain") && byId("checkInPain").value || 0) > 0;
  ["checkInPainAreaField","checkInPainMovementField"].forEach((id) => { const field = byId(id); if (field) field.hidden = !hasPain; });
  if (hasPain && byId("checkInPainArea") && !byId("checkInPainArea").options.length) fillSelectOptions(byId("checkInPainArea"),painLocationOptions(true),"");
  if (!hasPain) { if (byId("checkInPainArea")) byId("checkInPainArea").value = ""; if (byId("checkInPainMovement")) byId("checkInPainMovement").value = "no"; }
}
function syncCheckInPainLevel() {
  if (byId("checkInPainMovement").value === "yes" && Number(byId("checkInPain").value) < 2) byId("checkInPain").value = "2";
  updateCheckInPainFields();
}
function renderCheckInLookup() {
  const query = byId("checkInLookup").value.trim(), out = byId("checkInLookupResults"); out.innerHTML = ""; if (query.length < 2) return [];
  const matches = findProfilesByLookup(query); matches.forEach((profile) => { const button = el("button","profile-result"); button.type = "button"; button.append(el("strong","",profile.name),el("span","","@" + profileUsername(profile))); button.onclick = () => selectCheckInProfile(profile.id); out.appendChild(button); });
  if (!matches.length) out.innerHTML = '<div class="lookup-note">No matching saved profile. Ask a trainer to approve or create your profile before submitting a check-in.</div>'; return matches;
}
function selectCheckInProfile(profileId) {
  const profile = loadProfiles().find((item) => item.id === profileId); if (!profile) return null;
  const starter = selectedCheckInReviewType === "starter_week_1", recovery = selectedCheckInReviewType === "recovery_24_48", starterFields = byId("checkInStarterFields");
  if (recovery && !selectedRecoveryAssignmentId) {
    const status = recoveryFollowUpStatus(profile);
    if (status.active) selectedRecoveryAssignmentId = status.assignment.id;
  }
  selectedCheckInProfileId = profile.id; byId("checkInProfileId").value = profile.id; byId("checkInLookup").value = profile.name; byId("checkInLookupResults").innerHTML = "";
  byId("checkInClientTitle").textContent = profile.name + (recovery ? " · Recovery pulse" : starter ? " · Week 1 starter review" : " · Weekly check-in");
  byId("checkInFormIntro").textContent = recovery ? "This should take less than one minute. Your trainer will receive it in the review queue." : starter ? "Look back at your first week. Your answers help the coach make small, useful adjustments while keeping the routine familiar." : "Use the last seven days. There are no perfect answers—accuracy helps the trainer.";
  if (starterFields) starterFields.classList.toggle("show",starter);
  byId("checkInForm").classList.add("show"); byId("checkInConfirmation").style.display = "none"; return profile;
}
function saveClientCheckIn() {
  const profile = loadProfiles().find((item) => item.id === byId("checkInProfileId").value); if (!profile) { showToast("Find your saved profile first"); return null; }
  const starter = selectedCheckInReviewType === "starter_week_1", recovery = selectedCheckInReviewType === "recovery_24_48", program = starter ? savedProgramFor(profile) : null;
  const recoveryAssignment = recovery ? assignmentsForClient(profile.id).find((item) => item.id === selectedRecoveryAssignmentId) : null;
  if (recovery && !recoveryAssignment) { showToast("This recovery follow-up is no longer connected to a completed workout"); return null; }
  if (recovery && recoveryFollowUpsForProfile(profile.id).some((item) => item.assignmentId === recoveryAssignment.id)) { showToast("This recovery pulse was already sent"); openClientTab("home"); return null; }
  const movementChanged = byId("checkInPainMovement") && byId("checkInPainMovement").value === "yes";
  if (movementChanged && Number(byId("checkInPain").value) < 2) byId("checkInPain").value = "2";
  const pain = Number(byId("checkInPain").value), painArea = byId("checkInPainArea") && byId("checkInPainArea").value || "";
  if (pain > 0 && !painArea) { showToast("Choose where you felt the pain or discomfort"); byId("checkInPainArea").focus(); return null; }
  const recoveryNote = recovery ? byId("checkInRecoveryNote").value.trim() : "";
  const record = { id:"checkin-" + Date.now() + "-" + Math.random().toString(16).slice(2), profileId:profile.id, client:profile.name, date:new Date().toISOString().slice(0,10), createdAt:new Date().toISOString(), reviewType:selectedCheckInReviewType, assignmentId:recoveryAssignment && recoveryAssignment.id || "", sessionId:recoveryAssignment && assignmentSessionIds(recoveryAssignment)[0] || "", completedAt:recoveryAssignment && recoveryAssignment.completedAt || "", programId:program && program.id || recoveryAssignment && recoveryAssignment.programId || "", programWeek:starter ? 1 : recoveryAssignment && recoveryAssignment.programWeek || null, adherence:recovery ? null : Number(byId("checkInAdherence").value), sleep:recovery ? null : Number(byId("checkInSleep").value), stress:recovery ? null : Number(byId("checkInStress").value), soreness:recovery ? Number(byId("checkInRecoverySoreness").value) : Number(byId("checkInSoreness").value), energy:recovery ? Number(byId("checkInRecovery").value) : Number(byId("checkInEnergy").value), recovery:recovery ? Number(byId("checkInRecovery").value) : null, nextSessionReadiness:recovery ? byId("checkInNextReadiness").value : "", painTrend:recovery ? byId("checkInPainTrend").value : "", confidence:recovery ? null : Number(byId("checkInConfidence").value), motivation:recovery ? null : Number(byId("checkInMotivation").value), pain, painLevel:normalizePainLevel(pain,movementChanged), painArea, movementChanged, workoutFit:starter ? byId("checkInWorkoutFit").value : "", exerciseClarity:starter ? byId("checkInExerciseClarity").value : "", sessionFit:starter ? byId("checkInSessionFit").value : "", win:recovery ? "" : byId("checkInWin").value.trim(), challenge:recovery ? recoveryNote : byId("checkInChallenge").value.trim(), schedule:recovery ? "" : byId("checkInSchedule").value.trim(), note:recoveryNote, question:recovery ? "" : byId("checkInQuestion").value.trim(), reviewedAt:"", reviewedBy:"", trainerReply:"" };
  const items = loadCheckIns(); items.unshift(record); if (!writeCheckIns(items)) return null; runAutomations(false);
  const confirmation = byId("checkInConfirmation"); confirmation.style.display = "block"; confirmation.textContent = recovery ? "Recovery pulse sent to " + (profile.assignedTrainerName || "your coaching team") + " for review. You can return home now." : starter ? "Week 1 review sent. Your trainer can now compare workout fit, exercise clarity, session length, recovery, pain, and confidence before Week 2." : "Check-in sent. Your trainer will see your adherence, recovery, confidence, motivation, pain report, and questions in the coaching studio.";
  renderTrainerAttention();
  showToast(recovery ? "Recovery pulse sent to your trainer" : starter ? "Week 1 review sent to the trainer" : "Weekly check-in sent to the trainer");
  if (recovery) setTimeout(() => openClientTab("home"),650);
  return record;
}

const ADVANCED_TABS = [
  ["review","Client coaching review"],
  ["monitoring","Monitoring & imports"],
  ["templates","Program templates"],
  ["organization","Team & gym setup"],
  ["alerts","Alerts & rules"],
];
const ADVANCED_TAB_ALIASES = {
  assist:"review",workload:"review",mental:"review",
  athlete:"monitoring",wearables:"monitoring",
  market:"templates",brand:"organization",teams:"organization",
  automations:"alerts",
};
let advancedState = { tab:"review", profileId:"" };
let currentAiCoachDraft = null;
function normalizedAdvancedTab(tab) { return ADVANCED_TAB_ALIASES[tab] || tab || "review"; }
function openAdvancedStudio(tab,profileId) {
  if (!trainerIsUnlocked()) { requestTrainerAccess("advanced"); return; }
  advancedState.tab = normalizedAdvancedTab(tab || advancedState.tab);
  if (profileId) advancedState.profileId = profileId;
  portalRole = "trainer"; show("advanced"); renderAdvancedStudio();
}
function openAdvancedForClient(profileId,tab) { openAdvancedStudio(tab || "review",profileId); }
function selectedAdvancedProfile() { return loadProfiles().find((item) => item.id === advancedState.profileId) || null; }
function selectAdvancedClient(profileId) { advancedState.profileId = profileId; currentAiCoachDraft = null; renderAdvancedStudio(); }
function setAdvancedTab(tab) { advancedState.tab = normalizedAdvancedTab(tab); renderAdvancedStudio(); }
function renderAdvancedStudio() {
  if (!trainerIsUnlocked()) return false;
  advancedState.tab = normalizedAdvancedTab(advancedState.tab);
  const profiles = loadProfiles(); if (!advancedState.profileId || !profiles.some((item) => item.id === advancedState.profileId)) advancedState.profileId = profiles[0] && profiles[0].id || "";
  const select = byId("advancedClient"); select.innerHTML = profiles.length ? profiles.map((profile) => '<option value="' + escapeHtml(profile.id) + '"' + (profile.id === advancedState.profileId ? ' selected' : '') + '>' + escapeHtml(profile.name) + ' · @' + escapeHtml(profileUsername(profile)) + '</option>').join("") : '<option value="">No saved clients yet</option>';
  byId("advancedNav").innerHTML = ADVANCED_TABS.map(([key,label]) => '<button class="' + (advancedState.tab === key ? 'on' : '') + '" onclick="setAdvancedTab(\'' + key + '\')">' + label + '</button>').join("");
  const clientContext = ["review","monitoring"].includes(advancedState.tab), clientBar = byId("advancedClientBar");
  if (clientBar) clientBar.style.display = clientContext ? "" : "none";
  const renderers = { review:renderClientCoachingModule, monitoring:renderMonitoringModule, templates:renderMarketplaceModule, organization:renderOrganizationModule, alerts:renderAutomationsModule };
  byId("advancedContent").innerHTML = (renderers[advancedState.tab] || renderClientCoachingModule)(); return true;
}
function numberAverage(items,key) { const values = items.map((item) => Number(item[key])).filter(Number.isFinite); return values.length ? values.reduce((a,b) => a+b,0) / values.length : null; }
function checkInCoachSummary(profile) {
  const items = profile ? weeklyCheckInsForProfile(profile.id).slice(0,4) : []; if (!items.length) return { headline:"No weekly check-in yet", copy:"Ask the client to complete the weekly check-in so recovery, adherence, motivation, and barriers can inform the next plan.", action:"repeat", risk:"mid" };
  const latest = items[0], adherence = numberAverage(items,"adherence"), stress = numberAverage(items,"stress"), energy = numberAverage(items,"energy"), confidence = numberAverage(items,"confidence"), pain = Math.max(...items.map((item) => Number(item.pain) || 0));
  let headline = "Training is broadly on track", action = "repeat", risk = "low";
  if (pain >= 2) { headline = "Pain changed training"; action = "pain_swap"; risk = "high"; }
  else if ((adherence != null && adherence < 50) || (stress != null && stress >= 4) || (energy != null && energy <= 2)) { headline = "Recovery or adherence needs adjustment"; action = "reduce"; risk = "mid"; }
  else if (adherence >= 75 && stress <= 3 && energy >= 3 && confidence >= 3.5) { headline = "Ready for a small progression"; action = "progress"; }
  const starterFit = latest.reviewType === "starter_week_1" ? " Starter fit: difficulty " + String(latest.workoutFit || "not entered").replace(/_/g," ") + ", exercise clarity " + String(latest.exerciseClarity || "not entered").replace(/_/g," ") + ", session length " + String(latest.sessionFit || "not entered").replace(/_/g," ") + "." : "";
  const copy = "Last 4 check-ins: " + Math.round(adherence == null ? 0 : adherence) + "% adherence · stress " + (stress == null ? "—" : stress.toFixed(1)) + "/5 · energy " + (energy == null ? "—" : energy.toFixed(1)) + "/5 · confidence " + (confidence == null ? "—" : confidence.toFixed(1)) + "/5." + starterFit + (latest.challenge ? " Current barrier: " + latest.challenge : "") + (latest.schedule ? " Schedule note: " + latest.schedule : "") + (latest.question ? " Client question: " + latest.question : "");
  return { headline,copy,action,risk,latest,adherence,stress,energy,confidence,pain };
}
function workloadSnapshot(profile) {
  if (!profile) return { acute:0,chronic:0,ratio:0,plateaus:[],volumeEntries:0,risk:"No client selected" };
  const now = Date.now(), metrics = athleteMetricsForProfile(profile.id), progress = trainerEntriesFor(profile.name).filter((entry) => entry.type === "set" && entry.data), loadRecords = metrics.map((item) => ({ date:item.date,load:Number(item.load) || (Number(item.sessionRpe) || 0) * (Number(item.minutes) || 0) }));
  const sumWindow = (days) => loadRecords.filter((item) => now - new Date(item.date + "T12:00:00").getTime() <= days * 86400000).reduce((sum,item) => sum + item.load,0), acute = sumWindow(7), chronic = sumWindow(28) / 4, ratio = chronic > 0 ? acute / chronic : 0;
  const grouped = new Map(); progress.forEach((entry) => { if (!grouped.has(entry.label)) grouped.set(entry.label,[]); grouped.get(entry.label).push(entry); });
  const plateaus = [];
  grouped.forEach((entries,label) => { const sessions = []; entries.forEach((entry) => { if (!entry.data || sessions.some((item) => item.sessionId === entry.sessionId)) return; const estimate = estimatedOneRm(entry.data); if (estimate != null) sessions.push({ sessionId:entry.sessionId,estimate,date:entry.date }); }); if (sessions.length >= 3) { const recent = sessions.slice(0,3).map((item) => item.estimate), spread = (Math.max(...recent) - Math.min(...recent)) / Math.max(...recent); if (spread < .02) plateaus.push(label); } });
  const risk = ratio > 1.5 ? "Large workload spike" : ratio > 1.25 ? "Workload rising quickly" : ratio > 0 && ratio < .65 ? "Workload well below recent average" : ratio ? "Workload near recent average" : "Needs monitoring data";
  return { acute,chronic,ratio,plateaus,volumeEntries:progress.length,risk };
}
function renderAiAssistModule() {
  const profile = selectedAdvancedProfile(), summary = checkInCoachSummary(profile), workload = workloadSnapshot(profile), latestReview = profile && profile.lastReview;
  return '<div class="advanced-grid"><section class="advanced-card wide"><h3>AI-assisted programming</h3><p>Combines client goals, the last workout, weekly check-ins, pain flags, workload, and plateaus into a coach-reviewable next-session brief.</p><div class="advanced-stat-grid"><div class="advanced-stat"><b>' + (profile ? escapeHtml((profile.goals || []).map((g) => GOALS[g] ? GOALS[g].label : g).join(" + ")) : '—') + '</b><span>goal context</span></div><div class="advanced-stat"><b class="risk-' + summary.risk + '">' + escapeHtml(summary.headline) + '</b><span>check-in signal</span></div><div class="advanced-stat"><b>' + workload.plateaus.length + '</b><span>plateau flags</span></div><div class="advanced-stat"><b>' + (latestReview ? latestReview.difficulty + '/10' : '—') + '</b><span>last difficulty</span></div></div><div class="tool-actions"><button class="small-btn primary" onclick="generateAiCoachDraft()">Generate coach draft</button><button class="small-btn" onclick="approveAiCoachDraft()"' + (currentAiCoachDraft ? '' : ' disabled') + '>Coach approve &amp; open builder</button></div><div id="aiCoachDraft" class="advanced-output">' + (currentAiCoachDraft ? escapeHtml(currentAiCoachDraft.text) : 'No draft yet. The trainer remains responsible for reviewing every recommendation before it affects a workout.') + '</div><div class="capability-note">This local prototype uses transparent coaching rules. Production generative AI requires a secure server-side model connection, consent, audit history, and coach approval—never an API key stored in this page.</div></section><section class="advanced-card"><h3>AI check-in summary</h3><p>' + escapeHtml(summary.copy) + '</p><div class="advanced-output"><strong>' + escapeHtml(summary.headline) + '</strong>\nRecommended coach decision: ' + escapeHtml(summary.action.replace("pain_swap","replace painful pattern")) + '</div></section><section class="advanced-card"><h3>Latest client voice</h3><p>Wins, barriers, schedule changes, and questions stay visible—not hidden behind a score.</p>' + (summary.latest ? '<div class="advanced-list"><div class="advanced-list-item"><b>Win</b><span>' + escapeHtml(summary.latest.win || 'Not entered') + '</span></div><div class="advanced-list-item"><b>Barrier</b><span>' + escapeHtml(summary.latest.challenge || 'Not entered') + '</span></div><div class="advanced-list-item"><b>Question</b><span>' + escapeHtml(summary.latest.question || 'No question') + '</span></div></div>' : '<div class="empty-state">No client check-in yet.</div>') + '</section></div>';
}
function openAdvancedClientRecord(profileId,tab) {
  const profile = loadProfiles().find((item) => item.id === profileId); if (!profile) return false;
  selectedTrainerClient = profile.name; selectedInBodyScanId = ""; trainerSummaryState = newTrainerSummaryState(); trainerSummaryState.tab = tab || "overview";
  show("trainer"); renderTrainerHub(profile.name); return true;
}
function renderClientCoachingModule() {
  const profile = selectedAdvancedProfile();
  if (!profile) return '<div class="empty-state">Create or select a client before opening the coaching review.</div>';
  const summary = checkInCoachSummary(profile), workload = workloadSnapshot(profile), latestReview = profile.lastReview || null, plan = mentalPlanFor(profile.id), monitoringCount = athleteMetricsForProfile(profile.id).length;
  const workloadEvidence = workload.volumeEntries || monitoringCount
    ? Math.round(workload.acute) + ' seven-day load · ' + Math.round(workload.chronic) + ' recent weekly baseline · ' + workload.plateaus.length + ' plateau flag' + (workload.plateaus.length === 1 ? '' : 's')
    : 'No comparable workload data yet. Logged sets and monitoring records will build this evidence automatically.';
  return '<div class="advanced-grid">'
    + '<section class="advanced-card wide"><h3>Client coaching review</h3><p>One decision screen for the evidence already collected elsewhere: assigned workouts, set logs, weekly check-ins, pain reports, and optional monitoring.</p>'
    + '<div class="advanced-stat-grid"><div class="advanced-stat"><b>' + escapeHtml((profile.goals || []).map((g) => GOALS[g] ? GOALS[g].label : g).join(" + ") || "Not set") + '</b><span>goal context</span></div><div class="advanced-stat"><b class="risk-' + summary.risk + '">' + escapeHtml(summary.headline) + '</b><span>check-in signal</span></div><div class="advanced-stat"><b>' + workload.plateaus.length + '</b><span>plateau flags</span></div><div class="advanced-stat"><b>' + (latestReview ? latestReview.difficulty + '/10' : '—') + '</b><span>last difficulty</span></div></div>'
    + '<div class="tool-actions"><button class="small-btn primary" onclick="generateAiCoachDraft()">Build decision brief</button><button class="small-btn" onclick="approveAiCoachDraft()"' + (currentAiCoachDraft ? '' : ' disabled') + '>Approve brief &amp; open builder</button><button class="small-btn" onclick="openAdvancedClientRecord(\'' + escapeHtml(profile.id) + '\',\'overview\')">Open full client record</button></div>'
    + '<div id="aiCoachDraft" class="advanced-output">' + (currentAiCoachDraft ? escapeHtml(currentAiCoachDraft.text) : 'No decision brief yet. Building a brief does not mark the client’s check-in reviewed or change a workout. Only trainer approval saves the decision and opens programming.') + '</div>'
    + '<div class="capability-note">This is transparent decision support—not generative AI, a diagnosis, or an automatic prescription. The trainer confirms the exercise choice, range, volume, progression, and safety.</div></section>'
    + '<section class="advanced-card"><h3>Client voice</h3><p>' + escapeHtml(summary.copy) + '</p>' + (summary.latest ? '<div class="advanced-list"><div class="advanced-list-item"><b>Win</b><span>' + escapeHtml(summary.latest.win || 'Not entered') + '</span></div><div class="advanced-list-item"><b>Barrier</b><span>' + escapeHtml(summary.latest.challenge || 'Not entered') + '</span></div><div class="advanced-list-item"><b>Question</b><span>' + escapeHtml(summary.latest.question || 'No question') + '</span></div></div>' : '<div class="empty-state">No weekly check-in yet.</div>') + '<div class="tool-actions"><button class="small-btn" onclick="openAdvancedClientRecord(\'' + escapeHtml(profile.id) + '\',\'checkins\')">Open check-ins</button><button class="small-btn" onclick="openAdvancedClientRecord(\'' + escapeHtml(profile.id) + '\',\'messages\')">Open messages</button></div></section>'
    + '<section class="advanced-card"><h3>Training evidence</h3><p>Workload and plateaus stay secondary to symptoms, technique, adherence, and coaching context.</p><div class="advanced-output"><strong>' + escapeHtml(workload.risk) + '</strong>\n' + escapeHtml(workloadEvidence) + (workload.plateaus.length ? '\nReview: ' + escapeHtml(workload.plateaus.join(", ")) : '') + '</div><div class="tool-actions"><button class="small-btn" onclick="setAdvancedTab(\'monitoring\')">Add or import monitoring</button><button class="small-btn" onclick="openAdvancedClientRecord(\'' + escapeHtml(profile.id) + '\',\'progress\')">Open progress</button></div></section>'
    + '<section class="advanced-card wide"><details class="formal-review-box"><summary>Optional performance routine' + (plan ? ' · saved' : '') + '</summary><p>Use this only for sport or performance coaching when a short cue, breathing reset, or pre-performance routine supports the client’s goal. It is not mental-health treatment.</p><div class="compact-grid"><div class="compact-field wide"><label for="mentalCue">Performance cue</label><input id="mentalCue" value="' + escapeHtml(plan && plan.cue || '') + '" placeholder="Fast and controlled"></div><div class="compact-field wide"><label for="mentalBreathing">Breathing reset</label><input id="mentalBreathing" value="' + escapeHtml(plan && plan.breathing || '') + '" placeholder="Two slow breaths before the working set"></div><div class="compact-field wide"><label for="mentalVisualization">Visualization prompt</label><textarea id="mentalVisualization">' + escapeHtml(plan && plan.visualization || '') + '</textarea></div><div class="compact-field wide"><label for="mentalRoutine">Pre-performance routine</label><textarea id="mentalRoutine">' + escapeHtml(plan && plan.routine || '') + '</textarea></div></div><div class="tool-actions"><button class="small-btn" onclick="saveMentalPlan()">Save optional routine</button></div><div class="capability-note">For severe distress, disordered eating, crisis, or clinical mental-health concerns, use the appropriate qualified professional and emergency protocol.</div></details></section>'
    + '</div>';
}
function generateAiCoachDraft() {
  const profile = selectedAdvancedProfile(); if (!profile) { showToast("Choose a client first"); return null; }
  const summary = checkInCoachSummary(profile), workload = workloadSnapshot(profile); let action = summary.action;
  if (summary.pain < 2 && workload.ratio > 1.4) action = "reduce"; else if (summary.pain < 2 && workload.plateaus.length && action === "progress") action = "repeat";
  const actionCopy = { repeat:"Repeat the successful movement structure and progress only if the warm-up is crisp.", progress:"Progress one variable: one rep or the smallest available load on controlled movements.", reduce:"Reduce working volume, cap effort, and keep the session easy to recover from.", pain_swap:"Do not repeat the painful pattern unchanged; use a pain-free alternative and reassess before loading." }[action];
  const text = actionCopy + " Goal context: " + (profile.goals || []).map((g) => GOALS[g] ? GOALS[g].label : g).join(" + ") + ". " + summary.copy + (workload.plateaus.length ? " Plateau watch: " + workload.plateaus.join(", ") + "." : "") + " Coach must confirm exercise choice, range, volume, and safety.";
  currentAiCoachDraft = { profileId:profile.id,action,text,createdAt:new Date().toISOString() }; const out = byId("aiCoachDraft"); if (out) out.textContent = text; renderAdvancedStudio(); return currentAiCoachDraft;
}
function approveAiCoachDraft() {
  if (!requireTrainerMutation("approve an assisted program draft") || !currentAiCoachDraft) return null;
  const profiles = loadProfiles(), index = profiles.findIndex((item) => item.id === currentAiCoachDraft.profileId); if (index < 0) return null;
  const reviewedAt = new Date().toISOString(), checkins = loadCheckIns(), unreviewedIndex = checkins.findIndex((item) => item.profileId === currentAiCoachDraft.profileId && !item.reviewedAt);
  if (unreviewedIndex >= 0) { checkins[unreviewedIndex].reviewedAt = reviewedAt; if (!writeCheckIns(checkins)) return null; }
  profiles[index] = { ...profiles[index], coachAdjustment:{ action:currentAiCoachDraft.action,note:currentAiCoachDraft.text,reviewedAt,source:"coach-decision-support" }, updatedAt:reviewedAt };
  if (!writeProfiles(profiles)) return null;
  selectedTrainerClient = profiles[index].name; showToast("Coach-approved brief saved and sent to the workout builder"); openSelectedClientSession(); return profiles[index];
}
function renderWorkloadModule() {
  const profile = selectedAdvancedProfile(), snap = workloadSnapshot(profile), ratio = snap.ratio ? snap.ratio.toFixed(2) : "—";
  return '<div class="advanced-grid"><section class="advanced-card wide"><h3>Workload &amp; plateau detection</h3><p>Uses imported/entered session load and repeated lift performance. Flags are coaching prompts, not injury predictions or diagnoses.</p><div class="advanced-stat-grid"><div class="advanced-stat"><b>' + Math.round(snap.acute) + '</b><span>7-day load</span></div><div class="advanced-stat"><b>' + Math.round(snap.chronic) + '</b><span>28-day weekly avg.</span></div><div class="advanced-stat"><b>' + ratio + '</b><span>load trend ratio</span></div><div class="advanced-stat"><b>' + snap.plateaus.length + '</b><span>plateau flags</span></div></div><div class="advanced-output" style="margin-top:10px"><strong>' + escapeHtml(snap.risk) + '</strong>\n' + (snap.plateaus.length ? 'Repeated estimates are flat across three sessions for: ' + escapeHtml(snap.plateaus.join(", ")) + '. Review technique, exercise fit, recovery, rep range, and whether the client needs a true progression or a change in stimulus.' : 'No repeated three-session strength plateau is currently detectable.') + '</div></section><section class="advanced-card wide"><h3>Coach response</h3><p>Workload data should explain the question to ask—not decide the workout alone.</p><div class="tool-actions"><button class="small-btn" onclick="setAdvancedTab(\'assist\')">Open coach decision support</button><button class="small-btn" onclick="setAdvancedTab(\'athlete\')">Add athlete monitoring data</button><button class="small-btn" onclick="setAdvancedTab(\'wearables\')">Import wearable data</button></div></section></div>';
}
const PORTAL_THEME_PRESETS = {
  neon:{ label:"Neon blue",badge:"",description:"The original electric-blue Fit4Life look.",a:"#5AA6F0",b:"#3E6BE0" },
  newyear:{ label:"New Year",badge:"NEW YEAR",description:"Midnight clock, fireworks and metallic confetti.",a:"#7CCBFF",b:"#D9B865" },
  halloween:{ label:"Halloween",badge:"HALLOWEEN",description:"Pumpkin, cauldron and magical embers.",a:"#FF8A3D",b:"#8B5CF6" },
  thanksgiving:{ label:"Thanksgiving",badge:"THANKFUL SEASON",description:"Turkey, football, autumn tree and leaves.",a:"#E5A84B",b:"#9B5B36" },
  christmas:{ label:"Christmas",badge:"HOLIDAY SEASON",description:"Snowy tree, gifts, Santa and snowfall.",a:"#36B97E",b:"#D94B5B" },
  valentine:{ label:"Valentine’s",badge:"HEART SEASON",description:"Sculptural hearts, roses and teddy bear.",a:"#FF69A8",b:"#E5485D" },
  independence:{ label:"Independence Day",badge:"JULY 4",description:"American flag, metallic stars and fireworks.",a:"#4F8DFF",b:"#F05B63" },
};
function normalizedPortalTheme(theme) { return Object.prototype.hasOwnProperty.call(PORTAL_THEME_PRESETS,theme) ? theme : "neon"; }
function portalThemePreset(theme) { return PORTAL_THEME_PRESETS[normalizedPortalTheme(theme)]; }
function currentGymBrand() {
  const fallback = { name:"FIT 4 LIFE",sub:"BYU-Idaho Trainer Tools",primary:"#3E6BE0",accent:"#5AA6F0",theme:"neon" }, saved = loadLocalObject(GYM_BRAND_KEY,fallback);
  return { ...fallback,...saved,theme:normalizedPortalTheme(saved.theme) };
}
/* ---------- named equipment ---------- */
// Blocking already worked by name keyword, but only through a free-text box - a trainer
// had to guess that typing "versaclimber" was the way to say the gym has no VersaClimber.
// These are the specific pieces the exercise library actually names, offered as
// checkboxes. Everything is available by default; an owner unticks what they do not own.
const GYM_KIT_OPTIONS = [
  { keyword:"versaclimber", label:"VersaClimber" },
  { keyword:"hiitmill",     label:"HIITMill" },
  { keyword:"ski erg",      label:"Ski erg" },
  { keyword:"assault bike", label:"Assault bike" },
  { keyword:"smith",        label:"Smith machine" },
  { keyword:"belt squat",   label:"Belt squat" },
  { keyword:"hack squat",   label:"Hack squat" },
  { keyword:"trap bar",     label:"Trap bar" },
  { keyword:"landmine",     label:"Landmine" },
  { keyword:"trx",          label:"TRX straps" },
  { keyword:"ab wheel",     label:"Ab wheel" },
  { keyword:"agility ladder", label:"Agility ladder" },
  { keyword:"sled",         label:"Sled" },
  { keyword:"battle rope",  label:"Battle ropes" },
];
function gymKitBlocked(keyword,blockedKeywords) {
  const blocked = (blockedKeywords || []).map((item) => String(item).toLowerCase());
  return blocked.includes(String(keyword).toLowerCase());
}
function gymKitChecklistHtml(equipment) {
  const blocked = equipment.blockedKeywords || [];
  return '<div class="compact-field wide"><label>Equipment this gym has</label><div class="multi-choice-grid" id="gymKitChecklist">'
    + GYM_KIT_OPTIONS.map((option) => '<label class="chip-check"><input type="checkbox" data-kit="' + escapeHtml(option.keyword) + '"'
        + (gymKitBlocked(option.keyword,blocked) ? '' : ' checked') + '><span>' + escapeHtml(option.label) + '</span></label>').join("")
    + '</div><span class="storage-note">Unticked equipment is never programmed. Anything not listed here can still be blocked by keyword below.</span></div>';
}
// Keywords the checklist does not manage stay untouched, so a hand-typed rule survives.
function gymKitKeywordsFromChecklist(previousBlocked) {
  const managed = new Set(GYM_KIT_OPTIONS.map((option) => option.keyword.toLowerCase()));
  const manual = (previousBlocked || []).map((item) => String(item).toLowerCase()).filter((item) => !managed.has(item));
  const unchecked = [...document.querySelectorAll('#gymKitChecklist input[data-kit]')]
    .filter((input) => !input.checked).map((input) => input.dataset.kit.toLowerCase());
  return [...new Set(manual.concat(unchecked))];
}
function currentGymEquipment() { const fallback = { zones:Object.keys(ZONE_LABELS),cardioModes:Object.keys(CARDIO_MODALITIES).filter((key) => key !== "any"),blockedKeywords:["sled","battle rope"] }, saved = loadLocalObject(GYM_EQUIPMENT_KEY,fallback); return { ...fallback,...saved,zones:Array.isArray(saved.zones) ? saved.zones : fallback.zones,cardioModes:Array.isArray(saved.cardioModes) ? saved.cardioModes : fallback.cardioModes,blockedKeywords:Array.isArray(saved.blockedKeywords) ? saved.blockedKeywords : fallback.blockedKeywords }; }
function syncPortalThemePickerState(themeId) {
  const theme = normalizedPortalTheme(themeId);
  document.querySelectorAll(".portal-theme-option").forEach((button) => { const selected = button.dataset.theme === theme; button.classList.toggle("on",selected); button.setAttribute("aria-pressed",selected ? "true" : "false"); });
}
function applyGymBrand() {
  const brand = currentGymBrand(); if (!document.documentElement || !document.documentElement.style) return brand;
  const theme = portalThemePreset(brand.theme);
  document.documentElement.style.setProperty("--blue",brand.primary || "#3E6BE0"); document.documentElement.style.setProperty("--blue-bright",brand.accent || "#5AA6F0");
  document.documentElement.style.setProperty("--event-accent",theme.a); document.documentElement.style.setProperty("--event-accent-2",theme.b); document.documentElement.dataset.portalTheme = normalizedPortalTheme(brand.theme);
  const name = document.querySelector && (document.querySelector(".brand-name .grad-text") || document.querySelector(".brand-name")), sub = document.querySelector && document.querySelector(".brand-sub"), auth = document.querySelector && document.querySelector(".cloud-auth-brand"), lockup = document.querySelector && document.querySelector(".granite-logo-main"), lockupWrap = document.querySelector && document.querySelector(".granite-logo-lockup");
  if (name) name.textContent = brand.name || "Training Portal"; if (sub) sub.textContent = brand.sub || "Trainer Tools"; if (auth) auth.textContent = brand.name || "Training Portal"; if (lockup) lockup.textContent = brand.name || "Training Portal"; if (lockupWrap) lockupWrap.setAttribute("aria-label",brand.name || "Training Portal");
  const topbar = document.querySelector && document.querySelector(".topbar-inner");
  if (topbar) {
    let badge = topbar.querySelector(".portal-theme-badge");
    if (!badge) { badge = document.createElement("span"); badge.className = "portal-theme-badge"; const spacer = topbar.querySelector(".topbar-spacer"); topbar.insertBefore(badge,spacer || null); }
    badge.textContent = theme.badge; badge.hidden = !theme.badge; badge.setAttribute("aria-label",theme.badge ? "Current portal theme: " + theme.label : "Default portal theme");
  }
  syncPortalThemePickerState(brand.theme);
  document.title = (brand.name || "Training Portal") + " — Training Portal"; return brand;
}
function renderPortalThemePicker() {
  const current = currentGymBrand().theme, currentPreset = portalThemePreset(current), owner = typeof isFit4LifeOwner === "function" && isFit4LifeOwner();
  if (!owner) return '<div class="portal-theme-section"><div class="portal-theme-heading"><div><h4>Published portal theme</h4><p>The owner publishes one shared theme for every trainer and client device. Trainers can request a different theme, but cannot preview or publish one themselves.</p></div><span class="tag">Owner only</span></div><div class="advanced-list-item"><b>' + escapeHtml(currentPreset.label) + '</b><span>' + escapeHtml(currentPreset.description) + '</span></div><div class="tool-actions"><button type="button" class="small-btn" onclick="openOwnerRequestDialog(\'organization_setting\',\'\',\'\',\'Change the shared portal theme from ' + escapeHtml(currentPreset.label) + '\')">Request a theme change</button></div></div>';
  const options = Object.entries(PORTAL_THEME_PRESETS).map(([key,theme]) => '<button type="button" class="portal-theme-option ' + (key === current ? 'on' : '') + '" data-theme="' + key + '" aria-pressed="' + (key === current ? 'true' : 'false') + '" onclick="setPortalTheme(\'' + key + '\')" style="--preset-a:' + theme.a + ';--preset-b:' + theme.b + '"><span class="portal-theme-swatch" aria-hidden="true"><i>F4L</i></span><span><b>' + escapeHtml(theme.label) + '</b><small>' + escapeHtml(theme.description) + '</small></span></button>').join("");
  return '<div class="portal-theme-section"><div class="portal-theme-heading"><div><h4>Holiday themes</h4><p>One owner click publishes a holiday scene, matching F4L neon color, and ambient details to every trainer and client device. The portal layout, controls, and gym brand settings stay intact.</p></div><span class="tag">Owner only</span></div><div class="portal-theme-grid">' + options + '</div><p class="storage-note">Themes stay selected until an owner changes them. They never turn on automatically, so the portal will not surprise clients after a holiday.</p></div>';
}
function renderBrandModule() {
  const brand = currentGymBrand(), equipment = currentGymEquipment(), cloudTenant = window.fit4lifeCloudOrganizationSlug || "fit-4-life", portalUrl = window.fit4lifePublicSiteUrl ? window.fit4lifePublicSiteUrl('/',{gym:cloudTenant}) : location.origin + "/?gym=" + encodeURIComponent(cloudTenant);
  const zoneOptions = Object.keys(ZONE_LABELS).map((key) => '<label><input class="gym-equipment-zone" type="checkbox" value="' + key + '" ' + (equipment.zones.includes(key) ? 'checked' : '') + '> ' + escapeHtml(ZONE_LABELS[key]) + '</label>').join("");
  const cardioOptions = Object.keys(CARDIO_MODALITIES).filter((key) => key !== "any").map((key) => '<label><input class="gym-cardio-mode" type="checkbox" value="' + key + '" ' + (equipment.cardioModes.includes(key) ? 'checked' : '') + '> ' + escapeHtml(CARDIO_MODALITIES[key].label) + '</label>').join("");
  return '<div class="advanced-grid"><section class="advanced-card wide"><h3>Shared gym setup</h3><p>These settings define this gym’s white-label identity and the equipment the workout engine may use. The gym owner’s changes sync to every trainer and client device.</p>' + renderPortalThemePicker() + '<div class="compact-grid"><div class="compact-field wide"><label for="brandName">Gym name</label><input id="brandName" value="' + escapeHtml(brand.name) + '"></div><div class="compact-field wide"><label for="brandSub">Portal subtitle</label><input id="brandSub" value="' + escapeHtml(brand.sub) + '"></div><div class="compact-field"><label for="brandPrimary">Primary color</label><input id="brandPrimary" type="color" value="' + escapeHtml(brand.primary) + '"></div><div class="compact-field"><label for="brandAccent">Accent color</label><input id="brandAccent" type="color" value="' + escapeHtml(brand.accent) + '"></div><div class="compact-field wide"><label>Equipment zones available at this gym</label><div class="summary-checks">' + zoneOptions + '</div></div><div class="compact-field wide"><label>Cardio machines available</label><div class="summary-checks">' + cardioOptions + '</div></div>' + gymKitChecklistHtml(equipment) + '<div class="compact-field wide"><label for="gymBlockedEquipment">Blocked equipment or movement keywords</label><textarea id="gymBlockedEquipment" placeholder="sled, battle rope">' + escapeHtml((equipment.blockedKeywords || []).join(", ")) + '</textarea><span class="storage-note">The generator excludes any exercise name containing one of these terms.</span></div></div><div class="tool-actions"><button class="small-btn primary" onclick="saveGymBrand()">Save gym setup</button><button class="small-btn" onclick="resetGymBrand()">Reset colors</button></div><div class="brand-preview" style="--brand-primary:' + escapeHtml(brand.primary) + '"><h4>' + escapeHtml(brand.name) + '</h4><p>' + escapeHtml(brand.sub) + '</p></div><div class="capability-note"><strong>Current tenant link:</strong> ' + escapeHtml(portalUrl) + '<br>Use a different gym slug—or later a verified custom domain—to load a different brand, equipment bank, staff, and client records. Only an owner can change shared gym setup.</div></section></div>';
}
async function persistOrganizationAppearance(brand,equipment,localMessage) {
  if (window.fit4lifeCloudOrganizationId && typeof window.fit4lifeCloudSaveOrganizationSettings === "function") return await window.fit4lifeCloudSaveOrganizationSettings(brand,equipment);
  showToast(localMessage || "Appearance saved on this device"); return true;
}
async function setPortalTheme(themeId) {
  if (!requireTrainerMutation("change the portal theme")) return false;
  if ((!window.fit4lifeCloudOrganizationId || !window.fit4lifeCloudRole) && typeof window.fit4lifeCloudEnsureOrganizationConnection === "function") {
    await window.fit4lifeCloudEnsureOrganizationConnection();
  }
  if (!(typeof isFit4LifeOwner === "function" && isFit4LifeOwner()) || window.fit4lifeCloudRole !== "owner") { openOwnerRequestDialog("organization_setting","","","Change the shared holiday theme to " + portalThemePreset(themeId).label); return false; }
  if (!window.fit4lifeCloudOrganizationId || typeof window.fit4lifeCloudSaveOrganizationSettings !== "function") { showToast("The shared gym connection is not ready. Refresh once or sign out and back in."); return false; }
  if (portalThemeSaveInFlight) { showToast("The previous theme is still publishing"); return false; }
  const theme = normalizedPortalTheme(themeId), brand = { ...currentGymBrand(),theme,updatedAt:new Date().toISOString() }, equipment = currentGymEquipment();
  portalThemeSaveInFlight = true;
  document.querySelectorAll(".portal-theme-option").forEach((button) => { button.disabled = true; });
  try {
    const published = await persistOrganizationAppearance(brand,equipment);
    if (!published) {
      const cloudError = String(window.fit4lifeCloudOrganizationSettingsError || "").trim();
      showToast(cloudError || "Theme was not published. The shared theme is unchanged."); return false;
    }
    return true;
  } finally {
    portalThemeSaveInFlight = false;
    document.querySelectorAll(".portal-theme-option").forEach((button) => { button.disabled = false; });
  }
}
function saveGymBrand() {
  if (!requireTrainerMutation("change gym setup")) return null;
  if (window.fit4lifeCloudOrganizationId && window.fit4lifeCloudRole !== "owner") { showToast("Only the gym owner can change shared branding and equipment"); return null; }
  const currentEquipment = currentGymEquipment(), zoneInputs = [...document.querySelectorAll(".gym-equipment-zone")], cardioInputs = [...document.querySelectorAll(".gym-cardio-mode")];
  const zones = zoneInputs.length ? zoneInputs.filter((item) => item.checked).map((item) => item.value) : currentEquipment.zones;
  const cardioModes = cardioInputs.length ? cardioInputs.filter((item) => item.checked).map((item) => item.value) : currentEquipment.cardioModes;
  if (!zones.length) { showToast("Choose at least one equipment zone"); return null; }
  if (zones.includes("cardio") && !cardioModes.length) { showToast("Choose at least one cardio machine or turn off the Cardio zone"); return null; }
  const brand = { name:byId("brandName").value.trim() || "Training Portal",sub:byId("brandSub").value.trim() || "Trainer Tools",primary:byId("brandPrimary").value,accent:byId("brandAccent").value,theme:currentGymBrand().theme,updatedAt:new Date().toISOString() };
  const blockedField = document.getElementById("gymBlockedEquipment"), blockedValue = blockedField ? blockedField.value : currentEquipment.blockedKeywords.join(", ");
  const typedKeywords = blockedValue.split(/[,\n]/).map((item) => item.trim().toLowerCase()).filter(Boolean);
  // The checklist owns its own keywords; anything typed by hand is preserved alongside.
  const blockedKeywords = document.getElementById("gymKitChecklist")
    ? gymKitKeywordsFromChecklist(typedKeywords)
    : typedKeywords;
  const equipment = { zones,cardioModes,blockedKeywords,updatedAt:new Date().toISOString() };
  if (!writeLocalObject(GYM_BRAND_KEY,brand) || !writeLocalObject(GYM_EQUIPMENT_KEY,equipment)) return null; applyGymBrand(); renderAdvancedStudio();
  persistOrganizationAppearance(brand,equipment,"Gym setup saved on this device");
  return { brand,equipment };
}
function resetGymBrand() {
  const brand = { ...currentGymBrand(),primary:"#3E6BE0",accent:"#5AA6F0",updatedAt:new Date().toISOString() }, equipment = currentGymEquipment();
  if (!writeLocalObject(GYM_BRAND_KEY,brand)) return false; applyGymBrand(); renderAdvancedStudio();
  persistOrganizationAppearance(brand,equipment,"Default colors restored on this device");
  return true;
}
function renderTeamsModule() {
  const profiles = loadProfiles(), teams = loadTeams();
  const teamHtml = teams.map((team) => '<div class="advanced-list-item"><b>' + escapeHtml(team.name) + '</b><span>Coach: ' + escapeHtml(team.coach || 'Unassigned') + ' · ' + (team.profileIds || []).length + ' members · ' + escapeHtml(team.focus || 'General') + '</span><div class="tool-actions"><button class="small-btn danger" onclick="deleteTeam(\'' + escapeHtml(team.id) + '\')">Delete team</button></div></div>').join("");
  return '<div class="advanced-grid"><section class="advanced-card"><h3>Create team</h3><p>Group clients by coach, sport, class, or training objective.</p><div class="compact-grid"><div class="compact-field wide"><label for="teamName">Team name</label><input id="teamName" placeholder="Women’s soccer · Morning strength"></div><div class="compact-field"><label for="teamCoach">Coach</label><input id="teamCoach" placeholder="Trainer name"></div><div class="compact-field"><label for="teamFocus">Focus</label><input id="teamFocus" placeholder="In-season performance"></div><div class="compact-field wide"><label>Members</label><div class="summary-checks">' + (profiles.length ? profiles.map((profile) => '<label><input class="team-member-choice" type="checkbox" value="' + escapeHtml(profile.id) + '"> ' + escapeHtml(profile.name) + '</label>').join("") : '<span>No client profiles yet.</span>') + '</div></div></div><div class="tool-actions"><button class="small-btn primary" onclick="saveTeam()">Create team</button></div></section><section class="advanced-card"><h3>Teams</h3><p>Use teams as an operating layer; individual safety filters still belong to each client.</p><div class="advanced-list">' + (teamHtml || '<div class="empty-state">No teams created yet.</div>') + '</div></section><section class="advanced-card wide"><div class="capability-note">Hosted team management should add coach roles, roster invitations, schedule permissions, team-level reporting, and server-enforced privacy boundaries.</div></section></div>';
}
function saveTeam() { if (!requireTrainerMutation("create teams")) return null; const name = byId("teamName").value.trim(); if (!name) { showToast("Add a team name"); return null; } const choices = document.querySelectorAll ? [...document.querySelectorAll(".team-member-choice:checked")].map((item) => item.value) : []; const teams = loadTeams(), team = { id:"team-" + Date.now(),name,coach:byId("teamCoach").value.trim(),focus:byId("teamFocus").value.trim(),profileIds:choices,createdAt:new Date().toISOString() }; teams.unshift(team); if (!writeLocalArray(TEAMS_KEY,teams,200)) return null; renderAdvancedStudio(); showToast("Team created"); return team; }
function deleteTeam(id) { if (!requireTrainerMutation("delete teams")) return false; if (!writeLocalArray(TEAMS_KEY,loadTeams().filter((item) => item.id !== id),200)) return false; renderAdvancedStudio(); showToast("Team deleted"); return true; }
function renderOrganizationModule() {
  return '<section class="advanced-card" style="margin-bottom:12px"><h3>Organization setup</h3><p>Gym identity, available equipment, and operating groups live together because they change the environment around every client. Holiday themes are owner-published and synchronize to every device. Individual goals, injuries, and preferences still remain client-specific.</p><div class="tool-actions"><button class="small-btn" onclick="openCoachDestination(\'settings\')">Open account &amp; security settings</button><button class="small-btn" onclick="openCoachDestination(\'calendar\')">Open team calendar</button></div></section>'
    + renderBrandModule()
    + '<div style="height:12px"></div>'
    + renderTeamsModule();
}
function mentalPlanFor(profileId) { return loadMentalPlans().find((item) => item.profileId === profileId) || null; }
function renderMentalModule() { const profile = selectedAdvancedProfile(), plan = mentalPlanFor(profile && profile.id), summary = checkInCoachSummary(profile); return '<div class="advanced-grid"><section class="advanced-card"><h3>Mental-performance plan</h3><p>Turn confidence and motivation data into a simple routine the athlete can actually use.</p><div class="compact-grid"><div class="compact-field wide"><label for="mentalCue">Performance cue</label><input id="mentalCue" value="' + escapeHtml(plan && plan.cue || '') + '" placeholder="Fast and controlled · attack the first step"></div><div class="compact-field wide"><label for="mentalBreathing">Breathing reset</label><input id="mentalBreathing" value="' + escapeHtml(plan && plan.breathing || '') + '" placeholder="Two slow breaths before each working set"></div><div class="compact-field wide"><label for="mentalVisualization">Visualization prompt</label><textarea id="mentalVisualization" placeholder="What should the athlete picture before the key task?">' + escapeHtml(plan && plan.visualization || '') + '</textarea></div><div class="compact-field wide"><label for="mentalRoutine">Pre-performance routine</label><textarea id="mentalRoutine" placeholder="A short repeatable sequence…">' + escapeHtml(plan && plan.routine || '') + '</textarea></div></div><div class="tool-actions"><button class="small-btn primary" onclick="saveMentalPlan()">Save mental-performance plan</button></div></section><section class="advanced-card"><h3>Current mental signals</h3><p>Based on recent weekly check-ins—not a mental-health diagnosis.</p><div class="advanced-stat-grid"><div class="advanced-stat"><b>' + (summary.confidence == null ? '—' : summary.confidence.toFixed(1)) + '</b><span>confidence / 5</span></div><div class="advanced-stat"><b>' + (summary.latest ? summary.latest.motivation + '/5' : '—') + '</b><span>motivation</span></div><div class="advanced-stat"><b>' + (summary.stress == null ? '—' : summary.stress.toFixed(1)) + '</b><span>stress / 5</span></div><div class="advanced-stat"><b>' + (summary.latest ? summary.latest.energy + '/5' : '—') + '</b><span>energy</span></div></div><div class="advanced-output" style="margin-top:10px">' + escapeHtml(summary.latest && summary.latest.challenge || 'No recent barrier reported.') + '</div><div class="capability-note">For crisis, severe distress, disordered eating, or clinical mental-health concerns, use an appropriate qualified professional and emergency protocol—not this coaching tool.</div></section></div>'; }
function saveMentalPlan() { if (!requireTrainerMutation("save mental-performance plans")) return null; const profile = selectedAdvancedProfile(); if (!profile) return null; const plans = loadMentalPlans(), index = plans.findIndex((item) => item.profileId === profile.id), plan = { id:index >= 0 ? plans[index].id : "mental-" + Date.now(),profileId:profile.id,client:profile.name,cue:byId("mentalCue").value.trim(),breathing:byId("mentalBreathing").value.trim(),visualization:byId("mentalVisualization").value.trim(),routine:byId("mentalRoutine").value.trim(),updatedAt:new Date().toISOString() }; if (index >= 0) plans[index] = plan; else plans.unshift(plan); if (!writeLocalArray(MENTAL_PLANS_KEY,plans,500)) return null; renderAdvancedStudio(); showToast("Mental-performance plan saved"); return plan; }
function renderAthleteModule() { const profile = selectedAdvancedProfile(), metrics = profile ? athleteMetricsForProfile(profile.id) : [], latest = metrics[0] || {}, snap = workloadSnapshot(profile); return '<div class="advanced-grid"><section class="advanced-card"><h3>Add athlete monitoring</h3><p>Enter testing and recovery metrics from the same measurement method whenever possible.</p><div class="compact-grid"><div class="compact-field"><label for="athleteMetricDate">Date</label><input id="athleteMetricDate" type="date" value="' + new Date().toISOString().slice(0,10) + '"></div><div class="compact-field"><label for="athleteMetricSource">Source</label><select id="athleteMetricSource"><option value="manual">Manual</option><option value="wearable">Wearable import</option><option value="testing">Performance test</option></select></div><div class="compact-field"><label for="athleteRestingHr">Resting HR</label><input id="athleteRestingHr" type="number" min="0"></div><div class="compact-field"><label for="athleteHrv">HRV</label><input id="athleteHrv" type="number" min="0" step="0.1"></div><div class="compact-field"><label for="athleteSleepHours">Sleep hours</label><input id="athleteSleepHours" type="number" min="0" max="24" step="0.1"></div><div class="compact-field"><label for="athleteBodyMass">Body mass</label><input id="athleteBodyMass" type="number" min="0" step="0.1"></div><div class="compact-field"><label for="athleteJump">Jump height</label><input id="athleteJump" type="number" min="0" step="0.1"></div><div class="compact-field"><label for="athleteSprint">Sprint time</label><input id="athleteSprint" type="number" min="0" step="0.01"></div><div class="compact-field"><label for="athleteSessionRpe">Session RPE</label><input id="athleteSessionRpe" type="number" min="0" max="10" step="0.5"></div><div class="compact-field"><label for="athleteMinutes">Session minutes</label><input id="athleteMinutes" type="number" min="0"></div><div class="compact-field wide"><label for="athleteLoad">External/internal load (optional)</label><input id="athleteLoad" type="number" min="0" placeholder="If blank: session RPE × minutes"></div></div><div class="tool-actions"><button class="small-btn primary" onclick="saveAthleteMetric()">Save monitoring record</button></div></section><section class="advanced-card"><h3>Latest athlete snapshot</h3><p>Compare within the same athlete and measurement method.</p><div class="advanced-stat-grid"><div class="advanced-stat"><b>' + (latest.restingHr || '—') + '</b><span>resting HR</span></div><div class="advanced-stat"><b>' + (latest.hrv || '—') + '</b><span>HRV</span></div><div class="advanced-stat"><b>' + (latest.jump || '—') + '</b><span>jump</span></div><div class="advanced-stat"><b>' + (latest.sprint || '—') + '</b><span>sprint</span></div></div><div class="advanced-output" style="margin-top:10px"><strong>' + escapeHtml(snap.risk) + '</strong>\n' + metrics.length + ' monitoring records · 7-day load ' + Math.round(snap.acute) + ' · 28-day weekly average ' + Math.round(snap.chronic) + '.</div><div class="capability-note">Do not use a single wearable score, HRV value, or workload ratio to diagnose readiness or injury risk. Consider trends, context, symptoms, and qualified medical input.</div></section></div>'; }
function fieldNumberOrNull(id) { const value = byId(id).value; return value === "" ? null : Number(value); }
function saveAthleteMetric() { if (!requireTrainerMutation("save athlete monitoring")) return null; const profile = selectedAdvancedProfile(); if (!profile) return null; const sessionRpe = fieldNumberOrNull("athleteSessionRpe"), minutes = fieldNumberOrNull("athleteMinutes"), enteredLoad = fieldNumberOrNull("athleteLoad"), metric = { id:"metric-" + Date.now() + "-" + Math.random().toString(16).slice(2),profileId:profile.id,client:profile.name,date:byId("athleteMetricDate").value || new Date().toISOString().slice(0,10),source:byId("athleteMetricSource").value,restingHr:fieldNumberOrNull("athleteRestingHr"),hrv:fieldNumberOrNull("athleteHrv"),sleepHours:fieldNumberOrNull("athleteSleepHours"),bodyMass:fieldNumberOrNull("athleteBodyMass"),jump:fieldNumberOrNull("athleteJump"),sprint:fieldNumberOrNull("athleteSprint"),sessionRpe,minutes,load:enteredLoad != null ? enteredLoad : (sessionRpe != null && minutes != null ? sessionRpe * minutes : 0),createdAt:new Date().toISOString() }; const metrics = loadAthleteMetrics(); metrics.unshift(metric); if (!writeAthleteMetrics(metrics)) return null; runAutomations(false); renderAdvancedStudio(); showToast("Athlete monitoring record saved"); return metric; }
function renderMonitoringModule() {
  const profile = selectedAdvancedProfile();
  if (!profile) return '<div class="empty-state">Choose a client before adding or importing monitoring data.</div>';
  const metrics = athleteMetricsForProfile(profile.id), latest = metrics[0] || {}, snap = workloadSnapshot(profile);
  const history = metrics.slice(0,8).map((item) => {
    const values = [
      item.sleepHours != null ? item.sleepHours + ' h sleep' : '',
      item.restingHr != null ? item.restingHr + ' resting HR' : '',
      item.hrv != null ? item.hrv + ' HRV' : '',
      item.jump != null ? item.jump + ' jump' : '',
      item.sprint != null ? item.sprint + ' sprint' : '',
      item.load ? Math.round(item.load) + ' load' : '',
    ].filter(Boolean).join(' · ');
    return '<div class="advanced-list-item"><b>' + escapeHtml(new Date(item.date + 'T12:00:00').toLocaleDateString()) + ' · ' + escapeHtml(item.source || 'manual') + '</b><span>' + escapeHtml(values || 'Record saved without a comparable metric') + '</span></div>';
  }).join("");
  return '<div class="advanced-grid">'
    + '<section class="advanced-card wide"><h3>Monitoring that supports a decision</h3><p>Optional monitoring is attached to ' + escapeHtml(profile.name) + ' and appears with the client’s progress evidence. Compare the same measure, method, and conditions over time; do not treat one device score as a diagnosis.</p><div class="advanced-stat-grid"><div class="advanced-stat"><b>' + metrics.length + '</b><span>monitoring records</span></div><div class="advanced-stat"><b>' + (latest.sleepHours != null ? latest.sleepHours : '—') + '</b><span>latest sleep hours</span></div><div class="advanced-stat"><b>' + (latest.restingHr != null ? latest.restingHr : '—') + '</b><span>latest resting HR</span></div><div class="advanced-stat"><b>' + Math.round(snap.acute) + '</b><span>7-day entered load</span></div></div><div class="tool-actions"><button class="small-btn" onclick="setAdvancedTab(\'review\')">Return to coaching review</button><button class="small-btn" onclick="openAdvancedClientRecord(\'' + escapeHtml(profile.id) + '\',\'progress\')">Open client progress</button></div></section>'
    + '<section class="advanced-card"><h3>Add a monitoring record</h3><p>Enter only the fields you consistently use. Session load defaults to RPE × minutes when both are entered.</p><div class="compact-grid"><div class="compact-field"><label for="athleteMetricDate">Date</label><input id="athleteMetricDate" type="date" value="' + new Date().toISOString().slice(0,10) + '"></div><div class="compact-field"><label for="athleteMetricSource">Source</label><select id="athleteMetricSource"><option value="manual">Manual</option><option value="wearable">Wearable export</option><option value="testing">Performance test</option></select></div><div class="compact-field"><label for="athleteRestingHr">Resting HR</label><input id="athleteRestingHr" type="number" min="0"></div><div class="compact-field"><label for="athleteHrv">HRV</label><input id="athleteHrv" type="number" min="0" step="0.1"></div><div class="compact-field"><label for="athleteSleepHours">Sleep hours</label><input id="athleteSleepHours" type="number" min="0" max="24" step="0.1"></div><div class="compact-field"><label for="athleteBodyMass">Body mass</label><input id="athleteBodyMass" type="number" min="0" step="0.1"></div><div class="compact-field"><label for="athleteJump">Jump height</label><input id="athleteJump" type="number" min="0" step="0.1"></div><div class="compact-field"><label for="athleteSprint">Sprint time</label><input id="athleteSprint" type="number" min="0" step="0.01"></div><div class="compact-field"><label for="athleteSessionRpe">Session RPE</label><input id="athleteSessionRpe" type="number" min="0" max="10" step="0.5"></div><div class="compact-field"><label for="athleteMinutes">Session minutes</label><input id="athleteMinutes" type="number" min="0"></div><div class="compact-field wide"><label for="athleteLoad">Entered load (optional)</label><input id="athleteLoad" type="number" min="0"></div></div><div class="tool-actions"><button class="small-btn primary" onclick="saveAthleteMetric()">Save monitoring record</button></div></section>'
    + '<section class="advanced-card"><h3>Import an existing export</h3><p>CSV and JSON imports accept date, resting HR, HRV, sleep, body mass, jump, sprint, RPE, minutes, and load.</p><div class="compact-field"><label for="wearableFile">CSV or JSON file</label><input id="wearableFile" type="file" accept=".csv,.json,text/csv,application/json" onchange="handleWearableImport(this)"></div><div id="wearableImportStatus" class="advanced-output" style="margin-top:10px">Imported rows will be attached to ' + escapeHtml(profile.name) + '.</div><div class="capability-note">Direct Apple Health, Garmin, WHOOP, Fitbit, Oura, or Polar connections are not active in this version, so the app no longer displays pretend connection-request controls.</div></section>'
    + '<section class="advanced-card wide"><h3>Recent monitoring history</h3><div class="advanced-list">' + (history || '<div class="empty-state">No monitoring records yet. This does not block normal workout programming.</div>') + '</div></section>'
    + '</div>';
}
const PROGRAM_MARKETPLACE = [
  { id:"strength-foundation",title:"Strength Foundation",author:"FIT4LIFE",weeks:6,days:3,minutes:60,level:"New",focus:"Strength",goal:"strength",trainingStyle:"resistance",desc:"Three repeatable full-body days with technique-first compound patterns.",sessions:[
    {name:"Day 1 · Squat foundation",detail:"Movement warm-up · squat pattern · horizontal press · supported row · trunk stability",muscles:[],optionIndex:0},
    {name:"Day 2 · Hinge foundation",detail:"Posterior-chain warm-up · hinge pattern · overhead press · vertical pull · loaded carry",muscles:[],optionIndex:1},
    {name:"Day 3 · Unilateral foundation",detail:"Dynamic warm-up · lunge pattern · bench variation · row variation · simple conditioning",muscles:[],optionIndex:2},
  ],progression:"Compounds remain recognizable through the phase. Add a small amount of load or one clean rep when technique and target effort are both met; reduce fatigue during the formal Week 4 review." },
  { id:"hypertrophy-build",title:"Balanced Muscle Build",author:"FIT4LIFE",weeks:8,days:4,minutes:60,level:"Intermediate",focus:"Muscle",goal:"hypertrophy",trainingStyle:"resistance",desc:"Four-day volume structure with controlled progression and deloads.",sessions:[
    {name:"Day 1 · Upper push",detail:"Shoulder preparation · bench-press emphasis · secondary press · chest, shoulder, and triceps accessories",muscles:["chest","shoulders","arms"],optionIndex:0},
    {name:"Day 2 · Lower squat",detail:"Hip and ankle preparation · squat emphasis · unilateral legs · quad and calf accessories",muscles:["quads","glutes"],optionIndex:1},
    {name:"Day 3 · Upper pull",detail:"Scapular preparation · row emphasis · vertical pull · rear-shoulder and arm accessories",muscles:["back","arms"],optionIndex:2},
    {name:"Day 4 · Lower hinge",detail:"Posterior-chain preparation · deadlift or RDL emphasis · glute and hamstring accessories · trunk support",muscles:["hamstrings","glutes"],optionIndex:0},
  ],progression:"Use repeatable compound benchmarks and progress volume gradually. Accessories can rotate within approved movement families every two weeks; Week 4 and Week 8 are coach-review checkpoints." },
  { id:"engine-base",title:"Aerobic Engine Base",author:"FIT4LIFE",weeks:6,days:3,minutes:45,level:"All",focus:"Cardio",goal:"conditioning",trainingStyle:"cardio",desc:"Aerobic, tempo, and interval sessions using only the client’s available cardio options.",sessions:[
    {name:"Day 1 · Aerobic base",detail:"Gradual machine-specific warm-up · steady conversational work · progressive easy cool-down",muscles:[],optionIndex:0},
    {name:"Day 2 · Controlled tempo",detail:"Easy preparation · repeatable moderate-hard intervals · full easy recoveries · mobility finish",muscles:[],optionIndex:1},
    {name:"Day 3 · Short intervals",detail:"Progressive warm-up · concise work-to-rest intervals · output-preserving recovery · cool-down",muscles:[],optionIndex:2},
  ],progression:"Build time before intensity. Keep the machine and session purpose familiar, add only one small progression at a time, and reduce total work during the formal Week 4 review." },
  { id:"athlete-power",title:"Field Athlete Power",author:"FIT4LIFE",weeks:8,days:4,minutes:60,level:"Intermediate",focus:"Performance",goal:"athletic",trainingStyle:"performance",desc:"Power before fatigue, unilateral strength, sprint support, and repeat-effort conditioning.",sessions:[
    {name:"Day 1 · Acceleration + lower power",detail:"Movement preparation · low-volume jump or sprint skill · squat strength · unilateral support",muscles:["quads","glutes"],optionIndex:0},
    {name:"Day 2 · Upper power + strength",detail:"Shoulder and trunk preparation · explosive push · press strength · row and trunk support",muscles:["chest","back","shoulders"],optionIndex:1},
    {name:"Day 3 · Change of direction + full body",detail:"Agility preparation · controlled change-of-direction work · hinge strength · carries",muscles:[],optionIndex:2},
    {name:"Day 4 · Repeat-effort conditioning",detail:"Progressive warm-up · sport-supportive intervals · low-fatigue accessories · recovery finish",muscles:[],optionIndex:0},
  ],progression:"Power work stays early while the athlete is fresh. Preserve speed and crisp technique, keep strength anchors stable, and use Week 4 and Week 8 to review fatigue and competition demands." },
];
function normalizedMarketTemplate(item) {
  const focus = String(item && item.focus || "General").toLowerCase();
  const goal = item && item.goal || (focus.includes("strength") ? "strength" : focus.includes("muscle") ? "hypertrophy" : focus.includes("cardio") ? "conditioning" : focus.includes("performance") ? "athletic" : "general");
  const trainingStyle = item && item.trainingStyle || (goal === "conditioning" ? "cardio" : goal === "athletic" ? "performance" : "resistance");
  const days = Math.max(2,Math.min(5,Number(item && item.days) || (Array.isArray(item && item.sessions) ? item.sessions.length : 3)));
  const sessions = Array.isArray(item && item.sessions) && item.sessions.length ? item.sessions : Array.from({length:days},(_,index) => ({name:"Day " + (index + 1) + " · Coach-defined session",detail:"The trainer will choose the warm-up, primary work, supporting exercises, conditioning, and cool-down in the program builder."}));
  return { ...item,goal,trainingStyle,days,sessions,minutes:Number(item && item.minutes) || 60,progression:item && item.progression || "Keep the main training pattern recognizable, progress one variable at a time, and use scheduled coach reviews before changing the phase." };
}
function marketTemplateById(id) {
  const items = [...PROGRAM_MARKETPLACE,...loadMarketPrograms()];
  const found = items.find((item) => item.id === id) || items.find((item) => item.templateId === id);
  if (!found) return null;
  const original = found.templateId && PROGRAM_MARKETPLACE.find((item) => item.id === found.templateId);
  return normalizedMarketTemplate(original ? { ...original,...found,sessions:found.sessions || original.sessions,progression:found.progression || original.progression } : found);
}
function renderMarketplaceModule() {
  const saved = loadMarketPrograms(), catalog = [...PROGRAM_MARKETPLACE,...saved.filter((item) => item.published)];
  const cards = catalog.map((raw) => {
    const item = normalizedMarketTemplate(raw), isSaved = saved.some((savedItem) => savedItem.templateId === item.id || savedItem.id === item.id);
    return '<article class="market-template-card"><h4>' + escapeHtml(item.title) + '</h4><span>' + escapeHtml(item.author || 'Local trainer') + ' · ' + item.weeks + ' weeks · ' + item.days + ' days/week · ' + escapeHtml(item.level) + '</span><p>' + escapeHtml(item.desc || "Coach-defined reusable program structure.") + '</p><div class="template-tags"><span>' + escapeHtml(item.focus) + '</span><span>' + (isSaved ? 'Saved to gym' : 'Available') + '</span></div><div class="tool-actions"><button class="small-btn primary" onclick="openProgramTemplatePreview(\'' + escapeHtml(item.id) + '\')">Preview &amp; customize</button><button class="small-btn" onclick="installProgramTemplate(\'' + escapeHtml(item.id) + '\')">' + (isSaved ? 'Saved' : 'Save template') + '</button></div></article>';
  }).join("");
  const installed = saved.filter((item) => !item.published).map((item) => '<div class="advanced-list-item"><b>' + escapeHtml(item.title) + '</b><span>Saved ' + new Date(item.installedAt).toLocaleDateString() + '</span><div class="tool-actions"><button class="small-btn" onclick="openProgramTemplatePreview(\'' + escapeHtml(item.id) + '\')">Preview &amp; customize</button></div></div>').join("");
  return '<div class="advanced-grid"><section class="advanced-card wide"><h3>Program template library</h3><p>Preview reusable weekly structures before saving one or adapting it to a client. These are coaching starting points, not one-click prescriptions. Individual limitations, equipment, experience, and goals are re-applied in the program builder.</p><div class="market-catalog-grid">' + cards + '</div></section><section class="advanced-card"><h3>Create an organization template</h3><div class="compact-grid"><div class="compact-field wide"><label for="marketTitle">Program title</label><input id="marketTitle"></div><div class="compact-field"><label for="marketWeeks">Weeks</label><input id="marketWeeks" type="number" min="1" max="52" value="6"></div><div class="compact-field"><label for="marketFocus">Focus</label><input id="marketFocus" placeholder="Strength · Cardio · Sport"></div><div class="compact-field wide"><label for="marketDescription">Description</label><textarea id="marketDescription"></textarea></div></div><div class="tool-actions"><button class="small-btn primary" onclick="publishLocalProgram()">Save organization template</button></div></section><section class="advanced-card"><h3>Saved template library</h3><div class="advanced-list">' + (installed || '<div class="empty-state">No templates saved yet.</div>') + '</div><div class="capability-note">Saved templates remain trainer-controlled. This is an internal template library—not a public paid marketplace. Loading a template never bypasses client equipment, pain, limitation, or coach-approval checks.</div></section></div>';
}
function openProgramTemplatePreview(id) {
  const item = marketTemplateById(id), modal = byId("marketTemplatePreviewModal"); if (!item || !modal) return false;
  byId("marketTemplateId").value = item.id;
  byId("marketTemplateName").textContent = item.title;
  byId("marketTemplateDescription").textContent = item.desc || "Coach-defined reusable program structure.";
  byId("marketTemplateMeta").textContent = item.weeks + " weeks · " + item.days + " days/week · " + item.minutes + " min";
  byId("marketTemplateSessions").innerHTML = item.sessions.map((session) => '<div class="market-preview-session"><b>' + escapeHtml(session.name) + '</b><span>' + escapeHtml(session.detail) + '</span></div>').join("");
  byId("marketTemplateProgression").textContent = item.progression;
  const clientSelect = byId("marketTemplateClient"), profiles = loadProfiles();
  clientSelect.innerHTML = '<option value="">Choose a client…</option>' + profiles.map((profile) => '<option value="' + escapeHtml(profile.id) + '">' + escapeHtml(profile.name) + ' · @' + escapeHtml(profileUsername(profile)) + '</option>').join("");
  clientSelect.value = "";
  byId("marketTemplateWeeks").value = String([3,4,6,8,12].includes(Number(item.weeks)) ? item.weeks : 6);
  byId("marketTemplateDays").value = String(item.days);
  byId("marketTemplateMinutes").value = String([30,45,60,90].includes(Number(item.minutes)) ? item.minutes : 60);
  modal.classList.add("open"); return true;
}
function closeProgramTemplatePreview() { const modal = byId("marketTemplatePreviewModal"); if (modal) modal.classList.remove("open"); }
function installActiveMarketTemplate() { const id = byId("marketTemplateId") && byId("marketTemplateId").value; return id ? installProgramTemplate(id) : null; }
function loadMarketTemplateForClient() {
  if (!requireTrainerMutation("customize program templates")) return false;
  const item = marketTemplateById(byId("marketTemplateId").value), profileId = byId("marketTemplateClient").value;
  if (!item) { showToast("That template is no longer available"); return false; }
  if (!profileId) { showToast("Select a client for this program"); return false; }
  const profile = loadProfiles().find((entry) => entry.id === profileId); if (!profile) { showToast("That client profile was not found"); return false; }
  const weeks = Number(byId("marketTemplateWeeks").value) || item.weeks, days = Number(byId("marketTemplateDays").value) || item.days, minutes = Number(byId("marketTemplateMinutes").value) || item.minutes;
  closeProgramTemplatePreview(); openPrograms(true); selectProgramProfile(profile.id);
  byId("programGoal").value = item.goal;
  byId("programSecondaryGoal").value = "";
  byId("programStyle").value = item.trainingStyle;
  byId("programMode").value = weeks === 3 ? "starter" : "progressive";
  syncProgramMode(true);
  byId("programWeeks").value = String(weeks);
  // The select is capped to the client's tier, so a template asking for more days than
  // the plan covers would otherwise blank the field and produce a zero-day programme.
  const daysSelect = byId("programDays");
  const allowed = [...daysSelect.options].map((option) => Number(option.value)).filter(Boolean);
  const cappedDays = allowed.length && !allowed.includes(Number(days))
    ? Math.max.apply(null,allowed.filter((n) => n <= Number(days)).concat(Math.min.apply(null,allowed)))
    : Number(days);
  daysSelect.value = String(cappedDays);
  if (cappedDays !== Number(days)) showToast("Template asks for " + days + " days; this client's plan covers " + cappedDays + ".");
  byId("programMinutes").value = String(minutes);
  loadedProgramTemplate = { id:item.templateId || item.id,title:item.title,sessions:item.sessions,progression:item.progression };
  const context = byId("programTemplateContext");
  if (context) { context.style.display = "block"; context.innerHTML = "<b>Template loaded:</b> " + escapeHtml(item.title) + ". The previewed structure is active when the selected day count matches the template. Client filters still control every generated exercise."; }
  currentProgram = null;
  byId("programOutput").className = "empty-state";
  byId("programOutput").textContent = item.title + " is loaded for " + profile.name + ". Review the settings above, then build the personalized draft.";
  showToast("Template loaded for " + profile.name + " — review and build the draft");
  return true;
}
function installProgramTemplate(id) { if (!requireTrainerMutation("install program templates")) return null; const source = [...PROGRAM_MARKETPLACE,...loadMarketPrograms()].find((item) => item.id === id || item.templateId === id); if (!source) return null; const items = loadMarketPrograms(), canonicalId = source.templateId || source.id; if (items.some((item) => item.templateId === canonicalId || (!item.published && item.id === canonicalId))) { showToast("Template is already in the gym library"); return source; } const installed = { ...source,id:"installed-" + Date.now(),templateId:canonicalId,published:false,installedAt:new Date().toISOString() }; items.unshift(installed); if (!writeLocalArray(MARKET_PROGRAMS_KEY,items,500)) return null; renderAdvancedStudio(); showToast("Program template saved to the gym library"); return installed; }
function publishLocalProgram() { if (!requireTrainerMutation("save organization program templates")) return null; const title = byId("marketTitle").value.trim(); if (!title) { showToast("Add a program title"); return null; } const item = { id:"market-" + Date.now(),title,author:currentGymBrand().name,weeks:Number(byId("marketWeeks").value) || 6,level:"Coach-defined",focus:byId("marketFocus").value.trim() || "General",desc:byId("marketDescription").value.trim(),published:true,createdAt:new Date().toISOString() }; const items = loadMarketPrograms(); items.unshift(item); if (!writeLocalArray(MARKET_PROGRAMS_KEY,items,500)) return null; renderAdvancedStudio(); showToast("Program saved to the organization template library"); return item; }
function loadWearableConnections() { return loadLocalObject(WEARABLE_CONNECTIONS_KEY,{}); }
function renderWearablesModule() { const connections = loadWearableConnections(), sources = ["Apple Health","Garmin","WHOOP","Fitbit","Oura","Polar"]; return '<div class="advanced-grid"><section class="advanced-card"><h3>Wearable connections</h3><p>Track which provider integrations the gym intends to activate.</p><div class="advanced-list">' + sources.map((source) => '<div class="advanced-list-item"><b>' + source + '</b><span>' + (connections[source] ? 'Connection requested · production credentials needed' : 'Not configured') + '</span><div class="tool-actions"><button class="small-btn" onclick="toggleWearableConnection(\'' + source + '\')">' + (connections[source] ? 'Remove request' : 'Request connection') + '</button></div></div>').join("") + '</div></section><section class="advanced-card"><h3>Import wearable data</h3><p>CSV or JSON import works now for date, resting HR, HRV, sleep, body mass, jump, sprint, RPE, minutes, and load.</p><div class="compact-field"><label for="wearableFile">Wearable export</label><input id="wearableFile" type="file" accept=".csv,.json,text/csv,application/json" onchange="handleWearableImport(this)"></div><div id="wearableImportStatus" class="advanced-output" style="margin-top:10px">Choose the client above before importing.</div><div class="capability-note">Direct background sync requires each provider’s OAuth flow, permissions, data-use review, refresh tokens, webhooks, and a secure hosted backend. “Request connection” does not claim a live OAuth connection.</div></section></div>'; }
function toggleWearableConnection(source) { if (!requireTrainerMutation("configure wearable integrations")) return false; const data = loadWearableConnections(); if (data[source]) delete data[source]; else data[source] = { requestedAt:new Date().toISOString(),status:"credentials-needed" }; if (!writeLocalObject(WEARABLE_CONNECTIONS_KEY,data)) return false; renderAdvancedStudio(); return true; }
function parseSimpleCsv(text) { const lines = String(text || "").trim().split(/\r?\n/).filter(Boolean); if (lines.length < 2) return []; const headers = lines[0].split(",").map((value) => value.trim().toLowerCase().replace(/[^a-z0-9]+/g,"")); return lines.slice(1).map((line) => { const cells = line.split(","), row = {}; headers.forEach((header,index) => { row[header] = cells[index] == null ? "" : cells[index].trim(); }); return row; }); }
function normalizedWearableMetric(row,profile) { const value = (...keys) => { for (const key of keys) if (row[key] != null && row[key] !== "") return row[key]; return null; }, number = (...keys) => { const raw = value(...keys); return raw == null ? null : Number(raw); }; const sessionRpe = number("sessionrpe","rpe"), minutes = number("minutes","duration","durationminutes"), directLoad = number("load","trainingload"); return { id:"wearable-" + Date.now() + "-" + Math.random().toString(16).slice(2),profileId:profile.id,client:profile.name,date:String(value("date","day") || new Date().toISOString().slice(0,10)).slice(0,10),source:"wearable",restingHr:number("restinghr","rhr"),hrv:number("hrv","heartratevariability"),sleepHours:number("sleephours","sleep"),bodyMass:number("bodymass","weight"),jump:number("jump","jumpheight"),sprint:number("sprint","sprinttime"),sessionRpe,minutes,load:directLoad != null ? directLoad : (sessionRpe != null && minutes != null ? sessionRpe * minutes : 0),createdAt:new Date().toISOString() }; }
function handleWearableImport(input) { if (!requireTrainerMutation("import wearable data")) { input.value = ""; return; } const profile = selectedAdvancedProfile(), file = input.files && input.files[0]; if (!profile || !file) { showToast(profile ? "Choose a file" : "Choose a client first"); input.value = ""; return; } const reader = new FileReader(); reader.onload = () => { try { const parsed = file.name.toLowerCase().endsWith(".json") ? JSON.parse(reader.result) : parseSimpleCsv(reader.result), rows = Array.isArray(parsed) ? parsed : Array.isArray(parsed.records) ? parsed.records : [parsed], imported = rows.map((row) => normalizedWearableMetric(row,profile)).filter((item) => item.date); const metrics = loadAthleteMetrics(); writeAthleteMetrics([...imported,...metrics]); byId("wearableImportStatus").textContent = imported.length + " monitoring records imported for " + profile.name + ". Review source consistency before interpreting trends."; showToast(imported.length + " wearable records imported"); } catch (_) { byId("wearableImportStatus").textContent = "That file could not be mapped. Use CSV/JSON fields such as date, restingHr, hrv, sleepHours, rpe, minutes, and load."; } input.value = ""; }; reader.readAsText(file); }
const AUTOMATION_TRIGGER_LABELS = { checkin_stress:"Check-in stress at or above",checkin_adherence:"Check-in adherence at or below",pain:"Pain changes training",review_waiting:"Workout review waiting",plateau:"Strength plateau detected" };
const AUTOMATION_ACTION_LABELS = { alert:"Create trainer alert",reduce:"Suggest reduced session",review:"Open coach review task",reminder:"Create local follow-up reminder" };
function renderAutomationsModule() { const rules = loadAutomations(), alerts = loadAutomationAlerts(); return '<div class="advanced-grid"><section class="advanced-card"><h3>Trainer alert rules</h3><p>Create transparent if/then rules for conditions a coach should review. Rules never modify a workout or message a client automatically.</p><div class="compact-grid"><div class="compact-field wide"><label for="automationName">Rule name</label><input id="automationName" placeholder="High stress follow-up"></div><div class="compact-field"><label for="automationTrigger">If</label><select id="automationTrigger">' + Object.entries(AUTOMATION_TRIGGER_LABELS).map(([key,label]) => '<option value="' + key + '">' + label + '</option>').join("") + '</select></div><div class="compact-field"><label for="automationThreshold">Threshold</label><input id="automationThreshold" type="number" value="4"></div><div class="compact-field wide"><label for="automationAction">Create</label><select id="automationAction">' + Object.entries(AUTOMATION_ACTION_LABELS).map(([key,label]) => '<option value="' + key + '">' + label + '</option>').join("") + '</select></div></div><div class="tool-actions"><button class="small-btn primary" onclick="saveAutomationRule()">Create alert rule</button><button class="small-btn" onclick="runAutomations(true)">Check enabled rules now</button></div></section><section class="advanced-card"><h3>Enabled logic</h3><div class="advanced-list">' + (rules.map((rule) => '<div class="advanced-list-item"><b>' + escapeHtml(rule.name) + (rule.enabled === false ? ' · Paused' : '') + '</b><div class="automation-flow"><span>If ' + escapeHtml(AUTOMATION_TRIGGER_LABELS[rule.trigger]) + ' ' + rule.threshold + '</span><i class="automation-arrow">→</i><span>' + escapeHtml(AUTOMATION_ACTION_LABELS[rule.action]) + '</span></div><div class="tool-actions"><button class="small-btn" onclick="toggleAutomationRule(\'' + escapeHtml(rule.id) + '\')">' + (rule.enabled === false ? 'Enable' : 'Pause') + '</button><button class="small-btn danger" onclick="deleteAutomationRule(\'' + escapeHtml(rule.id) + '\')">Delete</button></div></div>').join("") || '<div class="empty-state">No alert rules yet. The normal dashboard still shows messages, reviews, pain reports, and recognition without custom rules.</div>') + '</div></section><section class="advanced-card wide"><h3>Triggered coach tasks</h3><p>These same items are surfaced in the trainer dashboard so they are not trapped on this page.</p><div class="advanced-list">' + (alerts.slice(0,12).map((alert) => '<div class="advanced-list-item"><b>' + escapeHtml(alert.client + ' · ' + alert.title) + '</b><span>' + new Date(alert.createdAt).toLocaleString() + ' · ' + escapeHtml(alert.actionLabel) + '</span><p>' + escapeHtml(alert.copy) + '</p><div class="tool-actions"><button class="small-btn" onclick="openAdvancedClientRecord(\'' + escapeHtml(alert.profileId || '') + '\',\'coaching\')">Review client</button><button class="small-btn" onclick="dismissAutomationAlert(\'' + escapeHtml(alert.id) + '\')">Mark handled</button></div></div>').join("") || '<div class="empty-state">No alert rule has fired.</div>') + '</div><div class="tool-actions"><button class="small-btn primary" onclick="openCoachDestination(\'dashboard\')">Open trainer dashboard</button></div><div class="capability-note">These rules create in-app coach tasks only. Email, SMS, push, calendar, and cross-system actions require permissioned hosted services, delivery logs, quiet hours, and unsubscribe controls.</div></section></div>'; }
function saveAutomationRule() { if (!requireTrainerMutation("create automations")) return null; const name = byId("automationName").value.trim(); if (!name) { showToast("Add an automation name"); return null; } const rule = { id:"automation-" + Date.now(),name,trigger:byId("automationTrigger").value,threshold:Number(byId("automationThreshold").value),action:byId("automationAction").value,enabled:true,createdAt:new Date().toISOString() }, items = loadAutomations(); items.unshift(rule); if (!writeLocalArray(AUTOMATIONS_KEY,items,200)) return null; renderAdvancedStudio(); showToast("Automation created"); return rule; }
function deleteAutomationRule(id) { if (!requireTrainerMutation("delete automations")) return false; if (!writeLocalArray(AUTOMATIONS_KEY,loadAutomations().filter((item) => item.id !== id),200)) return false; renderAdvancedStudio(); return true; }
function toggleAutomationRule(id) { if (!requireTrainerMutation("change automations")) return false; const rules = loadAutomations(), rule = rules.find((item) => item.id === id); if (!rule) return false; rule.enabled = rule.enabled === false; if (!writeLocalArray(AUTOMATIONS_KEY,rules,200)) return false; renderAdvancedStudio(); return true; }
function dismissAutomationAlert(id) { if (!requireTrainerMutation("handle automation alerts")) return false; if (!writeLocalArray(AUTOMATION_ALERTS_KEY,loadAutomationAlerts().filter((item) => item.id !== id),500)) return false; renderAdvancedStudio(); renderCoachInsights(); showToast("Automation alert marked handled"); return true; }
function automationMatch(rule,profile) { const checkin = weeklyCheckInsForProfile(profile.id)[0], allCheckIns = checkInsForProfile(profile.id), assignment = assignmentForClient(profile.id), workload = workloadSnapshot(profile), threshold = Number(rule.threshold); if (rule.trigger === "checkin_stress") return checkin && Number(checkin.stress) >= threshold; if (rule.trigger === "checkin_adherence") return checkin && Number(checkin.adherence) <= threshold; if (rule.trigger === "pain") return (allCheckIns[0] && Number(allCheckIns[0].pain) >= 2) || (assignment && assignment.clientReview && ["changed","stopped"].includes(assignment.clientReview.pain)); if (rule.trigger === "review_waiting") return assignment && assignmentStatus(assignment) === "completed"; if (rule.trigger === "plateau") return workload.plateaus.length >= Math.max(1,threshold || 1); return false; }
function runAutomations(showResult) { const rules = loadAutomations().filter((rule) => rule.enabled !== false), profiles = loadProfiles(), existing = loadAutomationAlerts(), today = new Date().toISOString().slice(0,10); let fired = 0; rules.forEach((rule) => profiles.forEach((profile) => { if (!automationMatch(rule,profile) || existing.some((alert) => alert.ruleId === rule.id && alert.profileId === profile.id && String(alert.createdAt).slice(0,10) === today)) return; const alert = { id:"alert-" + Date.now() + "-" + Math.random().toString(16).slice(2),ruleId:rule.id,profileId:profile.id,client:profile.name,title:rule.name,action:rule.action,actionLabel:AUTOMATION_ACTION_LABELS[rule.action],copy:"Triggered by: " + AUTOMATION_TRIGGER_LABELS[rule.trigger] + " " + rule.threshold + ". Trainer review required before changing the plan.",createdAt:new Date().toISOString() }; existing.unshift(alert); fired++; })); writeLocalArray(AUTOMATION_ALERTS_KEY,existing,500); if (normalizedAdvancedTab(advancedState.tab) === "alerts" && byId("advancedContent")) renderAdvancedStudio(); renderTrainerAttention(); if (showResult) showToast(fired ? fired + " trainer alerts created" : "No new alert conditions matched"); return fired; }

function exportProgress() {
  const entries = loadProgress(), profiles = loadProfiles(), profileRequests = loadProfileRequests(), inBodyScans = loadInBodyScans(), summaryMeta = loadSummaryMeta(), bodyGoals = loadBodyGoals(), assignedWorkouts = loadAssignedWorkouts();
  const checkIns = loadCheckIns(), athleteMetrics = loadAthleteMetrics(), teams = loadTeams(), mentalPlans = loadMentalPlans(), marketPrograms = loadMarketPrograms(), automations = loadAutomations(), automationAlerts = loadAutomationAlerts();
  const savedPrograms = loadSavedPrograms(), clientMessages = loadLocalArray(CLIENT_MESSAGES_KEY), clientDaily = loadLocalObject(CLIENT_DAILY_KEY,{});
  const progressReceipts = loadProgressReceipts(), progressReceiptResponses = loadLocalArray(PROGRESS_RECEIPT_RESPONSES_KEY);
  const activeWorkoutState = loadActiveWorkoutState(), attentionState = loadAttentionState();
  const ownerRequests = typeof loadOwnerRequests === "function" ? loadOwnerRequests() : [], coachTaskClaims = typeof loadCoachTaskClaims === "function" ? loadCoachTaskClaims() : [], coachNotes = typeof loadCoachNotes === "function" ? loadCoachNotes() : [];
  const calendarEvents = typeof loadCalendarEvents === "function" ? loadCalendarEvents() : [], calendarAudit = typeof loadCalendarAudit === "function" ? loadCalendarAudit() : [], calendarNotices = typeof loadCalendarNotices === "function" ? loadCalendarNotices() : [], workoutRequests = typeof loadWorkoutRequests === "function" ? loadWorkoutRequests() : [];
  const gymBrand = localStorage.getItem(GYM_BRAND_KEY) ? currentGymBrand() : null, gymEquipment = localStorage.getItem(GYM_EQUIPMENT_KEY) ? currentGymEquipment() : null, wearableConnections = loadWearableConnections(), exerciseLibraryEdits = loadExerciseLibraryEdits();
  const advancedCount = checkIns.length + athleteMetrics.length + teams.length + mentalPlans.length + marketPrograms.length + automations.length + automationAlerts.length + exerciseLibraryEdits.length + progressReceipts.length + progressReceiptResponses.length + calendarEvents.length + calendarAudit.length + calendarNotices.length + workoutRequests.length + Object.keys(wearableConnections).length + (gymBrand ? 1 : 0) + (gymEquipment ? 1 : 0);
  if (!entries.length && !profiles.length && !profileRequests.length && !inBodyScans.length && !bodyGoals.length && !assignedWorkouts.length && !activeWorkoutState && !Object.keys(attentionState).length && !advancedCount) { showToast("There is no training data to export"); return; }
  const backup = { version: 15, exportedAt: new Date().toISOString(), entries, profiles, profileRequests, inBodyScans, summaryMeta, bodyGoals, assignedWorkouts, savedPrograms, clientMessages, progressReceipts, progressReceiptResponses, clientDaily, activeWorkoutState, attentionState, checkIns, athleteMetrics, gymBrand, gymEquipment, teams, mentalPlans, marketPrograms, wearableConnections, automations, automationAlerts, exerciseLibraryEdits, ownerRequests, coachTaskClaims, coachNotes, calendarEvents, calendarAudit, calendarNotices, workoutRequests };
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob), a = document.createElement("a");
  a.href = url; a.download = "fit4life-progress-" + new Date().toISOString().slice(0, 10) + ".json"; a.click(); URL.revokeObjectURL(url);
}
function importProgressFile(input) {
  if (!requireTrainerMutation("restore client records")) { if (input) input.value = ""; return; }
  const file = input.files && input.files[0]; if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const backup = JSON.parse(reader.result), importedEntries = Array.isArray(backup.entries) ? backup.entries : [], importedProfiles = Array.isArray(backup.profiles) ? backup.profiles : [], importedRequests = Array.isArray(backup.profileRequests) ? backup.profileRequests : [], importedScans = Array.isArray(backup.inBodyScans) ? backup.inBodyScans : [], importedGoals = Array.isArray(backup.bodyGoals) ? backup.bodyGoals : [], importedAssignments = Array.isArray(backup.assignedWorkouts) ? backup.assignedWorkouts : [], importedPrograms = Array.isArray(backup.savedPrograms) ? backup.savedPrograms : [], importedMessages = Array.isArray(backup.clientMessages) ? backup.clientMessages : [];
      const importedProgressReceipts = Array.isArray(backup.progressReceipts) ? backup.progressReceipts : [], importedProgressReceiptResponses = Array.isArray(backup.progressReceiptResponses) ? backup.progressReceiptResponses : [];
      const importedCheckIns = Array.isArray(backup.checkIns) ? backup.checkIns : [], importedAthleteMetrics = Array.isArray(backup.athleteMetrics) ? backup.athleteMetrics : [], importedTeams = Array.isArray(backup.teams) ? backup.teams : [], importedMentalPlans = Array.isArray(backup.mentalPlans) ? backup.mentalPlans : [], importedMarketPrograms = Array.isArray(backup.marketPrograms) ? backup.marketPrograms : [], importedAutomations = Array.isArray(backup.automations) ? backup.automations : [], importedAlerts = Array.isArray(backup.automationAlerts) ? backup.automationAlerts : [], importedExerciseLibraryEdits = Array.isArray(backup.exerciseLibraryEdits) ? backup.exerciseLibraryEdits : [];
      const importedOwnerRequests = Array.isArray(backup.ownerRequests) ? backup.ownerRequests : [], importedCoachTaskClaims = Array.isArray(backup.coachTaskClaims) ? backup.coachTaskClaims : [], importedCoachNotes = Array.isArray(backup.coachNotes) ? backup.coachNotes : [];
      const importedCalendarEvents = Array.isArray(backup.calendarEvents) ? backup.calendarEvents : [], importedCalendarAudit = Array.isArray(backup.calendarAudit) ? backup.calendarAudit : [], importedCalendarNotices = Array.isArray(backup.calendarNotices) ? backup.calendarNotices : [], importedWorkoutRequests = Array.isArray(backup.workoutRequests) ? backup.workoutRequests : [];
      const advancedCount = importedCheckIns.length + importedAthleteMetrics.length + importedTeams.length + importedMentalPlans.length + importedMarketPrograms.length + importedAutomations.length + importedAlerts.length + importedExerciseLibraryEdits.length + importedProgressReceipts.length + importedProgressReceiptResponses.length + importedCalendarEvents.length + importedCalendarAudit.length + importedCalendarNotices.length + importedWorkoutRequests.length + (backup.gymBrand ? 1 : 0) + (backup.gymEquipment ? 1 : 0) + (backup.wearableConnections && Object.keys(backup.wearableConnections).length ? 1 : 0);
      if (!importedEntries.length && !importedProfiles.length && !importedRequests.length && !importedScans.length && !importedGoals.length && !importedAssignments.length && !advancedCount) throw new Error("empty");
      const entries = loadProgress(), ids = new Set(entries.map((e) => e.id));
      importedEntries.forEach((entry) => { if (entry && entry.id && !ids.has(entry.id)) { entries.push(entry); ids.add(entry.id); } });
      entries.sort((a, b) => String(b.date || "").localeCompare(String(a.date || ""))); writeProgress(entries);
      const profiles = loadProfiles(); let restoredProfiles = 0, skippedProfiles = 0;
      importedProfiles.forEach((profile) => {
        if (!profile || !profile.name) return;
        const username = normalizeUsername(profile.username || usernameFromName(profile.name)), sameId = profiles.findIndex((item) => item.id === profile.id);
        const conflict = findProfileConflict(profiles, profile.name, username, sameId >= 0 ? profile.id : "");
        if (conflict) { skippedProfiles++; return; }
        const restored = { ...profile, username };
        if (sameId >= 0) profiles[sameId] = restored; else profiles.push(restored); restoredProfiles++;
      });
      writeProfiles(profiles);
      const requests = loadProfileRequests(); importedRequests.forEach((request) => { if (!request || !request.name) return; if (!findProfileConflict(profiles,request.name,request.username) && !findProfileConflict(requests,request.name,request.username)) requests.push({ ...request, username: normalizeUsername(request.username || usernameFromName(request.name)) }); }); writeProfileRequests(requests);
      const scans = loadInBodyScans(), scanIds = new Set(scans.map((scan) => scan.id)); importedScans.forEach((scan) => { if (scan && scan.id && !scanIds.has(scan.id)) { scans.push(scan); scanIds.add(scan.id); } }); writeInBodyScans(scans);
      const goals = loadBodyGoals(); importedGoals.forEach((goal) => { if (!goal || !goal.client) return; const index = goals.findIndex((item) => item.id === goal.id || clientMatches(item.client, goal.client)); if (index >= 0) goals[index] = goal; else goals.push(goal); }); writeBodyGoals(goals);
      const assignments = loadAssignedWorkouts(); importedAssignments.forEach((assignment) => {
        if (!assignment || !assignment.session) return; const profile = profiles.find((item) => item.id === assignment.profileId) || profiles.find((item) => clientMatches(item.name,assignment.client)); if (!profile) return;
        const restored = { ...assignment, id:assignment.id || "assignment-" + Date.now() + "-" + Math.random().toString(16).slice(2), status:assignment.status || "assigned", profileId:profile.id, client:profile.name };
        const index = assignments.findIndex((item) => item.id === restored.id || (restored.programId && item.profileId === profile.id && item.programId === restored.programId && Number(item.programWeek) === Number(restored.programWeek) && Number(item.programDay) === Number(restored.programDay)));
        if (index >= 0) assignments[index] = restored; else assignments.push(restored);
      }); writeAssignedWorkouts(assignments);
      const mergeRecords = (current, imported) => { const merged = [...current], ids = new Set(merged.map((item) => item && item.id).filter(Boolean)); imported.forEach((item) => { if (item && item.id && !ids.has(item.id)) { merged.push(item); ids.add(item.id); } }); return merged; };
      writeSavedPrograms(mergeRecords(loadSavedPrograms(),importedPrograms));
      writeLocalArray(CLIENT_MESSAGES_KEY,mergeRecords(loadLocalArray(CLIENT_MESSAGES_KEY),importedMessages),1000);
      writeProgressReceipts(mergeRecords(loadProgressReceipts(),importedProgressReceipts));
      writeLocalArray(PROGRESS_RECEIPT_RESPONSES_KEY,mergeRecords(loadLocalArray(PROGRESS_RECEIPT_RESPONSES_KEY),importedProgressReceiptResponses),1000);
      if (backup.clientDaily && typeof backup.clientDaily === "object" && !Array.isArray(backup.clientDaily)) writeLocalObject(CLIENT_DAILY_KEY,Object.assign(loadLocalObject(CLIENT_DAILY_KEY,{}),backup.clientDaily));
      if (backup.activeWorkoutState && typeof backup.activeWorkoutState === "object" && !Array.isArray(backup.activeWorkoutState)) localStorage.setItem(ACTIVE_WORKOUT_KEY,JSON.stringify(backup.activeWorkoutState));
      if (backup.attentionState && typeof backup.attentionState === "object" && !Array.isArray(backup.attentionState)) writeLocalObject(ATTENTION_STATE_KEY,Object.assign(loadAttentionState(),backup.attentionState));
      if (backup.summaryMeta && typeof backup.summaryMeta === "object") writeSummaryMeta(Object.assign(loadSummaryMeta(), backup.summaryMeta));
      writeCheckIns(mergeRecords(loadCheckIns(),importedCheckIns));
      writeAthleteMetrics(mergeRecords(loadAthleteMetrics(),importedAthleteMetrics));
      writeLocalArray(TEAMS_KEY,mergeRecords(loadTeams(),importedTeams),200);
      writeLocalArray(MENTAL_PLANS_KEY,mergeRecords(loadMentalPlans(),importedMentalPlans),500);
      writeLocalArray(MARKET_PROGRAMS_KEY,mergeRecords(loadMarketPrograms(),importedMarketPrograms),500);
      writeLocalArray(AUTOMATIONS_KEY,mergeRecords(loadAutomations(),importedAutomations),200);
      writeLocalArray(AUTOMATION_ALERTS_KEY,mergeRecords(loadAutomationAlerts(),importedAlerts),500);
      writeExerciseLibraryEdits(mergeRecords(loadExerciseLibraryEdits(),importedExerciseLibraryEdits));
      if (typeof OWNER_REQUESTS_KEY !== "undefined") writeLocalArray(OWNER_REQUESTS_KEY,mergeRecords(loadOwnerRequests(),importedOwnerRequests),500);
      if (typeof COACH_TASK_CLAIMS_KEY !== "undefined") writeLocalArray(COACH_TASK_CLAIMS_KEY,mergeRecords(loadCoachTaskClaims(),importedCoachTaskClaims),500);
      if (typeof COACH_NOTES_KEY !== "undefined") writeLocalArray(COACH_NOTES_KEY,mergeRecords(loadCoachNotes(),importedCoachNotes),1000);
      if (typeof CALENDAR_EVENTS_KEY !== "undefined") writeLocalArray(CALENDAR_EVENTS_KEY,mergeRecords(loadCalendarEvents(),importedCalendarEvents),2000);
      if (typeof CALENDAR_AUDIT_KEY !== "undefined") writeLocalArray(CALENDAR_AUDIT_KEY,mergeRecords(loadCalendarAudit(),importedCalendarAudit),2000);
      if (typeof CALENDAR_NOTICES_KEY !== "undefined") writeLocalArray(CALENDAR_NOTICES_KEY,mergeRecords(loadCalendarNotices(),importedCalendarNotices),1000);
      if (typeof WORKOUT_REQUESTS_KEY !== "undefined") writeLocalArray(WORKOUT_REQUESTS_KEY,mergeRecords(loadWorkoutRequests(),importedWorkoutRequests),500);
      applyExerciseLibraryEdits();
      if (backup.gymBrand && typeof backup.gymBrand === "object") writeLocalObject(GYM_BRAND_KEY,backup.gymBrand);
      if (backup.gymEquipment && typeof backup.gymEquipment === "object") writeLocalObject(GYM_EQUIPMENT_KEY,backup.gymEquipment);
      if (backup.wearableConnections && typeof backup.wearableConnections === "object") writeLocalObject(WEARABLE_CONNECTIONS_KEY,Object.assign(loadWearableConnections(),backup.wearableConnections));
      applyGymBrand(); refreshProfileSelects(); renderProgressHistory(); showToast("Backup restored: " + importedEntries.length + " history entries, " + restoredProfiles + " profiles, and " + advancedCount + " advanced coaching records" + (skippedProfiles ? ". " + skippedProfiles + " duplicate or near-duplicate profiles were skipped." : ""));
    } catch (_) { showToast("That file is not a valid FIT4LIFE backup"); }
    input.value = "";
  };
  reader.onerror = () => { showToast("The backup file could not be read"); input.value = ""; };
  reader.readAsText(file);
}
function clearProgress() {
  if (!requireTrainerMutation("clear client history")) return;
  if (!loadProgress().length) { showToast("Progress history is already empty"); return; }
  if (!window.confirm("Clear all on-device FIT4LIFE progress history? This cannot be undone unless you exported a backup.")) return;
  writeProgress([]); renderProgressHistory(); showToast("Progress history cleared");
}

function EXP_LABEL(n) { return n === 1 ? "New" : n === 2 ? "Intermediate" : "Advanced"; }
