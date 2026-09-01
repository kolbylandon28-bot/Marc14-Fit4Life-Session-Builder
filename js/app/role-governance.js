/* ---------- owner / trainer governance ---------- */
const OWNER_REQUESTS_KEY = "fit4life_owner_requests_v1";
const COACH_TASK_CLAIMS_KEY = "fit4life_coach_task_claims_v1";
const COACH_NOTES_KEY = "fit4life_coach_notes_v1";
const COACH_TASK_CLAIM_MINUTES = 45;

const OWNER_REQUEST_LABELS = {
  exercise_add: "Add an exercise",
  exercise_edit: "Edit an exercise",
  exercise_retire: "Retire an exercise",
  template_change: "Change a workout template",
  primary_trainer: "Reassign the primary coach",
  safety_exception: "Safety exception",
  client_archive: "Archive or delete a client",
  duplicate_merge: "Merge duplicate clients",
  organization_export: "Organization export / restore",
  organization_setting: "Organization setting"
};

function staffRole() { return String(window.fit4lifeCloudRole || ""); }
function isFit4LifeOwner() { return staffRole() === "owner"; }
function isFit4LifeTrainer() { return staffRole() === "trainer"; }
function isFit4LifeStaff() { return ["owner","trainer"].includes(staffRole()); }
function loadOwnerRequests() { return loadLocalArray(OWNER_REQUESTS_KEY); }
function loadCoachTaskClaims() { return loadLocalArray(COACH_TASK_CLAIMS_KEY); }
function loadCoachNotes() { return loadLocalArray(COACH_NOTES_KEY); }
function ownerRequestLabel(type) { return OWNER_REQUEST_LABELS[type] || "Owner review"; }

