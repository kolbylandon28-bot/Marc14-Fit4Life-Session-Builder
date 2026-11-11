/* Tests that an invited client lands in the branch the trainer is standing in.
   Run:  node js/app/invite-branch.test.js

   Four signup paths stamped `organization_slug` into the new user's metadata, and the
   database trigger reads that to decide which branch the person joins. All four used
   `portalOrganizationSlug || "fit-4-life"` - the ?gym= URL parameter. The branch switcher
   DELETES that parameter when it reloads, so a trainer standing in any branch other than
   the one in the URL invited people straight into BYU-Idaho without any error.

   The split: an invite sent by a signed-in trainer follows the ACTIVE branch. Public
   self-signup keeps the portal slug, because nobody is signed in and the link is all the
   information there is. */
const fs = require("fs"), path = require("path");
const src = fs.readFileSync(path.join(__dirname, "..", "..", "cloud-sync.js"), "utf8");

let pass = 0, fail = 0;
const t = (name, got, want) => {
  const ok = JSON.stringify(got) === JSON.stringify(want); ok ? pass++ : fail++;
  console.log((ok ? "  PASS  " : "  FAIL  ") + name.padEnd(64) + (ok ? "" : "\n         got " + JSON.stringify(got) + "\n        want " + JSON.stringify(want)));
};

const body = src.match(/function invitingOrganizationSlug\(\) \{[\s\S]*?\n  \}/)[0];
const run = (active, portal) =>
  new Function("cloudOrganizationSlug", "portalOrganizationSlug", body + "; return invitingOrganizationSlug;")(active, portal)();

t("standing in your own branch invites into it", run("of-our-making", ""), "of-our-making");
t("the active branch beats a stale URL parameter", run("of-our-making", "fit-4-life"), "of-our-making");
t("standing in Journey invites into Journey", run("journey", ""), "journey");
t("with no active branch the portal link is used", run("", "journey"), "journey");
t("with neither, it falls back rather than failing", run("", ""), "fit-4-life");

/* Which call sites changed, and which deliberately did not. */
const sites = src.split("\n")
  .map((l, i) => ({ l, n: i + 1 }))
  .filter((x) => x.l.includes("organization_slug:"));
t("there are still four signup paths", sites.length, 4);
t("two follow the active branch", sites.filter((x) => x.l.includes("invitingOrganizationSlug()")).length, 2);
t("two keep the portal slug for public signup",
  sites.filter((x) => x.l.includes('portalOrganizationSlug || "fit-4-life"')).length, 2);
t("the client invite follows the active branch",
  /sendClientInvite[\s\S]{0,900}organization_slug: invitingOrganizationSlug\(\)/.test(src), true);

console.log("\n" + pass + " passed, " + fail + " failed");
process.exit(fail ? 1 : 0);
