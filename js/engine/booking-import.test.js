/* Tests for the booking-export parser and diff engine.   Run:  node js/engine/booking-import.test.js
   The fixture below is INVENTED. It mirrors the shape of a real booking report - the same
   columns, the same fused package strings, the same quoted Chosen Times, the same mixed
   email casing, one member holding several active packages - but every name and address is
   made up. Real client data must never be committed; this repo is public. */
const fs = require("fs"), path = require("path");
global.window = {};
global.normalizeMembershipTier = (v) => ({ flex:"flex_1", partner:"partner_1" }[v] || v || "");
eval(fs.readFileSync(path.join(__dirname, "booking-import.js"), "utf8"));
const I = window.bookingImportInternals;

const HDR = "Member,Phone,Email,Package,Trainer,Chosen Times,Status,Next Renewal";
// Leading ﻿ is deliberate: the real export starts with a byte-order mark.
const SAMPLE = "﻿" + HDR + "\n" + [
  'Robin Vale,5550100,rvale@example.edu,Bronze — 1 session / week,Alex Stone,,Expired,',
  'Robin Vale,5550100,rvale@example.edu,Bronze — 1 session / week,Casey Fern,"Monday 4:00 PM; Sat, Aug 22 3:30 PM–4:30 PM · Consult",Active,',
  'Robin Vale,5550100,rvale@example.edu,Flex — 1 session / week,Alex Stone,"Monday 7:15 AM",Cancelled,',
  'Robin Vale,5550100,rvale@example.edu,Bronze — 1 session / week,Casey Fern,"Monday 3:45 PM; Wed, Aug 12 4:30 PM–5:30 PM · Consult",Active,',
  'Robin Vale,5550100,rvale@example.edu,Gold — 3 sessions / week,Casey Fern,"Monday 2:00 PM; Tuesday 3:30 PM; Wed, Aug 12 3:00 PM–4:00 PM · Consult",Active,',
  'Dana Reyes,5550200,dreyes@example.edu,Flex — 1 session / week,Dana R. Reyes,"Tuesday 8:00 AM; Fri, Aug 7 2:00 PM–2:30 PM · Consult",Active,2026-09-04',
  'Dana Reyes,5550200,dreyes@example.edu,4-session pack,Dana R. Reyes,"Fri, Aug 7 1:00 PM–2:00 PM · Session; Wed, Aug 12 1:30 PM–2:30 PM · Session; Fri, Aug 14 1:45 PM–2:45 PM · Session",Active,',
  'Robin Vale,5550100,rvale@example.edu,Flex — 2 sessions / week,Morgan Hale,,Expired,',
  'SAM.PIKE@example.edu is not a member row and should be ignored,,,,,,,',
  'Sam Pike,5550300,SAM.PIKE@example.edu,Partner — 2 sessions / week,Morgan Hale,"Wednesday 4:00 PM; Thursday 4:00 PM; Fri, Jul 24 12:30 PM–12:30 PM · Consult",PendingPayment,'
].join("\n");

const REF = { reference: "2026-08-24T12:00:00" };
const P = (text, extra) => window.parseBookingExport(text, Object.assign({}, REF, extra));
let pass = 0, fail = 0;
const t = (name, got, want) => {
  const ok = String(got) === String(want); ok ? pass++ : fail++;
  console.log((ok ? "  PASS  " : "  FAIL  ") + name.padEnd(58) + (ok ? "" : `\n         got ${got}\n        want ${want}`));
};

console.log("--- tier chosen by rank, never by row order ---");
const p = P(SAMPLE);
t("Gold beats Bronze whichever is listed first", p.clients.find(c => c.email === "rvale@example.edu").tierId, "premium");
t("a real membership beats a one-off pack",      p.clients.find(c => c.email === "dreyes@example.edu").tierId, "flex_1");
t("mixed-case email is matched lowercased",      !!p.clients.find(c => c.email === "sam.pike@example.edu"), true);
t("quoted commas do not shear the schedule",     p.clients.reduce((n, c) => n + c.appointments.length, 0), 8);

t("a row with no email is skipped, not fatal", p.ok, true);
t("...and is reported as a warning", p.warnings.filter(w => /no email address and was skipped/.test(w)).length, 1);

console.log("--- expired and cancelled rows never define a tier ---");
const dead = `${HDR}\nAmy Ford,1,amy@example.edu,Bronze — 1 session / week,T,,Expired,`;
t("expired-only client yields no tier", P(dead).clients[0].tierId || "(none)", "(none)");
let d = window.diffBookingImport(P(dead), { profiles: [{ id: "amy", email: "amy@example.edu", membershipTier: "premium" }] });
t("...and no tier change is proposed", d.updated.filter(u => u.changes.some(c => c.field === "membershipTier")).length, 0);

console.log("--- an unreadable file must not mark the roster missing ---");
d = window.diffBookingImport(P("Name,Email\nx,y"), { profiles: [], previousState: { fingerprint: "z", missCounts: {}, knownEmails: ["a@b.c", "d@e.f"] } });
t("aborted on an unreadable file", d.aborted, true);
t("nobody is marked missing",       d.missing.length, 0);

