/* ---- Public: build a single-person session ---- */
function buildSession(spec, seed) {
  const rng = makeRng(seed || 1);
  const g = GOALS[spec.goal];
  const prof = ageProfile(spec.age);
  const pool = eligible(spec, spec.age);
  const optionArchitecture = optionArchitectureForSpec(spec);
  if (resolvedTrainingRoute(spec) === "cardio") return buildCardioSession(spec,seed,pool);
  // Slot budget must respect the CLOCK. A strength session with 3-5 min rest
  // simply cannot fit as many exercises as a fat-loss circuit with 30s rest.
  // Estimate: minutes available (after warm-up) / (sets x time-per-set).
  const tpEarly = TIME_PROFILE[spec.minutes] || TIME_PROFILE[60];
  const warmupMin = 5 + prof.warmupBonus * 2;
  const availMin = spec.minutes - warmupMin;
  const setsEst = Math.max(2, RX_TABLE[spec.goal][spec.experience].sets + tpEarly.setDelta);
  const restMin = restToMinutes(scaleRest(RX_TABLE[spec.goal][spec.experience].rest, tpEarly.restScale));
  const perSetMin = 0.6 + restMin;                       // ~35s of work + rest
  const perExerciseMin = setsEst * perSetMin;
  const clockSlots = Math.max(2, Math.floor(availMin / perExerciseMin));
  const nominalSlots = Math.round(SLOTS_BY_TIME[spec.minutes] * prof.volumeMult);
  let slotBudget = Math.max(2, Math.min(nominalSlots, clockSlots));
  // Beginners improve faster from a small number of repeatable movements than
  // from a crowded exercise list. Preserve the session clock for coaching,
  // setup, and technique instead of filling every possible slot.
  if (spec.experience === 1) {
    const beginnerCaps = { 30: 3, 45: 4, 60: 5, 90: 7 };
    slotBudget = Math.min(slotBudget, beginnerCaps[spec.minutes] || 5);
  }
  // Mixed/performance routes reserve a slot for their defining non-lifting
  // work. Without this floor, long strength rests can consume the theoretical
  // clock and silently delete the cardio or power block the client selected.
  const routeForBudget = resolvedTrainingRoute(spec);
  if (routeForBudget === "mixed") slotBudget = Math.max(slotBudget,spec.minutes >= 45 ? 4 : 3);
  if (routeForBudget === "performance") slotBudget = Math.max(slotBudget,spec.minutes >= 45 ? 4 : 3);
  if (routeForBudget === "recovery") slotBudget = Math.max(slotBudget,3);

  const blocks = buildBlocks(spec, pool, rng, slotBudget);

  // Prescription: goal x experience, then age-adjusted, then TIME-adjusted.
  const baseRx = RX_TABLE[spec.goal][spec.experience];
  const ageRx = ageAdjustRx(baseRx, spec.age, spec.goal);
  const tp = TIME_PROFILE[spec.minutes] || TIME_PROFILE[60];
  const mainRx = {
    ...ageRx,
    sets: Math.max(2, ageRx.sets + tp.setDelta),
    rest: scaleRest(ageRx.rest, tp.restScale),
  };
  const prescription = {
    sets: String(mainRx.sets),
    reps: mainRx.reps,
    rest: mainRx.rest,
    tempo: TEMPO_BY_GOAL[spec.goal],
    rpe: mainRx.rpe,
  };

  // Attach a per-block prescription, and stamp each exercise with its own rx
  blocks.forEach((b) => {
    let raw = blockRx(mainRx, b.key, spec.goal, spec.age);
    if (b.key === "finisher") raw = finisherRx(b.kind, mainRx, spec.goal);
    if (b.key === "conditioning" && ["mixed","performance","recovery"].includes(resolvedTrainingRoute(spec))) raw = mixedConditioningPrescription(spec,optionArchitecture);
    b.rx = { ...raw, rest: scaleRest(raw.rest, tp.restScale) };
    // clone so we never mutate the shared LIBRARY objects
    b.items = b.items.map((ex) => Object.assign({}, ex, { rx:ex.warmupRx ? { ...ex.warmupRx } : { ...b.rx } }));
  });

  // Superset grouping: ONLY for blocks meant to be paired, and only where the
  // gym floor allows it (one station, two movements). Main strength stays
  // straight sets — nobody supersets a heavy squat.
  const PAIRABLE_BLOCKS = ["circuit", "accessory", "iso"];
  blocks.forEach((b) => {
    if (!PAIRABLE_BLOCKS.includes(b.key)) { b.groups = b.items.map((e) => ({ type: "straight", items: [e] })); return; }
    // Circuits (fat-loss/conditioning density work) always pair where possible.
    // Accessories pair only on hypertrophy/fatloss/general days, and only SOMETIMES
    // — a busy floor shouldn't see a superset in every single session.
    let maxPairs = 0;
    if (b.key === "circuit") {
      maxPairs = 2;
    } else if (spec.optionIndex != null && optionArchitecture.id === "volume") {
      maxPairs = 2;
    } else if (spec.optionIndex != null && optionArchitecture.id === "focused") {
      maxPairs = 0;
    } else if (["hypertrophy", "fatloss", "general"].includes(spec.goal)) {
      // ~50% of eligible sessions get a single accessory superset (seed-stable)
      maxPairs = (seed % 2 === 0) ? 1 : 0;
    }
    b.groups = maxPairs > 0 ? buildSupersets(b.items, maxPairs) : b.items.map((e) => ({ type: "straight", items: [e] }));
    b.hasSuperset = b.groups.some((gr) => gr.type === "superset");
  });

  // Muscle-focus note
  const targets = spec.muscles || [];
  let focusNote = "";
  if (targets.length) {
    const hit = new Set();
    blocks.forEach((b) => b.items.forEach((e) => (e.muscles || []).forEach((m) => { if (targets.includes(m)) hit.add(m); })));
    const covered = targets.filter((m) => hit.has(m));
    const missed = targets.filter((m) => !hit.has(m));
    if (covered.length) {
      focusNote = " Every working set targets " + covered.map((m) => MUSCLE_LABELS[m].toLowerCase()).join(", ")
        + " \u2014 the accessories reinforce the main lifts rather than scattering across the body.";
    }
    if (missed.length) focusNote += " (Limited options for " + missed.map((m) => MUSCLE_LABELS[m].toLowerCase()).join(", ") + " given the filters \u2014 add manually if needed.)";
  }

  // Experience note so the trainer sees why it looks the way it does
  const expNote = spec.experience === 3
    ? " Advanced variations prioritized."
    : spec.experience === 1 ? " Foundational variations prioritized to build technique." : "";

  const injuryNote = (spec.injuries && spec.injuries.length)
    ? " Movements that stress the " + spec.injuries.map((t) => INJURY_LABELS[t].toLowerCase()).join(", ") + " are filtered out."
    : "";
  const timeNote = tp.note ? " " + tp.note : "";
  const trainerPatternNote = spec.experience === 1
    ? " The plan stays intentionally simple: practice the primary patterns, prioritize form and repeatable reps, then use a short supporting block."
    : " The session moves from specific preparation into a clear primary lift emphasis, then supporting work; pairings are used only when they improve flow without weakening the main work.";
  const route = resolvedTrainingRoute(spec);
  const routeNote = route === "mixed" ? " This is a mixed session: resistance work stays purposeful, and the cardio block has its own time and intensity target."
    : route === "performance" ? " This is a performance session: speed and power are placed before fatigue, then supported by strength and repeat-effort conditioning."
    : route === "recovery" ? " This is a recovery route: aerobic work remains easy and the rest of the session restores comfortable movement."
    : route === "mobility" ? " This is a mobility-only route with no hard conditioning requirement."
    : "";
  const architectureNote = spec.optionIndex == null ? "" : " This option uses the " + optionArchitecture.title.toLowerCase() + " layout: " + optionArchitecture.description;
  const needsProgressiveRamp = spec.experience >= 2 && blocks.some((block) => block.key === "strength" && block.items.some((exercise) => ["rack","platform"].includes(exercise.zone)));
  const rampNote = needsProgressiveRamp ? " Use brief progressive ramp sets before the first loaded primary lift, adding load without tiring the client before the working sets." : "";
  const rationale = g.blurb + routeNote + focusNote + expNote + timeNote + injuryNote + trainerPatternNote + architectureNote + rampNote + (prof.note ? " " + prof.note : "");

  return finalizeGeneratedSession({
    spec,
    goalLabel: g.label,
    prescription,
    rationale,
    blocks,
    poolCount: pool.length,
    optionArchitecture,
    trainingRoute: route,
  });
}

