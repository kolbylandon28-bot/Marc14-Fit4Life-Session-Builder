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
  // The two exports name the middle tiers differently for the same three packages:
  // the IT build writes Bronze/Silver/Gold, the booking site writes Starter/Silver/Gold.
  const PLAN_TO_TIER = {
    flex:     { 1:"flex_1", 2:"flex_2" },
    bronze:   { "*":"starter" },
    starter:  { "*":"starter" },
    silver:   { "*":"standard" },
    standard: { "*":"standard" },
    gold:     { "*":"premium" },
    premium:  { "*":"premium" },
    partner:  { 1:"partner_1", 2:"partner_2" }
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

  // Prefix match: the IT export writes "Monday", the booking site writes "Mon". An exact
  // lookup returned -1 and dropped every slot in the second one.
  function weekdayIndex(raw) {
    const key = String(raw == null ? "" : raw).trim().toLowerCase().slice(0, 3);
    return key.length === 3 ? WEEKDAYS.findIndex((name) => name.slice(0, 3) === key) : -1;
  }

  function parseClock(raw) {
    const text = String(raw == null ? "" : raw).trim();
    const half = text.match(/^(\d{1,2}):(\d{2})\s*([AaPp])\.?[Mm]\.?$/);
    if (half) {
      const hour = Number(half[1]), minute = Number(half[2]);
      if (hour < 1 || hour > 12 || minute > 59) return null;
      return ((hour % 12) + (half[3].toLowerCase() === "p" ? 12 : 0)) * 60 + minute;
    }
    // The booking site's Consultation column can carry a 24-hour clock.
    const full = text.match(/^(\d{1,2}):(\d{2})$/);
    if (!full) return null;
    const hour = Number(full[1]), minute = Number(full[2]);
    return hour > 23 || minute > 59 ? null : hour * 60 + minute;
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
        const dow = weekdayIndex(dated[1]);
        const year = resolveYear(month, day, reference, dow < 0 ? null : dow);
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
        const weekday = weekdayIndex(weekly[1]);
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

  /* ---------- booking-site columns ---------- */
  // "Tue 9:00 AM". Scanned rather than split on a delimiter: the file carries one slot per
  // row today and nobody promised what separates two. Whatever the scan does not consume is
  // reported with its raw text instead of vanishing.
  const WEEKLY_SCAN = /(sun|mon|tue|wed|thu|fri|sat)[a-z]*\.?,?\s+(\d{1,2}:\d{2}\s*[AaPp]\.?[Mm]\.?|\d{1,2}:\d{2})/gi;
  function parseWeeklyTimes(raw, defaultMinutes, label) {
    const out = { recurring:[], warnings:[] };
    const text = String(raw == null ? "" : raw).trim();
    if (!text) return out;
    let leftover = text, match;
    WEEKLY_SCAN.lastIndex = 0;
    while ((match = WEEKLY_SCAN.exec(text)) != null) {
      const weekday = weekdayIndex(match[1]), start = parseClock(match[2]);
      if (weekday < 0 || start == null) continue;
      leftover = leftover.replace(match[0], " ");
      out.recurring.push({ weekday, weekdayName:WEEKDAYS[weekday], startTime:clockLabel(start),
        endTime:clockLabel(start + defaultMinutes), endTimeAssumed:true,
        endsNextDay:start + defaultMinutes >= 1440, raw:match[0].trim() });
    }
    const rest = leftover.replace(/[;,&|\u00b7\/-]/g, " ").replace(/\band\b/gi, " ").trim();
    if (rest) out.warnings.push('could not read part of ' + label + ': "' + rest + '"');
    return out;
  }

  // "2026-09-04 8:15 AM" - the only fields in either export that carry their own year.
  function parseIsoDateTime(raw) {
    const match = String(raw == null ? "" : raw).trim().match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[T,]|\s)*(.*)$/);
    if (!match) return null;
    const month = Number(match[2]), day = Number(match[3]);
    if (month < 1 || month > 12 || day < 1 || day > 31) return null;
    const clock = match[4].trim(), start = clock ? parseClock(clock) : null;
    if (clock && start == null) return null;
    return { date:match[1] + "-" + String(month).padStart(2,"0") + "-" + String(day).padStart(2,"0"), start };
  }

  // "Mon Aug 31" - a weekday and a date with no year, resolved the same way Chosen Times is.
  function parseShortDate(raw, reference) {
    const text = String(raw == null ? "" : raw).trim();
    if (!text) return "";
    if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(text)) { const iso = parseIsoDateTime(text); return iso ? iso.date : ""; }
    const match = text.match(/^(?:([A-Za-z]{3,9})\.?,?\s+)?([A-Za-z]{3,9})\.?\s+(\d{1,2})(?:,?\s*(\d{4}))?$/);
    if (!match) return "";
    const month = MONTHS[match[2].slice(0,3).toLowerCase()], day = Number(match[3]);
    if (month == null || !day || day > 31) return "";
    const dow = match[1] ? weekdayIndex(match[1]) : -1;
    const year = match[4] ? Number(match[4])
      : resolveYear(month, day, reference instanceof Date ? reference : new Date(reference), dow < 0 ? null : dow);
    return year + "-" + String(month + 1).padStart(2,"0") + "-" + String(day).padStart(2,"0");
  }

  // UNVERIFIED SHAPE: Session times was empty in every row of the export received so far, so
  // it is read permissively - ISO stamps, IT-style dated entries and bare weekly slots all
  // resolve - and anything unreadable is surfaced verbatim rather than dropped.
  function parseSessionTimes(raw, options, label) {
    const settings = options || {};
    const defaultMinutes = Number(settings.defaultMinutes) || 60;
    const out = { appointments:[], recurring:[], warnings:[] };
    const text = String(raw == null ? "" : raw).trim();
    if (!text) return out;
    text.split(/[;\n]/).map((token) => token.trim()).filter(Boolean).forEach((token) => {
      // Split only before a clock, so the hyphens inside "2026-09-04" survive.
      const range = token.split(/\s*[\u2013\u2014-]\s*(?=\d{1,2}:\d{2})/);
      const stamp = parseIsoDateTime(range[0].replace(/\s*\u00b7.*$/, "").trim());
      if (stamp && stamp.start != null) {
        let end = range[1] ? parseClock(range[1].replace(/\s*\u00b7.*$/, "").trim()) : null;
        if (end != null && end < stamp.start) end += 1440;
        const finish = end != null && end > stamp.start ? end : null;
        const close = finish != null ? finish : stamp.start + defaultMinutes;
        out.appointments.push({ date:stamp.date, startTime:clockLabel(stamp.start),
          endTime:clockLabel(close), endTimeAssumed:finish == null, endsNextDay:close >= 1440,
          yearAssumed:false, kind:/consult/i.test(token) ? "consultation" : "appointment",
          label:(token.split("\u00b7")[1] || label).trim(), raw:token });
        return;
      }
      const dated = parseChosenTimes(token, settings);
      if (dated.appointments.length || dated.recurring.length) {
        out.appointments.push(...dated.appointments);
        out.recurring.push(...dated.recurring);
        return;
      }
      const weekly = parseWeeklyTimes(token, defaultMinutes, label);
      if (weekly.recurring.length) { out.recurring.push(...weekly.recurring); return; }
      out.warnings.push('could not read the ' + label + ' entry "' + token + '"');
    });
    return out;
  }

  /* ---------- phase 2: parse ---------- */
  // Two systems export bookings and both are live: the BYU-I IT build and Jason's own booking
  // site. Their columns barely overlap, so the format is detected from the header and
  // everything downstream works on one row shape regardless of which file arrived.
  const FORMATS = [
    { id:"it", label:"BYU-I IT export", marker:"Chosen Times",
      // Trainer and Chosen Times are deliberately not required - an export missing either
      // still yields tiers, and one older download really does omit columns.
      required:["Member","Email","Package","Status"],
      columns:{ name:"Member", email:"Email", phone:"Phone", package:"Package", status:"Status",
        times:"Chosen Times", trainerName:"Trainer", nextRenewal:"Next Renewal" } },
    { id:"booking", label:"booking-site export", marker:"Confirmation #",
      required:["Client name","Email","Package","Status"],
      columns:{ confirmation:"Confirmation #", name:"Client name", email:"Email", phone:"Phone",
        package:"Package", price:"Price", status:"Status", paid:"Paid", bookedOn:"Booked on",
        weekly:"Weekly times", sessions:"Session times", consultation:"Consultation",
        nextRenewal:"Reserved through", trainerName:"Trainer name", trainerEmail:"Trainer email",
        partnerName:"Partner name", partnerEmail:"Partner email", partnerPhone:"Partner phone",
        notes:"Notes" } }
  ];

  // Scored rather than first-match, so a file that satisfies one format is never judged
  // against the other, and a near miss can say which columns it was short of.
  function chooseBookingFormat(header) {
    const names = (header || []).map((cell) => String(cell).trim());
    let best = null;
    FORMATS.forEach((format) => {
      const missing = format.required.filter((name) => !names.includes(name));
      const score = (format.required.length - missing.length) + (names.includes(format.marker) ? 10 : 0);
      if (!best || score > best.score) best = { format, missing, score };
    });
    return best;
  }
  function detectBookingFormat(header) {
    const best = chooseBookingFormat(header);
    return best && !best.missing.length ? best.format.id : "";
  }

  // Matched on a keyword, not the whole sentence, because the questions are free text on
  // Jason's side and rewording one must not silently orphan its column.
  const INTAKE_QUESTIONS = [
    { field:"goals",        test:/fitness goal|top goal/i },
    { field:"experience",   test:/training experience|experience so far/i },
    { field:"injuries",     test:/injur|pain|health condition/i },
    { field:"availability", test:/days a week|which days|days\/times/i },
    { field:"extra",        test:/anything else/i }
  ];
  function intakeColumns(header) {
    const found = {};
    header.forEach((raw, position) => {
      const text = String(raw).trim();
      if (!/^Q:/i.test(text) && !/questionnaire/i.test(text)) return;
      const question = text.replace(/^Q:\s*/i, "");
      const hit = INTAKE_QUESTIONS.find((item) => item.test.test(question));
      const field = hit ? hit.field : "other";
      if (!found[field]) found[field] = [];
      found[field].push({ position, question });
    });
    return found;
  }
  function readIntake(cells, columns) {
    const out = {};
    Object.keys(columns).forEach((field) => {
      const parts = columns[field]
        .map((item) => String(cells[item.position] == null ? "" : cells[item.position]).trim())
        .filter(Boolean);
      if (parts.length) out[field] = parts.join(" | ");
    });
    return out;
  }

  function parseBookingExport(text, options) {
    const settings = options || {};
    const result = { ok:false, format:"", formatLabel:"", fingerprint:fileFingerprint(text),
      rows:[], clients:[], trainerNames:[], warnings:[], errors:[] };
    const grid = parseCsv(text);
    if (!grid.length) { result.errors.push("The file is empty."); return result; }

    const header = grid[0].map((cell) => String(cell).trim());
    const choice = chooseBookingFormat(header);
    if (!choice || choice.missing.length) {
      const missing = choice ? choice.missing : [];
      // An older IT download omits Status entirely. Parsing it would "succeed" and quietly
      // assign nobody a tier, so it is named as the specific problem it is.
      const hint = missing.length === 1 && missing[0] === "Status"
        ? " Every row's tier is decided by Status, so an export without that column cannot be"
          + " imported - ask for the version of the report that includes it."
        : "";
      result.errors.push("This does not look like either booking export. The closest is the "
        + (choice ? choice.format.label : "BYU-I IT export") + ", which is missing: "
        + (missing.length ? missing.join(", ") : "every expected column")
        + ". Found: " + header.join(", ") + "." + hint);
      return result;
    }
    const format = choice.format, columns = format.columns;
    result.format = format.id;
    result.formatLabel = format.label;
    const intakeCols = intakeColumns(header);
    const reference = settings.reference ? new Date(settings.reference) : new Date();
    const defaultMinutes = Number(settings.defaultMinutes) || 60;
    // Resolved once. indexOf inside the row reader re-scanned the header for every field of
    // every row to get the same answer each time.
    const at = {};
    Object.keys(columns).forEach((key) => { at[key] = header.indexOf(columns[key]); });

    grid.slice(1).forEach((cells, position) => {
      const line = position + 2;
      const value = (key) => at[key] == null || at[key] < 0 ? ""
        : String(cells[at[key]] == null ? "" : cells[at[key]]).trim();
      const email = normalizeEmail(value("email"));
      const pkg = parsePackage(value("package"));
      const status = parseStatus(value("status"));
      const notes = [];
      let recurring = [], appointments = [];

      if (format.id === "it") {
        const times = parseChosenTimes(value("times"), settings);
        recurring = times.recurring;
        appointments = times.appointments;
        times.warnings.forEach((warning) => notes.push(warning));
      } else {
        const weekly = parseWeeklyTimes(value("weekly"), defaultMinutes, "Weekly times");
        const sessions = parseSessionTimes(value("sessions"), settings, "Session times");
        recurring = weekly.recurring.concat(sessions.recurring);
        appointments = sessions.appointments;
        weekly.warnings.concat(sessions.warnings).forEach((warning) => notes.push(warning));
        const consultRaw = value("consultation");
        if (consultRaw) {
          const consult = parseIsoDateTime(consultRaw);
          if (consult && consult.start != null) {
            const close = consult.start + defaultMinutes;
            appointments.push({ date:consult.date, startTime:clockLabel(consult.start),
              endTime:clockLabel(close), endTimeAssumed:true, endsNextDay:close >= 1440,
              yearAssumed:false, kind:"consultation", label:"Consultation", raw:consultRaw });
          } else {
            notes.push('could not read the consultation "' + consultRaw + '"');
          }
        }
      }

      const row = {
        line, format:format.id, name:value("name"), email, phone:value("phone"),
        packageRaw:pkg.raw, plan:pkg.plan, tierId:pkg.tierId,
        sessionsPerWeek:pkg.sessionsPerWeek, unmappedPackage:pkg.unmapped,
        trainerName:value("trainerName"), trainerEmail:normalizeEmail(value("trainerEmail")),
        // Name first, so the alias table built against the IT export keeps matching. The
        // email only stands in when a row names no trainer at all.
        trainerKey:normalizeName(value("trainerName")) || normalizeEmail(value("trainerEmail")),
        status, statusRaw:value("status"), nextRenewal:value("nextRenewal"),
        recurring, appointments
      };
      if (format.id === "booking") {
        row.confirmation = value("confirmation");
        row.price = value("price");
        row.paidRaw = value("paid");
        row.paid = /^(yes|y|true|paid)$/i.test(row.paidRaw);
        row.bookedOnRaw = value("bookedOn");
        row.bookedOn = parseShortDate(row.bookedOnRaw, reference);
        if (row.bookedOnRaw && !row.bookedOn) notes.push('could not read the booking date "' + row.bookedOnRaw + '"');
        row.notes = value("notes");
        row.intake = readIntake(cells, intakeCols);
        const partner = { name:value("partnerName"), email:normalizeEmail(value("partnerEmail")), phone:value("partnerPhone") };
        row.partner = partner.name || partner.email || partner.phone ? partner : null;
      }

      // A row with no email cannot be matched to anyone, but it must not take the rest of
      // the file down with it - a stray line should never block importing everyone else.
      if (!email) { result.warnings.push("Row " + line + " has no email address and was skipped."); row.skipped = true; }
      if (pkg.unmapped) result.warnings.push('Row ' + line + ': package "' + pkg.raw + '" does not match any tier and needs a decision.');
      if (status === "unknown") result.warnings.push('Row ' + line + ': status "' + row.statusRaw + '" is not one this app knows.');
      notes.forEach((warning) => result.warnings.push("Row " + line + ": " + warning));
      result.rows.push(row);
    });

    const usable = result.rows.filter((row) => !row.skipped);
    result.skippedRows = result.rows.length - usable.length;
    result.clients = collapseRows(usable, result.warnings);
    flagSharedPhones(result.clients, result.warnings);
    result.trainerNames = distinctTrainers(usable);
    // Only a structural problem - wrong columns, an empty file, nothing usable at all -
    // stops the import. Individual bad rows are reported and stepped over.
    if (!usable.length) result.errors.push("No row in this file had an email address, so nothing could be matched.");
    result.ok = result.errors.length === 0;
    return result;
  }

  // Same number, different addresses. Jason's own account appears under four addresses in the
  // real export. Reported for a human to judge, never merged: two people really can share a
  // number, and two rows here do so under different names.
  function flagSharedPhones(clients, warnings) {
    const byPhone = new Map();
    clients.forEach((client) => {
      const digits = String(client.phone || "").replace(/\D/g, "").replace(/^1(?=\d{10}$)/, "");
      if (digits.length < 7) return;
      if (!byPhone.has(digits)) byPhone.set(digits, []);
      byPhone.get(digits).push(client);
    });
    byPhone.forEach((group, digits) => {
      if (group.length < 2) return;
      group.forEach((client) => {
        client.sharesPhoneWith = group.filter((other) => other !== client).map((other) => other.email);
      });
      warnings.push(group.length + " accounts share the phone ending " + digits.slice(-4) + " ("
        + group.map((client) => client.email).join(", ") + "). They may be one person under several addresses.");
    });
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

      // Booking-site extras. Taken from the ranked list so a live row wins over a dead one,
      // and merged per field: one enrollment can carry the intake answers while another
      // carries the note.
      const pick = (field) => { const hit = ranked.find((row) => row[field]); return hit ? hit[field] : ""; };
      const intake = {};
      ranked.forEach((row) => Object.keys(row.intake || {}).forEach((field) => {
        if (!intake[field]) intake[field] = row.intake[field];
      }));

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
        droppedBookings, historyStatuses: group.map((row) => row.status),
        format: chosen.format || "",
        trainerEmail: pick("trainerEmail"),
        confirmations: [...new Set(group.map((row) => row.confirmation).filter(Boolean))],
        bookedOn: pick("bookedOn"), price: pick("price"),
        paid: live.length ? live.some((row) => row.paid === true) : group.some((row) => row.paid === true),
        notes: pick("notes"), intake,
        partner: (ranked.find((row) => row.partner) || {}).partner || null
      };
    });
  }

  function distinctTrainers(rows) {
    const seen = new Map();
    rows.forEach((row) => {
      if (!row.trainerKey) return;
      if (!seen.has(row.trainerKey)) seen.set(row.trainerKey, { key:row.trainerKey, name:row.trainerName, email:"", count:0 });
      const entry = seen.get(row.trainerKey);
      entry.count++;
      // The booking site names the trainer's address; the IT export never did. Kept so the
      // link-a-trainer screen can match on it instead of on a display name.
      if (!entry.email && row.trainerEmail) entry.email = row.trainerEmail;
      if (!entry.name && row.trainerName) entry.name = row.trainerName;
    });
    return [...seen.values()].sort((a, b) => b.count - a.count);
  }

  /* ---------- identity: two addresses per client ---------- */
  // Jason's non-IT site issues personal addresses; his IT build will issue BYU-I ones. A
  // profile keeps a slot for each and the diff indexes both, so whichever system sent the
  // file lands on the same record and no switchover migration is ever needed.
  // Tested strictly here rather than through isByuiEmail(), which returns true for ANY
  // address while FIT4LIFE_ALLOW_ANY_EMAIL is on for the pilot - routing every gmail
  // address into the BYU-I slot and defeating the whole arrangement.
  const BYUI_EMAIL = /@byui\.edu$/i;
  function emailSlotsFor(address) {
    const email = normalizeEmail(address);
    if (!email) return {};
    // The other slot is deliberately left alone. Overwriting it would discard the very
    // address that lets the OTHER export find this client.
    return BYUI_EMAIL.test(email) ? { email } : { bookingEmail:email };
  }

  const phoneDigits = (value) => String(value == null ? "" : value).replace(/\D/g, "").replace(/^1(?=\d{10}$)/, "");
  // Suffixes carry no identity and one real row is "Jaden Jeffrey Swarts, Esq."
  const NAME_NOISE = /^(jr|sr|ii|iii|iv|v|esq|dr|mr|mrs|ms|md)\.?$/;
  function nameTokens(value) {
    return normalizeName(value).replace(/[.,]/g, " ").split(/\s+/)
      .filter((token) => token.length > 1 && !NAME_NOISE.test(token));
  }

  // The bridge between the two exports for a client whose second address was never captured.
  // Deliberately suggestive, never decisive: the caller queues these for a human. Phone alone
  // is NOT treated as strong, because two rows in the real export share a number under
  // different names.
  function probableIdentityMatches(client, profiles) {
    const phone = phoneDigits(client && client.phone);
    const tokens = nameTokens(client && client.name);
    const full = tokens.join(" "), last = tokens.length ? tokens[tokens.length - 1] : "";
    const out = [];
    (profiles || []).forEach((profile) => {
      const samePhone = phone.length >= 7 && phoneDigits(profile.phone) === phone;
      const other = nameTokens(profile.name);
      const sameFullName = Boolean(full) && other.join(" ") === full;
      const sameLastName = Boolean(last) && other.length > 0 && other[other.length - 1] === last;
      // A shared last name alone is noise on a campus; it only counts alongside a phone.
      if (!samePhone && !sameFullName) return;
      const reasons = [];
      if (samePhone) reasons.push("same phone number");
      if (sameFullName) reasons.push("same name");
      else if (sameLastName) reasons.push("same last name");
      out.push({ profileId:profile.id, name:profile.name || "", email:profile.email || "",
        bookingEmail:profile.bookingEmail || "", reasons,
        strength:samePhone && (sameFullName || sameLastName) ? "strong" : "possible" });
    });
    return out.sort((a, b) => (b.strength === "strong") - (a.strength === "strong")).slice(0, 4);
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
      identityChecks:[], errors:[], nextState:previous };

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
      let profile = byEmail.get(client.email);
      // A decision the trainer already made about this address. Recorded so the same question
      // is not asked on every future import.
      const decided = own(previous.identityDecisions || {}, client.email);
      if (!profile && decided && decided !== "new") profile = profiles.find((item) => item.id === decided) || null;
      if (!profile) {
        if (!LIVE.includes(client.status)) { diff.unchanged.push({ email:client.email, reason:"not a live package, and no existing client to update" }); return; }
        // Jason's two systems issue different addresses for the same person, so an unmatched
        // address is not proof of a new client. Where someone on file looks like the same
        // person, the row is HELD rather than created - nothing happens until a human says
        // which it is, because a wrong merge blends two clients' training histories.
        if (!decided) {
          const candidates = probableIdentityMatches(client, profiles);
          if (candidates.length) { diff.identityChecks.push({ client, candidates }); return; }
        }
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
        knownEmails:previous.knownEmails || [], identityDecisions:previous.identityDecisions || {} };
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
      knownEmails:[...new Set([...(previous.knownEmails || []), ...touched])],
      identityDecisions:previous.identityDecisions || {} };
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
  window.detectBookingFormat = detectBookingFormat;
  window.bookingEmailSlotsFor = emailSlotsFor;
  window.probableIdentityMatches = probableIdentityMatches;
  window.bookingImportInternals = { parseCsv, parsePackage, parseChosenTimes, parseStatus,
    normalizeName, normalizeEmail, fileFingerprint, resolveYear, detectBookingFormat,
    emailSlotsFor, probableIdentityMatches, phoneDigits, nameTokens,
    parseWeeklyTimes, parseIsoDateTime, parseShortDate, parseSessionTimes, weekdayIndex,
    parseClock, FORMATS };
})();
