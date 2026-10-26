/* Tests for the work area home screen.
   Run:  node js/app/work-areas.test.js

   What these protect: the rows come out full instead of leaving one card stranded, a card
   lists the tools that area actually has, an area that does not coach never advertises
   clients, and the emoji do not come back. */
const fs = require("fs"), path = require("path");
const src = fs.readFileSync(path.join(__dirname, "work-areas.js"), "utf8");
const css = fs.readFileSync(path.join(__dirname, "..", "..", "styles.css"), "utf8");
const art = require("./area-art.js");

let pass = 0, fail = 0;
const t = (name, got, want) => {
  const ok = JSON.stringify(got) === JSON.stringify(want); ok ? pass++ : fail++;
  console.log((ok ? "  PASS  " : "  FAIL  ") + name.padEnd(64) + (ok ? "" : "\n         got " + JSON.stringify(got) + "\n        want " + JSON.stringify(want)));
};

let role = "owner";
const listeners = {};
const win = { fit4lifeWorkAreas: [], fit4lifeMyAreas: [], fit4lifeStaffAreas: [], fit4lifeCloudTrainers: [],
  fit4lifeCloudReady: false, addEventListener: (name, fn) => { listeners[name] = fn; } };
Object.defineProperty(win, "fit4lifeCloudRole", { get: () => role });

const api = new Function("window", "document", "localStorage", "showToast", "escapeHtml", "byId",
  "isFit4LifeOwner", "openCoachDestination", "show", "renderCoachModule", "renderAreaHome",
  "areaGlyphSvg", "areaSceneSvg", "areaClockCardHtml", "areaTodayCardHtml", "areaScheduleCardHtml",
  "areaTasksCardHtml", "areaEventsCardHtml", "areaHoursCardHtml", "areaDevicesCardHtml", "loadAreaTools",
  "openBuilder", "navigator",
  src + "; return { areaGridColumns, areaToolChips, areaTileHtml, areaGroupHtml, inviteLinkState, areaIsCoaching, areaHasEvents, myWorkAreas,"
  + " setAreas: (rows) => { window.fit4lifeWorkAreas = rows; }, setMine: (keys) => { window.fit4lifeMyAreas = keys; } };")(
  win, { getElementById: () => null, querySelectorAll: () => [], addEventListener: () => {} },
  { getItem: () => null, setItem: () => {}, removeItem: () => {} },
  () => {}, (value) => String(value == null ? "" : value), () => null,
  () => role === "owner", () => {}, () => {}, () => {}, () => {},
  art.areaGlyphSvg, art.areaSceneSvg,
  () => "", () => "", () => "", () => "", () => "", () => "", () => "", () => {}, () => {}, {});

const AREAS = [
  { area_key: "maintenance", name: "Maintenance", sort_order: 0, is_active: true, is_coaching: false, has_events: false },
  { area_key: "i-center", name: "I-Center", sort_order: 1, is_active: true, is_coaching: false, has_events: false },
  { area_key: "equipment-center", name: "Equipment Center", sort_order: 2, is_active: true, is_coaching: false, has_events: false },
  { area_key: "pool", name: "Pool", sort_order: 3, is_active: true, is_coaching: false, has_events: true },
  { area_key: "gym", name: "Gym", sort_order: 4, is_active: true, is_coaching: true, has_events: true }
];
api.setAreas(AREAS);