/* Build from one primary goal plus one optional secondary goal. The primary
   goal owns the overall prescription and most of the session; one signature
   block from the secondary goal replaces a lower-priority block so duration
   stays honest instead of simply making the workout longer. */
const GOAL_BLEND_BLOCKS = {
  strength: ["strength"], hypertrophy: ["accessory", "iso"], fatloss: ["circuit", "conditioning"],
  general: ["accessory", "conditioning"], athletic: ["power", "plyo"], conditioning: ["conditioning"], recovery: ["mobility"],
};
const GOAL_REPLACE_ORDER = {
  strength: ["finisher", "conditioning", "mobility", "accessory"],
  hypertrophy: ["conditioning", "finisher", "mobility", "accessory"],
  fatloss: ["finisher", "accessory", "mobility"],
  general: ["finisher", "mobility", "accessory"],
  athletic: ["finisher", "conditioning", "accessory"],
  conditioning: ["finisher", "accessory", "mobility"],
  recovery: ["finisher", "conditioning", "accessory"],
};
function buildBlendedSession(spec, seed) {
  const requested = Array.isArray(spec.goals) && spec.goals.length ? spec.goals : [spec.goal];
  const goals = [...new Set(requested.filter((g) => GOALS[g]))].slice(0, 2);
  const primaryGoal = goals[0] || spec.goal || "general";
  const primarySpec = { ...spec, goal: primaryGoal, goals };
  const session = buildSession(primarySpec, seed);
  if (goals.length < 2) { session.spec.goals = [primaryGoal]; return finalizeGeneratedSession(session); }

  const secondaryGoal = goals[1];
  const protectedRoute = resolvedTrainingRoute(primarySpec);
  if (["cardio","recovery","mobility"].includes(protectedRoute)) {
    session.spec.goals = goals;
    session.goalLabel = goals.map((g) => GOALS[g].label).join(" + ");
    session.rationale = "Primary goal: " + GOALS[primaryGoal].label.toLowerCase() + ". Secondary goal: " + GOALS[secondaryGoal].label.toLowerCase() + ". The selected " + TRAINING_ROUTES[protectedRoute].title.toLowerCase() + " route controls the movement pattern, so the secondary goal adjusts the coaching intent without inserting an unrelated lifting block. " + session.rationale;
    return finalizeGeneratedSession(session);
  }
  const secondary = buildSession({ ...spec, goal: secondaryGoal, goals: [secondaryGoal] }, (seed || 1) + 7919);
  const existing = new Set(session.blocks.flatMap((b) => b.items.map((e) => e.name)));
  let chosen = null, fallbackSource = null, reusedExisting = false;
  for (const key of GOAL_BLEND_BLOCKS[secondaryGoal]) {
    if (!fallbackSource) fallbackSource = secondary.blocks.find((b) => b.key === key && b.items.length);
    const source = secondary.blocks.find((b) => b.key === key && b.items.some((e) => !existing.has(e.name)));
    if (source) {
      chosen = JSON.parse(JSON.stringify(source));
      chosen.items = chosen.items.filter((e) => !existing.has(e.name));
      if (chosen.groups) chosen.groups = chosen.items.map((e) => ({ type: "straight", items: [e] }));
      break;
    }
  }
  if (!chosen && fallbackSource) {
    chosen = JSON.parse(JSON.stringify(fallbackSource));
    reusedExisting = true;
  }
  if (chosen && chosen.items.length) {
    const existingStrengthIndex = session.blocks.findIndex((block) => block.key === "strength" && block.items.length);
    if (chosen.key === "strength" && existingStrengthIndex >= 0) {
      // A secondary strength goal changes the existing core-lift block; it
      // never creates a second primary lift or inherits a late replacement
      // position. If the same anchor is already present, keep its primary-goal
      // prescription and simply let the secondary goal reinforce its intent.
      if (!reusedExisting) session.blocks.splice(existingStrengthIndex,1,chosen);
    } else {
      if (reusedExisting) {
        const promoted = new Set(chosen.items.map((e) => e.name));
        session.blocks.forEach((block) => {
          if (block.key === "warmup") return;
          block.items = block.items.filter((e) => !promoted.has(e.name));
          if (block.groups) block.groups = block.items.map((e) => ({ type: "straight", items: [e] }));
        });
        session.blocks = session.blocks.filter((b) => b.key === "warmup" || b.items.length);
      }
      let replaceIndex = -1;
      const replaceOrder = protectedRoute === "mixed" ? GOAL_REPLACE_ORDER[secondaryGoal].filter((key) => key !== "conditioning") : GOAL_REPLACE_ORDER[secondaryGoal];
      for (const key of replaceOrder) {
        replaceIndex = session.blocks.map((b) => b.key).lastIndexOf(key);
        if (replaceIndex >= 0) break;
      }
      if (replaceIndex < 0) replaceIndex = Math.max(1, session.blocks.length - 1);
      session.blocks.splice(replaceIndex,1);
      session.blocks.splice(Math.min(replaceIndex,session.blocks.length),0,chosen);
    }
  }
  session.spec.goals = goals;
  session.goalLabel = goals.map((g) => GOALS[g].label).join(" + ");
  session.rationale = "Primary goal: " + GOALS[primaryGoal].label.toLowerCase() + ". Secondary goal: " + GOALS[secondaryGoal].label.toLowerCase()
    + ". The main prescription follows the primary goal, while a " + (chosen ? chosen.title.toLowerCase() : "supporting") + " block brings in the secondary goal without extending the session. " + session.rationale;
  return finalizeGeneratedSession(session);
}

