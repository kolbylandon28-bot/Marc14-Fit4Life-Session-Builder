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
  trainerConsultationModal:"closeTrainerConsultationReview",
  profileEditorModal:"closeProfileEditor",
  completeDeleteModal:"closeCompleteDeleteModal",
  inBodyModal:"closeInBodyModal",
  bodyGoalModal:"closeBodyGoalModal",
  clientPainModal:"closeClientPainReport",
  ownerRequestModal:"closeOwnerRequestDialog",
  calendarEventModal:"closeCalendarEventEditor",
  calendarSummaryModal:"closeCalendarSummary",
  followUpModal:"closeFollowUpDraft",
  saveWorkoutModal:"closeSaveWorkoutDialog",
  inviteClientModal:"closeInviteClientDialog"
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

/* ---------- install to home screen ---------- */
// FIT4LIFE has been installable since it became a PWA, but nothing ever told anyone,
// so almost nobody discovered it. Chrome and Android fire beforeinstallprompt and get
// a real install button; iOS Safari never fires it, so those users get the manual
// Share -> Add to Home Screen instructions instead. Sits below the auth gate on
// purpose (z-index 900 vs 1000) so it appears once someone is actually signed in.
const INSTALL_DISMISS_KEY = "fit4life-install-dismissed";
let deferredInstallPrompt = null;
function appAlreadyInstalled() {
  return window.matchMedia && window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
}
function installBannerDismissed() {
  try { return localStorage.getItem(INSTALL_DISMISS_KEY) === "1"; } catch (error) { return false; }
}
function dismissInstallBanner() {
  try { localStorage.setItem(INSTALL_DISMISS_KEY,"1"); } catch (error) {}
  const banner = document.getElementById("installBanner"); if (banner) banner.remove();
}
function isIosSafari() {
  const ua = window.navigator.userAgent || "";
  return /iPad|iPhone|iPod/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua);
}
function showInstallBanner(mode) {
  if (document.getElementById("installBanner") || appAlreadyInstalled() || installBannerDismissed()) return;
  const banner = document.createElement("div");
  banner.id = "installBanner";
  banner.className = "install-banner";
  banner.setAttribute("role","complementary");
  banner.innerHTML = mode === "ios"
    ? '<div class="install-banner-copy"><b>Add FIT4LIFE to your home screen</b><span>Tap the Share button, then <b>Add to Home Screen</b>.</span></div>'
      + '<div class="install-banner-actions"><button type="button" class="small-btn" id="installDismissBtn">Got it</button></div>'
    : '<div class="install-banner-copy"><b>Install FIT4LIFE</b><span>Get an app icon and a full-screen workout view.</span></div>'
      + '<div class="install-banner-actions"><button type="button" class="small-btn primary" id="installAcceptBtn">Install</button><button type="button" class="small-btn" id="installDismissBtn">Not now</button></div>';
  document.body.appendChild(banner);
  const dismiss = document.getElementById("installDismissBtn");
  if (dismiss) dismiss.addEventListener("click",dismissInstallBanner);
  const accept = document.getElementById("installAcceptBtn");
  if (accept) accept.addEventListener("click",async () => {
    if (!deferredInstallPrompt) { dismissInstallBanner(); return; }
    const prompt = deferredInstallPrompt; deferredInstallPrompt = null;
    try { prompt.prompt(); await prompt.userChoice; } catch (error) {}
    dismissInstallBanner();
  });
}
function installPromptInteractions() {
  if (appAlreadyInstalled() || installBannerDismissed()) return;
  window.addEventListener("beforeinstallprompt",(event) => {
    event.preventDefault(); deferredInstallPrompt = event; showInstallBanner("prompt");
  });
  window.addEventListener("appinstalled",dismissInstallBanner);
  // iOS never fires beforeinstallprompt, so offer the manual route after a short delay.
  if (isIosSafari()) window.setTimeout(() => showInstallBanner("ios"),4000);
}

/* ---------- init ---------- */
if (document.getElementById) {
  if ("serviceWorker" in navigator && /^https?:$/.test(window.location.protocol)) {
    navigator.serviceWorker.register("/sw.js",{updateViaCache:"none"})
      .then((registration) => registration.update())
      .catch((error) => console.warn("FIT4LIFE offline shell could not start",error));
  }
  // Flex and Partner split into two tiers each on 2026-08-24. Rewrite any profile still
  // holding a retired id before anything reads it, and push the correction to Supabase so
  // other devices do not sync the old value straight back.
  if (typeof migrateStoredMembershipTiers === "function") {
    const moved = migrateStoredMembershipTiers();
    if (moved && typeof window.fit4lifeCloudSaveProfileNow === "function") window.fit4lifeCloudSaveProfileNow();
    if (moved) console.info("FIT4LIFE: migrated " + moved + " client profile(s) to the new tier ids");
  }
  // a walkthrough interrupted by a closed tab left practice data behind; put the real data back first
  if (typeof walkthroughRecoverIfInterrupted === "function") walkthroughRecoverIfInterrupted();
  cleanupLegacyCalibrationAssignments();
  renderForms();
  setMode("solo");
  updateHint();
  renderProgramCardioChoices();
  refreshProfileSelects();
  renderProgressHistory();
  applyGymBrand();
  updateNetworkStatus();
  installSecondaryMenuInteractions();
  installPromptInteractions();
}
