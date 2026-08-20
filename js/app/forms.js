/* ---------- form construction ---------- */
function selectField(labelText, key, options, target, current) {
  const wrap = document.createElement("div");
  wrap.className = "field";
  const label = document.createElement("label");
  label.textContent = labelText;
  const sel = document.createElement("select");
  const ph = document.createElement("option");
  ph.value = ""; ph.textContent = "Select\u2026"; ph.disabled = true; ph.selected = !current;
  sel.appendChild(ph);
  options.forEach(([val, txt]) => {
    const o = document.createElement("option");
    o.value = val; o.textContent = txt;
    if (String(current) === String(val)) o.selected = true;
    sel.appendChild(o);
  });
  if (current) sel.classList.add("set");
  sel.addEventListener("change", () => {
    target[key] = key === "experience" || key === "minutes" ? Number(sel.value) : sel.value;
    sel.classList.add("set");
    updateHint();
  });
  wrap.appendChild(label); wrap.appendChild(sel);
  return wrap;
}

function ageField(target) {
  const wrap = document.createElement("div");
  wrap.className = "field";
  const label = document.createElement("label");
  label.textContent = "Age";
  const row = document.createElement("div");
  row.className = "age-row";
  const input = document.createElement("input");
  input.type = "number"; input.min = "13"; input.max = "100"; input.step = "1"; input.inputMode = "numeric"; input.value = Number(target.age) || 30; input.placeholder = "Age in years";
  input.addEventListener("input", () => { if (input.value !== "") target.age = Number(input.value); });
  input.addEventListener("blur", () => { const value = Math.max(13,Math.min(100,Math.round(Number(input.value) || 30))); input.value = value; target.age = value; });
  row.appendChild(input);
  wrap.appendChild(label); wrap.appendChild(row);
  return wrap;
}

function chipMulti(labelText, key, options, labelMap, target, isInjury) {
  const wrap = document.createElement("div");
  wrap.className = "field";
  wrap.style.gridColumn = "1 / -1";
  const label = document.createElement("label");
  label.textContent = labelText;
  const chips = document.createElement("div");
  chips.className = "chips" + (isInjury ? " safety-selector" : "");
  let bodyChoiceRow = null, specialChoiceRow = null;

  if (isInjury) {
    const none = document.createElement("button");
    none.type = "button";
    none.className = "chip none-chip" + (target[key].length === 0 ? " on" : "");
    none.textContent = "No limitations";
    none.addEventListener("click", () => {
      target[key] = [];
      renderChips();
    });
    chips.appendChild(none);
    const makeGroup = (title) => {
      const group = document.createElement("div"); group.className = "safety-choice-group";
      const heading = document.createElement("b"); heading.textContent = title;
      const row = document.createElement("div"); row.className = "safety-choice-row";
      group.append(heading,row); chips.appendChild(group); return row;
    };
    bodyChoiceRow = makeGroup("Where is the limitation?");
    specialChoiceRow = makeGroup("Special considerations");
  }

  options.forEach((opt) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "chip" + (target[key].includes(opt) ? " on" : "");
    btn.textContent = labelMap[opt] || opt;
    btn.dataset.val = opt;
    btn.addEventListener("click", () => {
      const i = target[key].indexOf(opt);
      if (i >= 0) target[key].splice(i, 1); else target[key].push(opt);
      renderChips();
    });
    if (isInjury) (COMMON_BODY_LIMITATIONS.includes(opt) ? bodyChoiceRow : specialChoiceRow).appendChild(btn);
    else chips.appendChild(btn);
  });

  function renderChips() {
    chips.querySelectorAll(".chip").forEach((c) => {
      if (c.classList.contains("none-chip")) c.classList.toggle("on", target[key].length === 0);
      else c.classList.toggle("on", target[key].includes(c.dataset.val));
    });
    updateHint();
  }

  const note = document.createElement("div");
  note.className = isInjury ? "inj-note" : "zone-note";
  note.textContent = isInjury
    ? "Select any that apply — the engine filters unsafe movements automatically."
    : "Leave all off to use the full facility, or pick the zones available right now.";

  wrap.appendChild(label); wrap.appendChild(chips); wrap.appendChild(note);
  return wrap;
}

