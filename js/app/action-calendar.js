/* ---------- V6 action center + operational calendar ---------- */
const CALENDAR_EVENTS_KEY = "fit4life_calendar_events_v1";
const CALENDAR_AUDIT_KEY = "fit4life_calendar_audit_v1";
const CALENDAR_NOTICES_KEY = "fit4life_calendar_notices_v1";
const WORKOUT_REQUESTS_KEY = "fit4life_workout_requests_v1";

const ACTION_CATEGORY_LABELS = {
  all:"All actions", safety:"Safety", messages:"Messages", workouts:"Workouts",
  schedule:"Schedule", access:"Access", approvals:"Owner approval", followup:"Follow-up"
};
const CALENDAR_TYPE_LABELS = { appointment:"Training session", consultation:"Consultation", workout:"Workout", followup:"Follow-up", admin:"Team task" }
// Types that draw down a client's weekly session entitlement.
const BILLABLE_CALENDAR_TYPES = ["appointment"];
const CALENDAR_STATUS_LABELS = { scheduled:"Scheduled", in_progress:"In progress", completed:"Completed", cancelled:"Cancelled", missed:"Missed", rescheduled:"Rescheduled" };
const coachActionCenterState = { category:"all", ownership:"all", query:"" };
const coachCalendarState = { view:"week", anchor:calendarDateKey(new Date()), client:"", trainer:"", type:"", status:"", tier:"", time:"" };
window.coachActionCenterState = coachActionCenterState;
window.coachCalendarState = coachCalendarState;

function calendarDateKey(value) {
  const date = value instanceof Date ? value : new Date(value || Date.now());
  if (Number.isNaN(date.getTime())) return "";
  return [date.getFullYear(),String(date.getMonth() + 1).padStart(2,"0"),String(date.getDate()).padStart(2,"0")].join("-");
}
function calendarDate(dateKey,time) {
  const parts = String(dateKey || "").split("-").map(Number);
  if (parts.length !== 3 || !parts.every(Number.isFinite)) return new Date(NaN);
  const clock = String(time || "12:00").split(":").map(Number);
  return new Date(parts[0],parts[1] - 1,parts[2],clock[0] || 0,clock[1] || 0,0,0);
}
function calendarAddDays(value,days) { const date = value instanceof Date ? new Date(value) : calendarDate(value); date.setDate(date.getDate() + Number(days || 0)); return date; }
function calendarStartOfWeek(value) { const date = value instanceof Date ? new Date(value) : calendarDate(value); const day = date.getDay() || 7; date.setDate(date.getDate() - day + 1); date.setHours(12,0,0,0); return date; }
function calendarFormatTime(value) {
  if (!value) return "All day";
  const [hour,minute] = String(value).split(":").map(Number), date = new Date(2020,0,1,hour || 0,minute || 0);
  return date.toLocaleTimeString([],{hour:"numeric",minute:"2-digit"});
}
function calendarDateLabel(dateKey,options) { const date = calendarDate(dateKey); return Number.isNaN(date.getTime()) ? "No date" : date.toLocaleDateString([],options || {weekday:"short",month:"short",day:"numeric"}); }
function calendarJsArg(value) {
  // The JSON string is written inside a double-quoted HTML attribute. Escape it
  // for HTML as well as JavaScript so the first argument cannot terminate the
  // onclick attribute before Handle/Tomorrow receive the complete command.
  return escapeHtml(JSON.stringify(String(value == null ? "" : value)).replace(/</g,"\\u003c"));
}
function loadCalendarEvents() { return loadLocalArray(CALENDAR_EVENTS_KEY); }
function loadCalendarAudit() { return loadLocalArray(CALENDAR_AUDIT_KEY); }
function loadCalendarNotices() { return loadLocalArray(CALENDAR_NOTICES_KEY); }
function loadWorkoutRequests() { return loadLocalArray(WORKOUT_REQUESTS_KEY); }
function calendarProfile(profileId) { return loadProfiles().find((profile) => profile.id === profileId) || null; }
function calendarTier(profile) { return membershipTierId(profile) || "unset"; }
function calendarTierLabel(tierId) { return tierId && MEMBERSHIP_TIERS[tierId] ? MEMBERSHIP_TIERS[tierId].label : "No tier set"; }
function calendarTierShort(tierId) { return tierId && MEMBERSHIP_TIERS[tierId] ? MEMBERSHIP_TIERS[tierId].short : "\u2014"; }
function calendarIdentity() { const identity = currentAccountIdentity(); return {id:identity.id || "",name:identity.displayName || identity.email || "Staff",role:identity.role || window.fit4lifeCloudRole || "trainer"}; }

function calendarTrainerOptions() {
  const seen = new Map(), add = (id,name) => { const label = String(name || "").trim(); if (label) seen.set(String(id || label),{id:String(id || ""),name:label}); };
  (window.fit4lifeCloudTrainers || []).filter((trainer) => trainer.is_active !== false).forEach((trainer) => add(trainer.user_id,trainer.display_name || trainer.email));
  loadProfiles().forEach((profile) => add(profile.assignedTrainerId,profile.assignedTrainerName));
  const identity = calendarIdentity(); if (["owner","trainer"].includes(identity.role)) add(identity.id,identity.name);
  return [...seen.values()].sort((a,b) => a.name.localeCompare(b.name));
}
function assignmentCalendarStatus(assignment) {
  const status = assignmentStatus(assignment);
  if (["completed","reviewed"].includes(status)) return "completed";
  if (status === "cancelled" || status === "superseded") return "cancelled";
  if (status === "in_progress") return "in_progress";
  if (assignment.scheduledDate && calendarDate(assignment.scheduledDate) < calendarDate(calendarDateKey(new Date()))) return "missed";
  return "scheduled";
}
function allCoachCalendarEvents() {
  const profiles = loadProfiles(), profileMap = new Map(profiles.map((profile) => [profile.id,profile]));
  const workouts = loadAssignedWorkouts().filter((assignment) => assignment.scheduledDate).map((assignment) => {
    const profile = profileMap.get(assignment.profileId) || profiles.find((item) => clientMatches(item.name,assignment.client));
    return {id:"assignment:" + assignment.id,source:"assignment",sourceId:assignment.id,type:"workout",title:assignment.programDayName || assignment.session && assignment.session.data && assignment.session.data.goalLabel || "Assigned workout",profileId:profile && profile.id || assignment.profileId || "",client:profile && profile.name || assignment.client || "Client",trainerId:profile && profile.assignedTrainerId || "",trainerName:profile && profile.assignedTrainerName || "Coaching team",tier:calendarTier(profile),date:assignment.scheduledDate,startTime:assignment.scheduledTime || "",endTime:"",status:assignmentCalendarStatus(assignment),location:"",notes:"Workout status is controlled by assignment and client logging.",scheduleHandledAt:assignment.scheduleHandledAt || "",updatedAt:assignment.updatedAt || assignment.assignedAt};
  });
  const custom = loadCalendarEvents().map((event) => ({source:"calendar",tier:calendarTier(profileMap.get(event.profileId)),...event}));
  return custom.concat(workouts).sort((a,b) => String(a.date).localeCompare(String(b.date)) || String(a.startTime || "99:99").localeCompare(String(b.startTime || "99:99")) || String(a.title).localeCompare(String(b.title)));
}
function calendarEventById(eventId) { return allCoachCalendarEvents().find((event) => event.id === eventId) || null; }
function appendCalendarAudit(eventId,action,before,after,reason) {
  const identity = calendarIdentity(), audit = loadCalendarAudit();
  audit.unshift({id:"calendar-audit-" + Date.now() + "-" + Math.random().toString(16).slice(2),eventId,action,before:before || null,after:after || null,reason:String(reason || ""),actorId:identity.id,actorName:identity.name,actorRole:identity.role,createdAt:new Date().toISOString()});
  writeLocalArray(CALENDAR_AUDIT_KEY,audit,2000);
}
function createCalendarNotice(event,before,reason,requiresAction,copy) {
  const changed = before && (before.date !== event.date || before.startTime !== event.startTime), statusChanged = before && before.status !== event.status;
  const label = copy && copy.label || (changed ? "Schedule changed" : statusChanged ? "Schedule status changed" : "New calendar item");
  const detail = copy && copy.detail || (changed ? calendarDateLabel(before.date) + " → " + calendarDateLabel(event.date) + (event.startTime ? " at " + calendarFormatTime(event.startTime) : "") : (CALENDAR_STATUS_LABELS[event.status] || event.status) + (reason ? " · " + reason : ""));
  const notices = loadCalendarNotices();
  notices.unshift({id:"calendar-notice-" + Date.now() + "-" + Math.random().toString(16).slice(2),eventId:event.id,profileId:event.profileId || "",client:event.client || "Workspace",kind:"calendar_notice",label,detail,reason:String(reason || ""),requiresAction:Boolean(requiresAction),createdAt:new Date().toISOString(),resolvedAt:""});
  writeLocalArray(CALENDAR_NOTICES_KEY,notices,1000);
}
function resolveCalendarNotice(noticeId) {
  const notices = loadCalendarNotices(), notice = notices.find((item) => item.id === noticeId); if (!notice) return false;
  notice.resolvedAt = new Date().toISOString(); notice.resolvedBy = calendarIdentity().name;
  writeLocalArray(CALENDAR_NOTICES_KEY,notices,1000); releaseCoachTask("calendar-notice:" + notice.id); renderTrainerAttention();
  if (openCoachDestination.current === "actions") renderCoachModule("actions");
  showToast("Schedule update acknowledged"); return true;
}
function resolveCalendarNoticesForEvent(eventId) {
  const notices = loadCalendarNotices(); let changed = false;
  notices.forEach((notice) => { if (notice.eventId === eventId && !notice.resolvedAt) { notice.resolvedAt = new Date().toISOString(); notice.resolvedBy = calendarIdentity().name; changed = true; } });
  return !changed || writeLocalArray(CALENDAR_NOTICES_KEY,notices,1000);
}

