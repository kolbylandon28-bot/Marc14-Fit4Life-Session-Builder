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
  return hasEveryArea(mine) ? workAreas().map((area) => area.area_key) : mine;
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
    await window.fit4lifeCloudSaveWorkArea(key, name, index, true, COACHING_DEFAULTS.includes(key));
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

function areaTileHtml(key) {
  const name = workAreaName(key), coaching = areaIsCoaching(key);
  return '<button class="tool-card role-card" onclick="enterWorkArea(\'' + escapeHtml(key) + '\')">'
    + '<span class="tc-tag">' + (coaching ? "Coaching" : "Shift") + '</span>'
    + '<div class="tc-icon" aria-hidden="true">' + (coaching ? "&#127947;" : "&#128337;") + '</div>'
    + '<div class="tc-title">' + escapeHtml(name) + '</div>'
    + '<div class="tc-desc">' + (coaching ? "Clients, programming and the floor." : "Your shift here: clock, schedule and tasks.") + '</div>'
    + '<span class="role-action">Start here →</span></button>';
}

/* Rebuilt on every visit home, because who you are and where you can work both change. */
function renderHomeChoices() {
  const grid = byId("roleChoiceGrid");
  if (!grid) return;
  const mine = myWorkAreas(), owner = isFit4LifeOwner();
  if (!mine.length) return;
  const heading = byId("roleHeroCopy"), path = byId("roleLevelPath");
  if (heading) heading.innerHTML = '<h1>Where are you<br><span class="grad-text">working today?</span></h1>'
    + '<p>' + (owner ? "Pick an area to work in, or open the coaching workspace. Your choice sets the clock, the schedule and the tasks you see."
      : "Pick where you are. Your clock, your schedule and your tasks follow that choice.") + '</p>';
  if (path) path.innerHTML = '<span class="active">1 · Where are you</span><i>›</i><span>2 · Choose task</span><i>›</i><span>3 · Do the work</span>';
  const tiles = mine.map(areaTileHtml);
  if (owner) tiles.push('<button class="tool-card role-card" onclick="selectPortalRole(\'client\')">'
    + '<span class="tc-tag">Owner preview</span><div class="tc-icon" aria-hidden="true">&#128100;</div>'
    + '<div class="tc-title">Client side</div><div class="tc-desc">See exactly what a client sees. Trainer accounts cannot enter this side.</div>'
    + '<span class="role-action">Open client workspace →</span></button>');
  grid.innerHTML = tiles.join("");
}

function renderAreaHome() {
  const out = byId("areaHomeContent"), key = activeWorkArea();
  if (!out) return;
  const title = byId("areaHomeTitle"), copy = byId("areaHomeCopy"), levelOne = byId("areaLevelOne");
  if (!key) { show("home"); renderHomeChoices(); return; }
  if (title) title.textContent = workAreaName(key);
  if (levelOne) levelOne.textContent = "1 · " + workAreaName(key);
  if (copy) copy.textContent = areaIsCoaching(key) ? "Coaching happens here, alongside the shift." : "Your shift here.";
  const card = (title, description, action, onclick, tag) => '<button class="tool-card' + (action ? "" : " disabled") + '"' + (onclick ? ' onclick="' + onclick + '"' : ' disabled') + '>'
    + (tag ? '<span class="tc-tag">' + tag + '</span>' : '') + '<div class="tc-title">' + title + '</div><span class="portal-note">' + description + '</span></button>';
  const tiles = [];
  if (areaIsCoaching(key) && canEditClientRecords()) {
    tiles.push(card("Coaching workspace", "Clients, programming, reports.", true, "openCoachDestination('dashboard')"));
    tiles.push(card("Build a workout", "Straight into the builder.", true, "openBuilder()"));
  }
  if (isFit4LifeOwner()) tiles.push(card("Areas &amp; people", "Who works here, and who is invited.", true, "openCoachDestination('areas')"));
  tiles.push(card("Clock in", "Coming next: clocking in and out on an approved device.", false, "", "Soon"));
  tiles.push(card("Who is working", "Coming next: the schedule for this area.", false, "", "Soon"));
  tiles.push(card("Tasks", "Coming next: what needs doing on this shift.", false, "", "Soon"));
  out.innerHTML = tiles.join("");
}

/* ---------- the sidebar, in three groups ---------- */
const COACH_NAV_GROUPS = [
  ["Work here", ["dashboard", "actions", "calendar", "messages"]],
  ["Coaching", ["clients", "programming", "team", "library", "assessments", "reports"]],
  ["Managing", ["areas", "audits", "approvals", "access", "settings"]]
];

function groupCoachSidebar() {
  const bar = byId("coachSidebar");
  if (!bar) return;
  const coachingHere = activeAreaIsCoaching() && canEditClientRecords();
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
    const shown = keys.filter((key) => {
      const button = bar.querySelector('[data-coach-nav="' + key + '"]');
      if (!button) return false;
      const coachingOnly = COACH_NAV_GROUPS[1][1].includes(key);
      const hide = coachingOnly && !coachingHere;
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