function muscleField(target) {
  const wrap = document.createElement("div");
  wrap.className = "field";
  wrap.style.gridColumn = "1 / -1";
  const label = document.createElement("label");
  label.textContent = "Target muscles (optional)";
  wrap.appendChild(label);

  // quick region row
  const quick = document.createElement("div");
  quick.className = "chips";
  quick.style.marginBottom = "9px";
  QUICK_REGIONS.forEach(([region, txt]) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "chip region-chip";
    btn.textContent = txt;
    btn.dataset.region = region;
    btn.addEventListener("click", () => {
      const group = REGION_MUSCLES[region];
      const allOn = group.every((m) => target.muscles.includes(m));
      if (allOn) {
        target.muscles = target.muscles.filter((m) => !group.includes(m));
      } else {
        group.forEach((m) => { if (!target.muscles.includes(m)) target.muscles.push(m); });
      }
      paint();
    });
    quick.appendChild(btn);
  });
  wrap.appendChild(quick);

  // individual muscle chips
  const chips = document.createElement("div");
  chips.className = "chips";
  MUSCLE_LIST.forEach((m) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "chip muscle-chip";
    btn.textContent = MUSCLE_LABELS[m] || m;
    btn.dataset.muscle = m;
    btn.addEventListener("click", () => {
      const i = target.muscles.indexOf(m);
      if (i >= 0) target.muscles.splice(i, 1); else target.muscles.push(m);
      paint();
    });
    chips.appendChild(btn);
  });
  wrap.appendChild(chips);

  const note = document.createElement("div");
  note.className = "zone-note";
  note.textContent = "Leave blank for a balanced full-body session, or pick a region / specific muscles to bias the workout.";
  wrap.appendChild(note);

  function paint() {
    quick.querySelectorAll(".region-chip").forEach((c) => {
      const group = REGION_MUSCLES[c.dataset.region];
      c.classList.toggle("on", group.length && group.every((m) => target.muscles.includes(m)));
    });
    chips.querySelectorAll(".muscle-chip").forEach((c) => {
      c.classList.toggle("on", target.muscles.includes(c.dataset.muscle));
    });
  }
  paint();
  return wrap;
}

function goalField(target) {
  if (!Array.isArray(target.goals)) target.goals = target.goal ? [target.goal] : [];
  const wrap = document.createElement("div");
  wrap.className = "field goal-field";
  const label = document.createElement("label");
  label.textContent = "What do you want this workout to help with?";
  wrap.appendChild(label);
  const grid = document.createElement("div");
  grid.className = "goal-grid";
  Object.keys(GOAL_INFO).forEach((key) => {
    const info = GOAL_INFO[key];
    const btn = document.createElement("button");
    btn.type = "button"; btn.className = "goal-choice"; btn.dataset.goal = key;
    const name = document.createElement("div"); name.className = "goal-name"; name.textContent = info.title;
    const desc = document.createElement("div"); desc.className = "goal-desc"; desc.textContent = info.desc;
    const rank = document.createElement("div"); rank.className = "goal-rank";
    btn.append(name, desc, rank);
    btn.addEventListener("click", () => {
      const index = target.goals.indexOf(key);
      if (index >= 0) target.goals.splice(index, 1);
      else if (target.goals.length < 2) target.goals.push(key);
      else { showToast("Choose up to two goals — remove one before adding another"); return; }
      target.goal = target.goals[0] || "";
      const allowed = GOAL_ROUTE_CHOICES[target.goal] || ["auto"];
      if (!allowed.includes(target.trainingStyle)) target.trainingStyle = "auto";
      paint(); updateHint(); renderForms();
    });
    grid.appendChild(btn);
  });
  wrap.appendChild(grid);
  const helper = document.createElement("div"); helper.className = "goal-helper";
  const helperText = document.createElement("span"); helperText.textContent = "Choose one main goal and, if useful, one secondary goal. New to training? “Feel fitter” is the safest all-around start.";
  const starter = document.createElement("button"); starter.type = "button"; starter.textContent = "Choose Feel fitter for me";
  starter.addEventListener("click", () => { target.goals = ["general"]; target.goal = "general"; target.trainingStyle = "auto"; paint(); updateHint(); renderForms(); });
  helper.append(helperText, starter); wrap.appendChild(helper);

  function paint() {
    grid.querySelectorAll(".goal-choice").forEach((btn) => {
      const index = target.goals.indexOf(btn.dataset.goal);
      btn.classList.toggle("on", index >= 0); btn.classList.toggle("primary", index === 0);
      btn.setAttribute("aria-pressed", String(index >= 0));
      const rank = btn.querySelector(".goal-rank");
      if (rank) rank.textContent = index === 0 ? "Primary" : index === 1 ? "Secondary" : "";
    });
  }
  paint();
  return wrap;
}