function actionCategoryForKind(kind) {
  if (["pain","readiness"].includes(kind)) return "safety";
  if (["message","recognition"].includes(kind)) return "messages";
  if (["workout","workout_request","checkin","recovery","recovery_due","program","baseline","receipt_weekly","receipt_formal","consultation"].includes(kind)) return "workouts";
  if (["calendar_event","calendar_notice"].includes(kind)) return "schedule";
  if (["trainer_request","account_request"].includes(kind)) return "access";
  if (kind === "owner_request") return "approvals";
  return "followup";
}
function actionSourceIsResolved(item) {
  if (!item) return true;
  if (item.kind === "workout_request") {
    const request = loadWorkoutRequests().find((entry) => "workout-request:" + entry.id === item.id);
    if (!request || request.status !== "pending") return true;
    return loadAssignedWorkouts().some((assignment) => assignment.profileId === request.profileId && new Date(assignment.assignedAt || assignment.updatedAt || 0) > new Date(request.createdAt || 0));
  }
  if (item.kind === "calendar_notice") { const notice = loadCalendarNotices().find((entry) => "calendar-notice:" + entry.id === item.id); return !notice || Boolean(notice.resolvedAt); }
  if (item.kind === "calendar_event") {
    const event = calendarEventById(item.eventId);
    if (!event || ["completed","cancelled"].includes(event.status)) return true;
    return event.source === "assignment" && event.status === "missed" && Boolean(event.scheduleHandledAt);
  }
  if (item.kind === "consultation") {
    const profile = loadProfiles().find((entry) => entry.id === item.profileId), consultation = profile && profile.consultation;
    if (!consultation || consultation.status !== "submitted") return true;
    return Boolean(consultation.reviewedAt && new Date(consultation.reviewedAt) >= new Date(consultation.lastClientSubmittedAt || consultation.submittedAt || 0));
  }
  return false;
}

function reconcileWorkoutRequests() {
  const requests = loadWorkoutRequests(), assignments = loadAssignedWorkouts(); let changed = false;
  requests.forEach((request) => {
    if (request.status !== "pending") return;
    const assignment = assignments.filter((item) => item.profileId === request.profileId).sort((a,b) => String(b.assignedAt || b.updatedAt || "").localeCompare(String(a.assignedAt || a.updatedAt || "")))[0];
    if (assignment && new Date(assignment.assignedAt || assignment.updatedAt || 0) > new Date(request.createdAt || 0)) { request.status = "fulfilled"; request.resolvedAt = assignment.assignedAt || assignment.updatedAt || new Date().toISOString(); request.assignmentId = assignment.id; changed = true; }
  });
  if (changed) writeLocalArray(WORKOUT_REQUESTS_KEY,requests,500);
  return requests;
}

const legacyAttentionItemIsVisible = window.attentionItemIsVisible;
window.attentionItemIsVisible = function v6AttentionItemIsVisible(item,state) {
  const saved = state && state[item.id];
  if (!saved) return true;
  if (saved.status === "snoozed" && new Date(saved.until || 0).getTime() > Date.now()) return false;
  // Derived actions close only when their underlying message, review, request, or event is actually resolved.
  return saved.status !== "done" || !actionSourceIsResolved(item);
};

const legacyTrainerAttentionSnapshot = window.trainerAttentionSnapshot;
window.trainerAttentionSnapshot = function v6TrainerAttentionSnapshot() {
  const snapshot = legacyTrainerAttentionSnapshot(), profiles = loadProfiles(), profileMap = new Map(profiles.map((profile) => [profile.id,profile])), additions = [];
  reconcileWorkoutRequests().filter((request) => request.status === "pending").forEach((request) => {
    const profile = profileMap.get(request.profileId), alreadyAssigned = loadAssignedWorkouts().some((assignment) => assignment.profileId === request.profileId && new Date(assignment.assignedAt || assignment.updatedAt || 0) > new Date(request.createdAt || 0));
    if (!profile || alreadyAssigned) return;
    additions.push({id:"workout-request:" + request.id,profileId:profile.id,client:profile.name,trainer:profile.assignedTrainerName || "Coaching team",kind:"workout_request",urgency:"high",rank:1,createdAt:request.createdAt,label:"Workout requested",detail:request.note || "Client is ready for the next coach-assigned workout.",primaryCoach:Boolean(profile.assignedTrainerId && profile.assignedTrainerId === calendarIdentity().id)});
  });
  (window.fit4lifeCloudRegistrationRequests || []).filter((request) => request.requested_role !== "trainer" && request.status === "pending").forEach((request) => additions.push({id:"account-request:" + request.id,profileId:"",client:request.full_name || request.email || "New client",trainer:"Coaching team",kind:"account_request",urgency:"normal",rank:3,createdAt:request.created_at,label:"Client access request",detail:"Verify and connect this client account before assigning work."}));
  loadCalendarNotices().filter((notice) => notice.requiresAction && !notice.resolvedAt).forEach((notice) => additions.push({id:"calendar-notice:" + notice.id,eventId:notice.eventId,profileId:notice.profileId || "",client:notice.client || "Workspace",trainer:"Coaching team",kind:"calendar_notice",urgency:"high",rank:1,createdAt:notice.createdAt,label:notice.label || "Schedule update",detail:notice.detail || notice.reason || "Review this schedule change."}));
  profiles.filter((profile) => {
    const consultation = profile.consultation;
    return consultation && consultation.status === "submitted" && (!consultation.reviewedAt || new Date(consultation.reviewedAt) < new Date(consultation.lastClientSubmittedAt || consultation.submittedAt || 0));
  }).forEach((profile) => {
    const consultation = profile.consultation, limitations = consultation.limitations && consultation.limitations.hasLimitations === "yes";
    additions.push({id:"consultation:" + profile.id + ":" + Number(consultation.revision || 1),profileId:profile.id,client:profile.name,trainer:profile.assignedTrainerName || "Coaching team",kind:"consultation",urgency:limitations ? "high" : "normal",rank:limitations ? 1 : 2,createdAt:consultation.lastClientSubmittedAt || consultation.submittedAt,label:limitations ? "Consultation limitation review" : "Trainer Consultation submitted",detail:limitations ? "Review the client-reported limitation and confirm the conservative profile filters." : "Review goals, experience, exercise preferences, and requested coaching support.",primaryCoach:Boolean(profile.assignedTrainerId && profile.assignedTrainerId === calendarIdentity().id)});
  });
  allCoachCalendarEvents().filter((event) => event.status === "missed" || event.source === "calendar" && event.type === "followup" && ["scheduled","rescheduled"].includes(event.status) && calendarDate(event.date) <= calendarDate(calendarDateKey(new Date()))).forEach((event) => additions.push({id:"calendar-event:" + event.id,eventId:event.id,profileId:event.profileId || "",client:event.client || "Workspace",trainer:event.trainerName || "Coaching team",kind:"calendar_event",urgency:event.status === "missed" ? "high" : "normal",rank:event.status === "missed" ? 1 : 3,createdAt:event.updatedAt || event.createdAt || event.date,label:event.status === "missed" ? (event.type === "workout" ? "Missed workout follow-up" : "Missed appointment follow-up") : "Scheduled follow-up due",detail:event.title + " · " + calendarDateLabel(event.date) + (event.startTime ? " at " + calendarFormatTime(event.startTime) : "")}));
  const state = loadAttentionState(), map = new Map(), messages = loadLocalArray(CLIENT_MESSAGES_KEY);
  snapshot.items.concat(additions).filter((item) => {
    if (["intake","readiness","baseline","program"].includes(item.kind)) return false;
    if (!attentionItemIsVisible(item,state) || actionSourceIsResolved(item)) return false;
    if (item.kind === "inactive" && messages.some((message) => message.profileId === item.profileId && messageSenderRole(message) !== "client" && new Date(message.createdAt || 0) > new Date(item.createdAt || 0))) return false;
    return true;
  }).forEach((item) => {
    const normalized = {...item,category:actionCategoryForKind(item.kind)};
    const existing = map.get(normalized.id); if (!existing || Number(normalized.rank || 9) < Number(existing.rank || 9)) map.set(normalized.id,normalized);
  });
  snapshot.items = [...map.values()].sort((a,b) => Number(a.rank || 9) - Number(b.rank || 9) || Number(b.primaryCoach) - Number(a.primaryCoach) || new Date(a.createdAt || 0) - new Date(b.createdAt || 0));
  snapshot.categoryCounts = Object.keys(ACTION_CATEGORY_LABELS).reduce((counts,key) => { counts[key] = key === "all" ? snapshot.items.length : snapshot.items.filter((item) => item.category === key).length; return counts; },{});
  snapshot.schedule = snapshot.categoryCounts.schedule || 0;
  return snapshot;
};

