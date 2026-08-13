/* ---------- rendering ---------- */
function el(tag, cls, txt) { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; }

function workoutDirectionCopy(sessionState) {
  const firstPlan = workoutPlans(sessionState)[0], architecture = firstPlan && firstPlan.session.optionArchitecture;
  if (architecture) return [architecture.title,architecture.description];
  const first = primaryLiftRefs(sessionState)[0], pattern = first && first.exercise.pattern, family = first && primaryAnchorFamily(first.exercise);
  const familyDirections = {
    "flat-bench":["Flat bench focus","Builds the session around a barbell or dumbbell flat-bench variation."],
    "incline-bench":["Incline bench focus","Uses an incline barbell or dumbbell press to emphasize upper-chest strength."],
    "decline-bench":["Decline bench focus","Uses a decline barbell or dumbbell press for a contrasting chest-strength angle."],
    "overhead-press":["Overhead press focus","Leads with a stable overhead press before supporting shoulder and upper-body work."],
    "supported-row":["Supported row focus","Leads with a chest-supported row so the back can work hard with less low-back demand."],
    "row":["Row focus","Leads with a loadable row variation, then supports it with complementary back work."],
    "pull-up":["Pull-up focus","Leads with a pull-up, chin-up, or assisted variation before row accessories."],
    "trunk-strength":["Trunk-strength focus","Leads with a loadable carry, anti-rotation, or rollout pattern before supporting core work."],
  };
  if (familyDirections[family]) return familyDirections[family];
  const directions = {
    squat:["Squat-led strength","Leads with a knee-dominant primary lift, then reinforces it with complementary work."],
    hinge:["Hinge-led strength","Leads with posterior-chain strength, then supports the hinge without crowding the main work."],
    lunge:["Unilateral strength","Leads with single-leg strength and stability before moving into supporting work."],
    h_push:["Horizontal press lead","Builds the session around a horizontal press and supporting upper-body patterns."],
    v_push:["Overhead press lead","Uses an overhead or angled press as the primary strength direction."],
    h_pull:["Row-led strength","Prioritizes horizontal pulling and upper-back strength before accessories."],
    v_pull:["Vertical pull lead","Prioritizes vertical pulling, then fills out the session with compatible support work."],
    olympic:["Power-led session","Places the highest-skill explosive movement early while the client is fresh."],
    conditioning:["Engine-led session","Uses a primary conditioning movement to organize the rest of the session."],
    core:["Trunk-led session","Uses trunk control as the main movement emphasis and builds outward from it."],
  };
  return directions[pattern] || ["Balanced training","A complete session with a different lead movement and supporting layout."];
}
function renderWorkoutOptionPicker(out) {
  const shell = el("section","workout-choice-shell"), head = el("div","workout-choice-head"), intro = el("div");
  const firstOptionPlans = state.sessionOptions.length ? workoutPlans(state.sessionOptions[0].session) : [], chooserRoutes = firstOptionPlans.map((plan) => resolvedTrainingRoute(plan.session.spec));
  const cardioChooser = chooserRoutes.length && chooserRoutes.every((route) => route === "cardio"), recoveryChooser = chooserRoutes.length && chooserRoutes.every((route) => ["recovery","mobility"].includes(route));
  const chooserTitle = cardioChooser ? "Choose the cardio training approach" : recoveryChooser ? "Choose the recovery approach" : "Choose the training approach and core lift";
  const chooserCopy = cardioChooser ? "Compare a continuous aerobic base session, controlled tempo work, and hard intervals. The highlighted cardio mode is the main training decision, and every option has its own time, recovery, and effort target."
    : recoveryChooser ? "Compare easy aerobic recovery, a mobility reset, and light movement practice. These sessions are designed to restore—not hide a hard weight workout behind a recovery label."
    : "Each card solves the workout differently: focused straight sets, volume pairings, or power/stability density. Mixed routes include a clearly prescribed cardio block instead of treating every goal as weight training.";
  intro.append(el("h3","",chooserTitle),el("p","",chooserCopy));
  head.appendChild(intro); shell.appendChild(head);
  const grid = el("div","workout-choice-grid");
  state.sessionOptions.forEach((option,index) => {
    const plans = workoutPlans(option.session), mainRefs = primaryLiftRefs(option.session), direction = workoutDirectionCopy(option.session), card = el("article","workout-choice");
    const top = el("div","workout-choice-top"); top.append(el("div","workout-choice-label","Option " + String.fromCharCode(65 + index)),el("h4","",direction[0]));
    const meta = el("div","workout-choice-meta"), firstPlan = plans[0], goals = firstPlan && (firstPlan.session.spec.goals || [firstPlan.session.spec.goal]), route = firstPlan && resolvedTrainingRoute(firstPlan.session.spec);
    [[firstPlan && firstPlan.session.spec.minutes ? firstPlan.session.spec.minutes + " min" : "Timed session", goals ? goals.map((goal) => GOALS[goal] ? GOALS[goal].label : goal).join(" + ") : "Personalized", route && TRAINING_ROUTES[route] ? TRAINING_ROUTES[route].title : "Personalized", option.session.type === "group" ? "Two-client layout" : sessionExerciseNames(option.session).length + " movements"]].flat().forEach((value) => meta.appendChild(el("span","",value)));
    top.appendChild(meta); card.appendChild(top);
    const anchors = mainRefs.filter((ref) => isPrimaryAnchor(ref.exercise)), lifts = el("div","workout-choice-lifts"), optionRoutes = plans.map((plan) => resolvedTrainingRoute(plan.session.spec)), cardioOption = optionRoutes.length && optionRoutes.every((value) => value === "cardio"), recoveryOption = optionRoutes.length && optionRoutes.every((value) => ["recovery","mobility"].includes(value));
    lifts.appendChild(el("span","",cardioOption ? "Choose by this cardio plan" : recoveryOption ? "Choose by this recovery emphasis" : anchors.length ? "Choose by this core lift" : "Lead movement · no loadable core lift available"));
    mainRefs.forEach((ref) => {
      const protocol = cardioOption && ref.exercise.rx ? " · " + ref.exercise.rx.sets + " × " + ref.exercise.rx.reps : "";
      lifts.appendChild(el("div","workout-choice-lift",(option.session.type === "group" ? ref.label + " · " : "") + ref.exercise.name + protocol));
    });
    card.appendChild(lifts);
    const otherOptions = state.sessionOptions.filter((_,otherIndex) => otherIndex !== index), otherNames = new Set(otherOptions.flatMap((other) => sessionExerciseNames(other.session))), unique = sessionExerciseNames(option.session).filter((name) => !otherNames.has(name));
    const architecture = firstPlan && firstPlan.session.optionArchitecture;
    const difference = el("div","workout-choice-difference");
    const approach = architecture ? architecture.short : "A distinct lead pattern and supporting layout";
    const examples = unique.length ? " · Key movements: " + unique.slice(0,3).join(" · ") : "";
    difference.append(el("b","","What makes this option different"),el("span","",approach + examples)); card.appendChild(difference);
    const flow = el("div","workout-choice-flow");
    plans.forEach((plan) => (plan.session.blocks || []).forEach((block,blockIndex) => {
      const isPrimaryBlock = mainRefs.some((ref) => ref.session === plan.session && ref.block === block), row = el("div","workout-choice-block" + (isPrimaryBlock ? " primary" : "")), copy = el("div");
      row.appendChild(el("i","",String(blockIndex + 1)));
      copy.append(el("b","",(option.session.type === "group" ? plan.label + " · " : "") + block.title),el("span","",block.items.map((exercise) => exercise.name).join(" + ")));
      row.appendChild(copy); flow.appendChild(row);
    }));
    card.appendChild(flow);
    const bottom = el("div","workout-choice-bottom"), choose = el("button","btn btn-primary","Choose option " + String.fromCharCode(65 + index)); choose.type = "button"; choose.onclick = () => chooseWorkoutOption(index);
    bottom.append(el("p","",direction[1]),choose); card.appendChild(bottom); grid.appendChild(card);
  });
  if (portalRole === "trainer" && trainerIsUnlocked() && state.mode === "solo") {
    const manual = el("article","workout-choice manual-workout-card"), top = el("div","workout-choice-top");
    top.append(el("div","workout-choice-label","Option D · full control"),el("h4","","Build from scratch"));
    const meta = el("div","workout-choice-meta");
    [state.solo.minutes + " min","Whole-session filters stay active","Coach approval required"].forEach((value) => meta.appendChild(el("span","",value)));
    top.appendChild(meta); manual.appendChild(top);
    const difference = el("div","workout-choice-difference");
    difference.append(el("b","","Start with an organized blank session"),el("span","","Warm-up · primer · primary lift · secondary strength · accessory · trunk · conditioning · cool-down"));
    manual.appendChild(difference);
    manual.appendChild(el("div","constraint-summary","Every exercise you add must match this client’s equipment, available cardio machines, experience, age, preferences, and reported limitations. A trainer can still use a clearly warned override from the workout bank."));
    const bottom = el("div","workout-choice-bottom"), button = el("button","btn btn-primary","Build option D from scratch");
    button.type = "button"; button.onclick = () => startWorkoutFromScratch();
    bottom.append(el("p","","Use this when none of the three generated approaches matches the coach’s intent."),button); manual.appendChild(bottom); grid.appendChild(manual);
  }
  shell.appendChild(grid);
  shell.appendChild(el("div","workout-choice-note","These are contrasting starting directions, not locked templates. After choosing one, you can move, replace, shuffle, add, or remove any movement while keeping its goal-specific structure and prescription."));
  out.appendChild(shell);
}

function renderOutput() {
  const out = document.getElementById("output");
  out.innerHTML = "";
  if (!state.session) { if (state.sessionOptions.length) renderWorkoutOptionPicker(out); return; }
  if (state.session.type === "solo") {
    out.appendChild(sessionActions(false));
    out.appendChild(renderCard(state.session.data, state.session, null));
  } else {
    const g = state.session.data;
    const banner = el("div", "group-banner");
    banner.innerHTML = "<b>Group of two &middot; " + (g.sameGoal ? "same goal" : "different goals") + "</b><br>" + g.format;
    if (g.shared.length) {
      const s = el("div", "shared-list", "Shared stations: " + g.shared.join(" \u00b7 "));
      banner.appendChild(s);
    }
    out.appendChild(sessionActions(true));
    out.appendChild(banner);
    out.appendChild(renderCard(g.a, state.session, "a", "Partner 1"));
    out.appendChild(renderCard(g.b, state.session, "b", "Partner 2"));
  }
}

