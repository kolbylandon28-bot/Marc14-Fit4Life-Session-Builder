/* ---------- What lives inside an area ----------
   The clock, who is on today, the week's schedule, and for an owner the devices that are
   allowed to punch. Hours are wage records: the server stamps them, an auto-closed shift is
   marked estimated until someone confirms it, and every correction keeps what it replaced. */

const AREA_MAX_SHIFT_HOURS = 8;
let areaToolsState = { entries: [], shifts: [], tasks: [], events: [], loadedFor: "", busy: false };

const asDate = (value) => value ? new Date(value) : null;
const dayKey = (value) => { const date = asDate(value); return date ? date.toISOString().slice(0, 10) : ""; };
const clockTime = (value) => { const date = asDate(value); return date ? date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : ""; };
const dayLabel = (value) => { const date = asDate(value); return date ? date.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" }) : ""; };
const hoursBetween = (from, to) => { const start = asDate(from), end = asDate(to) || new Date(); return start ? Math.max(0, (end - start) / 3600000) : 0; };
const roundHours = (value) => Math.round(value * 100) / 100;
const weekStart = () => { const now = new Date(); now.setHours(0, 0, 0, 0); now.setDate(now.getDate() - ((now.getDay() + 6) % 7)); return now; };
const localInput = (date) => new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);

const myOpenEntry = () => (areaToolsState.entries || []).find((entry) => !entry.clock_out && entry.user_id === (window.fit4lifeCloudIdentity || {}).id) || null;
const peopleName = (userId) => {
  const person = (window.fit4lifeCloudTrainers || []).find((row) => row.user_id === userId);
  return person ? (person.display_name || person.email || "Staff") : (userId === (window.fit4lifeCloudIdentity || {}).id ? "You" : "Staff");
};

async function loadAreaTools(areaKey, force) {
  if (!areaKey || typeof window.fit4lifeCloudListTimeEntries !== "function") return;
  if (areaToolsState.loadedFor === areaKey && !force) return;
  areaToolsState.loadedFor = areaKey;
  const from = dayKey(weekStart()), to = dayKey(new Date(Date.now() + 13 * 86400000));
  const wantsEvents = typeof areaHasEvents === "function" && areaHasEvents(areaKey);
  const [entries, shifts, tasks, events] = await Promise.all([
    window.fit4lifeCloudListTimeEntries(from, to),
    window.fit4lifeCloudListShifts(areaKey, from, to),
    typeof window.fit4lifeCloudListAreaTasks === "function" ? window.fit4lifeCloudListAreaTasks(areaKey, dayKey(new Date())) : [],
    wantsEvents && typeof window.fit4lifeCloudListAreaEvents === "function" ? window.fit4lifeCloudListAreaEvents(areaKey, from, to) : []
  ]);
  areaToolsState.entries = entries || [];
  areaToolsState.shifts = shifts || [];
  areaToolsState.tasks = tasks || [];
  areaToolsState.events = events || [];
  if (typeof window.fit4lifeCloudRegisterDevice === "function") await window.fit4lifeCloudRegisterDevice();
  if (isFit4LifeOwner() && typeof window.fit4lifeCloudListDevices === "function") await window.fit4lifeCloudListDevices();
  renderAreaHome();
}

/* ---------- the clock ---------- */
function areaClockCardHtml(areaKey) {
  const open = myOpenEntry(), device = (window.fit4lifeDevices || []).find((row) => row.device_id === window.fit4lifeDeviceId());
  const approved = device && device.approved_at && !device.revoked_at;
  const mine = (areaToolsState.entries || []).filter((entry) => entry.user_id === (window.fit4lifeCloudIdentity || {}).id);
  const weekHours = roundHours(mine.filter((entry) => asDate(entry.clock_in) >= weekStart()).reduce((sum, entry) => sum + hoursBetween(entry.clock_in, entry.clock_out), 0));
  const status = open
    ? '<p><b>Clocked in</b> at ' + escapeHtml(clockTime(open.clock_in)) + ' · ' + roundHours(hoursBetween(open.clock_in, null)).toFixed(2) + ' hours so far</p>'
    : '<p>Not clocked in.</p>';
  const deviceNote = approved ? '' : '<p class="storage-note">This device is not approved for clocking in yet. An owner approves it under Devices below.</p>';
  const button = open
    ? '<button class="small-btn primary" onclick="clockOutHere()">Clock out</button>'
    : '<button class="small-btn primary" ' + (approved ? '' : 'disabled ') + 'onclick="clockInHere(\'' + escapeHtml(areaKey) + '\')">Clock in</button>';
  return '<section class="coach-module-card"><h3>Your clock</h3>' + status
    + '<p class="storage-note">' + weekHours.toFixed(2) + ' hours this week in all areas.</p>'
    + deviceNote + '<div class="tool-actions">' + button + '</div></section>';
}