const legacyOpenCoachAttentionItem = window.openCoachAttentionItem;
window.openCoachAttentionItem = function v6OpenCoachAttentionItem(profileId,kind,itemId) {
  if (kind === "consultation") { openCoachDestination("clients"); setTimeout(() => openTrainerConsultationReview(profileId),30); return; }
  if (kind === "calendar_notice") { const notice = loadCalendarNotices().find((entry) => "calendar-notice:" + entry.id === itemId); openCoachDestination("calendar"); if (notice) setTimeout(() => openCalendarEventEditor(notice.eventId),30); return; }
  if (kind === "calendar_event") { openCoachDestination("calendar"); setTimeout(() => openCalendarEventEditor(String(itemId).replace(/^calendar-event:/,"")),30); return; }
  if (kind === "workout_request") {
    const profile = calendarProfile(profileId);
    if (!profile) { openCoachDestination("clients"); return; }
    selectedTrainerClient = profile.name;
    selectedInBodyScanId = "";
    trainerSummaryState = newTrainerSummaryState();
    trainerSummaryState.tab = "workouts";
    show("trainer");
    renderTrainerHub(profile.name);
    setTimeout(() => openSelectedClientSession(),30);
    return;
  }
  if (kind === "account_request") { openCoachDestination("clients"); return; }
  legacyOpenCoachAttentionItem(profileId,kind,itemId);
};

window.updateCoachAttentionItem = function v6UpdateCoachAttentionItem(id,status) {
  const state = loadAttentionState();
  if (status === "snoozed") {
    state[id] = {status:"snoozed",until:new Date(Date.now() + 86400000).toISOString(),updatedAt:new Date().toISOString(),updatedBy:calendarIdentity().name};
    writeLocalObject(ATTENTION_STATE_KEY,state); releaseCoachTask(id); renderTrainerAttention();
    if (openCoachDestination.current === "actions") renderCoachModule("actions");
    showToast("Reminder snoozed until tomorrow"); return true;
  }
  showToast("Finish this in its source workflow; the action will close automatically");
  return false;
};

function actionQueueFilteredItems() {
  const identity = calendarIdentity(), query = coachActionCenterState.query.toLowerCase();
  return trainerAttentionSnapshot().items.filter((item) => (coachActionCenterState.category === "all" || item.category === coachActionCenterState.category)
    && (coachActionCenterState.ownership !== "mine" || item.primaryCoach || activeCoachTaskClaim(item.id) && activeCoachTaskClaim(item.id).handlerUserId === identity.id)
    && (!query || [item.client,item.trainer,item.label,item.detail].join(" ").toLowerCase().includes(query)));
}
function actionQueueRowsHtml(items,limit) {
  const shown = limit ? items.slice(0,limit) : items;
  return shown.map((item) => {
    const claim = activeCoachTaskClaim(item.id), mine = claim && claim.handlerUserId === calendarIdentity().id, claimCopy = coachTaskClaimText(item.id), canAcknowledge = item.kind === "calendar_notice";
    return '<article class="action-center-row ' + escapeHtml(item.urgency || "normal") + '"><div class="action-center-priority"><i></i><span>' + escapeHtml(ACTION_CATEGORY_LABELS[item.category] || "Follow-up") + '</span></div><div class="action-center-person"><b>' + escapeHtml(item.client || "Workspace") + (item.primaryCoach ? ' <small>Primary</small>' : '') + '</b><span>' + escapeHtml(item.trainer || "Coaching team") + ' · waiting ' + escapeHtml(attentionWaitingLabel(item.createdAt)) + '</span>' + (claimCopy ? '<em>' + escapeHtml(claimCopy) + '</em>' : '') + '</div><div class="action-center-reason"><b>' + escapeHtml(item.label) + '</b><span>' + escapeHtml(item.detail) + '</span></div><div class="action-center-actions"><button class="mini-btn primary" onclick="claimCoachTask(' + calendarJsArg(item.id) + ',' + calendarJsArg(item.profileId || "") + ',' + calendarJsArg(item.kind) + ',' + calendarJsArg(item.client || "") + ',true)">' + (claim ? mine ? "Open" : "Take over" : "Handle") + '</button><button class="mini-btn" onclick="updateCoachAttentionItem(' + calendarJsArg(item.id) + ',\'snoozed\')">Tomorrow</button>' + (canAcknowledge ? '<button class="mini-btn" onclick="resolveCalendarNotice(' + calendarJsArg(String(item.id).replace(/^calendar-notice:/,"")) + ')">Acknowledge</button>' : '<span class="action-auto-close">Auto-closes when complete</span>') + '</div></article>';
  }).join("") || '<div class="attention-empty"><b>Nothing needs action in this view.</b><br>New work appears here from the original message, workout, request, safety report, or schedule record.</div>';
}
function actionSummaryCardsHtml(attention) {
  return [
    ["safety","Safety",attention.categoryCounts.safety,"Pain and movement-changing reports"],
    ["messages","Messages",attention.categoryCounts.messages,"Client replies and recognition"],
    ["workouts","Workout work",attention.categoryCounts.workouts,"Requests, reviews, and next plans"],
    ["schedule","Schedule",attention.categoryCounts.schedule,"Missed visits and schedule changes"],
    ["approvals",window.fit4lifeCloudRole === "owner" ? "Owner approvals" : "My requests",attention.categoryCounts.approvals,"Restricted changes with an audit trail"],
    ["access","Access",attention.categoryCounts.access,"Pending client or trainer access"]
  ].map(([key,label,count,copy]) => '<button class="action-summary-card ' + (count ? "needs-action" : "") + '" onclick="openActionCenter(\'' + key + '\')"><span>' + escapeHtml(label) + '</span><b>' + Number(count || 0) + '</b><p>' + escapeHtml(copy) + '</p></button>').join("");
}
function openActionCenter(category) { coachActionCenterState.category = category || "all"; openCoachDestination("actions"); }
function setActionCenterFilter(kind,value) { coachActionCenterState[kind] = value; renderActionCenterModule(); }
function renderActionCenterModule() {
  const out = byId("coachModuleContent"), attention = trainerAttentionSnapshot(); if (!out) return;
  const categoryButtons = Object.entries(ACTION_CATEGORY_LABELS).map(([key,label]) => '<button class="action-filter-chip ' + (coachActionCenterState.category === key ? "on" : "") + '" onclick="setActionCenterFilter(\'category\',\'' + key + '\')">' + escapeHtml(label) + '<span>' + Number(attention.categoryCounts[key] || 0) + '</span></button>').join("");
  out.innerHTML = '<section class="coach-module-card action-center-shell"><div class="action-center-heading"><div><h3>One queue, tied to the real work</h3><p>Claiming prevents duplicate effort. Snoozing only delays the reminder. An item disappears after the underlying reply, review, approval, assignment, or schedule action is actually complete.</p></div><span class="attention-command-count">' + attention.items.length + '</span></div><div class="action-filter-row">' + categoryButtons + '</div><div class="action-search-row"><input class="swap-search" value="' + escapeHtml(coachActionCenterState.query) + '" placeholder="Search client, trainer, or action…" oninput="coachActionCenterState.query=this.value;renderActionCenterList()"><select onchange="setActionCenterFilter(\'ownership\',this.value)"><option value="all"' + (coachActionCenterState.ownership === "all" ? " selected" : "") + '>All shared work</option><option value="mine"' + (coachActionCenterState.ownership === "mine" ? " selected" : "") + '>Primary or claimed by me</option></select></div><div id="actionCenterList" class="action-center-list">' + actionQueueRowsHtml(actionQueueFilteredItems()) + '</div></section>';
}
function renderActionCenterList() { const out = byId("actionCenterList"); if (out) out.innerHTML = actionQueueRowsHtml(actionQueueFilteredItems()); }

