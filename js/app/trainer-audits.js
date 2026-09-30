/* ---------- Trainer audits (owner only) ----------
   A manager watches a session, rates six areas 1-5 against what NASM and NSCA publish,
   records evidence before each rating, and ticks a separate safety block. Audits live in
   their own owner-only Supabase table, never in the shared organization snapshot, because
   every trainer's device can read that snapshot. */

const TRAINER_AUDITS_KEY = "fit4life_trainer_audits_v1";
const AUDIT_TRAINERS_KEY = "fit4life_audit_trainers_v1";

const AUDIT_SCALE = [
  [1, "I stepped in", "The client was at risk, or was being taught something wrong, and I had to say something."],
  [2, "I would have stepped in", "Nothing happened because I was standing there, but it needed correcting."],
  [3, "Basic cues only", "Nothing unsafe. I would have added something that mattered."],
  [4, "Coached it", "Nothing I would have changed in the moment."],
  [5, "Coached it and could teach it", "What I would show a new trainer."]
];

/* Weights follow the published exam blueprints: NASM Exercise Technique and Training
   Instruction is 24% and NSCA Program Execution is 36%, the heaviest domain in each. */
const AUDIT_AREAS = [
  { key:"technique", weight:30, title:"Technique instruction and correction", source:"NASM Domain 5 (24%) · NSCA Program Execution (36%)",
    look:["Demonstrated the movement, not just described it","Watched the working set from where they could see it","Corrected during the set, not only after","Cued breathing on loaded work","Regressed what the client could not do cleanly, progressed what they owned, and said why","Set the equipment up for this client's body"] },
  { key:"supervision", weight:20, title:"Supervision and spotting", source:"NSCA Professional Standards 3.1 and 3.2",
    look:["Within reach and in line of sight while the client was under load","Attentive spot on anything held over the trunk or head","Pins set, collars on","Rep count or a say-when agreed before the set","Phone away, attention on the client","Did not leave the floor mid-session without a handoff"] },
  { key:"structure", weight:20, title:"Session and program structure", source:"NSCA Program Planning (29%) · NASM Program Design (20%)",
    look:["Followed a written program rather than improvising","Exercise order made sense for the goal","Rest was managed, not left to drift","Tempo or effort target given where it mattered","Adjusted the plan from what they saw in front of them"] },
  { key:"fit", weight:10, title:"Fit to this client", source:"NASM Assessment (16%) · NSCA Client Consultation and Assessment (23%)",
    look:["Session matched the client's stated goals","Anything flagged on their health screen showed up as a modification","Referred back to an assessment result","A reassessment date exists"] },
  { key:"manner", weight:10, title:"Client manner", source:"NASM Client Relations and Behavioral Coaching (15%)",
    look:["Greeted by name and picked up from last session","Asked open questions and let the client finish","Energy matched the client rather than flat or performative","Checked sleep, stress or soreness, not only today's sets","Was honest about what the client can expect"] },
  { key:"professionalism", weight:10, title:"Professionalism and scope", source:"NASM Domain 6 (10%) · NSCA Safety, Emergency and Legal (12%)",
    look:["Stayed out of diagnosing, treating pain, meal plans and supplements","Named a referral where one was warranted","Said before putting hands on, and the client agreed","Logged the session","Left the area and the equipment as they found it"] }
];

/* Kept apart from the scores on purpose: a tick here flags the audit whatever the total says.
   Short list by design - a long one turns into trap doors nobody trusts. */
const AUDIT_SAFETY = [
  ["spot","Free weight over the trunk or head with no attentive spot and no pins"],
  ["load","Load added while form was already breaking down"],
  ["signs","Pain, dizziness or breath-holding not responded to"],
  ["absent","Out of reach or out of line of sight during a loaded set, or on their phone"],
  ["scope","Out-of-scope advice: diagnosing, treating pain, meal plans, supplements"],
  ["flagged","Trained through a flagged condition with no modification"]
];

/* Floor conduct, logged in seconds while they are on shift rather than mid-session. */
const AUDIT_CHECK_ITEMS = [
  ["station","At the desk and on their feet"],
  ["greeted","Greeted people coming in"],
  ["phone","Phone away"],
  ["tidy","Area and equipment tidy"],
  ["uniform","In uniform"],
  ["rounds","Doing rounds or the daily challenge"]
];

/* One tap each. These are things you know rather than things you watch. */
const AUDIT_LOG_TYPES = [
  ["on_time","On time",true],
  ["late","Late",false],
  ["no_show","No-show",false],
  ["covered","Covered a shift",true],
  ["log_missing","Session log missing",false],
  ["notes_stale","Client notes out of date",false],
  ["message_unanswered","Message left unanswered",false]
];

const AUDIT_CERT_STATUS = [["none","Not started"],["in_progress","In progress"],["certified","Certified"]];
const AUDIT_CERT_BODIES = [["nasm","NASM"],["nsca","NSCA"],["acsm","ACSM"],["issa","ISSA"],["other","Other"]];
/* Owner only. Never emailed, never shown to a trainer. */
const AUDIT_GRADES = [["ready","Ready to promote"],["solid","Solid"],["developing","Developing"],["needs_work","Needs work"],["at_risk","At risk"]];

const AUDIT_KINDS = [
  ["developmental","Developmental","You can coach in the moment. The score is for tracking, not for record."],
  ["scored","Scored for record","Watch only. Step in for a safety risk and nothing else, then debrief afterwards."]
];
const AUDIT_SESSION_TYPES = [["one_to_one","One to one"],["small_group","Small group"],["assessment","Assessment or intake"],["other","Other"]];

let auditView = { tab:"audits", trainerKey:"", auditId:"", draft:null };
let auditFilters = { trainer:"", kind:"", from:"", to:"", flagged:false, follow:false, search:"" };

/* ---------- records ---------- */
/* One store holds audits, quick checks and log entries; type tells them apart. */
function loadAuditRecords() { return loadLocalArray(TRAINER_AUDITS_KEY); }
const auditRecordType = (row) => row.type || "audit";
function loadTrainerAudits() { return loadAuditRecords().filter((row) => auditRecordType(row) === "audit"); }
function loadTrainerChecks() { return loadAuditRecords().filter((row) => auditRecordType(row) === "check"); }
function loadTrainerLog() { return loadAuditRecords().filter((row) => auditRecordType(row) === "log"); }
function writeTrainerAudits(items) { return writeLocalArray(TRAINER_AUDITS_KEY, items, 4000); }
function loadAuditTrainers() { return loadLocalArray(AUDIT_TRAINERS_KEY); }
function writeAuditTrainers(items) { return writeLocalArray(AUDIT_TRAINERS_KEY, items, 400); }
const auditTrainerKey = (email) => String(email || "").trim().toLowerCase();
const auditNewId = (prefix) => prefix + "-" + Date.now() + "-" + Math.random().toString(16).slice(2);
const auditToday = () => new Date().toISOString().slice(0, 10);

function auditsForTrainer(key) {
  return loadTrainerAudits().filter((audit) => audit.trainerKey === key).sort((a, b) => String(b.date).localeCompare(String(a.date)));
}

// The hand-entered trainer stays the source of truth; an app account is attached when the
// email matches, so audits still work for staff who have never signed in.
function auditTrainerRoster() {
  const roster = window.fit4lifeCloudTrainers || [];
  return loadAuditTrainers().map((trainer) => {
    const match = roster.find((row) => auditTrainerKey(row.email) === trainer.key);
    return { ...trainer, userId: match ? match.user_id : trainer.userId || "", linked: Boolean(match), accountName: match ? match.display_name : "" };
  }).sort((a, b) => String(a.name).localeCompare(String(b.name)));
}