async function clockInHere(areaKey) {
  if (areaToolsState.busy) return;
  areaToolsState.busy = true;
  const result = await window.fit4lifeCloudClockIn(areaKey);
  areaToolsState.busy = false;
  if (!result || !result.ok) { showToast((result && result.error) || "Could not clock in"); return; }
  showToast("Clocked in at " + clockTime(result.clock_in));
  await loadAreaTools(areaKey, true);
}

async function clockOutHere() {
  if (areaToolsState.busy) return;
  areaToolsState.busy = true;
  const result = await window.fit4lifeCloudClockOut("");
  areaToolsState.busy = false;
  if (!result || !result.ok) { showToast((result && result.error) || "Could not clock out"); return; }
  showToast("Clocked out at " + clockTime(result.clock_out));
  await loadAreaTools(activeWorkArea(), true);
}

/* ---------- who is on ---------- */
function areaTodayCardHtml(areaKey) {
  const today = dayKey(new Date());
  const shifts = (areaToolsState.shifts || []).filter((shift) => dayKey(shift.starts_at) === today);
  const onNow = (areaToolsState.entries || []).filter((entry) => !entry.clock_out && entry.area_key === areaKey);
  const rows = shifts.length ? shifts.map((shift) => {
    const name = shift.staff_name || peopleName(shift.user_id);
    const here = onNow.some((entry) => entry.user_id === shift.user_id);
    return '<div class="trainer-account-row"><div><b>' + escapeHtml(name) + '</b><span>' + escapeHtml(clockTime(shift.starts_at)) + ' – ' + escapeHtml(clockTime(shift.ends_at)) + (shift.note ? ' · ' + escapeHtml(shift.note) : '') + '</span></div>'
      + '<div class="tool-actions"><span class="pill' + (here ? '' : ' warn') + '">' + (here ? 'clocked in' : 'not in yet') + '</span></div></div>';
  }).join('') : '<div class="empty-state">Nobody is scheduled here today.</div>';
  const extra = onNow.filter((entry) => !shifts.some((shift) => shift.user_id === entry.user_id));
  const unscheduled = extra.length ? '<p class="storage-note">Also clocked in: ' + extra.map((entry) => escapeHtml(peopleName(entry.user_id))).join(", ") + '</p>' : '';
  return '<section class="coach-module-card"><h3>Here today</h3><div class="advanced-list">' + rows + '</div>' + unscheduled + '</section>';
}

/* ---------- the week ---------- */
function areaScheduleCardHtml(areaKey) {
  const shifts = (areaToolsState.shifts || []).slice().sort((a, b) => String(a.starts_at).localeCompare(String(b.starts_at)));
  const byDay = new Map();
  shifts.forEach((shift) => {
    const key = dayKey(shift.starts_at);
    if (!byDay.has(key)) byDay.set(key, []);
    byDay.get(key).push(shift);
  });
  const owner = isFit4LifeOwner();
  const days = [...byDay.entries()].map(([key, list]) => '<div class="trainer-account-row"><div><b>' + escapeHtml(dayLabel(key)) + '</b><span>'
    + list.map((shift) => escapeHtml((shift.staff_name || peopleName(shift.user_id)) + " " + clockTime(shift.starts_at) + "–" + clockTime(shift.ends_at))).join(" · ") + '</span></div>'
    + (owner ? '<div class="tool-actions">' + list.map((shift) => '<button class="small-btn" onclick="removeShift(\'' + shift.id + '\')">Remove ' + escapeHtml((shift.staff_name || peopleName(shift.user_id)).split(" ")[0]) + '</button>').join('') + '</div>' : '') + '</div>').join('');
  const add = owner ? '<div class="compact-grid" style="margin-top:12px">'
    + '<div class="compact-field"><label for="shiftPerson">Who</label><select id="shiftPerson">'
    + (window.fit4lifeCloudTrainers || []).map((person) => '<option value="' + escapeHtml(person.user_id) + '">' + escapeHtml(person.display_name || person.email) + '</option>').join('')
    + '</select></div>'
    + '<div class="compact-field"><label for="shiftStart">Starts</label><input id="shiftStart" type="datetime-local" value="' + localInput(new Date(Date.now() + 86400000)) + '"></div>'
    + '<div class="compact-field"><label for="shiftEnd">Ends</label><input id="shiftEnd" type="datetime-local" value="' + localInput(new Date(Date.now() + 86400000 + 4 * 3600000)) + '"></div>'
    + '<div class="compact-field"><label for="shiftNote">Note</label><input id="shiftNote" placeholder="Front desk"></div></div>'
    + '<div class="tool-actions"><button class="small-btn primary" onclick="addShift(\'' + escapeHtml(areaKey) + '\')">Add shift</button></div>' : '';
  return '<section class="coach-module-card" style="grid-column:1/-1"><h3>Who is working</h3>'
    + (days ? '<div class="advanced-list">' + days + '</div>' : '<div class="empty-state">Nothing scheduled in the next two weeks.</div>') + add + '</section>';
}

