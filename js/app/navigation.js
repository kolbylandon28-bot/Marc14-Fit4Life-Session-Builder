/* ---------- navigation ---------- */
let portalRole = "";
let currentView = "home";
const FIT4LIFE_RELEASE = Object.freeze({
  singleWorkout: true,
  programsVisible: false,
  onboardingVisible: false
});
const CLIENT_APP_VIEWS = ["client-home","client-program","client-progress","client-coach","client-more"];
const COACH_SHELL_VIEWS = ["trainer-menu","trainer","builder","programs","tools","readiness","advanced","coach-module"];
const ACTIVE_CLIENT_KEY = "fit4life_active_client_v1";
function signedInTrainerCanPreview() { return ["owner","trainer"].includes(window.fit4lifeCloudRole || ""); }
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
  document.querySelectorAll(".view").forEach((v) => v.classList.remove("active"));
  const target = document.getElementById("view-" + view); if (target) target.classList.add("active");
  currentView = view;
  const home = document.getElementById("homeBtn"), context = document.getElementById("portalContext");
  const inMenu = ["trainer-menu","client-menu"].includes(view);
  home.classList.toggle("show", view !== "home" && view !== "client-home" && (view !== "trainer-menu" || signedInTrainerCanPreview()));
  home.textContent = view === "trainer-menu" && signedInTrainerCanPreview() ? "\u2190 Choose side" : CLIENT_APP_VIEWS.includes(view) ? "\u2190 Client home" : view === "active-workout" ? "\u2190 Leave workout" : inMenu ? "\u2190 Workspace" : portalRole ? "\u2190 " + (portalRole === "trainer" ? "Trainer" : "Client") + " workspace" : "\u2190 Home";
  context.textContent = portalRole ? (portalRole === "trainer" ? "Trainer workspace" : trainerClientPreviewActive() ? "Trainer preview · client side" : "Client workspace") : "";
  context.classList.toggle("show", Boolean(portalRole) && view !== "home");
  const clientNav = document.getElementById("clientBottomNav"), showClientNav = portalRole === "client" && CLIENT_APP_VIEWS.includes(view);
  if (clientNav) { clientNav.classList.toggle("show",showClientNav); clientNav.querySelectorAll("button").forEach((button) => button.classList.toggle("on",view === "client-" + button.dataset.clientTab)); }
  const coachNav = document.getElementById("coachSidebar"), showCoachNav = portalRole === "trainer" && COACH_SHELL_VIEWS.includes(view) && trainerIsUnlocked();
  if (coachNav) { coachNav.classList.toggle("show",showCoachNav); const key = openCoachDestination.current || ({"trainer-menu":"dashboard",trainer:"clients",builder:"workouts",programs:"workouts",tools:"dashboard",readiness:"assessments"}[view] || ""); coachNav.querySelectorAll("[data-coach-nav]").forEach((button) => button.classList.toggle("on",button.dataset.coachNav === key)); }
  if (document.body && document.body.classList) document.body.classList.toggle("coach-shell-on",showCoachNav);
  if (showClientNav) renderClientAppView(view);
  syncTrainerClientPreviewBar();
  if (portalRole === "trainer" && trainerIsUnlocked()) renderTrainerAttention();
  window.scrollTo(0, 0);
}
function selectPortalRole(role) {
  const signedInRole = window.fit4lifeCloudRole || "";
  if (signedInRole === "client") { portalRole = "client"; if (activeClientProfile()) openClientTab("home"); else show("client-menu"); return; }
  if (["owner","trainer"].includes(signedInRole)) {
    if (role === "client") { openTrainerClientPreview(); return; }
    portalRole = "trainer"; show("trainer-menu"); return;
  }
  if (role === "trainer") { openTrainerPortal(); return; }
  portalRole = "client";
  if (activeClientProfile()) openClientTab("home"); else show("client-menu");
}
function routeAuthenticatedWorkspace() {
  const role = window.fit4lifeCloudRole || "";
  if (["owner","trainer"].includes(role)) { portalRole = ""; show("home"); return "trainer"; }
  if (role === "client") { portalRole = "client"; if (activeClientProfile()) openClientTab("home"); else show("client-menu"); return "client"; }
  portalRole = ""; show("home"); return "";
}
function switchPortalRole() { routeAuthenticatedWorkspace(); }
function returnToPortalHome() { routeAuthenticatedWorkspace(); }
function goHome() {
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
  const profile = loadProfiles().find((item) => item.id === profileId); if (!profile) return null;
  if ((window.fit4lifeCloudRole || "") === "client") {
    const ownProfile = activeClientProfile() || loadProfiles()[0];
    if (ownProfile && ownProfile.id !== profile.id) { showToast("Client accounts can open only their own profile"); return null; }
  }
  try { localStorage.setItem(ACTIVE_CLIENT_KEY,profile.id); } catch (_) {}
  portalRole = "client"; openClientTab("home"); return profile;
}
function openTrainerClientPreview(profileId) {
  if (!signedInTrainerCanPreview() || !trainerIsUnlocked()) { showToast("Trainer access is required to preview clients"); return null; }
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
  if (!activeClientProfile()) { openClientWorkout(); return; }
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
  writeLocalArray(PROGRESS_RECEIPT_RESPONSES_KEY,items,1000); renderClientAppView(currentView); showToast("Receipt marked read"); return true;
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
    upsertProgressReceipt(receipt);
    showToast("A new draft was created so the published receipt remains in the coaching record");
  }
  if (!receipt) { receipt = buildProgressReceiptDraft(profile,type,seed); upsertProgressReceipt(receipt); }
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
  const id = byId("progressReceiptId").value, receipts = loadProgressReceipts(), index = receipts.findIndex((item) => item.id === id); if (index < 0) return null;
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
      writeProfiles(profiles); selectedTrainerClient = profiles[profileIndex].name;
      const messages = loadLocalArray(CLIENT_MESSAGES_KEY);
      if (!messages.some((item) => item.receiptId === receipt.id)) {
        messages.unshift({id:"message-receipt-" + receipt.id,profileId:receipt.profileId,client:profile.name,senderRole:"trainer",senderName:identity.displayName,body:"Your " + (receipt.type === "formal" ? "four-week progress receipt" : "weekly progress receipt") + " is ready. Open Progress to review what improved, what needs work, and what changes next.",kind:"progress_receipt",receiptId:receipt.id,createdAt:now});
        writeLocalArray(CLIENT_MESSAGES_KEY,messages,1000);
      }
    }
  }
  closeProgressReceiptEditor(); renderTrainerAttention(); if (selectedTrainerClient) renderTrainerAnalysis(selectedTrainerClient);
  showToast(publish ? "Progress receipt published to the client" : "Progress receipt draft saved"); return receipt;
}
function deleteProgressReceiptDraft() {
  if (!requireTrainerMutation("delete progress receipt drafts")) return false;
  const id = byId("progressReceiptId").value, receipt = loadProgressReceipts().find((item) => item.id === id); if (!receipt || receipt.status === "published") { showToast("Published receipts stay in the coaching record"); return false; }
  writeProgressReceipts(loadProgressReceipts().filter((item) => item.id !== id)); closeProgressReceiptEditor(); renderTrainerAttention(); if (selectedTrainerClient) renderTrainerAnalysis(selectedTrainerClient); showToast("Draft deleted"); return true;
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
  if (assignmentStatus(assignments[index]) === "assigned") { assignments[index].status = "in_progress"; assignments[index].startedAt = new Date().toISOString(); writeAssignedWorkouts(assignments); }
  refreshAssignmentProgress(sessionId); return assignments[index];
}
function openClientWorkout() {
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
