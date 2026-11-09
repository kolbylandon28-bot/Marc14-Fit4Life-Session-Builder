/* Guards against any colour that is not the branch's own leaking back into the UI.
   Run:  node js/app/no-stray-blue.test.js

   The app was built for BYU-Idaho, so Fit4Life blue was written as a literal in 139 places
   across the stylesheet - card gradients, borders, glows, focus rings. A gold branch and a
   black-and-white branch both still showed blue cards. Every one of those now derives from
   --blue / --blue-bright / --blue-deep, which applyGymBrand sets per branch. */
const fs = require("fs"), path = require("path");
const root = path.join(__dirname, "..", "..");
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");

let pass = 0, fail = 0;
const t = (name, got, want) => {
  const ok = JSON.stringify(got) === JSON.stringify(want); ok ? pass++ : fail++;
  console.log((ok ? "  PASS  " : "  FAIL  ") + name.padEnd(62) + (ok ? "" : "\n         got " + JSON.stringify(got) + "\n        want " + JSON.stringify(want)));
};

function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2;
  if (mx === mn) return [0, 0, l];
  const d = mx - mn;
  const s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
  let h;
  if (mx === r) h = ((g - b) / d + (g < b ? 6 : 0));
  else if (mx === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  return [h * 60, s, l];
}
/* True blue only. The app's near-neutral darks lean blue on purpose, the Halloween scene is
   allowed its purple, and a near-white tint reads as white. */
const isStrayBlue = ([h, s, l]) => h >= 200 && h <= 245 && s >= 0.45 && l >= 0.05 && l <= 0.88;

const PALETTE = /--(blue|blue-bright|blue-deep|blue-glow|event-accent|event-accent-2|grad)\s*:/;
const JS_DEFAULT = /brand\.primary \|\||brand\.accent \|\||PORTAL_THEME_PRESETS|a:"#|b:"#|fallback =|primary:"#|accent:"#/;

function strays(file, skipLine) {
  const out = [];
  read(file).split("\n").forEach((line, i) => {
    if (PALETTE.test(line) || (skipLine && skipLine.test(line))) return;
    const hexes = line.match(/#[0-9a-fA-F]{6}\b/g) || [];
    hexes.forEach((hx) => {
      const rgb = [1, 3, 5].map((k) => parseInt(hx.substr(k, 2), 16));
      if (isStrayBlue(rgbToHsl(...rgb))) out.push(file + ":" + (i + 1) + " " + hx);
    });
    const fns = line.match(/rgba?\(\d+,\s*\d+,\s*\d+(?:,\s*[\d.]+)?\)/g) || [];
    fns.forEach((fn) => {
      const n = fn.match(/\d+/g).slice(0, 3).map(Number);
      if (isStrayBlue(rgbToHsl(...n))) out.push(file + ":" + (i + 1) + " " + fn);
    });
  });
  return out;
}

const css = strays("styles.css");
t("no Fit4Life blue left in the stylesheet", css.slice(0, 5), []);
t("none in index.html", strays("index.html").slice(0, 5), []);
t("none in the trainer code", strays("js/trainer/coaching-support.js", JS_DEFAULT).slice(0, 5), []);
t("none in the app code", strays("js/app/program-app.js", JS_DEFAULT).slice(0, 5), []);
t("none in cloud-sync", strays("cloud-sync.js", JS_DEFAULT).slice(0, 5), []);

/* The palette itself must still define a fallback, or a branch with no colour renders black. */
const s = read("styles.css");
t("the palette still defines --blue", /--blue:#3E6BE0/.test(s), true);
t("the palette still defines --blue-bright", /--blue-bright:#5AA6F0/.test(s), true);
t("the reset button still stores literal colours, not variables",
  /primary:"#3E6BE0",accent:"#5AA6F0"/.test(read("js/trainer/coaching-support.js")), true);
t("the stylesheet still parses (braces balanced)",
  (s.match(/\{/g) || []).length === (s.match(/\}/g) || []).length, true);

console.log("\n" + pass + " passed, " + fail + " failed");
process.exit(fail ? 1 : 0);
