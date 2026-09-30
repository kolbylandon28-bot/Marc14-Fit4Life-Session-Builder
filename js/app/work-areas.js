/* ---------- Work areas ----------
   A gym is more than its gym floor. Each area keeps its own people, and later its own
   schedule, clock and tasks. Someone who works in two areas picks which one they are in
   today; that choice is what everything else hangs off. */

const WORK_AREA_ACTIVE_KEY = "fit4life_active_area_v1";
const WORK_AREA_DEFAULTS = [
  ["maintenance", "Maintenance"],
  ["i-center", "I-Center"],
  ["equipment-center", "Equipment Center"],
  ["pool", "Pool"],
  ["gym", "Gym"]
];
const WORK_ROLES = [["trainer", "Trainer", "Trains clients. Gets the client screens, programming and audits."],
  ["staff", "Staff", "Clock, schedule and tasks for their area. No client records."]];

let areaAdminState = { invite: { role: "trainer", areas: [] }, editing: "" };

const workAreas = () => (window.fit4lifeWorkAreas || []).filter((area) => area.is_active !== false);
const workAreaName = (key) => (workAreas().find((area) => area.area_key === key) || { name: key }).name;
const myWorkAreas = () => (window.fit4lifeMyAreas || []);

function activeWorkArea() {
  let stored = "";
  try { stored = localStorage.getItem(WORK_AREA_ACTIVE_KEY) || ""; } catch (_) { stored = ""; }
  const mine = myWorkAreas();
  if (stored && mine.includes(stored)) return stored;
  return mine.length === 1 ? mine[0] : "";
}

function setActiveWorkArea(key) {
  try { localStorage.setItem(WORK_AREA_ACTIVE_KEY, key || ""); } catch (_) { /* a locked-down browser still works, it just asks again */ }
  renderWorkAreaPicker();
  if (typeof renderWorkAreasModule === "function" && byId("coachModuleContent") && openCoachDestination.current === "areas") renderWorkAreasModule();
  showToast(key ? "Working in " + workAreaName(key) : "Area cleared");
}

/* The picker sits in the coach shell so it is answered once, not per screen. */
function renderWorkAreaPicker() {
  const host = byId("coachSidebar");
  if (!host) return;
  let slot = byId("workAreaPicker");
  const mine = myWorkAreas();
  if (mine.length < 2) { if (slot) slot.remove(); return; }
  if (!slot) {
    slot = document.createElement("div");
    slot.id = "workAreaPicker";
    slot.className = "coach-area-picker";
    host.insertBefore(slot, host.querySelector("button"));
  }
  const active = activeWorkArea();
  slot.innerHTML = '<label for="workAreaSelect">Working in</label><select id="workAreaSelect" onchange="setActiveWorkArea(this.value)">'
    + '<option value="">Pick an area…</option>'
    + mine.map((key) => '<option value="' + escapeHtml(key) + '"' + (active === key ? ' selected' : '') + '>' + escapeHtml(workAreaName(key)) + '</option>').join('')
    + '</select>';
}

/* ---------- owner: the areas themselves ---------- */
function renderWorkAreasModule() {
  const out = byId("coachModuleContent");
  if (!out) return;
  if (!isFit4LifeOwner()) {
    const mine = myWorkAreas();
    out.innerHTML = '<section class="coach-module-card" style="grid-column:1/-1"><h3>Your areas</h3>'
      + (mine.length ? '<p>You are cleared for ' + mine.map((key) => escapeHtml(workAreaName(key))).join(", ") + '.</p>'
        + '<p class="storage-note">Pick which one you are in today from the menu on the left. Your clock, schedule and tasks follow that choice.</p>'
        : '<p>You have not been put in an area yet. Ask the owner to add you.</p>') + '</section>';
    return;
  }
  if (window.fit4lifeWorkAreasAvailable === false) {
    out.innerHTML = '<section class="coach-module-card" style="grid-column:1/-1"><h3>Not set up yet</h3>'
      + '<p>Run RUN-THIS-IN-SUPABASE-WORK-AREAS.sql in Supabase, then reload. Until then there are no areas to assign anyone to.</p></section>';
    return;
  }
  out.innerHTML = renderAreaListCard() + renderAreaInviteCard() + renderAreaPeopleCard();
}

