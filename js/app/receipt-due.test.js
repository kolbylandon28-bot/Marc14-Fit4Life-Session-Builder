/* Tests that a progress receipt is only requested when there is something to review.
   Run:  node js/app/receipt-due.test.js

   The owner's Action Center showed SEVEN identical "Formal progress receipt requested" rows,
   one per client, none of which could be cleared by any means. Three separate causes:

   1. navigation.js: the formal arm was `assignments.length >= 4 || days >= 28`. The second
      half stood alone, so a client with zero completed workouts whose profile was older than
      28 days was permanently due a four-week review of nothing. The weekly arm beside it
      always required evidence first. Nothing moves the period forward except PUBLISHING a
      receipt, so the row could never clear on its own.
   2. Opening the row to deal with it persisted an empty draft, and `Boolean(draft)` was the
      first term in the due test - so touching the row pinned it permanently.
   3. cloud-sync.js replaced the whole attention-state object on every pull, destroying a
      dismissal still inside the 650ms push debounce. */
const fs = require("fs"), path = require("path");
const root = path.join(__dirname, "..", "..");
const nav = fs.readFileSync(path.join(root, "js", "app", "navigation.js"), "utf8");
const cs = fs.readFileSync(path.join(root, "cloud-sync.js"), "utf8");
const pa = fs.readFileSync(path.join(root, "js", "app", "program-app.js"), "utf8");

let pass = 0, fail = 0;
const t = (name, got, want) => {
  const ok = JSON.stringify(got) === JSON.stringify(want); ok ? pass++ : fail++;
  console.log((ok ? "  PASS  " : "  FAIL  ") + name.padEnd(66) + (ok ? "" : "\n         got " + JSON.stringify(got) + "\n        want " + JSON.stringify(want)));
};

/* Run the real due rule, lifted from the file. */
const body = nav.match(/function progressReceiptDueStatus\(profile,type\) \{[\s\S]*?\n\}/)[0];
const makeDue = (receipts, assignments) => new Function(
  "progressReceiptsForProfile", "receiptPeriodStart", "reviewedAssignmentsSince", "receiptDate",
  body + "; return progressReceiptDueStatus;"
)(
  () => receipts,
  (p) => p.phaseStartedAt || p.updatedAt || new Date().toISOString(),
  () => assignments,
  (v) => { const n = new Date(v || 0).getTime(); return Number.isFinite(n) ? n : 0; }
);
const daysAgo = (n) => new Date(Date.now() - n * 86400000).toISOString();
const client = (n) => ({ id: "c", name: "C", phaseStartedAt: daysAgo(n) });
const work = (n) => Array.from({ length: n }, (_, i) => ({ id: "a" + i }));

/* The seven rows he was looking at. */
t("35 days, never trained: NOT due", makeDue([], [])(client(35), "formal").due, false);
t("90 days, never trained: still NOT due", makeDue([], [])(client(90), "formal").due, false);
t("35 days, one workout: not enough to review", makeDue([], work(1))(client(35), "formal").due, false);

/* But a real review still fires. */
t("35 days with two reviewed workouts: due", makeDue([], work(2))(client(35), "formal").due, true);
t("four reviewed workouts inside the window: due", makeDue([], work(4))(client(10), "formal").due, true);
t("ten days, two workouts: too early for formal", makeDue([], work(2))(client(10), "formal").due, false);

/* Opening the editor used to pin the row forever. */
const emptyDraft = [{ type: "formal", status: "draft", periodStart: daysAgo(35) }];
t("an empty draft does not pin the row", makeDue(emptyDraft, [])(client(35), "formal").due, false);
const writtenDraft = [{ type: "formal", status: "draft", periodStart: daysAgo(35), summary: "Knee is settling, drop volume." }];
t("a draft with real content does keep it open", makeDue(writtenDraft, [])(client(35), "formal").due, true);

/* The weekly arm must be untouched. */
t("weekly still needs two sessions", makeDue([], work(1))(client(14), "weekly").due, false);
t("weekly fires on two sessions after a week", makeDue([], work(2))(client(14), "weekly").due, true);
t("weekly fires early on three sessions", makeDue([], work(3))(client(2), "weekly").due, true);

/* Shape, so none of it quietly reverts. */
t("the standalone elapsed-time arm is gone", /assignments\.length >= 4 \|\| days >= 28/.test(nav), false);
t("formal now requires evidence", /days >= 28 && assignments\.length >= 2/.test(nav), true);
t("the reason copy matches the new rule", /four-week review date has arrived/.test(nav), false);
t("a dismissal survives a pull", /mergeAttentionState\(readJson\(CLOUD_KEYS\.attentionState/.test(cs), true);
t("the merge keeps the newer entry per item", /b > a \? theirs : mine/.test(cs), true);
t("a branch switch flushes pending writes", /flushCloudSync\(\); \} catch \(_\) \{\}\n    try \{/.test(cs), true);
t("the follow-up row needs something to follow up on",
  /profileAge > 21 \* 86400000 && assignmentsForClient\(profile\.id\)\.length > 0/.test(pa), true);
t("the badge counts only visible rows", /visibleReceiptRequests\.length/.test(pa), true);

console.log("\n" + pass + " passed, " + fail + " failed");
process.exit(fail ? 1 : 0);