/* ---------- team view ---------- */
function teamLibraryCardHtml(record,editable) {
  const movements = (record.movements || []).slice(0,4).join(" · ");
  return '<article class="team-workout"><div><b>' + escapeHtml(record.title || "Workout") + '</b>'
    + '<span>' + escapeHtml(movements || "No movements recorded") + '</span></div>'
    + '<div class="team-workout-actions">'
    + '<button class="tiny-btn" onclick="useTeamWorkout(' + JSON.stringify(record.id) + ')">Use</button>'
    + (editable ? '<button class="tiny-btn" onclick="removeTeamWorkout(' + JSON.stringify(record.id) + ')">Remove</button>'
                : '<span class="team-readonly">View only</span>')
    + '</div></article>';
}
function renderTeamModule() {
  const out = byId("coachModuleContent"); if (!out) return;
  if (!canViewTeamLibrary()) { out.innerHTML = '<div class="empty-state">Trainer access is required to view the team.</div>'; return; }
  const team = teamSnapshot(), owner = isFit4LifeOwner(), meId = currentStaffId();
  if (!team.length) {
    out.innerHTML = '<section class="coach-module-card"><h3>No trainers yet</h3><p>Trainer accounts appear here once they have been granted access.</p></section>';
    return;
  }
  out.innerHTML = team.map((member) => {
    const mine = member.id === meId;
    const canEdit = canEditTrainerProfile(member.id);
    // A roster is staff-only, and even then a trainer sees counts for colleagues rather
    // than a browsable list of someone else's clients.
    const roster = canViewTrainerRoster()
      ? (owner || mine
          ? '<div class="team-clients">' + (member.clients.length
              ? member.clients.slice(0,8).map((profile) => '<button type="button" class="team-client" onclick="openCalendarClient(' + JSON.stringify(profile.id) + ',\'overview\')">' + escapeHtml(profile.name) + '</button>').join("")
              : '<span class="storage-note">No clients assigned.</span>')
            + (member.clients.length > 8 ? '<span class="storage-note">+' + (member.clients.length - 8) + ' more</span>' : '')
            + '</div>'
          : '<p class="storage-note">' + member.clientCount + ' assigned client' + (member.clientCount === 1 ? '' : 's') + '. Open a client from the Clients tab.</p>')
      : '';
    const stats = '<div class="team-stats">'
      + '<div><b>' + member.clientCount + '</b><span>clients</span></div>'
      + '<div><b class="' + (member.owed ? 'warn' : '') + '">' + member.owed + '</b><span>sessions owed</span></div>'
      + '<div><b class="' + (member.followUps ? 'warn' : '') + '">' + member.followUps + '</b><span>follow-ups</span></div>'
      + '<div><b>' + member.library.length + '</b><span>saved workouts</span></div></div>';
    const library = member.library.length
      ? '<div class="team-library">' + member.library.slice(0,6).map((record) => teamLibraryCardHtml(record,canEditStarredWorkout(record))).join("") + '</div>'
      : '<p class="storage-note">No saved workouts yet.</p>';
    return '<section class="coach-module-card team-card">'
      + '<div class="team-head"><div><h3>' + escapeHtml(member.name) + (mine ? ' <span class="team-you">you</span>' : '') + '</h3>'
      + '<p>' + escapeHtml(member.role === "owner" ? "Owner" : "Trainer") + (member.email ? ' · ' + escapeHtml(member.email) : '') + '</p>'
      + (member.role !== "owner" && window.fit4lifeTrainerTiersAvailable === true ? staffTierBadgeHtml(member.staffTier) : '') + '</div>' 
      + (canEdit ? '' : '<span class="team-readonly">Read only</span>') + '</div>'
      + stats + roster
      + '<h4 class="analysis-section-title" style="margin-top:14px">Saved workouts</h4>' + library
      + '</section>';
  }).join("");
}
// Anyone on staff may start from a colleague's workout; it loads into the builder as a
// new draft rather than modifying the original.
function useTeamWorkout(id) {
  const record = loadStarredWorkouts().find((item) => item.id === id);
  if (!record) { showToast("That saved workout is no longer available"); return; }
  if (!isFit4LifeStaff()) { showToast("Trainer access is required"); return; }
  state.session = { type:"solo", data:JSON.parse(JSON.stringify(record.session || {})), edits:{} };
  state.sessionOptions = [];
  portalRole = "trainer";
  show("builder");
  if (typeof renderSession === "function") renderSession();
  showToast("Loaded “" + (record.title || "workout") + "” as a new draft");
}
function removeTeamWorkout(id) {
  const record = loadStarredWorkouts().find((item) => item.id === id);
  if (!record) return;
  if (!canEditStarredWorkout(record)) { showToast("Only the trainer who saved this, or an owner, can remove it"); return; }
  if (!window.confirm("Remove “" + (record.title || "this workout") + "” from the library?")) return;
  if (unstarWorkout(id)) { renderTeamModule(); showToast("Removed from the library"); }
}
/* ---------- team visibility ---------- */
// Trainers can read each other's saved workouts, because a student trainer learning how
// an experienced one programs is the whole point. Editing stays with the author, and an
// owner can do both. Clients never reach any of this.
function currentStaffId() { const identity = currentAccountIdentity(); return identity && identity.id || ""; }
function canEditStarredWorkout(record) {
  if (!record) return false;
  if (isFit4LifeOwner()) return true;
  if (!isFit4LifeTrainer()) return false;
  // A trainer owns what they starred. Records written before authorship was tracked have
  // no owner, so they stay owner-only rather than becoming editable by everyone.
  return Boolean(record.starredByUserId) && record.starredByUserId === currentStaffId();
}
function canViewTeamLibrary() { return isFit4LifeStaff(); }
function canEditTrainerProfile(trainerId) {
  if (isFit4LifeOwner()) return true;
  return isFit4LifeTrainer() && trainerId && trainerId === currentStaffId();
}
// Client rosters are staff-only. Showing one client the names of a trainer's other
// clients would leak who trains here, which at a university is a real problem rather
// than a theoretical one.
function canViewTrainerRoster() { return isFit4LifeStaff(); }
function teamMembers() {
  const cloud = Array.isArray(window.fit4lifeCloudTrainers) ? window.fit4lifeCloudTrainers : [];
  const fromCloud = cloud.map((trainer) => ({
    id:trainer.user_id || trainer.id || "", name:trainer.display_name || trainer.email || "Trainer",
    email:trainer.email || "", role:trainer.role || "trainer", active:trainer.is_active !== false,
    staffTier:trainer.trainer_tier || "" }));
  if (fromCloud.length) return fromCloud;
  // Before the trainer-account sync has run, fall back to whoever is named on client
  // records so the view is never simply empty.
  const seen = new Map();
  loadProfiles().forEach((profile) => {
    if (!profile.assignedTrainerId || seen.has(profile.assignedTrainerId)) return;
    seen.set(profile.assignedTrainerId,{ id:profile.assignedTrainerId,name:profile.assignedTrainerName || "Trainer",
      email:profile.assignedTrainerEmail || "", role:"trainer", active:true, staffTier:"" });
  });
  return [...seen.values()];
}
function teamMemberSnapshot(trainer) {
  const clients = loadProfiles().filter((profile) => profile.assignedTrainerId === trainer.id);
  const weekStart = typeof membershipWeekStartKey === "function" ? membershipWeekStartKey(new Date()) : "";
  let owed = 0;
  if (weekStart && typeof weeklySessionBalance === "function") {
    clients.forEach((profile) => { try { owed += weeklySessionBalance(profile,weekStart).gap || 0; } catch (error) {} });
  }
  let followUps = 0;
  if (typeof followUpReasonFor === "function") {
    clients.forEach((profile) => { try { if (followUpReasonFor(profile)) followUps += 1; } catch (error) {} });
  }
  const library = typeof loadStarredWorkouts === "function"
    ? loadStarredWorkouts().filter((item) => item.scope === "library" && item.starredByUserId === trainer.id) : [];
  return { ...trainer, clients, clientCount:clients.length, owed, followUps, library };
}
function teamSnapshot() { return teamMembers().map(teamMemberSnapshot).sort((a,b) => b.clientCount - a.clientCount); }
function syncRoleGovernanceControls() {
  document.querySelectorAll("[data-owner-only]").forEach((node) => { node.hidden = !isFit4LifeOwner(); });
  document.querySelectorAll("[data-trainer-only]").forEach((node) => { node.hidden = !isFit4LifeTrainer(); });
  document.querySelectorAll("[data-staff-role-label]").forEach((node) => { node.textContent = isFit4LifeOwner() ? "Owner" : "Trainer"; });
  const count = loadOwnerRequests().filter((request) => request.status === "pending").length;
  if (typeof syncCoachMoreBadge === "function") setTimeout(syncCoachMoreBadge,0);
  document.querySelectorAll("[data-owner-request-badge]").forEach((node) => { node.textContent = count ? String(count) : ""; node.classList.toggle("show",Boolean(count)); });
}