window.renderTrainerAttention = function v6RenderTrainerAttention() {
  const attention = trainerAttentionSnapshot(), panel = byId("trainerAttentionPanel");
  document.querySelectorAll("[data-attention-badge]").forEach((badge) => {
    const key = badge.dataset.attentionBadge, count = key === "messages" ? attention.categoryCounts.messages : key === "schedule" ? attention.categoryCounts.schedule : key === "actions" ? attention.items.length : key === "access" ? attention.categoryCounts.access : attention.categoryCounts.workouts;
    badge.textContent = count > 99 ? "99+" : String(count); badge.classList.toggle("show",count > 0);
  });
  if (typeof syncRoleGovernanceControls === "function") syncRoleGovernanceControls();
  if (!panel) return attention;
  panel.innerHTML = '<div class="action-summary-grid">' + actionSummaryCardsHtml(attention) + '</div><section class="attention-command"><div class="attention-command-head"><div><h3>Who needs me next?</h3><p>Urgent safety and unanswered communication rise first. Every task opens the exact client and workflow that created it.</p></div><button class="small-btn primary" onclick="openActionCenter(\'all\')">Open all ' + attention.items.length + '</button></div><div class="action-center-list compact">' + actionQueueRowsHtml(attention.items,8) + '</div></section>';
  return attention;
};

function requestNextWorkout(note) {
  const profile = activeClientProfile(); if (!profile || trainerClientPreviewActive()) return showToast("Client workout requests are available from a signed-in client account");
  const pending = loadWorkoutRequests().find((request) => request.profileId === profile.id && request.status === "pending");
  if (pending) return showToast("Your coaching team already has this workout request");
  const requests = loadWorkoutRequests(); requests.unshift({id:"request-" + Date.now(),profileId:profile.id,client:profile.name,note:String(note || "I am ready for my next workout."),status:"pending",createdAt:new Date().toISOString()});
  writeLocalArray(WORKOUT_REQUESTS_KEY,requests,500); renderClientProgram(profile); renderTrainerAttention(); showToast("Workout request sent to " + (profile.assignedTrainerName || "your coaching team"));
}