function trainingRouteField(target) {
  const goal = target.goal || (target.goals && target.goals[0]) || "general", choices = GOAL_ROUTE_CHOICES[goal] || ["auto","resistance","mixed","cardio"];
  if (!target.trainingStyle || !choices.includes(target.trainingStyle)) target.trainingStyle = "auto";
  target.cardioModes = normalizeCardioPreferences(target.cardioModes || target.cardioMode);
  target.cardioMode = target.cardioModes[0];
  const wrap = document.createElement("div"); wrap.className = "training-route-field";
  const label = document.createElement("label"); label.textContent = "How do you want to train for that goal?"; wrap.appendChild(label);
  const grid = document.createElement("div"); grid.className = "training-route-grid";
  choices.forEach((key) => {
    const info = TRAINING_ROUTES[key], btn = document.createElement("button"); btn.type = "button"; btn.className = "goal-choice" + (target.trainingStyle === key ? " on primary" : ""); btn.setAttribute("aria-pressed",String(target.trainingStyle === key));
    const name = document.createElement("div"); name.className = "goal-name";
    const resolved = key === "auto" ? GOAL_AUTO_ROUTE[goal] : key;
    name.textContent = key === "auto" ? "Best match · " + TRAINING_ROUTES[resolved].title : info.title;
    const desc = document.createElement("div"); desc.className = "goal-desc"; desc.textContent = key === "auto" ? TRAINING_ROUTES[resolved].desc : info.desc;
    btn.append(name,desc); btn.addEventListener("click",() => { target.trainingStyle = key; renderForms(); updateHint(); }); grid.appendChild(btn);
  });
  wrap.appendChild(grid);
  const summary = document.createElement("div"); summary.className = "route-summary"; summary.textContent = GOAL_ROUTE_EXPLANATIONS[goal] || "The route changes the actual movement pattern and prescription, not only the set and rep scheme."; wrap.appendChild(summary);
  return wrap;
}

function cardioPreferenceField(target) {
  target.cardioModes = normalizeCardioPreferences(target.cardioModes || target.cardioMode);
  const wrap = document.createElement("div"); wrap.className = "field cardio-preference";
  const label = document.createElement("label"); label.textContent = "Cardio equipment available · choose every option this client can use"; wrap.appendChild(label);
  const chips = document.createElement("div"); chips.className = "chips";
  Object.keys(CARDIO_MODALITIES).forEach((key) => {
    const selected = target.cardioModes.includes(key), btn = document.createElement("button"); btn.type = "button"; btn.className = "chip" + (selected ? " on" : ""); btn.textContent = CARDIO_MODALITIES[key].label; btn.setAttribute("aria-pressed",String(selected));
    btn.addEventListener("click",() => {
      if (key === "any") target.cardioModes = ["any"];
      else {
        target.cardioModes = target.cardioModes.filter((item) => item !== "any");
        const index = target.cardioModes.indexOf(key); if (index >= 0) target.cardioModes.splice(index,1); else target.cardioModes.push(key);
        if (!target.cardioModes.length) target.cardioModes = ["any"];
      }
      target.cardioMode = target.cardioModes[0]; renderForms();
    }); chips.appendChild(btn);
  });
  wrap.appendChild(chips);
  const note = document.createElement("div"); note.className = "zone-note"; note.innerHTML = "<strong>This filters the entire session.</strong> A machine that is not selected cannot appear in the warm-up, main work, finisher, or cool-down. Select several available machines for more variety."; wrap.appendChild(note);
  return wrap;
}