/* ---------- scoring ---------- */
// Areas marked "not observed" drop out of both sides of the sum instead of scoring zero.
function auditScore(audit) {
  let earned = 0, possible = 0;
  AUDIT_AREAS.forEach((area) => {
    const rating = audit.ratings && audit.ratings[area.key];
    const score = rating && Number(rating.score);
    if (!score) return;
    earned += area.weight * ((score - 1) / 4);
    possible += area.weight;
  });
  if (!possible) return null;
  return Math.round((earned / possible) * 100);
}
function auditFlags(audit) { return AUDIT_SAFETY.filter(([key]) => audit.safety && audit.safety[key] && audit.safety[key].checked).map(([key]) => key); }
function auditIsFlagged(audit) { return auditFlags(audit).length > 0; }
function auditRatedAreas(audit) { return AUDIT_AREAS.filter((area) => audit.ratings && audit.ratings[area.key] && Number(audit.ratings[area.key].score)); }

function auditAreaAverages(list) {
  const totals = {};
  AUDIT_AREAS.forEach((area) => {
    const scores = list.map((audit) => audit.ratings && audit.ratings[area.key] && Number(audit.ratings[area.key].score)).filter(Boolean);
    totals[area.key] = scores.length ? Math.round((scores.reduce((sum, value) => sum + value, 0) / scores.length) * 10) / 10 : null;
  });
  return totals;
}

function auditTrend(list) {
  const scored = list.slice().sort((a, b) => String(a.date).localeCompare(String(b.date))).map(auditScore).filter((value) => value != null);
  if (scored.length < 3) return null;
  const half = Math.floor(scored.length / 2), early = scored.slice(0, half), late = scored.slice(-half);
  const mean = (values) => values.reduce((sum, value) => sum + value, 0) / values.length;
  return Math.round(mean(late) - mean(early));
}

/* ---------- saving ---------- */
function saveTrainerAudit(audit) {
  const rows = loadAuditRecords(), index = rows.findIndex((row) => row.id === audit.id);
  if (index >= 0) rows[index] = audit; else rows.unshift(audit);
  if (!writeTrainerAudits(rows)) return false;
  if (typeof window.fit4lifeCloudSaveTrainerAudit === "function") window.fit4lifeCloudSaveTrainerAudit(audit);
  return true;
}

function saveAuditTrainer(name, email) {
  const cleanName = String(name || "").trim(), key = auditTrainerKey(email);
  if (!cleanName) { showToast("Give the trainer's name"); return null; }
  if (!key || key.indexOf("@") < 1) { showToast("Give the trainer's email — it is how audits stay attached to the right person"); return null; }
  const rows = loadAuditTrainers(), existing = rows.find((row) => row.key === key);
  const record = existing || { id:auditNewId("audit-trainer"), key, createdAt:new Date().toISOString(), active:true };
  record.name = cleanName; record.email = key; record.updatedAt = new Date().toISOString();
  if (!existing) rows.push(record);
  if (!writeAuditTrainers(rows)) return null;
  if (typeof window.fit4lifeCloudSaveAuditTrainer === "function") window.fit4lifeCloudSaveAuditTrainer(record);
  return record;
}

function removeAuditTrainer(key) {
  const audits = auditsForTrainer(key);
  if (audits.length) { showToast("That trainer has " + audits.length + " audit" + (audits.length === 1 ? "" : "s") + ". Delete those first if you really want them gone."); return; }
  if (!window.confirm("Remove this trainer from the audit list?")) return;
  writeAuditTrainers(loadAuditTrainers().filter((row) => row.key !== key));
  if (typeof window.fit4lifeCloudDeleteAuditTrainer === "function") window.fit4lifeCloudDeleteAuditTrainer(key);
  renderTrainerAuditsModule();
}

function deleteTrainerAudit(id) {
  if (!window.confirm("Delete this audit? It goes for every device and cannot be undone.")) return;
  writeTrainerAudits(loadAuditRecords().filter((audit) => audit.id !== id));
  if (typeof window.fit4lifeCloudDeleteTrainerAudit === "function") window.fit4lifeCloudDeleteTrainerAudit(id);
  auditView = { tab:"audits", trainerKey:auditView.trainerKey, auditId:"", draft:null };
  renderTrainerAuditsModule();
  showToast("Audit deleted");
}

function resolveAuditFollowUp(id) {
  const rows = loadAuditRecords(), audit = rows.find((row) => row.id === id);
  if (!audit || !audit.followUp) return;
  const identity = currentAccountIdentity();
  audit.followUp.resolvedAt = new Date().toISOString();
  audit.followUp.resolvedBy = identity.displayName;
  audit.updatedAt = audit.followUp.resolvedAt;
  if (!writeTrainerAudits(rows)) return;
  if (typeof window.fit4lifeCloudSaveTrainerAudit === "function") window.fit4lifeCloudSaveTrainerAudit(audit);
  renderTrainerAuditsModule();
  showToast("Follow-up closed");
}

/* ---------- sending it to the trainer ----------
   The app has no mail server of its own, so this hands a finished message to whatever mail
   app the owner uses. The audit is saved first either way. */
function auditEmailText(audit) {
  const lines = [];
  lines.push("Audit of your session on " + audit.date + (audit.kind === "scored" ? " (scored for record)" : " (developmental)"));
  lines.push("");
  const score = auditScore(audit);
  if (score != null) lines.push("Overall: " + score + "%" + (auditIsFlagged(audit) ? " — flagged, see safety below" : ""));
  lines.push("");
  AUDIT_AREAS.forEach((area) => {
    const rating = audit.ratings && audit.ratings[area.key];
    if (!rating || !Number(rating.score)) { lines.push(area.title + ": not observed"); return; }
    const anchor = AUDIT_SCALE.find((row) => row[0] === Number(rating.score));
    lines.push(area.title + ": " + rating.score + "/5 — " + (anchor ? anchor[1] : ""));
    if (rating.evidence) lines.push("   What I saw: " + rating.evidence);
  });
  const flags = auditFlags(audit);
  if (flags.length) {
    lines.push("");
    lines.push("Safety, and this is the part to read twice:");
    flags.forEach((key) => {
      const item = AUDIT_SAFETY.find((row) => row[0] === key), note = audit.safety[key].note;
      lines.push(" - " + (item ? item[1] : key) + (note ? ": " + note : ""));
    });
  }
  if (audit.question) {
    lines.push("");
    lines.push("I asked: " + audit.question);
    if (audit.answer) lines.push("You said: " + audit.answer);
  }
  if (audit.wentWell) { lines.push(""); lines.push("What went well: " + audit.wentWell); }
  if (audit.changeOne) { lines.push(""); lines.push("One thing to change: " + audit.changeOne); }
  if (audit.followUp && audit.followUp.needed) { lines.push(""); lines.push("Follow-up: " + (audit.followUp.by ? "by " + audit.followUp.by : "we will book a time")); }
  lines.push("");
  lines.push(currentAccountIdentity().displayName);
  return lines.join("\n");
}

function emailAuditToTrainer(id) {
  const audit = loadTrainerAudits().find((row) => row.id === id);
  if (!audit) return;
  const subject = "Your session audit — " + audit.date;
  window.location.href = "mailto:" + encodeURIComponent(audit.trainerKey) + "?subject=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent(auditEmailText(audit));
}