function sessionActions(isGroup) {
  const bar = el("div", "session-actions");
  if (state.sessionOptions.length > 1) {
    const compare = el("button","mini-btn","Compare 3 options"); compare.onclick = () => compareWorkoutOptions(); bar.appendChild(compare);
  }
  const print = el("button", "mini-btn");
  print.innerHTML = "&#128424; Print";
  print.onclick = () => window.print();
  bar.appendChild(print);
  if (portalRole === "trainer" && trainerIsUnlocked()) {
    const approved = workoutPlans(state.session).every((plan) => plan.session.approval && plan.session.approval.status === "approved");
    if (!approved) { const approve = el("button","mini-btn primary",isGroup ? "Coach approve both drafts" : "Coach approve draft"); approve.onclick = () => approveCurrentWorkoutDraft(); bar.appendChild(approve); }
    else { const assign = el("button","mini-btn primary",isGroup ? "Assign both workouts" : "Assign to client"); assign.onclick = () => assignCurrentWorkout(); bar.appendChild(assign); }
  }
  const review = el("button", "mini-btn primary", "Finish & Review");
  review.onclick = () => openWorkoutReview();
  bar.appendChild(review);
  const summary = el("button", "mini-btn", "Client Analysis");
  summary.onclick = () => openCurrentClientSummary();
  bar.appendChild(summary);
  return bar;
}

function renderCard(session, sessionRef, partnerKey, partnerLabel) {
  const card = el("div", "card");

  // header
  const head = el("div", "card-head");
  if (partnerLabel) {
    const pl = el("div");
    pl.style.cssText = "font-family:var(--mono);font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:var(--tan);margin-bottom:6px;font-weight:600";
    pl.textContent = partnerLabel;
    head.appendChild(pl);
  }
  head.appendChild(el("div", "ch-goal", session.goalLabel));
  const meta = el("div", "ch-meta");
  const sp = session.spec;
  meta.innerHTML =
    (sp.client ? "<span>Client <b>" + escapeHtml(sp.client) + "</b></span>" : "") +
    "<span><b>" + EXP_LABEL(sp.experience) + "</b></span>" +
    "<span>Age <b>" + sp.age + "</b></span>" +
    "<span><b>" + sp.minutes + " min</b></span>" +
    (sp.muscles && sp.muscles.length ? "<span>Target: <b>" + sp.muscles.map((m) => MUSCLE_LABELS[m]).join(", ") + "</b></span>" : "") +
    (sp.injuries.length ? "<span>Limits: <b>" + sp.injuries.map((t) => INJURY_LABELS[t]).join(", ") + "</b></span>" : "") +
    (sp.zones.length ? "<span>Zones: <b>" + sp.zones.map((z) => ZONE_LABELS[z]).join(", ") + "</b></span>" : "");
  head.appendChild(meta);
  head.appendChild(el("div", "ch-why", session.rationale));
  const approval = session.approval || { status:"draft" }, status = el("div","draft-status " + (approval.status === "approved" ? "approved" : "draft"));
  status.append(el("b","",approval.status === "approved" ? "Coach approved" : "Draft · coach approval required"),el("span","",approval.status === "approved" ? "Approved " + new Date(approval.approvedAt).toLocaleString() : "Generated workouts cannot be assigned until the coach reviews the quality audit."));
  head.appendChild(status);
  if (session.audit) {
    const audit = el("details","quality-audit"), summary = el("summary","",(session.audit.pass ? "Quality audit passed" : "Quality audit needs review") + " · " + session.audit.score + "/100"), grid = el("div","audit-grid");
    session.audit.detail.forEach((item) => { const cell = el("div","audit-cell"); cell.append(el("span","",item.label),el("b","",item.score + "/" + item.max)); grid.appendChild(cell); });
    audit.append(summary,grid); if (session.audit.safety.length) audit.appendChild(el("div","caution",session.audit.safety.join(" · "))); head.appendChild(audit);
  }
  card.appendChild(head);

  // prescription strip
  const rx = session.prescription;
  const strip = el("div", "rx-strip");
  [["Sets", rx.sets], ["Reps", rx.reps], ["Rest", rx.rest], ["Tempo", rx.tempo], ["Effort", rx.rpe]].forEach(([k, v]) => {
    const cell = el("div", "rx-cell");
    cell.appendChild(el("div", "rx-k", k));
    cell.appendChild(el("div", "rx-v", v));
    strip.appendChild(cell);
  });
  card.appendChild(strip);

  // body: blocks
  const body = el("div", "card-body");
  session.blocks.forEach((block, bi) => {
    body.appendChild(renderBlock(session, block, bi, sessionRef, partnerKey));
  });

  // cautions
  sp.injuries.forEach((tag) => {
    const c = el("div", "caution");
    c.appendChild(el("div", "cx-i", "\u26a0\ufe0f"));
    const t = el("div", "cx-t");
    t.innerHTML = "<b>" + escapeHtml(INJURY_LABELS[tag] || tag) + ":</b> " + escapeHtml(CAUTION_TEXT[tag] || "The universal safety filter removes exercises whose movement demands conflict with this reported restriction. Recheck symptoms and technique before progressing.");
    c.appendChild(t);
    body.appendChild(c);
  });

  card.appendChild(body);
  return card;
}

function renderBlock(session, block, bi, sessionRef, partnerKey) {
  const wrap = el("div", "block");
  const head = el("div", "block-head");
  head.appendChild(el("div", "block-idx", String(bi + 1)));
  head.appendChild(el("div", "block-title", block.title));
  if (block.circuit) head.appendChild(el("span", "circuit-tag", "Circuit"));
  if (block.rx) head.appendChild(el("div", "block-note", block.rx.sets + " \u00d7 " + block.rx.reps + (block.rx.rest && block.rx.rest !== "minimal" ? " \u00b7 rest " + block.rx.rest : "")));
  else if (block.note) head.appendChild(el("div", "block-note", block.note));
  if (portalRole !== "client") {
    const reorder = el("div","block-reorder"), up = el("button","block-move","\u2191"), down = el("button","block-move","\u2193");
    up.type = down.type = "button"; up.title = "Move this workout phase earlier"; down.title = "Move this workout phase later";
    up.setAttribute("aria-label","Move " + block.title + " earlier"); down.setAttribute("aria-label","Move " + block.title + " later");
    up.disabled = bi === 0; down.disabled = bi === session.blocks.length - 1;
    up.onclick = () => moveBlock(session,bi,bi - 1,sessionRef,partnerKey); down.onclick = () => moveBlock(session,bi,bi + 1,sessionRef,partnerKey);
    reorder.append(up,down); head.appendChild(reorder);
  }
  wrap.appendChild(head);
  if (portalRole !== "client" && session.blocks.reduce((sum,item) => sum + (item.items || []).length,0) > 1) {
    const tools = el("div","block-superset-tools"), copy = el("span","","Optional paired block for this section"), actions = el("div","tool-actions"), create = el("button","small-btn","Create a superset");
    create.type = "button"; create.onclick = () => openSupersetEditor(session,block,bi,sessionRef,partnerKey); actions.appendChild(create);
    if ((block.groups || []).some((group) => group.type === "superset")) { const clear = el("button","small-btn","Clear supersets"); clear.type = "button"; clear.onclick = () => clearBlockSupersets(session,block); actions.appendChild(clear); }
    tools.append(copy,actions); wrap.appendChild(tools);
  }

  // Render by superset groups when present, else a flat list. Each exercise
  // keeps its real index in block.items so swap/remove still target correctly.
  const groups = block.groups && block.groups.length
    ? block.groups
    : block.items.map((e) => ({ type: "straight", items: [e] }));

  groups.forEach((group) => {
    if (group.type === "superset" && group.items.length === 2) {
      const ss = el("div", "ss-group");
      const label = el("div", "ss-label");
      label.innerHTML = "&#8644; Superset available &middot; A1 + A2 &middot; " + (group.station || "one station");
      ss.appendChild(label);
      group.items.forEach((ex,groupIndex) => {
        const ei = block.items.indexOf(ex);
        ss.appendChild(el("span","ss-letter","A" + (groupIndex + 1)));
        ss.appendChild(renderExercise(session, block, bi, ei, ex, sessionRef, partnerKey));
      });
      const note = el("div", "ss-note", "Optional: alternate A1 then A2 before resting, or complete normal straight sets. Use the option that keeps form and equipment use comfortable.");
      ss.appendChild(note);
      wrap.appendChild(ss);
    } else {
      const ex = group.items[0];
      const ei = block.items.indexOf(ex);
      wrap.appendChild(renderExercise(session, block, bi, ei, ex, sessionRef, partnerKey));
    }
  });

  if (session.manual && !block.items.length) wrap.appendChild(el("div","empty-state","No movement added to this phase yet."));

  // Generated warm-ups stay curated. A from-scratch workout lets the coach
  // deliberately fill every phase, including warm-up and cool-down.
  if ((block.key !== "warmup" || session.manual) && portalRole !== "client") {
    const add = el("button", "add-ex", "+ Add exercise");
    add.onclick = () => addExercise(session, block, sessionRef, partnerKey, add);
    wrap.appendChild(add);
  }
  return wrap;
}

