/* Tests that the calendar's hour labels, hour lines and events all agree.
   Run:  node js/app/calendar-grid.test.js

   Three separate elements draw this grid: the label column on the left, the repeating
   background lines in each day column, and the absolutely-positioned event blocks. They only
   line up if all three agree on where the grid starts and how tall an hour is.

   They did not. Every day column sits beneath a header; the label column has none. Only the
   client view compensated, with a hardcoded 52px that matched nothing. So in the trainer view
   every label was offset from its own line by the header's height, and a 16:30 appointment
   rendered below the 5pm line. The stylesheet now derives all of it from two variables and
   the JavaScript positions events from a single named constant. */
const fs = require("fs"), path = require("path");
const root = path.join(__dirname, "..", "..");
const css = fs.readFileSync(path.join(root, "styles.css"), "utf8");
const js = fs.readFileSync(path.join(root, "js", "app", "action-calendar.js"), "utf8");

let pass = 0, fail = 0;
const t = (name, got, want) => {
  const ok = JSON.stringify(got) === JSON.stringify(want); ok ? pass++ : fail++;
  console.log((ok ? "  PASS  " : "  FAIL  ") + name.padEnd(62) + (ok ? "" : "\n         got " + JSON.stringify(got) + "\n        want " + JSON.stringify(want)));
};

/* The two numbers everything derives from. */
const headH = (css.match(/--calendar-head-h:\s*(\d+)px/) || [])[1];
const hourH = (css.match(/--calendar-hour-h:\s*(\d+)px/) || [])[1];
t("the header height is declared once", Boolean(headH), true);
t("the hour height is declared once", Boolean(hourH), true);

/* The label column must drop by exactly the header's height, or it is off by that much. */
t("the label column clears the header",
  /\.calendar-hours\{[^}]*padding-top:var\(--calendar-head-h\)/.test(css), true);
t("the day header is that exact height, not content-sized",
  /\.calendar-daycol-head\{height:var\(--calendar-head-h\);box-sizing:border-box/.test(css), true);
t("an hour label is one hour tall",
  /\.calendar-hour\{height:var\(--calendar-hour-h\)/.test(css), true);
t("the hour lines repeat at that same height",
  /repeating-linear-gradient\([\s\S]{0,140}var\(--calendar-hour-h\)\)/.test(css), true);

/* The hardcoded compensations are gone, not merely overridden. */
t("no hardcoded 52px offset survives", /padding-top:52px/.test(css), false);
t("the client view no longer needs its own header height",
  /\.calendar-timegrid\.client \.calendar-daycol-head\{height:26px/.test(css), false);

/* The JavaScript must position events from the same hour height. */
t("there is exactly one hour-height constant",
  (js.match(/const CALENDAR_PIXELS_PER_HOUR = \d+;/g) || []).length, 1);
t("it equals the stylesheet's hour height",
  (js.match(/const CALENDAR_PIXELS_PER_HOUR = (\d+);/) || [])[1], hourH);
t("it is declared before anything uses it",
  js.indexOf("const CALENDAR_PIXELS_PER_HOUR") < js.indexOf("const calendarTopFor"), true);
t("no event is positioned by a bare number", /\/ 60\) \* 44|\+ 1\) \* 44/.test(js), false);
t("every position derives from the constant",
  (js.match(/CALENDAR_PIXELS_PER_HOUR/g) || []).length >= 6, true);

/* The arithmetic itself: an appointment must land on its own hour. */
const START = 5;
const top = (minutes) => ((minutes - START * 60) / 60) * Number(hourH);
t("5am sits at the very top", top(5 * 60), 0);
t("6am sits one hour down", top(6 * 60), Number(hourH));
t("16:30 sits half an hour below 4pm", top(16 * 60 + 30), (11.5) * Number(hourH));
t("16:30 is above the 5pm line, not below it", top(16 * 60 + 30) < top(17 * 60), true);

console.log("\n" + pass + " passed, " + fail + " failed");
process.exit(fail ? 1 : 0);