function ensureOwnerRequestDialog() {
  let modal = byId("ownerRequestModal");
  if (modal) return modal;
  const wrapper = document.createElement("div");
  wrapper.innerHTML = '<div id="ownerRequestModal" class="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="ownerRequestTitle"><div class="review-dialog"><h2 id="ownerRequestTitle">Request owner approval</h2><p>Describe the exact change and why it is needed. Owners see the request, requester, client context, and time.</p><input id="ownerRequestProfileId" type="hidden"><input id="ownerRequestSubjectId" type="hidden"><div class="compact-grid"><div class="compact-field wide"><label for="ownerRequestType">Request type</label><select id="ownerRequestType"></select></div><div class="compact-field wide"><label for="ownerRequestSummary">Short summary</label><input id="ownerRequestSummary" maxlength="120" placeholder="What should change?"></div><div class="compact-field wide"><label for="ownerRequestDetail">Reason and exact instructions</label><textarea id="ownerRequestDetail" rows="5" placeholder="Include the client, exercise, setting, or safety context the owner should verify."></textarea></div></div><div class="tool-actions"><button class="small-btn primary" onclick="submitOwnerRequest()">Send to owner</button><button class="small-btn" onclick="closeOwnerRequestDialog()">Cancel</button></div><p class="storage-note">Submitting a request does not make the change, and neither does approving it - an owner records the decision, then makes the change by hand. A requester cannot approve their own request.</p></div></div>';
  modal = wrapper.firstElementChild;
  document.body.appendChild(modal);
  return modal;
}

