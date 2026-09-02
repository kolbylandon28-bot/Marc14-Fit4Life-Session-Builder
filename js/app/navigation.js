/* ---------- navigation ---------- */
let portalRole = "";
let currentView = "home";
const CLIENT_APP_VIEWS = ["client-home","client-program","client-progress","client-coach","client-more"];
const COACH_SHELL_VIEWS = ["trainer-menu","trainer","builder","programs","tools","readiness","advanced","coach-module"];
const ACTIVE_CLIENT_KEY = "fit4life_active_client_v1";
function signedInTrainerCanPreview() { return (window.fit4lifeCloudRole || "") === "owner"; }
function trainerClientPreviewActive() { return signedInTrainerCanPreview() && portalRole === "client"; }
function syncTrainerClientPreviewBar() {
  const bar = document.getElementById("trainerClientPreviewBar"), select = document.getElementById("trainerClientPreviewSelect");
  if (!bar || !select) return false;
  const visible = trainerClientPreviewActive() && (CLIENT_APP_VIEWS.includes(currentView) || ["active-workout","checkin","tools"].includes(currentView));
  bar.classList.toggle("show",visible);
  if (!visible) return false;
  const profiles = loadProfiles(), activeId = activeClientProfileId();
  select.innerHTML = profiles.map((profile) => '<option value="' + escapeHtml(profile.id) + '"' + (profile.id === activeId ? ' selected' : '') + '>' + escapeHtml(profile.name) + ' · @' + escapeHtml(profileUsername(profile)) + '</option>').join("") || '<option value="">No saved clients</option>';
  select.disabled = !profiles.length;
  return true;
}
function show(view) {
  const signedInRole = window.fit4lifeCloudRole || "";
  const clientOnlyView = CLIENT_APP_VIEWS.includes(view) || ["client-menu","client-workout","client-consultation","active-workout","checkin"].includes(view);
  if (signedInRole === "client" && activeClientProfile() && view !== "client-consultation" && clientOnlyView && typeof clientNeedsRequiredConsultation === "function" && clientNeedsRequiredConsultation()) { openClientConsultation(true); return; }
  if (signedInRole === "trainer" && clientOnlyView) { portalRole = "trainer"; view = "trainer-menu"; showToast("Trainer accounts use the coaching workspace only"); }
  document.querySelectorAll(".view").forEach((v) => v.classList.remove("active"));
  const target = document.getElementById("view-" + view); if (target) target.classList.add("active");
  currentView = view;
  const home = document.getElementById("homeBtn"), context = document.getElementById("portalContext");
  const inMenu = ["trainer-menu","client-menu"].includes(view);
  const requiredConsultation = view === "client-consultation" && typeof clientNeedsRequiredConsultation === "function" && clientNeedsRequiredConsultation();
  home.classList.toggle("show", !requiredConsultation && view !== "home" && view !== "client-home" && (view !== "trainer-menu" || signedInTrainerCanPreview()));
  home.textContent = view === "trainer-menu" && signedInTrainerCanPreview() ? "\u2190 Choose side" : CLIENT_APP_VIEWS.includes(view) ? "\u2190 Client home" : view === "active-workout" ? "\u2190 Leave workout" : inMenu ? "\u2190 Workspace" : portalRole ? "\u2190 " + (portalRole === "trainer" ? "Trainer" : "Client") + " workspace" : "\u2190 Home";
  context.textContent = portalRole ? (portalRole === "trainer" ? "Trainer workspace" : view === "client-consultation" ? "Client setup" : trainerClientPreviewActive() ? "Owner preview · client side" : "Client workspace") : "";
  context.classList.toggle("show", Boolean(portalRole) && view !== "home");
  // Trainer Assistance is only useful to a signed-in trainer, and never on top of a running walkthrough
  const helpBtn = document.getElementById("trainerHelpBtn");
  if (helpBtn) helpBtn.classList.toggle("show", portalRole === "trainer" && view !== "home" && !(typeof walkthroughActive === "function" && walkthroughActive()));
  // The client "?" lives in the topbar rather than the bottom nav, because the bottom nav is
  // absent from the active workout - the one screen "Log your sets" can be run from. Hidden
  // during the required consultation so it cannot be used to get around that gate.
  const clientHelp = document.getElementById("clientHelpBtn");
  if (clientHelp) clientHelp.classList.toggle("show", portalRole === "client" && !requiredConsultation
    && view !== "home" && !(typeof walkthroughActive === "function" && walkthroughActive()));
  const clientNav = document.getElementById("clientBottomNav"), showClientNav = portalRole === "client" && CLIENT_APP_VIEWS.includes(view);
  if (clientNav) { clientNav.classList.toggle("show",showClientNav); clientNav.querySelectorAll("button").forEach((button) => button.classList.toggle("on",view === "client-" + button.dataset.clientTab)); }
  const coachNav = document.getElementById("coachSidebar"), showCoachNav = portalRole === "trainer" && COACH_SHELL_VIEWS.includes(view) && trainerIsUnlocked();
  if (coachNav) { coachNav.classList.toggle("show",showCoachNav); const key = openCoachDestination.current || ({"trainer-menu":"dashboard",trainer:"clients",builder:"programming",programs:"programming",tools:"dashboard",readiness:"assessments",advanced:"business"}[view] || ""); coachNav.querySelectorAll("[data-coach-nav]").forEach((button) => button.classList.toggle("on",button.dataset.coachNav === key)); }
  if (document.body && document.body.classList) document.body.classList.toggle("coach-shell-on",showCoachNav);
  if (typeof closeCoachMoreSheet === "function") closeCoachMoreSheet();
  if (typeof syncCoachMoreBadge === "function") syncCoachMoreBadge();
  if (showClientNav) renderClientAppView(view);
  syncTrainerClientPreviewBar();
  if (portalRole === "trainer" && trainerIsUnlocked()) renderTrainerAttention();
  if (typeof syncRoleGovernanceControls === "function") syncRoleGovernanceControls();
  window.scrollTo(0, 0);
}
function selectPortalRole(role) {
  const signedInRole = window.fit4lifeCloudRole || "";
  if (signedInRole === "client") { portalRole = "client"; if (activeClientProfile()) openClientTab("home"); else show("client-menu"); return; }
  if (["owner","trainer"].includes(signedInRole)) {
    if (role === "client") { if (signedInRole === "owner") openTrainerClientPreview(); else { portalRole = "trainer"; show("trainer-menu"); showToast("Trainer accounts use the coaching workspace only"); } return; }
    portalRole = "trainer"; show("trainer-menu"); return;
  }
  if (role === "trainer") { openTrainerPortal(); return; }
  portalRole = "client";
  if (activeClientProfile()) openClientTab("home"); else show("client-menu");
}
function routeAuthenticatedWorkspace() {
  const role = window.fit4lifeCloudRole || "";
  if (role === "owner") { portalRole = ""; show("home"); return "owner"; }
  if (role === "trainer") { portalRole = "trainer"; show("trainer-menu"); return "trainer"; }
  if (role === "client") { portalRole = "client"; if (activeClientProfile() && typeof clientNeedsRequiredConsultation === "function" && clientNeedsRequiredConsultation()) openClientConsultation(true); else if (activeClientProfile()) openClientTab("home"); else show("client-menu"); return "client"; }
  portalRole = ""; show("home"); return "";
}
function switchPortalRole() { routeAuthenticatedWorkspace(); }
function returnToPortalHome() { routeAuthenticatedWorkspace(); }
function goHome() {
  if (currentView === "client-consultation" && typeof clientNeedsRequiredConsultation === "function" && clientNeedsRequiredConsultation()) { openClientConsultation(true); return; }
  if (currentView === "active-workout") { leaveActiveWorkout(); return; }
  if (CLIENT_APP_VIEWS.includes(currentView)) { openClientTab("home"); return; }
  if (["trainer-menu","client-menu"].includes(currentView)) { switchPortalRole(); return; }
  if (portalRole === "trainer") show("trainer-menu");
  else if (portalRole === "client" && activeClientProfile()) openClientTab("home");
  else if (portalRole === "client") show("client-menu");
  else show("home");
}
function activeClientProfileId() { try { return localStorage.getItem(ACTIVE_CLIENT_KEY) || ""; } catch (_) { return ""; } }
function activeClientProfile() { const id = activeClientProfileId(); return loadProfiles().find((profile) => profile.id === id) || null; }
function activateClientProfile(profileId) {
  if ((window.fit4lifeCloudRole || "") === "trainer") { portalRole = "trainer"; show("trainer-menu"); showToast("Trainer accounts cannot enter the client-side workspace"); return null; }
  const profile = loadProfiles().find((item) => item.id === profileId); if (!profile) return null;
  if ((window.fit4lifeCloudRole || "") === "client") {
    const ownProfile = activeClientProfile() || loadProfiles()[0];
    if (ownProfile && ownProfile.id !== profile.id) { showToast("Client accounts can open only their own profile"); return null; }
  }
  try { localStorage.setItem(ACTIVE_CLIENT_KEY,profile.id); } catch (_) {}
  portalRole = "client"; openClientTab("home"); return profile;
}
function openTrainerClientPreview(profileId) {
  if (!signedInTrainerCanPreview() || !trainerIsUnlocked()) { showToast("Owner access is required to preview clients"); return null; }
  const profiles = loadProfiles();
  if (!profiles.length) { portalRole = "trainer"; show("trainer-menu"); showToast("Create a client profile before opening client preview"); return null; }
  const profile = profiles.find((item) => item.id === profileId) || profiles.find((item) => item.id === activeClientProfileId()) || profiles[0];
  try { localStorage.setItem(ACTIVE_CLIENT_KEY,profile.id); } catch (_) {}
  portalRole = "client"; openClientTab("home"); return profile;
}
function switchTrainerClientPreview(profileId) {
  if (!signedInTrainerCanPreview()) return null;
  const profile = loadProfiles().find((item) => item.id === profileId); if (!profile) return null;
  try { localStorage.setItem(ACTIVE_CLIENT_KEY,profile.id); } catch (_) {}
  portalRole = "client"; openClientTab("home"); showToast("Previewing " + profile.name); return profile;
}
function exitTrainerClientPreview() { if (!signedInTrainerCanPreview()) return routeAuthenticatedWorkspace(); portalRole = "trainer"; show("trainer-menu"); return "trainer"; }
function clearActiveClient() { try { localStorage.removeItem(ACTIVE_CLIENT_KEY); } catch (_) {} portalRole = "client"; openClientWorkout(); }
function openClientTab(tab) {
  if ((window.fit4lifeCloudRole || "") === "trainer") { portalRole = "trainer"; show("trainer-menu"); showToast("Trainer accounts cannot enter the client-side workspace"); return null; }
  if (!activeClientProfile()) { openClientWorkout(); return; }
  if ((window.fit4lifeCloudRole || "") === "client" && typeof clientNeedsRequiredConsultation === "function" && clientNeedsRequiredConsultation()) { openClientConsultation(true); return null; }
  const safe = ["home","program","progress","coach","more"].includes(tab) ? tab : "home";
  portalRole = "client"; show("client-" + safe);
}
function syncBuilderRoleCopy() {
  const isClient = portalRole === "client";
  byId("builderQuestion").textContent = isClient ? "What am I doing today?" : "What are we training today?";
  byId("builderTitle").textContent = isClient ? "My Workout" : "Build a Workout";
  byId("builderCopy").textContent = isClient
    ? "Find your name or username first. Your saved goals, limitations, and equipment will load before you compare today’s workout options."
    : "Choose the client and session details, compare three truly different workout approaches, then customize the best fit.";
}
function openBuilder() { renderForms(); syncBuilderRoleCopy(); show("builder"); }
function openScratchWorkoutBuilder() {
  if (!requireTrainerMutation("build a workout from scratch")) return false;
  portalRole = "trainer";
  state.mode = "solo";
  openBuilder();
  setMode("solo");
  showToast("Choose or load a client, then use Build from scratch");
  return true;
}
const STARRED_WORKOUTS_KEY = "fit4life_starred_workouts_v1";
/* ---------- starred workouts ---------- */
// Two audiences, two meanings. A trainer starring a workout is a judgement about
// programming quality, so it can go to their reusable library, to one client's
// suggestions, or both. A client starring a workout is a statement about enjoyment -
// an adherence signal - so it stays on their own profile and never silently becomes
// gym-wide programming advice.
function loadStarredWorkouts() { return loadLocalArray(STARRED_WORKOUTS_KEY); }
function writeStarredWorkouts(list) { return writeLocalArray(STARRED_WORKOUTS_KEY,list,2000); }
function starredWorkoutSnapshot(session) {
  const data = session && session.data ? session.data : session;
  const names = [];
  (data && data.blocks || []).forEach((block) => (block.items || []).forEach((item) => { if (item && item.name) names.push(item.name); }));
  return { title:(data && data.goalLabel) || "Workout", movements:names.slice(0,12), minutes:(data && data.spec && data.spec.minutes) || null,
           goal:(data && data.spec && data.spec.goal) || "", session:JSON.parse(JSON.stringify(data || {})) };
}
function starWorkout(session,options) {
  const opts = options || {}, snapshot = starredWorkoutSnapshot(session);
  const record = { id:"starred-" + Date.now() + "-" + Math.random().toString(16).slice(2),
    starredBy:opts.starredBy === "client" ? "client" : "trainer",
    scope:opts.scope || "library", profileId:opts.profileId || "", client:opts.client || "",
    starredByName:opts.starredByName || "", starredByUserId:opts.starredByUserId || (typeof currentAccountIdentity === "function" ? (currentAccountIdentity().id || "") : ""), createdAt:new Date().toISOString(), ...snapshot };
  const list = loadStarredWorkouts();
  list.unshift(record);
  return writeStarredWorkouts(list) ? record : null;
}
// scope: "library" = the trainer's reusable set · "client" = suggested to one client ·
// "both" = written to each, so removing one does not remove the other.
function starWorkoutForTrainer(session,scope,profile,identityName) {
  const results = [];
  if (scope === "library" || scope === "both") results.push(starWorkout(session,{ starredBy:"trainer",scope:"library",starredByName:identityName }));
  if ((scope === "client" || scope === "both") && profile) {
    results.push(starWorkout(session,{ starredBy:"trainer",scope:"client",profileId:profile.id,client:profile.name,starredByName:identityName }));
  }
  return results.filter(Boolean);
}
function starWorkoutForClient(session,profile) {
  if (!profile) return null;
  return starWorkout(session,{ starredBy:"client",scope:"client",profileId:profile.id,client:profile.name });
}
/* ---------- save workout dialog ---------- */
// Trainers choose where a saved workout goes, because the two destinations mean
// different things: the library is reusable programming, a client's suggestions are
// aimed at one person. Both writes are independent records, so removing it from one
// never removes it from the other.
function currentBuilderSession() {
  if (!state || !state.session) return null;
  const plans = typeof workoutPlans === "function" ? workoutPlans(state.session) : [];
  return plans.length ? plans[0].session : (state.session.data || null);
}
// Accepts an explicit session so a completed workout from a client's history can be
// saved as readily as the one currently in the builder.
let saveWorkoutSource = null;
let saveWorkoutProfileId = "";
function openSaveWorkoutDialog(session,profileOverride) {
  const resolved = session || currentBuilderSession();
  if (!resolved) { showToast("Build a workout before saving it"); return; }
  saveWorkoutSource = session ? JSON.parse(JSON.stringify(session)) : null;
  saveWorkoutProfileId = profileOverride ? profileOverride.id : "";
  const spec = resolved.spec || {};
  const profile = profileOverride || (spec.profileId ? loadProfiles().find((item) => item.id === spec.profileId) : null);
  let modal = byId("saveWorkoutModal");
  if (!modal) {
    const wrapper = document.createElement("div");
    wrapper.innerHTML = '<div id="saveWorkoutModal" class="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="saveWorkoutTitle" aria-hidden="true">'
      + '<div class="review-dialog save-workout-dialog"><h2 id="saveWorkoutTitle">Save workout</h2>'
      + '<p id="saveWorkoutSummary" class="calendar-summary-when"></p>'
      + '<div class="compact-field"><label for="saveWorkoutName">Name it</label>'
      + '<input id="saveWorkoutName" maxlength="80" placeholder="Lower body strength"></div>'
      + '<div class="compact-field"><label for="saveWorkoutScope">Save to</label>'
      + '<select id="saveWorkoutScope"></select>'
      + '<span class="storage-note" id="saveWorkoutHint"></span></div>'
      + '<div class="tool-actions"><button class="small-btn primary" id="saveWorkoutConfirm">Save</button>'
      + '<button class="small-btn" onclick="closeSaveWorkoutDialog()">Cancel</button></div></div></div>';
    modal = wrapper.firstElementChild;
    document.body.appendChild(modal);
  }
  const movements = [];
  (resolved.blocks || []).forEach((block) => (block.items || []).forEach((item) => { if (item && item.name) movements.push(item.name); }));
  byId("saveWorkoutSummary").textContent = movements.slice(0,4).join(" · ") || "No movements yet";
  byId("saveWorkoutName").value = resolved.goalLabel || "Workout";
  const scope = byId("saveWorkoutScope");
  // Only offer the client option when the builder actually has one loaded.
  scope.innerHTML = '<option value="library">My workout library</option>'
    + (profile ? '<option value="client">Suggested for ' + escapeHtml(profile.name) + '</option>'
               + '<option value="both">Both</option>' : '');
  const hint = byId("saveWorkoutHint");
  const syncHint = () => {
    hint.textContent = scope.value === "library"
      ? "Visible to every trainer on the Team page. Only you and an owner can edit or remove it."
      : scope.value === "client" ? "Appears on this client's record as a suggested session."
      : "Saved twice, as independent records.";
  };
  scope.onchange = syncHint; syncHint();
  byId("saveWorkoutConfirm").onclick = () => confirmSaveWorkout();
  modal.classList.add("open"); modal.setAttribute("aria-hidden","false");
  window.setTimeout(() => { const name = byId("saveWorkoutName"); if (name) name.select(); },0);
}
function closeSaveWorkoutDialog() {
  saveWorkoutSource = null; saveWorkoutProfileId = "";
  const modal = byId("saveWorkoutModal");
  if (modal) { modal.classList.remove("open"); modal.setAttribute("aria-hidden","true"); }
}
function confirmSaveWorkout() {
  if (typeof requireTrainerMutation === "function" && !requireTrainerMutation("save workouts")) return null;
  const session = saveWorkoutSource || currentBuilderSession();
  if (!session) { showToast("Build a workout before saving it"); return null; }
  const scope = byId("saveWorkoutScope").value || "library";
  const name = byId("saveWorkoutName").value.trim();
  const spec = session.spec || {};
  const profile = (saveWorkoutProfileId ? loadProfiles().find((item) => item.id === saveWorkoutProfileId) : null)
    || (spec.profileId ? loadProfiles().find((item) => item.id === spec.profileId) : null);
  if ((scope === "client" || scope === "both") && !profile) { showToast("Load a saved client before saving to their record"); return null; }
  const identity = typeof currentAccountIdentity === "function" ? currentAccountIdentity() : { displayName:"Trainer" };
  const saved = starWorkoutForTrainer({ data:session },scope,profile,identity.displayName);
  if (!saved.length) { showToast("The workout could not be saved. Try again."); return null; }
  // Apply the trainer's title to whatever was just written.
  if (name) {
    const list = loadStarredWorkouts();
    saved.forEach((record) => { const index = list.findIndex((item) => item.id === record.id); if (index >= 0) list[index] = { ...list[index],title:name }; });
    writeStarredWorkouts(list);
  }
  closeSaveWorkoutDialog();
  showToast(scope === "library" ? "Saved to your library"
    : scope === "client" ? "Suggested to " + profile.name
    : "Saved to your library and suggested to " + profile.name);
  return saved;
}
function starredWorkoutsForProfile(profileId) {
  return loadStarredWorkouts().filter((item) => item.scope === "client" && item.profileId === profileId);
}
function trainerWorkoutLibrary() {
  return loadStarredWorkouts().filter((item) => item.scope === "library");
}
function unstarWorkout(id) {
  const list = loadStarredWorkouts().filter((item) => item.id !== id);
  return writeStarredWorkouts(list);
}
const ASSIGNED_WORKOUTS_KEY = "fit4life_assigned_workouts_v1";
const SAVED_PROGRAMS_KEY = "fit4life_saved_programs_v1";
const CLIENT_DAILY_KEY = "fit4life_client_daily_v1";
const CLIENT_MESSAGES_KEY = "fit4life_client_messages_v1";
const ACTIVE_WORKOUT_KEY = "fit4life_active_workout_v1";
const ATTENTION_STATE_KEY = "fit4life_attention_state_v1";
const PROGRESS_RECEIPTS_KEY = "fit4life_progress_receipts_v1";
const PROGRESS_RECEIPT_RESPONSES_KEY = "fit4life_progress_receipt_responses_v1";
function loadProgressReceipts() { return loadLocalArray(PROGRESS_RECEIPTS_KEY); }
function writeProgressReceipts(items) { return writeLocalArray(PROGRESS_RECEIPTS_KEY,items,1000); }
function progressReceiptsForProfile(profileId,publishedOnly) {
  return loadProgressReceipts().filter((item) => item.profileId === profileId && (!publishedOnly || item.status === "published")).sort((a,b) => String(b.publishedAt || b.updatedAt || b.createdAt).localeCompare(String(a.publishedAt || a.updatedAt || a.createdAt)));
}
function progressReceiptResponsesForProfile(profileId) {
  return loadLocalArray(PROGRESS_RECEIPT_RESPONSES_KEY).filter((item) => item.profileId === profileId);
}
function receiptResponseFor(receipt) { return progressReceiptResponsesForProfile(receipt.profileId).find((item) => item.receiptId === receipt.id) || null; }
function receiptDate(value) { const time = new Date(value || 0).getTime(); return Number.isFinite(time) ? time : 0; }
function receiptPeriodStart(profile,type) {
  const published = progressReceiptsForProfile(profile.id,true).filter((item) => type === "formal" ? item.type === "formal" : true).sort((a,b) => receiptDate(b.publishedAt) - receiptDate(a.publishedAt))[0];
  return published && published.publishedAt || (type === "formal" ? profile.lastFormalReceiptAt : "") || profile.phaseStartedAt || profile.createdAt || profile.updatedAt || new Date().toISOString();
}
function reviewedAssignmentsSince(profile,startAt) {
  const start = receiptDate(startAt);
  return assignmentsForClient(profile.id).filter((assignment) => ["completed","reviewed"].includes(assignmentStatus(assignment)) && receiptDate(assignment.completedAt || assignment.coachReviewedAt || assignment.assignedAt) >= start).sort((a,b) => receiptDate(a.completedAt) - receiptDate(b.completedAt));
}
function progressReceiptDueStatus(profile,type) {
  if (!profile) return {due:false,type:type || "weekly",count:0,days:0};
  const cadence = type === "formal" ? "formal" : "weekly", receipts = progressReceiptsForProfile(profile.id,false), draft = receipts.find((item) => item.type === cadence && item.status === "draft");
  const startAt = draft && draft.periodStart || receiptPeriodStart(profile,cadence), assignments = reviewedAssignmentsSince(profile,startAt), startTime = receiptDate(startAt) || Date.now();
  const days = Math.max(0,Math.floor((Date.now() - startTime) / 86400000));
  const due = Boolean(draft) || (cadence === "formal" ? assignments.length >= 4 || days >= 28 : assignments.length >= 2 && (days >= 7 || assignments.length >= 3));
  const dueAt = new Date(startTime + (cadence === "formal" ? 28 : 7) * 86400000).toISOString();
  return {due,type:cadence,draft,count:assignments.length,days,startAt,dueAt,assignments,reason:draft ? "A trainer draft is waiting to be published." : cadence === "formal" ? assignments.length >= 4 ? assignments.length + " reviewed workouts are ready for the four-week decision." : "The four-week review date has arrived." : assignments.length >= 3 ? assignments.length + " reviewed workouts are ready for a client update." : "The weekly coaching update is due."};
}
function nextProgressReceiptRequest(profile) {
  const formal = progressReceiptDueStatus(profile,"formal"); if (formal.due) return formal;
  return progressReceiptDueStatus(profile,"weekly");
}
function receiptLines(value,limit) {
  return String(value || "").split(/\n+/).map((line) => line.replace(/^[\s•*-]+/,"").trim()).filter(Boolean).slice(0,limit || 3);
}
function receiptEvidenceFor(profile,type,periodStart,seed) {
  const analysis = trainerAnalysisData(profile.name), goal = goalContractProgress(profile), assignments = reviewedAssignmentsSince(profile,periodStart), reviews = assignments.map((item) => item.clientReview).filter(Boolean);
  const completionMap = {all:100,most:80,some:50,stopped:20}, averageCompletion = reviews.length ? Math.round(reviews.reduce((sum,item) => sum + (completionMap[item.completion] || 0),0) / reviews.length) : null;
  const improved = [], needsWork = [], nextChanges = [];
  if (assignments.length) improved.push("Completed " + assignments.length + " reviewed workout" + (assignments.length === 1 ? "" : "s") + (averageCompletion == null ? "." : " with " + averageCompletion + "% average planned completion."));
  const positiveTrend = analysis.exercises.filter((item) => Number.isFinite(item.trend) && item.trend > 0).sort((a,b) => b.trend - a.trend)[0];
  if (positiveTrend) improved.push(positiveTrend.label + " estimated strength improved " + positiveTrend.trend.toFixed(1) + "% across comparable sessions.");
  const prs = [...new Set(assignments.flatMap((item) => item.clientReview && item.clientReview.personalRecords || []))];
  if (prs.length) improved.push("Personal best recorded: " + prs.slice(0,2).join(" · ") + ".");
  if (goal.percent != null && goal.current != null) improved.push("The current goal measure is " + goalValueLabel(goal.current,goal.contract.unit) + " — " + goal.percent + "% of the measured path from baseline to target.");
  if (!improved.length) improved.push("Building your baseline: the completed work is being saved, but another comparable session is needed before claiming a performance change.");
  const safetyReview = reviews.find((item) => item && item.pain && item.pain !== "none");
  if (safetyReview) needsWork.push("Keep " + String(safetyReview.injuryArea && INJURY_LABELS[safetyReview.injuryArea] || "the reported discomfort").toLowerCase() + " inside a pain-free range; do not progress the aggravating movement yet.");
  if (averageCompletion != null && averageCompletion < 75) needsWork.push("Session completion averaged " + averageCompletion + "%. The plan needs to fit the client’s available time before adding more work.");
  if (!analysis.comparableExercises) needsWork.push("Repeat the key movements across separate sessions so load and rep changes can be compared honestly.");
  if (!goalContractIsComplete(goal.contract)) needsWork.push("Finish the goal contract so progress can be judged against one measurable target and the client’s real reason.");
  if (!needsWork.length) needsWork.push("Keep technique, pain-free range, and recovery consistent while the next block adds only one progression variable at a time.");
  const adjustment = profile.coachAdjustment || {}, actionCopy = {
    repeat:"Repeat the successful movement structure and working loads before changing the exercise menu.",
    progress:"Progress one variable on controlled exercises: one rep or the smallest available load, not both.",
    reduce:"Reduce working volume or load until completion, technique, and recovery return to target.",
    pain_swap:"Replace the painful pattern with an approved pain-free option and reassess before loading it."
  };
  if (seed && seed.formalDecision) {
    const formalCopy = {continue:"Continue the current phase and preserve its compound anchors.",deload:"Add or extend a deload before the next loading block.",change:"Change the next phase emphasis while preserving useful benchmarks.",rebuild:"Rebuild the next phase around the updated goal, safety, and schedule evidence."};
    nextChanges.push(formalCopy[seed.formalDecision] || formalCopy.continue);
  }
  nextChanges.push(actionCopy[adjustment.action] || analysis.priority);
  if (adjustment.note) nextChanges.push(adjustment.note);
  if (type === "formal" && nextChanges.length < 2) nextChanges.push("Set the next four-week benchmarks and keep accessories flexible around the client’s response.");
  const evidenceIds = [...new Set(assignments.map((item) => item.id).concat(analysis.recentWorkouts.map((item) => item.id),analysis.recentSets.map((item) => item.id)).filter(Boolean))];
  const evidenceSummary = analysis.evidenceDetail + " · receipt period includes " + assignments.length + " completed/reviewed workout" + (assignments.length === 1 ? "" : "s") + ".";
  const name = String(profile.name || "Client").split(/\s+/)[0], recognition = assignments.length ? name + ", your consistency is creating useful evidence. " : name + ", the first win is establishing an honest baseline. ";
  const goalMessage = goal.contract.deeperReason ? "This keeps the plan connected to why this matters to you." : "We will keep the next steps simple and measurable.";
  return {analysis,goal,assignments,evidenceIds,evidenceSummary,improved:improved.slice(0,3),needsWork:needsWork.slice(0,2),nextChanges:[...new Set(nextChanges.filter(Boolean))].slice(0,3),coachMessage:recognition + goalMessage};
}
function buildProgressReceiptDraft(profile,type,seed) {
  const cadence = type === "formal" ? "formal" : "weekly", existing = progressReceiptsForProfile(profile.id,false).find((item) => item.type === cadence && item.status === "draft");
  if (existing) return existing;
  const due = progressReceiptDueStatus(profile,cadence), periodStart = due.startAt || receiptPeriodStart(profile,cadence), evidence = receiptEvidenceFor(profile,cadence,periodStart,seed || {});
  return {
    id:"receipt-" + Date.now() + "-" + Math.random().toString(16).slice(2),profileId:profile.id,client:profile.name,type:cadence,status:"draft",
    periodStart,periodEnd:new Date().toISOString(),goalSnapshot:{statedGoal:evidence.goal.contract.statedGoal,deeperReason:evidence.goal.contract.deeperReason,metricLabel:evidence.goal.contract.metricLabel,currentValue:evidence.goal.current,targetValue:evidence.goal.target,unit:evidence.goal.contract.unit,targetDate:evidence.goal.contract.targetDate},
    evidenceIds:evidence.evidenceIds,evidenceSummary:evidence.evidenceSummary,improved:evidence.improved,needsWork:evidence.needsWork,nextChanges:evidence.nextChanges,coachMessage:(seed && seed.formalNote ? seed.formalNote + " " : "") + evidence.coachMessage,
    formalDecision:seed && seed.formalDecision || "",createdAt:new Date().toISOString(),updatedAt:new Date().toISOString(),createdBy:currentAccountIdentity().displayName
  };
}
function upsertProgressReceipt(receipt) {
  const receipts = loadProgressReceipts(), index = receipts.findIndex((item) => item.id === receipt.id);
  if (index >= 0) receipts[index] = receipt; else receipts.unshift(receipt);
  return writeProgressReceipts(receipts) ? receipt : null;
}
function progressReceiptListHtml(items) {
  return '<ul>' + (items || []).map((item) => '<li>' + escapeHtml(item) + '</li>').join("") + '</ul>';
}
function progressReceiptCardHtml(profile,receipt,compact) {
  if (!receipt) return "";
  const response = receiptResponseFor(receipt), published = new Date(receipt.publishedAt || receipt.updatedAt).toLocaleDateString(), reason = receipt.goalSnapshot && receipt.goalSnapshot.deeperReason;
  return '<section class="client-card wide progress-receipt-card"><div class="receipt-head"><div><div class="client-section-label">' + (receipt.type === "formal" ? "Four-week progress receipt" : "Weekly progress receipt") + '</div><h3>' + escapeHtml(receipt.type === "formal" ? "Your plan review" : "Your coaching update") + '</h3><p>Published ' + published + ' by ' + escapeHtml(receipt.publishedBy || "your coach") + '</p></div><span class="receipt-status">' + (response && response.acknowledgedAt ? "Read" : "New") + '</span></div>'
    + (reason ? '<div class="receipt-why"><b>Why you started</b>' + escapeHtml(reason) + '</div>' : '')
    + '<div class="receipt-sections"><div class="receipt-section improved"><h4>What improved</h4>' + progressReceiptListHtml(compact ? (receipt.improved || []).slice(0,1) : receipt.improved) + '</div><div class="receipt-section"><h4>What needs work</h4>' + progressReceiptListHtml(compact ? (receipt.needsWork || []).slice(0,1) : receipt.needsWork) + '</div><div class="receipt-section next"><h4>What changes next</h4>' + progressReceiptListHtml(compact ? (receipt.nextChanges || []).slice(0,1) : receipt.nextChanges) + '</div></div>'
    + (receipt.coachMessage ? '<div class="receipt-why"><b>Message from your coach</b>' + escapeHtml(receipt.coachMessage) + '</div>' : '')
    + (!compact ? '<div class="receipt-evidence">Evidence used: ' + escapeHtml(receipt.evidenceSummary || "Workout and coaching records from this receipt period.") + '</div>' : '')
    + '<div class="tool-actions">' + (response && response.acknowledgedAt ? '<button class="small-btn" disabled>Receipt read</button>' : '<button class="small-btn primary" onclick="acknowledgeProgressReceipt(\'' + escapeHtml(receipt.id) + '\')">I read this</button>') + '<button class="small-btn" onclick="askAboutProgressReceipt(\'' + escapeHtml(receipt.id) + '\')">Ask my coach</button>' + (compact ? '<button class="small-btn" onclick="setClientProgressSection(\'overview\')">View full receipt</button>' : '') + '</div></section>';
}
function latestPublishedProgressReceipt(profile) { return progressReceiptsForProfile(profile.id,true)[0] || null; }
function clientProgressReceiptsHtml(profile) {
  const receipts = progressReceiptsForProfile(profile.id,true);
  if (!receipts.length) return '<section class="client-card wide"><div class="client-section-label">Progress receipts</div><h3>Building your first update</h3><p>Your trainer will publish a simple, evidence-based receipt after enough comparable workouts are complete. Drafts are never shown here.</p></section>';
  return '<section class="client-card wide"><div class="client-section-label">Progress receipt history</div><h3>What improved, what needs work, and what changes next</h3><div class="receipt-history">' + receipts.map((receipt,index) => '<details ' + (index === 0 ? 'open' : '') + '><summary>' + (receipt.type === "formal" ? "Four-week review" : "Weekly update") + ' · ' + new Date(receipt.publishedAt || receipt.updatedAt).toLocaleDateString() + '</summary><div class="receipt-history-body">' + progressReceiptCardHtml(profile,receipt,false) + '</div></details>').join("") + '</div></section>';
}
function acknowledgeProgressReceipt(receiptId) {
  const profile = activeClientProfile(), receipt = loadProgressReceipts().find((item) => item.id === receiptId && item.status === "published"); if (!profile || !receipt || receipt.profileId !== profile.id) return false;
  const items = loadLocalArray(PROGRESS_RECEIPT_RESPONSES_KEY), existing = items.find((item) => item.receiptId === receipt.id), now = new Date().toISOString();
  if (existing) existing.acknowledgedAt = now; else items.unshift({id:"receipt-response-" + Date.now(),receiptId:receipt.id,profileId:profile.id,acknowledgedAt:now});
  if (!writeLocalArray(PROGRESS_RECEIPT_RESPONSES_KEY,items,1000)) return false; renderClientAppView(currentView); showToast("Receipt marked read"); return true;
}
function askAboutProgressReceipt(receiptId) {
  const profile = activeClientProfile(), receipt = loadProgressReceipts().find((item) => item.id === receiptId && item.status === "published"); if (!profile || !receipt) return false;
  openClientTab("coach");
  setTimeout(() => { const input = byId("clientMessageInput"); if (input) { input.value = "Question about my " + (receipt.type === "formal" ? "four-week" : "weekly") + " progress receipt: "; input.focus(); } },30);
  return true;
}
function trainerProgressReceiptsHtml(profile) {
  if (!profile) return "";
  const receipts = progressReceiptsForProfile(profile.id,false), due = nextProgressReceiptRequest(profile), draft = receipts.find((item) => item.status === "draft");
  return '<section class="analysis-panel" style="margin-top:14px"><div class="analysis-panel-head"><div><h4 class="analysis-section-title">Progress receipts</h4><p style="font-size:9px;color:var(--text-faint);margin-top:4px">Client-facing coaching updates remain drafts until a trainer confirms and publishes them.</p></div><button class="small-btn primary" onclick="openProgressReceiptEditor(\'' + escapeHtml(profile.id) + '\',\'' + escapeHtml(due.due ? due.type : "weekly") + '\')">' + (draft ? "Review draft" : due.due ? "Create due receipt" : "Create update") + '</button></div>'
    + (due.due ? '<div class="receipt-due-note"><b>' + (due.type === "formal" ? "Formal receipt requested." : "Progress receipt requested.") + '</b> ' + escapeHtml(due.reason) + '</div>' : '<div class="priority-card">Next weekly receipt opens after at least two reviewed workouts and seven days (or three reviewed workouts). The formal receipt opens after four reviewed workouts or 28 days.</div>')
    + '<div class="analysis-history">' + (receipts.slice(0,8).map((receipt) => '<div class="analysis-history-item"><div><b>' + (receipt.type === "formal" ? "Four-week" : "Weekly") + ' receipt · ' + escapeHtml(receipt.status) + '</b><span>' + new Date(receipt.publishedAt || receipt.updatedAt || receipt.createdAt).toLocaleDateString() + ' · ' + escapeHtml(receipt.evidenceSummary || "Evidence draft") + '</span></div><button class="small-btn" onclick="openProgressReceiptEditor(\'' + escapeHtml(profile.id) + '\',\'' + escapeHtml(receipt.type) + '\',\'' + escapeHtml(receipt.id) + '\')">' + (receipt.status === "published" ? "View / revise" : "Review draft") + '</button></div>').join("") || '<div class="empty-state">No progress receipt has been created yet.</div>') + '</div></section>';
}
function closeProgressReceiptEditor() { const modal = byId("progressReceiptModal"); if (modal) modal.classList.remove("open"); }
function openProgressReceiptEditor(profileId,type,receiptId,seed) {
  if (!requireTrainerMutation("review and publish progress receipts")) return null;
  const profile = loadProfiles().find((item) => item.id === profileId); if (!profile) return null;
  let receipt = receiptId ? loadProgressReceipts().find((item) => item.id === receiptId) : progressReceiptsForProfile(profile.id,false).find((item) => item.type === (type === "formal" ? "formal" : "weekly") && item.status === "draft");
  if (receipt && receipt.status === "published") {
    const original = receipt;
    receipt = {...original,id:"receipt-" + Date.now() + "-" + Math.random().toString(16).slice(2),status:"draft",supersedesId:original.id,publishedAt:"",publishedBy:"",publishedByUserId:"",createdAt:new Date().toISOString(),updatedAt:new Date().toISOString(),createdBy:currentAccountIdentity().displayName};
    if (!upsertProgressReceipt(receipt)) return null;
    showToast("A new draft was created so the published receipt remains in the coaching record");
  }
  if (!receipt) { receipt = buildProgressReceiptDraft(profile,type,seed); if (!upsertProgressReceipt(receipt)) return null; }
  const due = progressReceiptDueStatus(profile,receipt.type);
  byId("progressReceiptId").value = receipt.id; byId("progressReceiptProfileId").value = profile.id; byId("progressReceiptType").value = receipt.type;
  byId("progressReceiptTitle").textContent = "Progress receipt · " + profile.name; byId("progressReceiptCadence").textContent = receipt.type === "formal" ? "Four-week formal receipt" : "Weekly progress receipt"; byId("progressReceiptStatus").textContent = receipt.status === "published" ? "Published" : "Draft";
  byId("progressReceiptDueNote").innerHTML = '<b>' + (due.due ? "Requested now." : "Optional update.") + '</b> ' + escapeHtml(due.due ? due.reason : "This can be saved as a trainer draft without notifying the client.");
  byId("progressReceiptEvidence").textContent = receipt.evidenceSummary || "No evidence summary available.";
  byId("progressReceiptImproved").value = (receipt.improved || []).join("\n"); byId("progressReceiptNeedsWork").value = (receipt.needsWork || []).join("\n"); byId("progressReceiptNext").value = (receipt.nextChanges || []).join("\n"); byId("progressReceiptCoachMessage").value = receipt.coachMessage || "";
  byId("progressReceiptModal").classList.add("open"); return receipt;
}
function saveProgressReceipt(publish) {
  if (!requireTrainerMutation(publish ? "publish progress receipts" : "save progress receipt drafts")) return null;
  const id = byId("progressReceiptId").value, receipts = loadProgressReceipts(), index = receipts.findIndex((item) => item.id === id); if (index < 0) { showToast("This receipt draft is no longer available. Close this window and reopen it from the client record."); return null; }
  const improved = receiptLines(byId("progressReceiptImproved").value,3), needsWork = receiptLines(byId("progressReceiptNeedsWork").value,2), nextChanges = receiptLines(byId("progressReceiptNext").value,3), coachMessage = byId("progressReceiptCoachMessage").value.trim();
  if (!improved.length || !needsWork.length || !nextChanges.length) { showToast("Keep one clear item in each receipt section"); return null; }
  const now = new Date().toISOString(), identity = currentAccountIdentity(), receipt = {...receipts[index],improved,needsWork,nextChanges,coachMessage,updatedAt:now,updatedBy:identity.displayName};
  if (publish) { receipt.status = "published"; receipt.publishedAt = now; receipt.publishedBy = identity.displayName; receipt.publishedByUserId = identity.id || ""; }
  receipts[index] = receipt; if (!writeProgressReceipts(receipts)) return null;
  if (publish) {
    const profiles = loadProfiles(), profileIndex = profiles.findIndex((item) => item.id === receipt.profileId);
    if (profileIndex >= 0) {
      const profile = profiles[profileIndex], contract = goalContractFor(profile); contract.lastReviewedAt = now;
      const intake = {...(profile.intake || {}),goalContract:contract,updatedAt:now};
      profiles[profileIndex] = {...profile,intake,lastProgressReceiptAt:now,...(receipt.type === "formal" ? {lastFormalReceiptAt:now,lastFormalReviewAt:now} : {}),updatedAt:now};
      if (!writeProfiles(profiles)) { showToast("The receipt was saved, but the client publication status could not be updated. Keep this window open and try again."); return null; }
      selectedTrainerClient = profiles[profileIndex].name;
      const messages = loadLocalArray(CLIENT_MESSAGES_KEY);
      if (!messages.some((item) => item.receiptId === receipt.id)) {
        messages.unshift({id:"message-receipt-" + receipt.id,profileId:receipt.profileId,client:profile.name,senderRole:"trainer",senderName:identity.displayName,body:"Your " + (receipt.type === "formal" ? "four-week progress receipt" : "weekly progress receipt") + " is ready. Open Progress to review what improved, what needs work, and what changes next.",kind:"progress_receipt",receiptId:receipt.id,createdAt:now});
        if (!writeLocalArray(CLIENT_MESSAGES_KEY,messages,1000)) { showToast("The receipt was saved, but its client notification could not be recorded. Keep this window open and try again."); return null; }
      }
    }
  }
  closeProgressReceiptEditor(); renderTrainerAttention(); if (selectedTrainerClient) renderTrainerAnalysis(selectedTrainerClient);
  showToast(publish ? "Progress receipt published to the client" : "Progress receipt draft saved"); return receipt;
}
function deleteProgressReceiptDraft() {
  if (!requireTrainerMutation("delete progress receipt drafts")) return false;
  const id = byId("progressReceiptId").value, receipt = loadProgressReceipts().find((item) => item.id === id); if (!receipt || receipt.status === "published") { showToast("Published receipts stay in the coaching record"); return false; }
  if (!writeProgressReceipts(loadProgressReceipts().filter((item) => item.id !== id))) return false; closeProgressReceiptEditor(); renderTrainerAttention(); if (selectedTrainerClient) renderTrainerAnalysis(selectedTrainerClient); showToast("Draft deleted"); return true;
}
function loadSavedPrograms() { return loadLocalArray(SAVED_PROGRAMS_KEY); }
function writeSavedPrograms(items) { return writeLocalArray(SAVED_PROGRAMS_KEY,items,100); }
function savedProgramFor(profile) {
  const matches = loadSavedPrograms().filter((item) => item.profileId === profile.id || clientMatches(item.setup && item.setup.client,profile.name));
  if (!matches.length) return null;
  const programsById = new Map(matches.filter((item) => item.id).map((item) => [item.id,item]));
  const activeAssignments = loadAssignedWorkouts().filter((item) => (item.profileId === profile.id || clientMatches(item.client,profile.name)) && programsById.has(item.programId) && ["assigned","in_progress"].includes(assignmentStatus(item)));
  const newest = (items,dateFields) => items.slice().sort((a,b) => {
    const dateFor = (item) => dateFields.map((field) => item[field]).find(Boolean) || "";
    return String(dateFor(b)).localeCompare(String(dateFor(a)));
  })[0] || null;
  // A workout already in progress stays in front. Otherwise the most recently
  // assigned program is the client's current program, including calibration.
  // Never prefer a stale regular program merely because it is not calibration.
  const active = newest(activeAssignments.filter((item) => assignmentStatus(item) === "in_progress"),["startedAt","assignedAt"])
    || newest(activeAssignments.filter((item) => assignmentStatus(item) === "assigned"),["assignedAt","scheduledDate"]);
  if (active) return programsById.get(active.programId) || null;
  return newest(matches,["publishedAt","savedAt","createdAt"]);
}
function programRevisionSnapshot(program,reason) {
  const copy = JSON.parse(JSON.stringify(program || {})); delete copy.versions;
  return {id:'program-revision-' + Date.now() + '-' + Math.random().toString(16).slice(2),version:Number(program && program.versionNumber || 1),savedAt:program && program.savedAt || program && program.createdAt || new Date().toISOString(),savedBy:program && program.savedBy || 'Trainer',reason:reason || 'Previous approved version',program:copy};
}
function programComparableJson(program) {
  const ignored = new Set(['versions','savedAt','savedBy','publishedAt','publishedBy','versionNumber','lifecycle','approvedAt','approvedBy','changedAt']);
  const scrub = (value) => {
    if (Array.isArray(value)) return value.map(scrub);
    if (!value || typeof value !== 'object') return value;
    return Object.keys(value).sort().reduce((result,key) => {
      if (!ignored.has(key)) result[key] = scrub(value[key]);
      return result;
    },{});
  };
  return JSON.stringify(scrub(program || {}));
}
function restoreProgramVersion(programId,revisionId) {
  if (!requireTrainerMutation('restore program versions')) return false;
  const saved = loadSavedPrograms().find((item) => item.id === programId), revision = saved && (saved.versions || []).find((item) => item.id === revisionId);
  if (!saved || !revision || !revision.program) { showToast('That program version is no longer available'); return false; }
  currentProgram = JSON.parse(JSON.stringify(revision.program));
  currentProgram.id = saved.id; currentProgram.profileId = saved.profileId; currentProgram.versions = JSON.parse(JSON.stringify(saved.versions || []));
  currentProgram.versionNumber = Number(saved.versionNumber || 1) + 1;
  currentProgram.lifecycle = 'draft';
  currentProgram.approval = {status:'draft',required:true,restoredFrom:revision.version,changedAt:new Date().toISOString(),changeReason:'Restored from version ' + revision.version + ' by ' + currentAccountIdentity().displayName};
  openPrograms(); renderProgram(); byId('programApproveBtn').disabled = false; byId('programSaveBtn').disabled = true; byId('programSaveOnlyBtn').disabled = true;
  showToast('Version ' + revision.version + ' restored as a draft. Review and approve it before publishing.');
  return true;
}
function loadAssignedWorkouts() {
  try { const parsed = JSON.parse(localStorage.getItem(ASSIGNED_WORKOUTS_KEY) || "[]"); return Array.isArray(parsed) ? parsed.map((item,index) => ({ ...item, id:item.id || "legacy-assignment-" + (item.profileId || index), status:item.status || "assigned" })) : []; }
  catch (_) { return []; }
}
function writeAssignedWorkouts(items) {
  try { localStorage.setItem(ASSIGNED_WORKOUTS_KEY,JSON.stringify(items)); return true; }
  catch (_) { showToast("This browser could not save the assigned workout"); return false; }
}
function assignmentSessionIds(assignment) {
  if (!assignment || !assignment.session) return [];
  return workoutPlans(assignment.session).map((plan) => plan.session.sessionId).filter(Boolean);
}
function assignmentForSession(sessionId) { return loadAssignedWorkouts().find((item) => assignmentSessionIds(item).includes(sessionId)) || null; }
/* ---------- membership tiers ---------- */
// Tier name and weekly session count are stored as SEPARATE fields on the profile.
// The catalog supplies the default count for a tier, but profile.sessionsPerWeek
// stays editable for exceptions. This mirrors how the booking export was specified,
// so imported rows land without anyone parsing display text like "Flex - 2 / week".
// sessionsPerWeek = days WITH a trainer. programmedDays = total workouts written for
// the week, trainer days included; the remainder are solo days the client runs alone.
// Flex 1 and Starter are deliberately identical in structure (3 programmed, 1 trainer) -
// the difference between them is floor hours versus a dedicated private session, which
// is a real distinction the price reflects but the program does not see.
const MEMBERSHIP_TIERS = {
  // Every package is a 60-minute session; sessionMinutes exists so the workout generator
  // can default a duration instead of asking, and so imported bookings that carry only a
  // start time ("Monday 4:00 PM") can be given an end.
  // supervision: "full" = private, trainer-led throughout. "partial" = floor hours, the
  // client runs most of it alone. "partnered" = shared with another client.
  flex_1:         { label:"Flex 1",           short:"FLX1", sessionsPerWeek:1, programmedDays:3, sessionMinutes:60, supervision:"partial",   family:"flex", kind:"individual" },
  flex_2:         { label:"Flex 2",           short:"FLX2", sessionsPerWeek:2, programmedDays:3, sessionMinutes:60, supervision:"partial",   family:"flex", kind:"individual" },
  starter:        { label:"Bronze",           short:"BRNZ", sessionsPerWeek:1, programmedDays:3, sessionMinutes:60, supervision:"full",      family:"bronze", kind:"individual" },
  standard:       { label:"Silver",           short:"SLVR", sessionsPerWeek:2, programmedDays:4, sessionMinutes:60, supervision:"full",      family:"silver", kind:"individual" },
  premium:        { label:"Gold",             short:"GOLD", sessionsPerWeek:3, programmedDays:6, sessionMinutes:60, supervision:"full",      family:"gold", kind:"individual" },
  partner_1:      { label:"Partner 1",        short:"PR1",  sessionsPerWeek:1, programmedDays:2, sessionMinutes:60, supervision:"partnered", family:"partner", kind:"partner"    },
  partner_2:      { label:"Partner 2",        short:"PR2",  sessionsPerWeek:2, programmedDays:2, sessionMinutes:60, supervision:"partnered", family:"partner", kind:"partner"    },
  // UNCONFIRMED: whether a one-off purchase earns programmed workouts was never answered,
  // so these carry 0 - the conservative choice, since 0 under-programs visibly rather than
  // silently writing workouts nobody agreed to. Kickstart is the exception: it is sold as
  // "a custom program and 4 sessions", so it must produce a program. 3 is a placeholder.
  payg_single:    { label:"Single session",   short:"1X",   sessionsPerWeek:0, programmedDays:0, sessionMinutes:60, supervision:"full",      family:"payg", kind:"one_time", unconfirmed:true },
  payg_4pack:     { label:"4-session pack",   short:"4PK",  sessionsPerWeek:0, programmedDays:0, sessionMinutes:60, supervision:"full",      family:"payg", kind:"one_time", unconfirmed:true },
  payg_kickstart: { label:"Kickstart bundle", short:"KICK", sessionsPerWeek:0, programmedDays:3, sessionMinutes:60, supervision:"full",      family:"payg", kind:"one_time", unconfirmed:true },
  // Disabled 2026-08-24 - hidden from pickers, definition kept so existing data still
  // resolves and so it can be switched back on without a migration.
  group:          { label:"Group class",      short:"GRP",  sessionsPerWeek:2, programmedDays:0, sessionMinutes:60, supervision:"group",     family:"group", kind:"group",    disabled:true }
};
// Old ids and the names the booking export uses. Renaming the ids themselves would mean
// migrating every stored profile in localStorage and Supabase for no visible gain, so the
// ids stay and only the labels changed.
const MEMBERSHIP_TIER_ALIASES = {
  flex:"flex_1", flex1:"flex_1", flex2:"flex_2",
  bronze:"starter", silver:"standard", gold:"premium",
  partner:"partner_1", partner1:"partner_1", partner2:"partner_2",
  one_time:"payg_single", single_session:"payg_single",
  "4_session_pack":"payg_4pack", four_session_pack:"payg_4pack", kickstart:"payg_kickstart", kickstart_bundle:"payg_kickstart"
};
function membershipTierIsSelectable(id) {
  const meta = MEMBERSHIP_TIERS[id];
  return Boolean(meta) && !meta.disabled;
}
// Every package is a 60-minute session, so a client's tier already answers "how long".
// Falls back to 60 when they have no tier yet.
function sessionMinutesForProfile(profile) {
  const meta = typeof membershipTierMeta === "function" ? membershipTierMeta(profile) : null;
  const tierMinutes = meta && meta.sessionMinutes;
  const own = Number(profile && profile.minutes);
  if (own && (!tierMinutes || own !== tierMinutes)) return own;
  return tierMinutes || own || 60;
}
/* ---------- Monday-first weekday index ---------- */
function mondayFirstDayIndex(date) {
  const day = (date instanceof Date ? date : new Date()).getDay();
  return day === 0 ? 6 : day - 1;
}
/* ---------- where an attention item is resolved ---------- */
// Which tab of a client's workspace actually clears each kind of notification. Routing and
// the tab badges both read this, so a notification can never point somewhere it cannot be
// handled - previously the destination was hand-written at four separate call sites and the
// consultation branch simply had none, dropping the coach on Overview with no clue.
const ATTENTION_TAB_FOR_KIND = {
  pain:"details", consultation:"details", consult_questionnaire:"details",
  readiness:"details", intake:"details",
  workout:"workouts", workout_request:"workouts", program:"workouts",
  baseline:"workouts", formal:"workouts", session_unprepared:"workouts",
  checkin:"checkins", recovery:"checkins",
  progress_receipt:"progress", receipt_weekly:"progress", receipt_formal:"progress",
  message:"messages", follow_up:"messages", recognition:"messages",
  inactive:"messages", recovery_due:"messages",
  automation:"overview"
};
function attentionTabForKind(kind) {
  return Object.prototype.hasOwnProperty.call(ATTENTION_TAB_FOR_KIND,String(kind)) ? ATTENTION_TAB_FOR_KIND[String(kind)] : "overview";
}
// Counts, per tab, of what is waiting on ONE client - used to badge their tabs.
// Which panel inside a tab actually resolves each kind, so the destination can be marked
// rather than leaving the coach to hunt the right tab.
const ATTENTION_PANEL_FOR_KIND = {
  consultation:"client-consultation-review", consult_questionnaire:"client-consultation-review",
  pain:"client-safety-reports",
  workout:"client-recent-activity", workout_request:"client-recent-activity",
  program:"client-assigned-program", baseline:"client-assigned-program",
  checkin:"client-checkins", recovery:"client-checkins",
  message:"client-messages", follow_up:"client-messages"
};
function attentionPanelForKind(kind) {
  return Object.prototype.hasOwnProperty.call(ATTENTION_PANEL_FOR_KIND,String(kind))
    ? ATTENTION_PANEL_FOR_KIND[String(kind)] : "";
}
// The panels a given client currently needs attention in.
function attentionPanelsForProfile(profileId,items) {
  const panels = new Set();
  (items || []).forEach((item) => {
    if (!profileId || item.profileId !== profileId) return;
    const panel = attentionPanelForKind(item.kind);
    if (panel) panels.add(panel);
  });
  return panels;
}
function attentionCountsByTab(profileId,items) {
  const counts = {};
  (items || []).forEach((item) => {
    if (!profileId || item.profileId !== profileId) return;
    const tab = attentionTabForKind(item.kind);
    counts[tab] = (counts[tab] || 0) + 1;
  });
  return counts;
}
/* ---------- staff tiers ---------- */
// A trainer's tier, which is NOT a client's tier. The ids are prefixed because the bare
// words "standard" and "premium" are already client package ids above (Silver and Gold),
// and normalizeMembershipTier resolves them - so an unprefixed value here would be one
// careless helper call away from turning a trainer into a Gold client.
// Standard trainers cover Flex clients, premium trainers cover Bronze/Silver/Gold. The
// pairing is NOT enforced here: the booking site already refuses a mismatched booking,
// and a second copy of the rule would be a second thing to keep in step.
const STAFF_TIERS = {
  staff_standard: { label:"Standard trainer", short:"STD", covers:["flex"],                      rank:1 },
  staff_premium:  { label:"Premium trainer",  short:"PRM", covers:["flex","bronze","silver","gold"], rank:2 }
};
const STAFF_TIER_FALLBACK = { label:"Tier not set", short:"—", covers:[], rank:0 };
const STAFF_TIER_DEFAULT = "staff_standard";
function normalizeStaffTier(value) {
  const key = String(value == null ? "" : value).trim().toLowerCase().replace(/[\s-]+/g,"_");
  if (Object.prototype.hasOwnProperty.call(STAFF_TIERS,key)) return key;
  // Tolerate the bare words arriving from SQL, a hand edit, or a future export column.
  if (key === "standard") return "staff_standard";
  if (key === "premium") return "staff_premium";
  return "";
}
// Always returns an object, never undefined - several roster screens render inside a single
// .map() with no try/catch, so one unguarded lookup would blank the whole screen.
function staffTierMeta(value) {
  const id = normalizeStaffTier(value);
  return id ? { id, ...STAFF_TIERS[id] } : { id:"unset", ...STAFF_TIER_FALLBACK };
}
function staffTierBadgeHtml(value) {
  const meta = staffTierMeta(value);
  return '<span class="staff-tier staff-tier-' + escapeHtml(meta.id) + '">' + escapeHtml(meta.label) + '</span>';
}
const MEMBERSHIP_TIER_FALLBACK = { label:"No tier set", short:"—", sessionsPerWeek:0, kind:"unset" };
function normalizeMembershipTier(value) {
  const key = String(value == null ? "" : value).trim().toLowerCase().replace(/[\s-]+/g,"_");
  if (Object.prototype.hasOwnProperty.call(MEMBERSHIP_TIERS,key)) return key;
  if (Object.prototype.hasOwnProperty.call(MEMBERSHIP_TIER_ALIASES,key)) return MEMBERSHIP_TIER_ALIASES[key];
  // Tolerate labels arriving from an import or an older free-text profile field.
  const match = Object.keys(MEMBERSHIP_TIERS).find((id) => MEMBERSHIP_TIERS[id].label.toLowerCase() === key.replace(/_/g," "));
  return match || "";
}
function membershipTierId(profile) {
  return normalizeMembershipTier(profile && (profile.membershipTier || profile.serviceTier || profile.tier));
}
function membershipTierMeta(profile) {
  const id = membershipTierId(profile);
  return id ? { id, ...MEMBERSHIP_TIERS[id] } : { id:"", ...MEMBERSHIP_TIER_FALLBACK };
}
// What the client is owed each week. An explicit per-client number always wins over
// the tier default, so a negotiated arrangement survives a tier change.
function entitledSessionsPerWeek(profile) {
  const explicit = Number(profile && profile.sessionsPerWeek);
  if (Number.isFinite(explicit) && explicit > 0) return explicit;
  return membershipTierMeta(profile).sessionsPerWeek || 0;
}
// Total workouts written for the week. An explicit per-client number wins, then the
// tier default, then the trainer-day count as a floor so a client is never programmed
// fewer days than they are actually coming in.
function programmedDaysPerWeek(profile) {
  const explicit = Number(profile && profile.programmedDays);
  const cap = tierProgrammedDayCap(profile);
  // An explicit per-client number is honoured, but never above what the tier covers -
  // otherwise a tier downgrade leaves the old, larger number in force forever.
  if (Number.isFinite(explicit) && explicit > 0) return cap ? Math.min(explicit,cap) : explicit;
  return cap;
}
// What the tier itself covers, independent of any per-client override. Tiers without a
// programmed-day figure of their own fall back to their trainer-day count so they are
// capped at something real rather than left unlimited.
function tierProgrammedDayCap(profile) {
  const meta = membershipTierMeta(profile);
  if (!meta.id) return 0;
  return meta.programmedDays || meta.sessionsPerWeek || 0;
}
// Days the client trains alone: programmed days that are not trainer days.
function soloDaysPerWeek(profile) {
  return Math.max(0, programmedDaysPerWeek(profile) - entitledSessionsPerWeek(profile));
}
function membershipWeekStartKey(value) {
  const date = value instanceof Date ? new Date(value) : new Date(String(value) + "T12:00:00");
  if (Number.isNaN(date.getTime())) return "";
  date.setHours(12,0,0,0);
  date.setDate(date.getDate() - (date.getDay() === 0 ? 6 : date.getDay() - 1));
  return date.toISOString().slice(0,10);
}

