/* Guards against one customer's data reaching another customer's screen.
   Run:  node js/app/no-branch-leak.test.js

   This has now happened three times, each through a DIFFERENT mechanism:
     1. V161 - the local cache was keyed on the user, not the user-in-a-branch.
     2. V162 - 33 database functions resolved "which org am I in" by guessing.
     3. V172 - 10 MORE functions guessed, using a third pattern the V162 sweep did not
        look for: they inlined their own `order by created_at asc limit 1`, which is the
        caller's OLDEST membership. BYU-Idaho was created first, so every one of them
        returned BYU-Idaho no matter which branch the user was standing in. That put
        BYU-Idaho trainer usernames in another customer's dropdown.
     Plus: the invite EMAIL link carried no branch, so an invited client landed on the
     default branch and was greeted by a different customer's name.

   The lesson is that "I fixed the patterns I knew about" is not a defence. This file
   enumerates every way the code can decide which organization it is looking at, and fails
   on anything that is not the single approved chokepoint. */
const fs = require("fs"), path = require("path");
const root = path.join(__dirname, "..", "..");
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");
const listSql = (dir) => {
  const full = path.join(root, dir);
  return fs.existsSync(full) ? fs.readdirSync(full).filter((f) => f.endsWith(".sql")) : [];
};

let pass = 0, fail = 0;
const t = (name, got, want) => {
  const ok = JSON.stringify(got) === JSON.stringify(want); ok ? pass++ : fail++;
  console.log((ok ? "  PASS  " : "  FAIL  ") + name.padEnd(62) + (ok ? "" : "\n         got " + JSON.stringify(got) + "\n        want " + JSON.stringify(want)));
};

/* ---------- 1. the database ---------- */

/* Every way a function can pick an organization for itself. Add to this list, never remove. */
const UNSAFE = [
  [/fit4life_my_org\(\)/i,                                   "calls fit4life_my_org()"],
  [/organization_id\s+in\s*\(\s*select/i,                     "loose: every org the caller belongs to"],
  [/order\s+by\s+\w*\.?created_at\s+asc[\s\S]{0,120}?limit\s+1/i, "the caller's OLDEST membership"],
  [/select\s+\w*\.?organization_id\s+into\s+\w+[\s\S]{0,400}?limit\s+1/i, "inlines its own limit 1"],
  /* Pattern four, found 2026-11-11: an existence check against memberships with NO
     organization filter - "is this person staff ANYWHERE". The owner belongs to three
     branches, so it answers yes from inside any of them. */
  [/from\s+public\.memberships[\s\S]{0,260}?(?!.*organization_id)\)/i, null],
];
/* Checked separately because it needs a negative match across the whole predicate. */
function unfilteredMembershipLookup(chunk) {
  const blocks = chunk.match(/from\s+public\.memberships\b[\s\S]{0,300}?(?=\n\s*(?:if|then|return|raise|;|end)|$)/gi) || [];
  return blocks.some((b) => /user_id\s*=/.test(b) && !/organization_id/.test(b));
}

/* Functions redefined by a migration are judged on the migration, which is what is live. */
const migrated = new Set();
listSql("supabase/migrations").forEach((f) => {
  const body = read("supabase/migrations/" + f);
  (body.match(/create or replace function public\.(\w+)/gi) || []).forEach((m) => {
    migrated.add(m.split(".").pop());
  });
});
t("migrations exist and redefine functions", migrated.size > 0, true);

function offenders(dir, only) {
  const out = [];
  listSql(dir).forEach((file) => {
    const body = read(dir + "/" + file);
    (body.split(/(?=create or replace function)/i)).forEach((chunk) => {
      const m = chunk.match(/create or replace function public\.(\w+)/i);
      if (!m) return;
      const name = m[1];
      if (name === "fit4life_active_org" || name === "fit4life_my_org") return;
      if (only && !only(name)) return;
      if (chunk.includes("fit4life_active_org")) return;
      UNSAFE.forEach(([re, why]) => { if (why && re.test(chunk)) out.push(name + " — " + why); });
      if (unfilteredMembershipLookup(chunk)) out.push(name + " — asks \"is this person staff ANYWHERE\"");
    });
  });
  return [...new Set(out)];
}

/* What is LIVE: a migrated function must go through the chokepoint. */
const liveOffenders = offenders("supabase/migrations");
t("no migrated function guesses its organization", liveOffenders, []);

/* What is NOT yet migrated and still guesses — the backlog, which must be empty. */
const backlog = offenders("supabase/functions", (n) => !migrated.has(n));
t("no unmigrated function is left guessing", backlog, []);

/* ---------- 2. the browser ---------- */
const cs = read("cloud-sync.js");

t("the chokepoint exists", /function fit4life_active_org|fit4life_active_org\(requested uuid/.test(
  listSql("supabase/migrations").map((f) => read("supabase/migrations/" + f)).join("\n")), true);

t("the cache is keyed on user AND branch",
  /const scope = String\(userId \|\| ""\) \+ "\|" \+ String\(organizationId \|\| ""\)/.test(cs), true);
t("area RPCs send the branch", /payload\.org_id = cloudOrganizationId/.test(cs), true);

/* The ?gym= parameter is deleted by the branch switcher, so it can never be the source of
   truth for anything a signed-in person does. */
t("a trainer-sent invite is stamped from the active branch",
  /function invitingOrganizationSlug\(\)[\s\S]{0,200}cloudOrganizationSlug \|\| portalOrganizationSlug/.test(cs), true);
t("the emailed link carries the active branch",
  /function authRedirectUrl\(\)[\s\S]{0,700}const gym = cloudOrganizationSlug \|\| requestedPortalSlug\(\)/.test(cs), true);
t("only the pre-sign-in portal load trusts the URL parameter",
  (cs.match(/requestedPortalSlug\(\)/g) || []).length, 3);

/* A mismatched slug must never be displayed over another branch's data. */
t("a mismatched ?gym= is dropped", /portalOrganizationId !== membership\.organization_id/.test(cs), true);
t("the app refuses to pick a branch for a multi-branch account", /branchChoiceNeeded = true/.test(cs), true);

console.log("\n" + pass + " passed, " + fail + " failed");
process.exit(fail ? 1 : 0);