function renderAreaListCard() {
  const areas = window.fit4lifeWorkAreas || [];
  const rows = areas.length ? '<div class="advanced-list">' + areas.map((area) => '<div class="trainer-account-row"><div><b>' + escapeHtml(area.name) + '</b><span>'
    + escapeHtml(area.area_key) + ' · ' + area.people + (Number(area.people) === 1 ? ' person' : ' people') + (area.is_active === false ? ' · hidden' : '') + '</span></div>'
    + '<div class="tool-actions"><button class="small-btn" onclick="renameWorkArea(\'' + escapeHtml(area.area_key) + '\')">Rename</button>'
    + '<button class="small-btn" onclick="toggleWorkArea(\'' + escapeHtml(area.area_key) + '\',' + (area.is_active === false ? 'true' : 'false') + ')">' + (area.is_active === false ? 'Show' : 'Hide') + '</button></div></div>').join('') + '</div>'
    : '<div class="empty-state">No areas yet.</div>';
  const seed = areas.length ? '' : '<div class="tool-actions"><button class="small-btn primary" onclick="addStandardWorkAreas()">Add the standard five</button></div>';
  return '<section class="coach-module-card" style="grid-column:1/-1"><h3>Areas</h3>'
    + '<p class="storage-note">Maintenance, I-Center, Equipment Center, Pool and Gym to start. Add your own; they carry through to schedules, clocks and tasks.</p>'
    + seed + rows
    + '<div class="compact-grid" style="margin-top:12px"><div class="compact-field"><label for="newAreaName">Add an area</label><input id="newAreaName" placeholder="Front desk"></div></div>'
    + '<div class="tool-actions"><button class="small-btn" onclick="addWorkAreaFromForm()">Add area</button></div></section>';
}

async function addStandardWorkAreas() {
  for (let index = 0; index < WORK_AREA_DEFAULTS.length; index++) {
    const [key, name] = WORK_AREA_DEFAULTS[index];
    await window.fit4lifeCloudSaveWorkArea(key, name, index, true);
  }
  renderWorkAreasModule();
  showToast("Five areas added");
}

async function addWorkAreaFromForm() {
  const field = byId("newAreaName"), name = field ? field.value.trim() : "";
  if (!name) { showToast("Give the area a name"); return; }
  const done = await window.fit4lifeCloudSaveWorkArea("", name, (window.fit4lifeWorkAreas || []).length, true);
  renderWorkAreasModule();
  showToast(done ? name + " added" : "That area could not be saved");
}

async function renameWorkArea(key) {
  const area = (window.fit4lifeWorkAreas || []).find((row) => row.area_key === key);
  if (!area) return;
  const name = window.prompt("Rename this area", area.name);
  if (!name || !name.trim()) return;
  await window.fit4lifeCloudSaveWorkArea(key, name.trim(), area.sort_order, area.is_active !== false);
  renderWorkAreasModule();
}

async function toggleWorkArea(key, makeActive) {
  const area = (window.fit4lifeWorkAreas || []).find((row) => row.area_key === key);
  if (!area) return;
  await window.fit4lifeCloudSaveWorkArea(key, area.name, area.sort_order, Boolean(makeActive));
  renderWorkAreasModule();
  showToast(makeActive ? area.name + " is back" : area.name + " hidden");
}

