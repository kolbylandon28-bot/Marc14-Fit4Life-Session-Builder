/* ---------- Private trainer hub + coaching analysis ---------- */
let selectedTrainerClient = "";
const SUMMARY_META_KEY = "fit4life_summary_meta_v1";
const INBODY_KEY = "fit4life_inbody_v1";
const BODY_GOALS_KEY = "fit4life_body_goals_v1";
let trainerSummaryState = newTrainerSummaryState();
let pendingInBodyFile = null;
let selectedHumanSegment = "trunk";
let humanScanMode = "lean";
let selectedInBodyScanId = "";
function newTrainerSummaryState() {
  return { tab: "overview", range: "all", from: "", to: "", category: "all", exercise: "all", goal: "all", session: "all", flag: "all", trainer: "all", view: "chart", inbodyFocus: false, compare: [] };
}
function loadSummaryMeta() {
  try { const data = JSON.parse(localStorage.getItem(SUMMARY_META_KEY) || "{}"); return data && typeof data === "object" && !Array.isArray(data) ? data : {}; }
  catch (_) { return {}; }
}
function writeSummaryMeta(meta) {
  try { localStorage.setItem(SUMMARY_META_KEY, JSON.stringify(meta)); return true; }
  catch (_) { showToast("This browser could not save the summary organization"); return false; }
}
function summaryMetaFor(entryOrId) {
  const id = typeof entryOrId === "string" ? entryOrId : entryOrId && entryOrId.id;
  return id ? (loadSummaryMeta()[id] || {}) : {};
}
function loadInBodyScans() {
  try { const data = JSON.parse(localStorage.getItem(INBODY_KEY) || "[]"); return Array.isArray(data) ? data : []; }
  catch (_) { return []; }
}
function writeInBodyScans(scans) {
  try { localStorage.setItem(INBODY_KEY, JSON.stringify(scans.slice(0, 500))); return true; }
  catch (_) { showToast("This browser could not save the InBody scan values"); return false; }
}
function inBodyScansFor(client) {
  return loadInBodyScans().filter((scan) => clientMatches(scan.client, client)).sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")));
}
function loadBodyGoals() {
  try { const data = JSON.parse(localStorage.getItem(BODY_GOALS_KEY) || "[]"); return Array.isArray(data) ? data : []; }
  catch (_) { return []; }
}
function writeBodyGoals(goals) {
  try { localStorage.setItem(BODY_GOALS_KEY, JSON.stringify(goals.slice(0, 500))); return true; }
  catch (_) { showToast("This browser could not save the body-composition goals"); return false; }
}
function bodyGoalFor(client) { return loadBodyGoals().find((goal) => clientMatches(goal.client, client)) || null; }
function exerciseRecord(label) {
  const name = String(label || "").trim().toLowerCase();
  return findExerciseByName(name) || null;
}
function automaticExerciseCategory(label) {
  const exercise = exerciseRecord(label);
  if (exercise) {
    if (["h_push", "v_push", "h_pull", "v_pull"].includes(exercise.pattern) || ["push", "pull"].includes(exercise.region)) return "upper";
    if (["squat", "hinge", "lunge", "carry", "plyo", "olympic"].includes(exercise.pattern) || exercise.region === "lower") return "lower";
    if (["core", "rotation"].includes(exercise.pattern) || exercise.region === "core") return "core";
    if (exercise.pattern === "conditioning" || exercise.region === "cardio") return "conditioning";
  }
  const text = String(label || "").toLowerCase();
  if (/squat|deadlift|lunge|leg |hamstring|calf|hip thrust|glute/.test(text)) return "lower";
  if (/press|row|pull|curl|fly|raise|tricep|shoulder|chest/.test(text)) return "upper";
  if (/plank|pallof|crunch|rotation|ab |core/.test(text)) return "core";
  if (/bike|rower|treadmill|run|walk|jump rope|interval/.test(text)) return "conditioning";
  return "other";
}
function exerciseSubcategory(label) {
  const exercise = exerciseRecord(label), pattern = exercise ? exercise.pattern : "";
  const labels = { h_push: "Horizontal press", v_push: "Vertical press", h_pull: "Horizontal pull", v_pull: "Vertical pull", squat: "Squat", hinge: "Hinge / deadlift", lunge: "Single-leg", core: "Core stability", rotation: "Rotation", conditioning: "Work capacity", carry: "Carry", plyo: "Power", olympic: "Power" };
  return labels[pattern] || (automaticExerciseCategory(label) === "upper" ? "Upper accessory" : automaticExerciseCategory(label) === "lower" ? "Lower accessory" : "General");
}
function entryCategory(entry) {
  const override = summaryMetaFor(entry).category;
  return override || (entry && entry.type === "set" ? automaticExerciseCategory(entry.label) : "other");
}
function sessionKeyForEntry(entry) { return entry.sessionId || "day-" + String(entry.date || "").slice(0, 10); }
function trainerSessionGroups(entries) {
  const groups = new Map();
  entries.forEach((entry) => {
    const key = sessionKeyForEntry(entry);
    if (!groups.has(key)) groups.set(key, { key, entries: [], sets: [], workouts: [], date: entry.date });
    const group = groups.get(key); group.entries.push(entry);
    if (entry.type === "set") group.sets.push(entry);
    if (entry.type === "workout") group.workouts.push(entry);
    if (String(entry.date || "") > String(group.date || "")) group.date = entry.date;
  });
  return [...groups.values()].map((group) => {
    const review = group.workouts[0] || null;
    group.title = review ? review.label : group.sets.length ? "Training log" : (group.entries[0].label || "Client activity");
    group.categories = [...new Set([...group.sets.map(entryCategory), ...group.entries.map((entry) => summaryMetaFor(entry).category)].filter((category) => category && category !== "other"))];
    group.exercises = [...new Set(group.sets.map((entry) => entry.label))];
    group.goals = review && review.data && review.data.goals ? review.data.goals : [];
    group.pinned = group.entries.some((entry) => summaryMetaFor(entry).pinned);
    group.trainers = [...new Set(group.entries.map((entry) => summaryMetaFor(entry).trainer).filter(Boolean))];
    return group;
  }).sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")));
}
function trainerClientNames() {
  // A walkthrough runs on one practice client. The directory otherwise unions six stores,
  // so a real client whose name sorts first would be highlighted and opened instead.
  if (typeof practiceModeActive === "function" && practiceModeActive()) {
    const practice = typeof practiceProfileIds === "function" ? practiceProfileIds() : [PRACTICE_CLIENT_ID];
    return loadProfiles().filter((profile) => practice.includes(profile.id)).map((profile) => profile.name);
  }
  return [...loadProfiles().map((profile) => profile.name), ...loadProgress().map((entry) => entry.client).filter(Boolean), ...loadInBodyScans().map((scan) => scan.client).filter(Boolean), ...loadBodyGoals().map((goal) => goal.client).filter(Boolean), ...loadCheckIns().map((item) => item.client).filter(Boolean), ...loadAthleteMetrics().map((item) => item.client).filter(Boolean)]
    .filter((name) => name && name !== "Client")
    .filter((name, index, names) => names.findIndex((other) => clientMatches(other, name)) === index)
    .sort((a, b) => a.localeCompare(b));
}
function trainerProfileFor(client) { return loadProfiles().find((profile) => clientMatches(profile.name, client)) || null; }
function trainerEntriesFor(client) { return loadProgress().filter((entry) => clientMatches(entry.client, client)); }
function renderProfileRequests() {
  const container = byId("profileRequestQueue"); if (!container) return;
  const requests = loadProfileRequests(), accountRequests = Array.isArray(window.fit4lifeCloudRegistrationRequests) ? window.fit4lifeCloudRegistrationRequests.filter((request) => request.requested_role !== "trainer") : [];
  container.innerHTML = ""; container.className = requests.length || accountRequests.length ? "request-queue" : "";
  if (!requests.length && !accountRequests.length) return;
  if (accountRequests.length) {
    const accountHead = el("div", "request-queue-head"), accountLabel = el("div", "result-label", "Account requests"), accountCount = el("span", "request-count", accountRequests.length + " waiting"); accountHead.append(accountLabel,accountCount); container.appendChild(accountHead);
    accountRequests.forEach((request) => {
      const card = el("article", "request-card"), name = el("strong", "", request.full_name || "New client"), username = el("span", "", "@" + normalizeUsername(request.username || usernameFromName(request.full_name || "client")) + " · " + (request.email || "No email")), actions = el("div", "profile-actions");
      const approve = el("button", "small-btn primary", "Approve account"), reject = el("button", "small-btn", "Reject"); approve.type = reject.type = "button";
      approve.onclick = async () => { approve.disabled = true; approve.textContent = "Approving…"; const saved = await window.fit4lifeCloudApproveRegistration(request.id); if (!saved) { approve.disabled = false; approve.textContent = "Approve account"; } };
      reject.onclick = () => window.fit4lifeCloudRejectRegistration(request.id);
      actions.append(approve,reject); card.append(name,username,actions); container.appendChild(card);
    });
  }
  if (!requests.length) return;
  const head = el("div", "request-queue-head"), label = el("div", "result-label", "Profile-only requests"), count = el("span", "request-count", requests.length + " waiting"); head.append(label,count); container.appendChild(head);
  requests.forEach((request) => {
    const card = el("article", "request-card"), name = el("strong", "", request.name), username = el("span", "", "@" + normalizeUsername(request.username)), actions = el("div", "profile-actions");
    const approve = el("button", "small-btn primary", "Approve & create"), dismiss = el("button", "small-btn", "Dismiss"); approve.type = dismiss.type = "button"; approve.onclick = () => approveProfileRequest(request.id); dismiss.onclick = () => dismissProfileRequest(request.id);
    actions.append(approve,dismiss); card.append(name,username,actions); container.appendChild(card);
  });
}
function insightNames(names, empty) { return names.length ? names.slice(0,3).join(", ") + (names.length > 3 ? " +" + (names.length - 3) + " more" : "") : empty; }
function renderCoachInsights() {
  const container = byId("coachInsights"); if (!container) return;
  const names = trainerClientNames(), now = Date.now(), safety = [], progression = [], followUp = [], formalDue = loadProfiles().filter((profile) => formalReviewStatus(profile).due).map((profile) => profile.name), awaiting = loadAssignedWorkouts().filter((item) => assignmentStatus(item) === "completed").map((item) => item.client), checkinWaiting = loadCheckIns().filter((item) => !item.reviewedAt).map((item) => item.client).filter((name,index,names) => names.indexOf(name) === index), automationClients = loadAutomationAlerts().map((item) => item.client).filter((name,index,names) => name && names.indexOf(name) === index);
  names.forEach((name) => {
    const entries = trainerEntriesFor(name), latestReviewEntry = entries.find((entry) => entry.type === "workout" && entry.data), latest = entries[0];
    const review = latestReviewEntry && latestReviewEntry.data;
    if (review && ["changed","stopped"].includes(review.pain)) safety.push(name);
    if (review && recommendedCoachAction(review) === "progress") progression.push(name);
    if (!latest || now - new Date(latest.date).getTime() > 21 * 86400000) followUp.push(name);
  });
  const cards = [
    ["Awaiting review", insightNames(awaiting,"No client reviews waiting"), awaiting.length ? "warn" : "good"],
    ["Four-week reviews", insightNames(formalDue,"No formal reviews due"), formalDue.length ? "warn" : "good"],
    ["Check-ins waiting", insightNames(checkinWaiting,"No weekly check-ins waiting"), checkinWaiting.length ? "warn" : "good"],
    ["Automation alerts", insightNames(automationClients,"No active automation alerts"), automationClients.length ? "warn" : "good"],
    ["Pain trend", insightNames(safety,"No active pain flags"), safety.length ? "warn" : "good"],
    ["Ready to progress", insightNames(progression,"No clear progression signal yet"), progression.length ? "good" : ""],
    ["Needs follow-up", insightNames(followUp,"Everyone has recent activity"), followUp.length ? "warn" : "good"],
  ];
  container.innerHTML = cards.map(([title,copy,tone]) => '<div class="coach-insight ' + tone + '"><b>' + title + '</b><span>' + escapeHtml(copy) + '</span></div>').join("");
}
function renderTrainerHub(preferredClient) {
  if (!trainerIsUnlocked()) return false;
  const names = trainerClientNames();
  if (preferredClient && names.some((name) => clientMatches(name, preferredClient))) selectedTrainerClient = names.find((name) => clientMatches(name, preferredClient));
  else if (!selectedTrainerClient || !names.some((name) => clientMatches(name, selectedTrainerClient))) selectedTrainerClient = names[0] || "";
  renderTrainerKpis(); renderCoachInsights(); renderProfileRequests(); renderTrainerDirectory();
  if (selectedTrainerClient) renderTrainerAnalysis(selectedTrainerClient);
  else byId("trainerReport").innerHTML = '<div class="empty-state">No clients yet. Add a client profile or log a named workout to begin.</div>';
  return true;
}
function renderTrainerKpis() {
  const container = byId("trainerKpis"); if (!container) return;
  const entries = loadProgress(), reviews = entries.filter((entry) => entry.type === "workout" && entry.data), assignments = loadAssignedWorkouts();
  const flagged = new Set(reviews.filter((entry) => ["changed", "stopped"].includes(entry.data.pain)).map((entry) => String(entry.client).toLowerCase()));
  container.innerHTML = [
    [trainerClientNames().length, "clients in directory"], [assignments.filter((item) => ["assigned","in_progress"].includes(assignmentStatus(item))).length, "active assignments"], [assignments.filter((item) => assignmentStatus(item) === "completed").length, "awaiting coach review"], [flagged.size, "clients with safety flags"],
  ].map(([value, label]) => '<div class="trainer-kpi"><b>' + value + '</b><span>' + label + '</span></div>').join("");
}
function renderTrainerDirectory() {
  const container = byId("trainerClientList"); if (!container) return;
  const query = (byId("trainerClientSearch").value || "").trim().toLowerCase();
  const scope = byId("trainerClientScope") && byId("trainerClientScope").value || "all", identity = currentAccountIdentity();
  const names = trainerClientNames().filter((name) => { const profile = trainerProfileFor(name), matchesScope = scope === "mine" ? Boolean(profile && profile.assignedTrainerId && profile.assignedTrainerId === identity.id) : scope === "shared" ? Boolean(!profile || !profile.assignedTrainerId) : true; return name.toLowerCase().includes(query) && matchesScope; }); container.innerHTML = "";
  if (!names.length) { container.appendChild(el("div", "empty-state", query ? "No matching clients." : "No clients yet.")); return; }
  names.forEach((name) => {
    const profile = trainerProfileFor(name), entries = trainerEntriesFor(name), last = entries[0], lastReview = entries.find((entry) => entry.type === "workout" && entry.data);
    const assignment = profile ? assignmentForClient(profile.id) : assignmentForClient(name), waiting = assignment && assignmentStatus(assignment) === "completed", active = assignment && ["assigned","in_progress"].includes(assignmentStatus(assignment));
    const goals = profile && profile.goals && profile.goals.length ? profile.goals.map((goal) => GOALS[goal] ? GOALS[goal].label : goal).join(" + ") : "No saved goal";
    const button = el("button", "client-row" + (clientMatches(name, selectedTrainerClient) ? " on" : "")); button.type = "button";
    const rowStatus = waiting ? "Awaiting trainer review" : lastReview && ["changed", "stopped"].includes(lastReview.data.pain) ? "Safety flag · " + (lastReview.data.injuryArea ? INJURY_LABELS[lastReview.data.injuryArea] : "pain reported") : active ? assignmentStatusLabel(assignment) : last ? "Last activity " + new Date(last.date).toLocaleDateString() : "Profile only";
    const ownership = profile && profile.assignedTrainerId ? (profile.assignedTrainerId === identity.id ? "Primary coach · you" : "Primary coach · " + (profile.assignedTrainerName || "assigned")) : "Shared client";
    const noLogin = profile && profile.onboardingStatus === "imported";
    button.append(el("strong", "", name), el("span", "", (noLogin ? "No login yet · " : "") + ownership + " · " + (profile ? "@" + profileUsername(profile) + " · " : "") + goals), el("span", waiting || (lastReview && ["changed", "stopped"].includes(lastReview.data.pain)) ? "client-alert" : "", rowStatus));
    // One badge per client showing their single highest-priority open item. A cluster of
    // indicators would just recreate the noise problem on a smaller surface.
    const badge = typeof clientAttentionBadge === "function" && profile ? clientAttentionBadge(profile.id) : null;
    if (badge) { const chip = el("span", "client-alert-badge " + badge.tone, badge.label); chip.title = badge.count > 1 ? badge.count + " open items · showing the most urgent" : badge.label; button.append(chip); }
    button.onclick = () => selectTrainerClient(name); container.appendChild(button);
  });
}
function selectTrainerClient(client) { selectedTrainerClient = client; selectedInBodyScanId = ""; trainerSummaryState = newTrainerSummaryState(); renderTrainerDirectory(); renderTrainerAnalysis(client); }
function clampScore(value) { return Math.max(0, Math.min(100, Math.round(Number(value) || 0))); }
function estimatedOneRm(data) {
  if (!data || data.load == null || !Number.isFinite(Number(data.load)) || Number(data.load) <= 0 || !Number.isFinite(Number(data.reps)) || Number(data.reps) < 1 || Number(data.reps) > 20 || data.unit === "bodyweight") return null;
  return Number(data.load) * (1 + Number(data.reps) / 30);
}
function trainerAnalysisData(client) {
  const profile = trainerProfileFor(client), entries = trainerEntriesFor(client);
  const workouts = entries.filter((entry) => entry.type === "workout" && entry.data), sets = entries.filter((entry) => entry.type === "set"), strengthSets = sets.filter((entry) => !summaryMetaFor(entry).excluded), readinessEntry = entries.find((entry) => entry.type === "readiness");
  const latestReview = workouts[0] ? workouts[0].data : null;
  const goals = profile && profile.goals && profile.goals.length ? profile.goals : latestReview && latestReview.goals && latestReview.goals.length ? latestReview.goals : ["general"];
  const primaryGoal = goals[0] || "general", cutoff = Date.now() - 42 * 86400000;
  const recentWorkouts = workouts.filter((entry) => new Date(entry.date).getTime() >= cutoff), recentSets = strengthSets.filter((entry) => new Date(entry.date).getTime() >= cutoff);
  const completionMap = { all: 100, most: 80, some: 50, stopped: 20 };
  const completion = recentWorkouts.length ? clampScore(recentWorkouts.reduce((sum, entry) => sum + (completionMap[entry.data.completion] || 0), 0) / recentWorkouts.length) : 0;
  const targetDifficulty = primaryGoal === "recovery" ? 5 : ["general", "fatloss"].includes(primaryGoal) ? 7 : 8;
  const efforts = recentWorkouts.map((entry) => Number(entry.data.difficulty)).filter(Number.isFinite);
  const effortFit = efforts.length ? clampScore(100 - Math.abs(efforts.reduce((a, b) => a + b, 0) / efforts.length - targetDifficulty) * 22) : 0;
  const consistency = clampScore((recentWorkouts.length / 6) * 100);
  const readiness = readinessEntry ? clampScore(parseInt(readinessEntry.value, 10)) : 0;
  const recentPain = recentWorkouts.slice(0, 6).map((entry) => entry.data.pain);
  const safety = recentPain.includes("stopped") ? 10 : recentPain.includes("changed") ? 35 : recentPain.includes("mild") ? 70 : recentWorkouts.length ? 100 : 0;
  const groups = new Map();
  strengthSets.forEach((entry) => { if (!groups.has(entry.label)) groups.set(entry.label, []); groups.get(entry.label).push(entry); });
  const exercises = [...groups.entries()].map(([label, exerciseSets]) => {
    const latest = exerciseSets.find((entry) => entry.data) || exerciseSets[0], latestData = latest.data || {};
    const latestEstimate = estimatedOneRm(latestData), previous = exerciseSets.find((entry) => entry !== latest && entry.sessionId !== latest.sessionId && estimatedOneRm(entry.data) != null && entry.data.unit === latestData.unit);
    const previousEstimate = previous ? estimatedOneRm(previous.data) : null;
    const trend = latestEstimate != null && previousEstimate ? ((latestEstimate - previousEstimate) / previousEstimate) * 100 : null;
    return { label, latest, trend, estimate: latestEstimate, exercise: findExerciseByName(label) || null };
  });
  const trends = exercises.map((item) => item.trend).filter((value) => value != null && Number.isFinite(value));
  const averageTrend = trends.length ? trends.reduce((a, b) => a + b, 0) / trends.length : null;
  const comparableExercises = trends.length;
  const evidenceLevel = recentWorkouts.length >= 6 && comparableExercises >= 2 ? "Strong"
    : recentWorkouts.length >= 3 && (comparableExercises >= 1 || recentSets.length >= 12) ? "Developing"
      : recentWorkouts.length || recentSets.length ? "Baseline" : "No data";
  const evidenceDetail = recentWorkouts.length + " reviewed workout" + (recentWorkouts.length === 1 ? "" : "s") + " · " + recentSets.length + " included strength set" + (recentSets.length === 1 ? "" : "s") + " · " + comparableExercises + " comparable exercise" + (comparableExercises === 1 ? "" : "s") + " in the last 6 weeks";
  const strengthProgress = averageTrend == null ? 0 : clampScore(50 + averageTrend * 5);
  const regionDefinitions = [
    { key: "upper", label: "Upper body", muscles: ["chest", "back", "shoulders", "arms"] },
    { key: "lower", label: "Lower body", muscles: ["quads", "hamstrings", "glutes", "calves"] },
    { key: "core", label: "Core & engine", muscles: ["core"] },
  ];
  const regions = regionDefinitions.map((region) => {
    const matches = recentSets.filter((entry) => {
      const exercise = findExerciseByName(entry.label); if (!exercise) return false;
      if (region.key === "core") return exercise.region === "core" || exercise.region === "cardio" || exercise.pattern === "conditioning" || (exercise.muscles || []).includes("core");
      return (exercise.muscles || []).some((muscle) => region.muscles.includes(muscle));
    });
    const unique = [...new Set(matches.map((entry) => entry.label))];
    const regionTrends = exercises.filter((item) => item.exercise && (item.exercise.muscles || []).some((muscle) => region.muscles.includes(muscle))).map((item) => item.trend).filter((value) => value != null);
    const trendPoints = regionTrends.length ? clampScore(50 + (regionTrends.reduce((a, b) => a + b, 0) / regionTrends.length) * 5) * .4 : Math.min(40, unique.length * 10);
    const score = matches.length ? clampScore(Math.min(60, matches.length / 8 * 60) + trendPoints) : 0;
    const target = !!(profile && (profile.muscles || []).some((muscle) => region.muscles.includes(muscle)));
    return { ...region, sets: matches.length, exercises: unique.length, score, target };
  });
  const injuryAreas = [...new Set(workouts.filter((entry) => entry.data.pain && entry.data.pain !== "none" && entry.data.injuryArea).map((entry) => entry.data.injuryArea))];
  let priority = "Log completed sets and finish reviews to build a useful coaching baseline.", clientPriority = "Log your sets and finish your workout reviews so your coach can see how training is going.";
  if (latestReview && ["changed", "stopped"].includes(latestReview.pain)) { priority = "Safety first: keep " + (latestReview.injuryArea ? INJURY_LABELS[latestReview.injuryArea].toLowerCase() : "the painful area") + " filtered and do not repeat the aggravating movement unchanged. Refer out for sharp, worsening, or unexplained symptoms."; clientPriority = "You reported pain in " + (latestReview.injuryArea ? INJURY_LABELS[latestReview.injuryArea].toLowerCase() : "an area") + ". Your workouts will avoid it until it settles \u2014 tell your coach if it changes."; }
  else if (readiness && readiness < 50) { priority = "Readiness is currently low. Reduce volume, simplify exercise choices, and reassess during the warm-up."; clientPriority = "You have not been recovering well lately, so your next session will be lighter and simpler. See how the warm-up feels."; }
  else if (!workouts.length) { priority = "Complete the first post-workout review so progress toward the client’s goal, effort, completion, and safety can be evaluated."; clientPriority = "Finish your first workout review so your coach can see how it went and plan the next one around your goal."; }
  else if (["strength", "hypertrophy"].includes(primaryGoal) && averageTrend == null) { priority = "Repeat key lifts across separate workouts to establish a strength trend relative to the client’s goal."; clientPriority = "Repeat the same main lifts across a few workouts so your progress becomes visible."; }
  else if (completion < 70) { priority = "Completion is below target. Shorten the next session or reduce accessory volume before adding load."; clientPriority = "You have been finishing less than planned, so the next session will be shorter before anything gets heavier."; }
  else if (effortFit < 65) { priority = "Effort is missing the goal’s target range. Adjust load so the workout lands closer to RPE " + targetDifficulty + "."; clientPriority = "Your sessions are landing easier or harder than planned. Your coach will adjust the weights so they feel about right."; }
  else if (averageTrend != null && averageTrend > 0) { priority = "Strength is trending upward. Progress one variable at a time while preserving completion and technique."; clientPriority = "Your strength is trending up. Your coach will add a little at a time so your form holds."; }
  else { priority = "The plan is matching the goal. Repeat successful loads and progress the exercises that remain controlled."; clientPriority = "This is working. Keep repeating the loads that felt right, and the exercises you control well will move up."; }
  return { client, profile, clientPriority, entries, workouts, sets, strengthSets, recentWorkouts, recentSets, exercises, goals, primaryGoal, completion, consistency, effortFit, readiness, safety, strengthProgress, averageTrend, comparableExercises, evidenceLevel, evidenceDetail, regions, injuryAreas, priority };
}
function summaryDateMatches(date) {
  const stamp = new Date(date).getTime(); if (!Number.isFinite(stamp)) return false;
  const stateFilter = trainerSummaryState;
  if (stateFilter.range === "30" && stamp < Date.now() - 30 * 86400000) return false;
  if (stateFilter.range === "90" && stamp < Date.now() - 90 * 86400000) return false;
  if (stateFilter.range === "year" && stamp < Date.now() - 365 * 86400000) return false;
  if (stateFilter.range === "custom") {
    if (stateFilter.from && stamp < new Date(stateFilter.from + "T00:00:00").getTime()) return false;
    if (stateFilter.to && stamp > new Date(stateFilter.to + "T23:59:59").getTime()) return false;
  }
  return true;
}
function filteredTrainerSummary(analysis) {
  const allSessions = trainerSessionGroups(analysis.entries);
  const sessions = allSessions.filter((session) => {
    if (!summaryDateMatches(session.date)) return false;
    if (trainerSummaryState.category !== "all" && !session.categories.includes(trainerSummaryState.category)) return false;
    if (trainerSummaryState.exercise !== "all" && !session.exercises.includes(trainerSummaryState.exercise)) return false;
    if (trainerSummaryState.goal !== "all" && !session.goals.includes(trainerSummaryState.goal)) return false;
    if (trainerSummaryState.session !== "all" && session.key !== trainerSummaryState.session) return false;
    if (trainerSummaryState.trainer !== "all" && !session.trainers.includes(trainerSummaryState.trainer)) return false;
    if (trainerSummaryState.flag === "injury" && !session.workouts.some((entry) => entry.data && entry.data.pain && entry.data.pain !== "none")) return false;
    if (trainerSummaryState.flag === "missing" && !(!session.sets.length || session.workouts.some((entry) => entry.data && Number(entry.data.loggedSets || 0) === 0))) return false;
    if (trainerSummaryState.flag === "pinned" && !session.pinned) return false;
    return true;
  });
  const ids = new Set(sessions.flatMap((session) => session.entries.map((entry) => entry.id)));
  const entries = analysis.entries.filter((entry) => ids.has(entry.id));
  const sets = entries.filter((entry) => entry.type === "set");
  const strengthSets = sets.filter((entry) => !summaryMetaFor(entry).excluded);
  const workouts = entries.filter((entry) => entry.type === "workout" && entry.data);
  const readiness = entries.filter((entry) => entry.type === "readiness");
  return { allSessions, sessions, entries, sets, strengthSets, workouts, readiness };
}
function summaryOption(value, label, current) { return '<option value="' + escapeHtml(value) + '"' + (value === current ? ' selected' : '') + '>' + escapeHtml(label) + '</option>'; }
function setTrainerSummaryFilter(key, value) {
  if (key === "from" || key === "to") trainerSummaryState.range = "custom";
  trainerSummaryState[key] = value; trainerSummaryState.compare = []; renderTrainerAnalysis(selectedTrainerClient);
}
function resetTrainerSummaryFilters() {
  const tab = trainerSummaryState.tab, view = trainerSummaryState.view, inbodyFocus = trainerSummaryState.inbodyFocus;
  trainerSummaryState = newTrainerSummaryState(); trainerSummaryState.tab = tab; trainerSummaryState.view = view; trainerSummaryState.inbodyFocus = inbodyFocus; renderTrainerAnalysis(selectedTrainerClient);
}
function normalizeTrainerSummaryTab(tab) {
  const aliases = {coaching:"overview",program:"workouts",history:"workouts",strength:"progress",assessments:"details",safety:"details",inbody:"progress",nutrition:"details",notes:"details",documents:"details"};
  const normalized = aliases[tab] || tab;
  return ["overview","workouts","progress","checkins","messages","details"].includes(normalized) ? normalized : "overview";
}
function setTrainerSummaryTab(tab) { if (normalizeTrainerSummaryTab(tab) !== "progress") trainerSummaryState.inbodyFocus = false; trainerSummaryState.tab = normalizeTrainerSummaryTab(tab); renderTrainerAnalysis(selectedTrainerClient); }
function setTrainerSummaryView(view) { trainerSummaryState.view = view; renderTrainerAnalysis(selectedTrainerClient); }
function chooseSummaryCategory(category) { trainerSummaryState.category = trainerSummaryState.category === category ? "all" : category; trainerSummaryState.tab = "progress"; renderTrainerAnalysis(selectedTrainerClient); }
function trainerFilterPanel(analysis, filtered) {
  const exercises = [...new Set(analysis.sets.map((entry) => entry.label))].sort((a, b) => a.localeCompare(b));
  const goals = [...new Set(analysis.workouts.flatMap((entry) => entry.data && entry.data.goals ? entry.data.goals : []))];
  const trainers = [...new Set(analysis.entries.map((entry) => summaryMetaFor(entry).trainer).filter(Boolean))].sort((a, b) => a.localeCompare(b));
  const sessions = filtered.allSessions;
  return '<section class="summary-filter-panel"><div class="summary-filter-grid">'
    + '<div><label>Date range</label><select onchange="setTrainerSummaryFilter(\'range\',this.value)">' + [["all","All time"],["30","Last 30 days"],["90","Last 90 days"],["year","Last year"],["custom","Custom dates"]].map(([v,l]) => summaryOption(v,l,trainerSummaryState.range)).join("") + '</select></div>'
    + '<div><label>From</label><input type="date" value="' + escapeHtml(trainerSummaryState.from) + '" onchange="setTrainerSummaryFilter(\'from\',this.value)"></div><div><label>To</label><input type="date" value="' + escapeHtml(trainerSummaryState.to) + '" onchange="setTrainerSummaryFilter(\'to\',this.value)"></div>'
    + '<div><label>Body category</label><select onchange="setTrainerSummaryFilter(\'category\',this.value)">' + [["all","All categories"],["upper","Upper body"],["lower","Lower body"],["core","Core"],["conditioning","Conditioning"]].map(([v,l]) => summaryOption(v,l,trainerSummaryState.category)).join("") + '</select></div>'
    + '<div><label>Exercise</label><select onchange="setTrainerSummaryFilter(\'exercise\',this.value)">' + summaryOption("all","All exercises",trainerSummaryState.exercise) + exercises.map((name) => summaryOption(name,name,trainerSummaryState.exercise)).join("") + '</select></div>'
    + '<div><label>Goal</label><select onchange="setTrainerSummaryFilter(\'goal\',this.value)">' + summaryOption("all","All goals",trainerSummaryState.goal) + goals.map((goal) => summaryOption(goal,GOALS[goal] ? GOALS[goal].label : goal,trainerSummaryState.goal)).join("") + '</select></div>'
    + '<div><label>Workout day</label><select onchange="setTrainerSummaryFilter(\'session\',this.value)">' + summaryOption("all","All workout days",trainerSummaryState.session) + sessions.map((session) => summaryOption(session.key,new Date(session.date).toLocaleDateString() + " · " + session.title,trainerSummaryState.session)).join("") + '</select></div>'
    + '<div><label>Record status</label><select onchange="setTrainerSummaryFilter(\'flag\',this.value)">' + [["all","All records"],["injury","Pain / injury reported"],["missing","Missing logs"],["pinned","Pinned records"]].map(([v,l]) => summaryOption(v,l,trainerSummaryState.flag)).join("") + '</select></div>'
    + '<div><label>Trainer</label><select onchange="setTrainerSummaryFilter(\'trainer\',this.value)">' + summaryOption("all","All trainers",trainerSummaryState.trainer) + trainers.map((name) => summaryOption(name,name,trainerSummaryState.trainer)).join("") + '</select></div></div>'
    + '<div class="summary-filter-actions"><button class="tiny-btn" onclick="resetTrainerSummaryFilters()">Reset filters</button><button class="tiny-btn" onclick="exportFilteredClientSummary()">Export filtered</button><button class="tiny-btn" onclick="printFilteredClientSummary()">Print filtered</button><span class="summary-filter-note">' + filtered.sessions.length + ' workout days · ' + filtered.sets.length + ' logged sets shown</span></div></section>';
}
function exerciseStatsForSets(sets) {
  const groups = new Map();
  sets.forEach((entry) => { if (!groups.has(entry.label)) groups.set(entry.label, []); groups.get(entry.label).push(entry); });
  return [...groups.entries()].map(([label, values]) => {
    values.sort((a, b) => String(b.date).localeCompare(String(a.date)));
    const latest = values[0], estimable = values.filter((entry) => estimatedOneRm(entry.data) != null);
    const best = estimable.length ? estimable.reduce((winner, entry) => estimatedOneRm(entry.data) > estimatedOneRm(winner.data) ? entry : winner) : null;
    const previous = estimable.find((entry) => entry !== latest && entry.sessionId !== latest.sessionId && entry.data.unit === latest.data.unit);
    const latestEstimate = estimatedOneRm(latest.data), previousEstimate = previous ? estimatedOneRm(previous.data) : null;
    const trend = latestEstimate != null && previousEstimate ? (latestEstimate - previousEstimate) / previousEstimate * 100 : null;
    const rpes = values.map((entry) => Number(entry.data && entry.data.rpe)).filter(Number.isFinite);
    return { label, values, latest, best, estimate: best ? estimatedOneRm(best.data) : null, trend, avgRpe: rpes.length ? rpes.reduce((a,b) => a+b,0) / rpes.length : null, category: entryCategory(latest), subcategory: exerciseSubcategory(label) };
  }).sort((a, b) => String(b.latest.date).localeCompare(String(a.latest.date)));
}
function summaryCategoryStats(sets, category) {
  const matching = sets.filter((entry) => entryCategory(entry) === category), exercises = [...new Set(matching.map((entry) => entry.label))];
  return { category, sets: matching.length, exercises: exercises.length, latest: matching.length ? new Date(matching[0].date).toLocaleDateString() : "No data" };
}
function summaryCategoryCards(filtered) {
  const labels = { upper: "Upper body", lower: "Lower body", core: "Core", conditioning: "Conditioning" };
  return '<div class="strength-category-grid">' + Object.keys(labels).map((category) => {
    const stats = summaryCategoryStats(filtered.strengthSets, category);
    return '<button class="strength-category-card' + (trainerSummaryState.category === category ? ' on' : '') + '" onclick="chooseSummaryCategory(\'' + category + '\')"><h5>' + labels[category] + '</h5><b>' + stats.sets + '</b><span>included sets · ' + stats.exercises + ' movements</span><span>Last trained: ' + stats.latest + '</span></button>';
  }).join("") + '</div>';
}
function renderPinnedSummary(filtered) {
  const pinned = filtered.entries.filter((entry) => summaryMetaFor(entry).pinned);
  if (!pinned.length) return '';
  return '<section class="analysis-panel" style="margin-bottom:14px"><h4 class="analysis-section-title">Pinned records</h4><div class="summary-pin-grid">' + pinned.map((entry) => '<div class="summary-pin"><b>' + escapeHtml(entry.label || entry.type) + '</b>' + new Date(entry.date).toLocaleDateString() + ' · ' + escapeHtml(entry.value || entry.note || 'Saved') + '</div>').join("") + '</div></section>';
}
function summaryMetricsHtml(filtered) {
  const reviews = filtered.workouts.map((entry) => entry.data).filter(Boolean), avg = reviews.length ? (reviews.reduce((sum, review) => sum + Number(review.difficulty || 0), 0) / reviews.length).toFixed(1) : '—';
  return '<div class="summary-filtered-metrics"><div class="summary-filtered-metric"><b>' + filtered.workouts.length + '</b><span>Reviewed workouts</span></div><div class="summary-filtered-metric"><b>' + filtered.sets.length + '</b><span>Logged sets</span></div><div class="summary-filtered-metric"><b>' + avg + '</b><span>Average difficulty</span></div><div class="summary-filtered-metric"><b>' + filtered.sessions.length + '</b><span>Workout days</span></div></div>';
}
function sessionDetailHtml(session) {
  const review = session.workouts[0], rows = session.sets.map((entry) => {
    const meta = summaryMetaFor(entry), badges = [entryCategory(entry), meta.trainer, meta.pinned ? 'Pinned' : '', meta.excluded ? 'Excluded from strength' : ''].filter(Boolean).join(' · ');
    return '<div class="session-set' + (meta.excluded ? ' excluded' : '') + '"><div><b>' + escapeHtml(entry.label) + '</b><div class="session-meta">' + escapeHtml(badges) + '</div></div><div>' + escapeHtml(entry.value || 'Logged') + (meta.note ? '<div class="session-meta">' + escapeHtml(meta.note) + '</div>' : '') + '</div><div class="entry-tools"><button class="tiny-btn" onclick="openSummaryEntryEditor(\'' + escapeHtml(entry.id) + '\')">Organize</button></div></div>';
  }).join("");
  const reviewHtml = review ? '<div class="priority-card">Difficulty ' + review.data.difficulty + '/10 · ' + escapeHtml(review.data.completion || 'reviewed') + (review.data.pain && review.data.pain !== 'none' ? ' · Pain: ' + escapeHtml(review.data.injuryArea || review.data.pain) : ' · No pain reported') + (review.data.notes ? '<br>' + escapeHtml(review.data.notes) : '') + '</div>' : '';
  return reviewHtml + (rows || '<div class="summary-alert">No exercise sets were logged for this workout.</div>');
}
function sessionTimelineHtml(sessions, limit) {
  const shown = typeof limit === 'number' ? sessions.slice(0, limit) : sessions;
  if (!shown.length) return '<div class="empty-state">No workout days match these filters.</div>';
  return '<div class="session-timeline">' + shown.map((session) => {
    const encoded = encodeURIComponent(session.key), review = session.workouts[0], editEntry = review || session.entries[0], checked = trainerSummaryState.compare.includes(session.key);
    const categories = session.categories.length ? session.categories.map((category) => category === 'upper' ? 'Upper body' : category === 'lower' ? 'Lower body' : category[0].toUpperCase() + category.slice(1)).join(' + ') : 'Uncategorized';
    return '<article class="session-card' + (session.pinned ? ' pinned' : '') + '" id="summary-session-' + encoded + '"><div class="session-summary"><div class="session-date">' + new Date(session.date).toLocaleDateString() + '</div><div><div class="session-title">' + escapeHtml(session.title) + '</div><div class="session-meta">' + session.sets.length + ' sets · ' + session.exercises.length + ' exercises · ' + escapeHtml(categories) + '</div></div><div class="session-controls"><label><input type="checkbox" ' + (checked ? 'checked' : '') + ' onchange="toggleCompareSession(\'' + encoded + '\',this.checked)"> Compare</label><button class="tiny-btn" onclick="openSummaryEntryEditor(\'' + escapeHtml(editEntry.id) + '\')">Organize</button><button class="tiny-btn" onclick="toggleSummarySession(\'' + encoded + '\')">Details</button></div></div><div class="session-detail">' + sessionDetailHtml(session) + '</div></article>';
  }).join("") + '</div>';
}
function toggleSummarySession(encoded) { const card = byId('summary-session-' + encoded); if (card) card.classList.toggle('open'); }
function toggleCompareSession(encoded, checked) {
  const key = decodeURIComponent(encoded), list = trainerSummaryState.compare.filter((item) => item !== key);
  if (checked) list.push(key);
  trainerSummaryState.compare = list.slice(-2); renderTrainerAnalysis(selectedTrainerClient);
}
function comparisonHtml(allSessions) {
  const selected = trainerSummaryState.compare.map((key) => allSessions.find((session) => session.key === key)).filter(Boolean);
  if (selected.length < 2) return '<div class="empty-state">Select two workout days in the timeline to compare them side by side.</div>';
  return '<div class="compare-grid">' + selected.map((session) => {
    const review = session.workouts[0] && session.workouts[0].data, rpes = session.sets.map((entry) => Number(entry.data && entry.data.rpe)).filter(Number.isFinite), avgRpe = rpes.length ? (rpes.reduce((a,b) => a+b,0)/rpes.length).toFixed(1) : '—';
    return '<article class="compare-card"><h5>' + new Date(session.date).toLocaleDateString() + '</h5><div class="session-meta">' + escapeHtml(session.title) + '</div><div class="compare-stat"><span>Exercises</span><b>' + session.exercises.length + '</b></div><div class="compare-stat"><span>Logged sets</span><b>' + session.sets.length + '</b></div><div class="compare-stat"><span>Average RPE</span><b>' + avgRpe + '</b></div><div class="compare-stat"><span>Difficulty</span><b>' + (review ? review.difficulty + '/10' : '—') + '</b></div><div class="compare-stat"><span>Completion</span><b>' + (review ? escapeHtml(review.completion) : '—') + '</b></div><div class="compare-stat"><span>Pain report</span><b>' + (review && review.pain !== 'none' ? escapeHtml(review.injuryArea || review.pain) : 'None') + '</b></div><div class="compare-stat"><span>Movements</span><b>' + escapeHtml(session.exercises.slice(0,5).join(', ') || 'No sets') + '</b></div></article>';
  }).join("") + '</div>';
}
function summaryStrengthContent(filtered) {
  const stats = exerciseStatsForSets(filtered.strengthSets), subcategories = [...new Set(stats.map((item) => item.subcategory))];
  const maxEstimate = Math.max(1, ...stats.map((item) => item.estimate || 0));
  const chart = '<div class="summary-chart">' + stats.map((item) => '<div class="strength-bar-row"><div class="strength-bar-label">' + escapeHtml(item.label) + '</div><div class="strength-bar-track"><div class="strength-bar-fill" style="width:' + Math.max(3, Math.round((item.estimate || 0) / maxEstimate * 100)) + '%"></div></div><div class="strength-bar-value">' + (item.estimate == null ? item.values.length + ' sets' : Math.round(item.estimate) + ' ' + escapeHtml(item.best.data.unit) + ' est.') + '</div></div>').join("") + '</div>';
  const rows = stats.map((item) => { const meta = summaryMetaFor(item.latest), trend = item.trend == null ? '—' : (item.trend >= 0 ? '+' : '') + item.trend.toFixed(1) + '%'; return '<tr><td>' + escapeHtml(item.label) + '</td><td>' + escapeHtml(item.subcategory) + '</td><td>' + escapeHtml(item.latest.value || 'Logged') + '</td><td>' + (item.estimate == null ? '—' : Math.round(item.estimate) + ' ' + escapeHtml(item.best.data.unit)) + '</td><td>' + trend + '</td><td>' + (item.avgRpe == null ? '—' : item.avgRpe.toFixed(1)) + '</td><td><button class="tiny-btn" onclick="openSummaryEntryEditor(\'' + escapeHtml(item.latest.id) + '\')">Edit</button>' + (meta.excluded ? ' Excluded' : '') + '</td></tr>'; }).join("");
  const excluded = filtered.sets.filter((entry) => summaryMetaFor(entry).excluded), excludedHtml = excluded.length ? '<section class="analysis-panel" style="margin-top:14px"><h4 class="analysis-section-title">Excluded technique / rehabilitation sets</h4><div class="analysis-history">' + excluded.map((entry) => { const meta = summaryMetaFor(entry); return '<div class="analysis-history-item"><b>' + escapeHtml(entry.label) + '</b><span>' + new Date(entry.date).toLocaleDateString() + ' · ' + escapeHtml(entry.value || 'Logged') + (meta.note ? ' · ' + escapeHtml(meta.note) : '') + ' <button class="tiny-btn" onclick="openSummaryEntryEditor(\'' + escapeHtml(entry.id) + '\')">Review</button></span></div>'; }).join("") + '</div></section>' : '';
  return '<h4 class="analysis-section-title">Upper, lower & performance categories</h4>' + summaryCategoryCards(filtered) + '<div class="summary-subcategories">' + subcategories.map((name) => '<span class="summary-subcategory">' + escapeHtml(name) + '</span>').join("") + '</div><section class="analysis-panel"><div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap"><div><h4 class="analysis-section-title">Strength detail</h4><p style="font-size:9px;color:var(--sheet-ink-faint);margin-top:4px">Estimated maxima compare each exercise with its own history; rehabilitation and technique sets can be excluded.</p></div><div class="summary-view-toggle"><button class="tiny-btn" onclick="setTrainerSummaryView(\'chart\')">Chart</button><button class="tiny-btn" onclick="setTrainerSummaryView(\'table\')">Table</button></div></div>' + (trainerSummaryState.view === 'table' ? '<table class="analysis-table"><thead><tr><th>Exercise</th><th>Pattern</th><th>Latest</th><th>Best est.</th><th>Trend</th><th>Avg RPE</th><th>Controls</th></tr></thead><tbody>' + (rows || '<tr><td colspan="7">No included strength sets match these filters.</td></tr>') + '</tbody></table>' : (chart || '<div class="empty-state">No included strength sets match these filters.</div>')) + '</section>' + excludedHtml;
}
function summaryOverviewContent(analysis, filtered) {
  const adherence = analysis.recentWorkouts.length ? analysis.completion + '%' : '—', trend = analysis.averageTrend == null ? 'Baseline' : (analysis.averageTrend >= 0 ? '+' : '') + analysis.averageTrend.toFixed(1) + '%';
  return summaryMetricsHtml(filtered) + '<div class="analysis-intro"><div><h4>Coaching Evidence Report</h4><p>This report shows the records behind the coaching decision instead of an unexplained “goal alignment” score. Filters narrow the included body category, exercise, workout day, goal, trainer, and safety status.</p><div class="priority-card" style="margin-top:10px"><b>' + escapeHtml(analysis.evidenceLevel) + ' data confidence</b><br>' + escapeHtml(analysis.evidenceDetail) + '</div></div><div class="headline-score"><b>' + escapeHtml(adherence) + '</b><span>Workout completion</span></div><div class="headline-score"><b>' + escapeHtml(trend) + '</b><span>Comparable-lift trend</span></div><div class="headline-score"><b>' + filtered.sessions.length + '</b><span>Workout days</span></div></div>'
    + '<h4 class="analysis-section-title">Training balance</h4>' + summaryCategoryCards(filtered) + renderPinnedSummary(filtered)
    + '<div class="analysis-grid"><section class="analysis-panel"><h4 class="analysis-section-title">Recent workout days</h4>' + sessionTimelineHtml(filtered.sessions, 3) + '</section><aside class="analysis-panel"><h4 class="analysis-section-title">Coach priority</h4><div class="priority-card">' + escapeHtml(analysis.priority) + '</div><h4 class="analysis-section-title" style="margin-top:16px">Current filter</h4><div class="analysis-history-item"><b>' + filtered.strengthSets.length + ' strength sets included</b><span>' + filtered.sets.filter((entry) => summaryMetaFor(entry).excluded).length + ' excluded from calculations · ' + filtered.sessions.length + ' workout days</span></div><div class="priority-card" style="margin-top:12px">No percentile, diagnosis, or hidden composite score is used. A lift trend appears only after the same exercise is logged in separate sessions.</div></aside></div>';
}
function clientPastWorkoutsHtml(profile) {
  if (!profile) return "";
  // The history tabs are analytics - metrics, comparisons, timelines - with no way to act
  // on an individual session. A workout that went well is exactly the one worth keeping.
  const done = assignmentsForClient(profile.id)
    .filter((item) => ["completed","reviewed"].includes(assignmentStatus(item)))
    .sort((a,b) => String(b.completedAt || b.assignedAt).localeCompare(String(a.completedAt || a.assignedAt)));
  if (!done.length) return '<section class="analysis-panel"><h4 class="analysis-section-title">Past workouts</h4><div class="empty-state">No completed workouts yet.</div></section>';
  const rows = done.slice(0,15).map((assignment) => {
    const data = assignment.session && assignment.session.data;
    const title = (data && data.goalLabel) || assignment.programDayName || "Workout";
    const when = assignment.completedAt ? new Date(assignment.completedAt).toLocaleDateString() : "";
    const review = assignment.clientReview || {};
    const movements = data ? clientSessionExercises(data).map((entry) => entry.exercise.name) : [];
    const detail = [movements.slice(0,3).join(" · "), review.difficulty ? "difficulty " + review.difficulty + "/10" : ""].filter(Boolean).join(" · ");
    return '<article class="past-workout"><div class="past-workout-copy"><b>' + escapeHtml(title) + '</b>'
      + '<span>' + escapeHtml([when, detail].filter(Boolean).join(" · ")) + '</span></div>'
      + '<div class="past-workout-actions">'
      + '<button class="tiny-btn" onclick="saveWorkoutFromHistory(' + JSON.stringify(assignment.id) + ')">\u2606 Save</button>'
      + '<button class="tiny-btn" onclick="reuseWorkoutFromHistory(' + JSON.stringify(assignment.id) + ')">Use again</button>'
      + '</div></article>';
  }).join("");
  return '<section class="analysis-panel"><h4 class="analysis-section-title">Past workouts</h4>'
    + '<p class="storage-note" style="margin-bottom:10px">Save one to your library or suggest it back to this client. Use again loads it into the builder as a fresh draft.</p>'
    + '<div class="past-workout-list">' + rows + '</div>'
    + (done.length > 15 ? '<p class="storage-note">Showing the 15 most recent of ' + done.length + '.</p>' : '') + '</section>';
}
function assignmentSessionData(assignmentId) {
  const assignment = loadAssignedWorkouts().find((item) => item.id === assignmentId);
  return assignment && assignment.session && assignment.session.data ? { assignment, data:assignment.session.data } : null;
}
function saveWorkoutFromHistory(assignmentId) {
  const found = assignmentSessionData(assignmentId);
  if (!found) { showToast("That workout is no longer available"); return; }
  const profile = loadProfiles().find((item) => item.id === found.assignment.profileId);
  openSaveWorkoutDialog(found.data, profile || null);
}
function reuseWorkoutFromHistory(assignmentId) {
  const found = assignmentSessionData(assignmentId);
  if (!found) { showToast("That workout is no longer available"); return; }
  if (typeof requireTrainerMutation === "function" && !requireTrainerMutation("build workouts")) return;
  // Loads as a new draft; the completed record is never altered.
  state.session = { type:"solo", data:JSON.parse(JSON.stringify(found.data)), edits:{} };
  state.sessionOptions = [];
  portalRole = "trainer";
  show("builder");
  if (typeof renderSession === "function") renderSession();
  showToast("Loaded as a new draft");
}
function summaryHistoryContent(filtered) { return summaryMetricsHtml(filtered) + '<section class="analysis-panel"><h4 class="analysis-section-title">Compare workout days</h4>' + comparisonHtml(filtered.allSessions) + '</section><section class="analysis-panel" style="margin-top:14px"><h4 class="analysis-section-title">Workout timeline</h4><p style="font-size:9px;color:var(--sheet-ink-faint);margin-top:4px">Open any day to review every logged set, workout result, trainer note, category, and exclusion.</p>' + sessionTimelineHtml(filtered.sessions) + '</section>'; }
function summarySafetyContent(filtered) {
  const reviews = filtered.workouts, readiness = filtered.readiness;
  const alerts = reviews.map((entry) => '<div class="summary-alert' + (entry.data.pain === 'none' ? ' safe' : '') + '"><b>' + new Date(entry.date).toLocaleDateString() + ' · ' + escapeHtml(entry.label) + '</b><br>Difficulty ' + entry.data.difficulty + '/10 · ' + escapeHtml(entry.data.completion || 'reviewed') + ' · ' + (entry.data.pain === 'none' ? 'No pain reported' : 'Pain: ' + escapeHtml(entry.data.injuryArea || entry.data.pain)) + (entry.data.injuryDetails ? '<br>' + escapeHtml(entry.data.injuryDetails) : '') + '<div class="entry-tools"><button class="tiny-btn" onclick="openSummaryEntryEditor(\'' + escapeHtml(entry.id) + '\')">Add trainer note</button></div></div>').join("");
  const ready = readiness.map((entry) => '<div class="analysis-history-item"><b>' + escapeHtml(entry.label) + '</b><span>' + new Date(entry.date).toLocaleDateString() + ' · ' + escapeHtml(entry.value || entry.note || '') + '</span></div>').join("");
  return '<div class="analysis-grid"><section class="analysis-panel"><h4 class="analysis-section-title">Pain & injury reviews</h4><div class="summary-alert-list">' + (alerts || '<div class="empty-state">No reviewed workouts match these filters.</div>') + '</div></section><aside class="analysis-panel"><h4 class="analysis-section-title">Readiness history</h4><div class="analysis-history">' + (ready || '<div class="analysis-history-item"><span>No readiness checks match these filters.</span></div>') + '</div><div class="priority-card">Use these reports to adjust the next warm-up and exercise selection. They do not diagnose an injury.</div></aside></div>';
}
function trainerIntakeSummaryHtml(profile) {
  return "";
}
function trainerAssignmentLoopHtml(profile) {
  if (!profile) return '<section class="coach-loop-card"><div class="coach-loop-head"><div><h4>Coaching loop</h4><p>Create a saved profile before assigning and tracking the next plan.</p></div><span class="loop-status">Profile needed</span></div></section>';
  const assignment = assignmentForClient(profile.id);
  if (!assignment) return '<section class="coach-loop-card"><div class="coach-loop-head"><div><h4>Coaching loop</h4><p>No active workout is assigned. Start the loop with one clear plan.</p></div><span class="loop-status">Not assigned</span></div><div class="coach-loop-actions"><button class="small-btn primary" onclick="openSelectedClientSession()">Build &amp; assign workout</button></div></section>';
  const status = assignmentStatus(assignment), review = assignment.clientReview || {}, stats = assignmentProgressStats(assignment), actionLabels = { repeat:"Repeat plan", progress:"Progress one variable", reduce:"Reduce load / volume", pain_swap:"Replace painful pattern" };
  const tone = status === "completed" ? " warn" : status === "reviewed" ? " good" : "", date = new Date(assignment.assignedAt).toLocaleDateString();
  let note = status === "assigned" ? "The workout is waiting for the client to start." : status === "in_progress" ? "The client has started logging the workout." : status === "completed" ? "Client feedback is ready. Review it before creating the next plan." : "Coach decision: " + (actionLabels[assignment.nextAction] || "Reviewed") + (assignment.coachNote ? " · " + assignment.coachNote : "");
  const summary = '<div class="coach-loop-summary"><div><b>' + stats.logged + ' / ' + stats.planned + '</b><span>efforts logged</span></div><div><b>' + (review.difficulty ? review.difficulty + '/10' : '—') + '</b><span>difficulty</span></div><div><b>' + (review.energy ? review.energy + '/5' : '—') + '</b><span>energy after</span></div><div><b>' + (review.pain && review.pain !== 'none' ? escapeHtml(review.injuryArea ? INJURY_LABELS[review.injuryArea] : review.pain) : review.pain === 'none' ? 'None' : '—') + '</b><span>pain report</span></div></div>';
  let actions = '';
  if (status === "completed") actions = '<button class="small-btn primary" onclick="openCoachAdjustment(\'' + escapeHtml(profile.id) + '\')">Review &amp; adjust</button>';
  else if (status === "reviewed") actions = '<button class="small-btn primary" onclick="openSelectedClientSession()">Build adjusted workout</button><button class="small-btn" onclick="openCoachAdjustment(\'' + escapeHtml(profile.id) + '\')">Edit decision</button>';
  else actions = '<button class="small-btn" onclick="openSelectedClientSession()">Open workout builder</button>';
  return '<section class="coach-loop-card"><div class="coach-loop-head"><div><h4>Assign → Complete → Review → Adjust</h4><p>Assigned ' + date + '</p></div><span class="loop-status' + tone + '">' + escapeHtml(assignmentStatusLabel(assignment)) + '</span></div>' + summary + '<p class="coach-loop-note">' + escapeHtml(note) + '</p><div class="coach-loop-actions">' + actions + '</div></section>';
}
function trainerCoachingTab(profile) {
  if (!profile) return '<section class="analysis-panel"><h4 class="analysis-section-title">Coaching review</h4><div class="empty-state">Choose a saved client to review coaching evidence.</div></section>';
  const summary = checkInCoachSummary(profile), workload = workloadSnapshot(profile), metrics = athleteMetricsForProfile(profile.id), plan = mentalPlanFor(profile.id), alerts = loadAutomationAlerts().filter((item) => item.profileId === profile.id);
  const latest = summary.latest, evidence = workload.volumeEntries || metrics.length
    ? Math.round(workload.acute) + ' seven-day entered load · ' + Math.round(workload.chronic) + ' recent weekly baseline · ' + workload.plateaus.length + ' plateau flag' + (workload.plateaus.length === 1 ? '' : 's')
    : 'No comparable workload evidence yet. Normal programming can continue from workout logs, symptoms, technique, and client feedback.';
  return trainerProgressReceiptsHtml(profile) + '<section class="analysis-panel" style="margin-top:14px"><div class="analysis-panel-head"><div><h4 class="analysis-section-title">Coaching review</h4><p style="font-size:9px;color:var(--text-faint);margin-top:4px">Check-in, workout, monitoring, and alert evidence gathered in one client-specific view.</p></div><button class="small-btn primary" onclick="openAdvancedForClient(\'' + escapeHtml(profile.id) + '\',\'review\')">Open decision workspace</button></div>'
    + '<div class="simple-stat-grid"><div class="simple-stat"><b class="risk-' + summary.risk + '">' + escapeHtml(summary.headline) + '</b><span>Current coaching signal</span></div><div class="simple-stat"><b>' + (latest ? latest.adherence + '%' : '—') + '</b><span>Latest adherence</span></div><div class="simple-stat"><b>' + workload.plateaus.length + '</b><span>Plateau flags</span></div><div class="simple-stat"><b>' + alerts.length + '</b><span>Open rule alerts</span></div></div>'
    + '<div class="analysis-grid" style="margin-top:12px"><div class="analysis-history"><div class="analysis-history-item"><b>Client voice</b><span>' + escapeHtml(latest ? [latest.win && 'Win: ' + latest.win,latest.challenge && 'Barrier: ' + latest.challenge,latest.question && 'Question: ' + latest.question].filter(Boolean).join(' · ') || 'Check-in submitted without notes.' : 'No weekly check-in yet.') + '</span></div><div class="analysis-history-item"><b>Training evidence</b><span>' + escapeHtml(workload.risk + ' · ' + evidence) + '</span></div></div><div class="analysis-history"><div class="analysis-history-item"><b>Optional monitoring</b><span>' + metrics.length + ' record' + (metrics.length === 1 ? '' : 's') + (metrics[0] ? ' · latest ' + new Date(metrics[0].date + 'T12:00:00').toLocaleDateString() : '') + '</span></div><div class="analysis-history-item"><b>Performance routine</b><span>' + escapeHtml(plan ? [plan.cue,plan.breathing].filter(Boolean).join(' · ') || 'Saved without a cue' : 'Not used for this client') + '</span></div></div></div>'
    + '<div class="tool-actions"><button class="small-btn" onclick="openAdvancedForClient(\'' + escapeHtml(profile.id) + '\',\'monitoring\')">Monitoring &amp; imports</button><button class="small-btn" onclick="setTrainerSummaryTab(\'checkins\')">Open check-ins</button><button class="small-btn" onclick="setTrainerSummaryTab(\'messages\')">Open messages</button><button class="small-btn" onclick="openSelectedClientSession()">Build next workout</button></div>'
    + '<div class="capability-note">Rule alerts and decision briefs are prompts for trainer review. They do not diagnose, message the client, or change a workout automatically.</div></section>';
}
function trainerProgramTab(profile) {
  const program = profile && savedProgramFor(profile), assignment = profile && assignmentForClient(profile.id), allAssignments = profile ? assignmentsForClient(profile.id) : [];
  if (!program) return '<section class="analysis-panel"><h4 class="analysis-section-title">Program</h4><div class="empty-state">No saved multi-week program. The current assigned workout remains available below.</div><div class="tool-actions"><button class="small-btn primary" onclick="openSelectedClientProgram()">Build program</button><button class="small-btn" onclick="openAdvancedForClient(\'' + escapeHtml(profile && profile.id || '') + '\',\'templates\')">Browse program templates</button></div></section>';
  const programAssignments = allAssignments.filter((item) => item.programId === program.id), schedule = (program.weeks || []).map((week) => {
    const days = (week.days || []).map((day,index) => {
      const item = programAssignments.find((candidate) => Number(candidate.programWeek) === Number(week.number) && Number(candidate.programDay) === index + 1), exercises = clientSessionExercises(day.session).map((entry) => entry.exercise.name);
      return '<div class="trainer-program-day"><div><b>Day ' + (index + 1) + ' · ' + escapeHtml(day.name) + '</b><span>' + escapeHtml(exercises.slice(0,5).join(' · ')) + (exercises.length > 5 ? ' +' + (exercises.length - 5) + ' more' : '') + '</span></div><span class="assignment-pill ' + (item ? assignmentStatus(item) : '') + '">' + escapeHtml(item ? assignmentStatusLabel(item) : 'Not assigned') + '</span><span>' + escapeHtml(item && item.scheduledDate ? new Date(item.scheduledDate + 'T12:00:00').toLocaleDateString() : 'No date') + '</span></div>';
    }).join("");
    return '<details class="trainer-program-week" ' + (Number(week.number) === 1 ? 'open' : '') + '><summary>Week ' + week.number + ' · ' + escapeHtml(week.phase && week.phase.name || 'Training') + '</summary><div class="trainer-program-days">' + days + '</div></details>';
  }).join("");
  const recentSets = trainerEntriesFor(profile.name).filter((entry) => entry.type === "set").slice(0,12), loads = recentSets.map((entry) => '<div class="analysis-history-item"><b>' + escapeHtml(entry.label) + '</b><span>' + new Date(entry.date).toLocaleDateString() + ' · ' + escapeHtml(entry.value || 'Completed') + (entry.data && entry.data.rpe != null ? ' · RPE ' + escapeHtml(entry.data.rpe) : '') + '</span></div>').join("");
  const versions = (program.versions || []).slice(0,20), versionRows = versions.map((revision) => '<div class="analysis-history-item"><div><b>Version ' + Number(revision.version || 1) + ' · ' + escapeHtml(revision.reason || 'Previous program') + '</b><span>' + new Date(revision.savedAt).toLocaleString() + ' · ' + escapeHtml(revision.savedBy || 'Trainer') + '</span></div><button class="small-btn" onclick="restoreProgramVersion(\'' + escapeHtml(program.id) + '\',\'' + escapeHtml(revision.id) + '\')">Restore as draft</button></div>').join("");
  const versionHistory = '<details class="formal-review-box" style="margin-top:14px"><summary>Program version history · current version ' + Number(program.versionNumber || 1) + '</summary><p>Restoring never changes a client’s live assignment immediately. It opens the older plan as a new draft that must pass review, approval, and publishing again.</p><div class="analysis-history">' + (versionRows || '<div class="empty-state">No earlier versions yet. The first prior version appears after a coach saves a real program change.</div>') + '</div></details>';
  return '<section class="analysis-panel"><h4 class="analysis-section-title">Current assigned program</h4><div class="analysis-history-item"><b>' + escapeHtml((program.setup.goals || []).map((goal) => GOALS[goal] ? GOALS[goal].label : goal).join(' + ')) + '</b><span>' + program.weeks.length + ' weeks · ' + program.setup.days + ' days/week · version ' + Number(program.versionNumber || 1) + ' · ' + escapeHtml(program.lifecycle || 'approved') + ' · saved ' + new Date(program.savedAt || program.createdAt).toLocaleDateString() + '</span></div><div class="analysis-history-item"><b>Next executable workout</b><span>' + escapeHtml(assignment ? assignmentStatusLabel(assignment) + (assignment.scheduledDate ? ' · ' + new Date(assignment.scheduledDate + 'T12:00:00').toLocaleDateString() : '') : 'No workout assigned') + '</span></div><div class="trainer-program-schedule">' + schedule + '</div><div class="tool-actions"><button class="small-btn primary" onclick="openSelectedClientProgram()">Edit current program</button><button class="small-btn" onclick="setTrainerSummaryTab(\'workouts\')">Open full workout history</button><button class="small-btn" onclick="openAdvancedForClient(\'' + escapeHtml(profile.id) + '\',\'templates\')">Open template library</button></div>' + versionHistory + '</section><section class="analysis-panel" style="margin-top:14px"><h4 class="analysis-section-title">Recent weights & reps</h4><p style="font-size:9px;color:var(--text-faint);margin:4px 0 10px">Latest logged working sets are visible here; open Workouts for every set grouped by day.</p><div class="analysis-history">' + (loads || '<div class="empty-state">No weights or reps logged yet.</div>') + '</div></section>';
}
function clientCheckInTypeLabel(item) {
  // Retired feature, but historical submissions keep their label so old records read correctly.
  return item.reviewType === "recovery_24_48" ? "24–48h recovery pulse (retired)" : item.reviewType === "starter_week_1" ? "Week 1 starter review" : "Weekly check-in";
}
function clientCheckInSummary(item) {
  if (item.reviewType === "recovery_24_48") {
    return "Recovery " + (item.recovery == null ? "—" : item.recovery + "/5") + " · soreness " + (item.soreness == null ? "—" : item.soreness + "/5") + " · next session " + String(item.nextSessionReadiness || "not entered").replace(/_/g," ") + " · pain " + (PAIN_LEVELS[normalizePainLevel(item.painLevel || item.pain,item.movementChanged)] || PAIN_LEVELS.green).label + (item.painTrend && item.painTrend !== "none" ? " · trend " + item.painTrend : "") + (item.note ? " · note: " + item.note : "");
  }
  return "Energy " + item.energy + "/5 · sleep " + item.sleep + "/5 · stress " + item.stress + "/5" + (item.reviewType === "starter_week_1" ? " · difficulty " + String(item.workoutFit || "not entered").replace(/_/g," ") + " · exercises " + String(item.exerciseClarity || "not entered").replace(/_/g," ") + " · time " + String(item.sessionFit || "not entered").replace(/_/g," ") : "") + (item.question ? " · question: " + item.question : "");
}
function markClientCheckInReviewed(checkInId,trainerReply) {
  if (!requireTrainerMutation("review a client check-in")) return null;
  const items = loadCheckIns(), index = items.findIndex((item) => item.id === checkInId); if (index < 0) return null;
  const identity = currentAccountIdentity(), reviewedAt = new Date().toISOString();
  items[index] = {...items[index],reviewedAt,reviewedBy:identity.displayName,reviewedByUserId:identity.id || "",trainerReply:trainerReply || items[index].trainerReply || ""};
  if (!writeCheckIns(items)) return null;
  renderTrainerAnalysis(selectedTrainerClient); renderTrainerAttention(); return items[index];
}
function suggestedClientCheckInReply(item) {
  if (!item) return '';
  const painHold = painRequiresSafetyHold(item.painLevel || item.pain,item.movementChanged), concern = Number(item.recovery) <= 2 || Number(item.soreness) >= 4 || ["unsure","no"].includes(item.nextSessionReadiness) || ["same","worse"].includes(item.painTrend);
  return painHold || item.painTrend === "worse"
    ? "Thanks for telling me. Do not repeat the movement that caused pain yet. I’m reviewing your next session and will follow up with a safe adjustment."
    : concern ? "Thanks for checking in. I’m reviewing your recovery and will adjust the next session if needed. Keep the next movement easy and pain-free until you hear from me."
      : "Thanks for checking in—your recovery looks on track. Nice job following through. Keep the next session controlled and let me know if anything changes.";
}
function replyToClientCheckIn(checkInId) {
  if (!requireTrainerMutation("reply to a client recovery update")) return null;
  const item = loadCheckIns().find((checkin) => checkin.id === checkInId), profile = item && loadProfiles().find((candidate) => candidate.id === item.profileId); if (!item || !profile) return null;
  const input = byId(trainerMessageComposerId(profile.id,item.id));
  if (input) { input.focus(); input.scrollIntoView({behavior:'smooth',block:'center'}); return input; }
  trainerSummaryState.tab = 'checkins'; selectedTrainerClient = profile.name; renderTrainerAnalysis(profile.name);
  setTimeout(() => { const field = byId(trainerMessageComposerId(profile.id,item.id)); if (field) field.focus(); },0); return true;
}
function trainerCheckInsTab(profile) {
  const items = profile ? checkInsForProfile(profile.id) : [];
  return '<section class="analysis-panel"><h4 class="analysis-section-title">Check-ins &amp; recovery</h4><p class="support-copy">Recovery pulses are short post-workout signals. Weekly check-ins remain the broader coaching review.</p><div class="analysis-history">' + (items.map((item) => '<div class="analysis-history-item checkin-review-item"><div><b>' + new Date(item.createdAt || item.date).toLocaleDateString() + ' · ' + escapeHtml(clientCheckInTypeLabel(item)) + (item.reviewedAt ? ' · reviewed' : ' · needs review') + '</b><span>' + escapeHtml(clientCheckInSummary(item)) + '</span>' + (item.reviewedAt ? '<span>Reviewed by ' + escapeHtml(item.reviewedBy || "trainer") + (item.trainerReply ? ' · reply sent' : '') + '</span>' : '') + '</div>' + (!item.reviewedAt ? trainerMessageComposerHtml(profile,item.id,suggestedClientCheckInReply(item)) + '<div class="tool-actions"><button class="small-btn" onclick="markClientCheckInReviewed(\'' + escapeHtml(item.id) + '\');showToast(\'Check-in marked reviewed\')">Mark reviewed without reply</button></div>' : '') + '</div>').join('') || '<div class="empty-state">No check-ins or recovery pulses submitted.</div>') + '</div></section>';
}
function trainerMessagesTab(profile) { const items = profile ? loadClientMessages(profile.id) : []; return '<section class="analysis-panel"><h4 class="analysis-section-title">Direct messages · ' + escapeHtml(profile && profile.assignedTrainerName || 'Coaching team') + '</h4>' + (profile ? messageThreadHtml(items,profile,'trainer') + trainerMessageComposerHtml(profile) : '<div class="empty-state">Choose a client.</div>') + '</section>'; }
function trainerNutritionTab(profile) { return '<section class="analysis-panel"><h4 class="analysis-section-title">Nutrition</h4><div class="empty-state">No nutrition target has been assigned. Keep this optional and use qualified nutrition or medical support when the client’s needs exceed general coaching scope.</div></section>'; }
function trainerNotesTab(analysis) { const notes = analysis.entries.filter((entry) => entry.type === 'note' || summaryMetaFor(entry).note); return '<section class="analysis-panel"><h4 class="analysis-section-title">Workout record notes</h4><div class="analysis-history">' + (notes.map((entry) => '<div class="analysis-history-item"><b>' + escapeHtml(entry.label || 'Note') + ' · ' + new Date(entry.date).toLocaleDateString() + '</b><span>' + escapeHtml(entry.note || summaryMetaFor(entry).note || entry.value || '') + '</span></div>').join('') || '<div class="empty-state">No workout record notes.</div>') + '</div></section>' + (typeof coachNotesPanelHtml === 'function' ? coachNotesPanelHtml(analysis.profile) : ''); }
function trainerDocumentsTab(analysis) { const scans = inBodyScansFor(analysis.client); return '<section class="analysis-panel"><h4 class="analysis-section-title">Documents</h4><div class="analysis-history">' + (scans.map((scan) => '<div class="analysis-history-item"><b>InBody scan · ' + new Date(scan.date + 'T12:00:00').toLocaleDateString() + '</b><span>' + escapeHtml(scan.fileName || 'Values entered manually') + '</span></div>').join('') || '<div class="empty-state">No client documents saved.</div>') + '</div><div class="tool-actions"><button class="small-btn primary" onclick="openInBodyModal()">Add InBody scan</button></div></section>'; }
function trainerClientOwnershipLabel(profile) {
  if (profile && profile.onboardingStatus === "imported") return "Imported · no login yet, so messages will not reach them";
  if (!profile || !profile.assignedTrainerId) return "Shared client · all trainers can coach";
  return "Primary coach · " + (profile.assignedTrainerName || "Assigned trainer");
}
function trainerFilterDrawer(analysis,filtered) {
  return '<details class="client-filter-drawer"><summary><span>Filter &amp; export history</span><small>' + filtered.sessions.length + ' workout days · ' + filtered.sets.length + ' logged sets</small></summary>' + trainerFilterPanel(analysis,filtered) + '</details>';
}
function trainerClientOverviewContent(analysis,filtered) {
  const profile = analysis.profile, messages = profile ? loadClientMessages(profile.id) : [], checkins = profile ? checkInsForProfile(profile.id) : [];
  const waitingCheckins = checkins.filter((item) => !item.reviewedAt).length, latestMessage = messages[0], clientWaiting = latestMessage && messageSenderRole(latestMessage) === "client";
  const recentPain = analysis.workouts.find((entry) => entry.data && ["mild","changed","stopped"].includes(entry.data.pain));
  return (typeof clientWeekCalendarHtml === "function" ? clientWeekCalendarHtml(profile) : "")
    + summaryMetricsHtml(filtered)
    + '<div class="client-overview-grid"><section class="analysis-panel client-recent-panel"><div class="analysis-panel-head"><div><h4 class="analysis-section-title">Recent workout activity</h4><p>The latest completed sessions and logged efforts, without extra setup screens.</p></div><button class="tiny-btn" onclick="setTrainerSummaryTab(\'workouts\')">Full history</button></div>' + sessionTimelineHtml(filtered.sessions,3) + '</section>'
    + '<aside class="analysis-panel client-focus-panel"><div class="client-focus-label">Coach focus</div><h4>' + escapeHtml(analysis.priority) + '</h4><div class="client-signal-list"><div><span>Coverage</span><b>' + escapeHtml(trainerClientOwnershipLabel(profile)) + '</b></div><div><span>Messages</span><b>' + (clientWaiting ? 'Client reply waiting' : messages.length ? 'Up to date' : 'No messages yet') + '</b></div><div><span>Check-ins</span><b>' + (waitingCheckins ? waitingCheckins + ' waiting for review' : checkins.length ? 'Up to date' : 'No check-ins yet') + '</b></div><div><span>Pain reports</span><b>' + (recentPain ? 'Review latest report' : 'No active report in recent workouts') + '</b></div></div><div class="tool-actions"><button class="small-btn primary" onclick="openSelectedClientSession()">Build next workout</button><button class="small-btn" onclick="setTrainerSummaryTab(\'messages\')">Message client</button></div></aside></div>';
}
function trainerClientSafetyReportsContent(analysis) {
  const reports = analysis.entries.filter((entry) => entry.type === "pain" || entry.type === "workout" && entry.data && ["mild","changed","stopped"].includes(entry.data.pain));
  return '<section class="analysis-panel" id="client-safety-reports"><div class="analysis-panel-head"><div><h4 class="analysis-section-title">Pain &amp; movement reports</h4><p>Exercise-relevant reports stay visible without a separate assessment or readiness tab.</p></div></div><div class="analysis-history">' + (reports.slice(0,12).map((entry) => '<div class="analysis-history-item"><b>' + new Date(entry.date).toLocaleDateString() + ' · ' + escapeHtml(entry.label || 'Client report') + '</b><span>' + escapeHtml(entry.type === 'pain' ? entry.note || entry.value || 'Pain reported' : entry.data.injuryDetails || entry.data.injuryArea || entry.data.pain) + '</span><div class="entry-tools"><button class="tiny-btn" onclick="openSummaryEntryEditor(\'' + escapeHtml(entry.id) + '\')">Add trainer note</button></div></div>').join('') || '<div class="empty-state">No pain or movement-changing reports are attached to this client.</div>') + '</div></section>';
}
function trainerClientDetailsContent(profile,analysis) {
  if (!profile) return '<section class="analysis-panel"><div class="empty-state">This history-only client does not have a saved profile yet.</div></section>';
  const goalLabels = (profile.goals || []).map((goal) => GOALS[goal] ? GOALS[goal].label : goal).join(' + ') || 'Not recorded';
/* A client mid-workout, seen from the trainer's own side of the app. Deliberately NOT the
   owner's client-preview, which swaps the whole portal over to the client's shell - a trainer
   stays in the trainer workspace and opens this from the client's page.
   Only shown while a workout is actually running: no card at all the rest of the time, rather
   than a dead panel on every client. */
function liveWorkoutCardHtml(profile) {
  if (!profile || typeof window.fit4lifeLiveWorkoutFor !== "function") return "";
  const live = window.fit4lifeLiveWorkoutFor(profile.id);
  if (!live || live.finishedAt) return "";
  const started = live.startedAt ? new Date(live.startedAt) : null;
  const minutes = started ? Math.max(0, Math.round((Date.now() - started.getTime()) / 60000)) : null;
  const logged = Object.keys(live.setByExercise || {}).reduce((total, key) => total + (Number(live.setByExercise[key]) || 0), 0);
  const supervision = live.supervision || (assignmentForClient(profile.id) || {}).supervision || "trainer";
  const running = supervision === "solo" ? "On their own"
    : supervision === "floor" ? "Floor hours" : "With a trainer";
  return '<section class="analysis-panel live-workout-panel"><div class="analysis-panel-head"><div>'
    + '<h4 class="analysis-section-title">Working out now</h4>'
    + '<p>' + escapeHtml(running) + (minutes != null ? ' \u00b7 started ' + minutes + ' min ago' : '')
    + (logged ? ' \u00b7 ' + logged + ' set' + (logged === 1 ? '' : 's') + ' logged so far' : '') + '</p>'
    + '</div><span class="tier-badge live-badge">Live</span></div>'
    + '<p class="storage-note">You can fill this in from here while they hold their own phone. '
    + 'Whatever either of you enters lands in the same workout.</p>'
    + '<div class="tool-actions"><button class="small-btn primary" onclick="openTrainerLiveWorkout(\'' + escapeHtml(profile.id) + '\')">Open their workout</button></div>'
    + '</section>';
}

  const limitations = (profile.injuries || []).map((item) => INJURY_LABELS[item] || item).join(', ') || 'None recorded';
  const equipment = (profile.zones || []).join(', ') || 'Not recorded', contact = [profile.email,profile.phone].filter(Boolean).join(' · ') || 'Not recorded';
  const administration = isFit4LifeOwner()
    ? '<button class="small-btn danger" onclick="deleteClientProfile(\'' + escapeHtml(profile.id) + '\')">Delete profile only</button><button class="small-btn danger" onclick="openCompleteDeleteClient(decodeURIComponent(\'' + encodeURIComponent(profile.name) + '\'))">Delete all client data</button>'
    : '<button class="small-btn" onclick="openOwnerRequestDialog(\'client_archive\',\'' + escapeHtml(profile.id) + '\',\'\',\'Archive or delete this client\')">Request owner action</button>';
  return liveWorkoutCardHtml(profile) + (typeof trainerConsultationSummaryHtml === "function" ? trainerConsultationSummaryHtml(profile) : "") + '<section class="analysis-panel client-details-panel"><div class="analysis-panel-head"><div><h4 class="analysis-section-title">Client details</h4><p>The profile facts that affect everyday coaching are grouped here.</p></div><button class="small-btn primary" onclick="openProfileEditor(\'' + escapeHtml(profile.id) + '\')">Edit profile</button></div><div class="client-fact-grid">'
    + [["Primary goal",goalLabels],["Experience",EXP_LABEL(profile.experience)],["Typical session",(profile.minutes || 60) + ' minutes'],["Training frequency",profile.availableDays ? profile.availableDays + ' days/week' : 'Not recorded'],["Limitations",limitations],["Equipment",equipment],["Coaching coverage",trainerClientOwnershipLabel(profile)],["Contact",contact]].map(([label,value]) => '<div class="client-fact"><span>' + escapeHtml(label) + '</span><b>' + escapeHtml(value) + '</b></div>').join('') + '</div></section>'
    + trainerClientSafetyReportsContent(analysis) + trainerNotesTab(analysis) + trainerDocumentsTab(analysis)
    + '<details class="client-admin-zone"><summary>Administrative actions</summary><p>Profile deletion and organization-level changes stay separated from everyday coaching.</p><div class="tool-actions"><button class="small-btn" onclick="openInBodyModal()">Add InBody scan</button><button class="small-btn" onclick="openBodyGoalModal()">Body goals</button>' + administration + '</div></details>';
}
function renderTrainerAnalysis(client) {
  const out = byId("trainerReport"); if (!out) return null;
  const analysis = trainerAnalysisData(client), profile = analysis.profile, filtered = filteredTrainerSummary(analysis);
  const goalLabels = analysis.goals.map((goal) => GOALS[goal] ? GOALS[goal].label : goal).join(" + ");
  trainerSummaryState.tab = normalizeTrainerSummaryTab(trainerSummaryState.tab);
  const tabs = [["overview","Overview"],["workouts","Workouts"],["progress","Progress"],["checkins","Check-ins"],["messages","Messages"],["details","Client details"]];
  let content = trainerClientOverviewContent(analysis,filtered);
  if (trainerSummaryState.tab === "workouts") content = trainerFilterDrawer(analysis,filtered) + clientPastWorkoutsHtml(profile) + summaryHistoryContent(filtered);
  else if (trainerSummaryState.tab === "progress") content = trainerFilterDrawer(analysis,filtered) + trainerProgressReceiptsHtml(profile) + summaryStrengthContent(filtered) + '<details class="formal-review-box"><summary>Body composition &amp; InBody progress</summary>' + renderInBodyContent(analysis) + '</details>';
  else if (trainerSummaryState.tab === "checkins") content = trainerCheckInsTab(profile);
  else if (trainerSummaryState.tab === "messages") content = trainerMessagesTab(profile);
  else if (trainerSummaryState.tab === "details") content = trainerClientDetailsContent(profile,analysis);
  const attentionItems = typeof trainerAttentionSnapshot === "function" ? (trainerAttentionSnapshot().items || []) : [];
  const tabAttention = typeof attentionCountsByTab === "function" ? attentionCountsByTab(profile && profile.id,attentionItems) : {};
  const attentionPanels = typeof attentionPanelsForProfile === "function" ? attentionPanelsForProfile(profile && profile.id,attentionItems) : new Set();
  const profileMeta = profile ? '@' + escapeHtml(profileUsername(profile)) + (profile.age ? ' · Age ' + profile.age : '') + ' · ' + EXP_LABEL(profile.experience) : 'History-only client';
  const assignment = profile && assignmentForClient(profile.id), assignmentLabel = assignment ? assignmentStatusLabel(assignment) : 'No workout assigned';
  out.innerHTML = '<article class="analysis-sheet client-workspace"><header class="analysis-top client-workspace-head"><div class="analysis-client"><h3>' + escapeHtml(client) + '</h3><span>' + profileMeta + '</span><div class="client-workspace-chips"><span>' + escapeHtml(trainerClientOwnershipLabel(profile)) + '</span><span>' + escapeHtml(assignmentLabel) + '</span><span>Goal · ' + escapeHtml(goalLabels) + '</span></div></div><div class="client-workspace-head-actions"><button class="small-btn primary" data-wt="new-workout" onclick="openSelectedClientSession()">New workout</button><button class="small-btn" onclick="setTrainerSummaryTab(\'messages\')">Message</button>' + (profile ? '<button class="small-btn" data-wt="edit-profile" onclick="openProfileEditor(\'' + escapeHtml(profile.id) + '\')">Edit profile</button>' : '') + '</div></header><nav class="summary-tabs" aria-label="Client workspace">' + tabs.map(([key,label]) => { const waiting = tabAttention[key] || 0;
      return '<button class="summary-tab' + (trainerSummaryState.tab === key ? ' on' : '') + (waiting ? ' has-attention' : '')
        + '" onclick="setTrainerSummaryTab(\'' + key + '\')"' + (waiting ? ' title="' + waiting + ' item' + (waiting === 1 ? '' : 's') + ' waiting here"' : '') + '>'
        + label + (waiting ? '<span class="summary-tab-badge">' + (waiting > 9 ? '9+' : waiting) + '</span>' : '') + '</button>'; }).join("") + '</nav><div class="analysis-body">' + trainerAssignmentLoopHtml(profile) + content + '<p class="analysis-note">This workspace uses the client’s workout logs, coach reviews, check-ins, messages, and saved progress records. Safety flags still require trainer review; the summary is not a medical diagnosis.</p></div></article>';
  // Ring the panel that actually resolves what is waiting, so the destination is visible
  // rather than requiring the coach to read every card on the tab.
  attentionPanels.forEach((panelId) => {
    const panel = out.querySelector("#" + panelId);
    if (panel) panel.classList.add("needs-attention");
  });
  if (trainerSummaryState.tab === "progress" && typeof setTimeout === "function") setTimeout(() => { drawHumanScanRadarChart(); drawBodyGoalTrendChart(); }, 0);
  return analysis;
}
function openSummaryEntryEditor(entryId) {
  const entry = loadProgress().find((item) => item.id === entryId); if (!entry) return;
  const meta = summaryMetaFor(entry);
  byId("summaryEntryId").value = entry.id; byId("summaryEntryTitle").textContent = "Organize " + (entry.label || entry.type);
  byId("summaryEntryCategory").value = meta.category || ""; byId("summaryEntryTrainer").value = meta.trainer || ""; byId("summaryEntryNote").value = meta.note || "";
  byId("summaryEntryPinned").checked = !!meta.pinned; byId("summaryEntryExcluded").checked = !!meta.excluded;
  byId("summaryEntryModal").classList.add("open");
}
function closeSummaryEntryEditor() { byId("summaryEntryModal").classList.remove("open"); }
function saveSummaryEntryMeta() {
  const id = byId("summaryEntryId").value, meta = loadSummaryMeta(); if (!id) return;
  meta[id] = { category: byId("summaryEntryCategory").value, trainer: byId("summaryEntryTrainer").value.trim(), note: byId("summaryEntryNote").value.trim(), pinned: byId("summaryEntryPinned").checked, excluded: byId("summaryEntryExcluded").checked, updatedAt: new Date().toISOString() };
  if (!writeSummaryMeta(meta)) return;
  closeSummaryEntryEditor(); renderTrainerAnalysis(selectedTrainerClient); showToast("Client record organization saved");
}
function openBodyGoalModal() {
  if (!selectedTrainerClient) { showToast("Choose a client before setting body-composition goals"); return; }
  const existing = bodyGoalFor(selectedTrainerClient), scans = inBodyScansFor(selectedTrainerClient), baseline = byId("bodyGoalBaseline");
  baseline.innerHTML = scans.length ? scans.map((scan) => '<option value="' + escapeHtml(scan.id) + '">' + new Date(scan.date + 'T12:00:00').toLocaleDateString() + (scan.weight == null ? '' : ' · ' + scan.weight + ' ' + scan.unit) + (scan.pbf == null ? '' : ' · ' + scan.pbf + '% body fat') + '</option>').join("") : '<option value="">No saved scan yet</option>';
  byId("bodyGoalEnabled").checked = existing ? existing.enabled !== false : true;
  byId("bodyGoalType").value = existing && existing.goalType || "fatloss";
  byId("bodyGoalUnit").value = existing && existing.unit || (scans[0] && scans[0].unit) || "lb";
  byId("bodyGoalTargetWeight").value = existing && existing.targetWeight != null ? existing.targetWeight : "";
  byId("bodyGoalTargetPbf").value = existing && existing.targetPbf != null ? existing.targetPbf : "";
  byId("bodyGoalTargetDate").value = existing && existing.targetDate || "";
  byId("bodyGoalMuscle").value = existing && existing.muscleIntention || "preserve";
  byId("bodyGoalWhy").value = existing && existing.why || "";
  if (existing && existing.baselineScanId && scans.some((scan) => scan.id === existing.baselineScanId)) baseline.value = existing.baselineScanId;
  else if (scans.length) baseline.value = scans[scans.length - 1].id;
  byId("bodyGoalModal").classList.add("open");
}
function closeBodyGoalModal() { byId("bodyGoalModal").classList.remove("open"); }
function bodyGoalNumber(id) { const value = byId(id).value; return value === "" ? null : Number(value); }
function saveBodyCompositionGoal() {
  const enabled = byId("bodyGoalEnabled").checked, targetWeight = bodyGoalNumber("bodyGoalTargetWeight"), targetPbf = bodyGoalNumber("bodyGoalTargetPbf");
  if (enabled && targetWeight == null && targetPbf == null) { showToast("Add a goal body weight, a goal body-fat percentage, or both"); return null; }
  if (targetPbf != null && (targetPbf <= 0 || targetPbf >= 100)) { showToast("Enter a body-fat goal between 0 and 100 percent"); return null; }
  const goals = loadBodyGoals(), index = goals.findIndex((goal) => clientMatches(goal.client, selectedTrainerClient)), existing = index >= 0 ? goals[index] : null;
  const goal = { id: existing && existing.id || "body-goal-" + Date.now(), client: selectedTrainerClient, enabled, goalType: byId("bodyGoalType").value, unit: byId("bodyGoalUnit").value, targetWeight, targetPbf, targetDate: byId("bodyGoalTargetDate").value, muscleIntention: byId("bodyGoalMuscle").value, baselineScanId: byId("bodyGoalBaseline").value, why: byId("bodyGoalWhy").value.trim(), updatedAt: new Date().toISOString() };
  if (index >= 0) goals[index] = goal; else goals.push(goal);
  if (!writeBodyGoals(goals)) return null;
  closeBodyGoalModal(); trainerSummaryState.tab = "progress"; trainerSummaryState.inbodyFocus = true; renderTrainerAnalysis(selectedTrainerClient); showToast(enabled ? "Optional body-composition goals saved" : "Body-composition goals turned off"); return goal;
}
const INBODY_NUMERIC_IDS = ["inBodyWeight","inBodySmm","inBodyFatMass","inBodyPbf","inBodyVisceral","inBodyEcw","inBodyScore","inBodyBmi","inBodyAge","inBodyIcw","inBodyExtracellularWater","inBodyTotalBodyWater","inBodyDryLeanMass","inBodyLeanBodyMass","inBodyRightArmMass","inBodyRightArm","inBodyLeftArmMass","inBodyLeftArm","inBodyTrunkMass","inBodyTrunk","inBodyRightLegMass","inBodyRightLeg","inBodyLeftLegMass","inBodyLeftLeg","inBodyFatRightArmMass","inBodyFatRightArmPercent","inBodyFatLeftArmMass","inBodyFatLeftArmPercent","inBodyFatTrunkMass","inBodyFatTrunkPercent","inBodyFatRightLegMass","inBodyFatRightLegPercent","inBodyFatLeftLegMass","inBodyFatLeftLegPercent","inBodyFatControl","inBodyLeanControl","inBodyBmr","inBodyArmCircumference","inBodySmi","inBodyZ5Ra","inBodyZ5La","inBodyZ5Tr","inBodyZ5Rl","inBodyZ5Ll","inBodyZ50Ra","inBodyZ50La","inBodyZ50Tr","inBodyZ50Rl","inBodyZ50Ll","inBodyZ500Ra","inBodyZ500La","inBodyZ500Tr","inBodyZ500Rl","inBodyZ500Ll"];
const INBODY_TEXT_IDS = ["inBodyClientId","inBodyHeight","inBodyTime","inBodyNotes"];
function openInBodyModal() {
  if (!selectedTrainerClient) { showToast("Choose a client before adding an InBody scan"); return; }
  pendingInBodyFile = null; byId("inBodyFile").value = ""; byId("inBodyFileStatus").textContent = "PDF and image files are stored on this device; enter their result values below.";
  [...INBODY_NUMERIC_IDS,...INBODY_TEXT_IDS].forEach((id) => { byId(id).value = ""; }); byId("inBodySex").value = "";
  ["inBodySameTime","inBodyHydration","inBodyRestroom","inBodyNoExercise"].forEach((id) => { byId(id).checked = false; });
  const now = new Date(), profile = trainerProfileFor(selectedTrainerClient); byId("inBodyDate").value = now.toISOString().slice(0,10); byId("inBodyTime").value = now.toTimeString().slice(0,5); byId("inBodyUnit").value = "lb"; if (profile && profile.age) byId("inBodyAge").value = profile.age; byId("inBodyModal").classList.add("open");
}
function closeInBodyModal() { byId("inBodyModal").classList.remove("open"); pendingInBodyFile = null; }
function parseCsvRow(line) {
  const cells = []; let value = "", quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"' && quoted && line[i + 1] === '"') { value += '"'; i += 1; }
    else if (ch === '"') quoted = !quoted;
    else if (ch === ',' && !quoted) { cells.push(value.trim()); value = ""; }
    else value += ch;
  }
  cells.push(value.trim()); return cells;
}
function normalizedImportMap(record) {
  const map = {}, clean = (key) => String(key).toLowerCase().replace(/[^a-z0-9]/g, "");
  const visit = (value, prefix) => { Object.keys(value || {}).forEach((key) => { const next = value[key], path = prefix + clean(key); if (next && typeof next === "object" && !Array.isArray(next)) visit(next,path); else { map[path] = next; if (map[clean(key)] == null) map[clean(key)] = next; } }); };
  visit(record || {}, "");
  return map;
}
function looseNumber(value) {
  const match = String(value == null ? "" : value).replace(/,/g, "").match(/-?\d+(?:\.\d+)?/); return match ? Number(match[0]) : null;
}
function importedValue(map, aliases) {
  for (const alias of aliases) { const key = alias.toLowerCase().replace(/[^a-z0-9]/g, ""); if (map[key] != null && map[key] !== "") return map[key]; }
  return null;
}
function applyInBodyImport(record) {
  const map = normalizedImportMap(record), fields = {
    inBodyWeight: ["weight","body weight"], inBodySmm: ["skeletal muscle mass","smm"], inBodyFatMass: ["body fat mass","bfm"], inBodyPbf: ["percent body fat","pbf","body fat percentage"], inBodyBmi: ["bmi","body mass index"], inBodyVisceral: ["visceral fat level","vfl","visceral fat"], inBodyEcw: ["ecw/tbw","ecw ratio","extracellular water ratio"], inBodyScore: ["inbody score","score"],
    inBodyIcw: ["intracellular water","icw","watericw"], inBodyExtracellularWater: ["extracellular water","ecw","waterecw"], inBodyTotalBodyWater: ["total body water","tbw","watertotalbodywater"], inBodyDryLeanMass: ["dry lean mass","dlm","waterdryleanmass"], inBodyLeanBodyMass: ["lean body mass","lbm","waterleanbodymass"],
    inBodyRightArmMass: ["right arm lean mass","right arm soft lean mass","segmentleanmassrightarm"], inBodyRightArm: ["right arm lean percent","right arm lean percentage","segmentsrightarm"], inBodyLeftArmMass: ["left arm lean mass","left arm soft lean mass","segmentleanmassleftarm"], inBodyLeftArm: ["left arm lean percent","left arm lean percentage","segmentsleftarm"], inBodyTrunkMass: ["trunk lean mass","trunk soft lean mass","segmentleanmasstrunk"], inBodyTrunk: ["trunk lean percent","trunk lean percentage","segmentstrunk"], inBodyRightLegMass: ["right leg lean mass","right leg soft lean mass","segmentleanmassrightleg"], inBodyRightLeg: ["right leg lean percent","right leg lean percentage","segmentsrightleg"], inBodyLeftLegMass: ["left leg lean mass","left leg soft lean mass","segmentleanmassleftleg"], inBodyLeftLeg: ["left leg lean percent","left leg lean percentage","segmentsleftleg"],
    inBodyFatRightArmMass: ["right arm fat mass","segmentfatmassrightarm"], inBodyFatRightArmPercent: ["right arm fat percent","right arm fat percentage","segmentfatpercentrightarm"], inBodyFatLeftArmMass: ["left arm fat mass","segmentfatmassleftarm"], inBodyFatLeftArmPercent: ["left arm fat percent","left arm fat percentage","segmentfatpercentleftarm"], inBodyFatTrunkMass: ["trunk fat mass","segmentfatmasstrunk"], inBodyFatTrunkPercent: ["trunk fat percent","trunk fat percentage","segmentfatpercenttrunk"], inBodyFatRightLegMass: ["right leg fat mass","segmentfatmassrightleg"], inBodyFatRightLegPercent: ["right leg fat percent","right leg fat percentage","segmentfatpercentrightleg"], inBodyFatLeftLegMass: ["left leg fat mass","segmentfatmassleftleg"], inBodyFatLeftLegPercent: ["left leg fat percent","left leg fat percentage","segmentfatpercentleftleg"],
    inBodyFatControl: ["body fat mass control","body fat control","controlbodyfatmass"], inBodyLeanControl: ["lean body mass control","lean mass control","controlleanbodymass"], inBodyBmr: ["basal metabolic rate","bmr","researchbmr"], inBodyArmCircumference: ["arm circumference","researcharmcircumference"], inBodySmi: ["smi","skeletal muscle index","researchsmi"],
    inBodyZ5Ra: ["5khz right arm","impedance5rightarm"], inBodyZ5La: ["5khz left arm","impedance5leftarm"], inBodyZ5Tr: ["5khz trunk","impedance5trunk"], inBodyZ5Rl: ["5khz right leg","impedance5rightleg"], inBodyZ5Ll: ["5khz left leg","impedance5leftleg"], inBodyZ50Ra: ["50khz right arm","impedance50rightarm"], inBodyZ50La: ["50khz left arm","impedance50leftarm"], inBodyZ50Tr: ["50khz trunk","impedance50trunk"], inBodyZ50Rl: ["50khz right leg","impedance50rightleg"], inBodyZ50Ll: ["50khz left leg","impedance50leftleg"], inBodyZ500Ra: ["500khz right arm","impedance500rightarm"], inBodyZ500La: ["500khz left arm","impedance500leftarm"], inBodyZ500Tr: ["500khz trunk","impedance500trunk"], inBodyZ500Rl: ["500khz right leg","impedance500rightleg"], inBodyZ500Ll: ["500khz left leg","impedance500leftleg"],
  };
  let found = 0;
  Object.entries(fields).forEach(([id, aliases]) => { const value = looseNumber(importedValue(map, aliases)); if (value != null) { byId(id).value = value; found += 1; } });
  const date = importedValue(map, ["test date","scan date","date"]); if (date) { const parsed = new Date(date); if (Number.isFinite(parsed.getTime())) byId("inBodyDate").value = parsed.toISOString().slice(0,10); }
  const textFields = { inBodyClientId:["inbody id","client id","subject id","subjectinbodyid"], inBodyHeight:["height","subjectheight"], inBodyTime:["test time","scan time","subjecttesttime"], inBodySex:["sex","gender","subjectsex"] };
  Object.entries(textFields).forEach(([id,aliases]) => { const value = importedValue(map,aliases); if (value != null && value !== "") byId(id).value = String(value); });
  const age = looseNumber(importedValue(map,["age","subjectage"])); if (age != null) byId("inBodyAge").value = age;
  const unit = String(importedValue(map, ["weight unit","unit"]) || "").toLowerCase(); if (unit.includes("kg")) byId("inBodyUnit").value = "kg";
  return found;
}
function handleInBodyFile(input) {
  const file = input.files && input.files[0]; if (!file) return;
  pendingInBodyFile = file; const name = file.name || "InBody result"; byId("inBodyFileStatus").textContent = name + " is ready to save on this device.";
  if (!/\.(csv|json)$/i.test(name)) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      let record;
      if (/\.json$/i.test(name)) { const parsed = JSON.parse(reader.result); record = Array.isArray(parsed) ? parsed[0] : (parsed.results && Array.isArray(parsed.results) ? parsed.results[0] : parsed); }
      else { const lines = String(reader.result).split(/\r?\n/).filter((line) => line.trim()); const headers = parseCsvRow(lines[0] || ""), values = parseCsvRow(lines[1] || ""); record = {}; headers.forEach((header, index) => { record[header] = values[index]; }); }
      const found = applyInBodyImport(record);
      byId("inBodyFileStatus").textContent = found ? name + " imported " + found + " result fields. Review them before saving." : name + " is attached, but its column names were not recognized. Enter the values manually.";
    } catch (_) { byId("inBodyFileStatus").textContent = name + " could not be read automatically. Enter the values manually; the original file can still be saved."; }
  };
  reader.readAsText(file);
}
function inBodyNumber(id) { const value = byId(id).value; return value === "" ? null : Number(value); }
function openInBodyDatabase(success) {
  if (!window.indexedDB) return;
  const request = window.indexedDB.open("fit4life_inbody_files", 1);
  request.onupgradeneeded = () => { const db = request.result; if (!db.objectStoreNames.contains("files")) db.createObjectStore("files"); };
  request.onsuccess = () => success(request.result);
}
function storeInBodyAttachment(id, file) {
  if (!file) return;
  openInBodyDatabase((db) => { const tx = db.transaction("files", "readwrite"); tx.objectStore("files").put(file, id); });
}
function openInBodyAttachment(id) {
  if (!window.indexedDB) { showToast("File attachments are not available in this browser"); return; }
  openInBodyDatabase((db) => { const request = db.transaction("files", "readonly").objectStore("files").get(id); request.onsuccess = () => { if (!request.result) { showToast("The original scan file is not available on this device"); return; } const url = URL.createObjectURL(request.result); window.open(url, "_blank"); setTimeout(() => URL.revokeObjectURL(url), 60000); }; });
}
function deleteInBodyAttachment(id) { if (window.indexedDB) openInBodyDatabase((db) => { db.transaction("files", "readwrite").objectStore("files").delete(id); }); }
function saveInBodyScan() {
  const date = byId("inBodyDate").value, n = inBodyNumber, results = INBODY_NUMERIC_IDS.filter((id) => id !== "inBodyAge").map(n);
  if (!date || !results.some((value) => value != null)) { showToast("Add a scan date and at least one InBody result"); return null; }
  const scan = {
    id: "inbody-" + Date.now() + "-" + Math.random().toString(16).slice(2), client: selectedTrainerClient, date, savedAt: new Date().toISOString(), unit: byId("inBodyUnit").value,
    subject: { inBodyId: byId("inBodyClientId").value.trim(), height: byId("inBodyHeight").value.trim(), age: n("inBodyAge"), sex: byId("inBodySex").value, testTime: byId("inBodyTime").value },
    weight: n("inBodyWeight"), smm: n("inBodySmm"), fatMass: n("inBodyFatMass"), pbf: n("inBodyPbf"), bmi: n("inBodyBmi"), visceral: n("inBodyVisceral"), ecw: n("inBodyEcw"), score: n("inBodyScore"),
    water: { icw: n("inBodyIcw"), ecw: n("inBodyExtracellularWater"), totalBodyWater: n("inBodyTotalBodyWater"), dryLeanMass: n("inBodyDryLeanMass"), leanBodyMass: n("inBodyLeanBodyMass") },
    segments: { rightArm: n("inBodyRightArm"), leftArm: n("inBodyLeftArm"), trunk: n("inBodyTrunk"), rightLeg: n("inBodyRightLeg"), leftLeg: n("inBodyLeftLeg") },
    segmentLeanMass: { rightArm: n("inBodyRightArmMass"), leftArm: n("inBodyLeftArmMass"), trunk: n("inBodyTrunkMass"), rightLeg: n("inBodyRightLegMass"), leftLeg: n("inBodyLeftLegMass") },
    segmentFatMass: { rightArm: n("inBodyFatRightArmMass"), leftArm: n("inBodyFatLeftArmMass"), trunk: n("inBodyFatTrunkMass"), rightLeg: n("inBodyFatRightLegMass"), leftLeg: n("inBodyFatLeftLegMass") },
    segmentFatPercent: { rightArm: n("inBodyFatRightArmPercent"), leftArm: n("inBodyFatLeftArmPercent"), trunk: n("inBodyFatTrunkPercent"), rightLeg: n("inBodyFatRightLegPercent"), leftLeg: n("inBodyFatLeftLegPercent") },
    control: { bodyFatMass: n("inBodyFatControl"), leanBodyMass: n("inBodyLeanControl") }, research: { bmr: n("inBodyBmr"), armCircumference: n("inBodyArmCircumference"), smi: n("inBodySmi") },
    impedance: { "5": { rightArm:n("inBodyZ5Ra"),leftArm:n("inBodyZ5La"),trunk:n("inBodyZ5Tr"),rightLeg:n("inBodyZ5Rl"),leftLeg:n("inBodyZ5Ll") }, "50": { rightArm:n("inBodyZ50Ra"),leftArm:n("inBodyZ50La"),trunk:n("inBodyZ50Tr"),rightLeg:n("inBodyZ50Rl"),leftLeg:n("inBodyZ50Ll") }, "500": { rightArm:n("inBodyZ500Ra"),leftArm:n("inBodyZ500La"),trunk:n("inBodyZ500Tr"),rightLeg:n("inBodyZ500Rl"),leftLeg:n("inBodyZ500Ll") } },
    conditions: { sameTime: byId("inBodySameTime").checked, hydration: byId("inBodyHydration").checked, restroom: byId("inBodyRestroom").checked, noExercise: byId("inBodyNoExercise").checked }, notes: byId("inBodyNotes").value.trim(), fileName: pendingInBodyFile ? pendingInBodyFile.name : "", hasAttachment: !!pendingInBodyFile
  };
  const scans = loadInBodyScans(); scans.unshift(scan); if (!writeInBodyScans(scans)) return null;
  storeInBodyAttachment(scan.id, pendingInBodyFile); closeInBodyModal(); selectedInBodyScanId = scan.id; trainerSummaryState.tab = "inbody"; renderTrainerAnalysis(selectedTrainerClient); showToast("InBody scan saved to " + selectedTrainerClient + "’s progress"); return scan;
}
function deleteInBodyScan(id) {
  if (!window.confirm("Remove this saved InBody scan and its local attachment?")) return;
  if (selectedInBodyScanId === id) selectedInBodyScanId = "";
  writeInBodyScans(loadInBodyScans().filter((scan) => scan.id !== id)); deleteInBodyAttachment(id); renderTrainerAnalysis(selectedTrainerClient); showToast("InBody scan removed");
}
function selectInBodyScan(id) { selectedInBodyScanId = id || ""; renderTrainerAnalysis(selectedTrainerClient); }
function inBodyDelta(latest, first, key) { return latest && first && latest[key] != null && first[key] != null ? latest[key] - first[key] : null; }
function inBodyGoalUpdate(analysis, scans) {
  if (!scans.length) return "Add a baseline scan, then repeat under similar testing conditions to connect body-composition changes with workout performance.";
  if (scans.length < 2) return "Baseline saved. Keep logging strength and workout completion so the next scan can be interpreted alongside performance.";
  const latest = scans[0], first = scans[scans.length - 1], smm = inBodyDelta(latest, first, "smm"), pbf = inBodyDelta(latest, first, "pbf"), fat = inBodyDelta(latest, first, "fatMass");
  const strengthTrends = analysis.exercises.map((item) => item.trend).filter((trend) => trend != null && Number.isFinite(trend));
  const strengthContext = strengthTrends.length ? " Logged estimated strength is trending " + (strengthTrends.reduce((a,b) => a+b,0) / strengthTrends.length >= 0 ? "up " : "down ") + Math.abs(strengthTrends.reduce((a,b) => a+b,0) / strengthTrends.length).toFixed(1) + "% across repeated lifts." : " More repeated-lift data is needed to compare composition with performance.";
  if (["strength","hypertrophy"].includes(analysis.primaryGoal)) {
    if (smm != null && smm > 0) return "Skeletal muscle mass is up " + smm.toFixed(1) + " " + latest.unit + " from baseline. Compare that change with upper- and lower-body strength trends before progressing volume." + strengthContext;
    return "For a muscle or strength goal, watch skeletal muscle mass together with repeated-lift progress. A stable scan does not erase meaningful improvements in technique or strength." + strengthContext;
  }
  if (["fatloss","conditioning"].includes(analysis.primaryGoal)) {
    if (pbf != null && pbf < 0) return "Percent body fat is down " + Math.abs(pbf).toFixed(1) + " points" + (smm != null ? " while skeletal muscle changed " + (smm >= 0 ? "+" : "") + smm.toFixed(1) + " " + latest.unit : "") + ". Keep strength work in the plan while progressing conditioning." + strengthContext;
    if (fat != null && fat < 0) return "Body fat mass is down " + Math.abs(fat).toFixed(1) + " " + latest.unit + ". Check that strength and workout completion remain stable as conditioning progresses." + strengthContext;
  }
  return "Use the body-composition trend as one part of the client review. Strength, workout consistency, readiness, and how the client feels remain equally important." + strengthContext;
}
function convertCompositionWeight(value, fromUnit, toUnit) {
  if (value == null || !Number.isFinite(Number(value))) return null;
  if (!fromUnit || !toUnit || fromUnit === toUnit) return Number(value);
  return fromUnit === "kg" && toUnit === "lb" ? Number(value) * 2.2046226218 : Number(value) / 2.2046226218;
}
function goalProgress(start, current, target) {
  if (![start, current, target].every((value) => value != null && Number.isFinite(Number(value)))) return null;
  const total = Math.abs(target - start);
  if (total < .0001) return { raw: Math.abs(current - target) < .05 ? 100 : 0, percent: Math.abs(current - target) < .05 ? 100 : 0, status: Math.abs(current - target) < .05 ? "reached" : "maintaining" };
  const direction = target > start ? 1 : -1, moved = (current - start) * direction, raw = moved / total * 100;
  return { raw, percent: Math.max(0, Math.min(100, raw)), status: raw >= 100 ? "reached" : raw > 1 ? "moving toward goal" : raw < -1 ? "moving away from goal" : "at baseline" };
}
function bodyGoalProgressData(client, scans) {
  const goal = bodyGoalFor(client); if (!goal || goal.enabled === false || !scans.length) return null;
  const current = scans[0], baseline = scans.find((scan) => scan.id === goal.baselineScanId) || scans[scans.length - 1], unit = goal.unit || current.unit || "lb";
  const baselineWeight = convertCompositionWeight(baseline.weight, baseline.unit, unit), currentWeight = convertCompositionWeight(current.weight, current.unit, unit);
  const weightProgress = goalProgress(baselineWeight, currentWeight, goal.targetWeight), pbfProgress = goalProgress(baseline.pbf, current.pbf, goal.targetPbf);
  const currentFatMass = current.fatMass != null ? convertCompositionWeight(current.fatMass, current.unit, unit) : currentWeight != null && current.pbf != null ? currentWeight * current.pbf / 100 : null;
  const currentNonFatMass = currentWeight != null && currentFatMass != null ? currentWeight - currentFatMass : null;
  const targetFatMass = goal.targetWeight != null && goal.targetPbf != null ? goal.targetWeight * goal.targetPbf / 100 : null;
  const targetNonFatMass = goal.targetWeight != null && targetFatMass != null ? goal.targetWeight - targetFatMass : null;
  const warnings = [];
  if ([currentNonFatMass,targetNonFatMass].every((value) => value != null)) {
    const meaningful = Math.max(unit === "lb" ? 2 : 1, currentNonFatMass * .02), difference = targetNonFatMass - currentNonFatMass;
    if (["preserve","gain"].includes(goal.muscleIntention) && difference < -meaningful) warnings.push("These targets imply about " + Math.abs(difference).toFixed(1) + " " + unit + " less non-fat mass than the latest scan. Review the weight and body-fat goals together with the client.");
    else if (goal.muscleIntention === "gain" && difference <= meaningful) warnings.push("The selected targets do not currently imply a clear increase in non-fat mass. Consider whether the targets match the build-muscle intention.");
  }
  if (goal.targetDate && new Date(goal.targetDate + "T12:00:00").getTime() < Date.now()) warnings.push("The target review date has passed. Update the date or close out the goal with the client.");
  return { goal, baseline, current, unit, baselineWeight, currentWeight, weightProgress, pbfProgress, currentFatMass, currentNonFatMass, targetFatMass, targetNonFatMass, warnings };
}
function bodyGoalValue(weight, pbf, unit) { return (weight == null ? "—" : Number(weight).toFixed(1) + " " + unit) + " · " + (pbf == null ? "—" : Number(pbf).toFixed(1) + "%"); }
function goalProgressCard(label, start, current, target, progress, suffix) {
  if (target == null) return "";
  const percent = progress ? Math.round(progress.percent) : 0, color = progress && progress.status === "moving away from goal" ? "#8e66e8" : progress && progress.status === "reached" ? "#18b77b" : "#12cfd4";
  return '<div class="goal-progress-card"><div class="goal-progress-ring" style="--progress:' + percent + ';--ring-color:' + color + '"><b>' + (progress ? percent + '%' : '—') + '</b></div><div class="goal-progress-copy"><h5>' + label + '</h5><strong>' + (current == null ? 'No current value' : Number(current).toFixed(1) + suffix) + ' → ' + Number(target).toFixed(1) + suffix + '</strong><span>' + (progress ? escapeHtml(progress.status) + ' · started at ' + Number(start).toFixed(1) + suffix : 'A baseline and current scan value are required') + '</span></div></div>';
}
function scanQualityHtml(scan) {
  const conditions = scan.conditions || {}, items = [["sameTime","Similar time"],["hydration","Usual hydration"],["restroom","Restroom first"],["noExercise","No recent exercise"]];
  return '<div class="scan-quality">' + items.map(([key,label]) => '<span class="' + (conditions[key] ? 'on' : '') + '">' + (conditions[key] ? '✓ ' : '') + label + '</span>').join("") + '</div>';
}
function segmentColor(value) { return value == null ? "#46505b" : value >= 100 ? "#20d7b4" : value >= 90 ? "#20a9d7" : "#8e66e8"; }
function segmentTrainingContext(analysis, key) {
  const category = ["rightArm","leftArm","trunk"].includes(key) ? (key === "trunk" ? "core" : "upper") : "lower";
  const region = analysis.regions.find((item) => item.key === category) || { sets: 0, exercises: 0 };
  const trends = analysis.exercises.filter((item) => category === "core" ? automaticExerciseCategory(item.label) === "core" : automaticExerciseCategory(item.label) === category).map((item) => item.trend).filter((value) => value != null && Number.isFinite(value));
  const trend = trends.length ? trends.reduce((sum,value) => sum + value, 0) / trends.length : null;
  return { category, sets: region.sets || 0, exercises: region.exercises || 0, trend };
}
function selectHumanSegment(key) { selectedHumanSegment = key; renderTrainerAnalysis(selectedTrainerClient); }
function setHumanScanMode(mode) { humanScanMode = mode === "fat" ? "fat" : "lean"; renderTrainerAnalysis(selectedTrainerClient); }
function segmentReferenceStatus(value) { return value == null ? "No value" : value >= 100 ? "Above reference" : value >= 90 ? "Near reference" : "Below reference"; }
function humanProgressMapHtml(latest, baseline, analysis) {
  const leanMode = humanScanMode !== "fat", segments = leanMode ? latest.segments || {} : latest.segmentFatPercent || {}, starting = leanMode ? baseline && baseline.segments || {} : baseline && baseline.segmentFatPercent || {}, masses = leanMode ? latest.segmentLeanMass || {} : latest.segmentFatMass || {}, labels = { rightArm: "Right arm", leftArm: "Left arm", trunk: "Trunk", rightLeg: "Right leg", leftLeg: "Left leg" }, context = segmentTrainingContext(analysis, selectedHumanSegment), selectedValue = segments[selectedHumanSegment], startValue = starting[selectedHumanSegment], selectedMass = masses[selectedHumanSegment];
  const order = ["trunk","rightArm","rightLeg","leftLeg","leftArm"], buttons = order.map((key) => { const delta = segments[key] != null && starting[key] != null ? segments[key] - starting[key] : null; return '<button type="button" class="radar-segment-button' + (selectedHumanSegment === key ? ' on' : '') + '" aria-pressed="' + (selectedHumanSegment === key) + '" aria-label="Review ' + labels[key] + ' segment details" onclick="selectHumanSegment(\'' + key + '\')"><b>' + (segments[key] == null ? '—' : Number(segments[key]).toFixed(1) + '%') + '</b><span>' + labels[key] + (masses[key] == null ? '' : ' · ' + Number(masses[key]).toFixed(2) + ' ' + latest.unit) + (delta == null ? '' : ' · Δ' + (delta >= 0 ? '+' : '') + delta.toFixed(1)) + '</span></button>'; }).join("");
  const selectedDelta = selectedValue != null && startValue != null ? selectedValue - startValue : null;
  return '<section class="analysis-panel human-scan-card"><div class="human-scan-head"><div><h4>Human Scan Balance</h4><p>' + (leanMode ? 'Soft lean mass and percentage compared with the starting scan and 100% reference.' : 'Segmental fat mass and percentage compared with the starting scan.') + '</p></div><div class="human-scan-date">Current · ' + new Date(latest.date + 'T12:00:00').toLocaleDateString() + '<br>Start · ' + new Date(baseline.date + 'T12:00:00').toLocaleDateString() + '</div></div><div class="human-scan-toggle" role="group" aria-label="Human Scan analysis mode"><button class="' + (leanMode ? 'on' : '') + '" aria-pressed="' + leanMode + '" onclick="setHumanScanMode(\'lean\')">Soft Lean Mass</button><button class="' + (!leanMode ? 'on' : '') + '" aria-pressed="' + (!leanMode) + '" onclick="setHumanScanMode(\'fat\')">Fat</button></div><div class="human-radar-wrap"><canvas id="humanScanRadarCanvas" class="human-radar-canvas" data-current-id="' + escapeHtml(latest.id || '') + '" data-baseline-id="' + escapeHtml(baseline.id || '') + '" role="img" aria-label="Human Scan ' + (leanMode ? 'soft lean mass' : 'fat') + ' comparison for trunk, arms, and legs"></canvas><div class="radar-person" aria-hidden="true"><div class="radar-person-head"></div><div class="radar-person-torso"></div><div class="radar-person-arm left"></div><div class="radar-person-arm right"></div><div class="radar-person-leg left"></div><div class="radar-person-leg right"></div></div></div><div class="human-radar-legend"><span><i></i>Current scan</span><span><i class="baseline"></i>Starting scan</span>' + (leanMode ? '<span><i class="reference"></i>100% reference</span>' : '') + '</div><div class="radar-segment-grid">' + buttons + '</div><div class="human-scan-detail"><b>' + labels[selectedHumanSegment] + ' · ' + (selectedMass == null ? 'mass not entered' : Number(selectedMass).toFixed(2) + ' ' + latest.unit) + ' · ' + (selectedValue == null ? 'percentage not entered' : Number(selectedValue).toFixed(1) + '%' + (leanMode ? ' · ' + segmentReferenceStatus(selectedValue) : '')) + '</b>' + (selectedDelta == null ? '' : ' · ' + (selectedDelta >= 0 ? '+' : '') + selectedDelta.toFixed(1) + ' points from the starting scan') + '<br>' + context.sets + ' related sets across ' + context.exercises + ' movements in the last 6 weeks' + (context.trend == null ? '.' : ' · repeated-lift trend ' + (context.trend >= 0 ? '+' : '') + context.trend.toFixed(1) + '%.') + '</div></section>';
}
function compositionStageHtml(label, date, weight, pbf, unit, className) {
  return '<div class="composition-stage ' + (className || '') + '"><span class="composition-stage-label">' + label + '</span><span class="composition-stage-date">' + date + '</span><div class="composition-stage-metric"><span>Body weight</span><b>' + (weight == null ? '—' : Number(weight).toFixed(1) + ' ' + unit) + '</b></div><div class="composition-stage-metric"><span>Body fat</span><b>' + (pbf == null ? '—' : Number(pbf).toFixed(1) + '%') + '</b></div></div>';
}
function goalJourneyHtml(label, start, current, target, progress, suffix, remainingUnit) {
  if (target == null) return ""; const percent = progress ? Math.round(progress.percent) : 0, moved = start != null && current != null ? current - start : null, remaining = current != null ? target - current : null;
  const remainingCopy = progress && progress.status === "reached" ? "Goal reached or passed" : remaining == null ? "Add a current scan value" : Math.abs(remaining).toFixed(1) + ' ' + remainingUnit + ' remaining';
  return '<div class="goal-journey"><div class="goal-journey-head"><h5>' + label + '</h5><div class="goal-journey-percent">' + (progress ? percent + '% complete' : 'Needs data') + '</div></div><div class="goal-journey-track" style="--progress:' + percent + '"><div class="goal-journey-fill"></div><div class="goal-journey-marker" aria-hidden="true"></div></div><div class="goal-journey-ends"><span>START ' + (start == null ? '—' : Number(start).toFixed(1) + suffix) + '</span><span>GOAL ' + Number(target).toFixed(1) + suffix + '</span></div><div class="goal-journey-summary"><b>' + remainingCopy + '</b>' + (moved == null ? '' : ' · Current change: ' + (moved >= 0 ? '+' : '') + moved.toFixed(1) + suffix + ' from start') + (progress ? ' · ' + escapeHtml(progress.status) : '') + '</div></div>';
}
function bodyGoalPanelHtml(data) {
  const goal = data.goal, baseline = data.baseline, current = data.current, targetDate = goal.targetDate ? new Date(goal.targetDate + 'T12:00:00').toLocaleDateString() : "No deadline";
  const baselineDate = new Date(baseline.date + 'T12:00:00').toLocaleDateString(), currentDate = new Date(current.date + 'T12:00:00').toLocaleDateString();
  return '<section class="analysis-panel body-goal-comparison"><div class="composition-comparison-head"><div><h4>Body Composition Goal Comparison</h4><p>Starting scan, latest result, and client-approved goal shown together.</p></div><button class="tiny-btn" onclick="openBodyGoalModal()">Edit goals</button></div><div class="composition-stage-flow">' + compositionStageHtml("Starting scan",baselineDate,data.baselineWeight,baseline.pbf,data.unit,"start") + '<div class="composition-flow-arrow" aria-hidden="true">→</div>' + compositionStageHtml("Current scan",currentDate,data.currentWeight,current.pbf,data.unit,"current") + '<div class="composition-flow-arrow" aria-hidden="true">→</div>' + compositionStageHtml("Client goal",targetDate,goal.targetWeight,goal.targetPbf,data.unit,"goal") + '</div><div class="goal-journey-grid">' + goalJourneyHtml("Weight goal",data.baselineWeight,data.currentWeight,goal.targetWeight,data.weightProgress," " + data.unit,data.unit) + goalJourneyHtml("Body-fat goal",baseline.pbf,current.pbf,goal.targetPbf,data.pbfProgress,"%","percentage points") + '</div>' + (data.warnings.length ? data.warnings.map((warning) => '<div class="goal-warning">' + escapeHtml(warning) + '</div>').join("") : '<div class="goal-warning good">The saved weight and body-fat targets are internally consistent with the selected muscle intention based on the latest available values.</div>') + (goal.why ? '<div class="priority-card"><b>Why this matters to the client</b><br>' + escapeHtml(goal.why) + '</div>' : '') + '<p class="analysis-note">Progress percentages measure the distance traveled from the starting scan toward each goal. Non-fat mass is an arithmetic comparison of body weight minus fat mass; it is not the same as skeletal muscle mass.</p></section>';
}
function drawHumanScanRadarChart() {
  const canvas = byId("humanScanRadarCanvas"); if (!canvas || typeof canvas.getContext !== "function") return;
  const scans = inBodyScansFor(selectedTrainerClient); if (!scans.length) return; const goal = bodyGoalFor(selectedTrainerClient), latest = scans.find((scan) => scan.id === canvas.dataset.currentId) || scans[0], baseline = scans.find((scan) => scan.id === canvas.dataset.baselineId) || (goal && goal.enabled !== false ? scans.find((scan) => scan.id === goal.baselineScanId) : null) || scans[scans.length - 1];
  const leanMode = humanScanMode !== "fat", axes = [{ key:"trunk",label:"Trunk",angle:-Math.PI/2 },{ key:"rightArm",label:"Right Arm",angle:-Math.PI/10 },{ key:"rightLeg",label:"Right Leg",angle:Math.PI*3/10 },{ key:"leftLeg",label:"Left Leg",angle:Math.PI*7/10 },{ key:"leftArm",label:"Left Arm",angle:Math.PI*11/10 }], current = leanMode ? latest.segments || {} : latest.segmentFatPercent || {}, starting = leanMode ? baseline.segments || {} : baseline.segmentFatPercent || {};
  const width = Math.max(320,canvas.clientWidth || 720), height = width < 480 ? 390 : 440, ratio = Math.min(2,window.devicePixelRatio || 1); canvas.width = width * ratio; canvas.height = height * ratio;
  const ctx = canvas.getContext("2d"); if (!ctx) return; ctx.scale(ratio,ratio); ctx.clearRect(0,0,width,height);
  const values = axes.flatMap((axis) => [current[axis.key],starting[axis.key]]).filter((value) => value != null && Number.isFinite(Number(value))), maxValue = leanMode ? Math.min(200,Math.max(130,Math.ceil(((values.length ? Math.max(...values) : 120)+10)/10)*10)) : Math.max(40,Math.ceil(((values.length ? Math.max(...values) : 30)+5)/10)*10);
  const cx = width/2, cy = height*.52, radius = Math.min(width*.29,height*.31), point = (index,value) => { const amount = Math.max(0,Math.min(maxValue,Number(value) || 0))/maxValue*radius, angle = axes[index].angle; return [cx+Math.cos(angle)*amount,cy+Math.sin(angle)*amount]; };
  const ring = (amount,stroke,lineWidth) => { ctx.beginPath(); axes.forEach((axis,index) => { const p = [cx+Math.cos(axis.angle)*radius*amount,cy+Math.sin(axis.angle)*radius*amount]; index ? ctx.lineTo(p[0],p[1]) : ctx.moveTo(p[0],p[1]); }); ctx.closePath(); ctx.strokeStyle = stroke; ctx.lineWidth = lineWidth; ctx.stroke(); };
  for (let level=1;level<=5;level+=1) ring(level/5,"#e0e3e6",1);
  axes.forEach((axis) => { ctx.beginPath(); ctx.moveTo(cx,cy); ctx.lineTo(cx+Math.cos(axis.angle)*radius,cy+Math.sin(axis.angle)*radius); ctx.strokeStyle="#e3e5e8"; ctx.lineWidth=1; ctx.stroke(); });
  if (leanMode) ring(Math.min(1,100/maxValue),"#1ab99b",2);
  const polygon = (source,stroke,fill,dashed) => { ctx.save(); ctx.setLineDash(dashed ? [6,5] : []); ctx.beginPath(); axes.forEach((axis,index) => { const p = point(index,source[axis.key]); index ? ctx.lineTo(p[0],p[1]) : ctx.moveTo(p[0],p[1]); }); ctx.closePath(); if (fill) { ctx.fillStyle=fill; ctx.fill(); } ctx.strokeStyle=stroke; ctx.lineWidth=dashed ? 2 : 3; ctx.stroke(); ctx.restore(); };
  polygon(starting,"#8e98a3",null,true); polygon(current,"#354c67","rgba(53,76,103,.48)",false);
  axes.forEach((axis,index) => { const angle=axis.angle, labelRadius=radius+56, value=current[axis.key], start=starting[axis.key], delta=value != null && start != null ? value-start : null; let x=cx+Math.cos(angle)*labelRadius, y=cy+Math.sin(angle)*labelRadius; x=Math.max(58,Math.min(width-58,x)); y=Math.max(18,Math.min(height-48,y)); ctx.textAlign="center"; ctx.font="700 12px system-ui"; ctx.fillStyle="#343940"; ctx.fillText(value == null ? "—" : Number(value).toFixed(1)+"%",x,y); ctx.font="700 10px system-ui"; ctx.fillStyle=value == null ? "#8a9097" : leanMode && value>=100 ? "#159f84" : leanMode && value>=90 ? "#168ab2" : "#7d5cc7"; ctx.fillText(leanMode ? segmentReferenceStatus(value) : "Segmental fat",x,y+14); ctx.font="700 10px system-ui"; ctx.fillStyle="#25292f"; ctx.fillText(axis.label,x,y+28); if (delta != null) { ctx.font="9px system-ui"; ctx.fillStyle="#777c84"; ctx.fillText((delta>=0?"+":"")+delta.toFixed(1)+" from start",x,y+40); } });
}
function drawBodyGoalTrendChart() {
  const canvas = byId("bodyGoalTrendCanvas"); if (!canvas || typeof canvas.getContext !== "function") return;
  const scans = inBodyScansFor(selectedTrainerClient).slice().reverse(), goal = bodyGoalFor(selectedTrainerClient); if (!scans.length || !goal || goal.enabled === false) return;
  const width = Math.max(360, canvas.clientWidth || 720), height = 280, ratio = Math.min(2, window.devicePixelRatio || 1); canvas.width = width * ratio; canvas.height = height * ratio;
  const ctx = canvas.getContext("2d"); if (!ctx) return; ctx.scale(ratio,ratio); ctx.clearRect(0,0,width,height);
  const panels = [{ label: "Body weight (" + goal.unit + ")", key: "weight", target: goal.targetWeight, values: scans.map((scan) => convertCompositionWeight(scan.weight,scan.unit,goal.unit)), color: "#0ca8d6" },{ label: "Body fat (%)", key: "pbf", target: goal.targetPbf, values: scans.map((scan) => scan.pbf), color: "#8e66e8" }];
  panels.forEach((panel,index) => {
    const top = 18 + index * 132, bottom = top + 94, left = 48, right = width - 20, valid = panel.values.filter((value) => value != null && Number.isFinite(value)), domain = valid.concat(panel.target == null ? [] : [panel.target]);
    ctx.font = "700 11px system-ui"; ctx.fillStyle = "#23262c"; ctx.fillText(panel.label,12,top); if (!domain.length) { ctx.font = "10px system-ui"; ctx.fillStyle = "#858a92"; ctx.fillText("No values yet",left,top+42); return; }
    let min = Math.min(...domain), max = Math.max(...domain), pad = Math.max((max-min)*.18, panel.key === "pbf" ? 1 : 2); min -= pad; max += pad;
    const x = (i) => scans.length === 1 ? (left+right)/2 : left + i/(scans.length-1)*(right-left), y = (value) => bottom - (value-min)/(max-min)*(bottom-top-14);
    ctx.strokeStyle = "#e1e4e8"; ctx.lineWidth = 1; [0,.5,1].forEach((fraction) => { const yy = top+14+fraction*(bottom-top-14); ctx.beginPath(); ctx.moveTo(left,yy); ctx.lineTo(right,yy); ctx.stroke(); });
    if (panel.target != null) { ctx.save(); ctx.setLineDash([5,4]); ctx.strokeStyle = "#18a875"; ctx.beginPath(); ctx.moveTo(left,y(panel.target)); ctx.lineTo(right,y(panel.target)); ctx.stroke(); ctx.restore(); ctx.font = "8px system-ui"; ctx.fillStyle = "#12805c"; ctx.fillText("GOAL " + panel.target,Math.max(left,right-55),y(panel.target)-4); }
    ctx.strokeStyle = panel.color; ctx.lineWidth = 2.5; ctx.beginPath(); let started = false; panel.values.forEach((value,i) => { if (value == null) return; if (!started) { ctx.moveTo(x(i),y(value)); started = true; } else ctx.lineTo(x(i),y(value)); }); ctx.stroke();
    panel.values.forEach((value,i) => { if (value == null) return; ctx.fillStyle = panel.color; ctx.beginPath(); ctx.arc(x(i),y(value),3.5,0,Math.PI*2); ctx.fill(); });
    ctx.font = "8px system-ui"; ctx.fillStyle = "#777c84"; scans.forEach((scan,i) => { if (i === 0 || i === scans.length-1 || scans.length <= 4) ctx.fillText(String(scan.date).slice(5),Math.max(3,x(i)-15),bottom+13); });
  });
}
function inBodyDisplay(value, suffix, digits) { return value == null || value === "" ? "—" : Number.isFinite(Number(value)) ? Number(value).toFixed(digits == null ? 1 : digits) + (suffix || "") : escapeHtml(value); }
function inBodyDataGroup(title, rows) { return '<div class="inbody-data-group"><h5>' + title + '</h5>' + rows.map(([label,value]) => '<div class="inbody-data-row"><span>' + label + '</span><b>' + value + '</b></div>').join("") + '</div>'; }
function fullInBodyAnalysisHtml(scan, isLatest) {
  const unit = scan.unit || "lb", subject = scan.subject || {}, water = scan.water || {}, research = scan.research || {}, control = scan.control || {}, leanMass = scan.segmentLeanMass || {}, leanPercent = scan.segments || {}, fatMass = scan.segmentFatMass || {}, fatPercent = scan.segmentFatPercent || {}, impedance = scan.impedance || {};
  const segmentLabels = [["trunk","Trunk"],["rightArm","Right arm"],["leftArm","Left arm"],["rightLeg","Right leg"],["leftLeg","Left leg"]];
  const segmentRows = segmentLabels.map(([key,label]) => '<tr><td><b>' + label + '</b></td><td>' + inBodyDisplay(leanMass[key],' '+unit,2) + '</td><td>' + inBodyDisplay(leanPercent[key],'%',1) + '</td><td>' + inBodyDisplay(fatMass[key],' '+unit,2) + '</td><td>' + inBodyDisplay(fatPercent[key],'%',1) + '</td></tr>').join("");
  const impedanceRow = (frequency) => { const values = impedance[frequency] || {}; return '<tr><td>' + frequency + ' kHz</td><td>' + inBodyDisplay(values.rightArm,' Ω',1) + '</td><td>' + inBodyDisplay(values.leftArm,' Ω',1) + '</td><td>' + inBodyDisplay(values.trunk,' Ω',1) + '</td><td>' + inBodyDisplay(values.rightLeg,' Ω',1) + '</td><td>' + inBodyDisplay(values.leftLeg,' Ω',1) + '</td></tr>'; };
  const subjectItems = [["InBody ID",subject.inBodyId],["Height",subject.height],["Age",subject.age],["Sex",subject.sex],["Tested",new Date(scan.date + 'T12:00:00').toLocaleDateString() + (subject.testTime ? ' · ' + subject.testTime : '')]].filter((item) => item[1] != null && item[1] !== "");
  return '<section class="analysis-panel" style="margin-bottom:14px"><div style="display:flex;justify-content:space-between;gap:10px;align-items:flex-start"><div><h4 class="analysis-section-title">Complete InBody analysis</h4><p style="font-size:9px;color:var(--sheet-ink-faint);margin-top:4px">Every saved result from this scan, grouped for trainer review.</p></div><span class="summary-subcategory">' + (isLatest ? 'Latest scan' : 'Selected history scan') + '</span></div><div class="inbody-subject-strip">' + subjectItems.map(([label,value]) => '<span>' + label + ': <b>' + escapeHtml(value) + '</b></span>').join("") + '</div><div class="inbody-full-grid">'
    + inBodyDataGroup("Composition",[["Body weight",inBodyDisplay(scan.weight,' '+unit,1)],["Skeletal muscle mass",inBodyDisplay(scan.smm,' '+unit,1)],["Body fat mass",inBodyDisplay(scan.fatMass,' '+unit,1)],["Percent body fat",inBodyDisplay(scan.pbf,'%',1)],["BMI",inBodyDisplay(scan.bmi,'',1)],["InBody score",inBodyDisplay(scan.score,'',0)]])
    + inBodyDataGroup("Water & lean tissue",[["Intracellular water",inBodyDisplay(water.icw,' '+unit,1)],["Extracellular water",inBodyDisplay(water.ecw,' '+unit,1)],["Total body water",inBodyDisplay(water.totalBodyWater,' '+unit,1)],["Dry lean mass",inBodyDisplay(water.dryLeanMass,' '+unit,1)],["Lean body mass",inBodyDisplay(water.leanBodyMass,' '+unit,1)],["ECW/TBW",inBodyDisplay(scan.ecw,'',3)]])
    + inBodyDataGroup("Control & research",[["Visceral fat level",inBodyDisplay(scan.visceral,'',0)],["Basal metabolic rate",inBodyDisplay(research.bmr,' kcal',0)],["SMI",inBodyDisplay(research.smi,' kg/m²',1)],["Arm circumference",inBodyDisplay(research.armCircumference,' in',1)],["Body fat mass control",inBodyDisplay(control.bodyFatMass,' '+unit,1)],["Lean body mass control",inBodyDisplay(control.leanBodyMass,' '+unit,1)]])
    + '</div><div class="analysis-table-wrap inbody-segment-table"><table class="analysis-table"><thead><tr><th>Body segment</th><th>Soft lean mass</th><th>Lean %</th><th>Fat mass</th><th>Fat %</th></tr></thead><tbody>' + segmentRows + '</tbody></table></div><details class="inbody-advanced"><summary>Advanced impedance values</summary><div class="analysis-table-wrap"><table class="analysis-table"><thead><tr><th>Frequency</th><th>Right arm</th><th>Left arm</th><th>Trunk</th><th>Right leg</th><th>Left leg</th></tr></thead><tbody>' + impedanceRow("5") + impedanceRow("50") + impedanceRow("500") + '</tbody></table></div></details><p class="analysis-note">Values are displayed as recorded from the result sheet. Trainers should interpret trends alongside scan conditions, workout history, and the client’s goals rather than treating one measurement as a diagnosis.</p></section>';
}
function renderInBodyContent(analysis) {
  const all = inBodyScansFor(analysis.client), scans = all.filter((scan) => summaryDateMatches(scan.date)), goal = bodyGoalFor(analysis.client), activeGoal = goal && goal.enabled !== false;
  const goalSummary = activeGoal ? ({ fatloss:"Reduce body fat", musclegain:"Build muscle", recomp:"Recomposition", maintain:"Maintain" }[goal.goalType] || "Personal goal") + ' · ' + (goal.targetWeight == null ? 'No weight target' : goal.targetWeight + ' ' + goal.unit) + ' · ' + (goal.targetPbf == null ? 'No body-fat target' : goal.targetPbf + '% body fat') : "";
  const goalBanner = activeGoal ? '<div class="body-goal-banner"><div><h4>Body-composition goals active</h4><p>' + escapeHtml(goalSummary) + '</p></div><button class="small-btn" onclick="openBodyGoalModal()">Edit</button></div>' : '<div class="body-goal-banner off"><div><h4>Body goals are optional</h4><p>Keep this area scan-only, or add a client-approved body weight goal, body-fat goal, or both.</p></div><button class="small-btn primary" onclick="openBodyGoalModal()">Set optional goals</button></div>';
  if (!scans.length) return goalBanner + '<section class="analysis-panel"><h4 class="analysis-section-title">InBody progress</h4><div class="empty-state">No InBody scans match this date range.<br><br><button class="small-btn primary" onclick="openInBodyModal()">Add first scan</button></div></section>';
  const latest = scans[0], displayed = scans.find((scan) => scan.id === selectedInBodyScanId) || latest, first = scans[scans.length - 1], metric = (label, key, suffix) => { const delta = inBodyDelta(latest, first, key); return '<div class="summary-filtered-metric"><b>' + (latest[key] == null ? '—' : latest[key] + (suffix || '')) + '</b><span>' + label + (delta == null || scans.length < 2 ? '' : ' · ' + (delta >= 0 ? '+' : '') + delta.toFixed(1) + ' since first') + '</span></div>'; };
  const rows = scans.map((scan) => { const viewing = scan.id === displayed.id; return '<tr><td>' + new Date(scan.date + 'T12:00:00').toLocaleDateString() + (viewing ? ' <span class="summary-subcategory">Viewing</span>' : '') + scanQualityHtml(scan) + '</td><td>' + (scan.weight == null ? '—' : scan.weight + ' ' + scan.unit) + '</td><td>' + (scan.smm == null ? '—' : scan.smm + ' ' + scan.unit) + '</td><td>' + (scan.pbf == null ? '—' : scan.pbf + '%') + '</td><td>' + (scan.fatMass == null ? '—' : scan.fatMass + ' ' + scan.unit) + '</td><td>' + (scan.ecw == null ? '—' : scan.ecw) + '</td><td>' + (scan.score == null ? '—' : scan.score) + '</td><td><div class="entry-tools"><button class="tiny-btn' + (viewing ? ' primary' : '') + '" aria-current="' + viewing + '" onclick="selectInBodyScan(\'' + scan.id + '\')">' + (viewing ? 'Viewing' : 'View details') + '</button>' + (scan.hasAttachment ? '<button class="tiny-btn" onclick="openInBodyAttachment(\'' + scan.id + '\')">Original</button>' : '') + '<button class="tiny-btn" onclick="deleteInBodyScan(\'' + scan.id + '\')">Remove</button></div></td></tr>'; }).join("");
  const goalData = activeGoal ? bodyGoalProgressData(analysis.client, all) : null;
  const radarBaseline = goalData ? goalData.baseline : all[all.length - 1], goalComparison = goalData ? bodyGoalPanelHtml(goalData) : "", humanScan = humanProgressMapHtml(displayed,radarBaseline,analysis);
  const trendVisual = goalData ? '<section class="analysis-panel" style="margin-bottom:14px"><h4 class="analysis-section-title">Weight & body-fat trend</h4><p style="font-size:9px;color:var(--sheet-ink-faint);margin-top:4px">Separate panels keep the two goals readable without combining them into one score.</p><canvas id="bodyGoalTrendCanvas" class="body-trend-canvas" role="img" aria-label="Body weight and body fat trend toward saved goals"></canvas></section>' : '';
  return goalBanner + goalComparison + humanScan + trendVisual + '<div class="summary-filtered-metrics">' + metric('Weight','weight',' ' + latest.unit) + metric('Skeletal muscle mass','smm',' ' + latest.unit) + metric('Percent body fat','pbf','%') + metric('Body fat mass','fatMass',' ' + latest.unit) + '</div>' + fullInBodyAnalysisHtml(displayed, displayed.id === latest.id) + '<div class="analysis-grid"><section class="analysis-panel"><h4 class="analysis-section-title">Coaching update</h4><div class="priority-card">' + escapeHtml(inBodyGoalUpdate(analysis, scans)) + '</div></section><aside class="analysis-panel"><h4 class="analysis-section-title">Displayed scan context</h4><div class="analysis-history-item"><b>' + new Date(displayed.date + 'T12:00:00').toLocaleDateString() + '</b><span>Visceral fat level: ' + (displayed.visceral == null ? '—' : displayed.visceral) + ' · ECW/TBW: ' + (displayed.ecw == null ? '—' : displayed.ecw) + ' · InBody score: ' + (displayed.score == null ? '—' : displayed.score) + '</span></div>' + scanQualityHtml(displayed) + (displayed.notes ? '<div class="priority-card">' + escapeHtml(displayed.notes) + '</div>' : '') + '<div class="tool-actions"><button class="small-btn primary" onclick="openInBodyModal()">Add another scan</button></div></aside></div><section class="analysis-panel" style="margin-top:14px"><h4 class="analysis-section-title">Scan history</h4><div class="analysis-table-wrap"><table class="analysis-table"><thead><tr><th>Date & conditions</th><th>Weight</th><th>SMM</th><th>Body fat %</th><th>Fat mass</th><th>ECW/TBW</th><th>Score</th><th>Actions</th></tr></thead><tbody>' + rows + '</tbody></table></div><p class="analysis-note">Choose View details to open every saved value from an older scan. InBody scan files remain on this device. Extracted values and optional goals are included in FIT4LIFE backups; original PDF/image attachments are not.</p></section>';
}
function csvCell(value) { const text = String(value == null ? "" : value); return '"' + text.replace(/"/g, '""') + '"'; }
function downloadTextFile(name, textValue, type) {
  const blob = new Blob([textValue], { type: type || "text/plain" }), url = URL.createObjectURL(blob), link = document.createElement("a");
  link.href = url; link.download = name; link.click(); URL.revokeObjectURL(url);
}
function exportFilteredClientSummary() {
  const analysis = trainerAnalysisData(selectedTrainerClient), filtered = filteredTrainerSummary(analysis);
  let rows = [["type","date","client","workout","category","exercise","value","trainer","pinned","excluded","trainer note"]];
  // renderTrainerAnalysis() normalises "inbody" to "progress" on every render, so this
  // branch could never be reached and the InBody view silently exported generic workout
  // columns. Detect the InBody sub-view explicitly instead of relying on the tab name.
  if (trainerSummaryState.tab === "inbody" || trainerSummaryState.inbodyFocus) {
    const goal = bodyGoalFor(selectedTrainerClient) || {};
    rows = [["type","date","client","InBody ID","height","age","sex","test time","weight","unit","skeletal muscle mass","body fat mass","percent body fat","BMI","intracellular water","extracellular water","total body water","dry lean mass","lean body mass","visceral fat level","ECW/TBW","InBody score","right arm lean mass","left arm lean mass","trunk lean mass","right leg lean mass","left leg lean mass","right arm lean %","left arm lean %","trunk lean %","right leg lean %","left leg lean %","right arm fat mass","left arm fat mass","trunk fat mass","right leg fat mass","left leg fat mass","right arm fat %","left arm fat %","trunk fat %","right leg fat %","left leg fat %","body fat mass control","lean body mass control","basal metabolic rate","arm circumference","SMI","5 kHz right arm","5 kHz left arm","5 kHz trunk","5 kHz right leg","5 kHz left leg","50 kHz right arm","50 kHz left arm","50 kHz trunk","50 kHz right leg","50 kHz left leg","500 kHz right arm","500 kHz left arm","500 kHz trunk","500 kHz right leg","500 kHz left leg","similar time","usual hydration","restroom first","no recent exercise","goal enabled","goal weight","goal body fat %","goal date","notes","original file"]];
    inBodyScansFor(selectedTrainerClient).filter((scan) => summaryDateMatches(scan.date)).forEach((scan) => {
      const subject = scan.subject || {}, water = scan.water || {}, leanMass = scan.segmentLeanMass || {}, leanPercent = scan.segments || {}, fatMass = scan.segmentFatMass || {}, fatPercent = scan.segmentFatPercent || {}, control = scan.control || {}, research = scan.research || {}, impedance = scan.impedance || {}, z5 = impedance["5"] || {}, z50 = impedance["50"] || {}, z500 = impedance["500"] || {}, conditions = scan.conditions || {};
      rows.push(["InBody",scan.date,scan.client,subject.inBodyId,subject.height,subject.age,subject.sex,subject.testTime,scan.weight,scan.unit,scan.smm,scan.fatMass,scan.pbf,scan.bmi,water.icw,water.ecw,water.totalBodyWater,water.dryLeanMass,water.leanBodyMass,scan.visceral,scan.ecw,scan.score,leanMass.rightArm,leanMass.leftArm,leanMass.trunk,leanMass.rightLeg,leanMass.leftLeg,leanPercent.rightArm,leanPercent.leftArm,leanPercent.trunk,leanPercent.rightLeg,leanPercent.leftLeg,fatMass.rightArm,fatMass.leftArm,fatMass.trunk,fatMass.rightLeg,fatMass.leftLeg,fatPercent.rightArm,fatPercent.leftArm,fatPercent.trunk,fatPercent.rightLeg,fatPercent.leftLeg,control.bodyFatMass,control.leanBodyMass,research.bmr,research.armCircumference,research.smi,z5.rightArm,z5.leftArm,z5.trunk,z5.rightLeg,z5.leftLeg,z50.rightArm,z50.leftArm,z50.trunk,z50.rightLeg,z50.leftLeg,z500.rightArm,z500.leftArm,z500.trunk,z500.rightLeg,z500.leftLeg,conditions.sameTime,conditions.hydration,conditions.restroom,conditions.noExercise,goal.enabled !== false && !!goal.id,goal.targetWeight,goal.targetPbf,goal.targetDate,scan.notes,scan.fileName]);
    });
  } else filtered.entries.forEach((entry) => { const meta = summaryMetaFor(entry); rows.push([entry.type,entry.date,entry.client,sessionKeyForEntry(entry),entryCategory(entry),entry.label,entry.value,meta.trainer,meta.pinned,meta.excluded,meta.note]); });
  downloadTextFile("fit4life-" + selectedTrainerClient.toLowerCase().replace(/[^a-z0-9]+/g,"-") + "-filtered.csv", rows.map((row) => row.map(csvCell).join(",")).join("\n"), "text/csv"); showToast("Filtered client summary exported");
}
function printFilteredClientSummary() {
  if (document.body) document.body.classList.add("summary-printing");
  window.print(); setTimeout(() => { if (document.body) document.body.classList.remove("summary-printing"); }, 500);
}
function startNewClient() {
  if (!requireTrainerMutation("add clients")) return null;
  state.solo = { client: "", goal: "", goals: [], trainingStyle:"auto", cardioMode:"any", cardioModes:["any"], coachAdjustment:null, readinessTrend:null, experience: "", age: 30, minutes: 60, muscles: [], injuries: [], zones: [] };
  state.mode = "solo"; state.session = null; state.sessionOptions = []; renderForms(); setMode("solo"); openBuilder();
  byId("builderQuestion").textContent = "Who is new?"; byId("builderTitle").textContent = "Create Client & First Workout"; byId("builderCopy").textContent = "Search first to prevent duplicates, create the trainer-managed profile, then use the same screen to build and assign the client’s first plan.";
}
function openSelectedClientSession() {
  const profile = trainerProfileFor(selectedTrainerClient);
  if (!profile) { state.solo.client = selectedTrainerClient; state.session = null; state.sessionOptions = []; renderForms(); setMode("solo"); openBuilder(); return; }
  state.solo = { profileId: profile.id, client: profile.name, username: profileUsername(profile), goal: profile.goals[0] || "general", goals: [...(profile.goals || [])], trainingStyle:profile.trainingStyle || "auto", cardioMode:profile.cardioMode || "any", cardioModes:normalizeCardioPreferences(profile.cardioModes || profile.cardioMode), coachAdjustment:profile.coachAdjustment ? { ...profile.coachAdjustment } : null, readinessTrend:readinessTrendContext(profile), experience: profile.experience, age: profile.age, minutes: profile.minutes || 60, muscles: [...(profile.muscles || [])], injuries: [...(profile.injuries || [])], limitationAssessments:JSON.parse(JSON.stringify(profile.limitationAssessments || {})), zones: [...(profile.zones || [])], trainingPhase:profile.trainingPhase || "general", phaseStartedAt:profile.phaseStartedAt || "", availableDays:Number(profile.availableDays) || 3, sport:profile.sport || "", sportSchedule:profile.sportSchedule || "", competitionDate:profile.competitionDate || "", exercisePreferences:{ ...(profile.exercisePreferences || {}) }, exercisePrescriptions:{ ...(profile.exercisePrescriptions || {}) }, exerciseSubstitutions:{ ...(profile.exerciseSubstitutions || {}) }, phaseCompoundAnchors:{ ...(profile.phaseCompoundAnchors || {}) },usualTrainingRpe:Number(profile.usualTrainingRpe) || null,coachingPriorities:[...(profile.coachingPriorities || [])],coachingPreferenceNote:profile.coachingPreferenceNote || "",pastPhysicalActivities:profile.pastPhysicalActivities || "",fitnessInterests:[...(profile.fitnessInterests || [])] };
  state.mode = "solo"; state.session = null; state.sessionOptions = []; renderForms(); setMode("solo"); openBuilder(); showToast("Loaded " + profile.name + " into a new session");
}
function openSelectedClientProgram() {
  const profile = trainerProfileFor(selectedTrainerClient); openPrograms();
  if (profile) {
    selectProgramProfile(profile.id);
    const saved = savedProgramFor(profile);
    if (saved) {
      currentProgram = JSON.parse(JSON.stringify(saved));
      renderProgram();
      byId("programPrintBtn").disabled = false;
      byId("programApproveBtn").disabled = Boolean(currentProgram.approval && currentProgram.approval.status === "approved");
      byId("programSaveBtn").disabled = !(currentProgram.approval && currentProgram.approval.status === "approved");
      byId("programSaveOnlyBtn").disabled = !(currentProgram.approval && currentProgram.approval.status === "approved");
      showToast("Loaded " + profile.name + "’s saved program version " + Number(currentProgram.versionNumber || 1));
    }
  }
  else byId("programClient").value = selectedTrainerClient;
}
function openCurrentClientSummary() {
  if (!state.session) { openTrainerHub(); return; }
  const session = state.session.type === "solo" ? state.session.data : state.session.data.a;
  openTrainerHub(session.spec.client || "");
}
function renderProgressHistory() {
  const container = byId("progressHistory");
  if (!container) return;
  const client = byId("historyClientFilter") ? byId("historyClientFilter").value : "";
  const type = byId("historyTypeFilter") ? byId("historyTypeFilter").value : "";
  const typeFilter = byId("historyTypeFilter"), summaryButton = byId("historySummaryBtn");
  container.innerHTML = "";
  if (typeFilter) typeFilter.disabled = !client;
  if (summaryButton) summaryButton.disabled = !client;
  if (!client) {
    const gate = document.createElement("div");
    gate.className = "history-client-gate";
    gate.innerHTML = "<div><b>Select a client first</b><p>Client records stay hidden until you choose one person above. This keeps the page focused and prevents every client’s movements from loading at once.</p></div>";
    container.appendChild(gate);
    return;
  }
  const entries = loadProgress().filter((entry) => clientMatches(entry.client, client) && (!type || entry.type === type));
  if (!entries.length) { const empty = el("div", "empty-state", "No saved entries match these filters."); container.appendChild(empty); return; }
  entries.slice(0, 20).forEach((entry) => {
    const item = el("article", "history-item");
    const main = el("div", "history-main", (entry.client || "Client") + " · " + (entry.label || "Entry"));
    const value = el("div", "history-value", entry.value || "");
    const meta = el("div", "history-meta", new Date(entry.date).toLocaleString() + " · " + (entry.type || "entry"));
    const note = el("div", "history-meta", entry.note || "");
    item.append(main, value, meta, note); container.appendChild(item);
  });
}
function renderClientSummary() {
  const out = byId("clientSummary"), selected = byId("historyClientFilter").value;
  if (!selected) { out.innerHTML = '<div class="empty-state">Choose one client above to build a useful summary.</div>'; return null; }
  const entries = loadProgress().filter((entry) => clientMatches(entry.client, selected));
  const workouts = entries.filter((e) => e.type === "workout"), sets = entries.filter((e) => e.type === "set"), readiness = entries.find((e) => e.type === "readiness");
  const reviews = workouts.map((e) => e.data).filter(Boolean);
  const avgDifficulty = reviews.length ? (reviews.reduce((sum, r) => sum + Number(r.difficulty || 0), 0) / reviews.length).toFixed(1) : "—";
  const injuryAreas = [...new Set(reviews.filter((r) => r.pain && r.pain !== "none" && r.injuryArea).map((r) => r.injuryArea))];
  const latestByExercise = [];
  sets.forEach((entry) => { if (!latestByExercise.some((item) => item.label === entry.label)) latestByExercise.push(entry); });
  const last = reviews[0], latestWorkout = workouts[0];
  let recommendation = "Keep logging completed sets and a finish review so future recommendations become more specific.";
  if (last && ["changed", "stopped"].includes(last.pain)) recommendation = "Do not repeat the aggravating movement unchanged. Keep " + (last.injuryArea ? INJURY_LABELS[last.injuryArea].toLowerCase() : "the painful area") + " filtered, use pain-free alternatives, and seek qualified evaluation for sharp, worsening, or unexplained symptoms.";
  else if (last && (last.difficulty >= 9 || last.completion === "stopped" || last.energy <= 2)) recommendation = "Reduce the next workout’s load or working sets and confirm readiness during the warm-up.";
  else if (last && last.difficulty <= 6 && last.completion === "all" && last.energy >= 3) recommendation = "The last workout was comfortable. Progress one variable: add a rep or the smallest available load while keeping clean form.";
  else if (last) recommendation = "Repeat the successful working loads, then progress only the exercises that still felt controlled.";
  const latestWorkoutDetails = latestWorkout && last
    ? new Date(latestWorkout.date).toLocaleDateString() + " · " + (last.goals || []).map((goal) => GOALS[goal] ? GOALS[goal].label : goal).join(" + ") + " · " + last.duration + " min · " + last.loggedSets + " logged sets · difficulty " + last.difficulty + "/10 · " + (last.completion === "all" ? "completed" : last.completion)
      + (last.pain !== "none" ? " · pain: " + (last.injuryArea ? INJURY_LABELS[last.injuryArea] : last.pain) : " · no pain reported")
      + (last.notes ? " · " + last.notes : "") + (last.injuryDetails ? " · injury note: " + last.injuryDetails : "")
    : "No reviewed workout yet";
  out.innerHTML = '<section class="client-summary"><div class="result-label">Client workout summary</div><h3>' + escapeHtml(selected) + '</h3>'
    + '<div class="summary-metrics"><div class="summary-metric"><b>' + workouts.length + '</b><span>reviewed workouts</span></div><div class="summary-metric"><b>' + sets.length + '</b><span>logged sets</span></div><div class="summary-metric"><b>' + avgDifficulty + '</b><span>average difficulty</span></div><div class="summary-metric"><b>' + (readiness ? escapeHtml(readiness.value) : "—") + '</b><span>latest readiness</span></div></div>'
    + '<div class="summary-list"><div><b>Next-workout guidance</b><p>' + escapeHtml(recommendation) + '</p></div>'
    + '<div><b>Latest reviewed workout</b><p>' + escapeHtml(latestWorkoutDetails) + '</p></div>'
    + '<div><b>Reported injury areas</b><p>' + (injuryAreas.length ? injuryAreas.map((area) => escapeHtml(INJURY_LABELS[area] || area)).join(", ") : "None reported in saved reviews") + '</p></div>'
    + '<div><b>Latest exercise results</b><p>' + (latestByExercise.length ? latestByExercise.slice(0, 8).map((entry) => escapeHtml(entry.label + ": " + entry.value)).join("<br>") : "No working sets logged yet") + '</p></div></div></section>';
  return { workouts: workouts.length, sets: sets.length, avgDifficulty, injuryAreas, recommendation };
}