async function addShift(areaKey) {
  const person = byId("shiftPerson"), starts = byId("shiftStart"), ends = byId("shiftEnd"), note = byId("shiftNote");
  if (!person || !starts || !ends) return;
  if (!starts.value || !ends.value) { showToast("Pick a start and an end"); return; }
  const label = person.options[person.selectedIndex] ? person.options[person.selectedIndex].textContent : "";
  const result = await window.fit4lifeCloudSaveShift(areaKey, person.value, label, new Date(starts.value).toISOString(), new Date(ends.value).toISOString(), note ? note.value : "", null);
  if (!result || !result.ok) { showToast((result && result.error) || "That shift could not be saved"); return; }
  showToast("Shift added");
  await loadAreaTools(areaKey, true);
}

async function removeShift(shiftId) {
  if (!window.confirm("Remove this shift?")) return;
  await window.fit4lifeCloudDeleteShift(shiftId);
  await loadAreaTools(activeWorkArea(), true);
}

/* ---------- owner: hours and devices ---------- */
function areaHoursCardHtml() {
  const entries = (areaToolsState.entries || []).slice(0, 40);
  const needsConfirming = entries.filter((entry) => entry.estimated && !entry.confirmed_at);
  const rows = entries.length ? entries.map((entry) => '<div class="trainer-account-row' + (entry.estimated && !entry.confirmed_at ? ' warn' : '') + '"><div><b>' + escapeHtml(peopleName(entry.user_id)) + '</b><span>'
    + escapeHtml(dayLabel(entry.clock_in)) + ' · ' + escapeHtml(clockTime(entry.clock_in)) + '–' + (entry.clock_out ? escapeHtml(clockTime(entry.clock_out)) : 'still in')
    + ' · ' + roundHours(hoursBetween(entry.clock_in, entry.clock_out)).toFixed(2) + ' h · ' + escapeHtml(workAreaName(entry.area_key))
    + (entry.estimated && !entry.confirmed_at ? ' · estimated, needs confirming' : '') + '</span></div>'
    + (entry.estimated && !entry.confirmed_at ? '<div class="tool-actions"><button class="small-btn" onclick="confirmEntry(\'' + entry.id + '\')">Confirm</button></div>' : '') + '</div>').join('')
    : '<div class="empty-state">No hours yet.</div>';
  return '<section class="coach-module-card" style="grid-column:1/-1"><h3>Hours</h3>'
    + (needsConfirming.length ? '<p class="storage-note">' + needsConfirming.length + ' auto-closed shift' + (needsConfirming.length === 1 ? '' : 's') + ' waiting on you. An estimate never counts as confirmed.</p>' : '')
    + '<div class="advanced-list">' + rows + '</div>'
    + '<div class="tool-actions"><button class="small-btn" onclick="exportAreaHours()">Export CSV</button>'
    + '<button class="small-btn" onclick="closeForgottenShifts()">Close forgotten shifts</button></div></section>';
}

async function confirmEntry(entryId) {
  await window.fit4lifeCloudConfirmTimeEntry(entryId, null, null);
  await loadAreaTools(activeWorkArea(), true);
  showToast("Confirmed");
}

async function closeForgottenShifts() {
  const closed = await window.fit4lifeCloudCloseOpenEntries(AREA_MAX_SHIFT_HOURS);
  await loadAreaTools(activeWorkArea(), true);
  showToast(closed ? closed + " left open and now estimated — confirm each one" : "Nothing was left open");
}