/* ---------- the rows come out full ---------- */
const rows = (count) => {
  const cols = api.areaGridColumns(count), out = [];
  let left = count;
  while (left > 0) { out.push(Math.min(cols, left)); left -= cols; }
  return out.join("+");
};
t("one area sits on its own", rows(1), "1");
t("two areas share a row", rows(2), "2");
t("three areas fill one row", rows(3), "3");
t("four areas square up", rows(4), "2+2");
t("five areas split three and two", rows(5), "3+2");
t("six areas fill two rows", rows(6), "3+3");
t("seven areas do not strand one", rows(7), "4+3");
t("eight areas end on a pair", rows(8), "3+3+2");
t("nine areas fill three rows", rows(9), "3+3+3");
t("no count ever leaves a single card alone", [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
  .filter((n) => n > 2 && rows(n).split("+").pop() === "1"), []);

/* ---------- a card lists what that area has ---------- */
t("a shift area lists its three tools", api.areaToolChips("maintenance"), ["Clock", "Tasks", "Schedule"]);
t("the equipment center is not offered clients", api.areaToolChips("equipment-center").includes("Clients"), false);
t("the equipment center is not offered lessons", api.areaToolChips("equipment-center").includes("Lessons"), false);
t("the pool lists its calendar", api.areaToolChips("pool"), ["Clock", "Tasks", "Schedule", "Lessons"]);
t("the gym lists everything", api.areaToolChips("gym"), ["Clients", "Programming", "Clock", "Tasks", "Schedule", "Lessons"]);

role = "staff";
t("a staff member in the gym is not offered clients", api.areaToolChips("gym").includes("Clients"), false);
t("a staff member still gets the clock", api.areaToolChips("gym").includes("Clock"), true);
role = "owner";

/* ---------- the card markup ---------- */
const poolCard = api.areaTileHtml("pool"), gymCard = api.areaTileHtml("gym");
t("the card carries the area's drawing", /class="area-art"/.test(poolCard), true);
t("the card has no emoji", /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(poolCard), false);
t("the badge holds a vector glyph, not a character", /<div class="tc-icon"[^>]*><svg /.test(poolCard), true);
t("a shift area is tagged Shift", /<span class="tc-tag">Shift<\/span>/.test(poolCard), true);
t("a coaching area is tagged Coaching", /<span class="tc-tag">Coaching<\/span>/.test(gymCard), true);
t("only a coaching area gets the accent class", [/is-coaching/.test(poolCard), /is-coaching/.test(gymCard)], [false, true]);
t("the card still opens the area", /enterWorkArea\('pool'\)/.test(poolCard), true);
t("the pool card shows water, not a barbell", /area-art/.test(poolCard) && poolCard.includes(art.AREA_SCENES.pool.slice(0, 40)), true);
t("the gym card shows the rack", gymCard.includes(art.AREA_SCENES.gym.slice(0, 40)), true);

/* ---------- the groups ---------- */
const group = api.areaGroupHtml("Shift areas", ["maintenance", "i-center", "equipment-center", "pool"]);
t("the group is labelled", /Shift areas/.test(group), true);
t("the group counts its areas", /<span>4<\/span>/.test(group), true);
t("four areas lay out two across", /repeat\(2,minmax\(0,1fr\)\)/.test(group), true);
t("the grid is capped so two cards do not sprawl", /max-width:708px/.test(group), true);
t("an empty group renders nothing", api.areaGroupHtml("Coaching floors", []), "");

/* ---------- the five set themselves up ---------- */
t("the standard five are the five areas", require("fs").readFileSync(path.join(__dirname, "work-areas.js"), "utf8")
  .match(/WORK_AREA_DEFAULTS = \[[\s\S]*?\];/)[0].match(/\["([a-z-]+)"/g).map((m) => m.slice(2, -1)),
  ["maintenance", "i-center", "equipment-center", "pool", "gym"]);
t("seeding waits for the list to say the table is there", /fit4lifeWorkAreasAvailable !== true\) return;/.test(src), true);
t("only an owner seeds", /if \(!isFit4LifeOwner\(\)\) return;/.test(src), true);
t("seeding is skipped once an area exists", /if \(\(window\.fit4lifeWorkAreas \|\| \[\]\)\.length\) return;/.test(src), true);
t("seeding runs at most once", /if \(standardAreasSeeded\) return;/.test(src), true);
t("the fetch waits for a signed-in session", /if \(!window\.fit4lifeCloudReady\) return;/.test(src), true);
t("the fetch is retried when a session arrives", /addEventListener\("fit4life-cloud-ready"/.test(src), true);
t("nothing fetches at page-parse time any more", /^if \(typeof window\.fit4lifeCloudListWorkAreas === "function"\) \{\n  window\.fit4lifeCloudListWorkAreas\(\)/m.test(src), false);
t("a failed fetch can be tried again", /workAreasRequested = false;/.test(src), true);

/* ---------- how long an invite link is worth something ---------- */
const ago = (minutes) => new Date(Date.now() - minutes * 60000).toISOString();
t("a link just sent says so", api.inviteLinkState(ago(0)), "link sent just now, good for about an hour");
t("a fresh link counts down", api.inviteLinkState(ago(10)), "link sent 10 minutes ago, expires in 50");
t("one minute reads as singular", api.inviteLinkState(ago(1)), "link sent 1 minute ago, expires in 59");
t("the last minute still counts as live", /expires in 1$/.test(api.inviteLinkState(ago(59))), true);
t("an hour old is expired", api.inviteLinkState(ago(60)), "link expired 1 hour ago");
t("a few hours old is expired", api.inviteLinkState(ago(200)), "link expired 3 hours ago");
t("a day old reads in days", api.inviteLinkState(ago(60 * 26)), "link expired 1 day ago");
t("a week old reads in days", api.inviteLinkState(ago(60 * 24 * 7)), "link expired 7 days ago");
t("an expired link says it is expired", /^link expired /.test(api.inviteLinkState(ago(999))), true);
t("a missing date does not break the row", api.inviteLinkState(null), "link sent");
t("a nonsense date does not break the row", api.inviteLinkState("not a date"), "link sent");

/* ---------- the rail survives being built before the areas arrive ---------- */
t("the group header reads its target off the element, not a closure",
  /heading\.dataset\.soloTarget/.test(src), true);
t("and that target is written on every render",
  /if \(solo\) heading\.dataset\.soloTarget = shown\[0\]; else delete heading\.dataset\.soloTarget;/.test(src), true);
t("the handler no longer closes over the allowed map",
  /const only = \(allowed\[heading\.dataset\.navGroup\]/.test(src), false);
/* The phone bar is the same element as the desktop rail, and styles.css carries
   [hidden]{display:none!important}. Collapsing a drawer with the hidden attribute therefore
   made the bar unable to re-show its own five tabs - it came up holding a group heading and
   More, and nothing else. Collapsed is a class now; hidden means the role or the area does
   not grant it, which is true on every screen. */
/* Picking an area does not route through show(), which is the only thing that regroups
   the rail - so the picker used to save the choice, raise a toast, and leave the previous
   area's screen on display. */
/* fit4lifeCloudSaveWorkArea takes (key, name, order, active, coaching, events). Rename and
   hide passed four, so the last two defaulted to false and the area quietly lost its client
   tools and its calendar - which would have undone switching the Pool on. */
t("renaming an area keeps its coaching and calendar flags",
  /renameWorkArea[\s\S]*?area\.is_coaching === true, area\.has_events === true\)/.test(src), true);
t("so does hiding or unhiding one",
  /toggleWorkArea[\s\S]*?area\.is_coaching === true, area\.has_events === true\)/.test(src), true);
t("and no caller saves an area with only four arguments",
  /fit4lifeCloudSaveWorkArea\(key, [^)]*is_active !== false\);/.test(src), false);

t("picking an area regroups the rail",
  /function setActiveWorkArea[\s\S]*?groupCoachSidebar\(\);/.test(src), true);
t("and sends a screen the new area cannot show to the area home",
  /else if \(key && !stillHere\) show\("area"\);/.test(src), true);
t("while a screen both areas have is re-rendered where it stands",
  /else if \(stillHere && typeof openCoachDestination === "function"\) openCoachDestination\(here\);/.test(src), true);
t("availability decides that, not whether the drawer is shut",
  /button\.dataset\.navAvailable !== "0"/.test(src), true);

t("a group of one is drawn without a sub-item",
  /classList\.toggle\("nav-collapsed", available && \(solo \|\| !open\)\)/.test(src), true);
t("a shut drawer no longer sets the hidden attribute",
  /button\.hidden = solo/.test(src), false);
t("hidden is kept for what the role or the area does not grant",
  /button\.hidden = !available;/.test(src), true);
t("the stylesheet hides a collapsed button on the desktop rail",
  /\.coach-sidebar button\.nav-collapsed\{display:none\}/.test(css), true);
t("the phone bar drops the drawer headings and the area picker",
  /\.coach-sidebar \.coach-nav-group,\.coach-sidebar \.coach-area-picker/.test(css), true);
t("its five columns cannot be blown out by a long label",
  /grid-template-columns:repeat\(5,minmax\(0,1fr\)\)/.test(css), true);
t("and it sits above the home indicator",
  /bottom:calc\(6px \+ env\(safe-area-inset-bottom\)\)/.test(css), true);
t("a group of one is never the open drawer", /openNavGroup = isSolo\(holding\) \? "" : holding;/.test(src), true);

console.log("\n" + pass + " passed, " + fail + " failed");
process.exit(fail ? 1 : 0);