function profileField(target) {
  const wrap = document.createElement("div"); wrap.className = "profile-field";
  const label = document.createElement("label"); label.textContent = "Find your profile"; wrap.appendChild(label);
  const row = document.createElement("div"); row.className = "profile-row";
  const lookupWrap = document.createElement("div"); lookupWrap.className = "compact-field profile-lookup";
  const lookupLabel = document.createElement("label"); lookupLabel.textContent = "Name or username";
  const results = document.createElement("div"); results.className = "profile-results";
  const active = loadProfiles().find((p) => p.id === target.profileId), actions = document.createElement("div"); actions.className = "profile-actions";
  if (active) {
    const loaded = document.createElement("div"); loaded.className = "profile-loaded";
    const identity = document.createElement("div"), loadedName = document.createElement("strong"), loadedUser = document.createElement("span");
    loadedName.textContent = active.name; loadedUser.textContent = "@" + profileUsername(active); identity.append(loadedName, loadedUser);
    const fresh = document.createElement("button"); fresh.type = "button"; fresh.className = "small-btn"; fresh.textContent = "Use a different profile";
    fresh.addEventListener("click", () => { target.profileId = ""; target.client = ""; renderForms(); updateHint(); });
    loaded.append(identity, fresh); lookupWrap.append(lookupLabel, loaded);
    if (trainerIsUnlocked()) {
      const edit = document.createElement("button"); edit.type = "button"; edit.className = "small-btn"; edit.textContent = "Edit profile"; edit.addEventListener("click", () => openProfileEditor(active.id, target));
      const remove = document.createElement("button"); remove.type = "button"; remove.className = "small-btn danger"; remove.textContent = "Delete profile"; remove.addEventListener("click", () => deleteClientProfile(active.id, target));
      actions.append(edit, remove);
    }
  } else {
    const lookup = document.createElement("input"); lookup.type = "search"; lookup.placeholder = "Start typing your name or username"; lookup.autocomplete = "off";
    const paintResults = () => {
      const query = lookup.value.trim(); results.innerHTML = "";
      if (query.length < 2) return;
      const matches = findProfilesByLookup(query);
      matches.forEach((profile) => {
        const button = document.createElement("button"); button.type = "button"; button.className = "profile-result";
        const name = document.createElement("strong"), username = document.createElement("span"); name.textContent = profile.name; username.textContent = "@" + profileUsername(profile); button.append(name, username);
        button.addEventListener("click", () => loadProfileIntoTarget(profile, target)); results.appendChild(button);
      });
      const addRequestForm = () => {
        const existingForm = results.querySelector && results.querySelector(".profile-request-form"); if (existingForm) return;
        const request = document.createElement("div"); request.className = "profile-request-form";
        const copy = document.createElement("p"); copy.textContent = trainerIsUnlocked() ? "Create this only if none of the matches are the same person. Similar names will still be checked before saving." : "Only send this if none of the matches are you. A trainer will review it before any profile is created.";
        const requestGrid = document.createElement("div"); requestGrid.className = "profile-request-grid";
        const nameField = document.createElement("div"); nameField.className = "compact-field"; const nameLabel = document.createElement("label"); nameLabel.textContent = "Full name"; const nameInput = document.createElement("input"); nameInput.type = "text"; nameInput.value = query;
        const userField = document.createElement("div"); userField.className = "compact-field"; const userLabel = document.createElement("label"); userLabel.textContent = "Username"; const userInput = document.createElement("input"); userInput.type = "text"; userInput.value = usernameFromName(query); userInput.placeholder = "unique username";
        nameField.append(nameLabel, nameInput); userField.append(userLabel, userInput);
        const submit = document.createElement("button"); submit.type = "button"; submit.className = "small-btn primary"; submit.textContent = trainerIsUnlocked() ? "Create client" : "Send request";
        submit.addEventListener("click", () => {
          if (trainerIsUnlocked()) { const profile = createClientProfile(profileRecordFromTarget(target, nameInput.value, userInput.value)); if (profile) loadProfileIntoTarget(profile, target); }
          else if (requestProfileCreation(nameInput.value, userInput.value)) results.innerHTML = '<div class="lookup-note">Request sent. A trainer can approve it from the Trainer Hub.</div>';
        });
        requestGrid.append(nameField, userField, submit); request.append(copy, requestGrid); results.appendChild(request);
      };
      if (matches.length) {
        const none = document.createElement("button"); none.type = "button"; none.className = "small-btn"; none.textContent = "None of these are me"; none.addEventListener("click", addRequestForm); results.appendChild(none);
      } else addRequestForm();
    };
    lookup.addEventListener("input", paintResults); lookupWrap.append(lookupLabel, lookup, results);
  }
  row.append(lookupWrap); if (actions.children.length) row.append(actions); wrap.appendChild(row);
  const guidance = document.createElement("div"); guidance.className = "profile-guidance";
  guidance.textContent = active && active.lastReview ? profileGuidance(active) : active ? "Profile found. Goals, limitations, and equipment are loaded below." : "The client list stays hidden. Search first; if there is no match, a trainer must approve or create the profile so duplicates do not pile up.";
  wrap.appendChild(guidance);
  return wrap;
}