/* ---- Public: build a group (2 people) session ---- */
function buildGroupSession(specA, specB, seed) {
  const a = buildBlendedSession(specA, seed);
  const b = buildBlendedSession(specB, seed ? seed + 7 : 8);

  // Find shared exercises (same goal often overlaps); mark station-sharing
  const namesA = new Set(a.blocks.flatMap((bl) => bl.items.map((e) => e.name)));
  const shared = [];
  b.blocks.forEach((bl) => bl.items.forEach((e) => { if (namesA.has(e.name)) shared.push(e.name); }));

  const sameGoal = (specA.goals || [specA.goal]).join("|") === (specB.goals || [specB.goal]).join("|");
  const format = sameGoal
    ? "Same goal \u2014 run this as partner sets: one works while the other rests, alternating through each block. Shared stations are marked."
    : "Different goals \u2014 stagger the two plans so partners rotate through separate stations and never wait on the same equipment.";

  return { group: true, a, b, shared: [...new Set(shared)], sameGoal, format };
}



/* ===== UI ===== */
/* ============================================================
   FIT4LIFE UI Controller
   ============================================================ */

const GOAL_OPTIONS = [
  ["strength", "Get stronger"], ["hypertrophy", "Build muscle"], ["fatloss", "Lose body fat"],
  ["general", "Feel fitter"], ["athletic", "Move faster & build power"], ["conditioning", "Improve stamina"],
  ["recovery", "Move better & recover"],
];
const GOAL_INFO = {
  strength: { title: "Get stronger", desc: "Resistance-first training with focused compound movements; optional easy cardio can follow." },
  hypertrophy: { title: "Build muscle", desc: "Muscle-building volume first, with an optional short low-impact cardio finish." },
  fatloss: { title: "Lose body fat", desc: "Choose mixed training, cardio focused, or resistance focused—this is not automatically a lifting workout." },
  general: { title: "Feel fitter", desc: "Blend strength, cardio, and mobility, or choose a cardio-only route on familiar machines." },
  athletic: { title: "Move faster & build power", desc: "Train speed, jumping, throws, athletic strength, or the engine that supports them." },
  conditioning: { title: "Improve stamina", desc: "Choose real aerobic base, tempo, or interval work on cardio equipment." },
  recovery: { title: "Move better & recover", desc: "Use easy aerobic movement, mobility, or light technique work without a hard fatigue target." },
};