function copyAuditText(id) {
  const audit = loadTrainerAudits().find((row) => row.id === id);
  if (!audit) return;
  const text = auditEmailText(audit);
  if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(() => showToast("Audit copied — paste it wherever you like"), () => showToast("Copying was blocked on this device"));
  else showToast("Copying is not available on this device");
}

function exportTrainerAuditsCsv() {
  const list = filteredAudits();
  if (!list.length) { showToast("Nothing to export with those filters"); return; }
  const header = ["Trainer","Email","Date","Kind","Session","Overall %","Flagged","Auditor"].concat(AUDIT_AREAS.map((area) => area.title)).concat(["What went well","One thing to change","Follow-up"]);
  const rows = [header].concat(list.map((audit) => [
    audit.trainerName, audit.trainerKey, audit.date, auditKindLabel(audit.kind), auditSessionLabel(audit.sessionType),
    auditScore(audit) == null ? "" : auditScore(audit), auditIsFlagged(audit) ? "yes" : "", audit.auditorName
  ].concat(AUDIT_AREAS.map((area) => {
    const rating = audit.ratings && audit.ratings[area.key];
    return rating && Number(rating.score) ? rating.score : "not observed";
  })).concat([audit.wentWell || "", audit.changeOne || "", audit.followUp && audit.followUp.needed ? (audit.followUp.resolvedAt ? "closed" : "open") : ""])));
  downloadTextFile("fit4life-trainer-audits.csv", rows.map((row) => row.map(csvCell).join(",")).join("\n"), "text/csv");
}

/* ---------- filters ---------- */
const auditKindLabel = (kind) => (AUDIT_KINDS.find((row) => row[0] === kind) || ["","Developmental"])[1];
const auditSessionLabel = (type) => (AUDIT_SESSION_TYPES.find((row) => row[0] === type) || ["","Session"])[1];

function filteredAudits() {
  const search = auditFilters.search.trim().toLowerCase();
  return loadTrainerAudits().filter((audit) => {
    if (auditFilters.trainer && audit.trainerKey !== auditFilters.trainer) return false;
    if (auditFilters.kind && audit.kind !== auditFilters.kind) return false;
    if (auditFilters.from && String(audit.date) < auditFilters.from) return false;
    if (auditFilters.to && String(audit.date) > auditFilters.to) return false;
    if (auditFilters.flagged && !auditIsFlagged(audit)) return false;
    if (auditFilters.follow && !(audit.followUp && audit.followUp.needed && !audit.followUp.resolvedAt)) return false;
    if (search && [audit.trainerName, audit.wentWell, audit.changeOne, audit.clientHandle].join(" ").toLowerCase().indexOf(search) < 0) return false;
    return true;
  }).sort((a, b) => String(b.date).localeCompare(String(a.date)) || String(b.createdAt).localeCompare(String(a.createdAt)));
}

function readAuditFilters() {
  auditFilters = {
    trainer: byId("auditFilterTrainer") ? byId("auditFilterTrainer").value : auditFilters.trainer,
    kind: byId("auditFilterKind") ? byId("auditFilterKind").value : auditFilters.kind,
    from: byId("auditFilterFrom") ? byId("auditFilterFrom").value : auditFilters.from,
    to: byId("auditFilterTo") ? byId("auditFilterTo").value : auditFilters.to,
    flagged: byId("auditFilterFlagged") ? byId("auditFilterFlagged").checked : auditFilters.flagged,
    follow: byId("auditFilterFollow") ? byId("auditFilterFollow").checked : auditFilters.follow,
    search: byId("auditFilterSearch") ? byId("auditFilterSearch").value : auditFilters.search
  };
  renderTrainerAuditsModule();
}

/* ---------- screens ---------- */
const auditCard = (title, body, wide) => '<section class="coach-module-card"' + (wide ? ' style="grid-column:1/-1"' : '') + '><h3>' + title + '</h3>' + body + '</section>';

function auditTabsHtml() {
  const tab = auditView.tab;
  return '<div class="tool-actions" style="grid-column:1/-1">'
    + '<button class="small-btn ' + (tab === "audits" ? "primary" : "") + '" onclick="openAuditTab(\'audits\')">Audits</button>'
    + '<button class="small-btn ' + (tab === "new" ? "primary" : "") + '" onclick="openAuditTab(\'new\')">New audit</button>'
    + '<button class="small-btn ' + (tab === "check" ? "primary" : "") + '" onclick="openAuditTab(\'check\')">Quick check</button>'
    + '<button class="small-btn ' + (tab === "trainers" ? "primary" : "") + '" onclick="openAuditTab(\'trainers\')">Trainers</button>'
    + '<button class="small-btn" onclick="exportTrainerAuditsCsv()">Export CSV</button></div>';
}

function openAuditTab(tab) {
  auditView = { tab, trainerKey: tab === "trainer" ? auditView.trainerKey : "", auditId:"", draft: tab === "new" ? auditView.draft : null };
  renderTrainerAuditsModule();
}
function openAuditTrainer(key) { auditView = { tab:"trainer", trainerKey:key, auditId:"", draft:null }; renderTrainerAuditsModule(); }
function openAuditDetail(id) { auditView = { tab:"detail", trainerKey:auditView.trainerKey, auditId:id, draft:null }; renderTrainerAuditsModule(); }

function auditScoreChip(audit) {
  const score = auditScore(audit);
  const flagged = auditIsFlagged(audit);
  return '<span class="pill ' + (flagged ? "warn" : "") + '">' + (score == null ? "not scored" : score + "%") + (flagged ? " · flagged" : "") + '</span>';
}

function auditRowHtml(audit) {
  const followOpen = audit.followUp && audit.followUp.needed && !audit.followUp.resolvedAt;
  return '<div class="trainer-account-row"><div><b>' + escapeHtml(audit.trainerName) + '</b><span>' + escapeHtml(audit.date) + ' · ' + escapeHtml(auditKindLabel(audit.kind))
    + ' · ' + escapeHtml(auditSessionLabel(audit.sessionType)) + (audit.clientHandle ? ' · ' + escapeHtml(audit.clientHandle) : '')
    + (followOpen ? ' · follow-up open' : '') + '</span></div><div class="tool-actions">' + auditScoreChip(audit)
    + '<button class="small-btn" onclick="openAuditDetail(\'' + audit.id + '\')">Open</button></div></div>';
}