let supersetEditorContext = null;
function blockGroupPairs(block,excludedNames) {
  const excluded = new Set(excludedNames || []);
  return (block.groups || []).filter((group) => group.type === "superset" && (group.items || []).length === 2 && group.items.every((item) => (block.items || []).some((exercise) => exercise.name === item.name) && !excluded.has(item.name))).map((group) => group.items.map((item) => (block.items || []).find((exercise) => exercise.name === item.name)));
}
function rebuildBlockGroups(block,forcedPair,excludedNames) {
  const pairs = blockGroupPairs(block,excludedNames);
  if (forcedPair && forcedPair.length === 2) pairs.unshift(forcedPair);
  const pairByName = new Map(), emitted = new Set();
  pairs.forEach((pair) => pair.forEach((item) => pairByName.set(item.name,pair)));
  block.groups = [];
  (block.items || []).forEach((item) => {
    const pair = pairByName.get(item.name);
    if (pair) {
      const key = pair.map((exercise) => exercise.name).join("::"); if (emitted.has(key)) return; emitted.add(key);
      block.groups.push({type:"superset",items:pair,station:pair[0].zone === pair[1].zone ? ZONE_LABELS[pair[0].zone] || pair[0].zone : "coach-selected stations",manual:true});
    } else block.groups.push({type:"straight",items:[item]});
  });
}
function openSupersetEditor(session,block,bi,sessionRef,partnerKey,renderMode) {
  if (!requireTrainerMutation("create supersets")) return false;
  const first = byId("supersetFirst"), second = byId("supersetSecond"); if (!first || !second || !block.items.length) return false;
  supersetEditorContext = {session,block,bi,sessionRef,partnerKey,renderMode:renderMode || "workout"};
  byId("supersetProgramFields").hidden = renderMode !== "program"; byId("supersetProgramClearBtn").hidden = renderMode !== "program" || !blockGroupPairs(block).length;
  if (renderMode === "program") { byId("supersetProgramScope").value = "single"; byId("supersetProgramReason").value = ""; }
  first.innerHTML = block.items.map((exercise,index) => '<option value="' + index + '">' + escapeHtml(exercise.name) + '</option>').join("");
  second.innerHTML = session.blocks.flatMap((candidateBlock,blockIndex) => (candidateBlock.items || []).map((exercise,exerciseIndex) => '<option value="' + blockIndex + '::' + exerciseIndex + '">' + escapeHtml(candidateBlock.title) + ' · ' + escapeHtml(exercise.name) + '</option>')).join("");
  first.value = "0";
  const defaultSecond = session.blocks.flatMap((candidateBlock,blockIndex) => (candidateBlock.items || []).map((exercise,exerciseIndex) => ({value:blockIndex + "::" + exerciseIndex,exercise}))).find((item) => item.exercise !== block.items[0]);
  if (defaultSecond) second.value = defaultSecond.value;
  paintSupersetEditorWarning(); byId("supersetEditorModal").classList.add("open"); return true;
}
function supersetEditorExercises() {
  if (!supersetEditorContext) return {};
  const firstIndex = Number(byId("supersetFirst").value), secondParts = String(byId("supersetSecond").value).split("::").map(Number), sourceBlock = supersetEditorContext.session.blocks[secondParts[0]];
  return {firstIndex,first:supersetEditorContext.block.items[firstIndex],sourceBlock,sourceBlockIndex:secondParts[0],secondIndex:secondParts[1],second:sourceBlock && sourceBlock.items[secondParts[1]]};
}
function paintSupersetEditorWarning() {
  const out = byId("supersetEditorWarning"), data = supersetEditorExercises(); if (!out || !data.first || !data.second) return;
  if (data.first === data.second) out.textContent = "Choose two different movements.";
  else if (data.first.primary && data.second.primary) out.textContent = "Two primary lifts should not be paired. Keep one fresh and choose a supporting movement.";
  else if (data.first.zone !== data.second.zone && data.first.zone !== "bodyweight" && data.second.zone !== "bodyweight") out.textContent = "Coach caution: this pairing uses two equipment areas. Confirm the gym floor is quiet enough before assigning it.";
  else if (data.sourceBlock !== supersetEditorContext.block) out.textContent = data.second.name + " will move from " + data.sourceBlock.title + " into " + supersetEditorContext.block.title + " as A2.";
  else out.textContent = "A1 and A2 will stay together in this section. Clients may use the superset or complete straight sets.";
}
function saveSupersetEditor() {
  const context = supersetEditorContext, data = supersetEditorExercises(); if (!context || !data.first || !data.second) return false;
  if (data.first === data.second) { showToast("Choose two different movements"); return false; }
  if (data.first.primary && data.second.primary) { showToast("Keep primary lifts separate and choose a supporting movement for A2"); return false; }
  const firstName = data.first.name, secondName = data.second.name, targetKey = context.block.key, sourceKey = data.sourceBlock.key;
  if (context.renderMode === "program" && !byId("supersetProgramReason").value.trim()) { showToast("Add a coach reason before changing a program pairing"); return false; }
  const target = context.block, source = data.sourceBlock, excluded = [firstName,secondName];
  if (source !== target) {
    source.items.splice(data.secondIndex,1); rebuildBlockGroups(source,null,[data.second.name]);
    const firstPosition = target.items.indexOf(data.first); target.items.splice(firstPosition + 1,0,data.second);
  } else {
    target.items = target.items.filter((item) => item !== data.first && item !== data.second);
    const insertAt = Math.min(data.firstIndex,target.items.length); target.items.splice(insertAt,0,data.first,data.second);
  }
  rebuildBlockGroups(target,[data.first,data.second],excluded);
  markSessionDraft(context.session,"Superset pairing changed by coach");
  if (context.renderMode === "program" && currentProgram) {
    const scope = byId("supersetProgramScope").value || "single", reason = byId("supersetProgramReason").value.trim(); let changed = 1;
    programWeekIndexesForScope(context.weekIndex,scope).filter((weekIndex) => weekIndex !== context.weekIndex).forEach((weekIndex) => {
      const day = currentProgram.weeks[weekIndex] && currentProgram.weeks[weekIndex].days[context.dayIndex], blocks = day && day.session && day.session.blocks || [], destination = blocks.find((block) => block.key === targetKey), origin = blocks.find((block) => block.key === sourceKey), first = destination && destination.items.find((exercise) => exercise.name === firstName), second = origin && origin.items.find((exercise) => exercise.name === secondName);
      if (!destination || !origin || !first || !second || first === second) return;
      if (origin !== destination) { origin.items.splice(origin.items.indexOf(second),1); rebuildBlockGroups(origin,null,[secondName]); destination.items.splice(destination.items.indexOf(first) + 1,0,second); }
      else { destination.items = destination.items.filter((item) => item !== first && item !== second); destination.items.splice(Math.min(data.firstIndex,destination.items.length),0,first,second); }
      rebuildBlockGroups(destination,[first,second],[firstName,secondName]); markSessionDraft(day.session,"Superset pairing changed by coach"); changed += 1;
    });
    if (scope === "future" && currentProgram.setup && currentProgram.setup.profileId) {
      const profiles = loadProfiles(), index = profiles.findIndex((profile) => profile.id === currentProgram.setup.profileId);
      if (index >= 0) { profiles[index].programSupersetDefaults = {...(profiles[index].programSupersetDefaults || {}),[targetKey]:[firstName,secondName]}; profiles[index].updatedAt = new Date().toISOString(); if (!writeProfiles(profiles)) return false; }
    }
    appendProgramEditAudit({type:"superset",scope,reason,first:firstName,second:secondName,targets:changed});
    currentProgram.lifecycle = "draft";
    currentProgram.approval = {status:"draft",required:true,changedAt:new Date().toISOString(),changeReason:"Superset pairing changed by coach"};
    byId("programApproveBtn").disabled = false; byId("programSaveBtn").disabled = true; byId("programSaveOnlyBtn").disabled = true;
  }
  closeSupersetEditor();
  if (context.renderMode === "program") renderProgram(); else renderOutput();
  showToast(firstName + " + " + secondName + " paired as A1/A2"); return true;
}
function clearProgramSupersetsFromEditor() {
  const context = supersetEditorContext; if (!context || context.renderMode !== "program" || !currentProgram) return false;
  const scope = byId("supersetProgramScope").value || "single", reason = byId("supersetProgramReason").value.trim(); if (!reason) { showToast("Add a coach reason before clearing a program pairing"); return false; }
  let changed = 0;
  programWeekIndexesForScope(context.weekIndex,scope).forEach((weekIndex) => {
    const day = currentProgram.weeks[weekIndex] && currentProgram.weeks[weekIndex].days[context.dayIndex], blocks = day && day.session && day.session.blocks || [], block = blocks.find((item) => item.key === context.block.key); if (!block || !blockGroupPairs(block).length) return;
    block.groups = (block.items || []).map((item) => ({type:"straight",items:[item]})); markSessionDraft(day.session,"Superset pairing cleared by coach"); changed += 1;
  });
  if (scope === "future" && currentProgram.setup && currentProgram.setup.profileId) {
    const profiles = loadProfiles(), index = profiles.findIndex((profile) => profile.id === currentProgram.setup.profileId);
    if (index >= 0) {
      const defaults = {...(profiles[index].programSupersetDefaults || {})};
      delete defaults[context.block.key]; profiles[index].programSupersetDefaults = defaults; profiles[index].updatedAt = new Date().toISOString();
      if (!writeProfiles(profiles)) { showToast("The future superset default could not be saved. Keep this editor open and try again."); return false; }
    }
  }
  if (!changed) { showToast("No matching supersets were found in that scope"); return false; }
  appendProgramEditAudit({type:"superset_clear",scope,reason,phase:context.block.title,targets:changed}); markCurrentProgramDraft("Superset pairing cleared by coach"); closeSupersetEditor(); renderProgram(); showToast("Pairing cleared in " + changed + " workout" + (changed === 1 ? "" : "s")); return true;
}
function clearBlockSupersets(session,block,renderMode) {
  if (!requireTrainerMutation("clear supersets")) return false;
  block.groups = (block.items || []).map((item) => ({type:"straight",items:[item]})); markSessionDraft(session,"Supersets cleared by coach");
  if (renderMode === "program" && currentProgram) {
    currentProgram.lifecycle = "draft";
    currentProgram.approval = {status:"draft",required:true,changedAt:new Date().toISOString(),changeReason:"Supersets cleared by coach"};
    byId("programApproveBtn").disabled = false; byId("programSaveBtn").disabled = true; byId("programSaveOnlyBtn").disabled = true; renderProgram();
  } else renderOutput();
  showToast("Supersets cleared from " + block.title); return true;
}
function closeSupersetEditor() { const modal = byId("supersetEditorModal"); if (modal) modal.classList.remove("open"); supersetEditorContext = null; }

function noteId(session, bi, ei, partnerKey) { return (partnerKey || "s") + ":" + bi + ":" + ei; }