function exportAreaHours() {
  const rows = [["Person", "Area", "Day", "In", "Out", "Hours", "Estimated", "Confirmed", "Note"]].concat((areaToolsState.entries || []).map((entry) => [
    peopleName(entry.user_id), workAreaName(entry.area_key), dayKey(entry.clock_in), clockTime(entry.clock_in),
    entry.clock_out ? clockTime(entry.clock_out) : "", roundHours(hoursBetween(entry.clock_in, entry.clock_out)).toFixed(2),
    entry.estimated ? "yes" : "", entry.confirmed_at ? "yes" : "", entry.note || ""
  ]));
  downloadTextFile("fit4life-hours.csv", rows.map((row) => row.map(csvCell).join(",")).join("\n"), "text/csv");
}

function areaDevicesCardHtml(areaKey) {
  const devices = window.fit4lifeDevices || [];
  const rows = devices.length ? devices.map((device) => {
    const approved = device.approved_at && !device.revoked_at;
    return '<div class="trainer-account-row"><div><b>' + escapeHtml(device.name || device.device_id.slice(0, 12)) + '</b><span>'
      + (approved ? 'approved' : 'not approved') + (device.area_key ? ' · ' + escapeHtml(workAreaName(device.area_key)) : '')
      + (device.last_seen_at ? ' · last seen ' + escapeHtml(dayLabel(device.last_seen_at)) : '')
      + (device.device_id === window.fit4lifeDeviceId() ? ' · this device' : '') + '</span></div>'
      + '<div class="tool-actions"><button class="small-btn' + (approved ? '' : ' primary') + '" onclick="setDeviceApproval(\'' + escapeHtml(device.device_id) + '\',\'' + escapeHtml(areaKey) + '\',' + (approved ? 'false' : 'true') + ')">'
      + (approved ? 'Revoke' : 'Approve') + '</button></div></div>';
  }).join('') : '<div class="empty-state">No devices have asked yet. Open the app on the desk computer once and it appears here.</div>';
  return '<section class="coach-module-card" style="grid-column:1/-1"><h3>Devices that may clock in</h3>'
    + '<p class="storage-note">Only approved devices can punch. Anyone sitting at an approved desk can use it, so pair this with knowing who is on shift.</p>'
    + '<div class="advanced-list">' + rows + '</div></section>';
}

async function setDeviceApproval(device, areaKey, approve) {
  const existing = (window.fit4lifeDevices || []).find((row) => row.device_id === device);
  await window.fit4lifeCloudSetDevice(device, existing ? existing.name : "", areaKey, approve);
  await window.fit4lifeCloudListDevices();
  renderAreaHome();
  showToast(approve ? "Device approved" : "Device revoked");
}

/* ---------- the task list ----------
   One list per area. An owner writes it, anyone working in the area ticks it off, and a
   repeating task is ticked per day so yesterday's tick does not hide today's job. */
const TASK_REPEATS = [["once", "One off"], ["daily", "Every day"], ["weekly", "Every week"]];
const repeatLabel = (value) => (TASK_REPEATS.find((row) => row[0] === value) || TASK_REPEATS[0])[1];
const todayKey = () => dayKey(new Date());

function taskIsDue(task, onDay) {
  if (task.repeats === "daily") return true;
  if (task.repeats === "weekly") {
    if (!task.due_on) return true;
    const due = asDate(task.due_on), day = asDate(onDay);
    return !due || !day || due.getUTCDay() === day.getUTCDay();
  }
  return !task.due_on || dayKey(task.due_on) <= onDay;
}

const taskIsDone = (task) => Boolean(task.done_on);