function profileSaveField(target) {
  const active = loadProfiles().find((profile) => profile.id === target.profileId);
  if (!active || !trainerIsUnlocked()) return null;
  const wrap = document.createElement("div"); wrap.className = "profile-save-bar";
  const copy = document.createElement("div"), title = document.createElement("b"), note = document.createElement("span");
  title.textContent = "Save these preferences to " + active.name;
  note.textContent = "Updates goals, training route, cardio choices, experience, session length, muscle focus, limitations, and available equipment.";
  copy.append(title,note);
  const update = document.createElement("button"); update.type = "button"; update.className = "small-btn primary"; update.textContent = "Update client profile"; update.addEventListener("click", () => saveProfileFromTarget(target));
  wrap.append(copy,update); return wrap;
}

function readinessTrendContext(profile) {
  if (!profile) return {level:"normal",evidenceCount:0,summary:"No repeated readiness concern is established.",causes:[]};
  const cutoff = Date.now() - 14 * 86400000;
  const readiness = loadProgress().filter((entry) => entry.type === "readiness" && progressEntryBelongsToClient(entry,profile) && new Date(entry.date || 0).getTime() >= cutoff);
  const workouts = loadProgress().filter((entry) => entry.type === "workout" && entry.data && progressEntryBelongsToClient(entry,profile) && new Date(entry.date || 0).getTime() >= cutoff);
  const pulses = checkInsForProfile(profile.id).filter((item) => item.reviewType === "recovery_24_48" && new Date(item.createdAt || item.date || 0).getTime() >= cutoff);
  const causeCount = {}, addCause = (key) => { causeCount[key] = (causeCount[key] || 0) + 1; };
  let severe = 0, moderate = 0;
  readiness.forEach((entry) => {
    const data = entry.data || {}, score = Number(data.score != null ? data.score : parseInt(entry.value,10));
    if (score < 50) severe += 1; else if (score < 70) moderate += 1;
    if (Number(data.sleep) <= 2) addCause("sleep");
    if (Number(data.energy) <= 2) addCause("energy");
    if (Number(data.soreness) >= 4) addCause("soreness");
    if (Number(data.stress) >= 4) addCause("stress");
    if (Number(data.pain) > 0) addCause("pain");
    if (data.illness && data.illness !== "none") addCause("illness");
  });
  workouts.forEach((entry) => {
    const data = entry.data || {}, hard = Number(data.difficulty) >= 9 || Number(data.energy) <= 2 || ["changed","stopped"].includes(data.pain);
    if (hard) severe += 1; else if (Number(data.difficulty) >= 8 || data.completion === "most") moderate += 1;
    if (Number(data.energy) <= 2) addCause("energy");
    if (Number(data.difficulty) >= 8) addCause("workout demand");
    if (data.pain && data.pain !== "none") addCause("pain");
  });
  pulses.forEach((item) => {
    const hard = Number(item.recovery) <= 2 || Number(item.pain) >= 2 || item.nextSessionReadiness === "no";
    if (hard) severe += 1; else if (Number(item.soreness) >= 4 || Number(item.recovery) === 3 || item.nextSessionReadiness === "unsure") moderate += 1;
    if (Number(item.soreness) >= 4) addCause("soreness");
    if (Number(item.recovery) <= 2) addCause("recovery");
    if (Number(item.pain) > 0) addCause("pain");
  });
  const evidenceCount = readiness.length + workouts.length + pulses.length;
  const causes = Object.entries(causeCount).sort((a,b) => b[1] - a[1]).filter(([,count]) => count >= 2).slice(0,3).map(([key]) => key);
  const level = severe >= 2 ? "reduce" : severe + moderate >= 2 ? "adjust" : "normal";
  const summary = level === "reduce"
    ? "Repeated low recovery signals across " + (severe + moderate) + " recent records; reduce the next draft and require coach review."
    : level === "adjust"
      ? "Repeated moderate recovery signals across " + (severe + moderate) + " recent records; keep compound continuity and trim secondary demand."
      : evidenceCount ? "Recent records do not establish a repeated concern. One isolated low day does not rewrite the program." : "No recent readiness, workout-review, or recovery-pulse trend is available.";
  return {level,evidenceCount,severe,moderate,summary,causes,windowDays:14};
}
function applyReadinessTrendToSession(session) {
  const trend = session && session.spec && session.spec.readinessTrend;
  if (!session || !trend || trend.level === "normal") return session;
  const reduce = trend.level === "reduce";
  if (reduce) session.blocks = (session.blocks || []).filter((block) => !["finisher","plyo"].includes(block.key));
  (session.blocks || []).forEach((block) => {
    if (["warmup","mobility","primer"].includes(block.key)) return;
    const strengthAnchor = block.key === "strength";
    const delta = reduce || !strengthAnchor ? -1 : 0;
    if (delta) {
      block.rx = {...block.rx,sets:adjustSetCount(block.rx && block.rx.sets || "1",delta),rpe:"Cap at RPE 7"};
      block.items.forEach((exercise) => { exercise.rx = {...(exercise.rx || block.rx),sets:adjustSetCount(exercise.rx && exercise.rx.sets || block.rx.sets,delta),rpe:"Cap at RPE 7"}; });
    } else {
      block.rx = {...block.rx,rpe:"Cap at RPE 8"};
      block.items.forEach((exercise) => { exercise.rx = {...(exercise.rx || block.rx),rpe:"Cap at RPE 8"}; });
    }
  });
  session.readinessTrend = JSON.parse(JSON.stringify(trend));
  session.rationale = "Repeated 14-day readiness/recovery trend: " + trend.summary + (trend.causes && trend.causes.length ? " Main repeated signals: " + trend.causes.join(", ") + "." : "") + " The trainer must approve this draft; no single check-in caused the change. " + (session.rationale || "");
  return session;
}