function moveBlock(session, from, to, sessionRef, partnerKey) {
  if (!session || !session.blocks || from < 0 || to < 0 || from >= session.blocks.length || to >= session.blocks.length || from === to) return false;
  const prefix = (partnerKey || "s") + ":", edits = sessionRef && sessionRef.edits || {}, notesByBlock = session.blocks.map((block,bi) => block.items.map((_,ei) => edits[noteId(null,bi,ei,partnerKey)]));
  const moved = session.blocks.splice(from,1)[0], movedNotes = notesByBlock.splice(from,1)[0]; session.blocks.splice(to,0,moved); notesByBlock.splice(to,0,movedNotes);
  Object.keys(edits).forEach((key) => { if (key.startsWith(prefix)) delete edits[key]; });
  notesByBlock.forEach((notes,bi) => notes.forEach((value,ei) => { if (value) edits[noteId(null,bi,ei,partnerKey)] = value; }));
  markSessionDraft(session,"Workout phase order changed"); renderOutput();
  showToast(sessionBlockOrderIsValid(session) ? moved.title + " moved" : moved.title + " moved · review the session-order audit before approval");
  return true;
}

function plannedRepTarget(rx) {
  const match = String(rx && rx.reps || "").match(/\d+/); return match ? Number(match[0]) : null;
}
function recommendedLoadFor(client, exercise, rx) {
  const entries = loadProgress().filter((item) => item.type === "set" && clientMatches(item.client,client) && item.label === exercise.name && item.data && Number(item.data.load) > 0 && ["lb","kg"].includes(item.data.unit));
  if (!entries.length) return { load:null,unit:"lb",label:"Establish a baseline",note:"No load history yet. Start with a form-first weight that leaves the prescribed reps in reserve; the next workout will use it for a recommendation." };
  const last = entries[0].data, targetReps = plannedRepTarget(rx), completedReps = Number(last.reps);
  let load = Number(last.load);
  if (targetReps && completedReps) load = load * (1 + completedReps / 30) / (1 + targetReps / 30);
  if (Number(last.rpe) <= 7) load *= 1.025;
  else if (Number(last.rpe) >= 9) load *= .975;
  const step = last.unit === "kg" ? 2.5 : load <= 50 ? 2.5 : 5;
  load = Math.max(step,Math.round(load / step) * step);
  const profile = loadProfiles().find((item) => clientMatches(item.name,client)), baselineVerified = Boolean(last.calibration && profile && baselineCanTailor(profile));
  return { load,unit:last.unit,label:load + " " + last.unit,note:(baselineVerified ? "Based on coach-verified calibration" : "Based on the latest logged set") + (completedReps ? " of " + completedReps + " reps" : "") + ". Confirm it during warm-up and adjust if form, pain, or readiness changes." };
}
function effortSelect(exerciseName, value) {
  const select = document.createElement("select"); select.setAttribute("aria-label",exerciseName + " effort");
  [["","RPE optional"],[6,"6 · easy"],[7,"7 · 3 left"],[8,"8 · 2 left"],[9,"9 · 1 left"],[10,"10 · max"]].forEach(([optionValue,text]) => { const option = document.createElement("option"); option.value = optionValue; option.textContent = text; select.appendChild(option); });
  if (value != null) select.value = String(value); return select;
}

let prescriptionEditContext = null;
function openPrescriptionEditor(session,block,bi,ei,sessionRef,partnerKey) {
  if (!requireTrainerMutation("edit workout prescriptions")) return false;
  const exercise = block && block.items && block.items[ei]; if (!exercise) return false;
  const rx = exercise.rx || block.rx || session.prescription || {};
  prescriptionEditContext = {session,block,bi,ei,sessionRef,partnerKey};
  byId("prescriptionEditorTitle").textContent = "Edit " + exercise.name;
  byId("prescriptionSets").value = parseInt(rx.sets,10) || 1;
  byId("prescriptionReps").value = rx.reps || "";
  byId("prescriptionTempo").value = rx.tempo || "";
  byId("prescriptionRest").value = rx.rest || "";
  byId("prescriptionEffort").value = rx.rpe || "";
  byId("prescriptionLoad").value = rx.load || rx.targetLoad || "";
  byId("prescriptionCue").value = exercise.cue || "";
  byId("prescriptionReason").value = "";
  byId("prescriptionScope").value = "single";
  byId("prescriptionScope").disabled = true;
  byId("prescriptionScopeField").style.display = "grid";
  byId("programPrescriptionStructureActions").hidden = true;
  byId("prescriptionCalibrationField").style.display = exercise.baselineRequired || exercise.baselineDomains && exercise.baselineDomains.length ? "grid" : "none";
  byId("prescriptionCalibration").value = "keep";
  byId("prescriptionEditorModal").classList.add("open");
  return true;
}
function closePrescriptionEditor() { prescriptionEditContext = null; const modal = byId("prescriptionEditorModal"); if (modal) modal.classList.remove("open"); }
function replaceFromPrescriptionEditor() {
  if (!prescriptionEditContext) return false;
  const context = prescriptionEditContext, exercise = context.block && context.block.items && context.block.items[context.ei];
  if (!exercise) return false;
  closePrescriptionEditor();
  if (context.renderMode === "program") return openProgramExerciseSwap(context.weekIndex,context.dayIndex,context.blockIndex,context.ei);
  return openExerciseSwap(context.session,context.block,context.ei,exercise);
}
function clearCalibrationResponsibility(exercise) {
  ["baselineDomains","baselineRequired","baselinePlanId","baselineSessionNumber","baselineProtocol","baselineMeasure","baselineMeasureLabel"].forEach((key) => delete exercise[key]);
  return exercise;
}
function calibrationResponsibility(exercise) {
  return exercise && (exercise.baselineRequired || exercise.baselineDomains && exercise.baselineDomains.length) ? {
    baselineRequired:Boolean(exercise.baselineRequired),baselineDomains:[...(exercise.baselineDomains || [])],baselinePlanId:exercise.baselinePlanId,baselineSessionNumber:exercise.baselineSessionNumber,baselineProtocol:exercise.baselineProtocol,baselineMeasure:exercise.baselineMeasure,baselineMeasureLabel:exercise.baselineMeasureLabel,
  } : null;
}
function restoreCalibrationResponsibility(exercise,responsibility) {
  if (!exercise || !responsibility) return exercise;
  Object.entries(responsibility).forEach(([key,value]) => { if (value != null) exercise[key] = Array.isArray(value) ? [...value] : value; });
  return exercise;
}
function programWeekIndexesForScope(startWeek,scope) {
  if (!currentProgram || !Array.isArray(currentProgram.weeks)) return [];
  if (scope === "single") return [Number(startWeek)];
  return currentProgram.weeks.map((_,index) => index).filter((index) => scope === "all" || scope === "future" || index >= Number(startWeek));
}
function programExerciseTargets(context,scope) {
  if (!currentProgram || !context) return [];
  /* Older saved editors and the QA harness use `exerciseIndex`; current
     editors use `ei`. Accept both so a replacement always points at the
     visible row instead of reporting success without mutating the program. */
  const contextExerciseIndex = Number.isInteger(Number(context.ei)) && Number(context.ei) >= 0 ? Number(context.ei) : Number(context.exerciseIndex);
  const original = context.block && context.block.items && context.block.items[contextExerciseIndex], originalName = original && original.name;
  const results = [];
  programWeekIndexesForScope(context.weekIndex,scope).forEach((weekIndex) => {
    const day = currentProgram.weeks[weekIndex] && currentProgram.weeks[weekIndex].days[context.dayIndex], blocks = day && day.session && day.session.blocks || [];
    const preferred = blocks[context.blockIndex]; let block = preferred, exerciseIndex = -1;
    if (weekIndex === Number(context.weekIndex) && preferred && preferred.items && preferred.items[contextExerciseIndex]) exerciseIndex = contextExerciseIndex;
    else {
      const candidates = [preferred,...blocks.filter((candidate,index) => index !== Number(context.blockIndex) && context.block && candidate && (candidate.key === context.block.key || candidate.title === context.block.title))].filter(Boolean);
      for (const candidate of candidates) { const index = (candidate.items || []).findIndex((exercise) => exercise && exercise.name === originalName); if (index >= 0) { block = candidate; exerciseIndex = index; break; } }
    }
    if (day && block && exerciseIndex >= 0 && block.items[exerciseIndex]) results.push({weekIndex,day,session:day.session,block,exerciseIndex,exercise:block.items[exerciseIndex]});
  });
  return results;
}
function appendProgramEditAudit(entry) {
  if (!currentProgram) return;
  currentProgram.editAudit = [{id:"edit-" + Date.now() + "-" + Math.random().toString(16).slice(2),at:new Date().toISOString(),by:currentAccountIdentity().displayName,...entry},...(currentProgram.editAudit || [])].slice(0,100);
}
function savePrescriptionEditor() {
  if (!prescriptionEditContext || !requireTrainerMutation("edit workout prescriptions")) return false;
  const sets = Math.max(1,Math.min(12,parseInt(byId("prescriptionSets").value,10) || 1));
  const reps = byId("prescriptionReps").value.trim(), tempo = byId("prescriptionTempo").value.trim(), rest = byId("prescriptionRest").value.trim(), rpe = byId("prescriptionEffort").value.trim(), load = byId("prescriptionLoad").value.trim(), cue = byId("prescriptionCue").value.trim(), reason = byId("prescriptionReason").value.trim();
  if (!reps) { showToast("Enter reps or a duration"); return false; }
  const {session,block,ei,renderMode} = prescriptionEditContext, exercise = block.items[ei], calibrationAction = byId("prescriptionCalibration").value;
  if (calibrationAction === "remove" && !reason) { showToast("Document why this calibration measure is being removed"); return false; }
  const rx = { ...(exercise.rx || block.rx || session.prescription || {}),sets:String(sets),reps,tempo:tempo || "controlled",rest:rest || "as needed",rpe:rpe || "coach set" };
  if (load) rx.load = load; else delete rx.load;
  if (renderMode === "program" && currentProgram) {
    const scope = byId("prescriptionScope").value || "single", targets = programExerciseTargets(prescriptionEditContext,scope);
    targets.forEach((target) => { target.exercise.rx = {...rx}; target.exercise.cue = cue; if (calibrationAction === "remove") clearCalibrationResponsibility(target.exercise); rebuildBlockGroups(target.block); enrichSessionMetadata(target.session); markSessionDraft(target.session,"Exercise prescription edited by coach"); });
    if (!targets.length) { showToast("No matching program exercises were found for that scope"); return false; }
    if (scope === "future" && currentProgram.setup && currentProgram.setup.profileId) {
      const profiles = loadProfiles(), index = profiles.findIndex((profile) => profile.id === currentProgram.setup.profileId);
      if (index >= 0) { profiles[index].exercisePrescriptions = {...(profiles[index].exercisePrescriptions || {}),[exerciseId(exercise)]:{...rx,cue}}; profiles[index].updatedAt = new Date().toISOString(); if (!writeProfiles(profiles)) return false; currentProgram.setup.exercisePrescriptions = {...(currentProgram.setup.exercisePrescriptions || {}),[exerciseId(exercise)]:{...rx,cue}}; }
    }
    appendProgramEditAudit({type:"prescription",exercise:exercise.name,scope,reason:reason || "Prescription updated",calibrationAction,targets:targets.length});
    markCurrentProgramDraft("Exercise prescription edited by coach");
    closePrescriptionEditor(); renderProgram(); showToast(exercise.name + " updated in " + targets.length + " workout" + (targets.length === 1 ? "" : "s")); return true;
  }
  exercise.rx = rx; exercise.cue = cue; if (calibrationAction === "remove") clearCalibrationResponsibility(exercise);
  markSessionDraft(session,"Prescription edited"); closePrescriptionEditor(); renderOutput(); showToast(exercise.name + " prescription updated"); return true;
}
function applyProgramExerciseStructureAction(action) {
  if (!prescriptionEditContext || prescriptionEditContext.renderMode !== "program" || !currentProgram || !requireTrainerMutation("change program exercise structure")) return false;
  const scope = byId("prescriptionScope").value || "single", reason = byId("prescriptionReason").value.trim(), calibrationAction = byId("prescriptionCalibration").value;
  if (!reason) { showToast("Add a coach reason before moving or removing this exercise"); return false; }
  const original = prescriptionEditContext.block.items[prescriptionEditContext.ei], targets = programExerciseTargets(prescriptionEditContext,scope); if (!targets.length) { showToast("No matching program exercises were found for that scope"); return false; }
  if (action === "remove" && targets.some((target) => calibrationResponsibility(target.exercise)) && calibrationAction !== "remove") { showToast("Choose ‘Remove the calibration measure’ and document why before deleting a calibration anchor"); return false; }
  let changed = 0;
  targets.forEach((target) => {
    const from = target.exerciseIndex, to = action === "up" ? from - 1 : from + 1;
    if (action === "remove") { target.block.items.splice(from,1); changed += 1; }
    else if (to >= 0 && to < target.block.items.length) { const [moved] = target.block.items.splice(from,1); target.block.items.splice(to,0,moved); changed += 1; }
    rebuildBlockGroups(target.block); enrichSessionMetadata(target.session); markSessionDraft(target.session,"Program exercise " + action + " by coach");
  });
  if (!changed) { showToast(action === "remove" ? "Exercise could not be removed" : "Exercise is already at that edge of the phase"); return false; }
  if (scope === "future" && currentProgram.setup && currentProgram.setup.profileId && original) {
    const profiles = loadProfiles(), index = profiles.findIndex((profile) => profile.id === currentProgram.setup.profileId);
    if (index >= 0) {
      if (action === "remove") profiles[index].exerciseExclusions = [...new Set([...(profiles[index].exerciseExclusions || []),exerciseId(original)])];
      else profiles[index].programExerciseOrderDefaults = {...(profiles[index].programExerciseOrderDefaults || {}),[prescriptionEditContext.block.key]:(prescriptionEditContext.block.items || []).map((exercise) => exerciseId(exercise))};
      profiles[index].updatedAt = new Date().toISOString(); if (!writeProfiles(profiles)) return false;
    }
  }
  appendProgramEditAudit({type:"exercise_structure",action,exercise:original && original.name || "Exercise",scope,reason,calibrationAction,targets:changed});
  markCurrentProgramDraft("Exercise structure changed by coach"); closePrescriptionEditor(); renderProgram(); showToast((original && original.name || "Exercise") + " " + (action === "remove" ? "removed from" : "moved in") + " " + changed + " workout" + (changed === 1 ? "" : "s")); return true;
}

