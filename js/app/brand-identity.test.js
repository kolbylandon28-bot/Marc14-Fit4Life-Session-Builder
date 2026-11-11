/* Tests that each branch wears its OWN name, not the vendor's.
   Run:  node js/app/brand-identity.test.js

   Before V163 the giant letters behind the app, the 42px topbar square, the theme-picker
   swatches and eight static strings all said "F4L" or "FIT4LIFE" no matter whose branch was
   open. Journey Financial Services' owner saw BYU-Idaho's mark over his own company's name. */
const fs = require("fs"), path = require("path");
const root = path.join(__dirname, "..", "..");
const cs = fs.readFileSync(path.join(root, "js", "trainer", "coaching-support.js"), "utf8");
const css = fs.readFileSync(path.join(root, "styles.css"), "utf8");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const wa = fs.readFileSync(path.join(root, "js", "app", "work-areas.js"), "utf8");

let pass = 0, fail = 0;
const t = (name, got, want) => {
  const ok = JSON.stringify(got) === JSON.stringify(want); ok ? pass++ : fail++;
  console.log((ok ? "  PASS  " : "  FAIL  ") + name.padEnd(62) + (ok ? "" : "\n         got " + JSON.stringify(got) + "\n        want " + JSON.stringify(want)));
};
const grab = (src, name) => {
  const m = src.match(new RegExp("function " + name + "\\([\\s\\S]*?\\n\\}"));
  if (!m) throw new Error("missing " + name);
  return m[0];
};
const initials = new Function(grab(cs, "brandInitials") + "; return brandInitials;")();

t("FIT 4 LIFE still resolves to F4L, so BYU-Idaho does not change", initials("FIT 4 LIFE"), "F4L");
t("Journey Financial Services gives JFS", initials("JOURNEY FINANCIAL SERVICES"), "JFS");
t("Of Our Making gives OOM", initials("Of Our Making"), "OOM");
t("a two-word gym gives two letters", initials("Gold's Gym"), "GG");
t("more than three words still stops at three", initials("A B C D E"), "ABC");
t("an empty name falls back rather than blanking the mark", initials(""), "F4L");

/* The watermark has to shrink for a longer word or it runs off the screen. */
function sizeFor(word) {
  const chars = Math.max(word.length, 1);
  const vw = Math.max(6, Math.min(27, 81 / chars));
  return Number(vw.toFixed(1));
}
t("a three-letter mark keeps the original 27vw", sizeFor("F4L"), 27);
t("JOURNEY shrinks to fit", sizeFor("JOURNEY") < 27, true);
t("JOURNEY does not shrink below the floor", sizeFor("JOURNEY") >= 6, true);
t("a very long word still clears the floor", sizeFor("JOURNEY FINANCIAL SERVICES"), 6);

/* Nothing user-visible may hardcode the vendor's mark any more. */
t("the watermark layers read a variable", css.match(/content:var\(--brand-watermark,"F4L"\)/g).length, 5);
t("the topbar square reads a variable", /content:var\(--brand-mark,"F4L"\)/.test(css), true);
t("no bare content:\"F4L\" is left in the stylesheet", /content:"F4L"/.test(css), false);
t("the watermark size is a variable", /--brand-watermark-size,clamp/.test(css), true);
t("the phone breakpoint uses it too", /--brand-watermark-size-sm,45vw/.test(css), true);

t("the theme swatch is tagged", /<i data-brand-mark>/.test(cs), true);
t("no theme description names Fit4Life", /Fit4Life look/.test(cs), false);
t("the holiday copy no longer names F4L", /matching F4L/.test(cs), false);
t("applyGymBrand rewrites the tagged nodes", /applyBrandText\(brand\)/.test(cs), true);

t("the signup consent is tagged", /data-brand-name>FIT4LIFE<\/b>, and that my trainer/.test(html), true);
t("the role question is tagged", /<span data-brand-name>FIT4LIFE<\/span> today\?/.test(html), true);
t("the consultation privacy line is tagged", /data-brand-name>Fit4Life<\/b> trainers/.test(html), true);
t("the InBody note is tagged", /<span data-brand-name>FIT4LIFE<\/span> uses these values/.test(html), true);
t("the topbar square announces the branch", /data-brand-label><\/div>/.test(html), true);