function renderAuditsList() {
  const list = filteredAudits(), trainers = auditTrainerRoster();
  const filters = '<div class="compact-grid">'
    + '<div class="compact-field"><label for="auditFilterTrainer">Trainer</label><select id="auditFilterTrainer" onchange="readAuditFilters()"><option value="">Everyone</option>'
    + trainers.map((trainer) => '<option value="' + escapeHtml(trainer.key) + '"' + (auditFilters.trainer === trainer.key ? ' selected' : '') + '>' + escapeHtml(trainer.name) + '</option>').join('') + '</select></div>'
    + '<div class="compact-field"><label for="auditFilterKind">Kind</label><select id="auditFilterKind" onchange="readAuditFilters()"><option value="">Both</option>'
    + AUDIT_KINDS.map(([value, label]) => '<option value="' + value + '"' + (auditFilters.kind === value ? ' selected' : '') + '>' + label + '</option>').join('') + '</select></div>'
    + '<div class="compact-field"><label for="auditFilterFrom">From</label><input id="auditFilterFrom" type="date" value="' + escapeHtml(auditFilters.from) + '" onchange="readAuditFilters()"></div>'
    + '<div class="compact-field"><label for="auditFilterTo">To</label><input id="auditFilterTo" type="date" value="' + escapeHtml(auditFilters.to) + '" onchange="readAuditFilters()"></div>'
    + '</div><div class="tool-actions" style="margin-top:10px"><input class="swap-search" id="auditFilterSearch" placeholder="Search names or notes…" value="' + escapeHtml(auditFilters.search) + '" oninput="readAuditFilters()">'
    + '<label class="inline-check"><input type="checkbox" id="auditFilterFlagged" ' + (auditFilters.flagged ? 'checked' : '') + ' onchange="readAuditFilters()"> Flagged only</label>'
    + '<label class="inline-check"><input type="checkbox" id="auditFilterFollow" ' + (auditFilters.follow ? 'checked' : '') + ' onchange="readAuditFilters()"> Follow-up open</label></div>';
  const rows = list.length ? '<div class="advanced-list" style="margin-top:12px">' + list.map(auditRowHtml).join('') + '</div>'
    : '<div class="empty-state">No audits match. ' + (loadTrainerAudits().length ? 'Widen the filters.' : 'Start with New audit.') + '</div>';
  return auditCard("Audits · " + list.length, filters + rows, true);
}

function renderAuditCoverage() {
  const trainers = auditTrainerRoster();
  if (!trainers.length) return "";
  const now = Date.now();
  const rows = trainers.map((trainer) => {
    const list = auditsForTrainer(trainer.key), last = list[0];
    const days = last ? Math.round((now - new Date(last.date + "T12:00:00").getTime()) / 86400000) : null;
    return { trainer, list, last, days };
  }).sort((a, b) => (b.days == null ? 1e9 : b.days) - (a.days == null ? 1e9 : a.days));
  const body = rows.map((row) => '<div class="trainer-account-row"><div><b>' + escapeHtml(row.trainer.name) + '</b><span>'
    + (row.last ? row.list.length + " audit" + (row.list.length === 1 ? "" : "s") + " · last " + escapeHtml(row.last.date) + " (" + row.days + " days ago)" : "never audited")
    + (row.trainer.linked ? "" : " · no app account matched") + '</span></div><div class="tool-actions">'
    + '<button class="small-btn" onclick="openAuditTrainer(\'' + escapeHtml(row.trainer.key) + '\')">Open</button>'
    + '<button class="small-btn primary" onclick="startAuditFor(\'' + escapeHtml(row.trainer.key) + '\')">Audit now</button></div></div>').join('');
  return auditCard("Who is due", '<p class="storage-note">Oldest first. A trainer needs three audits before the trend below means anything.</p><div class="advanced-list">' + body + '</div>', true);
}

function renderAuditTrainersCard() {
  const trainers = auditTrainerRoster();
  const add = '<div class="compact-grid"><div class="compact-field"><label for="auditTrainerName">Name</label><input id="auditTrainerName" placeholder="Zach B"></div>'
    + '<div class="compact-field"><label for="auditTrainerEmail">Email</label><input id="auditTrainerEmail" type="email" placeholder="zach@example.com" autocapitalize="none"></div></div>'
    + '<div class="tool-actions"><button class="small-btn primary" onclick="addAuditTrainerFromForm()">Add trainer</button></div>'
    + '<p class="storage-note">The email keeps every audit attached to the same person, is where "Send to trainer" addresses, and links the audit to their FIT4LIFE account when it matches.</p>';
  const rows = trainers.length ? '<div class="advanced-list" style="margin-top:12px">' + trainers.map((trainer) => '<div class="trainer-account-row"><div><b>' + escapeHtml(trainer.name) + '</b><span>'
    + escapeHtml(trainer.email) + (trainer.linked ? ' · linked to their app account' : ' · no app account with that email') + ' · ' + auditsForTrainer(trainer.key).length + ' audits</span></div>'
    + '<div class="tool-actions"><button class="small-btn" onclick="openAuditTrainer(\'' + escapeHtml(trainer.key) + '\')">Audits</button>'
    + '<button class="small-btn" onclick="removeAuditTrainer(\'' + escapeHtml(trainer.key) + '\')">Remove</button></div></div>').join('') + '</div>'
    : '<div class="empty-state">No trainers yet. Add the ones you are auditing this semester.</div>';
  return auditCard("Trainers", add + rows, true);
}

function addAuditTrainerFromForm() {
  const record = saveAuditTrainer(byId("auditTrainerName") ? byId("auditTrainerName").value : "", byId("auditTrainerEmail") ? byId("auditTrainerEmail").value : "");
  if (!record) return;
  showToast(record.name + " added");
  renderTrainerAuditsModule();
}

function trainerScorecardHtml(trainer) {
  const list = auditsForTrainer(trainer.key), scored = list.map(auditScore).filter((value) => value != null);
  const check = trainerCheckScore(trainer.key), counts = trainerLogCounts(trainer.key), cert = trainer.cert || {}, grade = trainer.grade || {};
  const certLabel = (AUDIT_CERT_STATUS.find((row) => row[0] === cert.status) || ["","Not recorded"])[1];
  const strip = '<div class="rx-strip">'
    + '<div class="rx-cell"><div class="rx-k">Audits</div><div class="rx-v">' + (scored.length ? Math.round(scored.reduce((sum, value) => sum + value, 0) / scored.length) + "%" : "—") + '</div></div>'
    + '<div class="rx-cell"><div class="rx-k">Floor checks</div><div class="rx-v">' + (check.pct == null ? "—" : check.pct + "%") + '</div></div>'
    + '<div class="rx-cell"><div class="rx-k">Late / no-show</div><div class="rx-v">' + ((counts.late || 0) + " / " + (counts.no_show || 0)) + '</div></div>'
    + '<div class="rx-cell"><div class="rx-k">Certification</div><div class="rx-v">' + escapeHtml(certLabel) + '</div></div></div>';
  const adminOpen = (counts.log_missing || 0) + (counts.notes_stale || 0) + (counts.message_unanswered || 0);
  const detail = '<p class="storage-note">' + list.length + ' audit' + (list.length === 1 ? '' : 's') + ' · ' + check.checks + ' floor check' + (check.checks === 1 ? '' : 's')
    + ' · on time ' + (counts.on_time || 0) + ' · covered ' + (counts.covered || 0) + ' · admin flags ' + adminOpen
    + (cert.expires ? ' · ' + escapeHtml(certExpiryNote(cert)) : '') + '</p>';
  const logButtons = '<div class="compact-field"><label for="logNote">Note for the next entry (optional)</label><input id="logNote" placeholder="Swapped with Braxton"></div><div class="tool-actions">'
    + AUDIT_LOG_TYPES.map(([type, label]) => '<button class="small-btn" onclick="logTrainerEvent(\'' + escapeHtml(trainer.key) + '\',\'' + type + '\')">' + escapeHtml(label) + '</button>').join('') + '</div>';
  const certForm = '<div class="compact-grid">'
    + '<div class="compact-field"><label for="certStatus">Certification</label><select id="certStatus">' + AUDIT_CERT_STATUS.map(([value, label]) => '<option value="' + value + '"' + (cert.status === value ? ' selected' : '') + '>' + label + '</option>').join('') + '</select></div>'
    + '<div class="compact-field"><label for="certBody">Through</label><select id="certBody">' + AUDIT_CERT_BODIES.map(([value, label]) => '<option value="' + value + '"' + (cert.body === value ? ' selected' : '') + '>' + label + '</option>').join('') + '</select></div>'
    + '<div class="compact-field"><label for="certOn">Certified on</label><input id="certOn" type="date" value="' + escapeHtml(cert.certifiedOn || "") + '"></div>'
    + '<div class="compact-field"><label for="certExpires">Expires</label><input id="certExpires" type="date" value="' + escapeHtml(cert.expires || "") + '"></div>'
    + '<div class="compact-field"><label for="certCeus">CEUs done</label><input id="certCeus" value="' + escapeHtml(cert.ceus || "") + '" placeholder="1.2 of 2.0"></div>'
    + '<div class="compact-field"><label for="certTrainings">Trainings and tutorials</label><input id="certTrainings" value="' + escapeHtml(cert.trainings || "") + '" placeholder="Spotting clinic, builder walkthrough"></div></div>';
  const gradeForm = '<div class="compact-grid"><div class="compact-field"><label for="gradeBand">Where they are</label><select id="gradeBand"><option value="">Not graded</option>'
    + AUDIT_GRADES.map(([value, label]) => '<option value="' + value + '"' + (grade.band === value ? ' selected' : '') + '>' + label + '</option>').join('') + '</select></div></div>'
    + '<div class="compact-field"><label for="gradeNote">Your read on them</label><textarea id="gradeNote" rows="3">' + escapeHtml(grade.note || "") + '</textarea></div>'
    + '<p class="storage-note">Owner only. This never appears in an audit you send them, in their app, or anywhere a trainer can reach.'
    + (grade.updatedAt ? ' Last written ' + escapeHtml(String(grade.updatedAt).slice(0, 10)) + '.' : '') + '</p>'
    + '<div class="tool-actions"><button class="small-btn primary" onclick="saveTrainerExtras(\'' + escapeHtml(trainer.key) + '\')">Save certification and read</button></div>';
  return { strip: strip + detail, logButtons, certForm, gradeForm };
}