function renderExercise(session, block, bi, ei, ex, sessionRef, partnerKey) {
  const row = el("div", "ex");
  const main = el("div", "ex-main");
  const top = el("div", "ex-top");
  top.appendChild(el("div", "ex-name", ex.name));
  top.appendChild(el("div", "ex-zone", ZONE_LABELS[ex.zone] || ex.zone));
  main.appendChild(top);

  if (ex.warmupStage && WARMUP_STAGE_DETAILS[ex.warmupStage]) {
    const stage = el("div","warmup-stage");
    stage.append(el("b","",ex.warmupStageLabel || WARMUP_STAGE_DETAILS[ex.warmupStage].label),el("span","",ex.warmupStageExplanation || WARMUP_STAGE_DETAILS[ex.warmupStage].explanation));
    main.appendChild(stage);
  }

  // per-exercise prescription: the headline numbers the trainer calls out
  const rx = ex.rx || (block.rx || null);
  if (rx) {
    const rxLine = el("div", "ex-rx");
    const setsReps = el("span", "ex-rx-main", rx.sets + " \u00d7 " + rx.reps);
    rxLine.appendChild(setsReps);
    if (rx.rest && rx.rest !== "minimal") {
      rxLine.appendChild(el("span", "ex-rx-rest", "rest " + rx.rest));
    }
    if (rx.tempo) rxLine.appendChild(el("span","ex-rx-rest","tempo " + rx.tempo));
    main.appendChild(rxLine);
  }

  if (ex.cue) main.appendChild(el("div", "ex-cue", ex.cue));
  if (ex.purpose) main.appendChild(el("div","exercise-purpose","Why it is here · " + ex.purpose));
  if (ex.progressionGuidance && ex.position === "primary") main.appendChild(el("div","progression-note",ex.progressionGuidance));

  const note = document.createElement("input");
  note.className = "ex-note-input";
  note.placeholder = "Coaching notes\u2026";
  const nid = noteId(session, bi, ei, partnerKey);
  if (sessionRef.edits && sessionRef.edits[nid]) note.value = sessionRef.edits[nid];
  note.addEventListener("input", () => {
  if (!sessionRef.edits) sessionRef.edits = {};
    sessionRef.edits[nid] = note.value;
  });

  if (!["warmup", "mobility"].includes(block.key)) {
    const panel = el("div", "ex-log-panel");
    const bodyweightOnly = ex.zone === "bodyweight" && !/^Weighted\b/i.test(ex.name), cardioOnly = ex.zone === "cardio" || ex.region === "cardio";
    if (bodyweightOnly || cardioOnly) panel.classList.add("bodyweight-log");
    const plannedSets = Math.max(1,Math.min(10,rx ? parseInt(rx.sets,10) || 1 : 1));
    const existingSets = getSessionSets(session.sessionId,ex.name).slice().sort((a,b) => new Date(a.date || 0) - new Date(b.date || 0));
    const latest = latestSetFor(session.spec.client,ex.name), recommendation = !bodyweightOnly && !cardioOnly ? recommendedLoadFor(session.spec.client,ex,rx) : null;
    const logHead = el("div", "ex-log-head");
    const progress = el("div", "set-progress", "Log each planned set");
    const last = el("div", "last-set", latest ? "Last: " + (latest.unit === "session" ? (latest.reps == null ? "cardio effort" : latest.reps + " min / distance") : (latest.load == null ? (latest.unit === "bodyweight" ? "BW" : "—") : latest.load + " " + latest.unit) + (latest.reps == null ? "" : " × " + latest.reps)) : "No previous set");
    logHead.append(progress, last); panel.appendChild(logHead);
    if (recommendation) {
      const recommended = el("div","load-recommendation"); recommended.append(el("span","","Recommended working load"),el("b","",recommendation.label),el("small","",recommendation.note)); panel.appendChild(recommended);
    }
    const field = (labelText, control) => {
      const wrap = el("div", "ex-log-field");
      wrap.append(el("label", "", labelText), control); return wrap;
    };
    const list = el("div","set-log-list"), targetReps = plannedRepTarget(rx);
    for (let setIndex = 0; setIndex < plannedSets; setIndex += 1) {
      const saved = existingSets[setIndex] || null, data = saved && saved.data || {}, row = el("div","set-log-row" + (bodyweightOnly ? " bodyweight" : cardioOnly ? " cardio" : ""));
      row.appendChild(el("div","set-number","Set " + (setIndex + 1)));
      const load = document.createElement("input"); load.type = "number"; load.min = "0"; load.step = "0.5"; load.inputMode = "decimal"; load.placeholder = recommendation && recommendation.load ? String(recommendation.load) : "Weight"; load.setAttribute("aria-label",ex.name + " set " + (setIndex + 1) + " weight");
      const reps = document.createElement("input"); reps.type = "number"; reps.min = "0"; reps.max = "999"; reps.inputMode = "decimal"; reps.placeholder = targetReps ? String(targetReps) : cardioOnly ? "Minutes / distance" : "Reps"; reps.setAttribute("aria-label",ex.name + " set " + (setIndex + 1) + " completed reps or duration");
      const unit = document.createElement("select"); unit.setAttribute("aria-label",ex.name + " set " + (setIndex + 1) + " weight unit");
      [["lb","lb"],["kg","kg"],["bodyweight","BW"],["session","Cardio"]].forEach(([value,text]) => { const option = document.createElement("option"); option.value = value; option.textContent = text; unit.appendChild(option); });
      const rpe = effortSelect(ex.name + " set " + (setIndex + 1),data.rpe);
      if (saved) { load.value = bodyweightOnly || cardioOnly ? "" : (data.load == null ? "" : data.load); reps.value = data.reps == null ? "" : data.reps; unit.value = data.unit || (cardioOnly ? "session" : bodyweightOnly ? "bodyweight" : "lb"); }
      else { if (recommendation && recommendation.load) load.value = recommendation.load; if (targetReps) reps.value = targetReps; unit.value = cardioOnly ? "session" : bodyweightOnly ? "bodyweight" : recommendation && recommendation.unit || latest && latest.unit || "lb"; }
      let savedEntryId = saved && saved.id;
      const log = el("button","log-set-btn",saved ? "Update" : "Save"); log.type = "button";
      const status = el("div","set-row-status",saved ? "Saved · edit any number and update" : "Not saved yet"); status.setAttribute("aria-live","polite");
      log.onclick = () => {
        const savedEntry = logExerciseSet(session,ex,load,reps,unit,rpe,setIndex + 1,savedEntryId);
        if (savedEntry) { savedEntryId = savedEntry.id; log.textContent = "Update"; status.textContent = "Saved just now"; }
      };
      [load,reps].forEach((input) => input.addEventListener("keydown",(event) => { if (event.key === "Enter") log.click(); }));
      if (cardioOnly) row.append(field("Minutes / distance",reps),field("Effort",rpe),log,status);
      else if (bodyweightOnly) row.append(field("Reps / seconds",reps),field("Effort",rpe),log,status);
      else row.append(field("Weight",load),field("Unit",unit),field("Reps",reps),field("Effort",rpe),log,status);
      list.appendChild(row);
    }
    panel.appendChild(list); main.appendChild(panel);
  }
  if (portalRole === "client") {
    if (note.value.trim()) main.appendChild(el("div","assigned-coach-note","Coach note · " + note.value.trim()));
  } else main.appendChild(note);
  row.appendChild(main);

  const actions = el("div", "ex-actions");
  const up = el("button", "ex-btn move");
  up.innerHTML = "&#8593;"; up.title = "Move exercise up"; up.setAttribute("aria-label", "Move " + ex.name + " up");
  up.disabled = ei <= 0;
  up.onclick = () => moveExercise(block, ei, ei - 1, sessionRef, bi, partnerKey);
  const down = el("button", "ex-btn move");
  down.innerHTML = "&#8595;"; down.title = "Move exercise down"; down.setAttribute("aria-label", "Move " + ex.name + " down");
  down.disabled = ei < 0 || ei >= block.items.length - 1;
  down.onclick = () => moveExercise(block, ei, ei + 1, sessionRef, bi, partnerKey);
  const swap = el("button", "ex-btn swap");
  swap.innerHTML = "&#8644;"; swap.title = "Choose or shuffle replacement"; swap.setAttribute("aria-label", "Replace " + ex.name);
  swap.onclick = () => openExerciseSwap(session, block, ei, ex);
  const edit = el("button","ex-btn edit");
  edit.innerHTML = "&#9998;"; edit.title = "Edit sets, reps, tempo, rest, and effort"; edit.setAttribute("aria-label","Edit " + ex.name + " prescription");
  edit.onclick = () => openPrescriptionEditor(session,block,bi,ei,sessionRef,partnerKey);
  const rm = el("button", "ex-btn remove");
  rm.innerHTML = "&times;"; rm.title = "Remove"; rm.setAttribute("aria-label", "Remove " + ex.name);
  rm.onclick = () => removeExercise(block, ei, sessionRef, bi, partnerKey);
  if (portalRole === "client") {
    if (["accessory","iso","finisher","core","circuit"].includes(block.key)) actions.appendChild(swap);
  } else actions.append(up, down, edit, swap, rm);
  if (actions.children.length) row.appendChild(actions);
  return row;
}