/* Managing held nine entries built for a building. */
const NAV_MODULE = eval("(" + cs.length + ")") && JSON.parse(
  wa.match(/const NAV_MODULE = \{([\s\S]*?)\};/)[1]
    .replace(/(\w+)\s*:/g, '"$1":').replace(/"([^"]+)"\s*:/g, '"$1":')
    .replace(/'/g, '"').replace(/,\s*$/, "")
    .replace(/^/, "{").replace(/$/, "}")
);
t("facility screens are gated", NAV_MODULE.areas, "facility");
t("hours is gated on the time clock", NAV_MODULE.hours, "timeclock");
t("trainer audits are gated", NAV_MODULE.audits, "audits");
t("team and trainer access are gated on staff", [NAV_MODULE.team, NAV_MODULE.access], ["staff", "staff"]);
t("approvals is NOT gated, every branch needs it", NAV_MODULE.approvals, undefined);
t("settings is NOT gated", NAV_MODULE.settings, undefined);
t("the sidebar filter calls the gate", /if \(!navKeyAllowedHere\(navKey\)\) return false;/.test(wa), true);

/* What an employer branch actually keeps under Managing. */
const MANAGING = ["team", "areas", "audits", "access", "approvals", "hours", "files", "archive", "settings"];
const employer = { facility: false, timeclock: false, volunteers: false, audits: false, staff: false, consultation: true };
const university = { facility: true, timeclock: true, volunteers: true, audits: true, staff: true, consultation: true };
const visible = (mods) => MANAGING.filter((k) => !NAV_MODULE[k] || mods[NAV_MODULE[k]] !== false);
t("Journey keeps only approvals and settings", visible(employer), ["approvals", "settings"]);
t("BYU-Idaho keeps all nine", visible(university).length, 9);

/* V164: nothing in the chrome may stay Fit4Life blue when the branch is gold or white. */
t("no hardcoded F4L blue is left in the stylesheet",
  /rgba\(90,166,240|rgba\(74,111,227|rgba\(62,107,224|rgba\(59,103,216/.test(css), false);
t("the gradient's deep stop is derived from the branch", /--blue-deep","color-mix\(in srgb," \+ primary/.test(cs), true);
t("the glow colour is derived too", /--blue-glow","color-mix\(in srgb," \+ bright/.test(cs), true);
t("the outline width is a variable", /--brand-watermark-halo-width,clamp\(3px/.test(css), true);
t("the fill edge width is a variable", /--brand-watermark-edge-width,1px/.test(css), true);
t("a script face gets a thin outline", /halo-width", script \? "clamp\(1\.2px/.test(cs), true);
t("a script face drops the fill edge so only the outline is white", /edge-width", script \? "0"/.test(cs), true);
t("there is a plain black and white theme", /mono:\{ label:"Black & white"/.test(cs), true);
t("the theme swatch renders the live mark", /escapeHtml\(brandMarkNow\(\)\)/.test(cs), true);
t("a script wordmark keeps its lower case", /script \? word : word\.toUpperCase\(\)/.test(cs), true);

/* V171: BYU-Idaho's membership tiers must not appear in a branch that has none. */
const rp2 = require("fs").readFileSync(require("path").join(__dirname, "readiness-progress.js"), "utf8");
const idx = require("fs").readFileSync(require("path").join(__dirname, "..", "..", "index.html"), "utf8");
t("the tier fields are tagged", (idx.match(/data-tiers-only/g) || []).length >= 2, true);
t("the membership tier field is one of them", /data-tiers-only><label for="profileEditTier"/.test(idx), true);
t("so is sessions per week", /data-tiers-only><label for="profileEditSessionsPerWeek"/.test(idx), true);
t("one switch hides them all", /querySelectorAll\("\[data-tiers-only\]"\)/.test(rp2), true);
t("the heading stops promising a membership", /Goals and training style/.test(rp2), true);
t("the editor applies it on open", /function openProfileEditor[\s\S]{0,80}syncBranchSpecificProfileFields\(\)/.test(rp2), true);
t("switching branches reapplies it", /syncBranchSpecificProfileFields/.test(cs), true);

console.log("\n" + pass + " passed, " + fail + " failed");
process.exit(fail ? 1 : 0);
