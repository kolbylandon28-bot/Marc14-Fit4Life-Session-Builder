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
/* Two switches, deliberately apart: the job decides whether they touch client records at
   all, the areas decide only where they clock in, whose schedule they see and whose tasks
   they pick up. A lifeguard cleared for the gym desk still gets no client records. */
const WORK_ROLES = [["trainer", "Trainer", "Trains clients. Client records, programming and the builder."],
  ["staff", "Staff", "Clock, schedule and tasks. Never sees a client record."]];
const ALL_AREAS_KEY = "*";

let areaAdminState = { invite: { role: "trainer", areas: [] }, editing: "" };

const workAreas = () => (window.fit4lifeWorkAreas || []).filter((area) => area.is_active !== false);
const workAreaName = (key) => key === ALL_AREAS_KEY ? "All areas" : (workAreas().find((area) => area.area_key === key) || { name: key }).name;
const hasEveryArea = (keys) => (keys || []).includes(ALL_AREAS_KEY);
const myWorkAreas = () => {
  const mine = window.fit4lifeMyAreas || [];
  // An owner can stand anywhere in their own building, so they never wait to be assigned.
  if (isFit4LifeOwner() || hasEveryArea(mine)) return workAreas().map((area) => area.area_key);
  return mine;
};
// The job, not the area, is what opens a client record.
const canEditClientRecords = () => ["owner", "trainer"].includes(window.fit4lifeCloudRole);

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
    + area.people + (Number(area.people) === 1 ? ' person' : ' people') + (area.is_coaching ? ' · coaching area' : ' · shift area') + (area.has_events ? ' · calendar' : '') + (area.is_active === false ? ' · hidden' : '') + '</span></div>'
    + '<div class="tool-actions"><button class="small-btn" onclick="toggleWorkAreaCoaching(\'' + escapeHtml(area.area_key) + '\',' + (area.is_coaching ? 'false' : 'true') + ')" title="Coaching areas get clients, programming and the builder">' + (area.is_coaching ? 'Make shift only' : 'Make coaching') + '</button>'
    + '<button class="small-btn" onclick="toggleWorkAreaEvents(\'' + escapeHtml(area.area_key) + '\',' + (area.has_events ? 'false' : 'true') + ')" title="A calendar for lessons, clinics and trainings">' + (area.has_events ? 'Drop the calendar' : 'Add a calendar') + '</button>'
    + '<button class="small-btn" onclick="renameWorkArea(\'' + escapeHtml(area.area_key) + '\')">Rename</button>'
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
    await window.fit4lifeCloudSaveWorkArea(key, name, index, true, COACHING_DEFAULTS.includes(key), EVENT_DEFAULTS.includes(key));
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

async function toggleWorkAreaEvents(key, makeEvents) {
  const area = (window.fit4lifeWorkAreas || []).find((row) => row.area_key === key);
  if (!area) return;
  await window.fit4lifeCloudSaveWorkArea(key, area.name, area.sort_order, area.is_active !== false, area.is_coaching === true, Boolean(makeEvents));
  renderWorkAreasModule();
  showToast(area.name + (makeEvents ? " now has a calendar" : " no longer has a calendar"));
}

async function toggleWorkAreaCoaching(key, makeCoaching) {
  const area = (window.fit4lifeWorkAreas || []).find((row) => row.area_key === key);
  if (!area) return;
  await window.fit4lifeCloudSaveWorkArea(key, area.name, area.sort_order, area.is_active !== false, Boolean(makeCoaching), area.has_events === true);
  renderWorkAreasModule();
  groupCoachSidebar();
  showToast(area.name + (makeCoaching ? " now has the coaching tools" : " is a shift area only"));
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
  const everywhere = hasEveryArea(areaAdminState.invite.areas);
  const chipFor = (key, label) => '<button class="chip ' + (key === ALL_AREAS_KEY ? (everywhere ? "on" : "") : (!everywhere && areaAdminState.invite.areas.includes(key) ? "on" : "")) + '" onclick="toggleInviteArea(\'' + escapeHtml(key) + '\')" aria-pressed="' + (key === ALL_AREAS_KEY ? everywhere : areaAdminState.invite.areas.includes(key)) + '">' + escapeHtml(label) + '</button>';
  const areaChips = areas.length ? chipFor(ALL_AREAS_KEY, "All areas") + areas.map((area) => chipFor(area.area_key, area.name)).join('')
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
    + '<div class="compact-field"><label>Where they can clock in</label><div class="chips">' + areaChips + '</div>'
    + '<span class="storage-note">Areas cover the clock, the schedule and that area\'s tasks. Client records come from the job above, never from an area.</span></div>'
    + '<div class="tool-actions"><button class="small-btn primary" onclick="sendAreaInvite()">Send invite</button></div>' + pendingRows + '</section>';
}