function ensureCalendarEventDialog() {
  let modal = byId("calendarEventModal"); if (modal) return modal;
  const wrapper = document.createElement("div");
  wrapper.innerHTML = `<div id="calendarEventModal" class="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="calendarEventTitle" aria-describedby="calendarEventGuidance calendarEventFeedback" aria-hidden="true">
    <div class="review-dialog calendar-event-dialog">
      <div class="calendar-modal-head"><div><span id="calendarEventSource" class="client-section-label">Calendar item</span><h2 id="calendarEventTitle">Schedule coaching work</h2><p id="calendarEventGuidance" class="calendar-modal-guidance">Every visible field below can be changed.</p></div><button class="icon-close" type="button" onclick="closeCalendarEventEditor()" aria-label="Close calendar editor">×</button></div>
      <input id="calendarEventId" type="hidden"><input id="calendarEventSourceId" type="hidden">
      <div id="calendarAssignmentSummary" class="calendar-assignment-summary" hidden></div>
      <div class="calendar-event-form">
        <div class="compact-field wide" data-calendar-assignment hidden><label for="calendarAssignmentAction">What are you doing?</label><select id="calendarAssignmentAction" onchange="syncCalendarAssignmentAction()"><option value="reschedule">Reschedule this workout</option><option value="followup">Record missed-workout follow-up</option><option value="cancel">Cancel assigned workout</option></select><span id="calendarAssignmentActionHelp" class="calendar-field-help"></span></div>
        <div class="compact-field" data-calendar-custom><label for="calendarEventType">Type</label><select id="calendarEventType"><option value="appointment">Appointment</option><option value="followup">Follow-up</option><option value="admin">Team task</option></select></div>
        <div class="compact-field" data-calendar-custom><label for="calendarEventStatus">Status</label><select id="calendarEventStatus"><option value="scheduled">Scheduled</option><option value="rescheduled">Rescheduled</option><option value="completed">Completed</option><option value="cancelled">Cancelled</option><option value="missed">Missed</option></select></div>
        <div class="compact-field wide" data-calendar-custom><label for="calendarEventTitleInput">Title</label><input id="calendarEventTitleInput" maxlength="100" placeholder="Training appointment or follow-up"></div>
        <div class="compact-field" data-calendar-custom><label for="calendarEventClient">Client</label><select id="calendarEventClient" onchange="calendarEventClientChanged()"></select></div>
        <div class="compact-field" data-calendar-custom><label for="calendarEventTrainer">Trainer</label><select id="calendarEventTrainer"></select></div>
        <div class="compact-field" data-calendar-schedule><label for="calendarEventDate">Date</label><input id="calendarEventDate" type="date"></div>
        <div class="compact-field" data-calendar-schedule><label for="calendarEventStart">Start time <span class="calendar-optional">optional</span></label><input id="calendarEventStart" type="time"></div>
        <div class="compact-field" data-calendar-custom><label for="calendarEventEnd">End</label><input id="calendarEventEnd" type="time"></div>
        <div class="compact-field wide" data-calendar-custom><label for="calendarEventLocation">Location</label><input id="calendarEventLocation" maxlength="100" placeholder="Fit4Life, office, phone, or video"></div>
        <div class="compact-field wide" data-calendar-custom><label for="calendarEventNotes">Internal details</label><textarea id="calendarEventNotes" rows="3" placeholder="Preparation or coaching context"></textarea></div>
        <div class="compact-field wide"><label id="calendarEventReasonLabel" for="calendarEventReason">Reason for this schedule change</label><textarea id="calendarEventReason" rows="2" placeholder="Briefly explain why the date or time is changing"></textarea></div>
        <label class="calendar-notify-check"><input id="calendarEventNotify" type="checkbox" checked> Record a client/team schedule notice</label>
      </div>
      <div id="calendarConflictNote" class="calendar-policy-note" hidden></div>
      <div id="calendarEventFeedback" class="calendar-save-feedback" role="status" aria-live="polite" hidden></div>
      <div class="tool-actions"><button id="calendarEventSaveBtn" class="small-btn primary" type="button" onclick="saveCalendarEvent()">Save calendar item</button><button class="small-btn" type="button" onclick="closeCalendarEventEditor()">Cancel</button></div>
      <details class="formal-review-box" id="calendarAuditBox"><summary>Change history</summary><div id="calendarEventAudit" class="calendar-audit-list"></div></details>
    </div>
  </div>`;
  modal = wrapper.firstElementChild; document.body.appendChild(modal); return modal;
}
function calendarSelectOptions() {
  const profiles = loadProfiles(), trainers = calendarTrainerOptions();
  byId("calendarEventClient").innerHTML = '<option value="">No specific client</option>' + profiles.map((profile) => '<option value="' + escapeHtml(profile.id) + '">' + escapeHtml(profile.name) + (profile.assignedTrainerName ? ' · ' + escapeHtml(profile.assignedTrainerName) : ' · Shared') + '</option>').join("");
  byId("calendarEventTrainer").innerHTML = '<option value="">Coaching team / unassigned</option>' + trainers.map((trainer) => '<option value="' + escapeHtml(trainer.id) + '" data-name="' + escapeHtml(trainer.name) + '">' + escapeHtml(trainer.name) + '</option>').join("");
}
function calendarSetFeedback(message,tone) {
  const feedback = byId("calendarEventFeedback");
  if (!feedback) { if (message) showToast(message); return false; }
  feedback.textContent = String(message || "");
  feedback.className = "calendar-save-feedback" + (tone ? " " + tone : "");
  feedback.hidden = !message;
  if (message) showToast(message);
  return Boolean(message);
}
function syncCalendarAssignmentAction() {
  const select = byId("calendarAssignmentAction"); if (!select) return;
  const action = select.value || "reschedule", rescheduling = action === "reschedule";
  document.querySelectorAll("#calendarEventModal [data-calendar-schedule]").forEach((field) => { field.hidden = !rescheduling; });
  const help = byId("calendarAssignmentActionHelp"), label = byId("calendarEventReasonLabel"), reason = byId("calendarEventReason"), guidance = byId("calendarEventGuidance"), save = byId("calendarEventSaveBtn");
  if (action === "followup") {
    help.textContent = "Use this when the workout remains missed and you want to document what happened and the next step.";
    label.textContent = "Missed-workout follow-up"; reason.placeholder = "What happened and what is the next step?";
    guidance.textContent = "Record the missed-workout follow-up without moving or deleting the assigned workout.";
    save.textContent = "Save missed-workout follow-up";
  } else if (action === "cancel") {
    help.textContent = "This closes the assignment without deleting its history.";
    label.textContent = "Reason for cancelling"; reason.placeholder = "Why is this assigned workout being cancelled?";
    guidance.textContent = "Cancel the assignment while preserving its client and audit history.";
    save.textContent = "Cancel assigned workout";
  } else {
    help.textContent = "Choose a new date or start time and explain the change.";
    label.textContent = "Reason for this schedule change"; reason.placeholder = "Briefly explain why the date or time is changing";
    guidance.textContent = "The workout stays connected to the client. Change its date or optional start time and record why.";
    save.textContent = "Save workout schedule";
  }
  calendarSetFeedback("");
}
function calendarEventClientChanged() {
  const profile = calendarProfile(byId("calendarEventClient") && byId("calendarEventClient").value), trainer = byId("calendarEventTrainer");
  if (!profile || !trainer || !profile.assignedTrainerId) return;
  if ([...trainer.options].some((option) => option.value === profile.assignedTrainerId)) trainer.value = profile.assignedTrainerId;
}
function calendarEventAuditHtml(eventId) {
  return loadCalendarAudit().filter((entry) => entry.eventId === eventId).slice(0,30).map((entry) => '<div class="calendar-audit-row"><b>' + escapeHtml(entry.action) + '</b><span>' + new Date(entry.createdAt).toLocaleString() + ' · ' + escapeHtml(entry.actorName || "Staff") + '</span>' + (entry.reason ? '<p>' + escapeHtml(entry.reason) + '</p>' : '') + '</div>').join("") || '<div class="empty-state">No earlier changes.</div>';
}
function openCalendarEventEditor(eventId,dateKey,type) {
  const modal = ensureCalendarEventDialog(), event = eventId ? calendarEventById(eventId) : null; calendarSelectOptions();
  const identity = calendarIdentity(), sourceAssignment = event && event.source === "assignment";
  modal.classList.toggle("assignment-mode",Boolean(sourceAssignment));
  modal.querySelectorAll("[data-calendar-custom]").forEach((field) => { field.hidden = Boolean(sourceAssignment); });
  modal.querySelectorAll("[data-calendar-assignment]").forEach((field) => { field.hidden = !sourceAssignment; });
  modal.querySelectorAll("[data-calendar-schedule]").forEach((field) => { field.hidden = false; });
  byId("calendarEventId").value = event && event.id || ""; byId("calendarEventSourceId").value = sourceAssignment ? event.sourceId : "";
  byId("calendarEventSource").textContent = sourceAssignment ? "Assigned workout · schedule" : event ? "Calendar item" : "New calendar item";
  byId("calendarEventTitle").textContent = sourceAssignment ? "Update assigned workout" : event ? "Edit " + event.title : "Schedule coaching work";
  byId("calendarEventGuidance").textContent = sourceAssignment ? "Choose the action you need, then complete the fields shown below." : "Every visible field below can be changed and saved.";
  const assignmentSummary = byId("calendarAssignmentSummary");
  assignmentSummary.hidden = !sourceAssignment;
  assignmentSummary.innerHTML = sourceAssignment ? '<div><span>Workout</span><b>' + escapeHtml(event.title || "Assigned workout") + '</b></div><div><span>Client</span><b>' + escapeHtml(event.client || "Client") + '</b></div><div><span>Coach</span><b>' + escapeHtml(event.trainerName || "Coaching team") + '</b></div><div><span>Current status</span><b>' + escapeHtml(CALENDAR_STATUS_LABELS[event.status] || event.status || "Scheduled") + '</b></div>' : "";
  byId("calendarEventType").value = sourceAssignment ? "appointment" : event && event.type || type || "appointment";
  byId("calendarEventType").disabled = false; byId("calendarEventStatus").value = event && event.status || "scheduled"; byId("calendarEventStatus").disabled = false;
  byId("calendarEventTitleInput").value = event && event.title || (type === "followup" ? "Client follow-up" : "Training appointment"); byId("calendarEventTitleInput").disabled = false;
  byId("calendarEventClient").value = event && event.profileId || ""; byId("calendarEventClient").disabled = false;
  byId("calendarEventTrainer").value = event && event.trainerId || identity.id || ""; byId("calendarEventTrainer").disabled = false;
  byId("calendarEventDate").value = event && event.date || dateKey || coachCalendarState.anchor; byId("calendarEventStart").value = event && event.startTime || ""; byId("calendarEventEnd").value = event && event.endTime || "";
  byId("calendarEventStart").disabled = false; byId("calendarEventEnd").disabled = false;
  byId("calendarEventLocation").value = event && event.location || ""; byId("calendarEventLocation").disabled = false;
  byId("calendarEventNotes").value = event && event.notes || ""; byId("calendarEventNotes").disabled = false; byId("calendarEventReason").value = "";
  byId("calendarEventNotify").checked = true; byId("calendarEventNotify").disabled = false;
  byId("calendarAssignmentAction").value = sourceAssignment && event.status === "missed" ? "followup" : "reschedule";
  byId("calendarEventReasonLabel").textContent = "Reason for this schedule change"; byId("calendarEventReason").placeholder = "Briefly explain why the date or time is changing";
  byId("calendarEventSaveBtn").textContent = "Save calendar item"; calendarSetFeedback("");
  if (sourceAssignment) syncCalendarAssignmentAction();
  byId("calendarEventAudit").innerHTML = event ? calendarEventAuditHtml(event.id) : '<div class="empty-state">History begins after this item is saved.</div>';
  byId("calendarAuditBox").hidden = !event; modal.classList.add("open"); modal.setAttribute("aria-hidden","false"); setTimeout(() => byId(sourceAssignment ? "calendarAssignmentAction" : "calendarEventTitleInput").focus(),20);
}
function closeCalendarEventEditor() { const modal = byId("calendarEventModal"); if (modal) { modal.classList.remove("open"); modal.setAttribute("aria-hidden","true"); } }
function calendarOverlap(event,events) {
  if (!event.trainerId || !event.startTime || ["cancelled","completed"].includes(event.status)) return null;
  const start = calendarDate(event.date,event.startTime).getTime(), end = calendarDate(event.date,event.endTime || event.startTime).getTime() + (event.endTime ? 0 : 60 * 60000);
  return events.find((candidate) => candidate.id !== event.id && candidate.date === event.date && candidate.trainerId === event.trainerId && candidate.startTime && !["cancelled","completed"].includes(candidate.status) && calendarDate(candidate.date,candidate.startTime).getTime() < end && (calendarDate(candidate.date,candidate.endTime || candidate.startTime).getTime() + (candidate.endTime ? 0 : 60 * 60000)) > start) || null;
}
function saveCalendarEvent() {
  if (!isFit4LifeStaff()) { calendarSetFeedback("Only approved Fit4Life staff can save calendar changes.","error"); return false; }
  const eventId = byId("calendarEventId").value, sourceId = byId("calendarEventSourceId").value, existing = eventId ? calendarEventById(eventId) : null, reason = byId("calendarEventReason").value.trim(), date = byId("calendarEventDate").value, startTime = byId("calendarEventStart").value;
  if (sourceId) {
    const action = byId("calendarAssignmentAction") && byId("calendarAssignmentAction").value || "reschedule", assignments = loadAssignedWorkouts(), assignment = assignments.find((item) => item.id === sourceId);
    if (!assignment) { calendarSetFeedback("This assigned workout could not be found. Refresh the page and try again.","error"); return false; }
    if (!reason) {
      calendarSetFeedback(action === "followup" ? "Add what happened and the next coaching step." : action === "cancel" ? "Add the reason for cancelling this assigned workout." : "Add the reason for changing this workout schedule.","error");
      return false;
    }
    const identity = calendarIdentity(), now = new Date().toISOString(), dateChanged = String(assignment.scheduledDate || "") !== date, timeChanged = String(assignment.scheduledTime || "") !== startTime;
    if (action === "reschedule") {
      if (!date) { calendarSetFeedback("Choose the new workout date.","error"); return false; }
      if (!dateChanged && !timeChanged) { calendarSetFeedback("Choose a different date or start time, or select “Record missed-workout follow-up” above.","error"); return false; }
      assignment.scheduledDate = date; assignment.scheduledTime = startTime; assignment.updatedAt = now; assignment.updatedBy = identity.name;
      delete assignment.scheduleHandledAt; delete assignment.scheduleHandledBy; delete assignment.scheduleFollowUpReason;
      if (!writeAssignedWorkouts(assignments)) { calendarSetFeedback("The workout schedule could not be saved. Check the browser connection and try again.","error"); return false; }
      const afterEvent = allCoachCalendarEvents().find((item) => item.id === eventId); appendCalendarAudit(eventId,"Workout rescheduled",existing,afterEvent,reason); if (byId("calendarEventNotify").checked) createCalendarNotice(afterEvent,existing,reason,true);
      closeCalendarEventEditor(); coachCalendarState.anchor = date; renderCoachCalendarModule(); renderTrainerAttention(); showToast("Workout schedule updated and recorded"); return true;
    }
    if (action === "cancel") {
      assignment.status = "cancelled"; assignment.cancelledAt = now; assignment.cancelledBy = identity.name; assignment.cancellationReason = reason; assignment.updatedAt = now; assignment.updatedBy = identity.name;
      if (!writeAssignedWorkouts(assignments)) { calendarSetFeedback("The assigned workout could not be cancelled. Check the browser connection and try again.","error"); return false; }
      resolveCalendarNoticesForEvent(eventId);
      const afterEvent = allCoachCalendarEvents().find((item) => item.id === eventId); appendCalendarAudit(eventId,"Assigned workout cancelled",existing,afterEvent,reason); if (byId("calendarEventNotify").checked) createCalendarNotice(afterEvent,existing,reason,false,{label:"Assigned workout cancelled",detail:reason});
      closeCalendarEventEditor(); renderCoachCalendarModule(); renderTrainerAttention(); showToast("Assigned workout cancelled and recorded"); return true;
    }
    assignment.scheduleHandledAt = now; assignment.scheduleHandledBy = identity.name; assignment.scheduleFollowUpReason = reason; assignment.updatedAt = now; assignment.updatedBy = identity.name;
    if (!writeAssignedWorkouts(assignments)) { calendarSetFeedback("The missed-workout follow-up could not be saved. Check the browser connection and try again.","error"); return false; }
    resolveCalendarNoticesForEvent(eventId);
    const afterEvent = allCoachCalendarEvents().find((item) => item.id === eventId); appendCalendarAudit(eventId,"Missed workout follow-up recorded",existing,afterEvent,reason); if (byId("calendarEventNotify").checked) createCalendarNotice(afterEvent,existing,reason,false,{label:"Missed workout follow-up recorded",detail:reason});
    closeCalendarEventEditor(); renderCoachCalendarModule(); renderTrainerAttention(); showToast("Missed-workout follow-up saved"); return true;
  }
  if (!date) { calendarSetFeedback("Choose a calendar date.","error"); return false; }
  const profileId = byId("calendarEventClient").value, profile = calendarProfile(profileId), trainerSelect = byId("calendarEventTrainer"), trainerOption = trainerSelect.options[trainerSelect.selectedIndex];
  const next = {id:eventId || "calendar-event-" + Date.now() + "-" + Math.random().toString(16).slice(2),source:"calendar",type:byId("calendarEventType").value,title:byId("calendarEventTitleInput").value.trim(),profileId,client:profile && profile.name || "",trainerId:trainerSelect.value,trainerName:trainerOption && trainerOption.dataset.name || trainerOption && trainerOption.textContent || "Coaching team",date,startTime:byId("calendarEventStart").value,endTime:byId("calendarEventEnd").value,status:byId("calendarEventStatus").value,location:byId("calendarEventLocation").value.trim(),notes:byId("calendarEventNotes").value.trim(),createdAt:existing && existing.createdAt || new Date().toISOString(),updatedAt:new Date().toISOString(),updatedBy:calendarIdentity().name};
  if (!next.title) { calendarSetFeedback("Add a clear calendar title.","error"); return false; }
  if (next.startTime && next.endTime && calendarDate(next.date,next.endTime) <= calendarDate(next.date,next.startTime)) { calendarSetFeedback("End time must be after start time.","error"); return false; }
  const changed = existing && ["date","startTime","endTime","status","trainerId","profileId"].some((key) => String(existing[key] || "") !== String(next[key] || ""));
  if (changed && !reason) { calendarSetFeedback("Add the reason for this schedule or status change.","error"); return false; }
  if (existing && (existing.date !== next.date || existing.startTime !== next.startTime) && next.status === "scheduled") next.status = "rescheduled";
  const conflict = calendarOverlap(next,allCoachCalendarEvents());
  if (conflict && !window.confirm((next.trainerName || "This trainer") + " already has “" + conflict.title + "” at that time. Save anyway?")) return false;
  const events = loadCalendarEvents(), index = events.findIndex((item) => item.id === next.id); if (index >= 0) events[index] = next; else events.unshift(next);
  if (!writeLocalArray(CALENDAR_EVENTS_KEY,events,2000)) { calendarSetFeedback("The calendar item could not be saved. Check the browser connection and try again.","error"); return false; }
  const action = !existing ? "Created" : existing.date !== next.date || existing.startTime !== next.startTime ? "Rescheduled" : existing.status !== next.status ? "Status changed" : "Updated";
  appendCalendarAudit(next.id,action,existing,next,reason);
  if (byId("calendarEventNotify").checked) createCalendarNotice(next,existing,reason,Boolean(existing && (next.status === "missed" || next.status === "cancelled" || existing.date !== next.date || existing.startTime !== next.startTime)));
  if (next.status === "completed") {
    const notices = loadCalendarNotices(); notices.forEach((notice) => { if (notice.eventId === next.id && !notice.resolvedAt) notice.resolvedAt = new Date().toISOString(); }); writeLocalArray(CALENDAR_NOTICES_KEY,notices,1000);
  }
  closeCalendarEventEditor(); coachCalendarState.anchor = next.date; renderCoachCalendarModule(); renderTrainerAttention(); showToast(action === "Created" ? "Calendar item created" : "Calendar change saved with history"); return true;
}

