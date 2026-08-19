/* ---------- V14 workout feedback, shared dismissals, and reports ---------- */
(function fit4LifeFeedbackReportsModule() {
  "use strict";

  const reportState = {
    profileId:"",
    from:reportDateKey(new Date(Date.now() - 29 * 86400000)),
    to:reportDateKey(new Date()),
    query:""
  };
  const reviewPickerState = { movements:[],liked:new Set(),disliked:new Set(),assignment:null,existing:null };

  function reportDateKey(value) {
    const date = value instanceof Date ? value : new Date(value || Date.now());
    if (Number.isNaN(date.getTime())) return "";
    return [date.getFullYear(),String(date.getMonth() + 1).padStart(2,"0"),String(date.getDate()).padStart(2,"0")].join("-");
  }
  function recordTime(value) { const time = new Date(value || 0).getTime(); return Number.isFinite(time) ? time : 0; }
  function displayDate(value,withTime) {
    const date = new Date(value || 0); if (Number.isNaN(date.getTime())) return "Date unavailable";
    return withTime ? date.toLocaleString([],{month:"short",day:"numeric",year:"numeric",hour:"numeric",minute:"2-digit"}) : date.toLocaleDateString([],{month:"short",day:"numeric",year:"numeric"});
  }
  function completionLabel(value) { return ({all:"Everything",most:"Most of it",some:"About half",stopped:"Stopped early"})[value] || String(value || "Not entered").replace(/_/g," "); }
  function reviewArray(review,key) {
    const current = review && review[key];
    if (Array.isArray(current)) return current.map((item) => typeof item === "string" ? {id:exerciseId({name:item}),name:item} : item).filter((item) => item && item.name);
    const legacy = review && review[key === "likedExercises" ? "liked" : "disliked"];
    return String(legacy || "").split(/[,;\n]+/).map((name) => name.trim()).filter(Boolean).map((name) => ({id:exerciseId({name}),name}));
  }
  function reviewAssignmentForSession(session) {
    return loadAssignedWorkouts().find((item) => assignmentSessionIds(item).includes(session.sessionId)) || null;
  }
  function sessionMovementSnapshot(session,existingReview) {
    if (existingReview && Array.isArray(existingReview.performedExercises) && existingReview.performedExercises.length) return existingReview.performedExercises.map((item) => ({...item}));
    const sets = getSessionSets(session.sessionId), counts = new Map();
    sets.forEach((entry) => counts.set(entry.label,Number(counts.get(entry.label) || 0) + 1));
    const substitutions = loadProgress().filter((entry) => entry.type === "substitution" && entry.sessionId === session.sessionId && entry.data);
    const skipped = activeWorkout && activeWorkout.sessionId === session.sessionId ? activeWorkout.skippedExercises || {} : {};
    const movements = [];
    (session.blocks || []).forEach((block) => (block.items || []).forEach((movement) => {
      if (movements.some((item) => item.name === movement.name)) return;
      const skippedMovement = Object.keys(skipped).some((key) => key.endsWith("::" + movement.name) && skipped[key]);
      const swap = substitutions.slice().reverse().find((entry) => entry.data.to === movement.name);
      movements.push({
        id:exerciseId(movement),name:movement.name,block:block.title || "Workout",
        loggedSets:Number(counts.get(movement.name) || 0),skipped:Boolean(skippedMovement),
        substitutedFrom:swap && swap.data.from || "",snapshotAt:new Date().toISOString()
      });
    }));
    const anyLogged = movements.some((item) => item.loggedSets > 0);
    return movements.filter((item) => !item.skipped && (!anyLogged || item.loggedSets > 0));
  }
  function pickerSelectionLabel(side) {
    const selected = reviewPickerState[side];
    if (!selected.size) return "Choose from this workout";
    const names = reviewPickerState.movements.filter((item) => selected.has(item.id)).map((item) => item.name);
    return names.length === 1 ? names[0] : names.length + " movements selected";
  }
  function syncReviewPickerHiddenFields() {
    ["liked","disliked"].forEach((side) => {
      const picker = byId(side === "liked" ? "reviewLikedPicker" : "reviewDislikedPicker"), hidden = byId(side === "liked" ? "reviewLiked" : "reviewDisliked");
      const names = reviewPickerState.movements.filter((item) => reviewPickerState[side].has(item.id)).map((item) => item.name);
      if (picker) picker.querySelector("summary").textContent = pickerSelectionLabel(side);
      if (hidden) hidden.value = names.join(", ");
    });
  }
  function renderReviewMovementPicker(side) {
    const target = byId(side === "liked" ? "reviewLikedOptions" : "reviewDislikedOptions"); if (!target) return;
    const opposite = side === "liked" ? "disliked" : "liked";
    target.innerHTML = reviewPickerState.movements.map((item) => '<label class="movement-feedback-option" data-movement-search="' + escapeHtml(item.name.toLowerCase()) + '"><input type="checkbox" value="' + escapeHtml(item.id) + '"' + (reviewPickerState[side].has(item.id) ? ' checked' : '') + ' onchange="toggleReviewMovementFeedback(\'' + side + '\',this.value,this.checked)"><span><b>' + escapeHtml(item.name) + '</b><small>' + escapeHtml(item.substitutedFrom ? "Replaced " + item.substitutedFrom + " · final workout movement" : (item.block || "Workout movement")) + (item.loggedSets ? " · " + item.loggedSets + " logged set" + (item.loggedSets === 1 ? "" : "s") : "") + '</small></span>' + (reviewPickerState[opposite].has(item.id) ? '<em>Selected in the other list</em>' : '') + '</label>').join("") || '<div class="movement-feedback-empty">No completed movements were found for this workout.</div>';
    syncReviewPickerHiddenFields();
  }
  window.toggleReviewMovementFeedback = function toggleReviewMovementFeedback(side,id,checked) {
    if (!["liked","disliked"].includes(side)) return;
    const opposite = side === "liked" ? "disliked" : "liked";
    if (checked) { reviewPickerState[side].add(id); reviewPickerState[opposite].delete(id); }
    else reviewPickerState[side].delete(id);
    renderReviewMovementPicker("liked"); renderReviewMovementPicker("disliked");
  };
  window.filterReviewMovementPicker = function filterReviewMovementPicker(side,value) {
    const target = byId(side === "liked" ? "reviewLikedOptions" : "reviewDislikedOptions"), query = String(value || "").trim().toLowerCase();
    if (target) target.querySelectorAll("[data-movement-search]").forEach((row) => { row.hidden = Boolean(query) && !row.dataset.movementSearch.includes(query); });
  };
  function populateReviewFields(review) {
    if (!review) return;
    const set = (id,value) => { const field = byId(id); if (field && value != null && value !== "") field.value = String(value); };
    set("reviewDifficulty",review.difficulty); set("reviewCompletion",review.completion); set("reviewEnergy",review.energy); set("reviewRir",review.rir);
    set("reviewForm",review.formQuality); set("reviewRange",review.rangeOfMotion); set("reviewTimeFit",review.timeFit); set("reviewPain",review.pain || review.painLevel);
    set("reviewInjuryArea",review.injuryArea); set("reviewMovementChanged",review.movementChanged ? "yes" : "no"); set("reviewPainScore",review.painScore);
    set("reviewPainExercise",review.painExercise); set("reviewInjuryDetails",review.injuryDetails); set("reviewNotes",review.notes); set("reviewQuestions",review.questions);
  }
  window.refreshWorkoutReviewMovementChoices = function refreshWorkoutReviewMovementChoices() {
    const chosen = reviewSessions().find((item) => item.key === byId("reviewClient").value); if (!chosen) return;
    const assignment = reviewAssignmentForSession(chosen.session), existingProgress = loadProgress().find((entry) => entry.type === "workout" && entry.sessionId === chosen.session.sessionId && entry.data), existing = assignment && assignment.clientReview || existingProgress && existingProgress.data || null;
    reviewPickerState.assignment = assignment; reviewPickerState.existing = existingProgress || null;
    reviewPickerState.movements = sessionMovementSnapshot(chosen.session,existing);
    reviewPickerState.liked = new Set(reviewArray(existing,"likedExercises").map((item) => item.id));
    reviewPickerState.disliked = new Set(reviewArray(existing,"dislikedExercises").map((item) => item.id));
    populateReviewFields(existing); renderReviewMovementPicker("liked"); renderReviewMovementPicker("disliked"); updateReviewPainFields();
    const save = byId("reviewSaveOnlyBtn"); if (save) save.textContent = existing ? "Update workout review" : (portalRole === "client" ? "Send workout review" : "Save only");
  };

  const legacyOpenWorkoutReview = window.openWorkoutReview;
  window.openWorkoutReview = function openWorkoutReviewV14() {
    legacyOpenWorkoutReview();
    const select = byId("reviewClient"); if (select) select.onchange = window.refreshWorkoutReviewMovementChoices;
    window.refreshWorkoutReviewMovementChoices();
  };
  window.openClientSavedWorkoutReview = function openClientSavedWorkoutReview(assignmentId) {
    const assignment = loadAssignedWorkouts().find((item) => item.id === assignmentId), profile = activeClientProfile();
    if (!assignment || !assignment.clientReview || !assignment.session || !profile || (assignment.profileId && assignment.profileId !== profile.id)) { showToast("That saved workout review is no longer available"); return false; }
    if (assignment.coachReviewedAt) { showToast("Your coach already completed this review. The saved record remains in your history."); return false; }
    state.session = JSON.parse(JSON.stringify(assignment.session)); state.sessionOptions = [];
    openWorkoutReview(); return true;
  };

  function writeReviewProgress(session,chosen,review,existing) {
    const entries = loadProgress(), now = review.updatedAt, injuryText = review.pain !== "none" ? " · " + (review.injuryArea ? INJURY_LABELS[review.injuryArea] : "Pain reported") : " · No pain reported";
    const record = {
      id:existing && existing.id || Date.now() + "-" + Math.random().toString(16).slice(2),date:existing && existing.date || review.submittedAt,
      updatedAt:now,type:"workout",client:session.spec.client || chosen.label,profileId:session.spec.profileId || "",sessionId:session.sessionId,
      label:session.goalLabel + " workout review",value:review.loggedSets + " logged sets · difficulty " + review.difficulty + "/10",
      note:(review.completion === "all" ? "Completed" : "Completion: " + review.completion) + injuryText + (review.notes ? " · " + review.notes : ""),data:review
    };
    const index = existing ? entries.findIndex((entry) => entry.id === existing.id) : -1;
    if (index >= 0) entries[index] = {...entries[index],...record,id:existing.id}; else entries.unshift(record);
    return writeProgress(entries) ? record : null;
  }
  function updateProfileFeedback(session,assignment,review) {
    const profiles = loadProfiles(), index = profiles.findIndex((profile) => profile.id === session.spec.profileId) >= 0 ? profiles.findIndex((profile) => profile.id === session.spec.profileId) : profiles.findIndex((profile) => clientMatches(profile.name,session.spec.client));
    if (index < 0) return null;
    const profile = profiles[index], history = Array.isArray(profile.workoutFeedbackHistory) ? profile.workoutFeedbackHistory.slice() : [], historyIndex = history.findIndex((item) => item.id === review.id);
    const feedbackRecord = {id:review.id,assignmentId:assignment && assignment.id || "",sessionId:session.sessionId,workoutName:session.goalLabel || "Workout",submittedAt:review.submittedAt,updatedAt:review.updatedAt,revision:review.revision,completion:review.completion,difficulty:review.difficulty,energy:review.energy,pain:review.pain,painLevel:review.painLevel,likedExercises:review.likedExercises,dislikedExercises:review.dislikedExercises,performedExercises:review.performedExercises,notes:review.notes,questions:review.questions};
    if (historyIndex >= 0) history[historyIndex] = {...history[historyIndex],...feedbackRecord}; else history.unshift(feedbackRecord);
    const evidence = (Array.isArray(profile.exercisePreferenceEvidence) ? profile.exercisePreferenceEvidence : []).filter((item) => item.reviewId !== review.id);
    review.likedExercises.forEach((movement) => evidence.push({id:review.id + ":like:" + movement.id,reviewId:review.id,assignmentId:assignment && assignment.id || "",sessionId:session.sessionId,exerciseId:movement.id,exerciseName:movement.name,preference:"like",source:"client_workout_review",recordedAt:review.updatedAt,revision:review.revision}));
    review.dislikedExercises.forEach((movement) => evidence.push({id:review.id + ":dislike:" + movement.id,reviewId:review.id,assignmentId:assignment && assignment.id || "",sessionId:session.sessionId,exerciseId:movement.id,exerciseName:movement.name,preference:"dislike",source:"client_workout_review",recordedAt:review.updatedAt,revision:review.revision}));
    const preferences = {...(profile.exercisePreferences || {})};
    [...review.likedExercises,...review.dislikedExercises].forEach((movement) => {
      const latest = evidence.filter((item) => item.exerciseId === movement.id).sort((a,b) => recordTime(b.recordedAt) - recordTime(a.recordedAt))[0];
      if (latest && !["discomfort","unfamiliar"].includes(preferences[movement.id])) preferences[movement.id] = latest.preference;
    });
    const injuries = [...(profile.injuries || [])];
    if (painRequiresSafetyHold(review.painLevel || review.pain,review.movementChanged) && review.injuryArea && !injuries.includes(review.injuryArea)) injuries.push(review.injuryArea);
    profiles[index] = {...profile,lastReview:review,workoutFeedbackHistory:history.slice(0,200),exercisePreferenceEvidence:evidence.slice(-1000),exercisePreferences:preferences,injuries,updatedAt:review.updatedAt};
    return writeProfiles(profiles) ? profiles[index] : null;
  }
  window.saveWorkoutReview = function saveWorkoutReviewV14(openAnalysis) {
    const chosen = reviewSessions().find((item) => item.key === byId("reviewClient").value); if (!chosen) { showToast("Choose the workout to review"); return null; }
    const session = chosen.session, assignment = reviewAssignmentForSession(session), existingProgress = loadProgress().find((entry) => entry.type === "workout" && entry.sessionId === session.sessionId && entry.data), existingReview = assignment && assignment.clientReview || existingProgress && existingProgress.data;
    if (portalRole === "client" && assignment && assignment.coachReviewedAt) { showToast("Your trainer already reviewed this submission. The saved record remains in your history."); return null; }
    const movementChanged = byId("reviewMovementChanged").value === "yes"; let painValue = byId("reviewPain").value;
    if (movementChanged && painLevelInfo(painValue).rank < PAIN_LEVELS.orange.rank) painValue = "changed";
    const painLevel = normalizePainLevel(painValue,movementChanged), injuryArea = byId("reviewInjuryArea").value, injuryDetails = byId("reviewInjuryDetails").value.trim(), rawPainScore = byId("reviewPainScore").value;
    if (painValue !== "none" && !injuryArea) { showToast("Choose the body area so your trainer knows what to review"); byId("reviewInjuryArea").focus(); return null; }
    if (painRequiresSafetyHold(painLevel,movementChanged) && injuryDetails.length < 5) { showToast("Briefly describe which movement caused the pain and what changed"); byId("reviewInjuryDetails").focus(); return null; }
    const now = new Date().toISOString(), sets = getSessionSets(session.sessionId), performed = sessionMovementSnapshot(session,existingReview);
    const likedExercises = performed.filter((item) => reviewPickerState.liked.has(item.id)).map((item) => ({id:item.id,name:item.name,substitutedFrom:item.substitutedFrom || ""}));
    const dislikedExercises = performed.filter((item) => reviewPickerState.disliked.has(item.id)).map((item) => ({id:item.id,name:item.name,substitutedFrom:item.substitutedFrom || ""}));
    const review = {
      id:existingReview && existingReview.id || "review-" + (assignment && assignment.id || session.sessionId),revision:Number(existingReview && existingReview.revision || 0) + 1,
      submittedAt:existingReview && existingReview.submittedAt || now,updatedAt:now,submittedByRole:portalRole === "client" ? "client" : currentAccountIdentity().role || "trainer",
      difficulty:Number(byId("reviewDifficulty").value),completion:byId("reviewCompletion").value,energy:Number(byId("reviewEnergy").value),
      pain:legacyPainValue(painLevel,movementChanged),painLevel,movementChanged,painScore:rawPainScore === "" ? null : Math.max(0,Math.min(10,Number(rawPainScore))),
      painExercise:byId("reviewPainExercise").value.trim(),injuryArea,injuryDetails,rir:Number(byId("reviewRir").value),formQuality:byId("reviewForm").value,rangeOfMotion:byId("reviewRange").value,timeFit:byId("reviewTimeFit").value,
      notes:byId("reviewNotes").value.trim(),questions:byId("reviewQuestions").value.trim(),liked:likedExercises.map((item) => item.name).join(", "),disliked:dislikedExercises.map((item) => item.name).join(", "),
      likedExercises,dislikedExercises,performedExercises:performed,goals:[...(session.spec.goals || [session.spec.goal]).filter(Boolean)],duration:session.spec.minutes,
      prescribedExercises:(session.blocks || []).reduce((sum,block) => sum + (block.items || []).length,0),loggedSets:sets.length,
      actualDuration:activeWorkout && activeWorkout.startedAt ? Math.max(1,Math.round((Date.now() - new Date(activeWorkout.startedAt).getTime()) / 60000)) : session.spec.minutes,personalRecords:sessionPersonalRecords(session.sessionId)
    };
    const saved = writeReviewProgress(session,chosen,review,existingProgress); if (!saved) { showToast("The workout review could not be saved. Nothing was changed."); return null; }
    const assignments = loadAssignedWorkouts(), assignmentIndex = assignment ? assignments.findIndex((item) => item.id === assignment.id) : -1;
    let completed = assignment;
    if (assignmentIndex >= 0) {
      const completedAt = assignments[assignmentIndex].completedAt || now;
      assignments[assignmentIndex] = {...assignments[assignmentIndex],status:"completed",completedAt,updatedAt:now,clientReview:review};
      applyReviewPreferencesToProfile(assignments[assignmentIndex].profileId,review);
      if (!writeAssignedWorkouts(assignments)) { showToast("The review saved locally, but the assignment status did not update. Try again before leaving this page."); return null; }
      completed = assignments[assignmentIndex];
    }
    const profile = updateProfileFeedback(session,completed,review);
    refreshHistoryFilters(); renderProgressHistory(); renderTrainerAttention(); closeWorkoutReview();
    showToast(existingReview ? "Workout review updated for your trainer" : review.questions ? "Workout review sent — your question is highlighted for the trainer" : "Workout review sent to your trainer");
    if (portalRole === "client" && completed) { activeWorkout = null; saveActiveWorkoutState(); activateClientProfile(completed.profileId); }
    if (openAnalysis && profile) openTrainerHub(profile.name);
    return review;
  };

  function feedbackTextBlock(label,value,emptyCopy) {
    return '<article><span>' + escapeHtml(label) + '</span><div>' + (value ? escapeHtml(value) : '<em>' + escapeHtml(emptyCopy || "Not entered") + '</em>') + '</div></article>';
  }
  function movementChips(items,tone) {
    return items && items.length ? '<div class="coach-feedback-chips ' + tone + '">' + items.map((item) => '<span>' + escapeHtml(item.name || item) + (item.substitutedFrom ? '<small>replaced ' + escapeHtml(item.substitutedFrom) + '</small>' : '') + '</span>').join("") + '</div>' : '<div class="coach-feedback-empty">None selected</div>';
  }
  function coachFeedbackHtml(assignment) {
    const review = assignment && assignment.clientReview || {};
    if (!assignment || !assignment.clientReview) return '<div class="coach-feedback-empty">The client has not submitted a finish review for this workout.</div>';
    return '<div class="coach-feedback-head"><div><span class="client-section-label">Client submission · revision ' + Number(review.revision || 1) + '</span><h3>What the client actually reported</h3><p>Submitted ' + escapeHtml(displayDate(review.updatedAt || review.submittedAt || assignment.completedAt,true)) + '. Comments below are shown exactly as entered.</p></div><span class="assignment-pill ' + escapeHtml(assignmentStatus(assignment)) + '">' + escapeHtml(assignment.coachReviewedAt ? "Coach reviewed" : "Awaiting coach review") + '</span></div>' +
      '<div class="coach-feedback-metrics"><div><b>' + escapeHtml(completionLabel(review.completion)) + '</b><span>completed</span></div><div><b>' + (review.difficulty || "—") + '/10</b><span>difficulty</span></div><div><b>' + (review.energy || "—") + '/5</b><span>energy after</span></div><div><b>' + (review.loggedSets == null ? assignmentProgressStats(assignment).logged : review.loggedSets) + '</b><span>sets logged</span></div></div>' +
      '<div class="coach-feedback-movements"><section><h4>Liked movements</h4>' + movementChips(reviewArray(review,"likedExercises"),"positive") + '</section><section><h4>Disliked / unclear movements</h4>' + movementChips(reviewArray(review,"dislikedExercises"),"negative") + '</section></div>' +
      '<div class="coach-feedback-comments">' + feedbackTextBlock("Question for coach",review.questions,"No question entered") + feedbackTextBlock("Workout notes",review.notes,"No workout note entered") + (review.pain && review.pain !== "none" ? feedbackTextBlock("Pain / movement change",[review.injuryArea && (INJURY_LABELS[review.injuryArea] || review.injuryArea),review.painExercise,review.injuryDetails].filter(Boolean).join(" · "),"Pain was selected without a note") : feedbackTextBlock("Pain / movement change","No pain reported")) + '</div>';
  }
  const legacyOpenCoachAdjustment = window.openCoachAdjustment;
  window.openCoachAdjustment = function openCoachAdjustmentV14(profileId,assignmentId) {
    const profile = loadProfiles().find((item) => item.id === profileId), assignments = assignmentsForClient(profileId);
    const exact = assignmentId && assignments.find((item) => item.id === assignmentId);
    if (!exact) { const result = legacyOpenCoachAdjustment(profileId); const current = loadAssignedWorkouts().find((item) => item.id === coachAdjustmentAssignmentId), mount = byId("coachAdjustmentClientFeedback"); if (mount) mount.innerHTML = coachFeedbackHtml(current); return result; }
    if (!requireTrainerMutation("review and adjust a client plan")) return null;
    coachAdjustmentAssignmentId = exact.id;
    const review = exact.clientReview || {}, sets = assignmentProgressStats(exact), formal = formalReviewStatus(profile);
    byId("coachAdjustmentProfileId").value = profile.id; byId("coachAdjustmentTitle").textContent = "Review " + profile.name;
    byId("coachAdjustmentSummary").textContent = (exact.programDayName || review.workoutName || "Assigned workout") + " · " + sets.logged + " of " + sets.planned + " planned efforts logged";
    byId("coachAdjustmentClientFeedback").innerHTML = coachFeedbackHtml(exact);
    byId("coachAdjustmentAction").value = exact.nextAction || recommendedCoachAction(review); byId("coachAdjustmentNote").value = exact.coachNote || "";
    byId("coachFormalReviewComplete").checked = false; byId("coachFormalDecision").value = "continue"; byId("coachFormalNote").value = ""; byId("formalReviewBox").open = formal.due;
    byId("formalReviewSummary").textContent = formal.due ? "Four-week formal review · due now" : "Four-week formal review · " + formal.count + "/4 workouts";
    byId("coachAdjustmentModal").classList.add("open"); return exact;
  };
  const legacySaveCoachAdjustment = window.saveCoachAdjustment;
  window.saveCoachAdjustment = function saveCoachAdjustmentV14(buildNext) {
    const assignmentId = coachAdjustmentAssignmentId, profileId = byId("coachAdjustmentProfileId") && byId("coachAdjustmentProfileId").value, result = legacySaveCoachAdjustment(buildNext);
    if (!result || !profileId) return result;
    const assignment = loadAssignedWorkouts().find((item) => item.id === assignmentId), profiles = loadProfiles(), index = profiles.findIndex((item) => item.id === profileId);
    if (assignment && index >= 0) {
      const history = (profiles[index].workoutFeedbackHistory || []).map((item) => item.assignmentId === assignmentId ? {...item,coachReviewedAt:assignment.coachReviewedAt,coachDecision:assignment.nextAction,coachNote:assignment.coachNote} : item);
      profiles[index] = {...profiles[index],workoutFeedbackHistory:history,updatedAt:assignment.coachReviewedAt || profiles[index].updatedAt}; writeProfiles(profiles);
    }
    return result;
  };

  function recentFeedbackForProfile(profile) {
    const assignments = assignmentsForClient(profile.id).filter((item) => item.clientReview).sort((a,b) => recordTime(b.clientReview.updatedAt || b.completedAt) - recordTime(a.clientReview.updatedAt || a.completedAt));
    return assignments;
  }
  function trainerFeedbackRecordHtml(profile) {
    if (!profile) return "";
    const assignments = recentFeedbackForProfile(profile), latest = assignments[0];
    if (!latest) return '<section class="profile-feedback-summary"><div><span class="client-section-label">Client feedback record</span><h4>No workout feedback yet</h4><p>Completed client reviews will be summarized here and retained in workout history.</p></div></section>';
    const review = latest.clientReview;
    return '<section class="profile-feedback-summary"><div class="profile-feedback-summary-head"><div><span class="client-section-label">Client feedback record</span><h4>Latest workout feedback</h4><p>' + escapeHtml(displayDate(review.updatedAt || latest.completedAt,true)) + ' · ' + assignments.length + ' saved review' + (assignments.length === 1 ? '' : 's') + '</p></div><button class="small-btn" onclick="openCoachAdjustment(\'' + escapeHtml(profile.id) + '\',\'' + escapeHtml(latest.id) + '\')">Open exact review</button></div><div class="profile-feedback-quick"><span><b>' + escapeHtml(completionLabel(review.completion)) + '</b> completion</span><span><b>' + (review.difficulty || '—') + '/10</b> difficulty</span><span><b>' + (review.questions ? 'Question waiting' : latest.coachReviewedAt ? 'Reviewed' : 'Awaiting review') + '</b></span></div><div class="profile-feedback-voice"><p><b>Client note</b>' + escapeHtml(review.notes || 'No workout note entered') + '</p><p><b>Coach question</b>' + escapeHtml(review.questions || 'No question entered') + '</p></div><div class="coach-feedback-movements"><section><h4>Liked</h4>' + movementChips(reviewArray(review,'likedExercises'),'positive') + '</section><section><h4>Disliked / unclear</h4>' + movementChips(reviewArray(review,'dislikedExercises'),'negative') + '</section></div></section>';
  }
  const legacyTrainerAssignmentLoopHtml = window.trainerAssignmentLoopHtml;
  window.trainerAssignmentLoopHtml = function trainerAssignmentLoopHtmlV14(profile) { return legacyTrainerAssignmentLoopHtml(profile) + trainerFeedbackRecordHtml(profile); };

  function attentionFingerprint(item) {
    if (!item) return "";
    if (item.kind === "workout") {
      const assignment = loadAssignedWorkouts().find((entry) => "workout-review:" + entry.id === item.id), review = assignment && assignment.clientReview;
      return "workout:" + (assignment && assignment.id || item.id) + ":" + Number(review && review.revision || 1) + ":" + String(review && review.updatedAt || assignment && assignment.completedAt || item.createdAt || "");
    }
    return [item.kind,item.id,item.createdAt || "",item.updatedAt || ""].join(":");
  }
  function protectedAttentionItem(item) {
    if (!item) return true;
    if (["safety","access","approvals"].includes(item.category) || ["pain","trainer_request","account_request","owner_request"].includes(item.kind)) return true;
    if (item.kind === "consultation") { const profile = loadProfiles().find((entry) => entry.id === item.profileId); return Boolean(profile && profile.limitationReviewRequired); }
    if (item.kind === "workout") {
      const assignment = loadAssignedWorkouts().find((entry) => "workout-review:" + entry.id === item.id), review = assignment && assignment.clientReview;
      return Boolean(review && painRequiresSafetyHold(review.painLevel || review.pain,review.movementChanged));
    }
    return false;
  }
  const v6AttentionItemIsVisible = window.attentionItemIsVisible;
  window.attentionItemIsVisible = function attentionItemIsVisibleV14(item,state) {
    const saved = state && state[item.id];
    if (saved && saved.status === "dismissed" && saved.sourceFingerprint === attentionFingerprint(item)) return false;
    return v6AttentionItemIsVisible(item,state);
  };
  // A client saying they liked or disliked a movement is only useful if it changes what
  // they get next. The profile already carries exercisePreferences and the generator
  // already weights them, so review feedback is written straight into that rather than
  // becoming a second, parallel preference system.
  function applyReviewPreferencesToProfile(profileId,review) {
    if (!profileId || !review) return false;
    const liked = Array.isArray(review.likedExercises) ? review.likedExercises : [];
    const disliked = Array.isArray(review.dislikedExercises) ? review.dislikedExercises : [];
    if (!liked.length && !disliked.length) return false;
    const profiles = loadProfiles(), index = profiles.findIndex((item) => item.id === profileId);
    if (index < 0) return false;
    const preferences = { ...(profiles[index].exercisePreferences || {}) };
    // Disliked wins on a conflict: a movement someone dislikes is the one worth avoiding,
    // and a trainer can always override in the profile editor.
    liked.forEach((name) => { const key = exerciseId({ name }); if (key) preferences[key] = "liked"; });
    disliked.forEach((name) => { const key = exerciseId({ name }); if (key) preferences[key] = "disliked"; });
    profiles[index] = { ...profiles[index],exercisePreferences:preferences,updatedAt:new Date().toISOString() };
    return writeProfiles(profiles);
  }
  window.openDismissCoachAttention = function openDismissCoachAttention(itemId) {
    const item = trainerAttentionSnapshot().items.find((entry) => entry.id === itemId);
    if (!item) { showToast("That notification is no longer active"); renderTrainerAttention(); return false; }
    if (protectedAttentionItem(item)) { showToast("Safety, access, and owner-approval work must be resolved in its source workflow"); return false; }
    byId("attentionDismissItemId").value = item.id; byId("attentionDismissReason").value = ""; byId("attentionDismissNote").value = "";
    byId("attentionDismissItemSummary").innerHTML = '<b>' + escapeHtml(item.client || "Workspace") + ' · ' + escapeHtml(item.label) + '</b><br>' + escapeHtml(item.detail || "Routine reminder");
    byId("attentionDismissModal").classList.add("open"); byId("attentionDismissModal").setAttribute("aria-hidden","false"); setTimeout(() => byId("attentionDismissReason").focus(),0); return true;
  };
  window.closeAttentionDismissModal = function closeAttentionDismissModal() { const modal = byId("attentionDismissModal"); if (modal) { modal.classList.remove("open"); modal.setAttribute("aria-hidden","true"); } };
  window.confirmDismissCoachAttention = function confirmDismissCoachAttention() {
    const itemId = byId("attentionDismissItemId").value, item = trainerAttentionSnapshot().items.find((entry) => entry.id === itemId), reason = byId("attentionDismissReason").value, note = byId("attentionDismissNote").value.trim();
    if (!item) { closeAttentionDismissModal(); renderTrainerAttention(); return false; }
    if (protectedAttentionItem(item)) { closeAttentionDismissModal(); showToast("This protected item must be resolved in its source workflow"); return false; }
    if (!reason) { showToast("Choose why this reminder is being dismissed"); byId("attentionDismissReason").focus(); return false; }
    if (reason === "Other" && note.length < 3) { showToast("Add a short audit note for Other"); byId("attentionDismissNote").focus(); return false; }
    const identity = currentAccountIdentity(), state = loadAttentionState(), now = new Date().toISOString();
    state[item.id] = {status:"dismissed",dismissedAt:now,updatedAt:now,updatedBy:identity.displayName || identity.email || "Trainer",updatedByUserId:identity.id || "",reason:reason + (note ? " · " + note : ""),sourceFingerprint:attentionFingerprint(item)};
    if (!writeLocalObject(ATTENTION_STATE_KEY,state)) { showToast("The dismissal could not be saved"); return false; }
    if (typeof releaseCoachTask === "function") releaseCoachTask(item.id);
    closeAttentionDismissModal(); renderTrainerAttention(); if (openCoachDestination.current === "actions") renderCoachModule("actions"); showToast("Reminder dismissed for the coaching team"); return true;
  };
  function actionRowsV14(items,limit) {
    const shown = limit ? items.slice(0,limit) : items;
    return shown.map((item) => {
      const claim = activeCoachTaskClaim(item.id), mine = claim && claim.handlerUserId === calendarIdentity().id, claimCopy = coachTaskClaimText(item.id), canAcknowledge = item.kind === "calendar_notice", protectedItem = protectedAttentionItem(item);
      return '<article class="action-center-row ' + escapeHtml(item.urgency || "normal") + '"><div class="action-center-priority"><i></i><span>' + escapeHtml(ACTION_CATEGORY_LABELS[item.category] || "Follow-up") + '</span></div><div class="action-center-person"><b>' + escapeHtml(item.client || "Workspace") + (item.primaryCoach ? ' <small>Primary</small>' : '') + '</b><span>' + escapeHtml(item.trainer || "Coaching team") + ' · waiting ' + escapeHtml(attentionWaitingLabel(item.createdAt)) + '</span>' + (claimCopy ? '<em>' + escapeHtml(claimCopy) + '</em>' : '') + '</div><div class="action-center-reason"><b>' + escapeHtml(item.label) + '</b><span>' + escapeHtml(item.detail) + '</span></div><div class="action-center-actions"><button class="mini-btn primary" onclick="claimCoachTask(' + calendarJsArg(item.id) + ',' + calendarJsArg(item.profileId || "") + ',' + calendarJsArg(item.kind) + ',' + calendarJsArg(item.client || "") + ',true)">' + (claim ? mine ? "Open" : "Take over" : "Handle") + '</button><button class="mini-btn" onclick="updateCoachAttentionItem(' + calendarJsArg(item.id) + ',\'snoozed\')">Tomorrow</button>' + (canAcknowledge ? '<button class="mini-btn" onclick="resolveCalendarNotice(' + calendarJsArg(String(item.id).replace(/^calendar-notice:/,"")) + ')">Acknowledge</button>' : '') + (protectedItem ? '<span class="action-protected" title="Resolve this protected item in its source workflow">Protected</span>' : '<button class="mini-btn dismiss" onclick="openDismissCoachAttention(' + calendarJsArg(item.id) + ')">Dismiss</button>') + '</div></article>';
    }).join("") || '<div class="attention-empty"><b>Nothing needs action in this view.</b><br>New work appears here from the original message, workout, request, safety report, or schedule record.</div>';
  }
  window.actionQueueRowsHtml = actionRowsV14;
  const v6OpenCoachAttentionItem = window.openCoachAttentionItem;
  window.openCoachAttentionItem = function openCoachAttentionItemV14(profileId,kind,itemId) {
    if (kind === "workout" && String(itemId || "").startsWith("workout-review:")) {
      const assignmentId = String(itemId).slice("workout-review:".length), profile = loadProfiles().find((item) => item.id === profileId);
      if (!profile) return v6OpenCoachAttentionItem(profileId,kind,itemId);
      selectedTrainerClient = profile.name; selectedInBodyScanId = ""; trainerSummaryState = newTrainerSummaryState(); trainerSummaryState.tab = "workouts"; show("trainer"); renderTrainerHub(profile.name); setTimeout(() => openCoachAdjustment(profile.id,assignmentId),30); return;
    }
    return v6OpenCoachAttentionItem(profileId,kind,itemId);
  };

  function reportProfileForAssignment(assignment,profiles) { return profiles.find((profile) => profile.id === assignment.profileId) || profiles.find((profile) => clientMatches(profile.name,assignment.client)); }
  function inReportRange(value) { const time = recordTime(value), start = recordTime(reportState.from + "T00:00:00"), end = recordTime(reportState.to + "T23:59:59.999"); return time >= start && time <= end; }
  function reportAssignments() {
    const profiles = loadProfiles(), selected = reportState.profileId;
    return loadAssignedWorkouts().filter((assignment) => { const profile = reportProfileForAssignment(assignment,profiles); if (selected && (!profile || profile.id !== selected)) return false; const date = assignment.completedAt || assignment.scheduledDate && assignment.scheduledDate + "T12:00:00" || assignment.assignedAt; return inReportRange(date); }).sort((a,b) => recordTime(b.completedAt || b.scheduledDate || b.assignedAt) - recordTime(a.completedAt || a.scheduledDate || a.assignedAt));
  }
  function reportFeedback(assignments) { return assignments.filter((item) => item.clientReview); }
  function countList(items) { const counts = new Map(); items.forEach((item) => counts.set(item.name || item,Number(counts.get(item.name || item) || 0) + 1)); return [...counts.entries()].sort((a,b) => b[1] - a[1] || a[0].localeCompare(b[0])); }
  function reportMetric(label,value,copy,tone) { return '<article class="report-metric ' + (tone || '') + '"><span>' + escapeHtml(label) + '</span><b>' + escapeHtml(String(value)) + '</b><p>' + escapeHtml(copy) + '</p></article>'; }
  function reportAttentionHtml(profiles) {
    const allowed = new Set(profiles.map((profile) => profile.id)), items = trainerAttentionSnapshot().items.filter((item) => !reportState.profileId || allowed.has(item.profileId));
    return '<section class="report-panel report-attention"><div class="report-panel-head"><div><span class="client-section-label">Needs attention</span><h3>Open coaching work</h3></div><button class="small-btn" onclick="openCoachDestination(\'actions\')">Open Action Center</button></div><div class="report-attention-list">' + (items.slice(0,8).map((item) => '<button onclick="claimCoachTask(' + calendarJsArg(item.id) + ',' + calendarJsArg(item.profileId || "") + ',' + calendarJsArg(item.kind) + ',' + calendarJsArg(item.client || "") + ',true)"><span class="report-risk ' + escapeHtml(item.urgency || "normal") + '"></span><b>' + escapeHtml(item.client || "Workspace") + '</b><em>' + escapeHtml(item.label) + '</em><small>' + escapeHtml(item.detail || "") + '</small></button>').join("") || '<div class="report-empty">No open coaching items match this report.</div>') + '</div></section>';
  }
  function reportMovementHtml(feedback) {
    const liked = countList(feedback.flatMap((item) => reviewArray(item.clientReview,"likedExercises"))), disliked = countList(feedback.flatMap((item) => reviewArray(item.clientReview,"dislikedExercises")));
    const list = (items,tone,empty) => items.length ? '<div class="report-movement-list ' + tone + '">' + items.slice(0,8).map(([name,count]) => '<span><b>' + escapeHtml(name) + '</b><em>' + count + ' review' + (count === 1 ? '' : 's') + '</em></span>').join("") + '</div>' : '<div class="report-empty">' + escapeHtml(empty) + '</div>';
    return '<section class="report-panel"><div class="report-panel-head"><div><span class="client-section-label">Movement feedback</span><h3>What clients liked and disliked</h3></div></div><div class="report-movement-columns"><div><h4>Liked movements</h4>' + list(liked,"positive","No liked movements selected in this range.") + '</div><div><h4>Disliked or unclear</h4>' + list(disliked,"negative","No disliked movements selected in this range.") + '</div></div></section>';
  }
  function reportTrendsHtml(assignments,feedback) {
    const difficulties = feedback.map((item) => Number(item.clientReview.difficulty)).filter(Number.isFinite), energies = feedback.map((item) => Number(item.clientReview.energy)).filter(Number.isFinite), completion = new Map();
    feedback.forEach((item) => completion.set(completionLabel(item.clientReview.completion),Number(completion.get(completionLabel(item.clientReview.completion)) || 0) + 1));
    const completed = assignments.filter((item) => ["completed","reviewed"].includes(assignmentStatus(item))).length, total = assignments.length, avg = (values) => values.length ? (values.reduce((sum,value) => sum + value,0) / values.length).toFixed(1) : "—";
    return '<section class="report-panel"><div class="report-panel-head"><div><span class="client-section-label">Workout trends</span><h3>Observed results, without a hidden score</h3></div></div><div class="report-trend-grid"><div><span>Completion rate</span><b>' + (total ? Math.round(completed / total * 100) + '%' : '—') + '</b><small>' + completed + ' completed or reviewed of ' + total + ' assignments in range</small></div><div><span>Average difficulty</span><b>' + avg(difficulties) + (difficulties.length ? '/10' : '') + '</b><small>From ' + difficulties.length + ' client review' + (difficulties.length === 1 ? '' : 's') + '</small></div><div><span>Average energy after</span><b>' + avg(energies) + (energies.length ? '/5' : '') + '</b><small>Only submitted responses are included</small></div></div><div class="report-completion-bars">' + ([...completion.entries()].map(([label,count]) => '<div><span>' + escapeHtml(label) + '</span><i><b style="width:' + Math.round(count / Math.max(1,feedback.length) * 100) + '%"></b></i><em>' + count + '</em></div>').join("") || '<div class="report-empty">No completion feedback in this range.</div>') + '</div></section>';
  }
  function reportTimelineHtml(assignments,profiles) {
    const query = reportState.query.trim().toLowerCase(), filtered = assignments.filter((assignment) => !query || [assignment.client,assignment.programDayName,assignment.clientReview && assignment.clientReview.notes,assignment.clientReview && assignment.clientReview.questions].join(" ").toLowerCase().includes(query));
    return '<section class="report-panel report-history"><div class="report-panel-head"><div><span class="client-section-label">Chronological record</span><h3>Workout history and client voice</h3></div><input class="swap-search" value="' + escapeHtml(reportState.query) + '" placeholder="Search client, workout, or comment…" oninput="setCoachReportFilter(\'query\',this.value)"></div><div class="report-timeline">' + (filtered.map((assignment) => { const profile = reportProfileForAssignment(assignment,profiles), review = assignment.clientReview || {}, status = assignmentStatus(assignment); return '<article><time>' + escapeHtml(displayDate(assignment.completedAt || assignment.scheduledDate && assignment.scheduledDate + 'T12:00:00' || assignment.assignedAt)) + '</time><div class="report-timeline-main"><div><h4>' + escapeHtml(assignment.client || profile && profile.name || 'Client') + '</h4><p>' + escapeHtml(assignment.programDayName || assignment.session && assignment.session.data && assignment.session.data.goalLabel || 'Assigned workout') + ' · ' + escapeHtml(assignmentStatusLabel(assignment)) + '</p></div><span class="assignment-pill ' + escapeHtml(status) + '">' + escapeHtml(assignment.coachReviewedAt ? 'Coach reviewed' : review.id ? 'Review waiting' : assignmentStatusLabel(assignment)) + '</span></div>' + (review.id || assignment.clientReview ? '<div class="report-timeline-feedback"><p><b>Client note</b>' + escapeHtml(review.notes || 'No note entered') + '</p><p><b>Question</b>' + escapeHtml(review.questions || 'No question entered') + '</p><div>' + movementChips(reviewArray(review,'likedExercises'),'positive') + movementChips(reviewArray(review,'dislikedExercises'),'negative') + '</div></div>' : '') + '<div class="tool-actions"><button class="mini-btn" onclick="openCoachAdjustment(\'' + escapeHtml(profile && profile.id || assignment.profileId || '') + '\',\'' + escapeHtml(assignment.id) + '\')">Open details</button></div></article>'; }).join("") || '<div class="report-empty">No workouts match these filters.</div>') + '</div></section>';
  }
  window.setCoachReportFilter = function setCoachReportFilter(key,value) { reportState[key] = value; renderCoachReports(); };
  window.resetCoachReportFilters = function resetCoachReportFilters() { reportState.profileId = ""; reportState.from = reportDateKey(new Date(Date.now() - 29 * 86400000)); reportState.to = reportDateKey(new Date()); reportState.query = ""; renderCoachReports(); };
  window.renderCoachReports = function renderCoachReports() {
    const out = byId("coachModuleContent"), title = byId("coachModuleTitle"), copy = byId("coachModuleCopy"), eyebrow = byId("coachModuleEyebrow"); if (!out) return;
    if (title) title.textContent = "Reports"; if (eyebrow) eyebrow.textContent = "Coach workspace"; if (copy) copy.textContent = "Review completed work, client feedback, attention flags, and movement trends without duplicating the Clients workspace.";
    const profiles = loadProfiles(), visibleProfiles = reportState.profileId ? profiles.filter((profile) => profile.id === reportState.profileId) : profiles, assignments = reportAssignments(), feedback = reportFeedback(assignments);
    const assigned = assignments.length, completed = assignments.filter((item) => ["completed","reviewed"].includes(assignmentStatus(item))).length, missed = assignments.filter((item) => typeof assignmentCalendarStatus === "function" ? assignmentCalendarStatus(item) === "missed" : assignmentStatus(item) === "missed").length, reviewed = assignments.filter((item) => Boolean(item.coachReviewedAt)).length;
    out.innerHTML = '<section class="coach-reports-shell"><header class="report-hero"><div><span class="client-section-label">Evidence-based coaching report</span><h2>' + escapeHtml(reportState.profileId ? (visibleProfiles[0] && visibleProfiles[0].name || "Client") : "All clients") + '</h2><p>Every number links back to a saved workout, review, or action. No percentile or invented readiness score is used.</p></div><div class="report-range-badge">' + escapeHtml(displayDate(reportState.from + 'T12:00:00')) + '<span>to</span>' + escapeHtml(displayDate(reportState.to + 'T12:00:00')) + '</div></header><section class="report-filter-bar"><label>Client<select onchange="setCoachReportFilter(\'profileId\',this.value)"><option value="">All clients</option>' + profiles.map((profile) => '<option value="' + escapeHtml(profile.id) + '"' + (profile.id === reportState.profileId ? ' selected' : '') + '>' + escapeHtml(profile.name) + '</option>').join("") + '</select></label><label>From<input type="date" value="' + escapeHtml(reportState.from) + '" onchange="setCoachReportFilter(\'from\',this.value)"></label><label>To<input type="date" value="' + escapeHtml(reportState.to) + '" onchange="setCoachReportFilter(\'to\',this.value)"></label><button class="small-btn" onclick="resetCoachReportFilters()">Reset to 30 days</button></section><section class="report-metrics">' + reportMetric("Assignments",assigned,"Scheduled or assigned in the selected range") + reportMetric("Completed",completed,"Completed or coach-reviewed workouts","good") + reportMetric("Missed",missed,"Past assigned workouts without completion",missed ? "warn" : "") + reportMetric("Coach reviewed",reviewed,"Client reviews closed by a trainer") + reportMetric("Completion rate",assigned ? Math.round(completed / assigned * 100) + "%" : "—","Completed or reviewed divided by assignments") + '</section><div class="report-dashboard-grid">' + reportAttentionHtml(visibleProfiles) + reportMovementHtml(feedback) + reportTrendsHtml(assignments,feedback) + '</div>' + reportTimelineHtml(assignments,profiles) + '</section>';
  };
  const legacyOpenCoachDestination = window.openCoachDestination;
  window.openCoachDestination = function openCoachDestinationV14(destination) {
    if (destination !== "reports") return legacyOpenCoachDestination(destination);
    if (!trainerIsUnlocked()) return legacyOpenCoachDestination(destination);
    portalRole = "trainer"; window.openCoachDestination.current = "reports"; show("coach-module"); renderCoachReports();
  };
  window.openCoachDestination.current = legacyOpenCoachDestination.current || "";
})();