function openOwnerRequestDialog(type,profileId,subjectId,summary) {
  if (!isFit4LifeStaff()) { showToast("Trainer or owner access is required"); return null; }
  const modal = ensureOwnerRequestDialog(), select = byId("ownerRequestType");
  select.innerHTML = Object.entries(OWNER_REQUEST_LABELS).map(([key,label]) => '<option value="' + key + '">' + escapeHtml(label) + '</option>').join("");
  select.value = type && OWNER_REQUEST_LABELS[type] ? type : "organization_setting";
  byId("ownerRequestProfileId").value = profileId || "";
  byId("ownerRequestSubjectId").value = subjectId || "";
  byId("ownerRequestSummary").value = summary || "";
  byId("ownerRequestDetail").value = "";
  modal.classList.add("open");
  setTimeout(() => byId("ownerRequestSummary").focus(),20);
  return modal;
}
function closeOwnerRequestDialog() { const modal = byId("ownerRequestModal"); if (modal) modal.classList.remove("open"); }
function submitOwnerRequest() {
  if (!isFit4LifeStaff()) return null;
  const type = byId("ownerRequestType").value, summary = byId("ownerRequestSummary").value.trim(), detail = byId("ownerRequestDetail").value.trim();
  if (!summary || !detail) { showToast("Add a short summary and the reason for the request"); return null; }
  const profileId = byId("ownerRequestProfileId").value, profile = loadProfiles().find((item) => item.id === profileId), identity = currentAccountIdentity();
  const request = {id:"owner-request-" + Date.now() + "-" + Math.random().toString(16).slice(2),type,summary,detail,profileId:profileId || "",client:profile && profile.name || "",subjectId:byId("ownerRequestSubjectId").value || "",requestedByUserId:identity.id || "",requestedByName:identity.displayName,requestedByEmail:identity.email || "",status:"pending",createdAt:new Date().toISOString()};
  const requests = loadOwnerRequests(); requests.unshift(request);
  if (!writeLocalArray(OWNER_REQUESTS_KEY,requests,500)) return null;
  closeOwnerRequestDialog(); syncRoleGovernanceControls(); renderTrainerAttention();
  if (openCoachDestination.current === "approvals") renderCoachModule("approvals");
  showToast("Request sent to the owners"); return request;
}

function ownerRequestStatusTag(request) {
  return '<span class="tag ' + (request.status === "approved" ? "tag-circuit" : request.status === "denied" ? "tag-burn" : "") + '">' + escapeHtml(request.status) + '</span>';
}
function renderOwnerApprovalsModule() {
  const out = byId("coachModuleContent"); if (!out) return;
  const identity = currentAccountIdentity(), all = loadOwnerRequests();
  const visible = isFit4LifeOwner() ? all : all.filter((request) => !identity.id || request.requestedByUserId === identity.id);
  const pending = visible.filter((request) => request.status === "pending"), decided = visible.filter((request) => request.status !== "pending");
  const row = (request) => '<article class="owner-request-row"><div><div class="owner-request-meta">' + ownerRequestStatusTag(request) + '<span>' + escapeHtml(ownerRequestLabel(request.type)) + '</span><span>' + new Date(request.createdAt).toLocaleString() + '</span></div><h4>' + escapeHtml(request.summary) + '</h4><p>' + escapeHtml(request.detail) + '</p><span>' + escapeHtml(request.client ? "Client: " + request.client + " · " : "") + 'Requested by ' + escapeHtml(request.requestedByName || request.requestedByEmail || "staff") + (request.decidedByName ? ' · decided by ' + escapeHtml(request.decidedByName) : '') + '</span>' + (request.resolution ? '<p><b>Owner response:</b> ' + escapeHtml(request.resolution) + '</p>' : '') + '</div>' + (isFit4LifeOwner() ? '<div class="owner-request-actions"><button class="small-btn" onclick="openOwnerRequestTarget(\'' + escapeHtml(request.id) + '\')">Open action</button>' + (request.status === "pending" ? '<button class="small-btn primary" onclick="decideOwnerRequest(\'' + escapeHtml(request.id) + '\',\'approved\')">Approve</button><button class="small-btn" onclick="decideOwnerRequest(\'' + escapeHtml(request.id) + '\',\'denied\')">Deny</button>' : '') + '</div>' : '') + '</article>';
  out.innerHTML = '<section class="coach-module-card" style="grid-column:1/-1"><div class="analysis-panel-head"><div><h3>' + (isFit4LifeOwner() ? 'Owner approval queue' : 'My owner requests') + '</h3><p>' + (isFit4LifeOwner() ? 'Review restricted changes without hiding normal coaching work from trainers. Approving records the decision - it does not apply the change for you.' : 'Request restricted changes here. Owners receive the exact request and an audit trail.') + '</p></div><button class="small-btn primary" onclick="openOwnerRequestDialog()">+ New request</button></div><div class="permission-summary"><b>Trainer boundary</b><span>All approved trainers may coach every client. Exercise-bank changes, staff access, primary-coach reassignment, organization settings, exports, destructive actions, and safety exceptions require an owner.</span></div><h3 style="margin-top:22px">Pending · ' + pending.length + '</h3><div class="owner-request-list">' + (pending.map(row).join("") || '<div class="empty-state">No approval request is waiting.</div>') + '</div><details class="formal-review-box"><summary>Decision history · ' + decided.length + '</summary><div class="owner-request-list">' + (decided.map(row).join("") || '<div class="empty-state">No decisions recorded yet.</div>') + '</div></details></section>';
}