function assignmentsForClient(clientOrProfileId) {
  const rank = { in_progress:0, assigned:1, completed:2, reviewed:3 };
  return loadAssignedWorkouts().filter((item) => item.profileId === clientOrProfileId || clientMatches(item.client,clientOrProfileId)).sort((a,b) => {
    const statusDifference = (rank[assignmentStatus(a)] == null ? 9 : rank[assignmentStatus(a)]) - (rank[assignmentStatus(b)] == null ? 9 : rank[assignmentStatus(b)]);
    if (statusDifference) return statusDifference;
    if (["assigned","in_progress"].includes(assignmentStatus(a))) return String(a.scheduledDate || a.assignedAt || "").localeCompare(String(b.scheduledDate || b.assignedAt || ""));
    return String(b.completedAt || b.assignedAt || "").localeCompare(String(a.completedAt || a.assignedAt || ""));
  });
}
function assignmentForClient(clientOrProfileId) {
  const candidates = assignmentsForClient(clientOrProfileId).filter((item) => !["superseded","cancelled"].includes(assignmentStatus(item)));
  const inProgress = candidates.find((item) => assignmentStatus(item) === "in_progress");
  if (inProgress) return inProgress;
  const assigned = candidates.filter((item) => assignmentStatus(item) === "assigned");
  if (assigned.length) {
    // Select the newest assignment batch/program first, then its earliest
    // scheduled workout. This repairs legacy accounts where an older program
    // still has untouched assigned rows alongside a new calibration week.
    const latest = assigned.slice().sort((a,b) => String(b.assignedAt || "").localeCompare(String(a.assignedAt || "")))[0];
    const programId = latest.programId || "";
    return assigned.filter((item) => programId ? item.programId === programId : item.id === latest.id).sort((a,b) => String(a.scheduledDate || a.assignedAt || "").localeCompare(String(b.scheduledDate || b.assignedAt || "")))[0] || latest;
  }
  return candidates[0] || null;
}
function assignmentStatus(assignment) { return assignment && assignment.status || "assigned"; }
function assignmentStatusIndex(assignment) { return { assigned:0, in_progress:1, completed:2, reviewed:3 }[assignmentStatus(assignment)] || 0; }
function assignmentStatusLabel(assignment) {
  return { assigned:"Ready to start", in_progress:"Workout in progress", completed:"Waiting for trainer review", reviewed:"Trainer reviewed", superseded:"Replaced by a newer program", cancelled:"Cancelled" }[assignmentStatus(assignment)] || "Ready to start";
}
function assignmentProgressStats(assignment) {
  let planned = 0, logged = 0;
  workoutPlans(assignment && assignment.session).forEach((plan) => {
    (plan.session.blocks || []).filter((block) => !["warmup","mobility","primer"].includes(block.key)).forEach((block) => block.items.forEach((exercise) => { planned += Math.max(1,parseInt(exercise.rx && exercise.rx.sets,10) || 1); }));
    logged += getSessionSets(plan.session.sessionId).length;
  });
  return { planned, logged, percent:planned ? Math.min(100,Math.round(logged / planned * 100)) : 0 };
}
function assignmentLoopElement(assignment) {
  const loop = el("div","assignment-loop"), steps = el("div","assignment-steps"), current = assignmentStatusIndex(assignment);
  ["Assigned","Started","Client review","Coach decision"].forEach((label,index) => { const step = el("div","assignment-step",label); if (index < current) step.classList.add("done"); if (index === current) step.classList.add("current"); steps.appendChild(step); });
  const stats = assignmentProgressStats(assignment), progress = el("div","assignment-progress"); progress.id = "assignmentProgress-" + assignment.id;
  progress.innerHTML = '<div class="assignment-progress-head"><span>Working efforts logged</span><span id="assignmentProgressText-' + escapeHtml(assignment.id) + '">' + stats.logged + ' of ' + stats.planned + '</span></div><div class="assignment-progress-track"><div id="assignmentProgressFill-' + escapeHtml(assignment.id) + '" class="assignment-progress-fill" style="width:' + stats.percent + '%"></div></div>';
  loop.append(steps,progress); return loop;
}
function refreshAssignmentProgress(sessionId) {
  const assignment = assignmentForSession(sessionId); if (!assignment) return null;
  const stats = assignmentProgressStats(assignment), textNode = byId("assignmentProgressText-" + assignment.id), fill = byId("assignmentProgressFill-" + assignment.id);
  if (textNode) textNode.textContent = stats.logged + " of " + stats.planned;
  if (fill) fill.style.width = stats.percent + "%";
  return stats;
}
function startAssignedWorkout(profileId) {
  const assignment = assignmentForClient(profileId);
  return assignment ? startActiveWorkout(profileId,false,assignment.id) : null;
}
function touchAssignmentFromSession(sessionId) {
  const assignments = loadAssignedWorkouts(), index = assignments.findIndex((item) => assignmentSessionIds(item).includes(sessionId)); if (index < 0) return null;
  if (assignmentStatus(assignments[index]) === "assigned") { assignments[index].status = "in_progress"; assignments[index].startedAt = new Date().toISOString(); if (!writeAssignedWorkouts(assignments)) return null; }
  refreshAssignmentProgress(sessionId); return assignments[index];
}
function openClientWorkout() {
  if ((window.fit4lifeCloudRole || "") === "trainer") { portalRole = "trainer"; show("trainer-menu"); showToast("Trainer accounts cannot enter the client-side workspace"); return null; }
  portalRole = "client"; show("client-workout");
  byId("clientWorkoutLookup").value = ""; byId("clientWorkoutLookupResults").innerHTML = "";
  byId("clientAssignedWorkout").innerHTML = '<div class="empty-state">Find your profile to open the workout your trainer assigned.</div>';
  setTimeout(() => byId("clientWorkoutLookup").focus(),20);
}
function renderClientWorkoutLookup() {
  const query = byId("clientWorkoutLookup").value.trim(), results = byId("clientWorkoutLookupResults"); results.innerHTML = "";
  if (query.length < 2) return [];
  const profiles = findProfilesByLookup(query), assignments = loadAssignedWorkouts();
  profiles.forEach((profile) => {
    const button = document.createElement("button"); button.type = "button"; button.className = "profile-result";
    const name = document.createElement("strong"), status = document.createElement("span"); name.textContent = profile.name;
    status.textContent = assignments.some((item) => item.profileId === profile.id) ? "Workout ready · @" + profileUsername(profile) : "No workout yet · @" + profileUsername(profile);
    button.append(name,status); button.addEventListener("click",() => activateClientProfile(profile.id)); results.appendChild(button);
  });
  if (!profiles.length) {
    const note = document.createElement("div"); note.className = "profile-request-form";
    const copy = document.createElement("p"); copy.textContent = "No matching profile was found. Send one request; a trainer must approve it before a workout can be assigned.";
    const request = document.createElement("button"); request.type = "button"; request.className = "small-btn primary"; request.textContent = "Request a profile";
    request.addEventListener("click",() => { if (requestProfileCreation(query,usernameFromName(query))) results.innerHTML = '<div class="lookup-note"><b>Request sent.</b><br>A trainer can review it from the Trainer workspace.<div class="tool-actions" style="margin-top:10px"><button class="small-btn primary" type="button" onclick="show(\'client-menu\')">Back to client workspace</button><button class="small-btn" type="button" onclick="returnToPortalHome()">Return to home</button></div></div>'; });
    note.append(copy,request); results.appendChild(note);
  }
  return profiles;
}
function openAssignedWorkout(profileId,assignmentId) {
  const profile = loadProfiles().find((item) => item.id === profileId), assignment = assignmentId ? loadAssignedWorkouts().find((item) => item.id === assignmentId) : assignmentForClient(profileId), out = byId("clientAssignedWorkout");
  if (!profile) return null;
  byId("clientWorkoutLookup").value = profile.name; byId("clientWorkoutLookupResults").innerHTML = ""; out.innerHTML = ""; out.classList.remove("assignment-complete");
  if (!assignment || !assignment.session) { out.innerHTML = '<div class="empty-state">No workout is assigned to this profile yet. Ask your trainer to choose and assign a workout.</div>'; return null; }
  state.session = JSON.parse(JSON.stringify(assignment.session)); state.sessionOptions = [];
  const status = assignmentStatus(assignment), banner = el("div","assignment-banner"), identity = el("div"); identity.append(el("b","",profile.name + " · " + assignmentStatusLabel(assignment)),el("span","","Assigned " + new Date(assignment.assignedAt).toLocaleString()));
  const tools = el("div","session-actions"), print = el("button","mini-btn","Print"); print.onclick = () => window.print(); tools.appendChild(print);
  if (status === "assigned") { const start = el("button","mini-btn primary","Start workout"); start.onclick = () => startActiveWorkout(profile.id,false,assignment.id); tools.appendChild(start); }
  else if (status === "in_progress") { const review = el("button","mini-btn primary","Finish & Review"); review.onclick = () => openWorkoutReview(); tools.appendChild(review); }
  else { const sent = el("button","mini-btn",status === "reviewed" ? "Coach reviewed" : "Review sent"); sent.disabled = true; tools.appendChild(sent); }
  banner.append(identity,tools); out.append(banner,assignmentLoopElement(assignment));
  if (["completed","reviewed"].includes(status)) { out.classList.add("assignment-complete"); const note = el("div","assignment-complete-note"); note.innerHTML = status === "reviewed" ? '<b>Your trainer reviewed this workout.</b>' + escapeHtml(assignment.coachNote || "Your next workout direction is saved. Check back when the next plan is assigned.") : '<b>Workout review sent.</b>Your trainer can now review your sets, difficulty, energy, and pain report before adjusting the next plan.'; out.appendChild(note); }
  out.appendChild(renderCard(state.session.data,state.session,null)); return assignment;
}