function calendarEventMatches(event) {
  const profile = calendarProfile(event.profileId);
  const hour = event.startTime ? Number(String(event.startTime).split(":")[0]) : -1;
  const timeMatches = !coachCalendarState.time || coachCalendarState.time === "all_day" && hour < 0 || coachCalendarState.time === "morning" && hour >= 0 && hour < 12 || coachCalendarState.time === "afternoon" && hour >= 12 && hour < 17 || coachCalendarState.time === "evening" && hour >= 17;
  return (!coachCalendarState.client || event.profileId === coachCalendarState.client)
    && (!coachCalendarState.trainer || (coachCalendarState.trainer === "__shared" ? !event.trainerId : event.trainerId === coachCalendarState.trainer))
    && (!coachCalendarState.type || event.type === coachCalendarState.type)
    && (!coachCalendarState.status || event.status === coachCalendarState.status)
    && (!coachCalendarState.tier || calendarTier(profile) === coachCalendarState.tier)
    && timeMatches;
}
/* ---------- weekly session balance (booked vs owed) ---------- */
// The calendar's real job is not "what is booked" but "what is booked versus what
// this client paid for". A Premium client at 2 of 3 booked is a session the gym owes
// and has not delivered, which is invisible on an ordinary calendar.
function sessionsBookedForWeek(profileId,weekStartKey,events) {
  if (!profileId || !weekStartKey) return 0;
  const source = Array.isArray(events) ? events : allCoachCalendarEvents();
  return source.filter((event) => {
    if (event.profileId !== profileId) return false;
    if (!BILLABLE_CALENDAR_TYPES.includes(event.type)) return false;
    if (event.status === "cancelled") return false;
    return membershipWeekStartKey(event.date) === weekStartKey;
  }).length;
}
function weeklySessionBalance(profile,weekStartKey,events) {
  const entitled = entitledSessionsPerWeek(profile);
  const booked = sessionsBookedForWeek(profile && profile.id,weekStartKey,events);
  const gap = Math.max(0,entitled - booked);
  const meta = membershipTierMeta(profile);
  // Pay-as-you-go and unset tiers have no weekly cadence, so they cannot be short.
  const tracked = entitled > 0;
  return { profileId:profile && profile.id || "", client:profile && profile.name || "", tier:meta.id, tierLabel:meta.label, tierShort:meta.short,
           entitled, booked, gap, tracked, status: !tracked ? "untracked" : gap === 0 ? "met" : booked === 0 ? "none" : "short" };
}
function weeklySessionBalances(weekStartKey,events) {
  const source = Array.isArray(events) ? events : allCoachCalendarEvents();
  return loadProfiles().map((profile) => weeklySessionBalance(profile,weekStartKey,source))
    .filter((row) => row.tracked)
    .sort((a,b) => (b.gap - a.gap) || String(a.client).localeCompare(String(b.client)));
}
function weeklyBalancePanelHtml(weekStartKey,events) {
  const rows = weeklySessionBalances(weekStartKey,events), owed = rows.filter((row) => row.gap > 0);
  const total = owed.reduce((sum,row) => sum + row.gap,0);
  const head = '<div class="balance-head"><b>Sessions owed this week</b><span>' + (total ? total + ' unbooked across ' + owed.length + ' client' + (owed.length === 1 ? '' : 's') : 'Every tracked client is fully booked') + '</span></div>';
  if (!owed.length) return '<section class="coach-module-card weekly-balance good">' + head + '</section>';
  const list = owed.slice(0,12).map((row) => '<button type="button" class="balance-row" onclick="openCalendarClient(' + calendarJsArg(row.profileId) + ',\'workout\')">'
    + '<span class="tier-badge tier-' + escapeHtml(row.tier || 'unset') + '">' + escapeHtml(row.tierShort) + '</span>'
    + '<b>' + escapeHtml(row.client) + '</b>'
    + '<span class="balance-count' + (row.booked === 0 ? ' none' : '') + '">' + row.booked + ' of ' + row.entitled + '</span></button>').join("");
  return '<section class="coach-module-card weekly-balance">' + head + '<div class="balance-list">' + list + '</div>'
    + (owed.length > 12 ? '<p class="storage-note">' + (owed.length - 12) + ' more not shown.</p>' : '') + '</section>';
}
function calendarEventChip(event) {
  const tier = event.tier || "unset";
  return '<button class="calendar-event-chip ' + escapeHtml(event.type) + ' ' + escapeHtml(event.status) + ' tier-' + escapeHtml(tier) + '" onclick="openCalendarEventEditor(\'' + escapeHtml(event.id) + '\')"><span>' + escapeHtml(event.startTime ? calendarFormatTime(event.startTime) : event.type === "workout" ? "Workout" : "All day") + '</span><b>' + escapeHtml(event.client ? event.client + " · " + event.title : event.title) + '</b><em class="chip-foot"><span class="tier-badge tier-' + escapeHtml(tier) + '">' + escapeHtml(calendarTierShort(event.tier)) + '</span>' + escapeHtml(event.trainerName || "Shared team") + '</em></button>';
}
function calendarRangeLabel() {
  const anchor = calendarDate(coachCalendarState.anchor);
  if (coachCalendarState.view === "day") return anchor.toLocaleDateString([],{weekday:"long",month:"long",day:"numeric",year:"numeric"});
  if (coachCalendarState.view === "month") return anchor.toLocaleDateString([],{month:"long",year:"numeric"});
  if (coachCalendarState.view === "agenda") return "Upcoming and recent schedule";
  const start = calendarStartOfWeek(anchor), end = calendarAddDays(start,6); return start.toLocaleDateString([],{month:"short",day:"numeric"}) + " – " + end.toLocaleDateString([],{month:"short",day:"numeric",year:"numeric"});
}
function calendarGridHtml(events) {
  const anchor = calendarDate(coachCalendarState.anchor), today = calendarDateKey(new Date());
  if (coachCalendarState.view === "day") {
    const dateKey = calendarDateKey(anchor), dayEvents = events.filter((event) => event.date === dateKey);
    return '<section class="calendar-day-view"><div class="calendar-day-heading"><b>' + calendarDateLabel(dateKey,{weekday:"long",month:"long",day:"numeric"}) + '</b><button class="mini-btn" onclick="openCalendarEventEditor(\'\',\'' + dateKey + '\')">+ Add here</button></div><div class="calendar-day-events">' + (dayEvents.map(calendarEventChip).join("") || '<div class="calendar-empty">No scheduled work.</div>') + '</div></section>';
  }
  if (coachCalendarState.view === "agenda") {
    const floor = calendarAddDays(anchor,-14), ceiling = calendarAddDays(anchor,60), visible = events.filter((event) => calendarDate(event.date) >= floor && calendarDate(event.date) <= ceiling), groups = new Map();
    visible.forEach((event) => { if (!groups.has(event.date)) groups.set(event.date,[]); groups.get(event.date).push(event); });
    return '<section class="calendar-agenda">' + ([...groups.entries()].map(([dateKey,items]) => '<div class="calendar-agenda-day"><div><b>' + calendarDateLabel(dateKey,{weekday:"short",month:"short",day:"numeric"}) + '</b><span>' + items.length + ' item' + (items.length === 1 ? '' : 's') + '</span></div><section>' + items.map(calendarEventChip).join("") + '</section></div>').join("") || '<div class="calendar-empty">No schedule items in the next 60 days.</div>') + '</section>';
  }
  if (coachCalendarState.view === "month") {
    const first = new Date(anchor.getFullYear(),anchor.getMonth(),1,12), start = calendarStartOfWeek(first), days = Array.from({length:42},(_,index) => calendarAddDays(start,index));
    return '<div class="calendar-month-head">' + ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map((day) => '<span>' + day + '</span>').join("") + '</div><div class="calendar-month-grid">' + days.map((date) => { const dateKey = calendarDateKey(date), dayEvents = events.filter((event) => event.date === dateKey), outside = date.getMonth() !== anchor.getMonth(); return '<section class="calendar-month-day' + (dateKey === today ? ' today' : '') + (outside ? ' outside' : '') + '"><button class="calendar-day-number" onclick="setCoachCalendarAnchor(\'' + dateKey + '\',\'day\')">' + date.getDate() + '</button>' + dayEvents.slice(0,3).map(calendarEventChip).join("") + (dayEvents.length > 3 ? '<button class="calendar-more" onclick="setCoachCalendarAnchor(\'' + dateKey + '\',\'day\')">+' + (dayEvents.length - 3) + ' more</button>' : '') + '</section>'; }).join("") + '</div>';
  }
  const start = calendarStartOfWeek(anchor), days = Array.from({length:7},(_,index) => calendarAddDays(start,index));
  return '<div class="calendar-week-grid">' + days.map((date) => { const dateKey = calendarDateKey(date), dayEvents = events.filter((event) => event.date === dateKey); return '<section class="calendar-week-day' + (dateKey === today ? ' today' : '') + '"><div class="calendar-week-head"><button onclick="setCoachCalendarAnchor(\'' + dateKey + '\',\'day\')"><span>' + date.toLocaleDateString([],{weekday:"short"}) + '</span><b>' + date.getDate() + '</b></button><button class="mini-btn" onclick="openCalendarEventEditor(\'\',\'' + dateKey + '\')">+</button></div><div>' + (dayEvents.map(calendarEventChip).join("") || '<span class="calendar-empty">Open</span>') + '</div></section>'; }).join("") + '</div>';
}
function setCoachCalendarView(view) { coachCalendarState.view = view; renderCoachCalendarModule(); }
function setCoachCalendarAnchor(dateKey,view) { coachCalendarState.anchor = dateKey; if (view) coachCalendarState.view = view; renderCoachCalendarModule(); }
function moveCoachCalendar(direction) {
  const anchor = calendarDate(coachCalendarState.anchor), amount = coachCalendarState.view === "month" ? 1 : coachCalendarState.view === "week" ? 7 : 1;
  if (coachCalendarState.view === "month") anchor.setMonth(anchor.getMonth() + direction); else anchor.setDate(anchor.getDate() + amount * direction);
  coachCalendarState.anchor = calendarDateKey(anchor); renderCoachCalendarModule();
}
function setCalendarFilter(key,value) { coachCalendarState[key] = value; renderCoachCalendarModule(); }
function calendarFilterSelect(id,label,key,options) { return '<label class="calendar-filter"><span>' + escapeHtml(label) + '</span><select id="' + id + '" onchange="setCalendarFilter(\'' + key + '\',this.value)"><option value="">All ' + escapeHtml(label.toLowerCase()) + '</option>' + options.map(([value,text]) => '<option value="' + escapeHtml(value) + '"' + (coachCalendarState[key] === value ? ' selected' : '') + '>' + escapeHtml(text) + '</option>').join("") + '</select></label>'; }
function renderCoachCalendarModule() {
  const out = byId("coachModuleContent"); if (!out) return;
  const profiles = loadProfiles(), trainers = calendarTrainerOptions(), tiers = [...new Set(profiles.map(calendarTier))].filter(Boolean).sort((a,b) => calendarTierLabel(a).localeCompare(calendarTierLabel(b))), allEvents = allCoachCalendarEvents(), events = allEvents.filter(calendarEventMatches);
  const upcoming = events.filter((event) => calendarDate(event.date) >= calendarDate(calendarDateKey(new Date())) && !["cancelled","completed"].includes(event.status)).length, missed = events.filter((event) => event.status === "missed").length;
  const views = ["day","week","month","agenda"].map((view) => '<button class="calendar-view-btn ' + (coachCalendarState.view === view ? "on" : "") + '" onclick="setCoachCalendarView(\'' + view + '\')">' + view[0].toUpperCase() + view.slice(1) + '</button>').join("");
  out.innerHTML = '<section class="coach-module-card operational-calendar"><div class="calendar-topbar"><div><span class="client-section-label">Operational calendar</span><h3>' + escapeHtml(calendarRangeLabel()) + '</h3><p>Appointments, assigned workouts, and coaching follow-ups share one schedule. Shared clients remain visible to every approved trainer.</p></div><div class="tool-actions"><button class="small-btn" onclick="setCoachCalendarAnchor(\'' + calendarDateKey(new Date()) + '\')">Today</button><button class="small-btn primary" onclick="openCalendarEventEditor()">+ Schedule</button></div></div><div class="calendar-policy-note"><b>Rescheduling policy is still a management draft.</b> V6 requires a reason and records the actor and time for every schedule change, but it does not enforce a fee or notice cutoff yet.</div><div class="calendar-stats"><div><b>' + upcoming + '</b><span>Upcoming</span></div><div><b>' + missed + '</b><span>Missed / follow-up</span></div><div><b>' + events.filter((event) => event.type === "workout").length + '</b><span>Assigned workouts</span></div><div><b>' + events.filter((event) => event.type === "appointment").length + '</b><span>Appointments</span></div></div><div class="calendar-controls"><div class="calendar-range-controls"><button onclick="moveCoachCalendar(-1)" aria-label="Previous">‹</button><button onclick="moveCoachCalendar(1)" aria-label="Next">›</button><strong>' + escapeHtml(calendarRangeLabel()) + '</strong></div><div class="calendar-view-toggle">' + views + '</div></div><div class="calendar-filters">' + calendarFilterSelect("calendarClientFilter","Clients","client",profiles.map((profile) => [profile.id,profile.name])) + calendarFilterSelect("calendarTrainerFilter","Trainers","trainer",[["__shared","Coaching team / unassigned"],...trainers.map((trainer) => [trainer.id,trainer.name])]) + calendarFilterSelect("calendarTypeFilter","Types","type",Object.entries(CALENDAR_TYPE_LABELS)) + calendarFilterSelect("calendarStatusFilter","Statuses","status",Object.entries(CALENDAR_STATUS_LABELS)) + calendarFilterSelect("calendarTierFilter","Tiers","tier",tiers.map((tier) => [tier,calendarTierLabel(tier)])) + calendarFilterSelect("calendarTimeFilter","Times","time",[["all_day","All-day items"],["morning","Morning · before noon"],["afternoon","Afternoon · noon–5 PM"],["evening","Evening · after 5 PM"]]) + '</div><div class="calendar-canvas">' + weeklyBalancePanelHtml(membershipWeekStartKey(coachCalendarState.anchor),allEvents) + calendarGridHtml(events) + '</div></section>';
}