/* Keep the generated session editable without leaving stale exercises behind
   in its optional superset layout. A manual reorder intentionally becomes a
   straight-set order so the screen and the printed workout match exactly. */
function replaceExercise(block, ei, exercise) {
  const old = block.items[ei];
  if (!old || !exercise) return false;
  const replacement = Object.assign({}, exercise, { rx: old.rx || block.rx });
  block.items[ei] = replacement;
  if (block.groups) {
    block.groups.forEach((group) => {
      group.items = (group.items || []).map((item) => item === old || item && item.name === old.name ? replacement : item);
    });
    // Program weeks are deep-cloned while prescriptions progress. That means
    // a group can contain an equal-but-not-identical copy of the exercise.
    // Rebuild against block.items so every preview reads the same source.
    rebuildBlockGroups(block);
  }
  return true;
}
function removeExercise(block, ei, sessionRef, bi, partnerKey) {
  const removed = block.items[ei];
  if (!removed) return;
  const oldLength = block.items.length;
  block.items.splice(ei, 1);
  if (sessionRef && sessionRef.edits) {
    for (let i = ei; i < oldLength - 1; i += 1) {
      const next = noteId(null, bi, i + 1, partnerKey), here = noteId(null, bi, i, partnerKey);
      if (Object.prototype.hasOwnProperty.call(sessionRef.edits, next)) sessionRef.edits[here] = sessionRef.edits[next];
      else delete sessionRef.edits[here];
    }
    delete sessionRef.edits[noteId(null, bi, oldLength - 1, partnerKey)];
  }
  if (block.groups) {
    block.groups.forEach((group) => {
      group.items = group.items.filter((item) => item !== removed);
      if (group.items.length < 2) group.type = "straight";
    });
    block.groups = block.groups.filter((group) => group.items.length);
  }
  markSessionDraft(sessionContainingBlock(block),"Exercise removed");
  renderOutput();
  showToast(removed.name + " removed");
}
function moveExercise(block, from, to, sessionRef, bi, partnerKey) {
  if (from < 0 || to < 0 || from >= block.items.length || to >= block.items.length || from === to) return;
  const moved = block.items.splice(from, 1)[0];
  block.items.splice(to, 0, moved);
  if (sessionRef && sessionRef.edits) {
    const fromId = noteId(null, bi, from, partnerKey), toId = noteId(null, bi, to, partnerKey);
    const fromNote = sessionRef.edits[fromId], toNote = sessionRef.edits[toId];
    if (toNote == null) delete sessionRef.edits[fromId]; else sessionRef.edits[fromId] = toNote;
    if (fromNote == null) delete sessionRef.edits[toId]; else sessionRef.edits[toId] = fromNote;
  }
  const hadSuperset = block.groups && block.groups.some((group) => group.type === "superset");
  block.groups = block.items.map((item) => ({ type: "straight", items: [item] }));
  markSessionDraft(sessionContainingBlock(block),"Exercise order changed");
  renderOutput();
  showToast(moved.name + " moved" + (hadSuperset ? " · custom order now uses straight sets" : ""));
}

/* Blocks that legitimately ignore muscle targets (a leg day still gets a core piece). */
const UNGATED_BLOCKS = ["warmup", "mobility", "finisher", "conditioning", "primer", "core"];

/* Candidate pool for a given block, honoring every rule the engine enforces:
   injuries, equipment, age, experience, muscle relevance, and push/pull family. */
function candidatesFor(session, block, currentEx) {
  const sp = session.spec;
  const pool = eligibleFor(sp);
  const usedNames = new Set();
  session.blocks.forEach((b) => b.items.forEach((e) => usedNames.add(e.name)));
  const targets = sp.muscles || [];
  const gated = !UNGATED_BLOCKS.includes(block.key);

  let cands = pool.filter((e) => !usedNames.has(e.name));

  if (gated && targets.length) {
    // hard muscle gate: prime mover on target, majority of work on target
    cands = cands.filter((e) => muscleAllowed(e, targets));
    // push/pull family lock
    const pp = targetPushPull(targets);
    if (pp) cands = cands.filter((e) => !pushPull(e) || pushPull(e) === pp);
    // upper/lower lock
    const area = targetArea(targets);
    if (area) cands = cands.filter((e) => bodyArea(e) === area || bodyArea(e) === "mixed");
  }

  // block-appropriate character
  // Dedicated finishers are reserved for the finisher block only.
  if (block.key !== "finisher") cands = cands.filter((e) => e.finisher !== true);

  if (block.key === "strength") {
    cands = cands.filter((e) => COMPOUND_PATTERNS.includes(e.pattern) && !ISO_NAMES.includes(e.name));
  } else if (block.key === "accessory") {
    cands = cands.filter((e) => !ISO_NAMES.includes(e.name) && !["mobility", "plyo", "olympic", "conditioning"].includes(e.pattern));
  } else if (block.key === "iso") {
    cands = cands.filter((e) => e.impact <= 1 && !["mobility", "plyo", "olympic", "conditioning"].includes(e.pattern));
  } else if (block.key === "finisher") {
    // Offer dedicated finishers (drop sets, 21s, burnouts, holds) matching the
    // KIND of finisher this session generated, and the muscles it trained.
    const trained = new Set();
    session.blocks.forEach((b) => { if (b.key !== "finisher") b.items.forEach((e) => (e.muscles || []).forEach((m) => trained.add(m))); });
    const wantM = targets.length ? targets : [...trained];
    if (block.kind === "metcon") {
      cands = cands.filter((e) => e.finisher === true && e.ftype === "metcon");
    } else if (block.kind === "pump") {
      cands = cands.filter((e) => e.finisher === true && e.ftype === "pump"
        && (!wantM.length || (e.fmuscles || []).some((m) => wantM.includes(m))));
    } else {
      cands = cands.filter((e) => (e.finisher === true && e.ftype === "core") || (e.region === "core" && !e.finisher));
    }
  } else if (block.key === "conditioning") {
    cands = cands.filter((e) => e.pattern === "conditioning" || e.region === "cardio");
    if (["cardio","mixed","performance","recovery"].includes(resolvedTrainingRoute(sp))) {
      cands = cands.filter((e) => e.zone === "cardio" || e.region === "cardio");
      const preferences = cardioPreferencesFor(sp); if (!preferences.includes("any")) cands = cands.filter((e) => matchesCardioPreference(e,preferences));
    }
  } else if (block.key === "mobility" || block.key === "warmup") {
    cands = cands.filter((e) => e.pattern === "mobility");
  } else if (block.key === "plyo" || block.key === "power") {
    cands = cands.filter((e) => e.pattern === "plyo" || e.pattern === "olympic");
  }

  // if we have a current exercise, prefer the same movement pattern
  if (currentEx) {
    const samePattern = cands.filter((e) => e.pattern === currentEx.pattern);
    if (samePattern.length) return samePattern;
  }
  return cands;
}

