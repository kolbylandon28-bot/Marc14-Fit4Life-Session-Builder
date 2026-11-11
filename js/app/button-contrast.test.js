/* Tests that a primary button's label stays readable on any branch colour.
   Run:  node js/app/button-contrast.test.js

   Primary buttons paint the brand gradient and hardcoded `color:#fff` in 14 places. That was
   fine while every branch was Fit4Life blue. Of Our Making's primary IS white, so "+ NEW
   CLIENT PROFILE" rendered white-on-white and could not be read. The label colour now comes
   from the brand's own relative luminance. */
const fs = require("fs"), path = require("path");
const root = path.join(__dirname, "..", "..");
const cs = fs.readFileSync(path.join(root, "js", "trainer", "coaching-support.js"), "utf8");
const css = fs.readFileSync(path.join(root, "styles.css"), "utf8");

let pass = 0, fail = 0;
const t = (name, got, want) => {
  const ok = JSON.stringify(got) === JSON.stringify(want); ok ? pass++ : fail++;
  console.log((ok ? "  PASS  " : "  FAIL  ") + name.padEnd(60) + (ok ? "" : "\n         got " + JSON.stringify(got) + "\n        want " + JSON.stringify(want)));
};
const grab = (n) => cs.match(new RegExp("function " + n + "\\([\\s\\S]*?\\n\\}"))[0];
const api = new Function(grab("brandLuminance") + grab("brandLabelColour") + "; return {brandLuminance, brandLabelColour};")();
const { brandLuminance, brandLabelColour } = api;

/* The three live branches. */
t("BYU-Idaho blue keeps a white label", brandLabelColour("#3E6BE0", "#5AA6F0"), "#ffffff");
t("Journey gold gets a dark label", brandLabelColour("#E8B33A", "#C9CDD4"), "#0b0d10");
t("Of Our Making white gets a dark label", brandLabelColour("#FFFFFF", "#C9CDD3"), "#0b0d10");

/* The extremes. */
t("pure white never keeps white text", brandLabelColour("#FFFFFF", "#FFFFFF"), "#0b0d10");
t("pure black keeps white text", brandLabelColour("#000000", "#000000"), "#ffffff");
t("a mid grey resolves one way or the other",
  ["#0b0d10", "#ffffff"].includes(brandLabelColour("#808080", "#808080")), true);

/* Luminance itself. */
t("white is the brightest", Math.round(brandLuminance("#FFFFFF")), 1);
t("black is the darkest", brandLuminance("#000000"), 0);
t("green reads brighter than blue",
  brandLuminance("#4FC08D") > brandLuminance("#3E6BE0"), true);
t("a malformed value does not throw", brandLuminance("not-a-colour"), 0);
t("a missing value does not throw", brandLuminance(undefined), 0);

/* The wiring. */
t("the label colour is published as a variable", /--on-brand", brandLabelColour\(primary, bright\)/.test(cs), true);
t("no primary button hardcodes white on the brand gradient",
  /\{[^{}]*background:var\(--grad\)[^{}]*color:#fff[^{}]*\}/.test(css), false);
t("they read the variable instead",
  (css.match(/color:var\(--on-brand,#fff\)/g) || []).length >= 12, true);
t("the fallback is still white, so an unbranded load looks unchanged",
  /var\(--on-brand,#fff\)/.test(css), true);

console.log("\n" + pass + " passed, " + fail + " failed");
process.exit(fail ? 1 : 0);