function renderAuditTrainerPage() {
  const trainer = auditTrainerRoster().find((row) => row.key === auditView.trainerKey);
  if (!trainer) { auditView.tab = "audits"; return renderAuditsList(); }
  const list = auditsForTrainer(trainer.key), averages = auditAreaAverages(list), trend = auditTrend(list);
  const weakest = AUDIT_AREAS.filter((area) => averages[area.key] != null).sort((a, b) => averages[a.key] - averages[b.key])[0];
  const card = trainerScorecardHtml(trainer);
  const areaRows = AUDIT_AREAS.map((area) => '<div class="trainer-account-row"><div><b>' + escapeHtml(area.title) + '</b><span>' + escapeHtml(area.source) + '</span></div>'
    + '<div class="tool-actions"><span class="pill">' + (averages[area.key] == null ? "not observed" : averages[area.key] + " / 5") + '</span></div></div>').join('');
  const note = list.length < 3
    ? '<p class="storage-note">' + (list.length === 1 ? "One look." : list.length + " looks.") + ' A single observation is weak evidence — three or more before you read anything into the average.</p>'
    : '<p class="storage-note">Trend across ' + list.length + ' audits: ' + (trend == null ? "not enough scored audits yet" : (trend > 0 ? "up " + trend + " points" : trend < 0 ? "down " + Math.abs(trend) + " points" : "flat")) + (weakest ? ' · weakest area: ' + escapeHtml(weakest.title) : '') + '</p>';
  const checks = loadTrainerChecks().filter((row) => row.trainerKey === trainer.key).slice(0, 6);
  const checkRows = checks.length ? '<div class="advanced-list">' + checks.map((check) => {
    const missed = AUDIT_CHECK_ITEMS.filter(([key]) => check.items && check.items[key] === "no").map(([, label]) => label);
    return '<div class="trainer-account-row"><div><b>' + escapeHtml(String(check.at).slice(0, 10)) + '</b><span>' + (missed.length ? escapeHtml(missed.join(" · ")) : "everything met") + (check.note ? ' · ' + escapeHtml(check.note) : '') + '</span></div></div>';
  }).join('') + '</div>' : '<div class="empty-state">No floor checks yet.</div>';
  const logRows = loadTrainerLog().filter((row) => row.trainerKey === trainer.key).slice(0, 8);
  const logHtml = logRows.length ? '<div class="advanced-list" style="margin-top:10px">' + logRows.map((row) => {
    const item = AUDIT_LOG_TYPES.find((entry) => entry[0] === row.event);
    return '<div class="trainer-account-row' + (item && item[2] === false ? ' warn' : '') + '"><div><b>' + escapeHtml(item ? item[1] : row.event) + '</b><span>' + escapeHtml(String(row.at).slice(0, 10)) + (row.note ? ' · ' + escapeHtml(row.note) : '') + '</span></div></div>';
  }).join('') + '</div>' : '';
  return '<div class="tool-actions" style="grid-column:1/-1"><button class="small-btn" onclick="openAuditTab(\'audits\')">← All audits</button>'
    + '<button class="small-btn primary" onclick="startAuditFor(\'' + escapeHtml(trainer.key) + '\')">New audit</button>'
    + '<button class="small-btn" onclick="openAuditTab(\'check\')">Quick check</button></div>'
    + auditCard(escapeHtml(trainer.name), card.strip + note + '<div class="advanced-list" style="margin-top:10px">' + areaRows + '</div>', true)
    + auditCard("Reliability and admin", card.logButtons + logHtml, true)
    + auditCard("Floor checks", checkRows, true)
    + auditCard("Certification", card.certForm, true)
    + auditCard("Where they are · owner only", card.gradeForm, true)
    + auditCard("Their audits", list.length ? '<div class="advanced-list">' + list.map(auditRowHtml).join('') + '</div>' : '<div class="empty-state">No audits yet.</div>', true);
}

/* ---------- the audit form ---------- */
function startAuditFor(key) {
  auditView = { tab:"new", trainerKey:key, auditId:"", draft:{ trainerKey:key, date:auditToday(), kind:"developmental", sessionType:"one_to_one", ratings:{} } };
  renderTrainerAuditsModule();
}

function setAuditRating(areaKey, score) {
  if (!auditView.draft) return;
  auditView.draft.ratings[areaKey] = auditView.draft.ratings[areaKey] === score ? 0 : score;
  document.querySelectorAll('[data-audit-rating="' + areaKey + '"]').forEach((button) => {
    button.classList.toggle("primary", Number(button.dataset.auditScore) === auditView.draft.ratings[areaKey]);
  });
}

function auditScaleHelpHtml() {
  return '<details class="audit-scale"><summary>What the numbers mean</summary><ul>'
    + AUDIT_SCALE.map(([value, label, detail]) => '<li><b>' + value + ' · ' + label + '</b> — ' + detail + '</li>').join('') + '</ul></details>';
}

