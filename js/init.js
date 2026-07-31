/* ---------- init ---------- */
if (document.getElementById) {
  if ("serviceWorker" in navigator && /^https?:$/.test(window.location.protocol)) {
    navigator.serviceWorker.register("/sw.js").catch((error) => console.warn("FIT4LIFE offline shell could not start",error));
  }
  renderForms();
  setMode("solo");
  updateHint();
  renderProgramCardioChoices();
  refreshProfileSelects();
  renderProgressHistory();
  applyGymBrand();
  updateNetworkStatus();
  if (byId("reviewModal")) {
    byId("reviewModal").addEventListener("click", (event) => { if (event.target === byId("reviewModal")) closeWorkoutReview(); });
    byId("coachAdjustmentModal").addEventListener("click", (event) => { if (event.target === byId("coachAdjustmentModal")) closeCoachAdjustment(); });
    byId("progressReceiptModal").addEventListener("click", (event) => { if (event.target === byId("progressReceiptModal")) closeProgressReceiptEditor(); });
    byId("baselineReviewModal").addEventListener("click", (event) => { if (event.target === byId("baselineReviewModal")) closeBaselineReview(); });
    byId("trainerGateModal").addEventListener("click", (event) => { if (event.target === byId("trainerGateModal")) closeTrainerGate(); });
    byId("exerciseSwapModal").addEventListener("click", (event) => { if (event.target === byId("exerciseSwapModal")) closeExerciseSwap(); });
    byId("exerciseEditorModal").addEventListener("click", (event) => { if (event.target === byId("exerciseEditorModal")) closeExerciseEditor(); });
    byId("prescriptionEditorModal").addEventListener("click", (event) => { if (event.target === byId("prescriptionEditorModal")) closePrescriptionEditor(); });
    byId("supersetEditorModal").addEventListener("click", (event) => { if (event.target === byId("supersetEditorModal")) closeSupersetEditor(); });
    byId("marketTemplatePreviewModal").addEventListener("click", (event) => { if (event.target === byId("marketTemplatePreviewModal")) closeProgramTemplatePreview(); });
    byId("summaryEntryModal").addEventListener("click", (event) => { if (event.target === byId("summaryEntryModal")) closeSummaryEntryEditor(); });
    byId("clientIntakeModal").addEventListener("click", (event) => { if (event.target === byId("clientIntakeModal")) closeClientIntake(); });
    byId("profileEditorModal").addEventListener("click", (event) => { if (event.target === byId("profileEditorModal")) closeProfileEditor(); });
    byId("completeDeleteModal").addEventListener("click", (event) => { if (event.target === byId("completeDeleteModal")) closeCompleteDeleteModal(); });
    byId("inBodyModal").addEventListener("click", (event) => { if (event.target === byId("inBodyModal")) closeInBodyModal(); });
    byId("bodyGoalModal").addEventListener("click", (event) => { if (event.target === byId("bodyGoalModal")) closeBodyGoalModal(); });
    if (document.addEventListener) document.addEventListener("keydown", (event) => { if (event.key === "Escape") { closeWorkoutReview(); closeCoachAdjustment(); closeProgressReceiptEditor(); closeBaselineReview(); closeTrainerGate(); closeExerciseSwap(); closeExerciseEditor(); closePrescriptionEditor(); closeSupersetEditor(); closeProgramTemplatePreview(); closeSummaryEntryEditor(); closeClientIntake(); closeProfileEditor(); closeCompleteDeleteModal(); closeInBodyModal(); closeBodyGoalModal(); } });
  }
}