console.log("--- two consecutive absences, and the same file twice is not two ---");
const s1 = window.diffBookingImport(P(SAMPLE), { profiles: [] }).nextState;
const trunc = SAMPLE.split("\n").filter(l => !/SAM\.PIKE/i.test(l)).join("\n");
const first = window.diffBookingImport(P(trunc), { profiles: [], previousState: s1 });
t("one truncated export counts as one absence", first.missing[0].consecutiveMisses, 1);
t("...and is not yet actionable",               first.review.filter(r => r.kind === "missing_twice").length, 0);
const repeat = window.diffBookingImport(P(trunc), { profiles: [], previousState: first.nextState });
t("re-reading the SAME file does not add one",  repeat.missing.length ? repeat.missing[0].consecutiveMisses : 1, 1);
const second = window.diffBookingImport(P(trunc.replace("Dana Reyes,5550200", "Dana Reyes,5550201")), { profiles: [], previousState: first.nextState });
t("a genuinely new export makes it two",        second.missing.find(m => m.email === "sam.pike@example.edu").consecutiveMisses, 2);
t("...and now it is actionable",                second.review.filter(r => r.kind === "missing_twice").length, 1);

console.log("--- matching clients ---");
d = window.diffBookingImport(P(SAMPLE), { profiles: [{ id: "a", email: "other@example.edu", bookingEmail: "sam.pike@example.edu", membershipTier: "partner_2" }] });
t("a differing booking email still matches", d.created.filter(c => c.client.email === "sam.pike@example.edu").length, 0);
d = window.diffBookingImport(P(SAMPLE), { profiles: [{ id: "r", email: "sam.pike@example.edu" }, { id: "dupe", email: "sam.pike@example.edu" }] });
t("two records on one address are flagged", d.review.filter(r => r.kind === "duplicate_profiles").length, 1);
t("...and neither is silently updated",     d.updated.filter(u => u.client.email === "sam.pike@example.edu").length, 0);

console.log("--- every field the booking side owns is compared ---");
d = window.diffBookingImport(P(SAMPLE), { profiles: [{ id: "k", email: "sam.pike@example.edu", membershipTier: "partner_2",
  name: "Sam Pike", sessionsPerWeek: 1, assignedTrainerName: "Someone Else", phone: "", bookingStatus: "" }] });
t("trainer, sessions, phone and status all detected",
  d.updated[0] ? d.updated[0].changes.map(c => c.field).sort().join(",") : "(none)",
  "assignedTrainerName,bookingStatus,phone,sessionsPerWeek");

console.log("--- clocks and dates ---");
t("an 11:30 PM slot never emits hour 24",
  P(`${HDR}\nNight Owl,1,n@example.edu,Bronze — 1 session / week,T,Monday 11:30 PM,Active,`).clients[0].recurring[0].endTime, "00:30");
const mid = P(`${HDR}\nNight Owl,1,n@example.edu,Bronze — 1 session / week,T,"Fri, Jul 24 11:30 PM–12:30 AM · Consult",Active,`).clients[0].appointments[0];
t("a booking across midnight keeps its real end", mid.endTime, "00:30");
t("...and is not marked assumed",                 mid.endTimeAssumed, false);
t("the printed weekday settles the year",
  I.parseChosenTimes("Fri, Jul 24 1:00 PM–2:00 PM · Session", { reference: "2027-03-01" }).appointments[0].date, "2026-07-24");
t("a stale import still dates rows correctly",
  P(SAMPLE, { reference: "2027-03-01T12:00:00" }).clients.reduce((n, c) => n + c.appointments.filter(a => a.date.startsWith("2026")).length, 0), 8);

console.log("--- package parsing ---");
t("a prototype key is not a tier",   I.parsePackage("constructor").tierId || "(none)", "(none)");
t("a prototype key is unmapped",     I.parsePackage("constructor").unmapped, true);
t("a stray double space resolves",   I.parsePackage("Single  Session").tierId, "payg_single");
t("a decorated pack name resolves",  I.parsePackage("Kickstart bundle - Aug").tierId, "payg_kickstart");
t("an unknown plan is refused",      I.parsePackage("Platinum — 5 sessions / week").tierId || "(none)", "(none)");
["Flex — 1 session / week","Flex — 2 sessions / week","Bronze — 1 session / week","Silver — 2 sessions / week",
 "Gold — 3 sessions / week","Partner — 2 sessions / week","4-session pack"].forEach((text) =>
  t("maps: " + text, I.parsePackage(text).tierId || "(none)",
    { "Flex — 1 session / week":"flex_1","Flex — 2 sessions / week":"flex_2","Bronze — 1 session / week":"starter",
      "Silver — 2 sessions / week":"standard","Gold — 3 sessions / week":"premium",
      "Partner — 2 sessions / week":"partner_2","4-session pack":"payg_4pack" }[text]));

console.log("--- appointment dedup ---");
const twoRows = `${HDR}
Eve Marsh,1,eve@example.edu,Bronze — 1 session / week,A,"Wed, Aug 12 3:00 PM–4:00 PM · Session",Active,
Eve Marsh,1,eve@example.edu,Gold — 3 sessions / week,B,"Wed, Aug 12 3:00 PM–3:30 PM · Session",Active,`;
t("same start, different end keeps both", P(twoRows).clients[0].appointments.length, 2);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