function auditAreaFieldHtml(area) {
  const draft = auditView.draft || { ratings:{} }, chosen = draft.ratings[area.key] || 0;
  return '<section class="coach-module-card" style="grid-column:1/-1"><h3>' + escapeHtml(area.title) + ' <span class="pill">' + area.weight + '%</span></h3>'
    + '<p class="storage-note">' + escapeHtml(area.source) + '</p>'
    + '<details class="audit-look"><summary>What to look for</summary><ul>' + area.look.map((item) => '<li>' + escapeHtml(item) + '</li>').join('') + '</ul></details>'
    + '<div class="compact-field" style="margin-top:10px"><label for="auditEvidence_' + area.key + '">What I saw — a count or a quote, before you score it</label>'
    + '<textarea id="auditEvidence_' + area.key + '" rows="2" placeholder="cued knee position twice on set 2 · said: drive through the floor"></textarea></div>'
    + '<div class="tool-actions">' + AUDIT_SCALE.map(([value, label]) => '<button class="small-btn ' + (chosen === value ? "primary" : "") + '" data-audit-rating="' + area.key + '" data-audit-score="' + value + '" onclick="setAuditRating(\'' + area.key + '\',' + value + ')" title="' + escapeHtml(label) + '">' + value + '</button>').join('')
    + '<span class="storage-note">Leave every number unpicked for “not observed”.</span></div></section>';
}

function renderNewAuditForm() {
  const trainers = auditTrainerRoster();
  if (!trainers.length) return auditCard("Add a trainer first", '<p>An audit is filed against a trainer, so add them on the Trainers tab before the first one.</p><div class="tool-actions"><button class="small-btn primary" onclick="openAuditTab(\'trainers\')">Open Trainers</button></div>', true);
  if (!auditView.draft) auditView.draft = { trainerKey:auditView.trainerKey || trainers[0].key, date:auditToday(), kind:"developmental", sessionType:"one_to_one", ratings:{} };
  const draft = auditView.draft;
  const head = '<div class="compact-grid">'
    + '<div class="compact-field"><label for="auditFormTrainer">Trainer</label><select id="auditFormTrainer" onchange="auditView.draft.trainerKey=this.value;renderTrainerAuditsModule()">'
    + trainers.map((trainer) => '<option value="' + escapeHtml(trainer.key) + '"' + (draft.trainerKey === trainer.key ? ' selected' : '') + '>' + escapeHtml(trainer.name) + '</option>').join('') + '</select></div>'
    + '<div class="compact-field"><label for="auditFormDate">Date</label><input id="auditFormDate" type="date" value="' + escapeHtml(draft.date) + '"></div>'
    + '<div class="compact-field"><label for="auditFormSession">Session</label><select id="auditFormSession">'
    + AUDIT_SESSION_TYPES.map(([value, label]) => '<option value="' + value + '"' + (draft.sessionType === value ? ' selected' : '') + '>' + label + '</option>').join('') + '</select></div>'
    + '<div class="compact-field"><label for="auditFormClient">Client handle (optional)</label><input id="auditFormClient" placeholder="squat-42"></div></div>'
    + '<div class="tool-actions" style="margin-top:8px">' + AUDIT_KINDS.map(([value, label, detail]) => '<button class="small-btn ' + (draft.kind === value ? "primary" : "") + '" onclick="setAuditKind(\'' + value + '\')" title="' + escapeHtml(detail) + '">' + label + '</button>').join('') + '</div>'
    + '<p class="storage-note" id="auditKindNote">' + escapeHtml((AUDIT_KINDS.find((row) => row[0] === draft.kind) || [])[2] || "") + '</p>'
    + auditLastTimeHtml(draft.trainerKey)
    + auditScaleHelpHtml();
  const safety = '<p class="storage-note">Tick only what actually happened. Anything ticked flags the audit whatever the score says, and needs a line saying what happened.</p>'
    + AUDIT_SAFETY.map(([key, label]) => '<div class="compact-field"><label class="inline-check"><input type="checkbox" id="auditSafety_' + key + '"> ' + escapeHtml(label) + '</label>'
    + '<input id="auditSafetyNote_' + key + '" placeholder="What happened"></div>').join('');
  const closing = '<div class="compact-field"><label for="auditQuestion">A question you asked afterwards</label><input id="auditQuestion" placeholder="Why that exercise for her? What if his knee had hurt?"></div>'
    + '<div class="compact-field"><label for="auditAnswer">What they said</label><textarea id="auditAnswer" rows="2"></textarea></div>'
    + '<div class="compact-field"><label for="auditWentWell">What went well</label><textarea id="auditWentWell" rows="2"></textarea></div>'
    + '<div class="compact-field"><label for="auditChangeOne">One thing to change</label><textarea id="auditChangeOne" rows="2"></textarea></div>'
    + '<div class="compact-grid"><div class="compact-field"><label class="inline-check"><input type="checkbox" id="auditFollowNeeded"> Needs a follow-up</label></div>'
    + '<div class="compact-field"><label for="auditFollowBy">Follow up by</label><input id="auditFollowBy" type="date"></div></div>'
    + '<div class="tool-actions"><button class="small-btn primary" onclick="saveAuditFromForm()">Save audit</button><button class="small-btn" onclick="openAuditTab(\'audits\')">Cancel</button></div>';
  return auditCard("New audit", head, true)
    + AUDIT_AREAS.map(auditAreaFieldHtml).join('')
    + auditCard("Safety", safety, true)
    + auditCard("Finish", closing, true);
}

function setAuditKind(kind) {
  if (!auditView.draft) return;
  auditView.draft.kind = kind;
  renderTrainerAuditsModule();
}

function saveAuditFromForm() {
  if (!requireTrainerMutation("save a trainer audit")) return;
  if (!isFit4LifeOwner()) { showToast("Only an owner can save a trainer audit"); return; }
  const draft = auditView.draft;
  if (!draft) return;
  const value = (id) => { const field = byId(id); return field ? String(field.value || "").trim() : ""; };
  const checked = (id) => { const field = byId(id); return Boolean(field && field.checked); };
  const trainer = auditTrainerRoster().find((row) => row.key === (byId("auditFormTrainer") ? byId("auditFormTrainer").value : draft.trainerKey));
  if (!trainer) { showToast("Pick the trainer this audit is for"); return; }
  const ratings = {}, missingEvidence = [];
  AUDIT_AREAS.forEach((area) => {
    const score = Number(draft.ratings[area.key]) || 0, evidence = value("auditEvidence_" + area.key);
    if (!score) return;
    if (!evidence) missingEvidence.push(area.title);
    ratings[area.key] = { score, evidence };
  });
  if (!Object.keys(ratings).length) { showToast("Score at least one area, or this is not an audit"); return; }
  if (missingEvidence.length) { showToast("Write what you saw before scoring: " + missingEvidence[0]); return; }
  const safety = {}, missingNote = [];
  AUDIT_SAFETY.forEach(([key, label]) => {
    if (!checked("auditSafety_" + key)) return;
    const note = value("auditSafetyNote_" + key);
    if (!note) missingNote.push(label);
    safety[key] = { checked:true, note };
  });
  if (missingNote.length) { showToast("Say what happened: " + missingNote[0]); return; }
  const kind = draft.kind;
  const steppedIn = Object.keys(ratings).some((key) => ratings[key].score === 1);
  if (kind === "scored" && steppedIn && !Object.keys(safety).length) {
    showToast("A scored audit is watch-only. If you had to step in, tick what made it unsafe — or log this as developmental.");
    return;
  }
  const identity = currentAccountIdentity(), now = new Date().toISOString();
  const audit = {
    id: auditNewId("trainer-audit"), createdAt: now, updatedAt: now,
    trainerKey: trainer.key, trainerName: trainer.name, trainerUserId: trainer.userId || "",
    auditorUserId: identity.id, auditorName: identity.displayName,
    date: value("auditFormDate") || auditToday(), kind, sessionType: byId("auditFormSession") ? byId("auditFormSession").value : "one_to_one",
    type: "audit", clientHandle: value("auditFormClient"), ratings, safety,
    actedOnLast: byId("auditActedOn") ? byId("auditActedOn").value : "",
    question: value("auditQuestion"), answer: value("auditAnswer"),
    wentWell: value("auditWentWell"), changeOne: value("auditChangeOne"),
    followUp: { needed: checked("auditFollowNeeded"), by: value("auditFollowBy"), resolvedAt:"", resolvedBy:"" }
  };
  audit.scorePct = auditScore(audit);
  audit.flagged = auditIsFlagged(audit);
  if (!saveTrainerAudit(audit)) return;
  auditView = { tab:"detail", trainerKey:trainer.key, auditId:audit.id, draft:null };
  renderTrainerAuditsModule();
  showToast("Audit saved for " + trainer.name);
}