function decideOwnerRequest(id,status) {
  if (!isFit4LifeOwner()) { showToast("Only an owner can decide requests"); return false; }
  const requests = loadOwnerRequests(), request = requests.find((item) => item.id === id); if (!request || request.status !== "pending") return false;
  const identity = currentAccountIdentity();
  if (identity.id && request.requestedByUserId === identity.id) { showToast("A requester cannot approve their own request"); return false; }
  const response = window.prompt(status === "approved" ? "Owner response or implementation instructions:" : "Reason for denial:",status === "approved" ? "Approved - I still need to make this change myself." : "Not approved at this time.");
  if (response == null) return false;
  request.status = status; request.resolution = response.trim(); request.decidedAt = new Date().toISOString(); request.decidedByUserId = identity.id || ""; request.decidedByName = identity.displayName;
  // The one request type where approving now DOES something. Everything else in this queue
  // still only records a decision, which the surrounding copy says plainly.
  let granted = 0;
  if (status === "approved" && request.type === "safety_exception" && request.profileId && request.subjectId) {
    granted = grantSafetyExceptions(request.profileId,String(request.subjectId).split(",").map((tag) => tag.trim()).filter(Boolean),identity,request.id);
  }
  if (!writeLocalArray(OWNER_REQUESTS_KEY,requests,500)) return false; syncRoleGovernanceControls(); renderCoachModule("approvals"); renderTrainerAttention(); showToast(status !== "approved" ? "Request denied"
    : granted ? "Approved - the trainer can now clear " + granted + " protected limitation" + (granted === 1 ? "" : "s") + " on this client."
    : "Approved - recorded only. You still need to make the change."); return true;
}
// Writes the grant onto the client, one entry per limitation the request named. Deliberately
// additive: it authorises a specific hold on a specific client, not safety checks in general.
function grantSafetyExceptions(profileId,tags,identity,requestId) {
  if (!tags.length || typeof loadProfiles !== "function" || typeof writeProfiles !== "function") return 0;
  const profiles = loadProfiles(), index = profiles.findIndex((item) => item.id === profileId);
  if (index < 0) return 0;
  const existing = profiles[index].safetyExceptions && typeof profiles[index].safetyExceptions === "object" ? profiles[index].safetyExceptions : {};
  const next = { ...existing }, at = new Date().toISOString();
  tags.forEach((tag) => { next[tag] = { approvedAt:at, approvedByUserId:identity.id || "", approvedByName:identity.displayName || "", requestId:requestId || "" }; });
  profiles[index] = { ...profiles[index], safetyExceptions:next, updatedAt:at };
  return writeProfiles(profiles) ? tags.length : 0;
}
function openOwnerRequestTarget(id) {
  if (!isFit4LifeOwner()) return false;
  const request = loadOwnerRequests().find((item) => item.id === id); if (!request) return false;
  if (["exercise_add","exercise_edit","exercise_retire"].includes(request.type)) { openCoachDestination("library"); return true; }
  if (["organization_export","organization_setting"].includes(request.type)) { openCoachDestination("settings"); return true; }
  if (request.type === "template_change") { openCoachDestination("workouts"); return true; }
  if (request.profileId) { const profile = loadProfiles().find((item) => item.id === request.profileId); if (profile) { selectedTrainerClient = profile.name; trainerSummaryState.tab = "details"; show("trainer"); renderTrainerHub(profile.name); return true; } }
  openCoachDestination("clients"); return true;
}

