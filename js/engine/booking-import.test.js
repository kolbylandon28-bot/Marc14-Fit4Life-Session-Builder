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
const REPO = path.resolve(__dirname, "..", "..");

const HDR = "Member,Phone,Email,Package,Trainer,Chosen Times,Status,Next Renewal";
// The \uFEFF below is deliberate: the real export starts with a byte-order mark.
const SAMPLE = "\uFEFF" + HDR + "\n" + [
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

console.log("\n--- the booking-site export (26 columns) ---");
// Also INVENTED. Same columns and quirks as the real file - abbreviated weekdays, a
// consultation carrying its own year, Starter where the IT export says Bronze, one person
// under two enrollments, two accounts sharing a phone - with made-up names and addresses.
// Rows are built from the column list rather than typed as CSV so a field cannot drift.
const quote = (cell) => /[",\n]/.test(cell) ? '"' + cell.replace(/"/g, '""') + '"' : cell;
const BOOK_COLS = ["Confirmation #","Client name","Phone","Email","Package","Price","Status","Paid",
  "Booked on","Weekly times","Session times","Consultation","Reserved through","Trainer name",
  "Trainer email","Partner name","Partner email","Partner phone","Notes",
  "Q: What are your top fitness goals for this semester?",
  "Q: Do you have any injuries, pain, or health conditions your trainer should know about?",
  "Other questionnaire answers"];
const bookRow = (over) => BOOK_COLS.map((name) => quote(over[name] == null ? "" : over[name])).join(",");
const BOOKING = "\uFEFF" + BOOK_COLS.map(quote).join(",") + "\n" + [
  bookRow({ "Confirmation #":"F4L-2001", "Client name":"Robin Vale", Phone:"5550100",
    Email:"rvale@example.edu", Package:"Starter — 1 session / week", Price:"$145.00 /mo",
    Status:"active", Paid:"no", "Booked on":"Mon Aug 31", "Weekly times":"Tue 9:00 AM; Thu 4:30 PM",
    Consultation:"2026-09-04 8:15 AM", "Reserved through":"2026-12-11",
    "Trainer name":"Casey Fern", "Trainer email":"CFern@example.edu",
    Notes:"Wants to lift, carefully",
    "Q: What are your top fitness goals for this semester?":"Build strength",
    "Q: Do you have any injuries, pain, or health conditions your trainer should know about?":"Sore left knee" }),
  bookRow({ "Confirmation #":"F4L-2002", "Client name":"Robin Vale", Phone:"5550100",
    Email:"rvale@example.edu", Package:"Gold — 3 sessions / week", Price:"$359.00 /mo",
    Status:"active", Paid:"yes", "Booked on":"Mon Aug 31", "Weekly times":"Wed 6:00 AM",
    Consultation:"2026-09-05 14:00", "Reserved through":"2026-12-11",
    "Trainer name":"Casey Fern", "Trainer email":"cfern@example.edu" }),
  bookRow({ "Confirmation #":"F4L-2003", "Client name":"Dana Reyes", Phone:"(555) 020-0300",
    Email:"dreyes@example.edu", Package:"Flex — 1 session / week", Price:"$49.00 /mo",
    Status:"active", Paid:"no", "Booked on":"Aug 31", "Weekly times":"Fri 7:15 AM",
    "Session times":"whenever they can fit me in", "Reserved through":"2026-12-11" }),
  bookRow({ "Confirmation #":"F4L-2004", "Client name":"Sam Pike", Phone:"15550200300",
    Email:"spike@example.edu", Package:"Partner — 2 sessions / week", Price:"$55.00 /mo",
    Status:"active", Paid:"no", "Booked on":"Mon Aug 31", "Weekly times":"Sat 11:00 AM",
    "Reserved through":"2026-12-11", "Partner name":"Dana Reyes",
    "Partner email":"dreyes@example.edu", "Partner phone":"5550200300" }),
  bookRow({ "Confirmation #":"F4L-2005", "Client name":"No Address", Phone:"5550400",
    Package:"Flex — 1 session / week", Status:"active" }),
  bookRow({ "Confirmation #":"F4L-2006", "Client name":"Lee Ash", Phone:"5550500",
    Email:"lash@example.edu", Package:"Silver — 2 sessions / week", Status:"cancelled",
    "Weekly times":"Mon 5:00 PM", "Reserved through":"2026-10-01" })
].join("\n");

const b = P(BOOKING);
const rv = b.clients.find((c) => c.email === "rvale@example.edu");
t("the 26-column file is recognised",             b.format, "booking");
t("it parses without a structural error",         b.ok, true);
t("the IT file is still recognised",              P(SAMPLE).format, "it");
t("abbreviated weekdays resolve",                 rv.recurring.map((r) => r.weekdayName).sort().join(","), "thursday,tuesday,wednesday");
t("Gold outranks Starter across enrollments",     rv.tierId, "premium");
t("Starter maps to the same tier as Bronze",      I.parsePackage("Starter — 1 session / week").tierId, "starter");
t("Silver still maps to standard",                I.parsePackage("Silver — 2 sessions / week").tierId, "standard");
t("both confirmation numbers are kept",           rv.confirmations.join(","), "F4L-2001,F4L-2002");
t("Reserved through becomes the renewal date",    rv.nextRenewal, "2026-12-11");
t("Booked on resolves its missing year",          rv.bookedOn, "2026-08-31");
t("a date with no weekday still resolves",        b.clients.find((c) => c.email === "dreyes@example.edu").bookedOn, "2026-08-31");
t("the consultation is an appointment",           rv.appointments.length, 2);
t("a consultation keeps its own year",            rv.appointments.every((a) => a.yearAssumed === false), true);
t("a 12-hour consultation time is read",          rv.appointments.find((a) => a.date === "2026-09-04").startTime, "08:15");
t("a 24-hour consultation time is read",          rv.appointments.find((a) => a.date === "2026-09-05").startTime, "14:00");
t("a quoted note keeps its comma",                rv.notes, "Wants to lift, carefully");
t("the goals answer is captured",                 rv.intake.goals, "Build strength");
t("the injuries answer is captured",              rv.intake.injuries, "Sore left knee");
t("the trainer address is captured lowercased",   rv.trainerEmail, "cfern@example.edu");
t("the trainer list carries the address",         b.trainerNames[0].email, "cfern@example.edu");
t("partner details are kept",                     b.clients.find((c) => c.email === "spike@example.edu").partner.email, "dreyes@example.edu");
t("a row with no email is skipped, not fatal",    b.skippedRows, 1);
t("unreadable Session times warns, not drops",    b.warnings.some((w) => /Session times entry "whenever/.test(w)), true);
t("that row still produced a client",             !!b.clients.find((c) => c.email === "dreyes@example.edu"), true);
t("a shared phone is reported",                   b.warnings.some((w) => /share the phone ending 0300/.test(w)), true);
t("a formatted phone matches a raw one",          b.clients.find((c) => c.email === "spike@example.edu").sharesPhoneWith.join(","), "dreyes@example.edu");
t("a cancelled-only client takes no tier",        b.clients.find((c) => c.email === "lash@example.edu").tierId, "");

console.log("\n--- refusing files that only look close enough ---");
const noStatus = P("Member,Phone,Email,Package,Trainer,Chosen Times\nA,1,a@b.c,Flex — 1 session / week,T,,");
t("an IT export missing Status is refused",       noStatus.ok, false);
t("and the message says why",                     /tier is decided by Status/.test(noStatus.errors[0]), true);
t("an unrelated CSV is refused",                  P("Name,Nickname\nA,B").ok, false);
t("a booking file missing Status is refused",     P('Confirmation #,Client name,Email,Package\n1,A,a@b.c,Flex').ok, false);
t("Trainer is optional, not required",            P("Member,Email,Package,Status\nA,a@b.c,Flex — 1 session / week,Active").ok, true);
t("13:00 PM is not a time",                       I.parseClock("13:00 PM"), null);
t("a bare 24-hour clock is",                      I.parseClock("14:05"), 845);
t("Weds and Wednesday are the same day",          I.weekdayIndex("Weds"), I.weekdayIndex("Wednesday"));

console.log("\n--- two addresses per client, so either export finds them ---");
// Jason's non-IT site issues personal addresses and his IT build will issue BYU-I ones. A
// client must be reachable by BOTH without anyone editing anything on switchover day.
t("a BYU-I address fills the login slot",         JSON.stringify(I.emailSlotsFor("Sam@BYUI.edu")), '{"email":"sam@byui.edu"}');
t("a personal address fills the booking slot",    JSON.stringify(I.emailSlotsFor("sam@gmail.com")), '{"bookingEmail":"sam@gmail.com"}');
t("only ever one slot, so the other survives",    Object.keys(I.emailSlotsFor("sam@gmail.com")).length, 1);
t("a blank address writes nothing",               JSON.stringify(I.emailSlotsFor("  ")), "{}");
t("a lookalike domain is not BYU-I",              JSON.stringify(I.emailSlotsFor("sam@notbyui.edu.co")), '{"bookingEmail":"sam@notbyui.edu.co"}');

console.log("\n--- who is this? (never merged automatically) ---");
// Written three different ways on purpose: the export, the roster and a US country code
// all format the same number differently and every one of them has to match.
const SAME = { name:"Robin Vale", phone:"15550100100" };
const roster = [
  { id:"p-robin",  name:"Robin Vale",  phone:"555-010-0100",   email:"", bookingEmail:"robin.vale@gmail.com" },
  { id:"p-other",  name:"Dale Vale",   phone:"(555) 010-0100", email:"dale@byui.edu" },
  { id:"p-name",   name:"Robin Vale",  phone:"5559999999",     email:"robin2@byui.edu" },
  { id:"p-nomatch",name:"Kim Reyes",   phone:"5551111111",     email:"kim@byui.edu" },
];
const matches = I.probableIdentityMatches(SAME, roster);
t("a shared surname alone is not a match",        matches.some((m) => m.profileId === "p-nomatch"), false);
t("phone plus full name is strong",               matches.find((m) => m.profileId === "p-robin").strength, "strong");
t("phone plus surname only is also strong",       matches.find((m) => m.profileId === "p-other").strength, "strong");
t("name with a different phone is possible",      matches.find((m) => m.profileId === "p-name").strength, "possible");
t("the strong match is offered first",            matches[0].strength, "strong");
t("a formatted phone matches a raw one",          matches.find((m) => m.profileId === "p-robin").reasons.includes("same phone number"), true);
t("a suffix does not break the name",             I.nameTokens("Jaden Jeffrey Swarts, Esq.").join(" "), "jaden jeffrey swarts");
t("nobody similar means no question asked",       I.probableIdentityMatches({ name:"Nobody Here", phone:"5552222" }, roster).length, 0);

console.log("\n--- the row is HELD until a human decides ---");
const bookingParsed = P(BOOKING);
const CLEAN = { fingerprint:"", missCounts:{}, knownEmails:[] };
const onFile = [{ id:"p-robin", name:"Robin Vale", email:"", bookingEmail:"robin.vale@gmail.com", phone:"5550100" }];
const held = window.diffBookingImport(bookingParsed, { profiles:onFile, previousState:CLEAN });
t("a probable match is not created",              held.created.some((c) => c.client.email === "rvale@example.edu"), false);
t("it is queued as a question instead",           held.identityChecks.length, 1);
t("naming the client it might be",                held.identityChecks[0].candidates[0].profileId, "p-robin");
t("an unrelated client still creates normally",   held.created.some((c) => c.client.email === "spike@example.edu"), true);

const asNew = window.diffBookingImport(bookingParsed,
  { profiles:onFile, previousState:{ ...CLEAN, identityDecisions:{ "rvale@example.edu":"new" } } });
t("'different person' lets it create",            asNew.created.some((c) => c.client.email === "rvale@example.edu"), true);
t("and the question stops being asked",           asNew.identityChecks.length, 0);

const asLinked = window.diffBookingImport(bookingParsed,
  { profiles:onFile, previousState:{ ...CLEAN, identityDecisions:{ "rvale@example.edu":"p-robin" } } });
t("'same person' updates the existing client",    asLinked.updated.some((u) => u.profileId === "p-robin"), true);
t("and creates nobody new",                       asLinked.created.some((c) => c.client.email === "rvale@example.edu"), false);
t("the decision survives the next import",        JSON.stringify(asLinked.nextState.identityDecisions), '{"rvale@example.edu":"p-robin"}');

console.log("\n--- the switchover itself ---");
// The whole point: a client imported today under a personal address must be found by
// tomorrow's IT export under their BYU-I one, with no migration in between.
const bridged = [{ id:"p-brx", name:"Robin Vale", email:"rvale@byui.edu", bookingEmail:"rvale@example.edu", phone:"5550100" }];
const viaBooking = window.diffBookingImport(bookingParsed, { profiles:bridged, previousState:CLEAN });
t("the personal address finds them",              viaBooking.updated.some((u) => u.profileId === "p-brx"), true);
const itFile = P("Member,Phone,Email,Package,Trainer,Chosen Times,Status,Next Renewal\n"
  + "Robin Vale,5550100,rvale@byui.edu,Flex — 1 session / week,Casey Fern,,Active,");
const viaSchool = window.diffBookingImport(itFile, { profiles:bridged, previousState:CLEAN });
t("and so does the BYU-I one, same record",       viaSchool.updated.some((u) => u.profileId === "p-brx"), true);
t("no second record for the same person",         viaSchool.created.some((c) => c.client.email === "rvale@byui.edu"), false);

console.log("--- no invisible characters anywhere in the source ---");
// A literal U+FEFF typed into the code that strips BOMs sat in two files here and broke
// GitHub's uploader outright. Invisible characters are impossible to spot in review, so
// they are checked mechanically instead.
const INVISIBLE = new Set([0xFEFF,0x200B,0x200C,0x200D,0x2060,0x00A0,0x202A,0x202B,0x202C,0x202D,0x202E,0x2066,0x2067,0x2068,0x2069]);
const TEXT_EXT = [".js",".html",".css",".sql",".json",".txt",".md",".webmanifest",".svg"];
const offenders = [];
(function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes:true })) {
    if (entry.name === ".git" || entry.name === "node_modules") continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) { walk(full); continue; }
    if (!TEXT_EXT.includes(path.extname(entry.name).toLowerCase())) continue;
    const body = fs.readFileSync(full, "utf8");
    for (let i = 0; i < body.length; i++) {
      const cp = body.codePointAt(i);
      if (INVISIBLE.has(cp) || (cp < 0x20 && !"\n\r\t".includes(body[i])) || cp === 0x7F) {
        offenders.push(path.relative(REPO, full) + " (U+" + cp.toString(16).toUpperCase().padStart(4,"0") + ")");
        break;
      }
    }
  }
})(REPO);
t("no file contains an invisible character", offenders.length ? offenders.join(", ") : 0, 0);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