function renderAuditDetail() {
  const audit = loadTrainerAudits().find((row) => row.id === auditView.auditId);
  if (!audit) { auditView.tab = "audits"; return renderAuditsList(); }
  const score = auditScore(audit), flags = auditFlags(audit);
  const areas = AUDIT_AREAS.map((area) => {
    const rating = audit.ratings && audit.ratings[area.key];
    const anchor = rating && AUDIT_SCALE.find((row) => row[0] === Number(rating.score));
    return '<div class="trainer-account-row"><div><b>' + escapeHtml(area.title) + '</b><span>' + (rating && rating.evidence ? escapeHtml(rating.evidence) : "not observed") + '</span></div>'
      + '<div class="tool-actions"><span class="pill">' + (rating && rating.score ? rating.score + " · " + escapeHtml(anchor ? anchor[1] : "") : "—") + '</span></div></div>';
  }).join('');
  const safetyHtml = flags.length
    ? '<div class="advanced-list">' + flags.map((key) => { const item = AUDIT_SAFETY.find((row) => row[0] === key);
        return '<div class="trainer-account-row warn"><div><b>' + escapeHtml(item ? item[1] : key) + '</b><span>' + escapeHtml(audit.safety[key].note || "") + '</span></div></div>'; }).join('') + '</div>'
    : '<p class="storage-note">Nothing was ticked in the safety block.</p>';
  const follow = audit.followUp && audit.followUp.needed
    ? (audit.followUp.resolvedAt ? '<p class="storage-note">Follow-up closed by ' + escapeHtml(audit.followUp.resolvedBy || "") + '.</p>'
      : '<div class="tool-actions"><span class="pill warn">Follow-up open' + (audit.followUp.by ? ' · by ' + escapeHtml(audit.followUp.by) : '') + '</span><button class="small-btn" onclick="resolveAuditFollowUp(\'' + audit.id + '\')">Mark done</button></div>')
    : "";
  const head = '<div class="rx-strip"><div class="rx-cell"><div class="rx-k">Overall</div><div class="rx-v">' + (score == null ? "—" : score + "%") + '</div></div>'
    + '<div class="rx-cell"><div class="rx-k">Kind</div><div class="rx-v">' + escapeHtml(auditKindLabel(audit.kind)) + '</div></div>'
    + '<div class="rx-cell"><div class="rx-k">Date</div><div class="rx-v">' + escapeHtml(audit.date) + '</div></div>'
    + '<div class="rx-cell"><div class="rx-k">Auditor</div><div class="rx-v">' + escapeHtml(audit.auditorName || "") + '</div></div></div>'
    + (flags.length ? '<p class="storage-note">Flagged on safety — that stands whatever the percentage says.</p>' : '')
    + '<div class="tool-actions"><button class="small-btn primary" onclick="emailAuditToTrainer(\'' + audit.id + '\')">Send to ' + escapeHtml(audit.trainerName) + '</button>'
    + '<button class="small-btn" onclick="copyAuditText(\'' + audit.id + '\')">Copy</button>'
    + '<button class="small-btn" onclick="openAuditTrainer(\'' + escapeHtml(audit.trainerKey) + '\')">Their history</button>'
    + '<button class="small-btn" onclick="deleteTrainerAudit(\'' + audit.id + '\')">Delete</button></div>' + follow;
  const closing = (audit.wentWell ? '<p><b>What went well:</b> ' + escapeHtml(audit.wentWell) + '</p>' : '')
    + (audit.changeOne ? '<p><b>One thing to change:</b> ' + escapeHtml(audit.changeOne) + '</p>' : '');
  return '<div class="tool-actions" style="grid-column:1/-1"><button class="small-btn" onclick="openAuditTab(\'audits\')">← All audits</button></div>'
    + auditCard(escapeHtml(audit.trainerName) + " · " + escapeHtml(audit.date), head, true)
    + auditCard("Scores", '<div class="advanced-list">' + areas + '</div>' + closing, true)
    + auditCard("Safety", safetyHtml, true);
}

function renderTrainerAuditsModule() {
  const out = byId("coachModuleContent");
  if (!out) return;
  if (!isFit4LifeOwner()) {
    out.innerHTML = auditCard("Owner only", '<p>Trainer audits are kept for the gym owner. Ask them if you want to see your own.</p>', true);
    return;
  }
  let body = "";
  if (auditView.tab === "new") body = renderNewAuditForm();
  else if (auditView.tab === "check") body = renderQuickCheck();
  else if (auditView.tab === "trainer") body = renderAuditTrainerPage();
  else if (auditView.tab === "detail") body = renderAuditDetail();
  else if (auditView.tab === "trainers") body = renderAuditTrainersCard() + renderAuditCoverage();
  else body = renderAuditsList() + renderAuditCoverage();
  out.innerHTML = auditTabsHtml() + body;
  if (window.fit4lifeTrainerAuditsAvailable === false) {
    out.insertAdjacentHTML("afterbegin", auditCard("Saved on this device only", '<p>The audit tables are not in Supabase yet, so these stay on this computer. Run RUN-THIS-IN-SUPABASE-TRAINER-AUDITS.sql and they will publish to every owner device.</p>', true));
  }
}

/* ---------- registration ---------- */
const legacyRenderCoachModuleBeforeAudits = window.renderCoachModule;
window.renderCoachModule = function auditsRenderCoachModule(destination) {
  if (destination === "audits") {
    const title = byId("coachModuleTitle"), eyebrow = byId("coachModuleEyebrow"), copy = byId("coachModuleCopy");
    if (title) title.textContent = "Trainer audits";
    if (eyebrow) eyebrow.textContent = "Coach workspace";
    if (copy) copy.textContent = "Watch a session, score it against what NASM and NSCA publish, and keep every audit in one place.";
    renderTrainerAuditsModule();
    return;
  }
  legacyRenderCoachModuleBeforeAudits(destination);
};

const legacyOpenCoachDestinationBeforeAudits = window.openCoachDestination;
window.openCoachDestination = function auditsOpenCoachDestination(destination) {
  if (destination === "audits" && window.fit4lifeCloudRole !== "owner") {
    showToast("Only an owner can open trainer audits");
    destination = "dashboard";
  }
  return legacyOpenCoachDestinationBeforeAudits(destination);
};

if (typeof window.fit4lifeCloudListTrainerAudits === "function") {
  window.fit4lifeCloudListTrainerAudits();
}