function loadProfileIntoTarget(profile, target) {
  if (!profile || !target) return null;
  Object.assign(target, {
    profileId: profile.id, client: profile.name, username: profileUsername(profile), goal: profile.goals && profile.goals[0] || "general", goals: [...(profile.goals || ["general"])],
    experience: profile.experience, age: profile.age, minutes: profile.minutes || 60,
    trainingStyle: profile.trainingStyle || "auto", cardioMode: profile.cardioMode || "any", cardioModes:normalizeCardioPreferences(profile.cardioModes || profile.cardioMode),
    coachAdjustment: profile.coachAdjustment ? { ...profile.coachAdjustment } : null, readinessTrend:readinessTrendContext(profile),
    muscles: [...(profile.muscles || [])], injuries: [...(profile.injuries || [])], zones: [...(profile.zones || [])],
    trainingPhase:profile.trainingPhase || "general", phaseStartedAt:profile.phaseStartedAt || "", availableDays:Number(profile.availableDays) || 3,
    sport:profile.sport || "", sportSchedule:profile.sportSchedule || "", competitionDate:profile.competitionDate || "",
    exercisePreferences:{ ...(profile.exercisePreferences || {}) }, phaseCompoundAnchors:{ ...(profile.phaseCompoundAnchors || {}) },
    usualTrainingRpe:Number(profile.usualTrainingRpe) || null,coachingPriorities:[...(profile.coachingPriorities || [])],coachingPreferenceNote:profile.coachingPreferenceNote || "",pastPhysicalActivities:profile.pastPhysicalActivities || "",fitnessInterests:[...(profile.fitnessInterests || [])],
  });
  renderForms(); updateHint(); showToast("Loaded " + profile.name + " with saved goals and limitations"); return profile;
}

