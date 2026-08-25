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

    const problems = (parsed.warnings || []).length ? '<div class="booking-import-group warn"><b>Warnings from the file</b>'
      + parsed.warnings.map((warning) => '<div class="booking-import-row"><small>' + escapeHtml(warning) + '</small></div>').join("") + '</div>' : "";

    const apply = '<div class="tool-actions"><button class="small-btn primary" data-booking-apply>Apply '
      + (diff.created.length + diff.updated.length) + ' change' + ((diff.created.length + diff.updated.length) === 1 ? "" : "s") + '</button></div>'
      + '<div class="storage-note">Applying writes client records on this device and syncs them. It sends no email to anyone.</div>';

    return repeat + counts + created + updated + review + missing + trainers + problems + apply;
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
        muscles: [], injuries: [], zones: [], preferences: {}, cardioModes: ["any"], trainingDays: [1,3,5], limitationAssessments: {}
      }, client.name, "");
      if (findProfileConflict(profiles, record.name, record.username)) return;   // never create a near-duplicate
      record.id = "profile-imported-" + Date.now() + "-" + Math.random().toString(16).slice(2);
      record.updatedAt = new Date().toISOString();
      profiles.unshift(record); createdCount++;
    });

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
    const state = { ...pending.diff.nextState, lastImportedAt:new Date().toISOString(),
      history:[{ at:new Date().toISOString(), file:pending.fileName, created:createdCount, updated:updatedCount },
        ...(loadImportState().history || [])].slice(0, 20) };
    writeJson(IMPORT_KEY, state);
    if (typeof window.fit4lifeCloudSaveProfileNow === "function") window.fit4lifeCloudSaveProfileNow();
    refreshProfileSelects();
    showToast("Imported — " + createdCount + " created, " + updatedCount + " updated. No emails sent.");
    pending = null;
    const out = byId("bookingImportPreview");
    if (out) out.innerHTML = '<div class="invite-check ok">✓ Applied. ' + createdCount + ' created, ' + updatedCount + ' updated, no email sent.</div>';
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

  window.bookingImportPanelHtml = bookingImportPanelHtml;
  window.loadBookingImportState = loadImportState;
})();