/* Pull a fresh recommended exercise that obeys every generator rule. */
function shuffleExercise(session, block, ei, currentEx) {
  const candidates = candidatesFor(session, block, currentEx);
  if (!candidates.length) { showToast("No other recommended movement is available for this slot"); return false; }
  const targets = session.spec.muscles || [];
  // prefer the one that best reinforces what the session already trains
  const selected = session.blocks.filter((b) => !UNGATED_BLOCKS.includes(b.key)).flatMap((b) => b.items);
  const emph = emphasisOf(selected.filter((e) => e.name !== currentEx.name));
  const ranked = biasSort(candidates, targets, makeRng(Math.floor(Math.random() * 99999)), session.spec.experience, emph);
  const chosen = ranked[0];
  replaceExercise(block, ei, chosen);
  if (portalRole === "client") addProgressEntry({ type:"substitution", client:session.spec.client || "Client", sessionId:session.sessionId, label:"Exercise substitution", value:currentEx.name + " → " + chosen.name, note:"Recommended shuffle · " + (byId("exerciseSwapReason") ? byId("exerciseSwapReason").value : "preference"), data:{ from:currentEx.name,to:chosen.name,reason:byId("exerciseSwapReason") ? byId("exerciseSwapReason").value : "preference",scope:"today",position:exercisePosition(block) } });
  else markSessionDraft(session,"Exercise shuffled by coach");
  if (currentView === "active-workout") { persistActiveSession(session); renderActiveWorkout(); }
  else renderOutput();
  showToast(currentEx.name + " shuffled to " + chosen.name);
  return true;
}

/* Exact replacement picker. Recommended choices honor all session filters.
   The all-compatible view keeps the movement pattern but exposes deliberate
   trainer overrides, with every safety/equipment exception labeled. */
let activeSwap = null;
let swapMode = "recommended";
function similarSwapCandidates(session, block, currentEx) {
  const usedNames = new Set();
  session.blocks.forEach((b) => b.items.forEach((e) => usedNames.add(e.name)));
  return eligibleFor(session.spec).filter((e) => e.name !== currentEx.name && !usedNames.has(e.name) && (e.pattern === currentEx.pattern || e.region === currentEx.region)
      && (block.key === "finisher" ? e.finisher === true : e.finisher !== true))
    .sort((a, b) => a.name.localeCompare(b.name));
}
/* Backward-compatible name retained for the runtime QA suite. The client UI
   now calls this the Similar tab. */