function activeCoachTaskClaim(itemId) {
  const claims = loadCoachTaskClaims(), now = Date.now(), active = claims.find((claim) => claim.itemId === itemId && new Date(claim.expiresAt || 0).getTime() > now);
  if (claims.some((claim) => new Date(claim.expiresAt || 0).getTime() <= now)) writeLocalArray(COACH_TASK_CLAIMS_KEY,claims.filter((claim) => new Date(claim.expiresAt || 0).getTime() > now),500);
  return active || null;
}
function coachTaskClaimText(itemId) {
  const claim = activeCoachTaskClaim(itemId); if (!claim) return "";
  const mine = claim.handlerUserId && claim.handlerUserId === currentAccountIdentity().id;
  return (mine ? "You are handling this" : "Handled by " + claim.handlerName) + " · " + new Date(claim.claimedAt).toLocaleTimeString([],{hour:"numeric",minute:"2-digit"});
}
function claimCoachTask(itemId,profileId,kind,client,openAfter) {
  if (!isFit4LifeStaff()) return false;
  const current = activeCoachTaskClaim(itemId), identity = currentAccountIdentity();
  if (current && current.handlerUserId !== identity.id && !window.confirm(current.handlerName + " is already handling this task. Take it over?")) return false;
  const claims = loadCoachTaskClaims().filter((claim) => claim.itemId !== itemId && new Date(claim.expiresAt || 0).getTime() > Date.now());
  claims.unshift({id:"claim-" + Date.now(),itemId,profileId:profileId || "",kind:kind || "",client:client || "",handlerUserId:identity.id || "",handlerName:identity.displayName,claimedAt:new Date().toISOString(),expiresAt:new Date(Date.now() + COACH_TASK_CLAIM_MINUTES * 60000).toISOString()});
  writeLocalArray(COACH_TASK_CLAIMS_KEY,claims,500); renderTrainerAttention();
  if (openAfter !== false) openCoachAttentionItem(profileId,kind,itemId);
  return true;
}
function releaseCoachTask(itemId) { writeLocalArray(COACH_TASK_CLAIMS_KEY,loadCoachTaskClaims().filter((claim) => claim.itemId !== itemId),500); }

function coachNotesForProfile(profileId,visibility) { return loadCoachNotes().filter((note) => note.profileId === profileId && (!visibility || note.visibility === visibility) && !note.archivedAt).sort((a,b) => String(b.createdAt).localeCompare(String(a.createdAt))); }
function coachNoteVisibilityLabel(value) { return value === "client" ? "Client feedback" : value === "safety" ? "Protected safety note" : "Team note"; }
function coachNotesPanelHtml(profile) {
  if (!profile) return "";
  const notes = coachNotesForProfile(profile.id);
  return '<section class="analysis-panel coach-notes-panel"><div class="analysis-panel-head"><div><h4 class="analysis-section-title">Coaching notes</h4><p>Choose exactly who should see each note.</p></div></div><div class="compact-grid"><div class="compact-field"><label for="coachNoteVisibility">Visibility</label><select id="coachNoteVisibility"><option value="team">Team note · all staff</option><option value="client">Client feedback · visible to client</option><option value="safety">Protected safety note · staff only</option></select></div><div class="compact-field wide"><label for="coachNoteText">Note</label><textarea id="coachNoteText" rows="3" placeholder="Write the coaching context or next action"></textarea></div></div><div class="tool-actions"><button class="small-btn primary" onclick="saveCoachNote(\'' + escapeHtml(profile.id) + '\')">Save note</button></div><div class="coach-note-list">' + (notes.map((note) => '<article class="coach-note ' + escapeHtml(note.visibility) + '"><div><span class="tag">' + escapeHtml(coachNoteVisibilityLabel(note.visibility)) + '</span><b>' + escapeHtml(note.authorName || "Staff") + ' · ' + new Date(note.createdAt).toLocaleString() + '</b></div><p>' + escapeHtml(note.text) + '</p>' + (isFit4LifeOwner() ? '<button class="tiny-btn" onclick="archiveCoachNote(\'' + escapeHtml(note.id) + '\',\'' + escapeHtml(profile.id) + '\')">Archive</button>' : '') + '</article>').join("") || '<div class="empty-state">No coaching notes yet.</div>') + '</div></section>';
}
function saveCoachNote(profileId) {
  if (!isFit4LifeStaff()) return null;
  const text = byId("coachNoteText") && byId("coachNoteText").value.trim(), visibility = byId("coachNoteVisibility") && byId("coachNoteVisibility").value || "team"; if (!text) { showToast("Write the note first"); return null; }
  const profile = loadProfiles().find((item) => item.id === profileId), identity = currentAccountIdentity(), notes = loadCoachNotes();
  notes.unshift({id:"coach-note-" + Date.now(),profileId,client:profile && profile.name || "",visibility,text,authorUserId:identity.id || "",authorName:identity.displayName,createdAt:new Date().toISOString()});
  if (!writeLocalArray(COACH_NOTES_KEY,notes,1000)) return null; renderTrainerAnalysis(profile && profile.name || selectedTrainerClient); showToast(coachNoteVisibilityLabel(visibility) + " saved"); return true;
}
function archiveCoachNote(id,profileId) { if (!isFit4LifeOwner()) { showToast("Only an owner can archive protected coaching notes"); return false; } const notes = loadCoachNotes(), note = notes.find((item) => item.id === id); if (!note) return false; note.archivedAt = new Date().toISOString(); note.archivedBy = currentAccountIdentity().displayName; writeLocalArray(COACH_NOTES_KEY,notes,1000); const profile = loadProfiles().find((item) => item.id === profileId); renderTrainerAnalysis(profile && profile.name || selectedTrainerClient); return true; }
function clientCoachNotesHtml(profile) { const notes = profile ? coachNotesForProfile(profile.id,"client") : []; return '<section class="client-card wide"><div class="client-section-label">Coach feedback</div><h3>Updates from your coaching team</h3><p>All approved FIT4LIFE trainers may review your record and cover normal coaching work. If you have a primary coach, they lead your plan while the rest of the team can still help.</p><div class="coach-note-list">' + (notes.map((note) => '<article class="coach-note client"><b>' + escapeHtml(note.authorName || "Coaching team") + ' · ' + new Date(note.createdAt).toLocaleDateString() + '</b><p>' + escapeHtml(note.text) + '</p></article>').join("") || '<div class="empty-state">No new coach feedback.</div>') + '</div></section>'; }

