/* ---------- branch switcher ----------
   One account can own or coach in several branches. The database no longer guesses
   which one (fit4life_active_org raises on ambiguity), so the choice has to be made
   here and it has to be explicit. */

let branchSwitcherOpen = false;

function branchList() { return Array.isArray(window.fit4lifeBranches) ? window.fit4lifeBranches : []; }

function activeBranch() {
  const id = typeof window.fit4lifeActiveBranchId === "function" ? window.fit4lifeActiveBranchId() : "";
  return branchList().find((row) => row.organization_id === id) || null;
}

const BRANCH_TYPE_LABELS = { university:"University", gym:"Gym", employer:"Business", individual:"People" };

function branchTypeLabel(row) {
  return BRANCH_TYPE_LABELS[String(row && row.org_type || "")] || "Branch";
}

function branchRoleLabel(row) {
  const role = String(row && row.role || "");
  return role ? role.charAt(0).toUpperCase() + role.slice(1) : "";
}

/* Only shown when there is actually a choice. A single-branch account never sees it. */
function syncBranchSwitcher() {
  const host = byId("branchSwitcher");
  if (!host) return;
  const rows = branchList();
  if (rows.length < 2) { host.style.display = "none"; branchSwitcherOpen = false; return; }
  host.style.display = "";
  const current = activeBranch();
  const button = byId("branchSwitcherBtn");
  if (button) {
    button.textContent = (current ? current.name : "Pick a branch") + " ▾";
    button.setAttribute("aria-expanded", branchSwitcherOpen ? "true" : "false");
  }
  const menu = byId("branchSwitcherMenu");
  if (!menu) return;
  menu.style.display = branchSwitcherOpen ? "" : "none";
  if (!branchSwitcherOpen) return;
  menu.innerHTML = rows.map((row) => {
    const on = current && row.organization_id === current.organization_id;
    return '<button type="button" class="branch-option' + (on ? ' on' : '') + '"'
      + (on ? ' aria-current="true"' : '')
      + ' onclick="chooseBranch(\'' + escapeHtml(row.organization_id) + '\')">'
      + '<span class="branch-option-name">' + escapeHtml(row.name) + '</span>'
      + '<span class="branch-option-meta">' + escapeHtml(branchTypeLabel(row))
      + (branchRoleLabel(row) ? ' · ' + escapeHtml(branchRoleLabel(row)) : '') + '</span></button>';
  }).join("");
}

function toggleBranchSwitcher() {
  branchSwitcherOpen = !branchSwitcherOpen;
  syncBranchSwitcher();
}

function chooseBranch(id) {
  branchSwitcherOpen = false;
  if (typeof window.fit4lifeSwitchBranch === "function") window.fit4lifeSwitchBranch(id);
}

/* The database refused to pick, so the app must not pretend either. Nothing else
   renders until a branch is chosen. */
function renderBranchChoiceGate() {
  const grid = byId("roleChoiceGrid"), heading = byId("roleHeroCopy"), path = byId("roleLevelPath");
  if (!grid) return false;
  const rows = branchList();
  if (!rows.length) return false;
  if (path) path.innerHTML = "";
  if (heading) heading.innerHTML = '<h1>Which branch<br><span class="grad-text">are you opening?</span></h1>'
    + '<p>You work in ' + rows.length + ' of them. Nothing loads until you pick, so one customer’s data can never open under another’s name.</p>';
  grid.className = "role-choice-grid";
  grid.innerHTML = rows.map((row) => '<button type="button" class="tool-card role-card" onclick="chooseBranch(\''
    + escapeHtml(row.organization_id) + '\')">'
    + '<span class="tc-tag">' + escapeHtml(branchTypeLabel(row)) + '</span>'
    + '<div class="tc-title">' + escapeHtml(row.name) + '</div>'
    + '<div class="tc-desc">' + escapeHtml(branchRoleLabel(row) || "Member") + '</div>'
    + '<span class="role-action">Open →</span></button>').join("");
  return true;
}

function branchChoicePending() { return window.fit4lifeBranchChoiceNeeded === true; }

async function initBranchSwitcher() {
  if (typeof window.fit4lifeLoadBranches !== "function") return;
  await window.fit4lifeLoadBranches(true);
  syncBranchSwitcher();
  if (branchChoicePending()) renderBranchChoiceGate();
}

if (typeof window !== "undefined" && window.addEventListener) {
  window.addEventListener("fit4life-cloud-ready", () => { initBranchSwitcher(); });
  if (window.fit4lifeCloudReady) initBranchSwitcher();
}

if (typeof document !== "undefined" && document.addEventListener) {
  document.addEventListener("click", (event) => {
    if (!branchSwitcherOpen) return;
    const host = byId("branchSwitcher");
    if (host && !host.contains(event.target)) { branchSwitcherOpen = false; syncBranchSwitcher(); }
  });
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { branchTypeLabel, branchRoleLabel, BRANCH_TYPE_LABELS };
}