function enhanceClientSchedule(profile) {
  const out = byId("clientCoachContent"); if (!out) return;
  const label = [...out.querySelectorAll(".client-section-label")].find((node) => node.textContent.trim() === "Appointments"), card = label && label.closest(".client-card"); if (!card) return;
  const today = calendarDate(calendarDateKey(new Date())), events = allCoachCalendarEvents().filter((event) => event.profileId === profile.id && calendarDate(event.date) >= today && !["cancelled","completed"].includes(event.status)).slice(0,4);
  card.innerHTML = '<div class="client-section-label">Upcoming schedule</div>' + (events.length ? events.map((event) => '<div class="client-schedule-row"><b>' + escapeHtml(event.title) + '</b><span>' + calendarDateLabel(event.date) + (event.startTime ? ' · ' + calendarFormatTime(event.startTime) : '') + ' · ' + escapeHtml(CALENDAR_STATUS_LABELS[event.status] || event.status) + ' · ' + escapeHtml(event.trainerName || "Coaching team") + '</span></div>').join("") : '<h3>No appointment scheduled</h3><p>Your next appointment or dated workout will appear here.</p>');
}

const legacyRenderClientCoach = window.renderClientCoach;
window.renderClientCoach = function v6RenderClientCoach(profile) { legacyRenderClientCoach(profile); enhanceClientSchedule(profile); };
const legacyRenderClientProgram = window.renderClientProgram;
window.renderClientProgram = function v6RenderClientProgram(profile) {
  legacyRenderClientProgram(profile); if (trainerClientPreviewActive()) return;
  const out = byId("clientProgramContent"), active = assignmentsForClient(profile.id).find((assignment) => ["assigned","in_progress"].includes(assignmentStatus(assignment))), pending = loadWorkoutRequests().find((request) => request.profileId === profile.id && request.status === "pending"); if (!out || active) return;
  out.insertAdjacentHTML("beforeend",'<section class="client-card workout-request-card"><div class="client-section-label">Need your next workout?</div><h3>' + (pending ? 'Request sent' : 'Tell the coaching team you are ready') + '</h3><p>' + (pending ? 'Your request stays in the shared trainer action queue until a new workout is assigned.' : 'This sends one clear request to every approved trainer. You will not create duplicate requests by tapping again.') + '</p><div class="tool-actions"><button class="small-btn primary" ' + (pending ? 'disabled' : '') + ' onclick="requestNextWorkout()">' + (pending ? 'Waiting on coaching team' : 'Request next workout') + '</button></div></section>');
};

const legacyRenderCoachModule = window.renderCoachModule;
window.renderCoachModule = function v6RenderCoachModule(destination) {
  const title = byId("coachModuleTitle"), eyebrow = byId("coachModuleEyebrow"), copy = byId("coachModuleCopy");
  if (destination === "actions") { if (title) title.textContent = "Action Center"; if (eyebrow) eyebrow.textContent = "Coach workspace"; if (copy) copy.textContent = "One shared queue that opens the exact source and closes only when the work is complete."; renderActionCenterModule(); return; }
  if (destination === "calendar") { if (title) title.textContent = "Calendar"; if (eyebrow) eyebrow.textContent = "Coach workspace"; if (copy) copy.textContent = "Appointments, workouts, and follow-ups with clear ownership, status, and history."; renderCoachCalendarModule(); return; }
  legacyRenderCoachModule(destination);
};