function areaTasksCardHtml(areaKey) {
  const day = todayKey();
  const all = (areaToolsState.tasks || []).filter((task) => task.area_key === areaKey);
  const due = all.filter((task) => taskIsDue(task, day));
  const done = due.filter(taskIsDone).length;
  const owner = isFit4LifeOwner();
  const mine = (window.fit4lifeCloudIdentity || {}).id;

  const rows = due.length ? due.map((task) => {
    const finished = taskIsDone(task);
    const forWho = task.assigned_to ? (task.assigned_to === mine ? "You" : (task.assigned_name || peopleName(task.assigned_to))) : "Anyone on shift";
    return '<div class="trainer-account-row' + (finished ? ' ok' : '') + '"><div><b>' + (finished ? '&#10003; ' : '') + escapeHtml(task.title) + '</b><span>'
      + escapeHtml(repeatLabel(task.repeats)) + ' · ' + escapeHtml(forWho)
      + (task.due_on && task.repeats === "once" ? ' · due ' + escapeHtml(dayLabel(task.due_on)) : '')
      + (finished ? ' · done by ' + escapeHtml(peopleName(task.done_by)) + ' at ' + escapeHtml(clockTime(task.done_at)) : '')
      + (task.detail ? '<br>' + escapeHtml(task.detail) : '') + '</span></div>'
      + '<div class="tool-actions"><button class="small-btn' + (finished ? '' : ' primary') + '" onclick="setTaskDone(\'' + task.id + '\',' + (finished ? 'false' : 'true') + ')">'
      + (finished ? 'Undo' : 'Mark done') + '</button>'
      + (owner ? '<button class="small-btn" onclick="removeAreaTask(\'' + task.id + '\')">Remove</button>' : '') + '</div></div>';
  }).join('') : '<div class="empty-state">Nothing on the list for today.</div>';

  const add = owner ? '<div class="compact-grid" style="margin-top:12px">'
    + '<div class="compact-field"><label for="taskTitle">Task</label><input id="taskTitle" placeholder="Wipe down the squat racks"></div>'
    + '<div class="compact-field"><label for="taskRepeats">How often</label><select id="taskRepeats">'
    + TASK_REPEATS.map((row) => '<option value="' + row[0] + '">' + row[1] + '</option>').join('') + '</select></div>'
    + '<div class="compact-field"><label for="taskDue">Day</label><input id="taskDue" type="date"></div>'
    + '<div class="compact-field"><label for="taskPerson">Who</label><select id="taskPerson"><option value="">Anyone on shift</option>'
    + (window.fit4lifeCloudTrainers || []).map((person) => '<option value="' + escapeHtml(person.user_id) + '">' + escapeHtml(person.display_name || person.email) + '</option>').join('')
    + '</select></div>'
    + '<div class="compact-field" style="grid-column:1/-1"><label for="taskDetail">How it is done</label><input id="taskDetail" placeholder="Spray, wipe, check the pins"></div></div>'
    + '<div class="tool-actions"><button class="small-btn primary" onclick="addAreaTask(\'' + escapeHtml(areaKey) + '\')">Add task</button></div>' : '';

  return '<section class="coach-module-card" style="grid-column:1/-1"><h3>Tasks</h3>'
    + '<p class="storage-note">' + (due.length ? escapeHtml(done + " of " + due.length + " done today") : "Nothing due today")
    + (all.length > due.length ? ' · ' + escapeHtml((all.length - due.length) + " not due today") : '') + '</p>'
    + '<div class="advanced-list">' + rows + '</div>' + add + '</section>';
}

async function setTaskDone(taskId, done) {
  const result = await window.fit4lifeCloudCompleteAreaTask(taskId, todayKey(), done, "");
  if (!result || !result.ok) { showToast((result && result.error) || "That could not be saved"); return; }
  await loadAreaTools(activeWorkArea(), true);
  showToast(done ? "Ticked off" : "Put back on the list");
}

async function addAreaTask(areaKey) {
  const title = byId("taskTitle"), detail = byId("taskDetail"), repeats = byId("taskRepeats"), due = byId("taskDue"), person = byId("taskPerson");
  if (!title || !title.value.trim()) { showToast("Give the task a name"); return; }
  const label = person && person.value && person.options[person.selectedIndex] ? person.options[person.selectedIndex].textContent : "";
  const result = await window.fit4lifeCloudSaveAreaTask(areaKey, title.value.trim(), detail ? detail.value : "",
    repeats ? repeats.value : "once", due && due.value ? due.value : null, person ? person.value : "", label,
    (areaToolsState.tasks || []).length, null);
  if (!result || !result.ok) { showToast((result && result.error) || "That task could not be saved"); return; }
  showToast("Task added");
  await loadAreaTools(areaKey, true);
}

async function removeAreaTask(taskId) {
  if (!window.confirm("Take this off the list?")) return;
  await window.fit4lifeCloudDeleteAreaTask(taskId);
  await loadAreaTools(activeWorkArea(), true);
}

/* ---------- lessons, clinics and trainings ----------
   Only areas that run them get this card, so the Equipment Center is not asked about swim
   lessons. An owner sets the calendar; everyone working there reads it. */
const EVENT_KINDS = [["lesson", "Lesson"], ["clinic", "Clinic"], ["training", "Staff training"], ["event", "Event"], ["closure", "Closed"]];
const eventKindLabel = (value) => (EVENT_KINDS.find((row) => row[0] === value) || EVENT_KINDS[3])[1];