function ownerOnlyMutation(action,type,profileId,subjectId,summary) {
  if (isFit4LifeOwner()) return true;
  if (isFit4LifeTrainer()) { showToast(action + " requires owner approval"); openOwnerRequestDialog(type,profileId,subjectId,summary || action); }
  return false;
}
function protectOwnerMutation(name,type,action) {
  const original = window[name]; if (typeof original !== "function" || original.__ownerProtected) return;
  const wrapped = function protectedOwnerMutation() { if (!ownerOnlyMutation(action,type)) { if (arguments[0] && arguments[0].tagName === "INPUT") arguments[0].value = ""; return null; } return original.apply(this,arguments); };
  wrapped.__ownerProtected = true; window[name] = wrapped;
}

protectOwnerMutation("exportProgress","organization_export","Export organization data");
protectOwnerMutation("importProgressFile","organization_export","Restore organization data");
protectOwnerMutation("clearProgress","client_archive","Clear organization progress history");
protectOwnerMutation("publishLocalProgram","template_change","Publish a workout template");
protectOwnerMutation("installProgramTemplate","template_change","Install a workout template");
protectOwnerMutation("saveAutomationRule","organization_setting","Create organization alert rules");
protectOwnerMutation("deleteAutomationRule","organization_setting","Delete organization alert rules");
protectOwnerMutation("toggleAutomationRule","organization_setting","Change organization alert rules");
protectOwnerMutation("saveGymBrand","organization_setting","Change shared gym settings");
protectOwnerMutation("resetGymBrand","organization_setting","Reset shared gym colors");
protectOwnerMutation("saveTeam","organization_setting","Create or change a staff team");
protectOwnerMutation("deleteTeam","organization_setting","Delete a staff team");
protectOwnerMutation("deleteClientProfile","client_archive","Archive a client profile");
protectOwnerMutation("openCompleteDeleteClient","client_archive","Permanently delete client data");
protectOwnerMutation("confirmCompleteClientDelete","client_archive","Permanently delete client data");
protectOwnerMutation("deleteInBodyScan","client_archive","Delete an InBody record");

document.addEventListener("DOMContentLoaded",syncRoleGovernanceControls);