/* ---------- following through on the last audit ---------- */
function auditLastTimeHtml(trainerKey) {
  const last = auditsForTrainer(trainerKey)[0];
  if (!last || !last.changeOne) return "";
  return '<div class="compact-field" style="margin-top:10px"><label for="auditActedOn">Last time you asked for: “' + escapeHtml(last.changeOne) + '”</label>'
    + '<select id="auditActedOn"><option value="">Did they act on it?</option><option value="yes">Yes, it showed up today</option>'
    + '<option value="partly">Partly</option><option value="no">No change</option><option value="na">No chance to tell</option></select></div>';
}

/* ---------- quick check ---------- */
function renderQuickCheck() {
  const trainers = auditTrainerRoster();
  if (!trainers.length) return auditCard("Add a trainer first", '<p>Quick checks are filed against a trainer. Add them on the Trainers tab.</p><div class="tool-actions"><button class="small-btn primary" onclick="openAuditTab(\'trainers\')">Open Trainers</button></div>', true);
  const picker = '<div class="compact-grid"><div class="compact-field"><label for="checkTrainer">Trainer</label><select id="checkTrainer">'
    + trainers.map((trainer) => '<option value="' + escapeHtml(trainer.key) + '"' + (auditView.trainerKey === trainer.key ? ' selected' : '') + '>' + escapeHtml(trainer.name) + '</option>').join('') + '</select></div></div>';
  const items = AUDIT_CHECK_ITEMS.map(([key, label]) => '<div class="compact-field"><label>' + escapeHtml(label) + '</label><div class="tool-actions">'
    + '<button class="small-btn" data-check="' + key + '" data-check-value="yes" onclick="setQuickCheck(\'' + key + '\',\'yes\')">Yes</button>'
    + '<button class="small-btn" data-check="' + key + '" data-check-value="no" onclick="setQuickCheck(\'' + key + '\',\'no\')">No</button>'
    + '<button class="small-btn" data-check="' + key + '" data-check-value="na" onclick="setQuickCheck(\'' + key + '\',\'na\')">N/A</button></div></div>').join('');
  const recent = loadTrainerChecks().slice(0, 8);
  const history = recent.length ? '<div class="advanced-list" style="margin-top:12px">' + recent.map((check) => {
    const met = AUDIT_CHECK_ITEMS.filter(([key]) => check.items[key] === "yes").length, counted = AUDIT_CHECK_ITEMS.filter(([key]) => check.items[key] && check.items[key] !== "na").length;
    return '<div class="trainer-account-row"><div><b>' + escapeHtml(check.trainerName) + '</b><span>' + escapeHtml(String(check.at).slice(0, 16).replace("T", " ")) + (check.note ? ' · ' + escapeHtml(check.note) : '') + '</span></div>'
      + '<div class="tool-actions"><span class="pill' + (counted && met < counted ? ' warn' : '') + '">' + met + ' of ' + counted + '</span></div></div>';
  }).join('') + '</div>' : '';
  return auditCard("Quick check", picker + items
    + '<div class="compact-field"><label for="checkNote">Note (optional)</label><input id="checkNote" placeholder="Sat on the counter again"></div>'
    + '<div class="tool-actions"><button class="small-btn primary" onclick="saveQuickCheck()">Save check</button></div>'
    + '<p class="storage-note">Thirty seconds, as many times a shift as you like. Kept apart from session audits.</p>' + history, true);
}

let quickCheckDraft = {};
function setQuickCheck(key, value) {
  quickCheckDraft[key] = quickCheckDraft[key] === value ? "" : value;
  document.querySelectorAll('[data-check="' + key + '"]').forEach((button) => button.classList.toggle("primary", button.dataset.checkValue === quickCheckDraft[key]));
}

function saveQuickCheck() {
  if (!isFit4LifeOwner()) { showToast("Only an owner can save a check"); return; }
  const key = byId("checkTrainer") ? byId("checkTrainer").value : "", trainer = auditTrainerRoster().find((row) => row.key === key);
  if (!trainer) { showToast("Pick the trainer"); return; }
  const answered = Object.keys(quickCheckDraft).filter((item) => quickCheckDraft[item]);
  if (!answered.length) { showToast("Answer at least one line"); return; }
  const identity = currentAccountIdentity(), now = new Date().toISOString();
  const check = { id: auditNewId("trainer-check"), type: "check", trainerKey: trainer.key, trainerName: trainer.name,
    at: now, date: now.slice(0, 10), createdAt: now, updatedAt: now, auditorName: identity.displayName,
    items: { ...quickCheckDraft }, note: byId("checkNote") ? String(byId("checkNote").value || "").trim() : "" };
  if (!saveTrainerAudit(check)) return;
  quickCheckDraft = {};
  renderTrainerAuditsModule();
  showToast("Check saved for " + trainer.name);
}

/* ---------- reliability and admin ---------- */
function logTrainerEvent(key, type) {
  if (!isFit4LifeOwner()) { showToast("Only an owner can log this"); return; }
  const trainer = auditTrainerRoster().find((row) => row.key === key), item = AUDIT_LOG_TYPES.find((row) => row[0] === type);
  if (!trainer || !item) return;
  const identity = currentAccountIdentity(), now = new Date().toISOString();
  const entry = { id: auditNewId("trainer-log"), type: "log", event: type, trainerKey: trainer.key, trainerName: trainer.name,
    at: now, date: now.slice(0, 10), createdAt: now, updatedAt: now, auditorName: identity.displayName,
    note: byId("logNote") ? String(byId("logNote").value || "").trim() : "" };
  if (!saveTrainerAudit(entry)) return;
  renderTrainerAuditsModule();
  showToast(item[1] + " logged for " + trainer.name);
}

function trainerLogCounts(key) {
  const counts = {};
  loadTrainerLog().filter((row) => row.trainerKey === key).forEach((row) => { counts[row.event] = (counts[row.event] || 0) + 1; });
  return counts;
}

function trainerCheckScore(key) {
  const checks = loadTrainerChecks().filter((row) => row.trainerKey === key);
  let met = 0, counted = 0;
  checks.forEach((check) => AUDIT_CHECK_ITEMS.forEach(([item]) => {
    const value = check.items && check.items[item];
    if (!value || value === "na") return;
    counted++;
    if (value === "yes") met++;
  }));
  return { checks: checks.length, met, counted, pct: counted ? Math.round((met / counted) * 100) : null };
}

/* ---------- certification and the owner's own read ---------- */
function saveTrainerExtras(key) {
  const rows = loadAuditTrainers(), record = rows.find((row) => row.key === key);
  if (!record) return;
  const value = (id) => { const field = byId(id); return field ? String(field.value || "").trim() : ""; };
  record.cert = { status: value("certStatus"), body: value("certBody"), certifiedOn: value("certOn"), expires: value("certExpires"), ceus: value("certCeus"), trainings: value("certTrainings") };
  record.grade = { band: value("gradeBand"), note: value("gradeNote"), updatedAt: new Date().toISOString(), updatedBy: currentAccountIdentity().displayName };
  record.updatedAt = record.grade.updatedAt;
  if (!writeAuditTrainers(rows)) return;
  if (typeof window.fit4lifeCloudSaveAuditTrainer === "function") window.fit4lifeCloudSaveAuditTrainer(record);
  renderTrainerAuditsModule();
  showToast("Saved");
}

function certExpiryNote(cert) {
  if (!cert || !cert.expires) return "";
  const days = Math.round((new Date(cert.expires + "T12:00:00").getTime() - Date.now()) / 86400000);
  if (isNaN(days)) return "";
  if (days < 0) return "expired " + Math.abs(days) + " days ago";
  if (days < 60) return "expires in " + days + " days";
  return "expires " + cert.expires;
}
