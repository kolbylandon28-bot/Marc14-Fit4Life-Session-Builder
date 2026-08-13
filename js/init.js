/* ---------- secondary menus ---------- */
const SECONDARY_MENU_CLOSERS = {
  reviewModal:"closeWorkoutReview",
  coachAdjustmentModal:"closeCoachAdjustment",
  progressReceiptModal:"closeProgressReceiptEditor",
  baselineReviewModal:"closeBaselineReview",
  exerciseSwapModal:"closeExerciseSwap",
  programDayReworkModal:"closeProgramDayRework",
  exerciseEditorModal:"closeExerciseEditor",
  prescriptionEditorModal:"closePrescriptionEditor",
  programStructureEditorModal:"closeProgramStructureEditor",
  profileImpactModal:"closeProfileImpactModal",
  supersetEditorModal:"closeSupersetEditor",
  marketTemplatePreviewModal:"closeProgramTemplatePreview",
  summaryEntryModal:"closeSummaryEntryEditor",
  clientIntakeModal:"closeClientIntake",
  profileEditorModal:"closeProfileEditor",
  completeDeleteModal:"closeCompleteDeleteModal",
  inBodyModal:"closeInBodyModal",
  bodyGoalModal:"closeBodyGoalModal",
  clientPainModal:"closeClientPainReport",
  ownerRequestModal:"closeOwnerRequestDialog",
  calendarEventModal:"closeCalendarEventEditor"
};
function prepareSecondaryMenu(modal) {
  if (!modal || !modal.classList || !modal.classList.contains("modal-backdrop")) return;
  modal.querySelectorAll("button:not([type])").forEach((button) => button.setAttribute("type","button"));
  modal.setAttribute("aria-hidden",modal.classList.contains("open") ? "false" : "true");
}
function closeSecondaryMenu(modal) {
  if (!modal) return false;
  const closer = window[SECONDARY_MENU_CLOSERS[modal.id]];
  if (typeof closer === "function") closer(); else modal.classList.remove("open");
  modal.setAttribute("aria-hidden","true");
  return true;
}
function secondaryMenuFocusable(modal) {
  return [...modal.querySelectorAll('button:not([disabled]),select:not([disabled]),input:not([disabled]):not([type="hidden"]),textarea:not([disabled]),summary,[tabindex]:not([tabindex="-1"])')].filter((element) => !element.hidden && element.offsetParent !== null);
}
function installSecondaryMenuInteractions() {
  document.querySelectorAll(".modal-backdrop").forEach(prepareSecondaryMenu);
  document.addEventListener("click", (event) => {
    const modal = event.target && event.target.classList && event.target.classList.contains("modal-backdrop") ? event.target : null;
    if (modal && modal.classList.contains("open")) closeSecondaryMenu(modal);
  });
  document.addEventListener("keydown", (event) => {
    const openMenus = [...document.querySelectorAll(".modal-backdrop.open")], modal = openMenus[openMenus.length - 1];
    if (!modal) return;
    if (event.key === "Escape") { event.preventDefault(); closeSecondaryMenu(modal); return; }
    if (event.key !== "Tab") return;
    const focusable = secondaryMenuFocusable(modal); if (!focusable.length) return;
    const first = focusable[0], last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  });
  new MutationObserver((records) => records.forEach((record) => {
    if (record.type === "childList") record.addedNodes.forEach((node) => {
      if (node.nodeType !== 1) return;
      if (node.classList && node.classList.contains("modal-backdrop")) prepareSecondaryMenu(node);
      node.querySelectorAll && node.querySelectorAll(".modal-backdrop").forEach(prepareSecondaryMenu);
    });
    if (record.type === "attributes" && record.target.classList && record.target.classList.contains("modal-backdrop")) prepareSecondaryMenu(record.target);
  })).observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:["class"]});
}

/* ---------- init ---------- */
if (document.getElementById) {
  if ("serviceWorker" in navigator && /^https?:$/.test(window.location.protocol)) {
    navigator.serviceWorker.register("/sw.js",{updateViaCache:"none"})
      .then((registration) => registration.update())
      .catch((error) => console.warn("FIT4LIFE offline shell could not start",error));
  }
  renderForms();
  setMode("solo");
  updateHint();
  renderProgramCardioChoices();
  refreshProfileSelects();
  renderProgressHistory();
  applyGymBrand();
  updateNetworkStatus();
  installSecondaryMenuInteractions();
}