function allSwapCandidates(session, block, currentEx) { return workoutBankSwapCandidates(session,currentEx); }
function workoutBankSwapCandidates(session,currentEx) {
  const usedNames = new Set(); session.blocks.forEach((block) => block.items.forEach((exercise) => usedNames.add(exercise.name)));
  return LIBRARY.filter((exercise) => (!currentEx || exercise.name !== currentEx.name) && !usedNames.has(exercise.name)).sort((a,b) => a.name.localeCompare(b.name));
}
function swapWarnings(exercise, spec, block, currentEx) {
  const constraintIssues = exerciseConstraintIssues(exercise,spec,spec.age), warnings = constraintIssues.map((issue) => issue.label);
  if (constraintIssues.some((issue) => ["gym_equipment","client_equipment"].includes(issue.code))) warnings.push("Equipment override");
  if (constraintIssues.some((issue) => issue.code === "cardio_equipment")) warnings.push("Cardio-machine override");
  if (constraintIssues.some((issue) => ["limitation","pregnancy","postpartum","balance","pelvicfloor"].includes(issue.code))) warnings.push("Limitation override");
  if (block && currentEx && exercise.pattern !== currentEx.pattern) warnings.push("Different movement pattern");
  if (block && block.key === "strength" && !isPrimaryAnchor(exercise)) warnings.push("Not categorized as a primary lift");
  if (block && block.key === "finisher" && exercise.finisher !== true) warnings.push("Not categorized as a finisher");
  if (block && block.key !== "finisher" && exercise.finisher === true) warnings.push("Finisher used outside the finisher phase");
  return [...new Set(warnings)];
}
function hardExerciseSafetyIssues(exercise,spec) {
  return exerciseConstraintIssues(exercise,spec,spec && spec.age).filter((issue) => issue.hard);
}
function openExerciseSwap(session, block, ei, currentEx) {
  const equipmentOnly = portalRole === "client" && !["accessory","iso","finisher","core","circuit"].includes(block.key);
  activeSwap = { session, block, ei, currentEx, equipmentOnly };
  swapMode = "recommended";
  byId("exerciseSwapTitle").textContent = "Replace " + currentEx.name;
  byId("exerciseSwapCopy").textContent = equipmentOnly
    ? "Show only movements that keep the same training pattern, for when this equipment is unavailable right now."
    : "Choose the exact movement you want in " + block.title + ", or let FIT4LIFE shuffle one recommended alternative.";
  byId("exerciseSwapSearch").value = "";
  byId("exerciseSwapSearch").placeholder = "Search by exercise name…";
  byId("clientSwapFields").style.display = portalRole === "client" ? "grid" : "none";
  byId("programSwapFields").style.display = "none";
  byId("swapBankBtn").style.display = portalRole === "client" ? "none" : "inline-flex";
  byId("swapSimilarBtn").style.display = equipmentOnly ? "none" : "inline-flex";
  byId("swapShuffleBtn").style.display = "inline-flex";
  byId("swapRecommendedBtn").textContent = "Recommended";
  byId("swapBankBtn").textContent = "Workout bank";
  byId("scratchFilterMenus").classList.remove("show");
  byId("swapBankFilters").classList.remove("scratch-mode");
  byId("exerciseSwapReason").value = equipmentOnly ? "equipment" : "preference";
  byId("exerciseSwapReason").disabled = equipmentOnly;
  byId("exerciseSwapScope").value = "today";
  fillSelectOptions(byId('swapPatternFilter'),[['','All patterns'],...EXERCISE_PATTERNS.map((key) => [key,EXERCISE_PATTERN_LABELS[key]])]);
  fillSelectOptions(byId('swapRegionFilter'),[['','All body areas'],...EXERCISE_REGIONS.map((key) => [key,EXERCISE_REGION_LABELS[key]])]);
  fillSelectOptions(byId('swapZoneFilter'),[['','All equipment'],...ALL_ZONES.map((key) => [key,ZONE_LABELS[key]])]);
  byId('swapSafetyFilter').value = 'safe';
  byId("exerciseSwapModal").classList.add("open");
  setSwapMode("recommended");
  setTimeout(() => byId("exerciseSwapSearch").focus(), 0);
  return true;
}
function renderScratchExerciseMenus() {
  if (!activeSwap || !activeSwap.addMode) return;
  const buildMenu = (id, entries, selected, kind) => {
    const menu = byId(id); menu.innerHTML = "";
    entries.forEach(([value,label]) => {
      const button = el("button","scratch-filter-chip" + (value === selected ? " on" : ""),label);
      button.type = "button"; button.setAttribute("aria-pressed",value === selected ? "true" : "false");
      button.onclick = () => setScratchExerciseFilter(kind,value); menu.appendChild(button);
    });
  };
  buildMenu("scratchRegionMenu",[["","All body parts"],...EXERCISE_REGIONS.map((key) => [key,EXERCISE_REGION_LABELS[key]])],byId("swapRegionFilter").value,"region");
  buildMenu("scratchPatternMenu",[["","All movements"],...EXERCISE_PATTERNS.map((key) => [key,EXERCISE_PATTERN_LABELS[key]])],byId("swapPatternFilter").value,"pattern");
}
function setScratchExerciseFilter(kind,value) {
  const select = byId(kind === "region" ? "swapRegionFilter" : "swapPatternFilter");
  if (!select) return; select.value = value; renderScratchExerciseMenus(); renderSwapOptions();
}
function openExerciseAdd(session, block, sessionRef, partnerKey) {
  if (!session || !block) return false;
  activeSwap = { session, block, sessionRef, partnerKey, addMode:true };
  swapMode = "recommended";
  byId("exerciseSwapTitle").textContent = "Add to " + block.title;
  byId("exerciseSwapCopy").textContent = "Start with phase-fit choices, then narrow the list by body part, movement type, or equipment. The full workout bank remains one tab away.";
  byId("exerciseSwapSearch").value = "";
  byId("exerciseSwapSearch").placeholder = "Search exercises, muscles, or equipment…";
  byId("clientSwapFields").style.display = "none";
  byId("programSwapFields").style.display = "none";
  byId("swapSimilarBtn").style.display = "none";
  byId("swapShuffleBtn").style.display = "none";
  byId("swapBankBtn").style.display = "inline-flex";
  byId("swapRecommendedBtn").textContent = "Fits this phase";
  byId("swapBankBtn").textContent = "Entire exercise bank";
  fillSelectOptions(byId("swapPatternFilter"),[["","All patterns"],...EXERCISE_PATTERNS.map((key) => [key,EXERCISE_PATTERN_LABELS[key]])]);
  fillSelectOptions(byId("swapRegionFilter"),[["","All body areas"],...EXERCISE_REGIONS.map((key) => [key,EXERCISE_REGION_LABELS[key]])]);
  fillSelectOptions(byId("swapZoneFilter"),[["","All equipment"],...ALL_ZONES.map((key) => [key,ZONE_LABELS[key]])]);
  byId("swapSafetyFilter").value = "safe";
  byId("scratchFilterMenus").classList.add("show");
  byId("swapBankFilters").classList.add("scratch-mode");
  byId("exerciseSwapModal").classList.add("open");
  renderScratchExerciseMenus(); setSwapMode("recommended");
  setTimeout(() => byId("exerciseSwapSearch").focus(),0);
  return true;
}
function closeExerciseSwap() {
  const modal = byId("exerciseSwapModal");
  if (modal) modal.classList.remove("open");
  activeSwap = null;
}
function setSwapMode(mode) {
  swapMode = portalRole === "client" && mode === "bank" ? "recommended" : ["recommended","similar","bank"].includes(mode) ? mode : "recommended";
  byId("swapRecommendedBtn").classList.toggle("on", swapMode === "recommended");
  byId("swapSimilarBtn").classList.toggle("on", swapMode === "similar");
  byId("swapBankBtn").classList.toggle("on", swapMode === "bank");
  const adding = !!(activeSwap && activeSwap.addMode);
  byId("swapBankFilters").classList.toggle("show",adding || swapMode === "bank");
  const notes = adding
    ? { recommended:"Fits this phase shows choices that match the selected workout section and every client filter. Use the menus to narrow the list.",similar:"",bank:"The entire bank can cross workout phases. Filter-matching stays on by default; deliberate overrides remain labeled and require confirmation." }
    : { recommended:"Recommended choices match this workout phase, available equipment, experience, age, preferences, and every reported limitation.",similar:"Similar choices keep the same movement pattern or body area while still respecting all current filters.",bank:"The full bank can cross movement patterns and workout phases. Keep “Only filter-matching” on for safe browsing, or show deliberate overrides with visible cautions." };
  byId("swapTabNote").textContent = notes[swapMode];
  renderSwapOptions();
}
function renderSwapOptions() {
  if (!activeSwap) return;
  const { session, block, currentEx, addMode, equipmentOnly } = activeSwap;
  const search = byId("exerciseSwapSearch").value.trim().toLowerCase();
  let options = swapMode === "bank" ? workoutBankSwapCandidates(session,currentEx) : swapMode === "similar" ? similarSwapCandidates(session,block,currentEx) : candidatesFor(session, block, currentEx);
  if (equipmentOnly) options = options.filter((exercise) => exercise.pattern === currentEx.pattern);
  if (swapMode === "bank" || addMode) {
    const pattern = byId('swapPatternFilter').value, region = byId('swapRegionFilter').value, zone = byId('swapZoneFilter').value, safeOnly = byId('swapSafetyFilter').value === 'safe';
    options = options.filter((exercise) => (!pattern || exercise.pattern === pattern) && (!region || exercise.region === region) && (!zone || exercise.zone === zone) && (!safeOnly || !exerciseConstraintIssues(exercise,session.spec,session.spec.age).some((issue) => issue.hard)));
  }
  if (search) options = options.filter((e) => [e.name,e.pattern,e.region,ZONE_LABELS[e.zone] || e.zone,...(e.muscles || [])].join(' ').toLowerCase().includes(search));
  const list = byId("exerciseSwapOptions");
  list.innerHTML = "";
  byId("swapResultSummary").textContent = options.length + (options.length === 1 ? " exercise" : " exercises") + " shown" + (addMode ? " for " + block.title : "");
  if (!options.length) {
    list.appendChild(el("div", "swap-empty", search ? "No matching exercises. Clear a filter or try another search." : equipmentOnly ? "No other equipment-only movement matches this pattern right now. Ask your trainer for a substitute." : swapMode === "bank" ? "No workout-bank movements match those filters." : "No phase-fit movements match those filters. Clear one menu or check the entire exercise bank."));
    return;
  }
  options.forEach((exercise) => {
    const hardIssues = hardExerciseSafetyIssues(exercise,session.spec);
    const option = el("button", "swap-option" + (hardIssues.length ? " blocked" : "")); option.type = "button";
    const name = el("span", "swap-option-name", exercise.name);
    const meta = el("span", "swap-option-meta");
    meta.appendChild(el("span", "swap-badge category", EXERCISE_REGION_LABELS[exercise.region] || exercise.region));
    meta.appendChild(el("span", "swap-badge category", EXERCISE_PATTERN_LABELS[exercise.pattern] || exercise.pattern));
    meta.appendChild(el("span", "swap-badge", ZONE_LABELS[exercise.zone] || exercise.zone));
    const warnings = swapWarnings(exercise, session.spec, block, currentEx);
    if (!warnings.length) meta.appendChild(el("span", "swap-badge safe", "Matches all filters"));
    else if (hardIssues.length) meta.appendChild(el("span", "swap-badge caution", "Blocked by safety filter"));
    warnings.forEach((warning) => meta.appendChild(el("span", "swap-badge caution", warning)));
    option.append(name, meta);
    option.onclick = () => applyExerciseSwap(exercise);
    list.appendChild(option);
  });
}
function applyExerciseSwap(exercise) {
  if (!activeSwap || !exercise) return;
  const { session, block, ei, currentEx, addMode, equipmentOnly } = activeSwap;
  if (equipmentOnly && (exercise.pattern !== currentEx.pattern || byId("exerciseSwapReason").value !== "equipment")) {
    showToast("Ask your trainer to change " + currentEx.name + " for a reason other than equipment.");
    return;
  }
  if (activeSwap.renderMode === "program") {
    const programBeforeChange = JSON.stringify(currentProgram);
    const scope = byId("programSwapScope").value || "single", result = addMode ? applyProgramExerciseAddition(activeSwap,exercise,scope) : applyProgramExerciseReplacement(activeSwap,exercise,scope);
    if (result.saveFailed) {
      currentProgram = JSON.parse(programBeforeChange);
      closeExerciseSwap(); renderProgram();
      showToast(result.message || "The program change could not be saved. Nothing was changed.");
      return;
    }
    if (!result.changed || !addMode && !result.originChanged) { showToast(result.message || "The selected program exercise was not changed"); return; }
    closeExerciseSwap(); renderProgram();
    showToast(exercise.name + (addMode ? " added to " : " applied to ") + result.changed + " workout" + (result.changed === 1 ? "" : "s") + (result.skipped ? " · " + result.skipped + " skipped to avoid duplicates" : ""));
    return;
  }
  const hardIssues = hardExerciseSafetyIssues(exercise,session.spec);
  if (hardIssues.length) {
    showToast("Safety filter blocked " + exercise.name + ": " + hardIssues.map((issue) => issue.label).join(" · "));
    return;
  }
  const warnings = swapWarnings(exercise, session.spec, block, currentEx);
  if (warnings.length && !window.confirm(exercise.name + " changes this workout role: " + warnings.join(", ") + ". Continue and send the workout back through coach approval?")) return;
  if (addMode) {
    const added = Object.assign({},exercise,{ rx:{ ...(exercise.rx || block.rx) } });
    block.items.push(added);
    if (block.groups) block.groups.push({ type:"straight",items:[added] });
    enrichSessionMetadata(session); markSessionDraft(session,"Exercise added by coach"); closeExerciseSwap(); renderOutput(); showToast(exercise.name + " added to " + block.title); return;
  }
  if (!replaceExercise(block, ei, exercise)) return;
  const reason = portalRole === "client" ? byId("exerciseSwapReason").value : "coach_edit", scope = portalRole === "client" ? byId("exerciseSwapScope").value : "today";
  const progressEntry = addProgressEntry({ type:"substitution", client:session.spec.client || "Client", sessionId:session.sessionId, label:"Exercise substitution", value:currentEx.name + " → " + exercise.name, note:"Reason: " + reason + " · scope: " + scope, data:{ from:currentEx.name,to:exercise.name,reason,scope,position:exercisePosition(block),coachNotice:reason === "discomfort" || block.key === "strength" } });
  if (!progressEntry) {
    replaceExercise(block,ei,currentEx);
    showToast("The exercise substitution could not be saved. Nothing was changed.");
    return;
  }
  if (portalRole === "client" && scope === "future" && session.spec.profileId) {
    const profiles = loadProfiles(), index = profiles.findIndex((profile) => profile.id === session.spec.profileId);
    if (index >= 0) {
      profiles[index].exercisePreferences = { ...(profiles[index].exercisePreferences || {}), [exerciseId(currentEx)]:reason === "discomfort" ? "discomfort" : reason === "unfamiliar" ? "unfamiliar" : "dislike", [exerciseId(exercise)]:"like" };
      profiles[index].updatedAt = new Date().toISOString();
      if (!writeProfiles(profiles)) {
        replaceExercise(block,ei,currentEx);
        writeProgress(loadProgress().filter((entry) => entry.id !== progressEntry.id));
        showToast("The future substitution preference could not be saved. Nothing was changed.");
        return;
      }
    }
  }
  if (portalRole !== "client") markSessionDraft(session,"Exercise replaced by coach");
  else if (reason === "discomfort") { session.clientSafetyFlag = "Discomfort reported during substitution; trainer review required before repeating this pattern."; }
  closeExerciseSwap();
  if (currentView === "active-workout") { persistActiveSession(session); renderActiveWorkout(); }
  else renderOutput();
  showToast(currentEx.name + " replaced with " + exercise.name + (warnings.length ? " · " + warnings.join(", ") : ""));
}
function shuffleExerciseFromModal() {
  if (!activeSwap) return;
  const swap = activeSwap;
  if (shuffleExercise(swap.session, swap.block, swap.ei, swap.currentEx)) closeExerciseSwap();
}

/* Add movements through the same searchable, filter-aware menu used for
   substitutions. Scratch workouts expose the phase-fit list first and the
   complete bank second, with body-part and movement-pattern menus visible. */
function addExercise(session, block, sessionRef, partnerKey, anchorBtn) {
  openExerciseAdd(session,block,sessionRef,partnerKey);
}

/* mirror of engine eligibility, exposed for swap/add */
function eligibleFor(spec) {
  return eligible(spec,spec.age);
}

/* ============================================================
   WAVES 2–4: TRAINER TOOLS, PROGRAMS, READINESS + LOCAL MEMORY
   ============================================================ */

function byId(id) { return document.getElementById(id); }
function setSelectValues(id, values) {
  const select = byId(id), wanted = normalizeCardioPreferences(values); if (!select) return;
  select.value = wanted[0];
  Array.from(select.options || []).forEach((option) => { option.selected = wanted.includes(option.value); });
}
function selectedValues(id) {
  const select = byId(id); if (!select) return ["any"];
  const values = Array.from(select.options || []).filter((option) => option.selected).map((option) => option.value);
  return normalizeCardioPreferences(values.length ? values : select.value);
}
function numberFrom(id, fallback) {
  const n = Number(byId(id).value);
  return Number.isFinite(n) ? n : fallback;
}
function escapeHtml(value) {
  return String(value == null ? "" : value).replace(/[&<>'"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[ch]));
}
function showToast(message) {
  const toast = byId("appToast");
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(showToast._id);
  showToast._id = setTimeout(() => toast.classList.remove("show"), 2400);
}
function updateNetworkStatus() { const status = byId('networkStatus'); if (status) status.classList.toggle('show',typeof navigator !== 'undefined' && navigator.onLine === false); }
if (typeof window !== 'undefined' && window.addEventListener) { window.addEventListener('online',updateNetworkStatus); window.addEventListener('offline',updateNetworkStatus); }
