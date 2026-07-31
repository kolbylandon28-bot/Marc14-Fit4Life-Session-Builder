/* ---------- program-led client app ---------- */
let clientProgressSection = "overview";
let clientProgramWeek = 1;
let activeWorkout = null;
let pendingReadinessStart = null;
function clientAssignedSession(assignment,profile) {
  if (!assignment || !assignment.session) return null;
  const plans = workoutPlans(assignment.session), match = plans.find((plan) => plan.session && plan.session.spec && (plan.session.spec.profileId === profile.id || clientMatches(plan.session.spec.client,profile.name)));
  return (match || plans[0] || {}).session || null;
}
function clientInitials(profile) { return String(profile && profile.name || "FL").split(/\s+/).filter(Boolean).slice(0,2).map((part) => part[0]).join("").toUpperCase(); }
function clientSessionExercises(session) { return session ? (session.blocks || []).flatMap((block) => (block.items || []).map((exercise) => ({ exercise,block }))) : []; }
function clientSessionEquipment(session) { return [...new Set(clientSessionExercises(session).map((item) => ZONE_LABELS[item.exercise.zone] || item.exercise.zone).filter(Boolean))]; }
function latestClientEntry(profile,type) { return loadProgress().find((entry) => entry.type === type && (entry.profileId === profile.id || clientMatches(entry.client,profile.name))) || null; }
function clientDailyState(profile) {
  const today = new Date().toISOString().slice(0,10), all = loadLocalObject(CLIENT_DAILY_KEY,{}), key = profile.id + ":" + today;
  return { all,key,value:{ movement:false,hydration:false,nutrition:false,...(all[key] || {}) } };
}
function toggleClientHabit(key,checked) {
  const profile = activeClientProfile(); if (!profile) return;
  const daily = clientDailyState(profile); daily.value[key] = Boolean(checked); daily.all[daily.key] = daily.value; writeLocalObject(CLIENT_DAILY_KEY,daily.all); renderClientHome(profile);
}
function clientWorkoutStatusLabel(assignment) { return assignment ? assignmentStatusLabel(assignment) : "Waiting for your coach"; }
function clientPurpose(session) {
  if (!session) return "Your coach has not assigned the next session yet.";
  const goal = session.goalLabel || (session.spec && GOALS[session.spec.goal] && GOALS[session.spec.goal].label) || "Training";
  const focus = session.spec && session.spec.muscles && session.spec.muscles.length ? session.spec.muscles.map((muscle) => MUSCLE_LABELS[muscle] || muscle).join(", ") : "full-body balance";
  return goal + " session built around " + focus + ". Complete the quality work first and keep every movement inside a pain-free range.";
}
function starterReviewStatus(profile) {
  const program = savedProgramFor(profile);
  if (!program || !(program.starter || program.setup && program.setup.programMode === "starter") || !program.weeks || !program.weeks.length) return { active:false };
  const reviews = checkInsForProfile(profile.id), completed = reviews.find((item) => item.reviewType === "starter_week_1" && (!item.programId || item.programId === program.id));
  const start = new Date(program.savedAt || program.createdAt || Date.now()), dueAt = new Date(start.getTime() + 7 * 86400000), firstWeek = program.weeks[0];
  const firstWeekAssignments = assignmentsForClient(profile.id).filter((item) => item.programId === program.id && Number(item.programWeek) === 1);
  const weekComplete = Boolean(firstWeek && firstWeek.days && firstWeek.days.length && firstWeekAssignments.length >= firstWeek.days.length && firstWeekAssignments.every((item) => ["completed","reviewed"].includes(assignmentStatus(item))));
  return { active:true,program,programId:program.id || "",completed,dueAt,due:!completed && (weekComplete || Date.now() >= dueAt.getTime()) };
}
function recoveryFollowUpsForProfile(profileId) {
  return checkInsForProfile(profileId).filter((item) => item.reviewType === "recovery_24_48");
}
function weeklyCheckInsForProfile(profileId) {
  return checkInsForProfile(profileId).filter((item) => item.reviewType !== "recovery_24_48");
}
function recoveryFollowUpRequired(profile,assignment,completedAssignments) {
  if (!profile || !assignment || !assignment.completedAt) return false;
  const review = assignment.clientReview || {}, completedTime = new Date(assignment.completedAt).getTime();
  const earlier = (completedAssignments || []).filter((item) => new Date(item.completedAt || 0).getTime() < completedTime);
  if (earlier.length < 3) return true;
  if (painLevelInfo(review.painLevel || review.pain,review.movementChanged).rank > PAIN_LEVELS.green.rank) return true;
  if (Number(review.difficulty) >= 9 || Number(review.energy) <= 2 || review.completion === "stopped") return true;
  const completedDate = new Date(completedTime), day = completedDate.getDay() || 7, weekStart = new Date(completedDate); weekStart.setHours(0,0,0,0); weekStart.setDate(weekStart.getDate() - day + 1);
  const weekEnd = new Date(weekStart.getTime() + 7 * 86400000);
  return !earlier.some((item) => { const time = new Date(item.completedAt || 0).getTime(); return time >= weekStart.getTime() && time < weekEnd.getTime(); });
}
function recoveryFollowUpStatus(profile) {
  if (!profile) return {active:false};
  const completed = assignmentsForClient(profile.id).filter((item) => ["completed","reviewed"].includes(assignmentStatus(item)) && item.completedAt).sort((a,b) => String(b.completedAt).localeCompare(String(a.completedAt)));
  const submitted = recoveryFollowUpsForProfile(profile.id), now = Date.now(), candidates = [];
  for (const assignment of completed) {
    if (submitted.some((item) => item.assignmentId === assignment.id)) continue;
    if (!recoveryFollowUpRequired(profile,assignment,completed)) continue;
    const completedAt = new Date(assignment.completedAt), age = now - completedAt.getTime();
    if (!Number.isFinite(age) || age < 0 || age > 7 * 86400000) continue;
    const dueAt = new Date(completedAt.getTime() + 24 * 60 * 60 * 1000), targetEnd = new Date(completedAt.getTime() + 48 * 60 * 60 * 1000);
    candidates.push({active:true,assignment,completedAt,dueAt,targetEnd,due:now >= dueAt.getTime(),overdue:now > targetEnd.getTime()});
  }
  return candidates.sort((a,b) => Number(b.overdue) - Number(a.overdue) || Number(b.due) - Number(a.due) || b.completedAt - a.completedAt)[0] || {active:false,latest:submitted[0] || null};
}
function updateClientRecoveryReminder(profile) {
  const status = recoveryFollowUpStatus(profile);
  document.querySelectorAll("[data-client-recovery-badge]").forEach((badge) => badge.classList.toggle("show",Boolean(status.active && status.due)));
  if (currentView !== "client-home" || !status.active || !status.due) return status;
  const reminderKey = "fit4life-recovery-reminder:" + status.assignment.id + ":" + new Date().toISOString().slice(0,10);
  try {
    if (!sessionStorage.getItem(reminderKey)) {
      sessionStorage.setItem(reminderKey,"shown");
      setTimeout(() => showToast(status.overdue ? "Your quick recovery pulse is overdue — it takes less than a minute" : "Your 24–48 hour recovery pulse is ready"),40);
    }
  } catch (_) {}
  return status;
}
function renderClientAppView(view) {
  const profile = activeClientProfile(); if (!profile) { openClientWorkout(); return; }
  document.querySelectorAll(".client-avatar-shared").forEach((avatar) => avatar.textContent = clientInitials(profile));
  if (view === "client-home") renderClientHome(profile);
  else if (view === "client-program") renderClientProgram(profile);
  else if (view === "client-progress") renderClientProgress(profile);
  else if (view === "client-coach") renderClientCoach(profile);
  else if (view === "client-more") renderClientMore(profile);
  updateClientRecoveryReminder(profile);
}
function renderClientHome(profile) {
  const out = byId("clientHomeContent"); if (!out) return;
  const assignment = assignmentForClient(profile.id), session = clientAssignedSession(assignment,profile), readiness = latestClientEntry(profile,"readiness"), readinessScore = readiness ? Math.max(0,Math.min(100,parseInt(readiness.value,10) || 0)) : 0;
  const intakeStatus = intakeCompletion(profile), intakeCard = intakeStatus.status !== "complete"
    ? '<section class="client-card wide"><div class="client-section-label">Getting started · ' + intakeStatus.percent + '% complete</div><div class="client-action-row"><span><b>' + (intakeStatus.programmingBlocked ? 'Trainer safety review needed' : intakeStatus.status === 'trainer_review' ? 'Submitted · waiting for trainer review' : 'Finish your coaching intake') + '</b><span>' + (intakeStatus.programmingBlocked ? 'Your answers are saved. Your trainer must review the health or limitation response before difficult programming.' : intakeStatus.status === 'trainer_review' ? 'All client sections are saved. Your trainer will confirm the baseline plan and any modifications.' : 'Complete identity, goals, schedule, equipment, health, recovery, coaching fit, emergency contact, and consent. Save and return at any time.') + '</span></span><button class="small-btn primary" onclick="openClientOnboarding()">' + (intakeStatus.percent ? 'Continue intake' : 'Start intake') + '</button></div></section>'
    : '<section class="client-card wide"><div class="client-section-label">Onboarding</div><div class="client-action-row"><span><b>Coaching intake complete</b><span>Your goals, schedule, training context, and safety information are saved. Update them whenever something changes.</span></span><button class="small-btn" onclick="openClientOnboarding()">Review intake</button></div></section>';
  const daily = clientDailyState(profile).value, completedHabits = [daily.movement,daily.hydration,daily.nutrition].filter(Boolean).length;
  const checkins = weeklyCheckInsForProfile(profile.id), lastCheckIn = checkins[0], nextCheck = lastCheckIn ? new Date(new Date(lastCheckIn.createdAt || lastCheckIn.date).getTime() + 7 * 86400000) : new Date();
  const recoveryStatus = recoveryFollowUpStatus(profile), recoveryCard = recoveryStatus.active && recoveryStatus.due
    ? '<section class="client-card wide recovery-reminder ' + (recoveryStatus.overdue ? 'overdue' : '') + '"><div class="client-section-label">' + (recoveryStatus.overdue ? 'Recovery pulse · overdue' : '24–48 hour recovery pulse') + '</div><div class="client-action-row"><span><b>How did your body respond?</b><span>Four quick taps. Your answer goes directly to ' + escapeHtml(profile.assignedTrainerName || 'your coaching team') + ' for review.</span></span><button class="small-btn primary" onclick="openClientRecoveryFollowUp(\'' + escapeHtml(recoveryStatus.assignment.id) + '\')">Check in now</button></div></section>'
    : '';
  const starterReview = starterReviewStatus(profile);
  const checkInCard = starterReview.active && !starterReview.completed
    ? '<section class="client-card wide"><div class="client-section-label">Starter program · Week 1 review</div><div class="client-action-row"><span><b>' + (starterReview.due ? 'Your first-week review is ready' : 'First-week review · ' + starterReview.dueAt.toLocaleDateString()) + '</b><span>' + (starterReview.due ? 'Tell your coach whether the workouts, exercise instructions, difficulty, and session length fit before Week 2.' : 'Keep learning the two repeatable workouts. This review will help your coach tune Week 2 without changing everything at once.') + '</span></span><button class="small-btn primary" ' + (starterReview.due ? '' : 'disabled') + ' onclick="openClientCheckInForActive(\'starter_week_1\')">Open Week 1 review</button></div></section>'
    : '<section class="client-card wide"><div class="client-section-label">Upcoming check-in</div><div class="client-action-row"><span><b>' + (lastCheckIn ? 'Next weekly review · ' + nextCheck.toLocaleDateString() : 'Weekly check-in available') + '</b><span>' + (lastCheckIn ? 'Your last check-in was sent ' + new Date(lastCheckIn.createdAt || lastCheckIn.date).toLocaleDateString() : 'Send the first update when you are ready.') + '</span></span><button class="small-btn primary" onclick="openClientCheckInForActive()">Open check-in</button></div></section>';
  const competition = profile.competitionDate ? '<div class="client-card wide"><div class="client-section-label">Competition</div><h3>' + escapeHtml(profile.sport || 'Athlete event') + '</h3><p>' + new Date(profile.competitionDate + 'T12:00:00').toLocaleDateString() + (profile.sportSchedule ? ' · ' + escapeHtml(profile.sportSchedule) : '') + '</p></div>' : '';
  const review = assignment && assignment.clientReview, completionSummary = review ? '<section class="client-card wide"><div class="client-section-label">Latest workout summary</div><div class="simple-stat-grid"><div class="simple-stat"><b>' + (review.actualDuration || review.duration || '—') + '</b><span>Minutes</span></div><div class="simple-stat"><b>' + (review.loggedSets || 0) + '</b><span>Working sets</span></div><div class="simple-stat"><b>' + review.difficulty + '/10</b><span>Difficulty</span></div><div class="simple-stat"><b>' + ((review.personalRecords || []).length) + '</b><span>Personal records</span></div></div><p style="margin-top:12px">' + (review.pain === 'none' ? 'No pain reported.' : 'Pain or discomfort reported: ' + escapeHtml(review.injuryArea || review.pain) + '.') + ((review.personalRecords || []).length ? ' PRs: ' + escapeHtml(review.personalRecords.join(', ')) + '.' : '') + '</p></section>' : '';
  const latestReceipt = latestPublishedProgressReceipt(profile), receiptCard = latestReceipt ? progressReceiptCardHtml(profile,latestReceipt,true) : '';
  const disabled = !assignment || ["completed","reviewed"].includes(assignmentStatus(assignment)) || intakeStatus.programmingBlocked;
  byId("clientHomeGreeting").textContent = "Hi, " + String(profile.name).split(/\s+/)[0]; byId("clientHomeSubhead").textContent = clientWorkoutStatusLabel(assignment); byId("clientHomeAvatar").textContent = clientInitials(profile);
  out.innerHTML = '<section class="client-hero"><div class="hero-kicker">Today’s workout</div><h2>' + escapeHtml(session ? session.goalLabel || 'Coach-planned session' : 'Your next plan is coming') + '</h2><div class="hero-meta"><span>' + escapeHtml(session ? (session.spec.minutes || 60) + ' min' : 'Not scheduled') + '</span><span>' + escapeHtml(session ? clientSessionEquipment(session).slice(0,3).join(' · ') || 'Bodyweight' : 'Coach assignment needed') + '</span><span>' + escapeHtml(clientWorkoutStatusLabel(assignment)) + '</span></div><p class="hero-purpose">' + escapeHtml(intakeStatus.programmingBlocked ? 'Workout start is paused until your trainer documents a safety decision from your intake. Your saved workout is not lost.' : clientPurpose(session)) + '</p><button class="start-workout-btn" ' + (disabled ? 'disabled' : '') + ' onclick="startActiveWorkout(\'' + escapeHtml(profile.id) + '\')">' + (intakeStatus.programmingBlocked ? 'Trainer review needed' : assignmentStatus(assignment) === 'in_progress' ? 'Continue workout' : 'Start workout') + '</button></section>'
    + '<div class="client-grid">' + goalContractClientHtml(profile,"home") + baselineClientCardHtml(profile) + '<section class="client-card"><div class="client-section-label">Readiness check</div><div class="readiness-inline"><div class="readiness-dot" style="--score:' + readinessScore + '%"><b>' + (readiness ? readinessScore : '—') + '</b></div><div><h3>' + (readiness ? escapeHtml(readiness.note || 'Latest readiness') : 'Check how you feel') + '</h3><p>' + (readiness ? 'Saved ' + new Date(readiness.date).toLocaleDateString() : 'Sleep, soreness, energy, stress, and pain can adjust today’s session.') + '</p></div></div><div class="tool-actions"><button class="small-btn" onclick="openClientReadiness()">' + (readiness ? 'Update readiness' : 'Check readiness') + '</button></div></section>'
    + '<section class="client-card"><div class="client-section-label">Coach message</div><h3>' + (assignment && assignment.coachNote ? 'Update from your coach' : 'No new message') + '</h3><p>' + escapeHtml(assignment && assignment.coachNote || 'Important program changes and workout feedback will appear here instead of getting buried in chat.') + '</p><div class="tool-actions"><button class="small-btn" onclick="openClientTab(\'coach\')">Open coach</button></div></section>'
    + '<section class="client-card"><div class="client-section-label">Today’s habits · ' + completedHabits + '/3</div>' + [["movement","Daily movement",daily.movement],["hydration","Hydration target",daily.hydration],["nutrition","Nutrition plan",daily.nutrition]].map((habit) => '<label class="client-action-row"><span><b>' + habit[1] + '</b><span>Tap when complete</span></span><input class="habit-check" type="checkbox" ' + (habit[2] ? 'checked' : '') + ' onchange="toggleClientHabit(\'' + habit[0] + '\',this.checked)"></label>').join('') + '</section>'
    + '<section class="client-card"><div class="client-section-label">Nutrition summary</div><h3>' + (daily.nutrition ? 'Plan completed today' : 'No nutrition check yet') + '</h3><p>Nutrition remains optional. Your coach can add a simple target without crowding the workout screen.</p><div class="tool-actions"><button class="small-btn" onclick="openClientMoreSection(\'nutrition\')">View nutrition</button></div></section>'
    + receiptCard + recoveryCard + intakeCard + completionSummary + checkInCard + competition;
}
function openClientReadiness() {
  pendingReadinessStart = null;
  const profile = activeClientProfile(); openReadiness(); if (!profile) return;
  const lookup = byId("readyClient"), hidden = byId("readyProfile"); if (lookup) lookup.value = profile.name + " · @" + profileUsername(profile); if (hidden) hidden.value = profile.id;
}
function openClientCheckInForActive(reviewType) { const profile = activeClientProfile(); openClientCheckIn(reviewType); if (profile) selectCheckInProfile(profile.id); }
function openClientRecoveryFollowUp(assignmentId) { const profile = activeClientProfile(); openClientCheckIn("recovery_24_48",assignmentId); if (profile) selectCheckInProfile(profile.id); }
function clientProgramSource(profile) {
  const saved = savedProgramFor(profile); if (saved && saved.weeks && saved.weeks.length) return saved;
  const assignment = assignmentForClient(profile.id), session = clientAssignedSession(assignment,profile); if (!session) return null;
  return { profileId:profile.id,setup:{client:profile.name,weeks:1,days:1,goals:session.spec.goals || [session.spec.goal],trainingPhase:profile.trainingPhase || 'Current phase'},weeks:[{number:1,phase:{name:profile.trainingPhase || 'Current phase',directive:clientPurpose(session)},days:[{name:session.goalLabel || 'Today',session}]}],synthetic:true };
}
function assignmentForProgramDay(profileId,programId,weekNumber,dayNumber,sessionId) {
  return assignmentsForClient(profileId).find((item) => (programId && item.programId === programId && Number(item.programWeek) === Number(weekNumber) && Number(item.programDay) === Number(dayNumber)) || (sessionId && assignmentSessionIds(item).includes(sessionId))) || null;
}
function clientDayState(profile,assignment,isToday,index) {
  if (!assignment) return 'unscheduled';
  if (["completed","reviewed"].includes(assignmentStatus(assignment))) return 'completed';
  if (assignmentStatus(assignment) === "in_progress" || isToday) return 'scheduled';
  const scheduled = assignment.scheduledDate ? new Date(assignment.scheduledDate + "T12:00:00") : null;
  return scheduled && scheduled < new Date(new Date().toDateString()) ? 'missed' : index < new Date().getDay() - 1 ? 'missed' : 'scheduled';
}
function setClientProgramWeek(week) { clientProgramWeek = Number(week) || 1; const profile = activeClientProfile(); if (profile) renderClientProgram(profile); }
function renderClientProgram(profile) {
  const out = byId("clientProgramContent"), program = clientProgramSource(profile); if (!out) return;
  if (!program) { out.innerHTML = '<div class="empty-state-polished"><b>No program assigned yet</b><p>Your coach-approved workout or multi-week program will appear here when it is ready.</p></div>'; return; }
  clientProgramWeek = Math.max(1,Math.min(clientProgramWeek,program.weeks.length)); const week = program.weeks[clientProgramWeek - 1], assignment = assignmentForClient(profile.id), todayIndex = Math.max(0,new Date().getDay() - 1);
  const weekButtons = program.weeks.map((item) => '<button class="week-chip ' + (item.number === clientProgramWeek ? 'on' : '') + '" onclick="setClientProgramWeek(' + item.number + ')"><b>Week ' + item.number + '</b><span>' + escapeHtml(item.phase && item.phase.name || 'Training') + '</span></button>').join('');
  const trainingDays = week.days || [], scheduledByWeekday = {};
  trainingDays.forEach((day,dayIndex) => { const dayAssignment = assignmentForProgramDay(profile.id,program.id,week.number,dayIndex + 1,day.session && day.session.sessionId), weekday = dayAssignment && Number(dayAssignment.scheduledWeekday) || inferredTrainingDays(profile,trainingDays.length)[dayIndex] || dayIndex + 1; scheduledByWeekday[weekday] = {day,dayIndex,assignment:dayAssignment}; });
  const dayCards = Array.from({length:7},(_,index) => { const scheduled = scheduledByWeekday[index + 1], day = scheduled && scheduled.day, stateName = day ? clientDayState(profile,scheduled.assignment,index === todayIndex,index) : 'rest'; return '<button class="day-card ' + stateName + (index === todayIndex ? ' today' : '') + '" ' + (day ? 'onclick="selectClientProgramDay(' + scheduled.dayIndex + ')"' : 'disabled') + '><b>' + ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'][index] + '</b><span>' + (day ? escapeHtml(day.name) : 'Rest day') + '</span><span>' + (stateName === 'unscheduled' ? 'not assigned' : stateName.replace('_',' ')) + '</span></button>'; }).join('');
  const selectedIndex = Math.min(Number(renderClientProgram.selectedDay || 0),Math.max(0,trainingDays.length - 1)), selected = trainingDays[selectedIndex] || trainingDays[0], session = selected && selected.session;
  const selectedAssignment = selected ? assignmentForProgramDay(profile.id,program.id,week.number,selectedIndex + 1,session && session.sessionId) : null;
  const preview = session ? renderClientWorkoutPreview(profile,session,selectedAssignment) : '<div class="empty-state-polished"><b>Rest day</b><p>Recovery is part of the program. Your next scheduled workout is shown above.</p></div>';
  const programAssignments = assignmentsForClient(profile.id).filter((item) => item.programId === program.id), completed = programAssignments.filter((item) => ["completed","reviewed"].includes(assignmentStatus(item))).length, total = program.weeks.reduce((sum,item) => sum + (item.days || []).length,0);
  out.innerHTML = '<section class="client-card wide"><div class="client-section-label">Current program</div><h3>' + escapeHtml((program.setup.goals || profile.goals || ['general']).map((goal) => GOALS[goal] ? GOALS[goal].label : goal).join(' + ')) + '</h3><p>' + escapeHtml(week.phase && week.phase.directive || 'Follow the scheduled days and keep the main movements consistent through the phase.') + '</p><div class="hero-meta"><span>' + escapeHtml(week.phase && week.phase.name || program.setup.trainingPhase || 'Current phase') + '</span><span>Week ' + clientProgramWeek + ' of ' + program.weeks.length + '</span><span>' + completed + ' of ' + total + ' workouts complete</span></div><div class="week-strip">' + weekButtons + '</div><div class="day-grid">' + dayCards + '</div></section>' + preview
    + '<div class="client-grid"><section class="client-card"><div class="client-section-label">Upcoming workout</div><h3>' + escapeHtml(trainingDays[selectedIndex + 1] ? trainingDays[selectedIndex + 1].name : 'Next week') + '</h3><p>' + (trainingDays[selectedIndex + 1] ? escapeHtml(clientPurpose(trainingDays[selectedIndex + 1].session)) : 'Your coach will publish the next session when this week is complete.') + '</p></section><section class="client-card"><div class="client-section-label">Program progress</div><h3>' + (total ? Math.round(completed / total * 100) : 0) + '% complete</h3><p>Completed sessions are counted from saved workout sets.</p></section></div>';
}
function selectClientProgramDay(index) { renderClientProgram.selectedDay = Number(index) || 0; const profile = activeClientProfile(); if (profile) renderClientProgram(profile); }
function renderClientWorkoutPreview(profile,session,assignment) {
  const items = clientSessionExercises(session), equipment = clientSessionEquipment(session);
  const assignmentId = assignment && assignment.id || "", ready = assignment && !["completed","reviewed"].includes(assignmentStatus(assignment));
  return '<section class="workout-preview"><article class="client-card"><div class="client-section-label">Workout preview</div><h3>' + escapeHtml(session.goalLabel || 'Coach-planned workout') + '</h3><div class="hero-meta"><span>' + (session.spec.minutes || 60) + ' min</span><span>' + escapeHtml(equipment.join(' · ') || 'Bodyweight') + '</span><span>' + items.length + ' exercises</span></div><p>' + escapeHtml(clientPurpose(session)) + '</p><div class="preview-list">' + items.map((item,index) => '<div class="preview-exercise"><i>' + (index + 1) + '</i><b>' + escapeHtml(item.exercise.name) + '<small style="display:block;color:var(--text-faint);margin-top:3px">' + escapeHtml(item.block.title) + '</small></b><span>' + escapeHtml((item.exercise.rx || item.block.rx).sets + ' × ' + (item.exercise.rx || item.block.rx).reps) + '</span></div>').join('') + '</div></article><aside class="client-card"><div class="client-section-label">Session options</div>' + (!assignment ? '<div class="portal-note">This program day has not been assigned by the trainer yet.</div>' : '') + '<div class="secondary-actions"><button class="small-btn primary" ' + (ready ? '' : 'disabled') + ' onclick="startActiveWorkout(\'' + escapeHtml(profile.id) + '\',false,\'' + escapeHtml(assignmentId) + '\')">' + (assignmentStatus(assignment) === 'in_progress' ? 'Continue workout' : assignment && ["completed","reviewed"].includes(assignmentStatus(assignment)) ? 'Workout complete' : 'Start workout') + '</button><button class="small-btn" ' + (ready ? '' : 'disabled') + ' onclick="startActiveWorkout(\'' + escapeHtml(profile.id) + '\',true,\'' + escapeHtml(assignmentId) + '\')">Use shortened workout</button><button class="small-btn" onclick="showToast(\'Start the workout, then use Replace exercise beside the movement that needs different equipment\')">Change equipment</button><button class="small-btn" onclick="openClientPainReport()">Report a limitation</button></div><p style="margin-top:12px">Isolation swaps stay inside approved groups. Major compound changes require coach permission.</p></aside></section>';
}
function setClientProgressSection(section) { clientProgressSection = ["overview","performance","body","goals"].includes(section) ? section : "overview"; document.querySelectorAll('[data-client-progress]').forEach((button) => button.classList.toggle('on',button.dataset.clientProgress === clientProgressSection)); const profile = activeClientProfile(); if (profile) renderClientProgress(profile); }
function renderClientProgress(profile) {
  const out = byId("clientProgressContent"); if (!out) return; const analysis = trainerAnalysisData(profile.name), scans = inBodyScansFor(profile.name), goal = bodyGoalFor(profile.name), entries = trainerEntriesFor(profile.name);
  if (clientProgressSection === 'overview') out.innerHTML = clientProgressReceiptsHtml(profile) + '<div class="simple-stat-grid" style="margin-top:14px"><div class="simple-stat"><b>' + escapeHtml(analysis.evidenceLevel) + '</b><span>Data confidence</span></div><div class="simple-stat"><b>' + (analysis.recentWorkouts.length ? analysis.completion + '%' : '—') + '</b><span>Workout completion</span></div><div class="simple-stat"><b>' + (analysis.averageTrend == null ? 'Baseline' : (analysis.averageTrend >= 0 ? '+' : '') + analysis.averageTrend.toFixed(1) + '%') + '</b><span>Comparable-lift trend</span></div><div class="simple-stat"><b>' + (analysis.readiness || '—') + '</b><span>Latest readiness</span></div></div><section class="client-card wide" style="margin-top:14px"><div class="client-section-label">What this is based on</div><h3>' + escapeHtml(analysis.evidenceDetail) + '</h3><p>Progress is shown only from completed workout reviews and comparable logged exercises—never as a percentile or unexplained composite score.</p></section><section class="client-card wide" style="margin-top:14px"><div class="client-section-label">What matters next</div><h3>Coach priority</h3><p>' + escapeHtml(analysis.priority) + '</p></section>';
  else if (clientProgressSection === 'performance') out.innerHTML = '<section class="client-card wide"><div class="client-section-label">Performance</div><h3>Recent exercise progress</h3><div class="preview-list">' + (analysis.exercises.slice(0,10).map((item,index) => '<div class="preview-exercise"><i>' + (index + 1) + '</i><b>' + escapeHtml(item.label) + '</b><span>' + (item.trend == null ? 'Baseline' : (item.trend >= 0 ? '+' : '') + item.trend.toFixed(1) + '%') + '</span></div>').join('') || '<div class="empty-state-polished"><b>No performance trend yet</b><p>Repeat key exercises across workouts to build a useful comparison.</p></div>') + '</div></section>';
  else if (clientProgressSection === 'body') out.innerHTML = '<section class="client-card wide"><div class="client-section-label">Body</div><h3>' + (scans.length ? scans.length + ' body-composition scan' + (scans.length === 1 ? '' : 's') : 'No body data added') + '</h3><p>' + (scans.length ? 'Latest scan: ' + new Date(scans[0].date + 'T12:00:00').toLocaleDateString() + (scans[0].weight != null ? ' · ' + scans[0].weight + ' ' + scans[0].unit : '') + (scans[0].pbf != null ? ' · ' + scans[0].pbf + '% body fat' : '') : 'Body-composition tracking is optional and stays secondary to training quality and health.') + '</p></section>';
  else out.innerHTML = goalContractClientHtml(profile,"progress") + '<section class="client-card wide" style="margin-top:14px"><div class="client-section-label">Supporting evidence</div><h3>' + escapeHtml((profile.goals || []).map((item) => GOALS[item] ? GOALS[item].label : item).join(' + ') || 'General fitness') + '</h3><p>' + (goal && goal.enabled !== false ? 'Optional body-composition goal is active' + (goal.targetWeight ? ' · target ' + goal.targetWeight + ' ' + goal.unit : '') + (goal.targetPbf ? ' · target ' + goal.targetPbf + '% body fat' : '') + '.' : 'Body-composition goals are optional and separate from the main goal contract.') + '</p><div class="hero-meta"><span>' + entries.filter((entry) => entry.type === 'workout').length + ' reviewed workouts</span><span>' + entries.filter((entry) => entry.type === 'set').length + ' sets logged</span><span>' + entries.filter((entry) => entry.type === 'goal_milestone').length + ' milestones recorded</span></div></section>';
}
function currentAccountIdentity() {
  const identity = window.fit4lifeCloudIdentity || {};
  return { id:identity.id || '',email:identity.email || '',role:identity.role || window.fit4lifeCloudRole || '',displayName:identity.displayName || (identity.email ? identity.email.split('@')[0] : '') || 'FIT 4 LIFE coach' };
}
function messageSenderRole(message) { return message.senderRole || (message.from === 'coach' ? 'trainer' : 'client'); }
function messageIsMine(message,viewerRole) {
  const identity = currentAccountIdentity(), senderRole = messageSenderRole(message);
  if (message.senderUserId && identity.id) return message.senderUserId === identity.id;
  return viewerRole === 'client' ? senderRole === 'client' : senderRole !== 'client';
}
function messageSenderLabel(message,profile,viewerRole) {
  if (messageIsMine(message,viewerRole)) return 'You';
  if (messageSenderRole(message) === 'client') return message.senderName || profile.name;
  return message.senderName || profile.assignedTrainerName || 'Your coach';
}
function messageThreadHtml(messages,profile,viewerRole) {
  if (!messages.length) return '<div class="empty-state-polished"><b>No direct messages yet</b><p>Your conversation with ' + escapeHtml(profile.assignedTrainerName || 'your coaching team') + ' will stay organized here.</p></div>';
  return '<div class="message-thread">' + messages.slice().reverse().map((message) => {
    const mine = messageIsMine(message,viewerRole), recipient = message.recipientName || (messageSenderRole(message) === 'client' ? profile.assignedTrainerName || 'Coaching team' : profile.name);
    return '<div class="message-row ' + (mine ? 'sent' : 'received') + '"><article class="message-bubble"><div class="message-bubble-head"><strong>' + escapeHtml(messageSenderLabel(message,profile,viewerRole)) + '</strong><time>' + new Date(message.createdAt).toLocaleString([], {month:'short',day:'numeric',hour:'numeric',minute:'2-digit'}) + '</time></div><div class="message-bubble-body">' + escapeHtml(message.body) + '</div>' + (mine ? '<div class="message-recipient">Sent to ' + escapeHtml(recipient) + '</div>' : '') + '</article></div>';
  }).join('') + '</div>';
}
function loadClientMessages(profileId) { return loadLocalArray(CLIENT_MESSAGES_KEY).filter((item) => item.profileId === profileId).sort((a,b) => String(b.createdAt).localeCompare(String(a.createdAt))); }
function loadAttentionState() { return loadLocalObject(ATTENTION_STATE_KEY,{}); }
function attentionWaitingLabel(date) {
  const elapsed = Math.max(0,Date.now() - new Date(date || Date.now()).getTime());
  const minutes = Math.floor(elapsed / 60000);
  if (minutes < 2) return "just now";
  if (minutes < 60) return minutes + " min";
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return hours + " hr";
  const days = Math.floor(hours / 24);
  return days + " day" + (days === 1 ? "" : "s");
}
function attentionItemIsVisible(item,state) {
  const saved = state[item.id];
  if (!saved) return true;
  if (saved.status === "done") return false;
  if (saved.status === "snoozed" && new Date(saved.until || 0).getTime() > Date.now()) return false;
  return true;
}
function trainerAttentionSnapshot() {
  const profiles = loadProfiles(), allMessages = loadLocalArray(CLIENT_MESSAGES_KEY), assignments = loadAssignedWorkouts(), checkins = loadCheckIns(), progress = loadProgress(), automationAlerts = loadAutomationAlerts(), now = Date.now();
  const unanswered = profiles.filter((profile) => {
    const thread = allMessages.filter((message) => message.profileId === profile.id).sort((a,b) => String(a.createdAt).localeCompare(String(b.createdAt)));
    return thread.length && messageSenderRole(thread[thread.length - 1]) === "client";
  });
  const assignmentReviews = assignments.filter((assignment) => assignmentStatus(assignment) === "completed");
  const checkinReviews = checkins.filter((checkin) => !checkin.reviewedAt);
  const recoveryOverdue = profiles.map((profile) => ({profile,status:recoveryFollowUpStatus(profile)})).filter((item) => item.status.active && item.status.overdue);
  const formalReviews = profiles.filter((profile) => formalReviewStatus(profile).due);
  const receiptRequests = profiles.map((profile) => ({profile,status:nextProgressReceiptRequest(profile)})).filter((item) => item.status.due);
  const recognition = profiles.filter((profile) => {
    const recent = progress.filter((entry) => progressEntryBelongsToClient(entry,profile) && ["set","workout"].includes(entry.type) && now - new Date(entry.date || 0).getTime() <= 7 * 86400000).sort((a,b) => String(b.date).localeCompare(String(a.date)))[0];
    if (!recent) return false;
    const latestCoach = allMessages.filter((message) => message.profileId === profile.id && messageSenderRole(message) !== "client").sort((a,b) => String(b.createdAt).localeCompare(String(a.createdAt)))[0];
    const reviewedAssignment = assignments.find((assignment) => assignment.profileId === profile.id && assignmentStatus(assignment) === "reviewed" && new Date(assignment.coachReviewedAt || 0) >= new Date(recent.date));
    return !reviewedAssignment && (!latestCoach || new Date(latestCoach.createdAt) < new Date(recent.date));
  });
  const trainerRequests = (window.fit4lifeCloudRegistrationRequests || []).filter((request) => request.requested_role === "trainer" && request.status === "pending");
  const items = [];
  const push = (item) => items.push({urgency:"normal",createdAt:new Date().toISOString(),...item});
  profiles.forEach((profile) => {
    const thread = allMessages.filter((message) => message.profileId === profile.id).sort((a,b) => String(a.createdAt).localeCompare(String(b.createdAt)));
    const latestMessage = thread[thread.length - 1];
    if (latestMessage && messageSenderRole(latestMessage) === "client") push({id:"message:" + latestMessage.id,profileId:profile.id,client:profile.name,trainer:profile.assignedTrainerName || "Coaching team",kind:"message",urgency:"urgent",rank:0,createdAt:latestMessage.createdAt,label:"Unanswered message",detail:latestMessage.body || "Client is waiting for a response."});

    const painEntries = progress.filter((entry) => progressEntryBelongsToClient(entry,profile) && (
      entry.type === "pain"
      || entry.type === "substitution" && entry.data && entry.data.reason === "discomfort"
      || entry.type === "workout" && entry.data && entry.data.pain && entry.data.pain !== "none"
      || entry.type === "readiness" && entry.data && painRequiresSafetyHold(entry.data.painLevel || entry.data.pain,entry.data.movementChanged)
    )).sort((a,b) => String(b.date).localeCompare(String(a.date)));
    const latestPain = painEntries[0], reviewedAt = profile.coachAdjustment && new Date(profile.coachAdjustment.reviewedAt || 0).getTime();
    if (latestPain && new Date(latestPain.date || 0).getTime() > (reviewedAt || 0)) {
      const data = latestPain.data || {}, level = latestPain.type === "substitution" ? "orange" : normalizePainLevel(data.level || data.pain || (latestPain.type === "workout" ? data.painLevel : "yellow"),data.movementChanged), hold = painRequiresSafetyHold(level,data.movementChanged);
      push({id:"pain:" + latestPain.id,profileId:profile.id,client:profile.name,trainer:profile.assignedTrainerName || "Coaching team",kind:"pain",urgency:hold ? "urgent" : "high",rank:hold ? 0 : 1,createdAt:latestPain.date,label:(PAIN_LEVELS[level] && PAIN_LEVELS[level].label || "Pain report") + (hold ? " · safety review" : " · monitor"),detail:latestPain.note || latestPain.value || "Review the affected movement before the next session."});
    }

    const intakeStatus = intakeCompletion(profile);
    if (intakeStatus.safetyRequired && !intakeStatus.safetyReviewed) push({id:"intake-review:" + profile.id + ":" + intakeSafetySignature(profile.intake),profileId:profile.id,client:profile.name,trainer:profile.assignedTrainerName || "Coaching team",kind:"intake",urgency:"urgent",rank:0,createdAt:profile.intake && profile.intake.updatedAt || profile.updatedAt,label:"Intake safety review",detail:"A health-readiness answer or current limitation needs a documented trainer decision before difficult programming."});
    else if (profile.intake && intakeStatus.status === "trainer_review") push({id:"intake-baseline:" + profile.id + ":" + String(profile.intake.updatedAt || ""),profileId:profile.id,client:profile.name,trainer:profile.assignedTrainerName || "Coaching team",kind:"intake",urgency:"high",rank:1,createdAt:profile.intake.updatedAt || profile.updatedAt,label:"Onboarding ready for trainer",detail:"All client sections are complete. Review the answers and document the baseline programming decision."});
    else if (profile.intake && intakeStatus.percent < 100) push({id:"intake-incomplete:" + profile.id,profileId:profile.id,client:profile.name,trainer:profile.assignedTrainerName || "Coaching team",kind:"intake",urgency:"normal",rank:5,createdAt:profile.intake.updatedAt || profile.updatedAt,label:"Onboarding incomplete",detail:intakeStatus.complete + " of " + intakeStatus.total + " intake sections are ready. Help the client close the missing context."});

    const baselineState = baselineStateForProfile(profile);
    if (baselineState.status === "provisional") push({id:"baseline-review:" + profile.id + ":" + String((baselineState.evidence[0] && baselineState.evidence[0].entry.date) || "ready"),profileId:profile.id,client:profile.name,trainer:profile.assignedTrainerName || "Coaching team",kind:"baseline",urgency:"high",rank:1,createdAt:(baselineState.evidence[0] && baselineState.evidence[0].entry.date) || profile.updatedAt,label:"Baseline evidence ready",detail:"Calibration anchors are complete. Verify pain response, confidence, effort, and exercise fit before tailored programming."});
    else if (["missing","due"].includes(baselineState.status) && intakeStatus.status === "complete") push({id:"baseline-needed:" + profile.id + ":" + baselineState.status,profileId:profile.id,client:profile.name,trainer:profile.assignedTrainerName || "Coaching team",kind:"baseline",urgency:"normal",rank:4,createdAt:profile.updatedAt,label:baselineState.status === "due" ? "Baseline update needed" : "Calibration plan needed",detail:"Build one useful calibration workout for a once-weekly client or split the goal-specific anchors across two visits."});

    const latestReady = progress.filter((entry) => entry.type === "readiness" && progressEntryBelongsToClient(entry,profile)).sort((a,b) => String(b.date).localeCompare(String(a.date)))[0];
    const readinessScore = latestReady ? parseInt(latestReady.value,10) : null;
    if (Number.isFinite(readinessScore) && readinessScore < 50 && now - new Date(latestReady.date).getTime() <= 7 * 86400000) push({id:"readiness:" + latestReady.id,profileId:profile.id,client:profile.name,trainer:profile.assignedTrainerName || "Coaching team",kind:"readiness",urgency:readinessScore < 35 || latestReady.data && latestReady.data.safetyHold ? "urgent" : "high",rank:readinessScore < 35 ? 0 : 1,createdAt:latestReady.date,label:readinessScore < 35 ? "Extreme readiness outlier" : "Low readiness",detail:"Readiness " + readinessScore + "/100 · " + (latestReady.data && latestReady.data.adjustmentPlan && latestReady.data.adjustmentPlan.changes || []).join(" · ")});
    const recentReadinessSkip = progress.filter((entry) => entry.type === "readiness_skip" && progressEntryBelongsToClient(entry,profile) && now - new Date(entry.date || 0).getTime() <= 7 * 86400000).sort((a,b) => String(b.date).localeCompare(String(a.date)))[0];
    if (recentReadinessSkip) push({id:"readiness-skip:" + recentReadinessSkip.id,profileId:profile.id,client:profile.name,trainer:profile.assignedTrainerName || "Coaching team",kind:"readiness",urgency:"normal",rank:5,createdAt:recentReadinessSkip.date,label:"Pre-workout check skipped",detail:"Reason: " + String(recentReadinessSkip.data && recentReadinessSkip.data.reason || recentReadinessSkip.value || "not entered").replace(/_/g," ") + ". Follow up if this becomes a pattern."});
    const trend = readinessTrendContext(profile);
    if (trend.level !== "normal") push({id:"readiness-trend:" + profile.id + ":" + trend.level,profileId:profile.id,client:profile.name,trainer:profile.assignedTrainerName || "Coaching team",kind:"readiness",urgency:trend.level === "reduce" ? "high" : "normal",rank:trend.level === "reduce" ? 1 : 4,createdAt:latestReady && latestReady.date || profile.updatedAt,label:trend.level === "reduce" ? "Repeated recovery concern" : "Readiness trend to review",detail:trend.summary + (trend.causes.length ? " Repeated signals: " + trend.causes.join(", ") + "." : "")});

    const recoveryDue = recoveryFollowUpStatus(profile);
    if (recoveryDue.active && recoveryDue.overdue) push({id:"recovery-overdue:" + recoveryDue.assignment.id,profileId:profile.id,client:profile.name,trainer:profile.assignedTrainerName || "Coaching team",kind:"recovery_due",urgency:"high",rank:2,createdAt:recoveryDue.targetEnd.toISOString(),label:"Recovery pulse overdue",detail:"The short 24–48 hour follow-up has not been completed. Send a reminder if this workout needs closer recovery or pain follow-up."});

    const activity = progress.filter((entry) => progressEntryBelongsToClient(entry,profile)).sort((a,b) => String(b.date).localeCompare(String(a.date)))[0];
    const profileAge = now - new Date(profile.updatedAt || profile.createdAt || now).getTime();
    if ((activity && now - new Date(activity.date).getTime() > 21 * 86400000) || (!activity && profileAge > 21 * 86400000)) push({id:"inactive:" + profile.id + ":" + String(activity && activity.id || "none"),profileId:profile.id,client:profile.name,trainer:profile.assignedTrainerName || "Coaching team",kind:"inactive",rank:6,createdAt:activity && activity.date || profile.updatedAt,label:"Follow-up due",detail:activity ? "No recorded activity for more than 21 days." : "No workout activity has been recorded for this client."});

    const program = savedProgramFor(profile), programAssignments = program ? assignments.filter((item) => item.profileId === profile.id && item.programId === program.id) : [], future = programAssignments.filter((item) => ["assigned","in_progress"].includes(assignmentStatus(item)));
    if (program && programAssignments.length && future.length <= 1) push({id:"program-ending:" + profile.id + ":" + program.id,profileId:profile.id,client:profile.name,trainer:profile.assignedTrainerName || "Coaching team",kind:"program",urgency:"high",rank:2,createdAt:program.savedAt || program.createdAt,label:"Program running out",detail:future.length ? "Only one published workout remains." : "No published workout remains in the current program."});
  });
  assignmentReviews.forEach((assignment) => {
    const profile = profiles.find((item) => item.id === assignment.profileId) || profiles.find((item) => clientMatches(item.name,assignment.client));
    const review = assignment.clientReview || {}, painHold = painRequiresSafetyHold(review.painLevel || review.pain,review.movementChanged), urgent = Boolean(review.questions || painHold);
    push({id:"workout-review:" + assignment.id,profileId:profile && profile.id || assignment.profileId,client:assignment.client,trainer:profile && profile.assignedTrainerName || "Coaching team",kind:"workout",urgency:urgent ? "urgent" : "high",rank:urgent ? 0 : 1,createdAt:assignment.completedAt || assignment.assignedAt,label:review.questions ? "Client question after workout" : review.pain && review.pain !== "none" ? (painHold ? "Workout pain safety review" : "Workout discomfort review") : "Workout review ready",detail:review.questions ? review.questions : review.pain && review.pain !== "none" ? (review.injuryDetails || "Review the reported " + (INJURY_LABELS[review.injuryArea] || review.injuryArea || "pain") + " before the next workout.") : "Review completion, logged sets, effort, and the client’s note before adjusting the plan."});
  });
  checkinReviews.forEach((checkin) => {
    const profile = profiles.find((item) => item.id === checkin.profileId) || profiles.find((item) => clientMatches(item.name,checkin.client));
    const painHold = painRequiresSafetyHold(checkin.painLevel || checkin.pain,checkin.movementChanged), recovery = checkin.reviewType === "recovery_24_48";
    const recoveryConcern = recovery && (Number(checkin.recovery) <= 2 || Number(checkin.soreness) >= 4 || ["unsure","no"].includes(checkin.nextSessionReadiness) || ["same","worse"].includes(checkin.painTrend));
    const urgent = painHold || recovery && (checkin.painTrend === "worse" || checkin.nextSessionReadiness === "no");
    const high = Boolean(checkin.question || Number(checkin.pain) > 0 || recoveryConcern);
    const recoveryDetail = painHold ? "Pain changed movement or stopped training. Review the affected area before the next workout." : checkin.painTrend === "worse" ? "Discomfort is worse after the workout. Review before the next similar movement." : checkin.nextSessionReadiness === "no" ? "Client does not feel ready for the next planned session." : Number(checkin.soreness) >= 4 ? "Soreness is affecting normal activity; review volume and recovery before the next similar session." : Number(checkin.recovery) <= 2 ? "Client reports poor recovery after the workout." : checkin.note ? "Client note: " + checkin.note : "Recovery looks on track. Review and acknowledge the client’s follow-through.";
    push({id:"checkin:" + checkin.id,profileId:profile && profile.id || checkin.profileId,client:checkin.client,trainer:profile && profile.assignedTrainerName || "Coaching team",kind:recovery ? "recovery" : "checkin",urgency:urgent ? "urgent" : high ? "high" : "normal",rank:urgent ? 0 : high ? 1 : 3,createdAt:checkin.createdAt || checkin.date,label:recovery ? "24–48h recovery pulse ready" : checkin.reviewType === "starter_week_1" ? "First-week review ready" : "Weekly check-in ready",detail:recovery ? recoveryDetail : checkin.question ? "Client question: " + checkin.question : painHold ? "Pain changed movement or stopped training. Review the affected area before the next workout." : Number(checkin.pain) > 0 ? "Mild discomfort reported with movement still normal. Monitor and reply before progression." : "Review adherence, recovery, wins, barriers, and next-week schedule."});
  });
  receiptRequests.forEach(({profile,status}) => push({id:"progress-receipt:" + status.type + ":" + profile.id + ":" + String(status.startAt || ""),profileId:profile.id,client:profile.name,trainer:profile.assignedTrainerName || "Coaching team",kind:status.type === "formal" ? "receipt_formal" : "receipt_weekly",urgency:status.type === "formal" ? "high" : "normal",rank:status.type === "formal" ? 2 : 3,createdAt:status.draft && status.draft.updatedAt || status.dueAt || status.startAt,label:status.type === "formal" ? "Formal progress receipt requested" : "Weekly progress receipt requested",detail:status.reason + " Review the evidence, make the next change specific, and publish it to the client."}));
  recognition.forEach((profile) => {
    const recent = progress.filter((entry) => progressEntryBelongsToClient(entry,profile) && ["set","workout"].includes(entry.type)).sort((a,b) => String(b.date).localeCompare(String(a.date)))[0];
    if (recent) push({id:"recognition:" + recent.id,profileId:profile.id,client:profile.name,trainer:profile.assignedTrainerName || "Coaching team",kind:"recognition",urgency:"positive",rank:4,createdAt:recent.date,label:"Positive recognition due",detail:"Acknowledge consistency or progress before giving the next correction."});
  });
  automationAlerts.forEach((alert) => {
    const profile = profiles.find((item) => item.id === alert.profileId);
    if (!profile) return;
    push({id:"automation:" + alert.id,profileId:profile.id,client:profile.name,trainer:profile.assignedTrainerName || "Coaching team",kind:"automation",urgency:"high",rank:2,createdAt:alert.createdAt,label:alert.title || "Coach alert",detail:alert.copy || "A saved trainer rule matched this client and needs human review."});
  });
  trainerRequests.forEach((request) => push({id:"trainer-request:" + request.id,profileId:"",client:request.full_name || request.email || "Trainer request",trainer:"Staff confirmation",kind:"trainer_request",urgency:"normal",rank:3,createdAt:request.created_at,label:"Trainer access request",detail:"Confirm only a verified request from a person who should access this gym’s client records. The approver is recorded."}));
  const attentionState = loadAttentionState(), visibleItems = items.filter((item) => attentionItemIsVisible(item,attentionState)).sort((a,b) => Number(a.rank || 9) - Number(b.rank || 9) || new Date(a.createdAt || 0) - new Date(b.createdAt || 0));
  return {unanswered,assignmentReviews,checkinReviews,recoveryOverdue,formalReviews,receiptRequests,recognition,trainerRequests,automationAlerts,reviews:assignmentReviews.length + checkinReviews.length + receiptRequests.length,items:visibleItems};
}
function openCoachAttentionItem(profileId,kind) {
  if (kind === "trainer_request") { openCoachDestination("access"); return; }
  const profile = loadProfiles().find((item) => item.id === profileId);
  if (!profile) { openCoachDestination(kind === "message" ? "messages" : "clients"); return; }
  selectedTrainerClient = profile.name;
  selectedInBodyScanId = "";
  trainerSummaryState = newTrainerSummaryState();
  trainerSummaryState.tab = kind === "message" || kind === "recognition" || kind === "inactive" || kind === "recovery_due" ? "messages"
    : ["checkin","recovery"].includes(kind) ? "checkins"
      : kind === "automation" ? "coaching"
      : kind === "program" || kind === "formal" || kind === "baseline" ? "program"
        : ["receipt_weekly","receipt_formal"].includes(kind) ? "progress"
        : kind === "pain" || kind === "readiness" || kind === "intake" ? "assessments" : "overview";
  show("trainer");
  renderTrainerHub(profile.name);
  if (["receipt_weekly","receipt_formal"].includes(kind)) setTimeout(() => openProgressReceiptEditor(profile.id,kind === "receipt_formal" ? "formal" : "weekly"),30);
}
function updateCoachAttentionItem(id,status) {
  const state = loadAttentionState();
  state[id] = status === "snoozed"
    ? {status:"snoozed",until:new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),updatedAt:new Date().toISOString(),updatedBy:currentAccountIdentity().displayName}
    : {status:"done",updatedAt:new Date().toISOString(),updatedBy:currentAccountIdentity().displayName};
  writeLocalObject(ATTENTION_STATE_KEY,state);
  if (status === "done" && String(id).startsWith("automation:")) {
    const alertId = String(id).slice("automation:".length);
    writeLocalArray(AUTOMATION_ALERTS_KEY,loadAutomationAlerts().filter((item) => item.id !== alertId),500);
  }
  renderTrainerAttention();
  showToast(status === "snoozed" ? "Reminder snoozed until tomorrow" : "Attention item marked handled");
}
function renderTrainerAttention() {
  const attention = trainerAttentionSnapshot(), panel = byId("trainerAttentionPanel");
  document.querySelectorAll("[data-attention-badge]").forEach((badge) => {
    const key = badge.dataset.attentionBadge, count = key === "messages" ? attention.unanswered.length : key === "reviews" ? attention.reviews : attention.trainerRequests.length;
    badge.textContent = count > 99 ? "99+" : String(count); badge.classList.toggle("show",count > 0);
  });
  if (!panel) return attention;
  panel.innerHTML =
    '<button class="attention-card ' + (attention.unanswered.length ? 'urgent' : '') + '" onclick="openCoachDestination(\'messages\')"><span>Unanswered messages</span><b>' + attention.unanswered.length + '</b><p>' + (attention.unanswered.length ? 'Clients are waiting for a trainer reply.' : 'No client is waiting on a reply.') + '</p></button>' +
    '<button class="attention-card ' + (attention.reviews ? 'urgent' : '') + '" onclick="openCoachDestination(\'calendar\')"><span>Reviews waiting</span><b>' + attention.reviews + '</b><p>' + attention.assignmentReviews.length + ' workout · ' + attention.checkinReviews.length + ' check-in · ' + attention.receiptRequests.length + ' receipt' + (attention.recoveryOverdue.length ? ' · ' + attention.recoveryOverdue.length + ' recovery overdue' : '') + '</p></button>' +
    '<button class="attention-card positive" onclick="openCoachDestination(\'messages\')"><span>Recognition due</span><b>' + attention.recognition.length + '</b><p>Recent effort with no coach acknowledgement yet.</p></button>' +
    '<button class="attention-card" onclick="openCoachDestination(\'access\')"><span>Trainer requests</span><b>' + attention.trainerRequests.length + '</b><p>Approved trainers can confirm verified pending requests; owners control manual grants and removal.</p></button>' +
    '<section class="attention-command"><div class="attention-command-head"><div><h3>Who needs me next?</h3><p>Safety and unanswered communication come first, then required reviews, expiring plans, recognition, and inactive-client follow-up.</p></div><span class="attention-command-count">' + attention.items.length + '</span></div><div class="attention-queue">' +
    (attention.items.slice(0,12).map((item) => '<article class="attention-item ' + escapeHtml(item.urgency) + '"><i class="attention-priority" aria-hidden="true"></i><div class="attention-person"><b>' + escapeHtml(item.client || "Workspace") + '</b><span>' + escapeHtml(item.trainer || "Coaching team") + ' · waiting ' + escapeHtml(attentionWaitingLabel(item.createdAt)) + '</span></div><div class="attention-reason"><b>' + escapeHtml(item.label) + '</b><span>' + escapeHtml(item.detail) + '</span></div><div class="attention-item-actions"><button class="mini-btn primary" onclick="openCoachAttentionItem(\'' + escapeHtml(item.profileId || "") + '\',\'' + escapeHtml(item.kind) + '\')">Open</button><button class="mini-btn" onclick="updateCoachAttentionItem(\'' + escapeHtml(item.id) + '\',\'snoozed\')">Tomorrow</button><button class="mini-btn" onclick="updateCoachAttentionItem(\'' + escapeHtml(item.id) + '\',\'done\')">Handled</button></div></article>').join("") || '<div class="attention-empty"><b>No client is waiting on the coaching team.</b><br>New pain reports, messages, reviews, recognition opportunities, and expiring programs will appear here.</div>') +
    '</div></section>';
  return attention;
}
function sendClientMessage() {
  const profile = activeClientProfile(), input = byId('clientMessageInput'); if (!profile || !input || !input.value.trim()) return;
  const identity = currentAccountIdentity(), messages = loadLocalArray(CLIENT_MESSAGES_KEY), body = input.value.trim();
  messages.unshift({id:'message-' + Date.now(),profileId:profile.id,client:profile.name,from:'client',senderRole:'client',senderUserId:identity.id || '',senderName:profile.name,recipientRole:'trainer',recipientUserId:profile.assignedTrainerId || '',recipientName:profile.assignedTrainerName || 'Coaching team',body,createdAt:new Date().toISOString()});
  writeLocalArray(CLIENT_MESSAGES_KEY,messages,1000); input.value = ''; renderClientCoach(profile); renderTrainerAttention(); showToast('Message sent to ' + (profile.assignedTrainerName || 'your coaching team'));
}
function renderClientCoach(profile) {
  const out = byId('clientCoachContent'); if (!out) return; const assignment = assignmentForClient(profile.id), messages = loadClientMessages(profile.id), checkins = weeklyCheckInsForProfile(profile.id), recoveryFollowUps = recoveryFollowUpsForProfile(profile.id), recoveryStatus = recoveryFollowUpStatus(profile), pain = loadProgress().filter((entry) => (entry.profileId === profile.id || clientMatches(entry.client,profile.name)) && (entry.type === 'pain' || entry.type === 'substitution' && entry.data && entry.data.reason === 'discomfort'));
  out.innerHTML = '<div class="client-grid"><section class="client-card wide"><div class="client-section-label">Direct messages · ' + escapeHtml(profile.assignedTrainerName || 'Coaching team') + '</div>' + messageThreadHtml(messages,profile,'client') + '<div class="message-compose"><div class="compact-field"><label for="clientMessageInput">Message ' + escapeHtml(profile.assignedTrainerName || 'your coaching team') + '</label><input id="clientMessageInput" placeholder="Ask one clear question" onkeydown="if(event.key===\'Enter\')sendClientMessage()"></div><button class="small-btn primary" onclick="sendClientMessage()">Send message</button></div></section>'
    + '<section class="client-card ' + (recoveryStatus.active && recoveryStatus.due ? 'recovery-reminder' : '') + '"><div class="client-section-label">24–48h recovery</div><h3>' + (recoveryStatus.active && recoveryStatus.due ? 'Quick pulse ready' : recoveryFollowUps.length ? 'Latest pulse sent' : 'No pulse due') + '</h3><p>' + (recoveryStatus.active && recoveryStatus.due ? 'Tell your trainer how you recovered in less than a minute.' : recoveryFollowUps.length ? 'Your trainer received the latest recovery update.' : 'A recovery pulse appears after early sessions and when a workout needs closer follow-up.') + '</p>' + (recoveryStatus.active && recoveryStatus.due ? '<div class="tool-actions"><button class="small-btn primary" onclick="openClientRecoveryFollowUp(\'' + escapeHtml(recoveryStatus.assignment.id) + '\')">Open recovery pulse</button></div>' : '') + '</section>'
    + '<section class="client-card"><div class="client-section-label">Weekly check-ins</div><h3>' + checkins.length + ' submitted</h3><p>Recovery, adherence, wins, barriers, and next-week schedule.</p><div class="tool-actions"><button class="small-btn" onclick="openClientCheckInForActive()">Open check-in</button></div></section>'
    + '<section class="client-card"><div class="client-section-label">Coach feedback</div><h3>' + (assignment && assignment.coachNote ? 'New feedback' : 'No new feedback') + '</h3><p>' + escapeHtml(assignment && assignment.coachNote || 'Post-workout coaching decisions will appear here.') + '</p></section>'
    + '<section class="client-card"><div class="client-section-label">Program updates</div><h3>' + escapeHtml(clientWorkoutStatusLabel(assignment)) + '</h3><p>Important assignment and phase changes stay separate from direct messages.</p></section>'
    + '<section class="client-card"><div class="client-section-label">Pain & limitations</div><h3>' + pain.length + ' report' + (pain.length === 1 ? '' : 's') + '</h3><p>Pain-related exercise changes notify the coach and stay attached to the workout.</p><div class="tool-actions"><button class="small-btn" onclick="openClientPainReport()">Report pain</button></div></section>'
    + '<section class="client-card"><div class="client-section-label">Technique-video feedback</div><h3>No video submitted</h3><p>Video upload requires connected cloud storage. Coaching notes remain available now.</p></section>'
    + '<section class="client-card"><div class="client-section-label">Appointments</div><h3>No appointment scheduled</h3><p>Upcoming coaching appointments will appear here when calendar syncing is connected.</p></section>'
    + '<section class="client-card"><div class="client-section-label">Resources</div><h3>Training guides</h3><p>Use the RPE/RIR guide and exercise instructions from More.</p><div class="tool-actions"><button class="small-btn" onclick="openClientTab(\'more\')">Open resources</button></div></section></div>';
}
function openClientMoreSection(section) { openClientTab('more'); if (section) setTimeout(() => { const target = byId('client-more-' + section); if (target) target.scrollIntoView({behavior:'smooth',block:'start'}); },20); }
function renderClientMore(profile) {
  const out = byId('clientMoreContent'), intakeStatus = intakeCompletion(profile); if (!out) return; out.innerHTML = '<div class="client-grid"><section class="client-card wide" id="client-more-tools"><div class="client-section-label">Training tools</div><div class="client-grid" style="margin-top:10px"><div class="client-action-row"><span><b>Rest & interval timers</b><span>Fullscreen timers for sets and conditioning</span></span><button class="small-btn" onclick="openTools()">Open</button></div><div class="client-action-row"><span><b>Plate calculator</b><span>Load a barbell without mental math</span></span><button class="small-btn" onclick="openTools()">Open</button></div><div class="client-action-row"><span><b>1RM estimator</b><span>Estimate training percentages</span></span><button class="small-btn" onclick="openTools()">Open</button></div><div class="client-action-row"><span><b>RPE / RIR guide</b><span>Match effort to the prescription</span></span><button class="small-btn" onclick="openTools()">Open</button></div></div></section>'
    + '<section class="client-card"><div class="client-section-label">Exercise library</div><h3>' + LIBRARY.length + ' approved movements</h3><p>Exercise instructions and substitutions appear contextually during the workout.</p></section>'
    + '<section class="client-card" id="client-more-nutrition"><div class="client-section-label">Nutrition</div><h3>Optional daily support</h3><p>Keep targets simple and coach-defined. This is not a meal-prescription or medical nutrition tool.</p></section>'
    + '<section class="client-card"><div class="client-section-label">Education</div><h3>Learn the plan</h3><p>RPE/RIR, exercise technique, recovery, and program-phase guides live here instead of on Home.</p></section>'
    + '<section class="client-card wide"><div class="client-section-label">Coaching intake · ' + intakeStatus.percent + '%</div><div class="client-action-row"><span><b>' + (intakeStatus.programmingBlocked ? 'Safety review pending' : intakeStatus.status === 'trainer_review' ? 'Waiting for trainer review' : intakeStatus.status === 'complete' ? 'Onboarding complete' : 'Finish onboarding') + '</b><span>Identity, goals, schedule, equipment, health-readiness, recovery, coaching preferences, emergency contact, and consent stay together here.</span></span><button class="small-btn ' + (intakeStatus.status !== 'complete' ? 'primary' : '') + '" onclick="openClientOnboarding()">Open intake</button></div></section>'
    + '<section class="client-card wide"><div class="client-section-label">Account & settings</div><div class="client-action-row"><span><b>' + escapeHtml(profile.name) + '</b><span>@' + escapeHtml(profileUsername(profile)) + ' · ' + EXP_LABEL(profile.experience) + '</span></span><button class="small-btn" onclick="clearActiveClient()">Use another profile</button></div><p style="margin-top:10px">Profile editing remains trainer-only. When the cloud status says “Saved across devices,” completed sets, messages, check-ins, intake updates, and program activity are synchronized to this account.</p></section></div>';
}
function openClientPainReport() {
  const profile = activeClientProfile(); if (!profile) return;
  fillSelectOptions(byId("clientPainArea"),painLocationOptions(true),"");
  byId("clientPainLevel").value = "yellow";
  byId("clientPainMovementChanged").value = "no";
  byId("clientPainScore").value = "";
  byId("clientPainExercise").value = activeWorkout ? (() => {
    const data = activeAssignmentAndSession(), unit = data.session && activeWorkoutUnits(data.session,activeWorkout.shortened)[activeWorkout.unitIndex];
    return unit && (unit.items[activeWorkout.pairIndex] || unit.items[0]).name || "";
  })() : "";
  byId("clientPainDetails").value = "";
  updateClientPainAction();
  byId("clientPainModal").classList.add("open");
}
function closeClientPainReport() { byId("clientPainModal").classList.remove("open"); }
function syncClientPainLevel() {
  if (byId("clientPainMovementChanged").value === "yes" && painLevelInfo(byId("clientPainLevel").value).rank < PAIN_LEVELS.orange.rank) byId("clientPainLevel").value = "orange";
  updateClientPainAction();
}
function updateClientPainAction() {
  const info = painLevelInfo(byId("clientPainLevel") && byId("clientPainLevel").value,byId("clientPainMovementChanged") && byId("clientPainMovementChanged").value), out = byId("clientPainAction");
  if (!out) return;
  out.style.setProperty("--pain-color",info.color);
  out.innerHTML = "<b>" + escapeHtml(info.label) + "</b>" + escapeHtml(info.action);
}
function saveClientPainReport() {
  const profile = activeClientProfile(); if (!profile) return null;
  const movementChanged = byId("clientPainMovementChanged").value === "yes", level = normalizePainLevel(byId("clientPainLevel").value,movementChanged), info = PAIN_LEVELS[level];
  const area = byId("clientPainArea").value, exercise = byId("clientPainExercise").value.trim(), details = byId("clientPainDetails").value.trim(), rawScore = byId("clientPainScore").value;
  if (!area) { showToast("Choose where you felt it"); byId("clientPainArea").focus(); return null; }
  if (info.rank >= PAIN_LEVELS.orange.rank && !exercise) { showToast("Name the movement or exercise that changed"); byId("clientPainExercise").focus(); return null; }
  if (info.rank >= PAIN_LEVELS.orange.rank && details.length < 5) { showToast("Briefly describe what changed and whether you stopped"); byId("clientPainDetails").focus(); return null; }
  const data = {area,injuryArea:area,level,pain:info.legacy,movementChanged,exercise,details,painScore:rawScore === "" ? null : Math.max(0,Math.min(10,Number(rawScore))),coachNotice:true,safetyHold:info.rank >= PAIN_LEVELS.orange.rank};
  const record = addProgressEntry({type:"pain",profileId:profile.id,client:profile.name,sessionId:activeWorkout && activeWorkout.sessionId || "",label:info.label,value:INJURY_LABELS[area] || area,note:(exercise ? exercise + " · " : "") + (details || info.action),data});
  if (data.safetyHold && activeWorkout) {
    const current = activeAssignmentAndSession(), unit = current.session && activeWorkoutUnits(current.session,activeWorkout.shortened)[activeWorkout.unitIndex], activeExercise = unit && (unit.items[activeWorkout.pairIndex] || unit.items[0]);
    if (activeExercise) {
      activeWorkout.skippedExercises[activeWorkout.unitIndex + "::" + activeExercise.name] = {at:new Date().toISOString(),reason:"pain",level};
      saveActiveWorkoutState();
    }
  }
  closeClientPainReport();
  showToast(level === "yellow" ? "Yellow caution saved and sent to your trainer" : level === "orange" ? "Exercise stopped — report sent for trainer review" : "Workout stopped — report sent for trainer review");
  if (level === "red" && activeWorkout) { saveActiveWorkoutState(); openClientTab("coach"); }
  else if (currentView === "active-workout") renderActiveWorkout();
  else if (currentView === "client-coach") renderClientCoach(profile);
  return record;
}

/* Focused workout execution. The active location is stored after every move,
   while every completed set continues to use the existing progress model. */
function loadActiveWorkoutState() { try { const value = JSON.parse(localStorage.getItem(ACTIVE_WORKOUT_KEY) || 'null'); return value && typeof value === 'object' ? value : null; } catch (_) { return null; } }
function saveActiveWorkoutState() { try { if (activeWorkout) localStorage.setItem(ACTIVE_WORKOUT_KEY,JSON.stringify(activeWorkout)); else localStorage.removeItem(ACTIVE_WORKOUT_KEY); } catch (_) {} }
function activeWorkoutUnits(session,shortened) {
  const units = [];
  (session.blocks || []).forEach((block,bi) => {
    if (shortened && ['iso','finisher','conditioning'].includes(block.key)) return;
    const groups = block.groups && block.groups.length ? block.groups : (block.items || []).map((item) => ({type:'straight',items:[item]})), used = new Set();
    groups.forEach((group) => { const items = (group.items || []).map((groupItem) => (block.items || []).find((item) => item.name === groupItem.name) || groupItem).filter((item) => !used.has(item.name)); items.forEach((item) => used.add(item.name)); if (items.length) units.push({block,bi,type:group.type === 'superset' && items.length > 1 ? 'superset' : 'straight',items}); });
    (block.items || []).filter((item) => !used.has(item.name)).forEach((item) => units.push({block,bi,type:'straight',items:[item]}));
  });
  return units;
}
function localDayKey(value) {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return "";
  return [date.getFullYear(),String(date.getMonth() + 1).padStart(2,"0"),String(date.getDate()).padStart(2,"0")].join("-");
}
function readinessEntryForWorkout(profileId,assignmentId) {
  const today = localDayKey();
  return loadProgress().find((entry) => entry.type === "readiness" && entry.profileId === profileId && localDayKey(entry.date) === today && entry.data && entry.data.purpose === "pre_workout" && entry.data.assignmentId === assignmentId) || null;
}
function readinessSkipForWorkout(profileId,assignmentId) {
  const today = localDayKey();
  return loadProgress().find((entry) => entry.type === "readiness_skip" && entry.profileId === profileId && localDayKey(entry.date) === today && entry.data && entry.data.assignmentId === assignmentId) || null;
}
function resetQuickReadinessForm() {
  [["readySleep","3"],["readyEnergy","3"],["readySoreness","3"],["readyStress","3"],["readyPain","0"],["readyMotivation","3"],["readyOverall","3"],["readyIllness","none"]].forEach(([id,value]) => { if (byId(id)) byId(id).value = value; });
  if (byId("readySleepHours")) byId("readySleepHours").value = "7.5";
  if (byId("readyPainMovement")) byId("readyPainMovement").value = "no";
  if (byId("readyPainExercise")) byId("readyPainExercise").value = "";
  if (byId("readyPainArea")) byId("readyPainArea").value = "";
  if (byId("readySorenessArea")) byId("readySorenessArea").value = "";
  if (byId("readinessSkipReason")) byId("readinessSkipReason").value = "";
  if (byId("readinessResult")) { byId("readinessResult").style.display = "none"; byId("readinessResult").innerHTML = ""; }
  currentReadiness = null; updateReadinessPainFields(); updateReadinessSorenessFields();
}
function openClientReadinessForWorkout(profileId,assignmentId,shortened) {
  const profile = loadProfiles().find((item) => item.id === profileId), assignment = loadAssignedWorkouts().find((item) => item.id === assignmentId && item.profileId === profileId) || assignmentForClient(profileId);
  if (!profile || !assignment) { showToast("No coach-approved workout is assigned yet"); return null; }
  pendingReadinessStart = {profileId,assignmentId:assignment.id,shortened:Boolean(shortened)};
  portalRole = "client"; openReadiness(); selectReadinessProfile(profile.id); resetQuickReadinessForm(); selectReadinessProfile(profile.id);
  const gate = byId("readinessStartGate"), copy = byId("readinessGateCopy"), actions = byId("readinessGateActions");
  if (gate) gate.style.display = "block";
  if (copy) copy.textContent = "Complete the six quick taps above. FIT 4 LIFE will keep " + profile.name + "’s coach-approved workout intact or make a temporary dose adjustment for today.";
  if (actions) actions.innerHTML = "";
  if (byId("clientReadinessReturnCard")) byId("clientReadinessReturnCard").style.display = "none";
  setTimeout(() => byId("readySleep") && byId("readySleep").focus(),30);
  return pendingReadinessStart;
}
function recordReadinessSkipAndStart() {
  if (!pendingReadinessStart) { showToast("Open an assigned workout first"); return null; }
  const reason = byId("readinessSkipReason") && byId("readinessSkipReason").value;
  if (!reason) { showToast("Choose why the readiness check is being skipped"); return null; }
  const profile = loadProfiles().find((item) => item.id === pendingReadinessStart.profileId);
  addProgressEntry({type:"readiness_skip",profileId:pendingReadinessStart.profileId,client:profile && profile.name || "Client",label:"Pre-workout readiness skipped",value:reason,note:"Assigned workout used without a same-day readiness score.",data:{purpose:"pre_workout",assignmentId:pendingReadinessStart.assignmentId,reason,coachNotice:true}});
  const request = {...pendingReadinessStart}; pendingReadinessStart = null;
  return startActiveWorkout(request.profileId,request.shortened,request.assignmentId,true);
}
function continueReadinessAdjustedWorkout() {
  if (!pendingReadinessStart) { showToast("Open an assigned workout first"); return null; }
  const saved = readinessEntryForWorkout(pendingReadinessStart.profileId,pendingReadinessStart.assignmentId);
  if (!saved) { showToast("Save today’s readiness check first"); return null; }
  if (saved.data && saved.data.blockStart) { showToast("Hard training is paused. Contact your trainer and follow appropriate medical guidance for severe or worsening symptoms."); return null; }
  const request = {...pendingReadinessStart}; pendingReadinessStart = null;
  return startActiveWorkout(request.profileId,request.shortened,request.assignmentId,true);
}
function readinessAdjustmentPlan(readiness) {
  const plan = {blockStart:false,safetyHold:false,setDelta:0,rpe:8,remove:[],straightSets:false,filterAreas:[],changes:[]};
  if (!readiness) return plan;
  if (readiness.illness === "significant" || readiness.pain >= 3 || readiness.key === "recovery") {
    plan.blockStart = true; plan.safetyHold = readiness.illness === "significant" || readiness.pain >= 3; plan.rpe = 0; plan.changes.push("Hard training paused for severe symptoms or extremely low readiness"); return plan;
  }
  if (readiness.key === "adjust") { plan.setDelta = -1; plan.rpe = 7; plan.changes.push("One working set removed from higher-volume blocks"); }
  if (readiness.key === "reduce") { plan.setDelta = -2; plan.rpe = 6; plan.remove.push("power","plyo","finisher"); plan.changes.push("Power work and finishers removed"); }
  if (readiness.sleep <= 2 || readiness.energy <= 2) {
    plan.setDelta = Math.min(plan.setDelta,-1); plan.rpe = Math.min(plan.rpe,7); plan.changes.push("Effort capped because sleep or energy is low");
    if (readiness.sleep === 1 || readiness.energy === 1) { plan.setDelta = Math.min(plan.setDelta,-2); plan.remove.push("power","plyo","finisher"); }
  }
  if (readiness.stress >= 4) { plan.setDelta = Math.min(plan.setDelta,-1); plan.rpe = Math.min(plan.rpe,7); plan.straightSets = true; plan.changes.push("Complex pairings simplified because stress is high"); }
  if (readiness.soreness >= 4) {
    plan.setDelta = Math.min(plan.setDelta,-1); plan.rpe = Math.min(plan.rpe,7); plan.remove.push("finisher");
    if (readiness.sorenessArea && BODY_AREA_LIMITATIONS.includes(readiness.sorenessArea)) { plan.filterAreas.push(readiness.sorenessArea); plan.changes.push((INJURY_LABELS[readiness.sorenessArea] || readiness.sorenessArea) + " demand filtered for high soreness"); }
  }
  if (readiness.pain === 1) { plan.rpe = Math.min(plan.rpe,7); plan.changes.push("Load and range kept conservative while mild pain is monitored"); }
  if (readiness.pain >= 2 && BODY_AREA_LIMITATIONS.includes(readiness.painArea)) {
    plan.setDelta = Math.min(plan.setDelta,-2); plan.rpe = Math.min(plan.rpe,6); plan.remove.push("power","plyo","finisher"); plan.filterAreas.push(readiness.painArea); plan.changes.push((INJURY_LABELS[readiness.painArea] || readiness.painArea) + " stress removed because pain changed movement");
  }
  if (readiness.illness === "mild") { plan.setDelta = Math.min(plan.setDelta,-2); plan.rpe = Math.min(plan.rpe,6); plan.remove.push("power","plyo","finisher"); plan.changes.push("Training simplified for mild illness symptoms"); }
  plan.remove = [...new Set(plan.remove)]; plan.filterAreas = [...new Set(plan.filterAreas)]; plan.changes = [...new Set(plan.changes)];
  return plan;
}
function readinessReplacement(exercise,block,spec,used,seed) {
  const pool = eligible(spec,spec.age).filter((candidate) => !used.has(candidate.name) && candidate.name !== exercise.name && candidate.finisher === exercise.finisher);
  const samePattern = pool.filter((candidate) => candidate.pattern === exercise.pattern);
  const sameRegion = pool.filter((candidate) => candidate.region === exercise.region);
  const candidates = samePattern.length ? samePattern : sameRegion.length ? sameRegion : pool;
  if (!candidates.length) return null;
  return biasSort(candidates,spec.muscles || [],makeRng(seed || 1),spec.experience,emphasisOf(block.items || []))[0] || null;
}
function buildTodayReadinessSession(session,profile,readiness) {
  if (!session || !readiness) return {session,plan:readinessAdjustmentPlan(readiness),conflicts:["Workout is unavailable."]};
  const copy = JSON.parse(JSON.stringify(session)), plan = readinessAdjustmentPlan(readiness);
  if (plan.blockStart) return {session:null,plan,conflicts:[]};
  const spec = safetySpecForProfile(copy,profile);
  spec.injuries = [...new Set([...(spec.injuries || []),...plan.filterAreas])];
  copy.spec = {...copy.spec,readinessToday:{score:readiness.score,key:readiness.key,causes:plan.changes},injuries:[...(copy.spec.injuries || [])]};
  const used = new Set((copy.blocks || []).flatMap((block) => (block.items || []).map((exercise) => exercise.name)));
  (copy.blocks || []).forEach((block,blockIndex) => {
    const kept = [];
    (block.items || []).forEach((exercise,exerciseIndex) => {
      const conflicts = exerciseConstraintIssues(exercise,spec,spec.age).filter((issue) => issue.hard);
      if (!conflicts.length) { kept.push(exercise); return; }
      used.delete(exercise.name);
      const replacement = readinessReplacement(exercise,block,spec,used,Date.now() + blockIndex * 97 + exerciseIndex * 17);
      if (replacement) {
        const next = {...replacement,rx:{...(exercise.rx || block.rx)}}; kept.push(next); used.add(next.name); plan.changes.push(exercise.name + " changed to " + next.name + " for today");
      } else plan.changes.push(exercise.name + " removed because no safe same-day substitute was available");
    });
    block.items = kept;
    block.groups = kept.map((exercise) => ({type:"straight",items:[exercise]}));
  });
  copy.blocks = (copy.blocks || []).filter((block) => block.items.length && !plan.remove.includes(block.key));
  copy.blocks.forEach((block) => {
    if (["warmup","mobility","primer"].includes(block.key)) return;
    if (plan.setDelta < 0) {
      block.rx = {...block.rx,sets:adjustSetCount(block.rx && block.rx.sets || "1",plan.setDelta),rpe:"Cap at RPE " + plan.rpe};
      block.items.forEach((exercise) => { exercise.rx = {...(exercise.rx || block.rx),sets:adjustSetCount(exercise.rx && exercise.rx.sets || block.rx.sets,plan.setDelta),rpe:"Cap at RPE " + plan.rpe}; });
    }
    if (plan.straightSets) block.groups = block.items.map((exercise) => ({type:"straight",items:[exercise]}));
  });
  if (copy.prescription && plan.setDelta < 0) copy.prescription = {...copy.prescription,sets:adjustSetCount(copy.prescription.sets,plan.setDelta),rpe:"Cap at RPE " + plan.rpe};
  copy.readinessToday = {score:readiness.score,key:readiness.key,title:readiness.title,changes:[...new Set(plan.changes)],createdAt:readiness.createdAt};
  copy.rationale = "Today-only readiness adjustment (" + readiness.score + "/100): " + (plan.changes.join("; ") || "coach-approved plan kept as written") + ". The approved master program was not changed. " + (copy.rationale || "");
  normalizeSessionBlockOrder(copy); enrichSessionMetadata(copy);
  return {session:copy,plan,conflicts:sessionSafetyConflictsForProfile(copy,profile)};
}
function startActiveWorkout(profileId,shortened,assignmentId,bypassReadiness) {
  const profile = loadProfiles().find((item) => item.id === profileId), assignments = loadAssignedWorkouts(), selected = assignmentId ? assignments.find((item) => item.id === assignmentId && item.profileId === profileId) : assignmentForClient(profileId), assignmentIndex = selected ? assignments.findIndex((item) => item.id === selected.id) : -1; if (!profile || assignmentIndex < 0) { showToast('No coach-approved workout is assigned yet'); return null; }
  if (["completed","reviewed"].includes(assignmentStatus(assignments[assignmentIndex]))) { showToast('That workout is already complete. Choose the next scheduled workout.'); return null; }
  const currentSession = clientAssignedSession(assignments[assignmentIndex],profile);
  const readinessEntry = readinessEntryForWorkout(profile.id,assignments[assignmentIndex].id), readinessSkip = readinessSkipForWorkout(profile.id,assignments[assignmentIndex].id);
  if (!bypassReadiness && !readinessEntry && !readinessSkip) {
    openClientReadinessForWorkout(profile.id,assignments[assignmentIndex].id,shortened);
    showToast("Complete the quick pre-workout check before starting");
    return null;
  }
  const today = readinessEntry && readinessEntry.data ? buildTodayReadinessSession(currentSession,profile,readinessEntry.data) : {session:currentSession,plan:null,conflicts:[]};
  if (today.plan && today.plan.blockStart) { showToast("Hard training is paused today. Contact your trainer before continuing."); return null; }
  const unresolvedSafety = unresolvedClientSafetyHold(profile);
  if (unresolvedSafety) { showToast("Workout paused until your trainer reviews the recent pain or discomfort report"); return null; }
  const sessionForToday = today.session || currentSession, safetyConflicts = today.conflicts && today.conflicts.length ? today.conflicts : sessionSafetyConflictsForProfile(sessionForToday,profile);
  if (safetyConflicts.length) {
    addProgressEntry({type:"safety_hold",client:profile.name,profileId:profile.id,sessionId:sessionForToday && sessionForToday.sessionId || "",label:"Workout safety recheck",value:"Trainer review required",note:safetyConflicts.join(" · "),data:{conflicts:safetyConflicts}});
    showToast("Workout paused for trainer review: " + safetyConflicts.slice(0,2).join(" · "));
    return null;
  }
  if (assignmentStatus(assignments[assignmentIndex]) === 'assigned') { assignments[assignmentIndex].status = 'in_progress'; assignments[assignmentIndex].startedAt = new Date().toISOString(); writeAssignedWorkouts(assignments); }
  const assignment = assignments[assignmentIndex], session = sessionForToday, saved = loadActiveWorkoutState(); state.session = JSON.parse(JSON.stringify(assignment.session)); state.sessionOptions = [];
  activeWorkout = saved && saved.assignmentId === assignment.id ? saved : {assignmentId:assignment.id,profileId:profile.id,sessionId:session.sessionId,unitIndex:0,pairIndex:0,setByExercise:{},extraSets:{},warmups:{},skippedSets:{},skippedExercises:{},supersetMode:{},shortened:Boolean(shortened),startedAt:new Date().toISOString()};
  if (readinessEntry) { activeWorkout.readinessEntryId = readinessEntry.id; activeWorkout.readinessScore = readinessEntry.data.score; activeWorkout.readinessKey = readinessEntry.data.key; activeWorkout.sessionOverride = JSON.parse(JSON.stringify(sessionForToday)); }
  else if (readinessSkip) { delete activeWorkout.readinessEntryId; delete activeWorkout.readinessScore; delete activeWorkout.readinessKey; delete activeWorkout.sessionOverride; }
  activeWorkout.setByExercise = activeWorkout.setByExercise || {}; activeWorkout.editingSetByExercise = activeWorkout.editingSetByExercise || {}; activeWorkout.extraSets = activeWorkout.extraSets || {}; activeWorkout.warmups = activeWorkout.warmups || {}; activeWorkout.skippedSets = activeWorkout.skippedSets || {}; activeWorkout.skippedExercises = activeWorkout.skippedExercises || {}; activeWorkout.supersetMode = activeWorkout.supersetMode || {};
  if (shortened) activeWorkout.shortened = true; restoreRestTimerSnapshot(activeWorkout.restTimer); saveActiveWorkoutState(); portalRole = 'client'; show('active-workout'); renderActiveWorkout(); return activeWorkout;
}
function activeAssignmentAndSession() {
  if (!activeWorkout) activeWorkout = loadActiveWorkoutState(); if (!activeWorkout) return {};
  const assignment = loadAssignedWorkouts().find((item) => item.id === activeWorkout.assignmentId), profile = loadProfiles().find((item) => item.id === activeWorkout.profileId), session = activeWorkout.sessionOverride || clientAssignedSession(assignment,profile || {}); return {assignment,profile,session};
}
function persistActiveSession(session) {
  if (!activeWorkout || !session) return false;
  activeWorkout.sessionOverride = JSON.parse(JSON.stringify(session));
  saveActiveWorkoutState();
  return true;
}
function plannedSetsForActive(exercise,block) { const rx = exercise.rx || block && block.rx || {}; return Math.max(1,Math.min(12,(parseInt(rx.sets,10) || 1) + Number(activeWorkout.extraSets[exercise.name] || 0))); }
function parseRestSeconds(value) { const text = String(value || '60'); const values = (text.match(/\d+/g) || ['60']).map(Number); const base = Math.max.apply(null,values); return /min/i.test(text) ? base * 60 : base; }
function startActiveRest(exercise,block) { const rx = exercise.rx || block && block.rx || {}; setRestTimer(parseRestSeconds(rx.rest)); toggleRestTimer(); }
function restartCurrentActiveRest() { const data = activeAssignmentAndSession(), unit = activeWorkoutUnits(data.session,activeWorkout.shortened)[activeWorkout.unitIndex]; if (!unit) return; const exercise = unit.items[activeWorkout.pairIndex] || unit.items[0]; startActiveRest(exercise,unit.block); }
function activeSetField(label,input,className) { const wrap = el('div',className || ''); wrap.append(el('label','',label),input); return wrap; }
function progressEntryBelongsToClient(entry,profile) { return Boolean(entry && profile && (entry.profileId === profile.id || (!entry.profileId && clientMatches(entry.client,profile.name)))); }
function activeWorkoutHistoryHtml(profile,exercise,currentSessionId) {
  const entries = loadProgress(), exerciseSets = entries.filter((entry) => entry.type === 'set' && progressEntryBelongsToClient(entry,profile) && entry.label === exercise.name && entry.sessionId !== currentSessionId).slice(0,8), workouts = entries.filter((entry) => entry.type === 'workout' && progressEntryBelongsToClient(entry,profile) && entry.sessionId !== currentSessionId).slice(0,3);
  const exerciseRows = exerciseSets.map((entry) => '<div class="active-history-row"><time>' + new Date(entry.date).toLocaleDateString() + '</time><b>' + escapeHtml(entry.value || 'Completed set') + '</b><span>' + escapeHtml(entry.data && entry.data.rpe != null ? 'RPE ' + entry.data.rpe : entry.note || '') + '</span></div>').join('');
  const workoutRows = workouts.map((entry) => '<div class="active-history-row"><time>' + new Date(entry.date).toLocaleDateString() + '</time><b>' + escapeHtml(entry.label || 'Workout') + '</b><span>' + escapeHtml(entry.value || '') + '</span></div>').join('');
  return '<details class="active-history"><summary>My history · ' + exerciseSets.length + ' prior ' + escapeHtml(exercise.name) + ' sets</summary><div class="active-history-body"><div class="result-label">Previous ' + escapeHtml(exercise.name) + ' results</div>' + (exerciseRows || '<div class="active-history-empty">No earlier results for this exercise yet. Today will establish your baseline.</div>') + '<div class="result-label" style="margin-top:13px">Recent completed workouts</div>' + (workoutRows || '<div class="active-history-empty">No completed workout reviews yet.</div>') + '<div class="tool-actions" style="margin-top:12px"><button class="small-btn" onclick="openClientHistoryFromWorkout()">Open full Progress history</button></div></div></details>';
}
function openClientHistoryFromWorkout() { saveActiveWorkoutState(); openClientTab('progress'); showToast('Workout progress preserved'); }
function activeSkipKey(unitIndex,exerciseName,setNumber) { return unitIndex + "::" + exerciseName + "::" + setNumber; }
function activeSetIsDone(session,unitIndex,exercise,setNumber) {
  return getSessionSets(session.sessionId,exercise.name).some((entry) => Number(entry.data && entry.data.setNumber) === Number(setNumber)) || Boolean(activeWorkout.skippedSets[activeSkipKey(unitIndex,exercise.name,setNumber)]);
}
function activeExerciseIsDone(session,unitIndex,exercise,block) {
  if (activeWorkout.skippedExercises[unitIndex + "::" + exercise.name]) return true;
  for (let number = 1; number <= plannedSetsForActive(exercise,block); number += 1) if (!activeSetIsDone(session,unitIndex,exercise,number)) return false;
  return true;
}
function activeUnitIsDone(session,unit,unitIndex) { return unit.items.every((exercise) => activeExerciseIsDone(session,unitIndex,exercise,unit.block)); }
function nextActiveSetNumber(session,unitIndex,exercise,block) {
  const editing = Number(activeWorkout.editingSetByExercise[exercise.name] || 0);
  if (editing >= 1 && editing <= plannedSetsForActive(exercise,block)) return editing;
  const selected = Number(activeWorkout.setByExercise[exercise.name] || 0);
  if (selected && !activeSetIsDone(session,unitIndex,exercise,selected)) return selected;
  for (let number = 1; number <= plannedSetsForActive(exercise,block); number += 1) if (!activeSetIsDone(session,unitIndex,exercise,number)) return number;
  return plannedSetsForActive(exercise,block);
}
function activeQueueHtml(units,session) {
  const phases = [];
  units.forEach((unit,index) => {
    const key = String(unit.block.key || unit.block.title || 'phase'), last = phases[phases.length - 1];
    if (last && last.key === key) last.units.push({unit,index});
    else phases.push({key,title:unit.block.title || 'Training block',units:[{unit,index}]});
  });
  const completed = units.filter((unit,index) => activeUnitIsDone(session,unit,index)).length;
  return '<section class="active-workout-queue active-workout-flow"><div class="active-flow-head"><div><h2>Today’s workout flow</h2><p>Follow the phases from top to bottom. Your current exercise is highlighted, every result saves immediately, and future work unlocks as you log or intentionally skip each set.</p></div><span class="active-flow-count">' + completed + ' of ' + units.length + ' complete</span></div><div class="active-flow-phases">' + phases.map((phase,phaseIndex) => {
    const phaseComplete = phase.units.every(({unit,index}) => activeUnitIsDone(session,unit,index)), phaseCurrent = phase.units.some(({index}) => index === activeWorkout.unitIndex);
    return '<section class="active-flow-phase ' + (phaseCurrent ? 'current ' : '') + (phaseComplete ? 'complete' : '') + '"><span class="active-flow-phase-index">' + (phaseComplete ? '✓' : phaseIndex + 1) + '</span><div class="active-flow-phase-body"><div class="active-flow-phase-title"><b>' + escapeHtml(phase.title) + '</b><span>' + phase.units.length + ' exercise' + (phase.units.length === 1 ? '' : 's') + '</span></div><div class="active-flow-units">' + phase.units.map(({unit,index}) => {
      const complete = activeUnitIsDone(session,unit,index), skipped = unit.items.every((exercise) => activeWorkout.skippedExercises[index + "::" + exercise.name]), current = index === activeWorkout.unitIndex, stateLabel = complete ? skipped ? "Skipped" : "Done" : current ? "Current" : index < activeWorkout.unitIndex ? "Passed" : "Upcoming", canOpen = index <= activeWorkout.unitIndex || complete;
      const names = unit.items.map((exercise,itemIndex) => (unit.type === "superset" ? "A" + (itemIndex + 1) + " " : "") + exercise.name).join(" + ");
      return '<button class="active-flow-unit ' + (current ? 'current ' : '') + (complete ? 'complete ' : '') + (skipped ? 'skipped' : '') + '" ' + (canOpen ? 'onclick="selectActiveUnit(' + index + ')"' : 'disabled') + '><span class="active-flow-unit-number">' + (complete && !skipped ? '✓' : index + 1) + '</span><span class="active-flow-unit-copy"><b>' + escapeHtml(names) + '</b><span>' + escapeHtml(unit.type === 'superset' ? 'Optional paired block' : 'Straight sets') + '</span></span><span class="active-flow-unit-state">' + stateLabel + '</span></button>';
    }).join('') + '</div></div></section>';
  }).join('') + '</div></section>';
}
function selectActiveUnit(index) {
  const data = activeAssignmentAndSession(), units = activeWorkoutUnits(data.session,activeWorkout.shortened), target = Number(index);
  if (!Number.isInteger(target) || target < 0 || target >= units.length) return;
  if (target > activeWorkout.unitIndex && !activeUnitIsDone(data.session,units[activeWorkout.unitIndex],activeWorkout.unitIndex)) { showToast("Log or skip the current work before moving ahead"); return; }
  activeWorkout.unitIndex = target; activeWorkout.pairIndex = 0; saveActiveWorkoutState(); renderActiveWorkout();
}
function setActiveSupersetMode(enabled) { activeWorkout.supersetMode[activeWorkout.unitIndex] = Boolean(enabled); activeWorkout.pairIndex = 0; saveActiveWorkoutState(); renderActiveWorkout(); showToast(enabled ? "Optional superset turned on" : "Using straight sets"); }
function renderActiveWorkout() {
  const out = byId('activeWorkoutContent'), data = activeAssignmentAndSession(); if (!out || !data.session || !data.profile) { if (out) out.innerHTML = '<div class="empty-state-polished"><b>Workout unavailable</b><p>Return to Workout and reopen the current assignment.</p></div>'; return; }
  const units = activeWorkoutUnits(data.session,activeWorkout.shortened); if (!units.length) return; activeWorkout.unitIndex = Math.max(0,Math.min(activeWorkout.unitIndex,units.length - 1)); const unit = units[activeWorkout.unitIndex]; activeWorkout.pairIndex = Math.max(0,Math.min(activeWorkout.pairIndex,unit.items.length - 1)); const exercise = unit.items[activeWorkout.pairIndex], rx = exercise.rx || unit.block.rx || {}, bodyweightOnly = exercise.zone === 'bodyweight' && !/^Weighted\b/i.test(exercise.name), cardioOnly = exercise.zone === 'cardio' || exercise.region === 'cardio';
  const sets = getSessionSets(data.session.sessionId,exercise.name), planned = plannedSetsForActive(exercise,unit.block), nextUnset = nextActiveSetNumber(data.session,activeWorkout.unitIndex,exercise,unit.block), saved = sets.find((entry) => Number(entry.data && entry.data.setNumber) === nextUnset), previous = latestSetFor(data.profile.name,exercise.name), recommendation = !bodyweightOnly && !cardioOnly ? recommendedLoadFor(data.profile.name,exercise,rx) : null, history = activeWorkoutHistoryHtml(data.profile,exercise,data.session.sessionId), unitDone = activeUnitIsDone(data.session,unit,activeWorkout.unitIndex);
  const setSelector = '<div class="tool-actions" style="padding:0 20px 10px">' + Array.from({length:planned},(_,index) => { const number = index + 1, isSaved = sets.some((entry) => Number(entry.data && entry.data.setNumber) === number), isSkipped = Boolean(activeWorkout.skippedSets[activeSkipKey(activeWorkout.unitIndex,exercise.name,number)]); return '<button class="mini-btn ' + (number === nextUnset ? 'primary' : '') + '" onclick="selectActiveSet(\'' + escapeHtml(exercise.name) + '\',' + number + ')">' + (isSaved ? '✓ ' : isSkipped ? '↷ ' : '') + 'Set ' + number + '</button>'; }).join('') + '</div>';
  const completedUnits = units.filter((candidate,index) => activeUnitIsDone(data.session,candidate,index)).length;
  byId('activeWorkoutLabel').textContent = (data.session.goalLabel || 'Workout') + (activeWorkout.shortened ? ' · shortened' : ''); byId('activeWorkoutStep').textContent = unit.block.title + ' · ' + (activeWorkout.unitIndex + 1) + ' of ' + units.length; byId('activeWorkoutProgress').style.width = Math.round(completedUnits / Math.max(1,units.length) * 100) + '%';
  const supersetOn = unit.type === 'superset' && Boolean(activeWorkout.supersetMode[activeWorkout.unitIndex]);
  const pair = unit.type === 'superset' ? '<div class="active-superset-choice"><b>Superset available · A1 + A2</b><p>Optional. Turn it on to alternate the two movements before resting. Leave it off to finish straight sets of each movement.</p><div class="tool-actions"><button class="small-btn ' + (!supersetOn ? 'primary' : '') + '" onclick="setActiveSupersetMode(false)">Straight sets</button><button class="small-btn ' + (supersetOn ? 'primary' : '') + '" onclick="setActiveSupersetMode(true)">Use superset</button></div></div><div class="active-block-pair"><div class="client-section-label">' + (supersetOn ? 'Superset active · alternate A1 / A2' : 'Paired exercises · straight sets selected') + '</div>' + unit.items.map((item,index) => '<button class="active-pair-tab ' + (index === activeWorkout.pairIndex ? 'on' : '') + '" onclick="setActivePair(' + index + ')">A' + (index + 1) + ' · ' + escapeHtml(item.name) + '</button>').join('') + '</div>' : '';
  const calibrationDomains = Array.isArray(exercise.baselineDomains) ? exercise.baselineDomains : [], calibrationCapture = calibrationDomains.length ? '<div class="baseline-capture"><div class="baseline-capture-head"><b>Calibration anchor</b><span>' + escapeHtml(calibrationDomains.map((domain) => BASELINE_DOMAIN_LABELS[domain] || domain).join(' · ')) + '</span></div><p>' + escapeHtml(exercise.baselineProtocol || 'Use a comfortable, pain-free effort. This is not a max test.') + '</p><div class="baseline-capture-grid"><label>Confidence<select id="activeBaselineConfidence"><option value="1">1 · Not confident</option><option value="2">2 · Unsure</option><option value="3" selected>3 · Okay</option><option value="4">4 · Confident</option><option value="5">5 · Very confident</option></select></label><label>Pain response<select id="activeBaselinePain"><option value="0" selected>Green · No pain</option><option value="1">Yellow · Mild awareness, movement normal</option><option value="2">Orange · Changed range or technique</option><option value="3">Red · Stopped the set</option></select></label></div></div>' : '';
  const load = document.createElement('input'); load.id = 'activeSetLoad'; load.type = 'number'; load.step = '0.5'; load.inputMode = 'decimal'; load.placeholder = recommendation && recommendation.load ? recommendation.load : 'Weight';
  const reps = document.createElement('input'); reps.id = 'activeSetReps'; reps.type = 'number'; reps.inputMode = 'numeric'; reps.placeholder = cardioOnly ? 'Minutes' : plannedRepTarget(rx) || 'Reps';
  const effort = effortSelect(exercise.name + ' effort',saved && saved.data && saved.data.rpe); effort.id = 'activeSetEffort'; effort.classList.add('active-effort');
  if (saved && saved.data) { if (saved.data.load != null) load.value = saved.data.load; if (saved.data.reps != null) reps.value = saved.data.reps; } else { if (recommendation && recommendation.load) load.value = recommendation.load; const target = plannedRepTarget(rx); if (target) reps.value = target; }
  const row = el('div','active-set-row' + (saved ? ' saved' : '')); row.append(el('div','active-set-number','Set ' + nextUnset)); if (!bodyweightOnly && !cardioOnly) row.append(activeSetField('Weight',load)); row.append(activeSetField(cardioOnly ? 'Minutes / distance' : bodyweightOnly ? 'Reps / seconds' : 'Reps',reps),activeSetField('Effort',effort,'active-effort')); const save = el('button','small-btn primary',saved ? 'Update result' : 'Log & continue'); save.onclick = () => saveActiveSet(exercise,nextUnset,saved && saved.id,bodyweightOnly,cardioOnly,recommendation && recommendation.unit || previous && previous.unit || 'lb'); const skip = el('button','small-btn',saved ? 'Saved' : 'Skip set'); skip.disabled = Boolean(saved); skip.onclick = () => skipCurrentActiveSet(); row.append(save,skip);
  const card = '<article class="active-exercise-card"><header class="active-exercise-head"><div class="client-section-label">' + escapeHtml(unit.block.title) + '</div><h1>' + escapeHtml(exercise.name) + '</h1><p>' + escapeHtml(ZONE_LABELS[exercise.zone] || exercise.zone) + ' · ' + escapeHtml(unit.type === 'superset' ? 'Optional paired block' : 'Straight sets') + '</p></header><div class="active-demo"><div><div style="font-size:34px">▶</div><b>Demonstration video</b><span>' + (exercise.video ? 'Tap to play' : 'Coach video not attached · use the instructions below') + '</span></div></div>' + pair + calibrationCapture + '<div class="active-cue"><b>Coaching cue</b><p>' + escapeHtml(exercise.cue || 'Use controlled technique and stop if pain changes the movement.') + '</p></div><div class="active-prescription"><div><span>Sets</span><b>' + planned + '</b></div><div><span>Reps</span><b>' + escapeHtml(rx.reps || 'Coach set') + '</b></div><div><span>Tempo</span><b>' + escapeHtml(rx.tempo || 'Controlled') + '</b></div><div><span>RPE / RIR</span><b>' + escapeHtml(rx.rpe || 'Coach set') + '</b></div><div><span>Rest</span><b>' + escapeHtml(rx.rest || 'As needed') + '</b></div></div><div class="active-previous">Previous performance · ' + escapeHtml(previous ? (previous.load == null ? previous.unit === 'bodyweight' ? 'Bodyweight' : 'Completed' : previous.load + ' ' + previous.unit) + (previous.reps == null ? '' : ' × ' + previous.reps) : 'No previous result') + '</div>' + history + setSelector + '<div class="active-set-list" id="activeSetMount"></div><div class="active-rest-now"><div><b>Rest for ' + escapeHtml(rx.rest || 'as needed') + '</b><span>The timer starts after a newly logged set. Start or restart it manually anytime.</span></div><button class="small-btn primary" onclick="restartCurrentActiveRest()">Start rest timer</button></div><div class="active-tools"><button class="small-btn" onclick="addActiveWarmupSet()">+ Warm-up set</button><button class="small-btn" onclick="addActiveWorkingSet()">+ Working set</button><button class="small-btn" onclick="replaceActiveExercise()">Replace exercise</button><button class="small-btn" onclick="recordActiveNote()">Record note</button><button class="small-btn danger" onclick="openClientPainReport()">Report pain</button><button class="small-btn" onclick="skipCurrentActiveExercise()">Skip exercise</button></div>' + (!unitDone ? '<div class="active-progress-lock">The next exercise stays locked until every current set is logged or intentionally skipped. Skips are saved for your trainer instead of disappearing.</div>' : '') + '<div class="tool-actions" style="padding:0 20px 20px;justify-content:space-between"><button class="small-btn" onclick="moveActiveUnit(-1)" ' + (activeWorkout.unitIndex === 0 ? 'disabled' : '') + '>Previous</button><button class="small-btn primary" onclick="moveActiveUnit(1)" ' + (!unitDone ? 'disabled' : '') + '>' + (activeWorkout.unitIndex === units.length - 1 ? 'Finish workout' : 'Continue') + '</button></div></article>';
  const readinessToday = data.session.readinessToday, activeGoal = goalContractFor(data.profile);
  const readinessBanner = readinessToday ? '<section class="active-readiness-banner"><div class="active-readiness-score">' + escapeHtml(readinessToday.score) + '</div><div class="active-readiness-copy"><b>' + escapeHtml(readinessToday.title || 'Today’s readiness adjustment') + '</b><p>' + escapeHtml((readinessToday.changes || []).join(' · ') || 'The assigned workout is being used as written.') + '</p><small>Today only · the coach-approved program is unchanged</small></div><span>Pre-workout check</span></section>' : '';
  const goalReminder = activeGoal.deeperReason ? '<section class="active-goal-reminder"><span>Why you came today</span><p>' + escapeHtml(activeGoal.deeperReason) + '</p></section>' : '';
  const calibrationBanner = data.session.calibration ? '<section class="baseline-session-banner"><div><b>' + (data.session.calibration.supportSession ? 'First-week foundation workout' : 'Useful workout + embedded calibration') + '</b><p>' + (data.session.calibration.supportSession ? 'No extra testing is required today. Practice the plan at conservative effort and report anything that changes comfort or technique.' : 'Only the clearly marked anchors collect starting evidence. Train normally, avoid max effort, and report any pain that changes the movement.') + '</p></div><span>' + (data.session.calibration.supportSession ? 'Day ' + data.session.calibration.weeklySession + ' of ' + data.session.calibration.weeklySessions : 'Evidence session ' + data.session.calibration.sessionNumber + ' of ' + data.session.calibration.totalSessions) + '</span></section>' : '';
  out.innerHTML = calibrationBanner + goalReminder + readinessBanner + '<div class="active-workout-shell">' + activeQueueHtml(units,data.session) + '<div class="active-current-stage"><div class="active-current-stage-label"><b>Current exercise</b><span>' + escapeHtml(unit.block.title) + ' · ' + (activeWorkout.unitIndex + 1) + ' of ' + units.length + '</span></div>' + card + '</div></div><div class="active-rest-dock"><div><span>Rest timer · ' + escapeHtml(rx.rest || 'as needed') + '</span><b id="activeRestDisplay">' + formatClock(restTimer.remaining) + '</b></div><div class="tool-actions"><button class="small-btn" id="activeRestToggle" onclick="toggleRestTimer()">' + (restTimer.running ? 'Pause' : 'Start') + '</button><button class="small-btn" onclick="resetRestTimer()">Reset</button></div></div>';
  byId('activeSetMount').appendChild(row);
  if (calibrationDomains.length && saved && saved.data) {
    if (byId('activeBaselineConfidence') && saved.data.baselineConfidence != null) byId('activeBaselineConfidence').value = String(saved.data.baselineConfidence);
    if (byId('activeBaselinePain') && saved.data.baselinePain != null) byId('activeBaselinePain').value = String(saved.data.baselinePain);
  }
  const demo = out.querySelector('.active-demo');
  if (demo && exercise.video && /^https:\/\//i.test(exercise.video)) {
    demo.setAttribute('role','button'); demo.setAttribute('tabindex','0'); demo.setAttribute('aria-label','Open demonstration video for ' + exercise.name);
    demo.onclick = () => window.open(exercise.video,'_blank','noopener,noreferrer');
    demo.onkeydown = (event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); demo.click(); } };
  }
  if (exercise.instructions) {
    const cue = out.querySelector('.active-cue'), detail = el('details','active-cue');
    detail.innerHTML = '<summary><b>Step-by-step instructions</b></summary><p>' + escapeHtml(exercise.instructions) + '</p>';
    if (cue) cue.insertAdjacentElement('afterend',detail);
  }
  saveActiveWorkoutState();
}
function setActivePair(index) { activeWorkout.pairIndex = Number(index) || 0; saveActiveWorkoutState(); renderActiveWorkout(); }
function selectActiveSet(exerciseName,setNumber) { activeWorkout.editingSetByExercise[exerciseName] = Number(setNumber) || 1; saveActiveWorkoutState(); renderActiveWorkout(); }
function saveActiveSet(exercise,setNumber,existingId,bodyweightOnly,cardioOnly,unitValue) {
  const load = byId('activeSetLoad') || {value:''}, reps = byId('activeSetReps'), effort = byId('activeSetEffort'), unit = {value:cardioOnly ? 'session' : bodyweightOnly ? 'bodyweight' : unitValue || 'lb'}, data = activeAssignmentAndSession(); const saved = logExerciseSet(data.session,exercise,load,reps,unit,effort,setNumber,existingId); if (!saved) return;
  delete activeWorkout.editingSetByExercise[exercise.name]; const currentUnit = activeWorkoutUnits(data.session,activeWorkout.shortened)[activeWorkout.unitIndex]; if (!existingId) { startActiveRest(exercise,currentUnit.block); advanceActiveAfterSet(data.session,currentUnit,exercise,setNumber); } saveActiveWorkoutState(); renderActiveWorkout();
}
function advanceActiveAfterSet(session,unit,exercise,setNumber) {
  const unitIndex = activeWorkout.unitIndex, supersetOn = unit.type === 'superset' && Boolean(activeWorkout.supersetMode[unitIndex]), planned = plannedSetsForActive(exercise,unit.block);
  activeWorkout.setByExercise[exercise.name] = Math.min(planned,setNumber + 1);
  if (supersetOn) {
    if (activeWorkout.pairIndex < unit.items.length - 1) { activeWorkout.pairIndex += 1; return; }
    activeWorkout.pairIndex = 0;
  } else if (setNumber >= planned || activeExerciseIsDone(session,unitIndex,exercise,unit.block)) {
    if (activeWorkout.pairIndex < unit.items.length - 1) { activeWorkout.pairIndex += 1; return; }
    activeWorkout.pairIndex = 0;
  }
  if (activeUnitIsDone(session,unit,unitIndex) && unitIndex < activeWorkoutUnits(session,activeWorkout.shortened).length - 1) { activeWorkout.unitIndex += 1; activeWorkout.pairIndex = 0; }
}
function skipCurrentActiveSet() {
  const data = activeAssignmentAndSession(), unit = activeWorkoutUnits(data.session,activeWorkout.shortened)[activeWorkout.unitIndex], exercise = unit.items[activeWorkout.pairIndex], setNumber = nextActiveSetNumber(data.session,activeWorkout.unitIndex,exercise,unit.block);
  if (!window.confirm('Skip set ' + setNumber + ' of ' + exercise.name + '? The skip will be visible to your trainer.')) return;
  activeWorkout.skippedSets[activeSkipKey(activeWorkout.unitIndex,exercise.name,setNumber)] = {at:new Date().toISOString()};
  delete activeWorkout.editingSetByExercise[exercise.name];
  addProgressEntry({type:'skipped_set',client:data.profile.name,profileId:data.profile.id,sessionId:data.session.sessionId,label:exercise.name,value:'Set ' + setNumber + ' skipped',data:{setNumber,coachNotice:true}});
  advanceActiveAfterSet(data.session,unit,exercise,setNumber); saveActiveWorkoutState(); renderActiveWorkout(); showToast('Skipped set recorded for your trainer');
}
function skipCurrentActiveExercise() {
  const data = activeAssignmentAndSession(), units = activeWorkoutUnits(data.session,activeWorkout.shortened), unit = units[activeWorkout.unitIndex], exercise = unit.items[activeWorkout.pairIndex];
  if (!window.confirm('Skip the remaining sets of ' + exercise.name + '? Your trainer will see this in the workout record.')) return;
  activeWorkout.skippedExercises[activeWorkout.unitIndex + '::' + exercise.name] = {at:new Date().toISOString()};
  addProgressEntry({type:'skipped_exercise',client:data.profile.name,profileId:data.profile.id,sessionId:data.session.sessionId,label:exercise.name,value:'Exercise skipped',data:{coachNotice:true}});
  if (activeWorkout.pairIndex < unit.items.length - 1) activeWorkout.pairIndex += 1;
  else if (activeUnitIsDone(data.session,unit,activeWorkout.unitIndex) && activeWorkout.unitIndex < units.length - 1) { activeWorkout.unitIndex += 1; activeWorkout.pairIndex = 0; }
  saveActiveWorkoutState(); renderActiveWorkout(); showToast('Exercise skip recorded for your trainer');
}
function addActiveWorkingSet() { const data = activeAssignmentAndSession(), unit = activeWorkoutUnits(data.session,activeWorkout.shortened)[activeWorkout.unitIndex], exercise = unit.items[activeWorkout.pairIndex]; activeWorkout.extraSets[exercise.name] = Number(activeWorkout.extraSets[exercise.name] || 0) + 1; saveActiveWorkoutState(); renderActiveWorkout(); showToast('Working set added'); }
function addActiveWarmupSet() { const data = activeAssignmentAndSession(), unit = activeWorkoutUnits(data.session,activeWorkout.shortened)[activeWorkout.unitIndex], exercise = unit.items[activeWorkout.pairIndex]; activeWorkout.warmups[exercise.name] = Number(activeWorkout.warmups[exercise.name] || 0) + 1; addProgressEntry({type:'warmup_set',client:data.profile.name,profileId:data.profile.id,sessionId:data.session.sessionId,label:exercise.name,value:'Warm-up set added',data:{warmup:true}}); saveActiveWorkoutState(); showToast('Warm-up set added before the working sets'); }
function replaceActiveExercise() { const data = activeAssignmentAndSession(), unit = activeWorkoutUnits(data.session,activeWorkout.shortened)[activeWorkout.unitIndex], exercise = unit.items[activeWorkout.pairIndex], ei = unit.block.items.findIndex((item) => item.name === exercise.name); openExerciseSwap(data.session,unit.block,ei,exercise); }
function recordActiveNote() { const data = activeAssignmentAndSession(), unit = activeWorkoutUnits(data.session,activeWorkout.shortened)[activeWorkout.unitIndex], exercise = unit.items[activeWorkout.pairIndex], note = window.prompt('Add a short note for this exercise:'); if (!note) return; addProgressEntry({type:'note',client:data.profile.name,profileId:data.profile.id,sessionId:data.session.sessionId,label:exercise.name,value:'Workout note',note}); showToast('Exercise note saved'); }
function moveActiveUnit(direction) { const data = activeAssignmentAndSession(), units = activeWorkoutUnits(data.session,activeWorkout.shortened), current = units[activeWorkout.unitIndex]; if (direction > 0 && !activeUnitIsDone(data.session,current,activeWorkout.unitIndex)) { showToast('Log or skip the current sets before continuing'); return; } if (direction > 0 && activeWorkout.unitIndex >= units.length - 1) { finishActiveWorkout(); return; } activeWorkout.unitIndex = Math.max(0,Math.min(units.length - 1,activeWorkout.unitIndex + direction)); activeWorkout.pairIndex = 0; saveActiveWorkoutState(); renderActiveWorkout(); }
function leaveActiveWorkout() { saveActiveWorkoutState(); openClientTab('program'); showToast('Workout progress preserved'); }
function finishActiveWorkout() { const data = activeAssignmentAndSession(); if (!data.assignment || !data.session) return; state.session = {type:"solo",data:JSON.parse(JSON.stringify(data.session)),edits:{}}; openWorkoutReview(); }
function approveCurrentWorkoutDraft() {
  if (!requireTrainerMutation("approve generated workouts") || !state.session) return false;
  const intakeProfile = loadProfiles().find((item) => workoutPlans(state.session).some((plan) => plan.session && plan.session.spec && (plan.session.spec.profileId === item.id || clientMatches(plan.session.spec.client,item.name))));
  const intakeStatus = intakeProfile ? intakeCompletion(intakeProfile) : null;
  if (intakeStatus && intakeStatus.approvalBlocked) { showToast("Coach approval blocked — finish " + intakeProfile.name + "’s onboarding and document the trainer baseline decision first"); return false; }
  const plans = workoutPlans(state.session), failures = [];
  const baselineBlocked = plans.filter((plan) => { const spec = plan.session && plan.session.spec || {}, profile = loadProfiles().find((item) => item.id === spec.profileId) || loadProfiles().find((item) => clientMatches(item.name,spec.client)); return profile && !plan.session.calibration && !spec.baselineMode && !baselineCanTailor(profile); });
  if (baselineBlocked.length) { showToast("Coach approval blocked — establish the client baseline or assign a marked calibration workout first"); return false; }
  plans.forEach((plan) => { plan.session.audit = auditWorkout(plan.session); if (!plan.session.audit.pass) failures.push(plan.label + " (" + plan.session.audit.score + "/100" + (plan.session.audit.safety.length ? ": " + plan.session.audit.safety.join("; ") : "") + ")"); });
  if (failures.length) { showToast("Coach approval blocked — audit must score 80+ with no safety conflicts: " + failures.join(" · ")); renderOutput(); return false; }
  const approvedAt = new Date().toISOString(), profiles = loadProfiles();
  plans.forEach((plan) => {
    plan.session.approval = { ...(plan.session.approval || {}), status:"approved", required:true, approvedAt, approvedBy:"trainer", auditScore:plan.session.audit.score };
    const spec = plan.session.spec, profile = profiles.find((item) => item.id === spec.profileId) || profiles.find((item) => clientMatches(item.name,spec.client));
    const primary = (plan.session.blocks || []).find((block) => block.key === "strength" && block.items.some((exercise) => isPrimaryAnchor(exercise)));
    if (profile && primary) {
      const anchor = primary.items.find((exercise) => isPrimaryAnchor(exercise)); profile.phaseCompoundAnchors = { ...(profile.phaseCompoundAnchors || {}), [phaseSessionKey(spec)]:anchor.name }; profile.updatedAt = approvedAt;
      spec.phaseCompoundAnchors = { ...profile.phaseCompoundAnchors }; spec._lockedCompoundAnchor = anchor.name;
    }
  });
  writeProfiles(profiles);
  profiles.forEach((profile) => [state.solo,state.p1,state.p2].forEach((target) => { if (target && target.profileId === profile.id) target.phaseCompoundAnchors = { ...(profile.phaseCompoundAnchors || {}) }; }));
  renderOutput(); showToast("Coach approved " + (plans.length > 1 ? "both workout drafts" : "this workout draft") + " · quality audit passed"); return true;
}
function assignCurrentWorkout() {
  if (!requireTrainerMutation("assign workouts") || !state.session) return null;
  const unapproved = workoutPlans(state.session).filter((plan) => !plan.session.approval || plan.session.approval.status !== "approved");
  if (unapproved.length) { showToast("Coach approval is required before this workout can be assigned"); return null; }
  const assignments = loadAssignedWorkouts(), saved = [], blocked = [];
  workoutPlans(state.session).forEach((plan) => {
    const spec = plan.session.spec || {}, profile = loadProfiles().find((item) => item.id === spec.profileId) || loadProfiles().find((item) => clientMatches(item.name,spec.client));
    if (!profile) return;
    if (!plan.session.calibration && !spec.baselineMode && !baselineCanTailor(profile)) { blocked.push(profile.name + ": personalization baseline is not coach-verified"); return; }
    if (unresolvedClientSafetyHold(profile)) { blocked.push(profile.name + ": recent pain or discomfort still needs trainer review"); return; }
    const conflicts = sessionSafetyConflictsForProfile(plan.session,profile);
    if (conflicts.length) { blocked.push(profile.name + ": " + conflicts.join("; ")); return; }
    const session = { type:"solo", data:JSON.parse(JSON.stringify(plan.session)), edits:JSON.parse(JSON.stringify(state.session.edits || {})) }, assignment = { id:"assignment-" + Date.now() + "-" + Math.random().toString(16).slice(2), profileId:profile.id, client:profile.name, assignedAt:new Date().toISOString(), status:"assigned", session };
    const existing = assignments.findIndex((item) => item.profileId === profile.id && !item.programId && assignmentStatus(item) === "assigned");
    if (existing >= 0) assignments[existing] = assignment; else assignments.unshift(assignment);
    saved.push(assignment);
  });
  if (blocked.length) { showToast("Assignment blocked by current client safety filters: " + blocked.join(" · ")); return null; }
  if (!saved.length) { showToast("Choose a saved client profile before assigning this workout"); return null; }
  if (!writeAssignedWorkouts(assignments)) return null; showToast(saved.length === 1 ? "Workout assigned to " + saved[0].client : "Workouts assigned to both clients"); return saved;
}
function syncToolsRoleCopy() {
  const client = portalRole === "client";
  byId("toolsQuestion").textContent = client ? "What helps me through the workout?" : "What do I need on the gym floor?";
  byId("toolsTitle").textContent = client ? "Workout Tools" : "Trainer Tools";
  byId("toolsCopy").textContent = client ? "Use the timers, plate math, warm-up sets, and effort guide during your workout." : "Fast floor-side math, warm-up planning, and fullscreen timers for coaching sessions.";
}
function openTools() { syncToolsRoleCopy(); show("tools"); calculateOneRm(); calculatePlates(); buildWarmupRamp(); }
function openPrograms(preserveTemplate) {
  if (!trainerIsUnlocked()) { requestTrainerAccess("programs"); return; }
  if (!preserveTemplate) {
    loadedProgramTemplate = null;
    const context = byId("programTemplateContext");
    if (context) { context.style.display = "none"; context.innerHTML = ""; }
  }
  portalRole = "trainer"; show("programs"); refreshProfileSelects(); renderProgramSafetyChoices(); renderProgramCardioChoices(); syncTrainerOnlyControls();
}
function openReadiness() {
  show("readiness");
  const isClient = portalRole === "client", unlocked = portalRole === "trainer" && trainerIsUnlocked(), memory = byId("progressMemoryCard"), locked = byId("progressLockedCard"), tune = byId("readinessTuneCard"), clientReturn = byId("clientReadinessReturnCard"), startGate = byId("readinessStartGate");
  if (memory) memory.style.display = unlocked ? "block" : "none";
  if (locked) locked.style.display = unlocked ? "none" : "block";
  if (tune) tune.style.display = unlocked ? "block" : "none";
  if (clientReturn) clientReturn.style.display = isClient ? "block" : "none";
  if (startGate) startGate.style.display = isClient && pendingReadinessStart ? "block" : "none";
  if (isClient && activeClientProfile()) selectReadinessProfile(activeClientProfile().id);
  if (unlocked) {
    const historyClient = byId("historyClientFilter");
    if (historyClient) historyClient.value = "";
    refreshHistoryFilters();
    renderProgressHistory();
  }
}
function openCoachDestination(destination) {
  if (!trainerIsUnlocked()) { requestTrainerAccess(destination === 'clients' || destination === 'reports' ? 'trainer' : destination === 'programming' ? 'programs' : 'trainer-menu'); return; }
  portalRole = 'trainer'; openCoachDestination.current = destination;
  if (destination === 'dashboard') { show('trainer-menu'); return; }
  if (destination === 'clients' || destination === 'reports') { show('trainer'); renderTrainerHub(); return; }
  if (destination === 'programming') { openPrograms(); return; }
  if (destination === 'assessments') { openReadiness(); return; }
  if (destination === 'business') { openAdvancedStudio('organization'); return; }
  renderCoachModule(destination); show('coach-module');
}
function coachCalendarWeek() {
  const today = new Date(), monday = new Date(today); monday.setHours(12,0,0,0); monday.setDate(today.getDate() - (today.getDay() === 0 ? 6 : today.getDay() - 1));
  return TRAINING_WEEKDAYS.map(([weekday,label]) => { const date = new Date(monday); date.setDate(monday.getDate() + weekday - 1); return {weekday,label,date,dateKey:date.toISOString().slice(0,10)}; });
}
function openCalendarClient(profileId,tab) {
  const profile = loadProfiles().find((item) => item.id === profileId); if (!profile) return;
  selectedTrainerClient = profile.name; selectedInBodyScanId = ""; trainerSummaryState = newTrainerSummaryState(); trainerSummaryState.tab = tab === "workout" ? "program" : "overview"; show("trainer"); renderTrainerHub(profile.name);
}
function attendanceCalendarHtml() {
  const profiles = loadProfiles(), assignments = loadAssignedWorkouts(), todayKey = new Date().toISOString().slice(0,10);
  const days = coachCalendarWeek().map((day) => {
    const clients = profiles.filter((profile) => inferredTrainingDays(profile,profile.availableDays || 3).includes(day.weekday)).sort((a,b) => a.name.localeCompare(b.name));
    const rows = clients.map((profile) => {
      const assignment = assignments.find((item) => item.profileId === profile.id && item.scheduledDate === day.dateKey) || assignmentForClient(profile.id), status = assignment ? assignmentStatusLabel(assignment) : "Profile scheduled · workout not assigned";
      return '<div class="attendance-client"><button type="button" onclick="openCalendarClient(\'' + escapeHtml(profile.id) + '\',\'profile\')">' + escapeHtml(profile.name) + '<span>' + escapeHtml(status) + '</span></button><button class="tiny-btn" type="button" onclick="openCalendarClient(\'' + escapeHtml(profile.id) + '\',\'workout\')">Workout</button></div>';
    }).join("");
    return '<section class="attendance-day' + (day.dateKey === todayKey ? ' today' : '') + '"><div class="attendance-day-head"><b>' + day.label + '</b><span>' + day.date.toLocaleDateString([],{month:"short",day:"numeric"}) + '</span></div>' + (rows || '<div class="attendance-empty">No clients scheduled.</div>') + '</section>';
  }).join("");
  return '<section class="attendance-calendar"><div class="attendance-head"><div><h3>Monday–Saturday client calendar</h3><p>Training days come from each client profile. Open a name for the full record or Workout for the assigned phase.</p></div><button class="small-btn" onclick="openCoachDestination(\'clients\')">Edit client days</button></div><div class="attendance-grid">' + days + '</div></section>';
}
function renderCoachModule(destination) {
  const title = byId('coachModuleTitle'), eyebrow = byId('coachModuleEyebrow'), copy = byId('coachModuleCopy'), out = byId('coachModuleContent'); if (!title || !out) return;
  const details = {
    calendar:['Calendar','Schedule coaching work without mixing it into client messages.'],messages:['Messages','Review direct questions separately from workout feedback, check-ins, and program decisions.'],library:['Exercise Library','Search the gym-approved movement bank and review substitution rules.'],access:['Trainer Access','Approve named trainer accounts and keep staff permissions separate from client registration.'],settings:['Settings','Manage workspace behavior, exports, account safety, and connected services.']
  }[destination] || ['Coach workspace','Open the coaching capability you need.']; title.textContent = details[0]; eyebrow.textContent = 'Coach workspace'; copy.textContent = details[1];
  if (destination === 'calendar') {
    const assignments = loadAssignedWorkouts().slice().sort((a,b) => String(b.assignedAt).localeCompare(String(a.assignedAt))), attention = trainerAttentionSnapshot();
    const followups = attention.assignmentReviews.map((item) => ({client:item.client,label:'Workout review ready'})).concat(attention.checkinReviews.map((item) => ({client:item.client,label:item.reviewType === 'recovery_24_48' ? '24–48h recovery pulse ready' : item.reviewType === 'starter_week_1' ? 'First-week review ready' : 'Weekly check-in ready'}))).concat(attention.recoveryOverdue.map((item) => ({client:item.profile.name,label:'Recovery pulse overdue'}))).concat(attention.receiptRequests.map((item) => ({client:item.profile.name,label:item.status.type === 'formal' ? 'Formal progress receipt requested' : 'Weekly progress receipt requested'}))).concat(attention.recognition.map((profile) => ({client:profile.name,label:'Positive recognition due'})));
    out.innerHTML = attendanceCalendarHtml() + '<section class="coach-module-card"><h3>Assigned sessions</h3><div class="advanced-list">' + (assignments.slice(0,20).map((item) => '<div class="advanced-list-item"><b>' + escapeHtml(item.client) + (item.programWeek ? ' · Week ' + item.programWeek + ' Day ' + item.programDay : '') + '</b><span>' + escapeHtml(item.scheduledDate ? new Date(item.scheduledDate + 'T12:00:00').toLocaleDateString() : new Date(item.assignedAt).toLocaleDateString()) + ' · ' + escapeHtml(assignmentStatusLabel(item)) + '</span></div>').join('') || '<div class="empty-state">No sessions assigned.</div>') + '</div></section><section class="coach-module-card"><h3>Coaching follow-ups</h3><div class="advanced-list">' + (followups.map((item) => '<div class="advanced-list-item"><b>' + escapeHtml(item.client) + '</b><span>' + escapeHtml(item.label) + '</span></div>').join('') || '<div class="empty-state">No client is waiting on feedback.</div>') + '</div><div class="tool-actions"><button class="small-btn primary" onclick="openCoachDestination(\'clients\')">Review clients</button></div></section>';
  } else if (destination === 'messages') {
    const messages = loadLocalArray(CLIENT_MESSAGES_KEY);
    const profiles = loadProfiles(), threads = profiles.map((profile) => { const items = messages.filter((message) => message.profileId === profile.id).sort((a,b) => String(b.createdAt).localeCompare(String(a.createdAt))); return {profile,items,needsReply:items.length && messageSenderRole(items[0]) === 'client'}; }).filter((thread) => thread.items.length).sort((a,b) => Number(b.needsReply) - Number(a.needsReply) || String(b.items[0].createdAt).localeCompare(String(a.items[0].createdAt)));
    out.innerHTML = '<section class="coach-module-card" style="grid-column:1/-1"><h3>Client conversations</h3><p>Waiting conversations stay first. Messages you send are blue and aligned right; client messages are dark and aligned left. Each reply carries the trainer’s name.</p><div class="advanced-list" style="margin-top:14px">' + (threads.map((thread) => '<details class="formal-review-box" ' + (thread.needsReply || threads.length === 1 ? 'open' : '') + '><summary>' + (thread.needsReply ? '<span class="tag tag-burn">Reply needed</span> ' : '<span class="tag">Up to date</span> ') + escapeHtml(thread.profile.name) + ' · ' + escapeHtml(thread.profile.assignedTrainerName || 'Coaching team') + '</summary>' + messageThreadHtml(thread.items,thread.profile,'trainer') + '<div class="tool-actions"><button class="small-btn primary" onclick="replyToClientMessage(\'' + escapeHtml(thread.profile.id) + '\')">Reply to ' + escapeHtml(thread.profile.name) + '</button></div></details>').join('') || '<div class="empty-state">No direct client messages.</div>') + '</div></section>';
  } else if (destination === 'library') {
    out.innerHTML = '<section class="coach-module-card" style="grid-column:1/-1"><div style="display:flex;justify-content:space-between;gap:12px;align-items:flex-start;flex-wrap:wrap"><div><h3>Gym-approved exercise bank</h3><p>Add, edit, or remove movements without breaking generation. Every saved category controls when that exercise is eligible.</p></div><button class="small-btn primary" onclick="openExerciseEditor()">+ Add exercise</button></div><div class="library-toolbar"><div class="compact-field"><label for="coachLibrarySearch">Search</label><input id="coachLibrarySearch" placeholder="Exercise, cue, muscle, pattern, or equipment" oninput="renderCoachExerciseLibrary()"></div><div class="compact-field"><label for="coachLibraryPattern">Movement</label><select id="coachLibraryPattern" onchange="renderCoachExerciseLibrary()"><option value="">All movements</option></select></div><div class="compact-field"><label for="coachLibraryZone">Equipment</label><select id="coachLibraryZone" onchange="renderCoachExerciseLibrary()"><option value="">All equipment</option></select></div><div class="compact-field"><label for="coachLibraryRegion">Body part</label><select id="coachLibraryRegion" onchange="renderCoachExerciseLibrary()"><option value="">All body areas</option></select></div></div><div id="coachLibraryCount" class="library-count"></div><div id="coachLibraryResults" class="advanced-list"></div><div class="library-empty-tip"><b>How generator inclusion works:</b> equipment and cardio-machine categories are checked first, then client experience, age/impact, injuries and coaching limitations, muscle focus, movement role, and exercise preferences. A custom exercise is not usable until the required categories are complete.</div></section>'; setTimeout(initializeCoachLibraryFilters,0);
  } else if (destination === 'access') {
    const owner = window.fit4lifeCloudRole === 'owner';
    const canConfirm = owner || window.fit4lifeCloudRole === 'trainer';
    out.innerHTML = '<section class="coach-module-card" style="grid-column:1/-1"><div style="display:flex;justify-content:space-between;gap:12px;align-items:flex-start;flex-wrap:wrap"><div><h3>Trainer approval center</h3><p>Client accounts never receive trainer permissions automatically. An approved staff member confirms a verified pending trainer request here; the approver and time are recorded. Owners can also make a manual grant or deactivate staff.</p></div><span class="tag ' + (canConfirm ? 'tag-circuit' : '') + '">' + (owner ? 'Owner controls' : canConfirm ? 'Trainer confirmation' : 'View only') + '</span></div>' + (owner ? '<div class="compact-grid" style="margin-top:18px"><div class="compact-field"><label for="trainerAccountEmail">Verified trainer login email</label><input id="trainerAccountEmail" type="email" placeholder="trainer@example.com"></div><div class="compact-field"><label for="trainerAccountName">Name clients will see</label><input id="trainerAccountName" placeholder="Jordan Smith"></div></div><div class="tool-actions"><button class="small-btn primary" onclick="approveTrainerAccount()">Grant trainer access manually</button></div>' : '<div class="portal-note">You can confirm a verified pending request below. Only the owner can manually grant access without a request or deactivate staff.</div>') + '<div id="trainerAccountStatus" class="storage-note" style="margin-top:10px"></div><h3 style="margin-top:22px">Pending trainer requests</h3><div id="trainerRequestList" class="trainer-account-list"><div class="empty-state">Checking the approval queue…</div></div><h3 style="margin-top:22px">Approved staff</h3><div id="trainerAccountList" class="trainer-account-list"><div class="empty-state">Loading trainer accounts…</div></div><h3 style="margin-top:22px">Recent trainer-access decisions</h3><div id="trainerApprovalHistory" class="trainer-account-list"><div class="empty-state">Loading approval history…</div></div><div class="library-empty-tip"><b>Permission boundary:</b> approved trainers may confirm only a verified pending trainer request. Only the owner may manually grant access, deactivate staff, or recover permissions. Client sign-up and email verification never grant trainer access by themselves.</div></section>'; setTimeout(refreshTrainerAccessManager,0);
  } else if (destination === 'settings') {
    const owner = window.fit4lifeCloudRole === 'owner';
    out.innerHTML = '<section class="coach-module-card" style="grid-column:1/-1"><h3>Your trainer identity</h3><p>This is the name clients see on messages and feedback.</p><div class="compact-grid" style="margin-top:14px"><div class="compact-field"><label for="myTrainerDisplayName">Your name on messages</label><input id="myTrainerDisplayName" value="' + escapeHtml(currentAccountIdentity().displayName) + '" placeholder="Name clients should see"></div></div><div class="tool-actions"><button class="small-btn" onclick="saveMyTrainerDisplayName()">Save my sender name</button><button class="small-btn ' + (owner ? 'primary' : '') + '" onclick="openCoachDestination(\'access\')">Open Trainer Access</button></div><div id="trainerAccountStatus" class="storage-note" style="margin-top:10px"></div></section><section class="coach-module-card"><h3>Data & backups</h3><p>Export or restore the full local coaching record before changing devices.</p><div class="tool-actions"><button class="small-btn" onclick="exportProgress()">Export backup</button><button class="small-btn" onclick="byId(\'progressImport\').click()">Restore backup</button></div></section><section class="coach-module-card"><h3>Security</h3><p>Supabase roles control real trainer and client access. The legacy PIN is only a fallback for the offline prototype.</p><div class="tool-actions"><button class="small-btn" onclick="lockTrainerHub()">Sign out / lock workspace</button></div></section>';
  } else {
    out.innerHTML = '<section class="coach-module-card"><h3>Data & backups</h3><p>Export or restore the full local coaching record before changing devices.</p><div class="tool-actions"><button class="small-btn" onclick="exportProgress()">Export backup</button><button class="small-btn" onclick="byId(\'progressImport\').click()">Restore backup</button></div></section><section class="coach-module-card"><h3>Security</h3><p>Hosted accounts and Supabase roles control live trainer and client access. The legacy PIN is only an offline prototype fallback.</p><div class="tool-actions"><button class="small-btn" onclick="lockTrainerHub()">Sign out / lock workspace</button></div></section><section class="coach-module-card"><h3>Gym branding</h3><p>Manage gym identity, available equipment, and teams from one organization setup.</p><div class="tool-actions"><button class="small-btn" onclick="openAdvancedStudio(\'organization\')">Open organization setup</button></div></section><section class="coach-module-card"><h3>Monitoring imports</h3><p>Attach optional monitoring exports to a specific client, then review them alongside workout and check-in evidence.</p><div class="tool-actions"><button class="small-btn" onclick="openAdvancedStudio(\'monitoring\')">Open monitoring</button></div></section>';
  }
}
async function refreshTrainerAccountManager() {
  const out = byId('trainerAccountList'); if (!out) return;
  if (!window.fit4lifeCloudListTrainers) { out.innerHTML = '<div class="empty-state">Run the trainer-account SQL upgrade in Supabase, then refresh this page.</div>'; return; }
  const trainers = await window.fit4lifeCloudListTrainers();
  if (!Array.isArray(trainers)) { out.innerHTML = '<div class="empty-state">Trainer accounts could not be loaded.</div>'; return; }
  window.fit4lifeCloudTrainers = trainers;
  if (byId('myTrainerDisplayName')) byId('myTrainerDisplayName').value = currentAccountIdentity().displayName;
  out.innerHTML = trainers.map((trainer) => '<div class="trainer-account-row"><div><b>' + escapeHtml(trainer.display_name || trainer.email || 'Trainer') + '</b><span>' + escapeHtml(trainer.email || '') + ' · ' + escapeHtml(trainer.role || 'trainer') + (trainer.is_active === false ? ' · inactive' : ' · active') + '</span></div>' + (window.fit4lifeCloudRole === 'owner' && trainer.role !== 'owner' && trainer.is_active !== false ? '<button class="small-btn danger" onclick="deactivateTrainerAccount(\'' + escapeHtml(trainer.user_id) + '\')">Deactivate</button>' : '') + '</div>').join('') || '<div class="empty-state">No trainer accounts found.</div>';
}
async function refreshTrainerAccessManager() {
  if (window.fit4lifeCloudRefreshRegistrationRequests) await window.fit4lifeCloudRefreshRegistrationRequests();
  const history = window.fit4lifeCloudListTrainerRequests ? await window.fit4lifeCloudListTrainerRequests() : window.fit4lifeCloudRegistrationRequests || [];
  await refreshTrainerAccountManager();
  const trainerRequests = Array.isArray(history) ? history : [], requests = trainerRequests.filter((request) => request.requested_role === 'trainer' && request.status === 'pending'), out = byId('trainerRequestList');
  const canConfirm = ['owner','trainer'].includes(window.fit4lifeCloudRole);
  if (out) out.innerHTML = requests.map((request) => '<div class="trainer-account-row pending"><div><b>' + escapeHtml(request.full_name || request.email || 'Trainer request') + '</b><span>' + escapeHtml(request.email || '') + ' · requested ' + new Date(request.created_at).toLocaleString() + ' · confirm identity and verified email before approval</span></div>' + (canConfirm ? '<button class="small-btn primary" onclick="approveTrainerRequest(\'' + escapeHtml(request.email || '') + '\',\'' + escapeHtml(request.full_name || '') + '\')">Confirm trainer access</button>' : '') + '</div>').join('') || '<div class="empty-state">No trainer requests are waiting.' + (window.fit4lifeCloudRole === 'owner' ? ' The owner may still grant access manually above.' : '') + '</div>';
  const decisions = trainerRequests.filter((request) => request.status !== 'pending').slice(0,20), decisionOut = byId('trainerApprovalHistory'), trainers = window.fit4lifeCloudTrainers || [];
  if (decisionOut) decisionOut.innerHTML = decisions.map((request) => {
    const reviewer = trainers.find((trainer) => trainer.user_id === request.reviewed_by), reviewerName = reviewer && (reviewer.display_name || reviewer.email) || (request.reviewed_by ? 'Approved staff member' : 'Automated client flow');
    return '<div class="trainer-account-row"><div><b>' + escapeHtml(request.full_name || request.email || 'Trainer request') + ' · ' + escapeHtml(request.status) + '</b><span>' + escapeHtml(request.email || '') + ' · ' + (request.reviewed_at ? new Date(request.reviewed_at).toLocaleString() : 'decision time unavailable') + ' · by ' + escapeHtml(reviewerName) + '</span><span>' + escapeHtml(request.review_note || 'No review note') + '</span></div></div>';
  }).join('') || '<div class="empty-state">No completed trainer-access decisions yet.</div>';
  renderTrainerAttention();
}
function approveTrainerRequest(email,name) {
  approveTrainerAccount(email,name,true);
}
async function approveTrainerAccount(emailOverride,nameOverride,fromRequest) {
  const owner = window.fit4lifeCloudRole === 'owner', canConfirm = ['owner','trainer'].includes(window.fit4lifeCloudRole);
  if (!canConfirm || !window.fit4lifeCloudApproveTrainer) return showToast('An approved trainer account is required to review trainer requests');
  if (!owner && !fromRequest) return showToast('Only the owner can grant trainer access without a pending request');
  const email = String(emailOverride || byId('trainerAccountEmail') && byId('trainerAccountEmail').value || '').trim().toLowerCase(), name = String(nameOverride || byId('trainerAccountName') && byId('trainerAccountName').value || '').trim(), status = byId('trainerAccountStatus');
  if (!email || !name) { status.textContent = 'Enter the trainer’s verified login email and display name.'; return; }
  status.textContent = 'Confirming trainer account…'; const result = await window.fit4lifeCloudApproveTrainer(email,name);
  status.textContent = result && result.ok ? name + ' can now sign in as a trainer. Approved by ' + currentAccountIdentity().displayName + '.' : result && result.message || 'Trainer approval failed.';
  if (result && result.ok) { if (byId('trainerAccountEmail')) byId('trainerAccountEmail').value = ''; if (byId('trainerAccountName')) byId('trainerAccountName').value = ''; await refreshTrainerAccessManager(); }
}
async function saveMyTrainerDisplayName() {
  const input = byId('myTrainerDisplayName'), status = byId('trainerAccountStatus'); if (!input || !window.fit4lifeCloudUpdateMyTrainerName) return;
  const name = input.value.trim(); if (name.length < 2) { status.textContent = 'Enter the name clients should see.'; return; }
  const result = await window.fit4lifeCloudUpdateMyTrainerName(name); status.textContent = result && result.ok ? 'Messages will now show “' + name + '”.' : result && result.message || 'The sender name could not be saved.'; if (result && result.ok) refreshTrainerAccountManager();
}
async function deactivateTrainerAccount(userId) {
  if (!window.fit4lifeCloudDeactivateTrainer || !window.confirm('Deactivate this trainer account? Their client records stay saved, but their trainer access ends immediately.')) return;
  const result = await window.fit4lifeCloudDeactivateTrainer(userId); showToast(result && result.ok ? 'Trainer account deactivated' : result && result.message || 'Trainer account could not be deactivated'); if (result && result.ok) refreshTrainerAccountManager();
}
const EXERCISE_PATTERNS = ["squat","hinge","lunge","h_push","v_push","h_pull","v_pull","carry","core","rotation","mobility","conditioning","plyo","olympic"];
const EXERCISE_REGIONS = ["lower","push","pull","core","full","cardio","mobility"];
const EXERCISE_PATTERN_LABELS = { squat:"Squat",hinge:"Hinge",lunge:"Lunge",h_push:"Horizontal push",v_push:"Vertical push",h_pull:"Horizontal pull",v_pull:"Vertical pull",carry:"Carry",core:"Core / anti-movement",rotation:"Rotation",mobility:"Mobility",conditioning:"Conditioning",plyo:"Plyometric",olympic:"Olympic / explosive" };
const EXERCISE_REGION_LABELS = { lower:"Lower body",push:"Upper push",pull:"Upper pull",core:"Core",full:"Full body",cardio:"Cardio",mobility:"Mobility" };
function fillSelectOptions(select,entries,selected) { if (!select) return; select.innerHTML = entries.map(([value,label]) => '<option value="' + escapeHtml(value) + '">' + escapeHtml(label) + '</option>').join(''); if (Array.isArray(selected)) Array.from(select.options).forEach((option) => { option.selected = selected.includes(option.value); }); else if (selected != null) select.value = selected; }
function initializeCoachLibraryFilters() {
  fillSelectOptions(byId('coachLibraryPattern'),[['','All movements'],...EXERCISE_PATTERNS.map((key) => [key,EXERCISE_PATTERN_LABELS[key]])]);
  fillSelectOptions(byId('coachLibraryZone'),[['','All equipment'],...ALL_ZONES.map((key) => [key,ZONE_LABELS[key]])]);
  fillSelectOptions(byId('coachLibraryRegion'),[['','All body areas'],...EXERCISE_REGIONS.map((key) => [key,EXERCISE_REGION_LABELS[key]])]);
  renderCoachExerciseLibrary();
}
function renderCoachExerciseLibrary() {
  const out = byId('coachLibraryResults'); if (!out) return;
  const query = String(byId('coachLibrarySearch') && byId('coachLibrarySearch').value || '').trim().toLowerCase(), pattern = byId('coachLibraryPattern') && byId('coachLibraryPattern').value || '', zone = byId('coachLibraryZone') && byId('coachLibraryZone').value || '', region = byId('coachLibraryRegion') && byId('coachLibraryRegion').value || '';
  const items = LIBRARY.filter((item) => {
    const haystack = [item.name,...(item.aliases || []),item.pattern,item.zone,item.region,item.cue,item.instructions,...(item.muscles || [])].join(' ').toLowerCase();
    return (!query || haystack.includes(query)) && (!pattern || item.pattern === pattern) && (!zone || item.zone === zone) && (!region || item.region === region);
  }).sort((a,b) => a.name.localeCompare(b.name));
  if (byId('coachLibraryCount')) byId('coachLibraryCount').textContent = items.length + ' shown · ' + LIBRARY.length + ' active · ' + loadExerciseLibraryEdits().length + ' gym edit' + (loadExerciseLibraryEdits().length === 1 ? '' : 's');
  out.innerHTML = items.slice(0,250).map((item) => {
    const source = item.bankSource === 'custom' ? 'Custom' : item.bankSource === 'edited' ? 'Gym edited' : 'Built in';
    return '<div class="advanced-list-item library-item"><div><div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap"><b>' + escapeHtml(item.name) + '</b><span class="library-source-badge' + (item.bankSource === 'custom' || item.bankSource === 'edited' ? ' custom' : '') + '">' + source + '</span><span class="library-source-badge custom">Safety classified</span></div><div class="library-item-tags"><span>' + escapeHtml(EXERCISE_PATTERN_LABELS[item.pattern] || item.pattern) + '</span><span>' + escapeHtml(EXERCISE_REGION_LABELS[item.region] || item.region) + '</span><span>' + escapeHtml(ZONE_LABELS[item.zone] || item.zone) + '</span><span>' + EXP_LABEL(item.exp) + '</span><span>Impact ' + Number(item.impact || 0) + '</span>' + (item.primary ? '<span>Primary</span>' : '') + (item.preps && item.preps.length ? '<span>Warm-up</span>' : '') + (item.finisher ? '<span>Finisher</span>' : '') + (item.video ? '<span>Video</span>' : '') + '</div><p>' + escapeHtml(item.cue || 'No coaching cue entered') + '</p><span>Muscles: ' + escapeHtml((item.muscles || []).map((key) => MUSCLE_LABELS[key] || key).join(', ') || 'General / not assigned') + (item.demands && item.demands.length ? ' · Demands: ' + item.demands.slice(0,6).map((key) => MOVEMENT_DEMAND_LABELS[key] || key).join(', ') : '') + (item.avoid && item.avoid.length ? ' · Blocked for: ' + item.avoid.map((key) => INJURY_LABELS[key] || key).join(', ') : '') + (item.aliases && item.aliases.length ? ' · Aliases: ' + item.aliases.join(', ') : '') + '</span></div><div class="library-item-actions"><button class="small-btn" onclick="openExerciseEditor(\'' + escapeHtml(exerciseBankId(item)) + '\')">Edit</button><button class="small-btn danger" onclick="deleteExerciseBankEntry(\'' + escapeHtml(exerciseBankId(item)) + '\')">Delete</button></div></div>';
  }).join('') || '<div class="empty-state">No exercise matches those filters.</div>';
}
function selectedOptionValues(id) { const select = byId(id); return select ? Array.from(select.options).filter((option) => option.selected).map((option) => option.value) : []; }
function exerciseRoleFor(item) { return item && item.finisher ? 'finisher' : item && item.preps && item.preps.length ? 'warmup' : item && item.primary ? 'primary' : 'standard'; }
function openExerciseEditor(id) {
  if (!requireTrainerMutation('edit the exercise bank')) return false;
  const item = id ? LIBRARY.find((exercise) => exerciseBankId(exercise) === id) : null;
  byId('exerciseBankId').value = item ? exerciseBankId(item) : '';
  byId('exerciseEditorTitle').textContent = item ? 'Edit ' + item.name : 'Add exercise';
  byId('exerciseBankName').value = item && item.name || '';
  byId('exerciseBankAliases').value = item && item.aliases ? item.aliases.join(', ') : '';
  fillSelectOptions(byId('exerciseBankPattern'),EXERCISE_PATTERNS.map((key) => [key,EXERCISE_PATTERN_LABELS[key]]),item && item.pattern || 'squat');
  fillSelectOptions(byId('exerciseBankRegion'),EXERCISE_REGIONS.map((key) => [key,EXERCISE_REGION_LABELS[key]]),item && item.region || 'lower');
  fillSelectOptions(byId('exerciseBankZone'),ALL_ZONES.map((key) => [key,ZONE_LABELS[key]]),item && item.zone || 'bodyweight');
  fillSelectOptions(byId('exerciseBankMuscles'),MUSCLE_LIST.map((key) => [key,MUSCLE_LABELS[key]]),item && item.muscles || []);
  fillSelectOptions(byId('exerciseBankAvoid'),COMMON_LIMITATIONS.map((key) => [key,INJURY_LABELS[key]]),item && item.avoid || []);
  fillSelectOptions(byId('exerciseBankDemands'),MOVEMENT_DEMAND_KEYS.map((key) => [key,MOVEMENT_DEMAND_LABELS[key]]),item && inferExerciseDemands(item) || []);
  fillSelectOptions(byId('exerciseBankCardio'),[['','Not a cardio machine'],...Object.keys(CARDIO_MODALITIES).filter((key) => key !== 'any').map((key) => [key,CARDIO_MODALITIES[key].label])],item && item.cardioMode || '');
  byId('exerciseBankRole').value = exerciseRoleFor(item); byId('exerciseBankExperience').value = String(item && item.exp || 1); byId('exerciseBankImpact').value = String(item && item.impact || 0); byId('exerciseBankFinisherType').value = item && item.ftype || 'pump'; byId('exerciseBankCue').value = item && item.cue || ''; byId('exerciseBankInstructions').value = item && item.instructions || ''; byId('exerciseBankVideo').value = item && item.video || ''; byId('exerciseBankRegression').value = item && item.regression || ''; byId('exerciseBankProgression').value = item && item.progression || ''; byId('exerciseBankUnilateral').checked = Boolean(item && item.unilateral); byId('exerciseBankSafetyReviewed').checked = Boolean(item);
  Array.from(byId('exerciseBankPreps').options).forEach((option) => { option.selected = Boolean(item && item.preps && item.preps.includes(option.value)); });
  byId('exerciseBankDeleteBtn').style.display = item ? 'inline-flex' : 'none'; byId('exerciseEditorModal').classList.add('open'); return true;
}
function closeExerciseEditor() { const modal = byId('exerciseEditorModal'); if (modal) modal.classList.remove('open'); }
function saveExerciseBankEntry() {
  if (!requireTrainerMutation('edit the exercise bank')) return null;
  const originalId = byId('exerciseBankId').value, name = byId('exerciseBankName').value.trim(), role = byId('exerciseBankRole').value, muscles = selectedOptionValues('exerciseBankMuscles'), preps = selectedOptionValues('exerciseBankPreps');
  if (!name) { showToast('Add a unique exercise name'); return null; }
  if (LIBRARY.some((exercise) => exerciseBankId(exercise) !== originalId && exercise.name.trim().toLowerCase() === name.toLowerCase())) { showToast('An exercise with that name already exists'); return null; }
  if (!muscles.length && !['cardio','mobility'].includes(byId('exerciseBankRegion').value)) { showToast('Choose at least one muscle so the generator can place this exercise'); return null; }
  if (role === 'warmup' && !preps.length) { showToast('Choose what this warm-up prepares'); return null; }
  if (byId('exerciseBankZone').value === 'cardio' && !byId('exerciseBankCardio').value) { showToast('Choose the exact cardio machine so availability filters can protect every workout phase'); return null; }
  const video = byId('exerciseBankVideo').value.trim();
  if (video && !/^https:\/\//i.test(video)) { showToast('Use a secure https:// demonstration video URL'); return null; }
  const id = originalId || exerciseBankId({name}), exercise = { bankId:id,name,aliases:byId('exerciseBankAliases').value.split(',').map((value) => value.trim()).filter(Boolean).slice(0,20),zone:byId('exerciseBankZone').value,pattern:byId('exerciseBankPattern').value,region:byId('exerciseBankRegion').value,exp:Number(byId('exerciseBankExperience').value),impact:Number(byId('exerciseBankImpact').value),unilateral:byId('exerciseBankUnilateral').checked,avoid:selectedOptionValues('exerciseBankAvoid'),demands:selectedOptionValues('exerciseBankDemands'),safetyReviewed:byId('exerciseBankSafetyReviewed').checked,safetySource:'trainer',safetyReviewedAt:new Date().toISOString(),safetyReviewedBy:currentAccountIdentity().displayName,muscles,cue:byId('exerciseBankCue').value.trim(),instructions:byId('exerciseBankInstructions').value.trim(),video:video || undefined,regression:byId('exerciseBankRegression').value.trim() || undefined,progression:byId('exerciseBankProgression').value.trim() || undefined,cardioMode:byId('exerciseBankCardio').value || undefined };
  if (role === 'primary') exercise.primary = true;
  if (role === 'warmup') exercise.preps = preps;
  if (role === 'finisher') { exercise.finisher = true; exercise.ftype = byId('exerciseBankFinisherType').value; exercise.fmuscles = [...muscles]; }
  if (!exercise.demands.length) {
    exercise.demands = inferExerciseDemands(exercise);
    fillSelectOptions(byId('exerciseBankDemands'),MOVEMENT_DEMAND_KEYS.map((key) => [key,MOVEMENT_DEMAND_LABELS[key]]),exercise.demands);
    byId('exerciseBankSafetyReviewed').checked = false;
    showToast('Movement-demand suggestions were added. Review them, check the safety confirmation, then save again.');
    return null;
  }
  if (!exercise.safetyReviewed) { showToast('Review the movement demands and limitation exclusions before activating this exercise'); return null; }
  Object.assign(exercise,normalizeExerciseSafetyMetadata(exercise,'trainer'));
  const edits = loadExerciseLibraryEdits(), index = edits.findIndex((edit) => edit.id === id), previousRecord = index >= 0 ? edits[index] : null, previousExercise = LIBRARY.find((item) => exerciseBankId(item) === id), revisions = [...(previousRecord && previousRecord.revisions || [])];
  if (previousExercise) revisions.unshift({id:'exercise-revision-' + Date.now(),savedAt:new Date().toISOString(),savedBy:currentAccountIdentity().displayName,exercise:JSON.parse(JSON.stringify(previousExercise))});
  const record = { id,action:BASE_LIBRARY.some((base) => exerciseBankId(base) === id) ? 'update' : 'add',exercise,revisions:revisions.slice(0,20),updatedAt:new Date().toISOString(),updatedBy:currentAccountIdentity().displayName };
  if (index >= 0) edits[index] = record; else edits.push(record);
  if (!writeExerciseLibraryEdits(edits)) { showToast('The exercise-bank change could not be saved'); return null; }
  applyExerciseLibraryEdits(); closeExerciseEditor(); renderCoachModule('library'); showToast(name + ' is active in the generator and workout bank'); return exercise;
}
function deleteExerciseBankEntry(id) {
  if (!requireTrainerMutation('delete exercises')) return false; const item = LIBRARY.find((exercise) => exerciseBankId(exercise) === id); if (!item) return false;
  if (!window.confirm('Delete ' + item.name + ' from the active exercise bank? Existing assigned workouts keep their saved copy.')) return false;
  const edits = loadExerciseLibraryEdits(), index = edits.findIndex((edit) => edit.id === id), record = { id,action:'delete',updatedAt:new Date().toISOString() }; if (index >= 0) edits[index] = record; else edits.push(record);
  if (!writeExerciseLibraryEdits(edits)) return false; applyExerciseLibraryEdits(); closeExerciseEditor(); renderCoachModule('library'); showToast(item.name + ' removed from future generation'); return true;
}
function deleteExerciseBankEntryFromEditor() { const id = byId('exerciseBankId').value; if (id) deleteExerciseBankEntry(id); }
function replyToClientMessage(profileId) {
  const profile = loadProfiles().find((item) => item.id === profileId); if (!profile) return;
  const identity = currentAccountIdentity(), body = window.prompt('Message ' + profile.name + ' as ' + identity.displayName + ':'); if (!body || !body.trim()) return;
  const messages = loadLocalArray(CLIENT_MESSAGES_KEY);
  messages.unshift({id:'message-' + Date.now(),profileId:profile.id,client:profile.name,from:'coach',senderRole:identity.role === 'owner' ? 'owner' : 'trainer',senderUserId:identity.id || '',senderName:identity.displayName,recipientRole:'client',recipientUserId:'',recipientName:profile.name,body:body.trim(),createdAt:new Date().toISOString()});
  if (!profile.assignedTrainerId && identity.id) { const profiles = loadProfiles(), index = profiles.findIndex((item) => item.id === profile.id); if (index >= 0) { profiles[index] = {...profiles[index],assignedTrainerId:identity.id,assignedTrainerName:identity.displayName,assignedTrainerEmail:identity.email,updatedAt:new Date().toISOString()}; writeProfiles(profiles); } }
  writeLocalArray(CLIENT_MESSAGES_KEY,messages,1000); renderCoachModule('messages'); renderTrainerAttention(); showToast('Message sent to ' + profile.name + ' as ' + identity.displayName);
}
const UNIVERSAL_TRAINER_PIN = "352804";
const TRAINER_SESSION_KEY = "fit4life_trainer_unlocked";
let pendingTrainerClient = "";
let pendingTrainerDestination = "trainer-menu";
function trainerIsUnlocked() {
  const cloudIdentity = window.fit4lifeCloudIdentity || {}, cloudRole = window.fit4lifeCloudRole || "";
  if (cloudIdentity.id) return ["owner","trainer"].includes(cloudRole);
  try { return window.sessionStorage && window.sessionStorage.getItem(TRAINER_SESSION_KEY) === "yes"; }
  catch (_) { return false; }
}
function requireTrainerMutation(action) {
  if (trainerIsUnlocked()) return true;
  showToast("Trainer access is required to " + (action || "change client records"));
  return false;
}
function syncTrainerOnlyControls() {
  const programActions = byId("programProfileActions");
  if (programActions) programActions.style.display = trainerIsUnlocked() ? "flex" : "none";
  const programSave = byId("programSaveBtn");
  if (programSave) programSave.style.display = trainerIsUnlocked() ? "inline-flex" : "none";
}
async function hashTrainerPin(pin) {
  try {
    if (window.crypto && window.crypto.subtle && window.TextEncoder) {
      const bytes = new TextEncoder().encode(pin), digest = await window.crypto.subtle.digest("SHA-256", bytes);
      return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
    }
  } catch (_) {}
  let hash = 2166136261;
  for (let i = 0; i < pin.length; i++) { hash ^= pin.charCodeAt(i); hash = Math.imul(hash, 16777619); }
  return "local-" + (hash >>> 0).toString(16);
}
function requestTrainerAccess(destination,client) {
  portalRole = "trainer";
  pendingTrainerDestination = destination || "trainer-menu";
  pendingTrainerClient = client || pendingTrainerClient || "";
  if (trainerIsUnlocked()) { finishPendingTrainerDestination(); return; }
  if (window.fit4lifeCloudIdentity && window.fit4lifeCloudIdentity.id) {
    portalRole = "client"; pendingTrainerDestination = "trainer-menu"; pendingTrainerClient = "";
    showToast("This account has client access. Only an owner-approved trainer account can open the trainer workspace.");
    if (activeClientProfile()) openClientTab("home"); else show("client-menu");
    return;
  }
  byId("trainerGateTitle").textContent = "Trainer Access";
  byId("trainerGateCopy").textContent = "Offline prototype only: enter the trainer password for this device. The hosted app requires an owner-approved named trainer account.";
  byId("trainerGateSubmit").textContent = "Unlock trainer workspace";
  byId("trainerPin").value = ""; byId("trainerGateError").textContent = "";
  byId("trainerGateModal").classList.add("open"); setTimeout(() => byId("trainerPin").focus(), 20);
}
function openTrainerPortal() { requestTrainerAccess("trainer-menu"); }
function openTrainerHub(client) { requestTrainerAccess("trainer",client); }
function openNewClientProfile() { requestTrainerAccess("new-client-profile"); }
function finishPendingTrainerDestination() {
  const destination = pendingTrainerDestination || "trainer-menu", client = pendingTrainerClient;
  pendingTrainerDestination = "trainer-menu"; pendingTrainerClient = ""; portalRole = "trainer";
  if (destination === "trainer") { show("trainer"); renderTrainerHub(client); return; }
  if (destination === "new-client-profile") { show("trainer"); renderTrainerHub(); openCreateProfileEditor(); return; }
  if (destination === "new-client") { show("trainer"); renderTrainerHub(); startNewClient(); return; }
  if (destination === "programs") { show("programs"); refreshProfileSelects(); syncTrainerOnlyControls(); return; }
  if (destination === "readiness") { show("readiness"); openReadiness(); return; }
  if (destination === "advanced") { show("advanced"); renderAdvancedStudio(); return; }
  show("trainer-menu");
}
function closeTrainerGate() { byId("trainerGateModal").classList.remove("open"); byId("trainerPin").value = ""; }
async function submitTrainerAccess() {
  const pin = byId("trainerPin").value.trim(), error = byId("trainerGateError");
  if (pin !== UNIVERSAL_TRAINER_PIN) { error.textContent = "That trainer password is not correct."; byId("trainerPin").select(); return false; }
  try { window.sessionStorage.setItem(TRAINER_SESSION_KEY, "yes"); } catch (_) {}
  closeTrainerGate(); syncTrainerOnlyControls(); renderForms(); finishPendingTrainerDestination(); return true;
}
function lockTrainerHub() {
  try { window.sessionStorage.removeItem(TRAINER_SESSION_KEY); } catch (_) {}
  syncTrainerOnlyControls(); renderForms(); pendingTrainerDestination = "trainer-menu"; pendingTrainerClient = ""; portalRole = ""; show("home"); showToast("Trainer workspace locked");
}