function areaEventsCardHtml(areaKey) {
  const events = (areaToolsState.events || []).filter((row) => row.area_key === areaKey)
    .slice().sort((a, b) => String(a.starts_at).localeCompare(String(b.starts_at)));
  const owner = isFit4LifeOwner();
  const byDay = new Map();
  events.forEach((row) => {
    const key = dayKey(row.starts_at);
    if (!byDay.has(key)) byDay.set(key, []);
    byDay.get(key).push(row);
  });
  const days = [...byDay.entries()].map(([key, list]) => '<div class="advanced-subhead">' + escapeHtml(dayLabel(key)) + '</div>'
    + list.map((row) => '<div class="trainer-account-row"><div><b>' + escapeHtml(eventKindLabel(row.kind) + ": " + row.title) + '</b><span>'
      + escapeHtml(clockTime(row.starts_at) + "–" + clockTime(row.ends_at)
        + (row.location ? " · " + row.location : "")
        + (row.lead_name || row.lead_user_id ? " · " + (row.lead_name || peopleName(row.lead_user_id)) : "")
        + (row.capacity ? " · " + row.capacity + " spots" : "")) + '</span></div>'
      + (owner ? '<div class="tool-actions"><button class="small-btn" onclick="removeAreaEvent(\'' + row.id + '\')">Remove</button></div>' : '') + '</div>').join('')).join('');

  const add = owner ? '<div class="compact-grid" style="margin-top:12px">'
    + '<div class="compact-field"><label for="eventTitle">What</label><input id="eventTitle" placeholder="Beginner swim lesson"></div>'
    + '<div class="compact-field"><label for="eventKind">Kind</label><select id="eventKind">'
    + EVENT_KINDS.map((row) => '<option value="' + row[0] + '">' + row[1] + '</option>').join('') + '</select></div>'
    + '<div class="compact-field"><label for="eventStart">Starts</label><input id="eventStart" type="datetime-local" value="' + localInput(new Date(Date.now() + 86400000)) + '"></div>'
    + '<div class="compact-field"><label for="eventEnd">Ends</label><input id="eventEnd" type="datetime-local" value="' + localInput(new Date(Date.now() + 86400000 + 3600000)) + '"></div>'
    + '<div class="compact-field"><label for="eventWhere">Where</label><input id="eventWhere" placeholder="Lap lanes 1–3"></div>'
    + '<div class="compact-field"><label for="eventSpots">Spots</label><input id="eventSpots" type="number" min="1" placeholder="12"></div>'
    + '<div class="compact-field"><label for="eventLead">Who runs it</label><select id="eventLead"><option value="">Not set</option>'
    + (window.fit4lifeCloudTrainers || []).map((person) => '<option value="' + escapeHtml(person.user_id) + '">' + escapeHtml(person.display_name || person.email) + '</option>').join('')
    + '</select></div></div>'
    + '<div class="tool-actions"><button class="small-btn primary" onclick="addAreaEvent(\'' + escapeHtml(areaKey) + '\')">Add to the calendar</button></div>' : '';

  return '<section class="coach-module-card" style="grid-column:1/-1"><h3>Lessons, clinics and trainings</h3>'
    + (days ? '<div class="advanced-list">' + days + '</div>' : '<div class="empty-state">Nothing booked in the next two weeks.</div>') + add + '</section>';
}

async function addAreaEvent(areaKey) {
  const title = byId("eventTitle"), kind = byId("eventKind"), starts = byId("eventStart"), ends = byId("eventEnd");
  const where = byId("eventWhere"), spots = byId("eventSpots"), lead = byId("eventLead");
  if (!title || !title.value.trim()) { showToast("Give it a name"); return; }
  if (!starts || !ends || !starts.value || !ends.value) { showToast("Pick a start and an end"); return; }
  const label = lead && lead.value && lead.options[lead.selectedIndex] ? lead.options[lead.selectedIndex].textContent : "";
  const result = await window.fit4lifeCloudSaveAreaEvent(areaKey, title.value.trim(), kind ? kind.value : "event",
    new Date(starts.value).toISOString(), new Date(ends.value).toISOString(), where ? where.value : "",
    spots ? spots.value : "", lead ? lead.value : "", label, "", null);
  if (!result || !result.ok) { showToast((result && result.error) || "That could not be saved"); return; }
  showToast("On the calendar");
  await loadAreaTools(areaKey, true);
}

async function removeAreaEvent(eventId) {
  if (!window.confirm("Take this off the calendar?")) return;
  await window.fit4lifeCloudDeleteAreaEvent(eventId);
  await loadAreaTools(activeWorkArea(), true);
}
