/* FIT4LIFE - phase 4: reading Jason's booking export by hand, reviewing what it would do,
   and only then applying it. Reading is always a dry run: nothing is written until Apply is
   pressed, and no email is ever sent from this screen. */
(function () {
  "use strict";

  const IMPORT_KEY = "fit4life_booking_import_v1";
  const ALIAS_KEY = "fit4life_trainer_aliases_v1";
  // Held in localStorage for now. When the automatic ingest lands the aliases must move to
  // Supabase - a serverless function cannot read a browser's storage.
  const readJson = (key, fallback) => { try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : fallback; } catch (_) { return fallback; } };
  const writeJson = (key, value) => { try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch (_) { return false; } };

  const loadImportState = () => readJson(IMPORT_KEY, { fingerprint:"", missCounts:{}, knownEmails:[], lastImportedAt:"", history:[] });
  const loadTrainerAliases = () => readJson(ALIAS_KEY, []);

  let pending = null;   // { text, parsed, diff, fileName }

  function bookingImportPanelHtml() {
    const state = loadImportState();
    const last = state.lastImportedAt
      ? "Last applied " + new Date(state.lastImportedAt).toLocaleString() + " · " + (state.knownEmails || []).length + " client(s) tracked"
      : "Nothing has been imported yet.";
    return '<section class="advanced-card wide"><h3>Import from Jason’s booking report</h3>'
      + '<p>Reads the CSV attached to the bookings report email. Reading it only shows what would change — nothing is written until you press Apply, and <b>no email is ever sent from this screen</b>.</p>'
      + '<div class="storage-note">' + escapeHtml(last) + '</div>'
      + '<div class="compact-field wide"><label for="bookingImportFile">Booking report CSV</label>'
      + '<input id="bookingImportFile" type="file" accept=".csv,text/csv" onchange="readBookingExportFile(this)"></div>'
      + '<div id="bookingImportPreview" class="booking-import-preview"></div></section>';
  }

  window.readBookingExportFile = function readBookingExportFile(input) {
    const file = input && input.files && input.files[0];
    const out = byId("bookingImportPreview"); if (!out) return false;
    if (!file) { out.innerHTML = ""; pending = null; return false; }
    const reader = new FileReader();
    reader.onerror = () => { out.innerHTML = '<div class="invite-check bad">✗ That file could not be read.</div>'; };
    reader.onload = () => {
      const text = String(reader.result || "");
      const parsed = window.parseBookingExport(text, { reference:new Date() });
      const diff = window.diffBookingImport(parsed, {
        profiles: loadProfiles(), previousState: loadImportState(), trainerAliases: loadTrainerAliases()
      });
      pending = { text, parsed, diff, fileName:file.name };
      out.innerHTML = previewHtml(parsed, diff);
      bindDataHandlers(out, "[data-booking-apply]", () => applyBookingImport());
      bindDataHandlers(out, "[data-alias-link]", (button) => linkTrainerAlias(button.dataset.key, button.dataset.name));
    };
    reader.readAsText(file);
    return true;
  };

  function reviewLabel(kind) {
    return { tier_changed:"Tier changed", expired:"Package expired", cancelled:"Package cancelled",
      unmapped_package:"Package not recognised", competing_packages:"More than one current package",
      missing_twice:"Gone from two exports", duplicate_profiles:"Two records share this address"
    }[kind] || kind;
  }

  function previewHtml(parsed, diff) {
    if (diff.aborted) {
      return '<div class="invite-check bad">✗ This file could not be read as a booking report.</div>'
        + '<div class="storage-note">' + diff.errors.map(escapeHtml).join("<br>") + '</div>'
        + '<div class="storage-note">Nothing was changed, and no client was marked missing.</div>';
    }
    const counts = '<div class="advanced-stat-grid">'
      + statTile(diff.created.length, "new client" + (diff.created.length === 1 ? "" : "s"))
      + statTile(diff.updated.length, "to update")
      + statTile(diff.unchanged.length, "unchanged")
      + statTile(diff.missing.length, "not in this file")
      + '</div>';

    const repeat = diff.alreadyImported
      ? '<div class="invite-check ok">✓ This is the same file you last applied, so nobody is counted absent again.</div>' : "";

    const created = diff.created.length ? '<div class="booking-import-group"><b>Would be created</b>'
      + diff.created.map((item) => '<div class="booking-import-row"><span>' + escapeHtml(item.client.name || item.client.email) + '</span>'
        + '<em>' + escapeHtml(tierLabel(item.client.tierId)) + '</em>'
        + '<small>' + escapeHtml(item.client.email) + ' · no invite email will be sent</small></div>').join("") + '</div>' : "";

    const updated = diff.updated.length ? '<div class="booking-import-group"><b>Would change</b>'
      + diff.updated.map((item) => '<div class="booking-import-row"><span>' + escapeHtml(item.client.name || item.client.email) + '</span>'
        + '<small>' + item.changes.map((change) => escapeHtml(change.field + ": " + change.from + " → " + change.to)).join("<br>") + '</small></div>').join("") + '</div>' : "";

    const review = diff.review.length ? '<div class="booking-import-group warn"><b>Needs a decision</b>'
      + diff.review.map((item) => '<div class="booking-import-row"><span>' + escapeHtml(reviewLabel(item.kind)) + '</span>'
        + '<small>' + escapeHtml(item.email) + (item.detail ? " · " + escapeHtml(item.detail) : "")
        + (item.from ? " · " + escapeHtml(item.from + " → " + item.to) : "") + '</small></div>').join("") + '</div>' : "";

    const missing = diff.missing.length ? '<div class="booking-import-group"><b>Not in this file</b>'
      + diff.missing.map((item) => '<div class="booking-import-row"><span>' + escapeHtml(item.email) + '</span>'
        + '<small>' + (item.actionable
          ? "absent " + item.consecutiveMisses + " exports running — confirm they have left"
          : "absent once — nothing happens until a second export also omits them") + '</small></div>').join("") + '</div>' : "";

    const trainers = diff.unresolvedTrainers.length ? '<div class="booking-import-group warn"><b>Trainers needing a link</b>'
      + '<div class="storage-note">The export names trainers but carries no email, so each name is linked to an account once and remembered.</div>'
      + diff.unresolvedTrainers.map((trainer) => '<div class="booking-import-row"><span>' + escapeHtml(trainer.name) + '</span>'
        + '<small>on ' + trainer.count + ' row' + (trainer.count === 1 ? "" : "s") + '</small>'
        + '<button class="mini-btn" data-alias-link data-key="' + escapeHtml(trainer.key) + '" data-name="' + escapeHtml(trainer.name) + '">Link</button></div>').join("") + '</div>' : "";

    const clashes = importedClashes(diff, new Map(loadTrainerAliases().map((a) => [a.normalized_name, a])));
    const clashBlock = clashes.length ? '<div class="booking-import-group warn"><b>Double-booked</b>'
      + '<div class="storage-note">Two clients share a trainer and a time. The export cannot see this; you will need to move one.</div>'
      + clashes.map((c) => '<div class="booking-import-row"><span>' + escapeHtml(c.trainer) + '</span>'
        + '<small>' + escapeHtml(c.when) + ' \u00b7 ' + escapeHtml(c.a) + ' and ' + escapeHtml(c.b) + '</small></div>').join("") + '</div>' : "";
    const problems = (parsed.warnings || []).length ? '<div class="booking-import-group warn"><b>Warnings from the file</b>'
      + parsed.warnings.map((warning) => '<div class="booking-import-row"><small>' + escapeHtml(warning) + '</small></div>').join("") + '</div>' : "";

    const apply = '<div class="tool-actions"><button class="small-btn primary" data-booking-apply>Apply '
      + (diff.created.length + diff.updated.length) + ' change' + ((diff.created.length + diff.updated.length) === 1 ? "" : "s") + '</button></div>'
      + '<div class="storage-note">Applying writes client records on this device and syncs them. It sends no email to anyone.</div>';

    return repeat + counts + created + updated + review + clashBlock + missing + trainers + problems + apply;
  }

  const statTile = (value, label) => '<div class="advanced-stat"><b>' + value + '</b><span>' + escapeHtml(label) + '</span></div>';
  const tierLabel = (id) => id && typeof MEMBERSHIP_TIERS === "object" && MEMBERSHIP_TIERS[id] ? MEMBERSHIP_TIERS[id].label : "No tier set";

  window.linkTrainerAlias = function linkTrainerAlias(key, name) {
    if (!requireTrainerMutation("link a trainer name")) return false;
    const roster = (window.fit4lifeCloudTrainers || []).filter((trainer) => trainer.is_active !== false);
    if (!roster.length) { showToast("No trainer accounts have loaded yet"); return false; }
    const choice = window.prompt("Which account is \"" + name + "\"?\n\n"
      + roster.map((trainer, index) => (index + 1) + ". " + (trainer.display_name || trainer.email)).join("\n")
      + "\n\nEnter a number, or 0 if they have no FIT4LIFE account.");
    if (choice == null) return false;
    const index = Number(choice);
    const aliases = loadTrainerAliases().filter((alias) => alias.normalized_name !== key);
    if (index === 0) aliases.push({ normalized_name:key, source_name:name, trainer_user_id:"", status:"external", resolved_at:new Date().toISOString() });
    else {
      const trainer = roster[index - 1];
      if (!trainer) { showToast("That was not one of the numbers listed"); return false; }
      aliases.push({ normalized_name:key, source_name:name, trainer_user_id:trainer.user_id,
        display_name:trainer.display_name || trainer.email, email:trainer.email || "", status:"linked", resolved_at:new Date().toISOString() });
    }
    writeJson(ALIAS_KEY, aliases);
    showToast("Linked " + name);
    if (pending) window.readBookingExportFile({ files:[] }), refreshPreviewFromPending();
    return true;
  };

  function refreshPreviewFromPending() {
    if (!pending) return;
    pending.diff = window.diffBookingImport(pending.parsed, {
      profiles: loadProfiles(), previousState: loadImportState(), trainerAliases: loadTrainerAliases() });
    const out = byId("bookingImportPreview"); if (!out) return;
    out.innerHTML = previewHtml(pending.parsed, pending.diff);
    bindDataHandlers(out, "[data-booking-apply]", () => applyBookingImport());
    bindDataHandlers(out, "[data-alias-link]", (button) => linkTrainerAlias(button.dataset.key, button.dataset.name));
  }

  window.applyBookingImport = function applyBookingImport() {
    if (!pending || pending.diff.aborted) { showToast("Read a booking report first"); return false; }
    if (!requireTrainerMutation("import clients from the booking report")) return false;
    const diff = pending.diff;
    const total = diff.created.length + diff.updated.length;
    if (!window.confirm("Apply " + total + " change" + (total === 1 ? "" : "s") + " from " + pending.fileName
      + "?\n\nThis writes client records on this device. No email is sent to anyone.")) return false;

    const profiles = loadProfiles();
    const aliases = new Map(loadTrainerAliases().map((alias) => [alias.normalized_name, alias]));
    let createdCount = 0, updatedCount = 0;
    const skipped = [];

    diff.created.forEach((item) => {
      const client = item.client;
      const cap = client.tierId && MEMBERSHIP_TIERS[client.tierId] ? MEMBERSHIP_TIERS[client.tierId].programmedDays : 0;
      const alias = aliases.get(client.trainerKey);
      const record = profileRecordFromTarget({
        name: client.name, email: client.email, bookingEmail: client.email, phone: client.phone,
        membershipTier: client.tierId,
        sessionsPerWeek: client.sessionsPerWeek || (client.tierId && MEMBERSHIP_TIERS[client.tierId] ? MEMBERSHIP_TIERS[client.tierId].sessionsPerWeek : 0),
        programmedDays: cap, bookingStatus: client.status,
        assignedTrainerName: client.trainerName || "",
        assignedTrainerId: alias && alias.trainer_user_id || "",
        assignedTrainerEmail: alias && alias.email || "",
        onboardingStatus: "imported", importedAt: new Date().toISOString(),
        goals: ["general"], experience: 1, age: 30, minutes: 60,
        muscles: [], injuries: [], zones: [], preferences: {}, cardioModes: ["any"],
        trainingDays: soloTrainingDays(client), limitationAssessments: {}
      }, client.name, "");
      const clash = findProfileConflict(profiles, record.name, record.username);
      if (clash) { skipped.push({ name:client.name, email:client.email, reason:clash.reason === "similar"
        ? "a very similar client name already exists" : "that name or username is already taken" }); return; }
      record.id = "profile-imported-" + Date.now() + "-" + Math.random().toString(16).slice(2);
      record.updatedAt = new Date().toISOString();
      profiles.unshift(record); createdCount++;
    });

    // A client who cancels or expires keeps every future session that was already
    // generated for them - phantom appointments that still count toward owed sessions and
    // still mark a solo day as a trainer day, so the report the calendar exists to produce
    // comes out wrong. Their FUTURE bookings are cancelled; the past is history and stays.
    const leaving = [...diff.created.map((i) => i.client), ...diff.updated.map((i) => i.client)]
      .filter((client) => ["cancelled","expired"].includes(client.status));
    let retired = 0;
    if (leaving.length) {
      const todayKey = new Date().toISOString().slice(0,10);
      const byBooking = new Map(profiles.filter((p) => p.bookingEmail || p.email)
        .map((p) => [String(p.bookingEmail || p.email).toLowerCase(), p.id]));
      const events = loadCalendarEvents().map((event) => {
        const owner = leaving.find((client) => byBooking.get(client.email) === event.profileId);
        if (!owner || event.date < todayKey || event.status === "cancelled") return event;
        retired++;
        return { ...event, status:"cancelled",
          cancelReason:"Membership " + owner.status + " in the booking report" };
      });
      if (retired) writeLocalArray(CALENDAR_EVENTS_KEY, events, 2000);
    }

    diff.updated.forEach((item) => {
      const index = profiles.findIndex((profile) => profile.id === item.profileId); if (index < 0) return;
      const client = item.client, current = profiles[index];
      const cap = client.tierId && MEMBERSHIP_TIERS[client.tierId] ? MEMBERSHIP_TIERS[client.tierId].programmedDays : 0;
      const alias = aliases.get(client.trainerKey);
      // Only the fields Jason's side owns. Goals, injuries, workouts and feedback are the
      // app's and are never touched by an import.
      const next = { ...current, name: client.name || current.name, phone: client.phone || current.phone,
        bookingEmail: client.email, bookingStatus: client.status,
        assignedTrainerName: client.trainerName || current.assignedTrainerName,
        importedAt: new Date().toISOString() };
      if (alias && alias.trainer_user_id) { next.assignedTrainerId = alias.trainer_user_id; next.assignedTrainerEmail = alias.email || current.assignedTrainerEmail; }
      if (client.tierId) {
        next.membershipTier = client.tierId;
        next.sessionsPerWeek = client.sessionsPerWeek != null ? client.sessionsPerWeek : next.sessionsPerWeek;
        // The cap moves with the tier, but nothing already built is deleted - a surplus
        // shows up in the review list for a trainer to decide on.
        const existing = Number(current.programmedDays) || 0;
        next.programmedDays = cap ? Math.min(existing || cap, cap) : existing;
      }
      profiles[index] = next; updatedCount++;
    });

    if (!writeProfiles(profiles)) { showToast("The import could not be saved. Nothing was changed."); return false; }
    const bookings = applyImportedBookings(diff, profiles, aliases);
    // A skipped client must not be remembered as imported, or they are never created and
    // never reported absent on any later run - they just quietly cease to exist.
    const skippedEmails = new Set(skipped.map((item) => item.email));
    const carried = { ...pending.diff.nextState,
      knownEmails:(pending.diff.nextState.knownEmails || []).filter((email) => !skippedEmails.has(email)) };
    const state = { ...carried, lastImportedAt:new Date().toISOString(),
      history:[{ at:new Date().toISOString(), file:pending.fileName, created:createdCount, updated:updatedCount },
        ...(loadImportState().history || [])].slice(0, 20) };
    writeJson(IMPORT_KEY, state);
    if (typeof window.fit4lifeCloudSaveProfileNow === "function") window.fit4lifeCloudSaveProfileNow();
    refreshProfileSelects();
    showToast("Imported — " + createdCount + " created, " + updatedCount + " updated, "
      + bookings + " booking" + (bookings === 1 ? "" : "s") + " on the calendar"
      + (retired ? ", " + retired + " future session" + (retired === 1 ? "" : "s") + " cancelled" : "")
      + (skipped.length ? ", " + skipped.length + " could not be created" : "") + ". No emails sent.");
    pending = null;
    const out = byId("bookingImportPreview");
    if (out) out.innerHTML = '<div class="invite-check ok">\u2713 Applied. ' + createdCount + ' created, ' + updatedCount + ' updated, '
      + bookings + ' booking' + (bookings === 1 ? '' : 's') + ' on the calendar. No email sent.</div>'
      + (skipped.length ? '<div class="booking-import-group warn"><b>Not created \u2014 needs your attention</b>'
        + skipped.map((item) => '<div class="booking-import-row"><span>' + escapeHtml(item.name || item.email) + '</span>'
          + '<small>' + escapeHtml(item.email) + ' \u00b7 ' + escapeHtml(item.reason)
          + '. Rename the existing client, or add this one by hand.</small></div>').join("") + '</div>' : '');
    return true;
  };

  // Only sessions and consultations - a trainer is present for both, and those are the only
  // things the user wants on the main calendar. Programmed workouts a client does alone stay
  // off it. Recurring weekly slots are generated across a rolling horizon, because "Monday
  // 4:00 PM" repeats forever and something has to bound it.
  const RECURRING_WEEKS_AHEAD = 8;
  function applyImportedBookings(diff, profiles, aliases) {
    if (typeof loadCalendarEvents !== "function") return 0;
    const byEmail = new Map(profiles.filter((p) => p.bookingEmail || p.email)
      .map((p) => [String(p.bookingEmail || p.email).toLowerCase(), p]));
    const events = loadCalendarEvents();
    const seen = new Set(events.map((event) => event.sourceKey).filter(Boolean));
    const clients = [...diff.created.map((item) => item.client), ...diff.updated.map((item) => item.client)];
    let added = 0;

    clients.forEach((client) => {
      const profile = byEmail.get(client.email); if (!profile) return;
      const alias = aliases.get(client.trainerKey);
      const base = { source:"calendar", profileId:profile.id, client:profile.name,
        trainerId: alias && alias.trainer_user_id || "", trainerName: client.trainerName || "",
        status:"scheduled", importedFrom:"booking_report" };

      client.appointments.forEach((slot) => {
        // Keyed on the booking itself, so re-importing the same export never duplicates it.
        const key = "booking:" + client.email + ":" + slot.date + ":" + slot.startTime + ":" + slot.kind;
        if (seen.has(key)) return;
        seen.add(key); added++;
        events.unshift({ ...base, id:"calendar-event-import-" + Date.now() + "-" + added,
          sourceKey:key, type:slot.kind, date:slot.date, startTime:slot.startTime, endTime:slot.endTime,
          title:(slot.kind === "consultation" ? "Consultation" : "Training session") + " \u00b7 " + profile.name });
      });

      client.recurring.forEach((slot) => {
        for (let week = 0; week < RECURRING_WEEKS_AHEAD; week++) {
          const date = nextWeekdayKey(slot.weekday, week);
          const key = "booking-weekly:" + client.email + ":" + slot.weekday + ":" + slot.startTime + ":" + date;
          if (seen.has(key)) continue;
          seen.add(key); added++;
          events.unshift({ ...base, id:"calendar-event-import-" + Date.now() + "-w" + added,
            sourceKey:key, type:"appointment", date, startTime:slot.startTime, endTime:slot.endTime,
            recurringSlot:true, title:"Training session \u00b7 " + profile.name });
        }
      });
    });

    if (added && typeof writeLocalArray === "function") writeLocalArray(CALENDAR_EVENTS_KEY, events, 2000);
    return added;
  }
  function nextWeekdayKey(weekday, weeksAhead) {
    const today = new Date(); today.setHours(12,0,0,0);
    const delta = (weekday - today.getDay() + 7) % 7;
    const when = new Date(today.getTime()); when.setDate(today.getDate() + delta + weeksAhead * 7);
    return when.getFullYear() + "-" + String(when.getMonth() + 1).padStart(2,"0") + "-" + String(when.getDate()).padStart(2,"0");
  }

  // The days they are with a trainer come from the export. Solo workouts are placed on the
  // OTHER days, so a programmed session is never stacked on a day they are already training.
  function soloTrainingDays(client) {
    const booked = new Set();
    (client.recurring || []).forEach((slot) => booked.add(Number(slot.weekday)));
    (client.appointments || []).forEach((slot) => {
      const when = new Date(slot.date + "T12:00:00");
      if (!isNaN(when)) booked.add(when.getDay());
    });
    if (!booked.size) return [1,3,5];
    const free = [1,2,3,4,5,6,0].filter((day) => !booked.has(day));
    const wanted = client.tierId && typeof MEMBERSHIP_TIERS === "object" && MEMBERSHIP_TIERS[client.tierId]
      ? MEMBERSHIP_TIERS[client.tierId].programmedDays : 3;
    // Spread across the free days rather than clustering at the start of the week.
    if (!free.length) return [1,3,5];
    const step = Math.max(1, Math.floor(free.length / Math.max(1, wanted)));
    const picked = [];
    for (let i = 0; i < free.length && picked.length < wanted; i += step) picked.push(free[i]);
    return picked.length ? picked : free.slice(0, wanted);
  }

  // Two clients booked with the same trainer at the same hour is a real scheduling problem
  // the export cannot see. The app only checked clashes when a human saved an event, so an
  // import could create dozens at once in silence - and a repeating slot repeats the clash.
  function importedClashes(diff, aliases) {
    const slots = new Map(), clashes = [];
    const clients = [...diff.created.map((i) => i.client), ...diff.updated.map((i) => i.client)];
    clients.forEach((client) => {
      const who = (aliases.get(client.trainerKey) || {}).display_name || client.trainerName || "(unassigned)";
      const note = (date, time, weekly) => {
        const key = who + "|" + date + "|" + time;
        if (slots.has(key) && slots.get(key) !== client.email) {
          clashes.push({ trainer:who, when:(weekly ? "every " + weekly + " at " : date + " ") + time,
            a:slots.get(key), b:client.email });
        } else slots.set(key, client.email);
      };
      (client.appointments || []).forEach((slot) => note(slot.date, slot.startTime, ""));
      (client.recurring || []).forEach((slot) => note("weekly-" + slot.weekday, slot.startTime, slot.weekdayName));
    });
    return clashes;
  }

  window.bookingImportPanelHtml = bookingImportPanelHtml;
  window.loadBookingImportState = loadImportState;
})();