// Whether this workout runs with a coach present changes what may safely appear in it,
// so it is asked directly rather than guessed. Defaults to a trainer day, because
// building alongside a client is the common case and a wrong "solo" would silently
// strip movements the trainer expected to see.
function supervisionField(target) {
  const wrap = document.createElement("div");
  wrap.className = "compact-field";
  const id = "specSupervision";
  wrap.innerHTML = '<label for="' + id + '">Who is running this workout?</label>'
    + '<select id="' + id + '">'
    + '<option value="trainer">With a trainer</option>'
    + '<option value="solo">Client on their own</option>'
    + '</select>'
    + '<span class="storage-note">On a solo day the generator will not introduce a movement this client has never performed that needs supervision the first time.</span>';
  const select = wrap.querySelector("select");
  select.value = target.soloDay ? "solo" : "trainer";
  select.addEventListener("change", () => { target.soloDay = select.value === "solo"; updateHint(); });
  return wrap;
}
function buildPersonFields(target, container) {
  container.innerHTML = "";
  const grid = document.createElement("div");
  grid.className = "field-grid";
  grid.appendChild(profileField(target));
  grid.appendChild(goalField(target));
  grid.appendChild(trainingRouteField(target));
  if (["cardio","mixed","performance","recovery"].includes(resolvedTrainingRoute(target))) grid.appendChild(cardioPreferenceField(target));
  grid.appendChild(selectField("Experience", "experience", EXP_OPTIONS, target, target.experience));
  grid.appendChild(ageField(target));
  grid.appendChild(selectField("Session length", "minutes", TIME_OPTIONS, target, target.minutes));
  grid.appendChild(supervisionField(target));
  grid.appendChild(muscleField(target));
  grid.appendChild(chipMulti("Injury limitations", "injuries", COMMON_LIMITATIONS, INJURY_LABELS, target, true));
  grid.appendChild(chipMulti("Equipment available", "zones", ALL_ZONES, ZONE_LABELS, target, false));
  const saveProfile = profileSaveField(target); if (saveProfile) grid.appendChild(saveProfile);
  container.appendChild(grid);
}

function renderForms() {
  buildPersonFields(state.solo, document.getElementById("soloFields"));
  const gf = document.getElementById("groupFields");
  gf.innerHTML = "";
  const p1 = document.createElement("div");
  p1.className = "partner-block"; p1.style.borderTop = "none"; p1.style.paddingTop = "0";
  p1.innerHTML = '<h3><span class="pnum">1</span> Partner one</h3>';
  const p1c = document.createElement("div"); buildPersonFields(state.p1, p1c); p1.appendChild(p1c);
  const p2 = document.createElement("div");
  p2.className = "partner-block";
  p2.innerHTML = '<h3><span class="pnum">2</span> Partner two</h3>';
  const p2c = document.createElement("div"); buildPersonFields(state.p2, p2c); p2.appendChild(p2c);
  gf.appendChild(p1); gf.appendChild(p2);
}

function setMode(mode) {
  state.mode = mode;
  document.querySelectorAll("#modeToggle button").forEach((b) => b.classList.toggle("on", b.dataset.mode === mode));
  document.getElementById("soloFields").style.display = mode === "solo" ? "block" : "none";
  document.getElementById("groupFields").style.display = mode === "group" ? "block" : "none";
  updateHint();
}

function personReady(p) {
  const basics = ((p.goals && p.goals.length) || p.goal) && p.experience && p.minutes;
  if (!basics) return false;
  const route = resolvedTrainingRoute(p), zones = p.zones || [];
  if (route === "cardio" && zones.length) {
    const preferences = cardioPreferencesFor(p);
    if (preferences.length === 1 && preferences[0] === "jumprope") return zones.includes("bodyweight");
    return zones.includes("cardio") || ((preferences.includes("any") || preferences.includes("jumprope")) && zones.includes("bodyweight"));
  }
  return true;
}
function updateHint() {
  const hint = document.getElementById("buildHint");
  const btn = document.getElementById("buildBtn");
  let ready;
  if (state.mode === "solo") ready = personReady(state.solo);
  else ready = personReady(state.p1) && personReady(state.p2);
  btn.disabled = !ready;
  const activePeople = state.mode === "solo" ? [state.solo] : [state.p1,state.p2], cardioEquipmentMissing = activePeople.some((p) => ((p.goals && p.goals.length) || p.goal) && p.experience && p.minutes && resolvedTrainingRoute(p) === "cardio" && !personReady(p));
  hint.textContent = ready ? "" : cardioEquipmentMissing ? "This cardio route needs Cardio equipment selected—or Bodyweight when jump rope / any mode is appropriate." : "Pick at least one goal, experience level, and session length.";
}