/* ---------- owner: inviting someone into an area ---------- */
function renderAreaInviteCard() {
  const areas = workAreas();
  const roleButtons = WORK_ROLES.map(([value, label, detail]) => '<button class="small-btn ' + (areaAdminState.invite.role === value ? "primary" : "") + '" onclick="setInviteRole(\'' + value + '\')" title="' + escapeHtml(detail) + '">' + label + '</button>').join('');
  const areaChips = areas.length ? areas.map((area) => '<button class="chip ' + (areaAdminState.invite.areas.includes(area.area_key) ? "on" : "") + '" onclick="toggleInviteArea(\'' + escapeHtml(area.area_key) + '\')" aria-pressed="' + areaAdminState.invite.areas.includes(area.area_key) + '">' + escapeHtml(area.name) + '</button>').join('')
    : '<span class="storage-note">Add an area above first.</span>';
  const pending = (window.fit4lifeStaffInvites || []).filter((invite) => !invite.accepted_at && !invite.revoked_at);
  const pendingRows = pending.length ? '<div class="advanced-list" style="margin-top:12px">' + pending.map((invite) => '<div class="trainer-account-row"><div><b>' + escapeHtml(invite.full_name || invite.email) + '</b><span>'
    + escapeHtml(invite.email) + ' · invited as ' + escapeHtml(invite.role || "trainer") + ((invite.areas || []).length ? ' · ' + invite.areas.map((key) => escapeHtml(workAreaName(key))).join(", ") : ' · no area yet')
    + ' · sent ' + escapeHtml(String(invite.created_at).slice(0, 10)) + '</span></div>'
    + '<div class="tool-actions"><button class="small-btn" onclick="resendAreaInvite(\'' + escapeHtml(invite.email) + '\')">Send again</button>'
    + '<button class="small-btn" onclick="cancelAreaInvite(\'' + escapeHtml(invite.email) + '\')">Cancel</button></div></div>').join('') + '</div>' : '';
  return '<section class="coach-module-card" style="grid-column:1/-1"><h3>Invite someone</h3>'
    + '<p class="storage-note">You pick their name, their job and their areas. They get a sign-in link and land exactly where you put them.</p>'
    + '<div class="compact-grid"><div class="compact-field"><label for="inviteName">Name</label><input id="inviteName" placeholder="Jordan R"></div>'
    + '<div class="compact-field"><label for="inviteEmail">Personal email</label><input id="inviteEmail" type="email" autocapitalize="none" placeholder="jordan@example.com"></div></div>'
    + '<div class="compact-field"><label>Job</label><div class="tool-actions">' + roleButtons + '</div></div>'
    + '<div class="compact-field"><label>Areas they work in</label><div class="chips">' + areaChips + '</div></div>'
    + '<div class="tool-actions"><button class="small-btn primary" onclick="sendAreaInvite()">Send invite</button></div>' + pendingRows + '</section>';
}

function setInviteRole(role) { areaAdminState.invite.role = role; renderWorkAreasModule(); }
function toggleInviteArea(key) {
  const list = areaAdminState.invite.areas, at = list.indexOf(key);
  if (at >= 0) list.splice(at, 1); else list.push(key);
  renderWorkAreasModule();
}

async function sendAreaInvite() {
  const name = byId("inviteName") ? byId("inviteName").value.trim() : "", email = byId("inviteEmail") ? byId("inviteEmail").value.trim() : "";
  if (!name) { showToast("Give their name"); return; }
  if (!email || email.indexOf("@") < 1) { showToast("Give the email they will sign in with"); return; }
  if (!areaAdminState.invite.areas.length && !window.confirm("No area picked. Invite them anyway and assign later?")) return;
  showToast("Sending the invite…");
  const result = await window.fit4lifeCloudInviteStaff(email, name, areaAdminState.invite.role, areaAdminState.invite.areas.slice());
  areaAdminState.invite = { role: areaAdminState.invite.role, areas: [] };
  renderWorkAreasModule();
  if (result && result.ok) showToast(name + " invited as " + areaAdminState.invite.role);
  else if (result && result.invited) showToast("On the list, but the email did not go out: " + (result.error || "unknown"));
  else showToast((result && result.error) || "The invite could not be sent");
}

async function resendAreaInvite(email) {
  const invite = (window.fit4lifeStaffInvites || []).find((row) => row.email === email);
  if (!invite) return;
  const result = await window.fit4lifeCloudInviteStaff(email, invite.full_name || "", invite.role, invite.areas || []);
  renderWorkAreasModule();
  showToast(result && result.ok ? "Sent again" : "It could not be sent again");
}

async function cancelAreaInvite(email) {
  if (!window.confirm("Cancel this invite? Their link stops working.")) return;
  await window.fit4lifeCloudRevokeStaffInvite(email);
  renderWorkAreasModule();
  showToast("Invite cancelled");
}

/* ---------- owner: who works where ---------- */
function areaPeople() {
  const roster = window.fit4lifeCloudTrainers || [], assignments = window.fit4lifeStaffAreas || [];
  const byUser = new Map();
  roster.forEach((person) => byUser.set(person.user_id, { userId: person.user_id, name: person.display_name || person.email || "Staff member", email: person.email || "", role: person.role || "trainer", areas: [] }));
  assignments.forEach((row) => {
    if (!byUser.has(row.user_id)) byUser.set(row.user_id, { userId: row.user_id, name: "Staff member", email: "", role: "staff", areas: [] });
    byUser.get(row.user_id).areas.push(row.area_key);
  });
  return [...byUser.values()].sort((a, b) => String(a.name).localeCompare(String(b.name)));
}