function setInviteRole(role) { areaAdminState.invite.role = role; renderWorkAreasModule(); }
function toggleInviteArea(key) {
  const list = areaAdminState.invite.areas;
  if (key === ALL_AREAS_KEY) {
    areaAdminState.invite.areas = hasEveryArea(list) ? [] : [ALL_AREAS_KEY];
    renderWorkAreasModule();
    return;
  }
  const without = list.filter((item) => item !== ALL_AREAS_KEY), at = without.indexOf(key);
  if (at >= 0) without.splice(at, 1); else without.push(key);
  areaAdminState.invite.areas = without;
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
    const everyArea = hasEveryArea(person.areas);
    const chip = (key, label, on) => '<button class="chip ' + (on ? "on" : "") + '" onclick="toggleStaffArea(\'' + escapeHtml(person.userId) + '\',\'' + escapeHtml(key) + '\')" aria-pressed="' + Boolean(on) + '">' + escapeHtml(label) + '</button>';
    const chips = chip(ALL_AREAS_KEY, "All areas", everyArea) + areas.map((area) => chip(area.area_key, area.name, !everyArea && person.areas.includes(area.area_key))).join('');
    return '<div class="trainer-account-row"><div><b>' + escapeHtml(person.name) + '</b><span>' + escapeHtml(person.role) + (person.email ? ' · ' + escapeHtml(person.email) : '')
      + ' · ' + (hasEveryArea(person.areas) ? "all areas" : person.areas.length ? person.areas.map((key) => escapeHtml(workAreaName(key))).join(", ") : "no area")
      + (canEditClientRecords() && person.role === "trainer" ? "" : person.role === "staff" ? " · no client records" : "") + '</span>'
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
  let next;
  if (key === ALL_AREAS_KEY) next = hasEveryArea(person.areas) ? [] : [ALL_AREAS_KEY];
  else {
    const without = person.areas.filter((area) => area !== ALL_AREAS_KEY);
    next = without.includes(key) ? without.filter((area) => area !== key) : without.concat([key]);
  }
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

/* ---------- the front door ----------
   One question, answered once: where are you today. What shows after that is whatever
   belongs to that area, and nothing else. */
const COACHING_DEFAULTS = ["gym", "pool"];
const EVENT_DEFAULTS = ["gym", "pool"];
const areaHasEvents = (key) => {
  const area = (window.fit4lifeWorkAreas || []).find((row) => row.area_key === key);
  return area ? area.has_events === true : EVENT_DEFAULTS.includes(key);
};
const areaIsCoaching = (key) => {
  const area = (window.fit4lifeWorkAreas || []).find((row) => row.area_key === key);
  return area ? area.is_coaching === true : COACHING_DEFAULTS.includes(key);
};
const activeAreaIsCoaching = () => { const key = activeWorkArea(); return !key || areaIsCoaching(key); };

function enterWorkArea(key) {
  setActiveWorkArea(key);
  // The area home first, so the tap always lands somewhere even if the coaching workspace
  // asks to be unlocked and the person changes their mind.
  show("area");
  renderAreaHome();
  if (areaIsCoaching(key) && canEditClientRecords()) openCoachDestination("dashboard");
}

function leaveWorkArea() {
  try { localStorage.removeItem(WORK_AREA_ACTIVE_KEY); } catch (_) { /* nothing to undo */ }
  show("home");
  renderHomeChoices();
}

function areaToolChips(key) {
  const chips = ["Clock", "Tasks", "Schedule"];
  if (areaIsCoaching(key) && canEditClientRecords()) chips.unshift("Clients", "Programming");
  if (areaHasEvents(key)) chips.push("Lessons");
  return chips;
}

function areaTileHtml(key) {
  const name = workAreaName(key), coaching = areaIsCoaching(key);
  return '<button class="tool-card role-card area-card' + (coaching ? ' is-coaching' : '') + '" onclick="enterWorkArea(\'' + escapeHtml(key) + '\')">'
    + (typeof areaSceneSvg === "function" ? areaSceneSvg(key, name) : '')
    + '<span class="tc-tag">' + (coaching ? "Coaching" : "Shift") + '</span>'
    + '<div class="tc-icon" aria-hidden="true">' + (typeof areaGlyphSvg === "function" ? areaGlyphSvg(key, name) : '') + '</div>'
    + '<div class="tc-title">' + escapeHtml(name) + '</div>'
    + '<div class="tc-chips">' + areaToolChips(key).map((chip) => '<span>' + escapeHtml(chip) + '</span>').join('') + '</div>'
    + '<span class="role-action">Start here →</span></button>';
}

/* Grouped so the rows come out full instead of one card stranded on its own line.
   Three across reads best, so the count drops only when three would leave a widow. */
function areaGridColumns(count) {
  if (count <= 3) return Math.max(1, count);
  for (const cols of [3, 2, 4]) {
    const last = count % cols;
    if (last === 0 || (cols >= 3 && last >= cols - 1)) return cols;
  }
  return 3;
}

function areaGroupHtml(label, keys) {
  if (!keys.length) return '';
  const cols = areaGridColumns(keys.length);
  return '<div class="area-group">'
    + '<div class="area-group-label">' + escapeHtml(label) + '<span>' + keys.length + '</span></div>'
    + '<div class="area-group-grid" style="grid-template-columns:repeat(' + cols + ',minmax(0,1fr));max-width:' + (cols * 354) + 'px">'
    + keys.map(areaTileHtml).join('') + '</div></div>';
}

/* Rebuilt on every visit home, because who you are and where you can work both change.
   The areas are the whole question now; the coaching workspace and the client view are
   places you reach from an area, not a fork in the road before it. */
function renderHomeChoices() {
  const grid = byId("roleChoiceGrid");
  if (!grid) return;
  if (window.fit4lifeWorkAreasAvailable === false) return;
  const mine = myWorkAreas(), owner = isFit4LifeOwner(), heading = byId("roleHeroCopy"), path = byId("roleLevelPath");
  const areasExist = (window.fit4lifeWorkAreas || []).length > 0;
  if (!mine.length && !(owner && !areasExist)) return;
  if (path) path.innerHTML = '<span class="active">1 · Where are you</span><i>›</i><span>2 · Choose task</span><i>›</i><span>3 · Do the work</span>';
  if (heading) heading.innerHTML = '<h1>Where are you<br><span class="grad-text">working today?</span></h1>'
    + '<p>' + (mine.length ? "Pick where you are. Your clock, your schedule and your tasks follow that choice."
      : "Set up your areas and everyone can pick where they are working.") + '</p>';
  if (mine.length) {
    grid.className = "area-group-stack";
    grid.innerHTML = areaGroupHtml("Coaching floors", mine.filter(areaIsCoaching))
      + areaGroupHtml("Shift areas", mine.filter((key) => !areaIsCoaching(key)));
  } else {
    grid.className = "role-choice-grid";
    grid.innerHTML = '<button class="tool-card role-card primary" onclick="openCoachDestination(\'areas\')">'
      + '<span class="tc-tag">First run</span>'
      + '<div class="tc-icon" aria-hidden="true">' + (typeof areaGlyphSvg === "function" ? areaGlyphSvg("default", "") : '') + '</div>'
      + '<div class="tc-title">Set up your areas</div><div class="tc-desc">Maintenance, I-Center, Equipment Center, Pool and Gym — then invite people into them.</div>'
      + '<span class="role-action">Open areas &amp; people →</span></button>';
  }
  renderHomeSideDoors(owner);
}

/* The client view is a thing an owner checks, not one of the ways in. */
function renderHomeSideDoors(owner) {
  const grid = byId("roleChoiceGrid");
  if (!grid || !grid.parentNode) return;
  let doors = byId("homeSideDoors");
  if (!owner) { if (doors) doors.remove(); return; }
  if (!doors) {
    doors = document.createElement("div");
    doors.id = "homeSideDoors";
    doors.className = "home-side-doors";
    grid.parentNode.insertBefore(doors, grid.nextSibling);
  }
  doors.innerHTML = '<span>Owner:</span>'
    + '<button class="small-btn" onclick="openCoachDestination(\'dashboard\')">Coaching workspace</button>'
    + '<button class="small-btn" onclick="selectPortalRole(\'client\')">See the client view</button>'
    + '<button class="small-btn" onclick="openCoachDestination(\'areas\')">Areas &amp; people</button>';
}

function renderAreaHome() {
  const out = byId("areaHomeContent"), key = activeWorkArea();
  if (!out) return;
  if (!key) { show("home"); renderHomeChoices(); return; }
  const title = byId("areaHomeTitle"), copy = byId("areaHomeCopy"), levelOne = byId("areaLevelOne");
  if (title) title.textContent = workAreaName(key);
  if (levelOne) levelOne.textContent = "1 · " + workAreaName(key);
  if (copy) copy.textContent = areaIsCoaching(key) ? "Coaching happens here, alongside the shift." : "Your shift here.";

  const cards = [];
  if (areaIsCoaching(key) && canEditClientRecords()) {
    cards.push('<section class="coach-module-card"><h3>Coaching</h3><p>Clients, programming and the floor.</p>'
      + '<div class="tool-actions"><button class="small-btn primary" onclick="openCoachDestination(\'dashboard\')">Coaching workspace</button>'
      + '<button class="small-btn" onclick="openBuilder()">Build a workout</button>'
      + (isFit4LifeOwner() ? '<button class="small-btn" onclick="openCoachDestination(\'audits\')">Trainer audits</button>' : '') + '</div></section>');
  }
  if (window.fit4lifeAreaToolsAvailable === false) {
    cards.push('<section class="coach-module-card" style="grid-column:1/-1"><h3>Clock and schedule not set up</h3>'
      + '<p>Run RUN-THIS-IN-SUPABASE-AREA-TOOLS.sql in Supabase, then reload. Until then this area has no clock, schedule or device list.</p></section>');
  } else {
    cards.push(areaClockCardHtml(key));
    cards.push(areaTodayCardHtml(key));
    if (typeof areaTasksCardHtml === "function") cards.push(areaTasksCardHtml(key));
    cards.push(areaScheduleCardHtml(key));
    if (areaHasEvents(key) && typeof areaEventsCardHtml === "function") cards.push(areaEventsCardHtml(key));
    if (isFit4LifeOwner()) {
      cards.push(areaHoursCardHtml());
      cards.push(areaDevicesCardHtml(key));
    }
  }
  out.innerHTML = cards.join("");
  if (typeof loadAreaTools === "function") loadAreaTools(key, false);
}

/* ---------- the sidebar, area by area ----------
   An area only shows its own tools. The client-facing ones — the calendar, messages, the
   action queue, clients, programming — belong to coaching, so the Equipment Center never
   sees them. */
const COACH_NAV_GROUPS = [
  ["This area", ["area-home"]],
  ["Coaching", ["dashboard", "actions", "clients", "programming", "team", "calendar", "messages", "library", "assessments", "reports"]],
  ["Managing", ["areas", "audits", "approvals", "access", "settings"]]
];
const COACHING_NAV_KEYS = COACH_NAV_GROUPS[1][1];

function ensureAreaHomeNav() {
  const bar = byId("coachSidebar");
  if (!bar || byId("areaHomeNav")) return;
  const first = bar.querySelector("[data-coach-nav]");
  if (!first) return;
  const button = document.createElement("button");
  button.id = "areaHomeNav";
  button.dataset.coachNav = "area-home";
  button.onclick = () => { show("area"); renderAreaHome(); };
  button.innerHTML = '<span class="nav-icon">◱</span><span class="nav-label">Area home</span>';
  first.parentNode.insertBefore(button, first);
}

function groupCoachSidebar() {
  const bar = byId("coachSidebar");
  if (!bar) return;
  ensureAreaHomeNav();
  const key = activeWorkArea();
  const coachingHere = (!key || areaIsCoaching(key)) && canEditClientRecords();
  const homeNav = byId("areaHomeNav");
  if (homeNav) {
    homeNav.hidden = !key;
    const label = homeNav.querySelector(".nav-label");
    if (label && key) label.textContent = workAreaName(key);
  }
  COACH_NAV_GROUPS.forEach(([label, keys]) => {
    const first = bar.querySelector('[data-coach-nav="' + keys[0] + '"]');
    if (!first) return;
    let heading = bar.querySelector('[data-nav-group="' + label + '"]');
    if (!heading) {
      heading = document.createElement("div");
      heading.className = "coach-nav-group";
      heading.dataset.navGroup = label;
      heading.textContent = label;
      first.parentNode.insertBefore(heading, first);
    }
    const shown = keys.filter((navKey) => {
      const button = bar.querySelector('[data-coach-nav="' + navKey + '"]');
      if (!button) return false;
      const hide = (COACHING_NAV_KEYS.includes(navKey) && !coachingHere) || (navKey === "area-home" && !key);
      button.hidden = hide;
      return !hide && !(button.hasAttribute("data-owner-only") && !isFit4LifeOwner());
    });
    heading.hidden = !shown.length;
  });
}

const legacyShowBeforeAreaHome = window.show;
window.show = function areaHomeShow(view) {
  const result = legacyShowBeforeAreaHome.apply(this, arguments);
  try {
    if (view === "home") renderHomeChoices();
    if (view === "area") renderAreaHome();
    groupCoachSidebar();
  } catch (_) { /* navigation must never be blocked by the trimmings */ }
  return result;
};
