/* FIT4LIFE - Jason's booking export: parser (phase 2) and diff engine (phase 3).
   Deliberately pure. No DOM, no localStorage, no Supabase - everything arrives as an
   argument and leaves as a return value, so the whole pipeline can be exercised offline
   against the real file before any of it is allowed near a client record. */
(function () {
  "use strict";

  /* ---------- CSV ---------- */
  // Written out rather than split(",") because Chosen Times is a quoted field containing
  // commas ("Sat, Aug 22 ...") - a naive split silently shears every schedule in half.
  function parseCsv(text) {
    const rows = []; let row = [], field = "", quoted = false;
    const src = String(text || "").replace(/^\uFEFF/, "");  // strip the BOM Jason's file starts with
    for (let i = 0; i < src.length; i++) {
      const ch = src[i];
      if (quoted) {
        if (ch === '"') { if (src[i + 1] === '"') { field += '"'; i++; } else quoted = false; }
        else field += ch;
        continue;
      }
      if (ch === '"') { quoted = true; continue; }
      if (ch === ",") { row.push(field); field = ""; continue; }
      if (ch === "\r") continue;
      if (ch === "\n") { row.push(field); rows.push(row); row = []; field = ""; continue; }
      field += ch;
    }
    if (field.length || row.length) { row.push(field); rows.push(row); }
    return rows.filter((entry) => entry.some((cell) => String(cell).trim() !== ""));
  }

  function fileFingerprint(text) {
    // Idempotency key. The export carries no last_updated and no start_date, so there is
    // nothing per-record to compare - the whole file is the unit.
    let hash = 2166136261;
    const src = String(text || "");
    for (let i = 0; i < src.length; i++) { hash ^= src.charCodeAt(i); hash = Math.imul(hash, 16777619); }
    return (hash >>> 0).toString(16).padStart(8, "0") + ":" + src.length;
  }

  const normalizeEmail = (value) => String(value == null ? "" : value).trim().toLowerCase();
  // Deliberately weak: case, whitespace and curly apostrophes only. Nothing that would
  // collapse "Darick R. Carpenter" into "Darick Carpenter" - two people can share a name,
  // and guessing they are the same is exactly the failure this key exists to prevent.
  const normalizeName = (value) => String(value == null ? "" : value)
    .normalize("NFKC").replace(/[‘’]/g, "'").trim().replace(/\s+/g, " ").toLowerCase();

  /* ---------- package -> tier ---------- */
  const PLAN_TO_TIER = {
    flex:    { 1:"flex_1", 2:"flex_2" },
    bronze:  { "*":"starter" },
    silver:  { "*":"standard" },
    gold:    { "*":"premium" },
    partner: { 1:"partner_1", 2:"partner_2" }
  };
  const STANDALONE_PACKAGES = {
    "4-session pack":"payg_4pack", "4 session pack":"payg_4pack",
    "single session":"payg_single", "one session":"payg_single",
    "kickstart bundle":"payg_kickstart", "kickstart":"payg_kickstart"
  };

  // hasOwnProperty, not bracket lookup: a package literally called "constructor" would
  // otherwise return Object's constructor as the tier id, with unmapped:false.
  const own = (table,key) => Object.prototype.hasOwnProperty.call(table,key) ? table[key] : undefined;

  function parsePackage(raw) {
    // Whitespace is collapsed the same way trainer names are, so "Single  Session" with a
    // stray double space is still recognised instead of dropping to unmapped.
    const text = String(raw == null ? "" : raw).normalize("NFKC").trim().replace(/\s+/g," ");
    const out = { raw:text, plan:"", sessionsPerWeek:null, tierId:"", unmapped:false };
    if (!text) { out.unmapped = true; return out; }

    const standalone = own(STANDALONE_PACKAGES,text.toLowerCase());
    if (standalone) { out.plan = text; out.tierId = standalone; out.sessionsPerWeek = 0; return out; }

    // "Bronze — 1 session / week" - em dash, en dash or hyphen, because the wording is a
    // display string on Jason's side and nobody promised which dash it uses.
    const split = text.split(/\s*[—–-]\s*/);
    out.plan = (split[0] || "").trim();
    const sessions = text.match(/(\d+)\s*sessions?\s*\/\s*week/i);
    out.sessionsPerWeek = sessions ? Number(sessions[1]) : null;

    // A decorated pack name ("Kickstart bundle - Aug") still resolves: the table is tried
    // against the part before the dash as well as the whole string.
    const decorated = own(STANDALONE_PACKAGES,out.plan.toLowerCase());
    if (decorated) { out.tierId = decorated; out.sessionsPerWeek = 0; return out; }

    const table = own(PLAN_TO_TIER,out.plan.toLowerCase());
    if (table) {
      out.tierId = own(table,"*") || (out.sessionsPerWeek != null ? own(table,String(out.sessionsPerWeek)) || own(table,out.sessionsPerWeek) : "") || "";
    }
    if (typeof out.tierId !== "string") out.tierId = "";
    if (!out.tierId) out.unmapped = true;
    return out;
  }

  const STATUS_MAP = { active:"active", expired:"expired", cancelled:"cancelled",
    canceled:"cancelled", pendingpayment:"pending_payment", "pending payment":"pending_payment" };
  function parseStatus(raw) {
    return STATUS_MAP[String(raw == null ? "" : raw).trim().toLowerCase()] || "unknown";
  }

  /* ---------- Chosen Times ---------- */
  const MONTHS = { jan:0,feb:1,mar:2,apr:3,may:4,jun:5,jul:6,aug:7,sep:8,oct:9,nov:10,dec:11 };
  const WEEKDAYS = ["sunday","monday","tuesday","wednesday","thursday","friday","saturday"];

  function parseClock(raw) {
    const match = String(raw || "").trim().match(/^(\d{1,2}):(\d{2})\s*([AaPp])\.?[Mm]\.?$/);
    if (!match) return null;
    let hour = Number(match[1]) % 12;
    if (match[3].toLowerCase() === "p") hour += 12;
    return hour * 60 + Number(match[2]);
  }
  // Wrapped, because start + 60 on an 11:30 PM slot produced "24:30" - not a time, and
  // Invalid Date to anything downstream that builds a Date from it.
  const clockLabel = (mins) => {
    if (mins == null) return "";
    const wrapped = ((Math.round(mins) % 1440) + 1440) % 1440;
    return String(Math.floor(wrapped / 60)).padStart(2, "0") + ":" + String(wrapped % 60).padStart(2, "0");
  };

  // The export gives no year. Choose the one that lands the date nearest the import, so a
  // December export referencing "Jan 4" resolves forward instead of eleven months back.
  function resolveYear(month, day, reference, weekday) {
    const ref = reference instanceof Date ? reference : new Date(reference);
    const base = ref.getFullYear();
    const candidates = [base - 1, base, base + 1].map((year) => {
      const when = new Date(year, month, day, 12);
      return { year, gap:Math.abs(when.getTime() - ref.getTime()), matches:weekday == null || when.getDay() === weekday };
    });
    // The export prints the weekday next to the date. Only one nearby year can satisfy it,
    // so it settles the year outright instead of guessing by nearness - which silently
    // mis-dated every row once an export was more than six months old.
    const agreeing = candidates.filter((item) => item.matches);
    const pool = agreeing.length ? agreeing : candidates;
    return pool.reduce((best, item) => item.gap < best.gap ? item : best, pool[0]).year;
  }

  function parseChosenTimes(raw, options) {
    const settings = options || {};
    const reference = settings.reference ? new Date(settings.reference) : new Date();
    const defaultMinutes = Number(settings.defaultMinutes) || 60;
    const out = { recurring:[], appointments:[], warnings:[] };
    String(raw == null ? "" : raw).split(";").map((token) => token.trim()).filter(Boolean).forEach((token) => {
      // "Sat, Aug 22 3:30 PM-4:30 PM · Consult"
      const dated = token.match(/^([A-Za-z]{3,9}),\s*([A-Za-z]{3,9})\s+(\d{1,2})\s+(\d{1,2}:\d{2}\s*[AaPp]\.?[Mm]\.?)\s*[–—-]\s*(\d{1,2}:\d{2}\s*[AaPp]\.?[Mm]\.?)\s*·\s*(.+)$/);
      if (dated) {
        const month = MONTHS[dated[2].slice(0, 3).toLowerCase()];
        const day = Number(dated[3]);
        const start = parseClock(dated[4]);
        let end = parseClock(dated[5]);
        if (month == null || !day || start == null) { out.warnings.push('Could not read the date in "' + token + '"'); return; }
        // A booking that ends "before" it starts has crossed midnight; the stated end time is
        // real and must not be thrown away and replaced with an invented duration.
        if (end != null && end < start) end += 1440;
        const weekdayIndex = WEEKDAYS.findIndex((name) => name.slice(0,3) === dated[1].slice(0,3).toLowerCase());
        const year = resolveYear(month, day, reference, weekdayIndex < 0 ? null : weekdayIndex);
        const kind = /consult/i.test(dated[6]) ? "consultation" : "appointment";
        // A zero-length booking exists in the real file (12:30 PM-12:30 PM); treat the end
        // as unknown rather than inventing a duration that contradicts what was booked.
        const finish = end != null && end > start ? end : null;
        out.appointments.push({
          date: year + "-" + String(month + 1).padStart(2, "0") + "-" + String(day).padStart(2, "0"),
          startTime: clockLabel(start),
          endTime: clockLabel(finish != null ? finish : start + defaultMinutes),
          endTimeAssumed: finish == null,
          endsNextDay: (finish != null ? finish : start + defaultMinutes) >= 1440,
          yearAssumed: true, kind, label: dated[6].trim(), raw: token
        });
        return;
      }
      // "Monday 4:00 PM" - a repeating slot with no end and no date.
      const weekly = token.match(/^([A-Za-z]+)\s+(\d{1,2}:\d{2}\s*[AaPp]\.?[Mm]\.?)$/);
      if (weekly) {
        const weekday = WEEKDAYS.indexOf(weekly[1].toLowerCase());
        const start = parseClock(weekly[2]);
        if (weekday < 0 || start == null) { out.warnings.push('Could not read the weekly slot "' + token + '"'); return; }
        out.recurring.push({ weekday, weekdayName: WEEKDAYS[weekday], startTime: clockLabel(start),
          endTime: clockLabel(start + defaultMinutes), endTimeAssumed: true,
          endsNextDay: start + defaultMinutes >= 1440, raw: token });
        return;
      }
      out.warnings.push('Unrecognised entry in Chosen Times: "' + token + '"');
    });
    return out;
  }

  /* ---------- phase 2: parse ---------- */
  const REQUIRED_COLUMNS = ["Member","Email","Package","Trainer","Chosen Times","Status"];

  function parseBookingExport(text, options) {
    const settings = options || {};
    const result = { ok:false, fingerprint:fileFingerprint(text), rows:[], clients:[],
      trainerNames:[], warnings:[], errors:[] };
    const grid = parseCsv(text);
    if (!grid.length) { result.errors.push("The file is empty."); return result; }

    const header = grid[0].map((cell) => String(cell).trim());
    const missing = REQUIRED_COLUMNS.filter((name) => !header.includes(name));
    if (missing.length) {
      result.errors.push("These expected columns are missing: " + missing.join(", ")
        + ". Found: " + header.join(", ") + ".");
      return result;
    }
    const index = (name) => header.indexOf(name);

    grid.slice(1).forEach((cells, position) => {
      const value = (name) => String(cells[index(name)] == null ? "" : cells[index(name)]).trim();
      const email = normalizeEmail(value("Email"));
      const pkg = parsePackage(value("Package"));
      const status = parseStatus(value("Status"));
      const times = parseChosenTimes(value("Chosen Times"), settings);
      const row = {
        line: position + 2, name: value("Member"), email, phone: value("Phone"),
        packageRaw: pkg.raw, plan: pkg.plan, tierId: pkg.tierId,
        sessionsPerWeek: pkg.sessionsPerWeek, unmappedPackage: pkg.unmapped,
        trainerName: value("Trainer"), trainerKey: normalizeName(value("Trainer")),
        status, statusRaw: value("Status"), nextRenewal: value("Next Renewal"),
        recurring: times.recurring, appointments: times.appointments
      };
      // A row with no email cannot be matched to anyone, but it must not take the rest of
      // the file down with it - a stray line should never block importing everyone else.
      if (!email) { result.warnings.push("Row " + row.line + " has no email address and was skipped."); row.skipped = true; }
      if (pkg.unmapped) result.warnings.push('Row ' + row.line + ': package "' + pkg.raw + '" does not match any tier and needs a decision.');
      if (status === "unknown") result.warnings.push('Row ' + row.line + ': status "' + row.statusRaw + '" is not one this app knows.');
      times.warnings.forEach((warning) => result.warnings.push("Row " + row.line + ": " + warning));
      result.rows.push(row);
    });

    const usable = result.rows.filter((row) => !row.skipped);
    result.skippedRows = result.rows.length - usable.length;
    result.clients = collapseRows(usable, result.warnings);
    result.trainerNames = distinctTrainers(usable);
    // Only a structural problem - wrong columns, an empty file, nothing usable at all -
    // stops the import. Individual bad rows are reported and stepped over.
    if (!usable.length) result.errors.push("No row in this file had an email address, so nothing could be matched.");
    result.ok = result.errors.length === 0;
    return result;
  }

  // Live rows are what a client currently holds. Expired and cancelled rows are history and
  // must never define someone's tier - but they are kept, because "cancelled" is the signal
  // that drives the renew prompt.
  const LIVE = ["active","pending_payment"];

  // Ranking, because row order is not a fact about the client. The real export lists an
  // active Bronze before an active Gold, and taking the first row downgraded a Gold client
  // to Bronze with no warning. Order: a live row beats a dead one, active beats awaiting
  // payment, a real membership beats a one-off pack, and more trainer days beats fewer.
  function rankRow(row) {
    const live = LIVE.includes(row.status) ? 1000 : 0;
    const active = row.status === "active" ? 400 : 0;
    const mapped = row.tierId ? 200 : 0;
    const membership = row.tierId && row.tierId.indexOf("payg_") !== 0 ? 100 : 0;
    return live + active + mapped + membership + (Number(row.sessionsPerWeek) || 0);
  }

  function collapseRows(rows, warnings) {
    const byEmail = new Map();
    rows.forEach((row) => {
      if (!row.email) return;
      if (!byEmail.has(row.email)) byEmail.set(row.email, []);
      byEmail.get(row.email).push(row);
    });
    return [...byEmail.entries()].map(([email, group]) => {
      const ranked = group.slice().sort((a, b) => rankRow(b) - rankRow(a));
      const live = group.filter((row) => LIVE.includes(row.status));
      const liveRanked = ranked.filter((row) => LIVE.includes(row.status));
      // Identity may come from any row, but the TIER may only ever come from a live one -
      // an expired package must not define what someone is entitled to today.
      const chosen = liveRanked[0] || ranked[0];
      const tierSource = liveRanked[0] || null;

      const competing = liveRanked.filter((row) => row.tierId && row.tierId !== (tierSource && tierSource.tierId));
      if (tierSource && competing.length) {
        warnings.push(email + " holds " + (competing.length + 1) + " current packages ("
          + [tierSource, ...competing].map((row) => row.packageRaw).join(", ") + "). Using \""
          + tierSource.packageRaw + "\" - confirm which is right.");
      }
      if (!tierSource && group.some((row) => row.tierId)) {
        warnings.push(email + " has no current package (" + [...new Set(group.map((row) => row.status))].join(", ")
          + "), so no tier was taken from this export.");
      }

      // Appointments come from every live row - a client can hold a membership and a session
      // pack at once and both are real bookings. The key carries the end time and the label
      // too, because two genuinely different sessions can share a start.
      const appointments = [], seen = new Set();
      live.forEach((row) => row.appointments.forEach((item) => {
        const key = [item.date, item.startTime, item.endTime, item.kind, item.label].join("|");
        if (!seen.has(key)) { seen.add(key); appointments.push({ ...item, sourcePackage:row.packageRaw, sourceStatus:row.status }); }
      }));
      const recurring = [], seenSlots = new Set();
      live.forEach((row) => row.recurring.forEach((item) => {
        const key = item.weekday + "|" + item.startTime + "|" + item.endTime;
        if (!seenSlots.has(key)) { seenSlots.add(key); recurring.push({ ...item, sourcePackage:row.packageRaw }); }
      }));
      const droppedBookings = group.filter((row) => !LIVE.includes(row.status))
        .reduce((sum, row) => sum + row.appointments.length + row.recurring.length, 0);
      if (!live.length && droppedBookings) {
        warnings.push(email + " has " + droppedBookings + " booking(s) on expired or cancelled packages, which were not imported.");
      }

      return {
        email, name: chosen.name, phone: chosen.phone,
        tierId: tierSource ? tierSource.tierId : "",
        packageRaw: tierSource ? tierSource.packageRaw : chosen.packageRaw,
        sessionsPerWeek: tierSource ? tierSource.sessionsPerWeek : null,
        unmappedPackage: tierSource ? tierSource.unmappedPackage : false,
        trainerName: chosen.trainerName, trainerKey: chosen.trainerKey,
        status: chosen.status, nextRenewal: chosen.nextRenewal,
        appointments, recurring,
        rowCount: group.length, competingPackages: competing.length > 0,
        droppedBookings, historyStatuses: group.map((row) => row.status)
      };
    });
  }

  function distinctTrainers(rows) {
    const seen = new Map();
    rows.forEach((row) => {
      if (!row.trainerKey) return;
      if (!seen.has(row.trainerKey)) seen.set(row.trainerKey, { key:row.trainerKey, name:row.trainerName, count:0 });
      seen.get(row.trainerKey).count++;
    });
    return [...seen.values()].sort((a, b) => b.count - a.count);
  }

  /* ---------- phase 3: diff ---------- */
  // Jason's side owns these; FIT4LIFE owns everything else on a profile and must never have
  // its coaching data overwritten by an import.

  function diffBookingImport(parsed, options) {
    const settings = options || {};
    const profiles = Array.isArray(settings.profiles) ? settings.profiles : [];
    const previous = settings.previousState || { fingerprint:"", missCounts:{}, knownEmails:[] };
    const missThreshold = Number(settings.missThreshold) || 2;

    const diff = { fingerprint:parsed && parsed.fingerprint || "", alreadyImported:false, aborted:false,
      created:[], updated:[], unchanged:[], missing:[], review:[], unresolvedTrainers:[],
      errors:[], nextState:previous };

    // A file that failed to parse describes nothing. Without this the whole roster looked
    // absent and every client marched toward the two-miss threshold on a bad download.
    if (!parsed || !parsed.ok) {
      diff.aborted = true;
      diff.errors = (parsed && parsed.errors) || ["The export could not be read."];
      return diff;
    }
    diff.alreadyImported = previous.fingerprint === parsed.fingerprint;

    // Both addresses are indexed: a client whose booking email differs from their login was
    // otherwise re-created as a duplicate every single import.
    const byEmail = new Map(), duplicates = new Set();
    profiles.forEach((profile) => {
      [profile.bookingEmail, profile.email].forEach((address) => {
        const key = normalizeEmail(address);
        if (!key) return;
        if (byEmail.has(key) && byEmail.get(key).id !== profile.id) duplicates.add(key);
        else if (!byEmail.has(key)) byEmail.set(key, profile);
      });
    });
    duplicates.forEach((email) => diff.review.push({ kind:"duplicate_profiles", email,
      detail:"More than one client record uses this address. Merge them before importing, or the wrong one will be updated." }));

    const touched = new Set();
    parsed.clients.forEach((client) => {
      if (duplicates.has(client.email)) { diff.unchanged.push({ email:client.email, reason:"more than one client record uses this address" }); return; }
      const profile = byEmail.get(client.email);
      if (!profile) {
        if (!LIVE.includes(client.status)) { diff.unchanged.push({ email:client.email, reason:"not a live package, and no existing client to update" }); return; }
        touched.add(client.email);
        diff.created.push({ client, invite:false });
        if (client.unmappedPackage || !client.tierId) diff.review.push({ kind:"unmapped_package", email:client.email, detail:client.packageRaw });
        if (client.competingPackages) diff.review.push({ kind:"competing_packages", email:client.email, detail:client.packageRaw });
        return;
      }
      touched.add(client.email);
      const changes = [];
      const currentTier = typeof normalizeMembershipTier === "function"
        ? normalizeMembershipTier(profile.membershipTier) : profile.membershipTier;
      if (client.tierId && client.tierId !== currentTier) {
        changes.push({ field:"membershipTier", from:currentTier || "(none)", to:client.tierId });
        // Apply the tier and the new cap, keep every assigned workout, flag the surplus.
        // Nothing a trainer built is deleted on the strength of a CSV.
        diff.review.push({ kind:"tier_changed", email:client.email, from:currentTier || "(none)", to:client.tierId });
      }
      // Every field Jason's side owns is compared. Previously only tier and name were, so a
      // changed trainer or session count silently reported "no upstream field changed".
      if (client.name && client.name !== profile.name) changes.push({ field:"name", from:profile.name, to:client.name });
      if (client.sessionsPerWeek != null && Number(client.sessionsPerWeek) !== Number(profile.sessionsPerWeek || 0)) {
        changes.push({ field:"sessionsPerWeek", from:profile.sessionsPerWeek || 0, to:client.sessionsPerWeek });
      }
      if (client.trainerName && client.trainerName !== (profile.assignedTrainerName || "")) {
        changes.push({ field:"assignedTrainerName", from:profile.assignedTrainerName || "(none)", to:client.trainerName });
      }
      if (client.phone && client.phone !== (profile.phone || "")) changes.push({ field:"phone", from:profile.phone || "(none)", to:client.phone });
      if (client.status !== (profile.bookingStatus || "")) changes.push({ field:"bookingStatus", from:profile.bookingStatus || "(none)", to:client.status });

      if (client.status === "expired") diff.review.push({ kind:"expired", email:client.email, detail:"Ask about renewing or updating payment." });
      if (client.status === "cancelled") diff.review.push({ kind:"cancelled", email:client.email, detail:"Offer to renew if they come back." });
      if (client.unmappedPackage) diff.review.push({ kind:"unmapped_package", email:client.email, detail:client.packageRaw });
      if (client.competingPackages) diff.review.push({ kind:"competing_packages", email:client.email, detail:client.packageRaw });
      if (changes.length) diff.updated.push({ client, profileId:profile.id, changes });
      else diff.unchanged.push({ email:client.email, reason:"no upstream field changed" });
    });

    const seenNow = new Set(parsed.clients.map((client) => client.email));
    // Re-importing the same file is not a second absence. Counting it was enough for ONE
    // truncated export to reach the threshold on its own, defeating the whole rule.
    if (diff.alreadyImported) {
      diff.nextState = { fingerprint:parsed.fingerprint, missCounts:previous.missCounts || {},
        knownEmails:previous.knownEmails || [] };
      diff.unresolvedTrainers = unresolvedTrainerNames(parsed, settings);
      return diff;
    }

    const missCounts = {};
    (previous.knownEmails || []).forEach((email) => {
      if (seenNow.has(email)) return;
      const count = (previous.missCounts && previous.missCounts[email] || 0) + 1;
      missCounts[email] = count;
      diff.missing.push({ email, consecutiveMisses:count, actionable:count >= missThreshold });
      if (count >= missThreshold) diff.review.push({ kind:"missing_twice", email, detail:"Absent from " + count + " exports in a row." });
    });

    diff.unresolvedTrainers = unresolvedTrainerNames(parsed, settings);
    // Only addresses that became a real client are remembered. Recording ones the diff
    // refused to act on produced a missing-twice prompt that could never be cleared.
    diff.nextState = { fingerprint:parsed.fingerprint, missCounts,
      knownEmails:[...new Set([...(previous.knownEmails || []), ...touched])] };
    return diff;
  }

  function unresolvedTrainerNames(parsed, settings) {
    const known = new Map((settings.trainerAliases || []).map((alias) => [alias.normalized_name, alias]));
    return parsed.trainerNames
      .filter((trainer) => { const alias = known.get(trainer.key); return !alias || alias.status === "unresolved"; })
      .map((trainer) => ({ ...trainer, status:"unresolved" }));
  }

  window.parseBookingExport = parseBookingExport;
  window.diffBookingImport = diffBookingImport;
  window.bookingImportInternals = { parseCsv, parsePackage, parseChosenTimes, parseStatus,
    normalizeName, normalizeEmail, fileFingerprint, resolveYear };
})();