function renderAreaPeopleCard() {
  const people = areaPeople(), areas = workAreas();
  if (!people.length) return '<section class="coach-module-card" style="grid-column:1/-1"><h3>Who works where</h3><div class="empty-state">Nobody yet. Invite someone above.</div></section>';
  const rows = people.map((person) => {
    const editing = areaAdminState.editing === person.userId;
    const chips = areas.map((area) => '<button class="chip ' + (person.areas.includes(area.area_key) ? "on" : "") + '" onclick="toggleStaffArea(\'' + escapeHtml(person.userId) + '\',\'' + escapeHtml(area.area_key) + '\')" aria-pressed="' + person.areas.includes(area.area_key) + '">' + escapeHtml(area.name) + '</button>').join('');
    return '<div class="trainer-account-row"><div><b>' + escapeHtml(person.name) + '</b><span>' + escapeHtml(person.role) + (person.email ? ' · ' + escapeHtml(person.email) : '')
      + ' · ' + (person.areas.length ? person.areas.map((key) => escapeHtml(workAreaName(key))).join(", ") : "no area") + '</span>'
      + (editing ? '<div class="chips" style="margin-top:8px">' + chips + '</div>' : '') + '</div>'
      + '<div class="tool-actions"><button class="small-btn" onclick="editStaffAreas(\'' + escapeHtml(person.userId) + '\')">' + (editing ? "Done" : "Change areas") + '</button></div></div>';
  }).join('');
  return '<section class="coach-module-card" style="grid-column:1/-1"><h3>Who works where</h3>'
    + '<p class="storage-note">Someone in two areas picks which one they are in when they arrive.</p>'
    + '<div class="advanced-list">' + rows + '</div></section>';
}

function editStaffAreas(userId) {
  areaAdminState.editing = areaAdminState.editing === userId ? "" : userId;
  renderWorkAreasModule();
}

async function toggleStaffArea(userId, key) {
  const person = areaPeople().find((row) => row.userId === userId);
  if (!person) return;
  const next = person.areas.includes(key) ? person.areas.filter((area) => area !== key) : person.areas.concat([key]);
  const done = await window.fit4lifeCloudSetStaffAreas(userId, next);
  renderWorkAreasModule();
  renderWorkAreaPicker();
  if (!done) showToast("That change could not be saved");
}

/* ---------- registration ---------- */
const legacyRenderCoachModuleBeforeAreas = window.renderCoachModule;
window.renderCoachModule = function areasRenderCoachModule(destination) {
  if (destination === "areas") {
    const title = byId("coachModuleTitle"), eyebrow = byId("coachModuleEyebrow"), copy = byId("coachModuleCopy");
    if (title) title.textContent = "Areas and people";
    if (eyebrow) eyebrow.textContent = "Coach workspace";
    if (copy) copy.textContent = "Every part of the building, who works in it, and how they get their login.";
    renderWorkAreasModule();
    if (window.fit4lifeWorkAreasAvailable === undefined && typeof window.fit4lifeCloudListWorkAreas === "function") {
      window.fit4lifeCloudListWorkAreas().then(() => { renderWorkAreasModule(); renderWorkAreaPicker(); });
    }
    if (window.fit4lifeStaffInvites === undefined && typeof window.fit4lifeCloudListStaffInvites === "function") {
      window.fit4lifeStaffInvites = [];
      window.fit4lifeCloudListStaffInvites().then((invites) => { if (invites) renderWorkAreasModule(); });
    }
    return;
  }
  legacyRenderCoachModuleBeforeAreas(destination);
};

const legacyShowBeforeAreas = window.show;
window.show = function areasShow(view) {
  const result = legacyShowBeforeAreas.apply(this, arguments);
  try { renderWorkAreaPicker(); } catch (_) { /* the picker is a convenience, never a blocker */ }
  return result;
};

if (typeof window.fit4lifeCloudListWorkAreas === "function") {
  window.fit4lifeCloudListWorkAreas().then(() => renderWorkAreaPicker()).catch(() => {});
}
