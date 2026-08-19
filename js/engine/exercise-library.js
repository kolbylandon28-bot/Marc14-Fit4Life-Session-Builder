/* ===== LIBRARY ===== */
/* ============================================================
   FIT4LIFE Exercise Library
   Each exercise:
     name      display name
     zone      equipment section: cardio | platform | rack | crossfit | dumbbell | machine | cable | bodyweight
     pattern   squat | hinge | lunge | h_push | v_push | h_pull | v_pull | carry | core | rotation | mobility | conditioning | plyo | olympic
     region    lower | push | pull | core | full | cardio | mobility
     exp       minimum experience: 1 new | 2 intermediate | 3 advanced
     impact    joint impact 0 low .. 3 high (used for age scaling + injury)
     unilateral true/false (balance demand)
     avoid     array of injury tags this movement stresses
     cue       short coaching cue
   Injury tags: knee, shoulder, lowback, wrist, hip, elbow, ankle, neck
   ============================================================ */

const LIBRARY = [
  /* ---------------- WARMUP / MOBILITY ---------------- */
  { name: "Treadmill incline walk", zone: "cardio", pattern: "mobility", region: "cardio", exp: 1, impact: 0, unilateral: false, avoid: [], muscles: [], preps: ["general", "lower"], cue: "Tall posture, easy nasal breathing to raise core temp." },
  { name: "Bike easy spin", zone: "cardio", pattern: "mobility", region: "cardio", exp: 1, impact: 0, unilateral: false, avoid: [], muscles: [], preps: ["general", "lower"], cue: "Light resistance, spin to loosen hips and knees." },
  { name: "Rower easy pace", zone: "cardio", pattern: "mobility", region: "cardio", exp: 1, impact: 0, unilateral: false, avoid: ["lowback"], muscles: [], preps: ["general", "upper", "lower"], cue: "Legs-first drive, keep the back tall, don't yank with arms." },
  { name: "Stair climber easy pace", zone: "cardio", pattern: "mobility", region: "cardio", exp: 1, impact: 0, unilateral: false, avoid: [], muscles: [], preps: ["general", "lower"], cue: "Use a level that keeps posture tall; hold the rails only for balance." },
  { name: "Elliptical easy pace", zone: "cardio", pattern: "mobility", region: "cardio", exp: 1, impact: 0, unilateral: false, avoid: [], muscles: [], preps: ["general", "lower", "upper"], cue: "Move smoothly at low resistance and let the arms share the work." },
  { name: "Leg swings", zone: "bodyweight", pattern: "mobility", region: "mobility", exp: 1, impact: 0, unilateral: true, avoid: [], muscles: [], preps: ["lower"], cue: "Controlled front-to-back and lateral swings, hold something for balance." },
  { name: "World's greatest stretch", zone: "bodyweight", pattern: "mobility", region: "mobility", exp: 1, impact: 0, unilateral: true, avoid: [], muscles: [], preps: ["general", "lower"], cue: "Lunge, elbow to instep, rotate open — one of the best full-body openers." },
  { name: "Cat-cow", zone: "bodyweight", pattern: "mobility", region: "mobility", exp: 1, impact: 0, unilateral: false, avoid: ["wrist"], muscles: [], preps: ["general", "core"], cue: "Segment the spine slowly, breathe with each rep." },
  { name: "Band pull-apart", zone: "cable", pattern: "mobility", region: "pull", exp: 1, impact: 0, unilateral: false, avoid: [], muscles: [], preps: ["upper", "push", "pull"], cue: "Squeeze shoulder blades, keep ribs down — great shoulder prep." },
  { name: "Band dislocates", zone: "cable", pattern: "mobility", region: "mobility", exp: 1, impact: 0, unilateral: false, avoid: ["shoulder"], muscles: [], preps: ["upper", "push"], cue: "Wide grip, slow overhead pass-through to open the shoulders." },
  { name: "Glute bridge", zone: "bodyweight", pattern: "hinge", region: "lower", exp: 1, impact: 0, unilateral: false, avoid: [], muscles: ["glutes"], preps: ["lower"], cue: "Drive through heels, squeeze glutes at the top, don't arch the low back." },
  { name: "Bird dog", zone: "bodyweight", pattern: "core", region: "core", exp: 1, impact: 0, unilateral: true, avoid: ["wrist"], muscles: ["core"], preps: ["core", "general"], cue: "Opposite arm/leg, move slow, keep hips level — anti-rotation control." },
  { name: "90/90 hip switch", zone: "bodyweight", pattern: "mobility", region: "mobility", exp: 1, impact: 0, unilateral: true, avoid: [], muscles: [], preps: ["lower"], cue: "Rotate both knees side to side, sit tall — opens internal/external hip rotation." },
  { name: "Ankle rocks", zone: "bodyweight", pattern: "mobility", region: "mobility", exp: 1, impact: 0, unilateral: true, avoid: [], muscles: [], preps: ["lower"], cue: "Knee over toe, heel down, gentle rock to free the ankle." },
  { name: "Thoracic rotation", zone: "bodyweight", pattern: "rotation", region: "mobility", exp: 1, impact: 0, unilateral: true, avoid: [], muscles: ["core"], preps: ["upper", "core", "general"], cue: "Open the upper back, follow the hand with your eyes." },
  { name: "Dead hang", zone: "rack", pattern: "mobility", region: "mobility", exp: 1, impact: 0, unilateral: false, avoid: ["shoulder"], muscles: [], preps: ["upper", "pull"], cue: "Relax and decompress the spine and shoulders; skip if shoulders are irritable." },
  { name: "Couch stretch", zone: "bodyweight", pattern: "mobility", region: "mobility", exp: 1, impact: 0, unilateral: true, avoid: ["knee"], muscles: [], preps: ["lower"], cue: "Rear foot elevated, tuck the pelvis — strong hip-flexor and quad stretch." },
  { name: "Child's pose reach", zone: "bodyweight", pattern: "mobility", region: "mobility", exp: 1, impact: 0, unilateral: false, avoid: [], muscles: [], preps: ["general", "upper"], cue: "Sit hips back, walk hands out, breathe into the lats." },

  /* ---------------- SQUAT ---------------- */
  { name: "Goblet squat", zone: "dumbbell", pattern: "squat", region: "lower", exp: 1, impact: 1, unilateral: false, avoid: [], muscles: ["quads","glutes"], cue: "Elbows inside knees, sit between the hips, chest tall." },
  { name: "Box squat", zone: "rack", pattern: "squat", region: "lower", exp: 1, impact: 1, unilateral: false, avoid: [], muscles: ["quads","glutes"], cue: "Sit back to the box, pause, drive up — teaches depth safely." },
  { name: "Leg press", zone: "machine", pattern: "squat", region: "lower", exp: 1, impact: 1, unilateral: false, avoid: ["knee"], muscles: ["quads","glutes"], cue: "Feet shoulder-width, control the descent, don't let knees cave." },
  { name: "Hack squat", zone: "machine", pattern: "squat", region: "lower", exp: 2, impact: 1, unilateral: false, avoid: ["knee"], muscles: ["quads","glutes"], cue: "Back flat on the pad, full controlled range." },
  { name: "Barbell back squat", zone: "rack", pattern: "squat", region: "lower", exp: 2, impact: 2, unilateral: false, avoid: ["knee", "lowback"], muscles: ["quads","glutes","hamstrings"], cue: "Brace hard, break at hips and knees together, drive the floor away." },
  { name: "Barbell front squat", zone: "rack", pattern: "squat", region: "lower", exp: 2, impact: 2, unilateral: false, avoid: ["knee", "wrist"], muscles: ["quads","glutes","core"], cue: "Elbows high, upright torso, stay tall through the whole rep." },
  { name: "Bulgarian split squat", zone: "dumbbell", pattern: "lunge", region: "lower", exp: 2, impact: 1, unilateral: true, avoid: ["knee", "hip"], muscles: ["quads","glutes"], cue: "Rear foot elevated, drop straight down, weight through the front heel." },
  { name: "Walking lunge", zone: "dumbbell", pattern: "lunge", region: "lower", exp: 2, impact: 2, unilateral: true, avoid: ["knee", "hip"], muscles: ["quads","glutes","hamstrings"], cue: "Long stride, vertical shin, control the descent each step." },
  { name: "Reverse lunge", zone: "dumbbell", pattern: "lunge", region: "lower", exp: 1, impact: 1, unilateral: true, avoid: ["knee"], muscles: ["quads","glutes"], cue: "Step back, drop the knee softly — easier on the joints than forward lunges." },
  { name: "Step-up", zone: "dumbbell", pattern: "lunge", region: "lower", exp: 1, impact: 1, unilateral: true, avoid: ["knee"], muscles: ["quads","glutes"], cue: "Full foot on the box, drive through the heel, control down." },
  { name: "Leg extension", zone: "machine", pattern: "squat", region: "lower", exp: 1, impact: 1, unilateral: false, avoid: ["knee"], muscles: ["quads"], cue: "Squeeze the quad at the top, lower slow — great isolation finisher." },

  /* ---------------- HINGE ---------------- */
  { name: "Dumbbell RDL", zone: "dumbbell", pattern: "hinge", region: "lower", exp: 1, impact: 1, unilateral: false, avoid: ["lowback"], muscles: ["hamstrings","glutes"], cue: "Soft knees, push hips back, feel the hamstrings, flat back." },
  { name: "Barbell RDL", zone: "rack", pattern: "hinge", region: "lower", exp: 2, impact: 1, unilateral: false, avoid: ["lowback"], muscles: ["hamstrings","glutes"], cue: "Bar close to the legs, hips back, stop at mid-shin with a flat back." },
  { name: "Kettlebell deadlift", zone: "crossfit", pattern: "hinge", region: "lower", exp: 1, impact: 1, unilateral: false, avoid: ["lowback"], muscles: ["hamstrings","glutes","back"], cue: "Hinge, grab the bell, stand tall by squeezing glutes." },
  { name: "Trap bar deadlift", zone: "platform", pattern: "hinge", region: "lower", exp: 2, impact: 2, unilateral: false, avoid: ["lowback"], muscles: ["hamstrings","glutes","quads","back"], cue: "Most joint-friendly deadlift — brace, push the floor away, lock out tall." },
  { name: "Conventional deadlift", zone: "platform", pattern: "hinge", region: "lower", exp: 3, impact: 2, unilateral: false, avoid: ["lowback"], muscles: ["hamstrings","glutes","back"], cue: "Bar over midfoot, wedge in, push floor away — flat back throughout." },
  { name: "Hip thrust", zone: "rack", pattern: "hinge", region: "lower", exp: 1, impact: 1, unilateral: false, avoid: [], muscles: ["glutes","hamstrings"], cue: "Ribs down, chin tucked, drive hips to full lockout and squeeze." },
  { name: "Single-leg RDL", zone: "dumbbell", pattern: "hinge", region: "lower", exp: 3, impact: 1, unilateral: true, avoid: ["lowback"], muscles: ["hamstrings","glutes"], cue: "Hinge over one leg, hips square, reach long — big balance demand." },
  { name: "Seated hamstring curl", zone: "machine", pattern: "hinge", region: "lower", exp: 1, impact: 0, unilateral: false, avoid: [], muscles: ["hamstrings"], cue: "Control both directions, avoid yanking — isolates the hamstrings." },
  { name: "Back extension", zone: "machine", pattern: "hinge", region: "lower", exp: 1, impact: 1, unilateral: false, avoid: ["lowback"], muscles: ["glutes","hamstrings","back"], cue: "Hinge at the hips, squeeze glutes at the top, don't hyperextend." },
  { name: "Cable pull-through", zone: "cable", pattern: "hinge", region: "lower", exp: 1, impact: 0, unilateral: false, avoid: [], muscles: ["glutes","hamstrings"], cue: "Hinge back, then snap hips forward — teaches the hinge with light load." },

  /* ---------------- HORIZONTAL PUSH ---------------- */
  { name: "Push-up", zone: "bodyweight", pattern: "h_push", region: "push", exp: 1, impact: 1, unilateral: false, avoid: ["wrist", "shoulder"], muscles: ["chest","shoulders","arms"], cue: "Straight line head to heels, elbows ~45°, full range." },
  { name: "Incline push-up", zone: "bodyweight", pattern: "h_push", region: "push", exp: 1, impact: 0, unilateral: false, avoid: ["wrist"], muscles: ["chest","shoulders","arms"], cue: "Hands elevated on a bench — regression that keeps the pattern honest." },
  { name: "Machine chest press", zone: "machine", pattern: "h_push", region: "push", exp: 1, impact: 1, unilateral: false, avoid: [], muscles: ["chest","shoulders","arms"], cue: "Handles at mid-chest, press smooth, don't lock out hard." },
  { name: "Dumbbell bench press", zone: "dumbbell", pattern: "h_push", region: "push", exp: 1, impact: 1, unilateral: false, avoid: ["shoulder"], muscles: ["chest","shoulders","arms"], cue: "Shoulder blades set, lower to chest level, press to stacked over shoulders." },
  { name: "Barbell bench press", zone: "rack", pattern: "h_push", region: "push", exp: 2, impact: 1, unilateral: false, avoid: ["shoulder", "wrist"], muscles: ["chest","shoulders","arms"], cue: "Tuck elbows, touch mid-chest, leg drive, controlled bar path." },
  { name: "Incline dumbbell press", zone: "dumbbell", pattern: "h_push", region: "push", exp: 2, impact: 1, unilateral: false, avoid: ["shoulder"], muscles: ["chest","shoulders"], cue: "30–45° bench, press up and slightly in — upper-chest bias." },
  { name: "Incline barbell bench press", zone: "rack", pattern: "h_push", region: "push", exp: 2, impact: 1, unilateral: false, avoid: ["shoulder","wrist"], muscles: ["chest","shoulders","arms"], cue: "Set the bench to 30–45°, touch the upper chest, and keep the shoulder blades anchored." },
  { name: "Decline barbell bench press", zone: "rack", pattern: "h_push", region: "push", exp: 2, impact: 1, unilateral: false, avoid: ["shoulder","wrist"], muscles: ["chest","arms"], cue: "Secure the legs, lower to the lower chest, and press back over the shoulders." },
  { name: "Decline dumbbell bench press", zone: "dumbbell", pattern: "h_push", region: "push", exp: 2, impact: 1, unilateral: false, avoid: ["shoulder"], muscles: ["chest","arms"], cue: "Use a small decline, keep the wrists stacked, and control the deeper dumbbell range." },
  { name: "Neutral-grip dumbbell bench press", zone: "dumbbell", pattern: "h_push", region: "push", exp: 1, impact: 0, unilateral: false, avoid: [], muscles: ["chest","arms"], cue: "Palms face each other, elbows stay close, and the shoulders remain packed." },
  { name: "Cable chest fly", zone: "cable", pattern: "h_push", region: "push", exp: 1, impact: 1, unilateral: false, avoid: ["shoulder"], muscles: ["chest"], cue: "Soft elbows, hug the arms together, squeeze the chest." },
  { name: "Floor press", zone: "dumbbell", pattern: "h_push", region: "push", exp: 1, impact: 0, unilateral: false, avoid: ["wrist"], muscles: ["chest","arms"], cue: "Elbows stop at the floor — shoulder-friendly pressing option." },

  /* ---------------- VERTICAL PUSH ---------------- */
  { name: "Seated dumbbell press", zone: "dumbbell", pattern: "v_push", region: "push", exp: 1, impact: 1, unilateral: false, avoid: ["shoulder"], muscles: ["shoulders","arms"], cue: "Ribs down, press overhead without flaring the low back." },
  { name: "Machine shoulder press", zone: "machine", pattern: "v_push", region: "push", exp: 1, impact: 1, unilateral: false, avoid: ["shoulder"], muscles: ["shoulders","arms"], cue: "Set the seat so handles start at shoulder height, press smooth." },
  { name: "Standing barbell press", zone: "rack", pattern: "v_push", region: "push", exp: 3, impact: 1, unilateral: false, avoid: ["shoulder", "lowback"], muscles: ["shoulders","arms","core"], cue: "Squeeze glutes, press the bar and bring the head through at lockout." },
  { name: "Landmine press", zone: "platform", pattern: "v_push", region: "push", exp: 1, impact: 0, unilateral: true, avoid: [], muscles: ["shoulders","chest"], cue: "Angled press is easy on the shoulder — great overhead alternative." },
  { name: "Half-kneeling cable press", zone: "cable", pattern: "v_push", region: "push", exp: 2, impact: 0, unilateral: true, avoid: ["shoulder"], muscles: ["shoulders","core"], cue: "Tall half-kneel, press up, resist the twist — core plus shoulder." },

  /* ---------------- HORIZONTAL PULL ---------------- */
  { name: "Seated cable row", zone: "cable", pattern: "h_pull", region: "pull", exp: 1, impact: 0, unilateral: false, avoid: [], muscles: ["back","arms"], cue: "Tall chest, pull to the belly, squeeze the mid-back, control back out." },
  { name: "Chest-supported row", zone: "machine", pattern: "h_pull", region: "pull", exp: 1, impact: 0, unilateral: false, avoid: [], muscles: ["back","arms"], cue: "Chest on the pad takes the low back out — pure upper-back work." },
  { name: "Single-arm machine row with iso hold", zone: "machine", pattern: "h_pull", region: "pull", exp: 1, impact: 0, unilateral: true, avoid: [], muscles: ["back","arms"], cue: "Hold one handle at full contraction while the other arm rows; meet in the squeeze, then switch sides." },
  { name: "One-arm dumbbell row", zone: "dumbbell", pattern: "h_pull", region: "pull", exp: 1, impact: 1, unilateral: true, avoid: ["lowback"], muscles: ["back","arms"], cue: "Flat back, drive the elbow to the hip, don't twist the torso." },
  { name: "Barbell bent row", zone: "rack", pattern: "h_pull", region: "pull", exp: 2, impact: 1, unilateral: false, avoid: ["lowback"], muscles: ["back","arms"], cue: "Hinge to ~45°, pull to the lower ribs, flat back throughout." },
  { name: "Inverted row", zone: "crossfit", pattern: "h_pull", region: "pull", exp: 1, impact: 1, unilateral: false, avoid: ["shoulder"], muscles: ["back","arms"], cue: "Body in a plank, pull chest to the bar — scalable bodyweight pull." },
  { name: "TRX row", zone: "crossfit", pattern: "h_pull", region: "pull", exp: 1, impact: 0, unilateral: false, avoid: [], muscles: ["back","arms"], cue: "Adjust foot position for difficulty, squeeze the shoulder blades." },

  /* ---------------- VERTICAL PULL ---------------- */
  { name: "Lat pulldown", zone: "cable", pattern: "v_pull", region: "pull", exp: 1, impact: 0, unilateral: false, avoid: [], muscles: ["back","arms"], cue: "Drive elbows down to the ribs, chest up, control the return." },
  { name: "Assisted pull-up", zone: "machine", pattern: "v_pull", region: "pull", exp: 1, impact: 1, unilateral: false, avoid: ["shoulder"], muscles: ["back","arms"], cue: "Full hang to chin over bar, let the machine assist the sticking point." },
  { name: "Pull-up", zone: "rack", pattern: "v_pull", region: "pull", exp: 3, impact: 1, unilateral: false, avoid: ["shoulder", "elbow"], muscles: ["back","arms"], cue: "Dead hang, pull the chest to the bar, control all the way down." },
  { name: "Chin-up", zone: "rack", pattern: "v_pull", region: "pull", exp: 2, impact: 1, unilateral: false, avoid: ["elbow"], muscles: ["back","arms"], cue: "Underhand grip, drive elbows down — a little more biceps." },
  { name: "Straight-arm pulldown", zone: "cable", pattern: "v_pull", region: "pull", exp: 1, impact: 0, unilateral: false, avoid: ["shoulder"], muscles: ["back"], cue: "Soft elbows, sweep the bar to the thighs — lat isolation." },

  /* ---------------- CARRY / CORE ---------------- */
  { name: "Farmer carry", zone: "dumbbell", pattern: "carry", region: "core", exp: 1, impact: 1, unilateral: false, avoid: [], muscles: ["core","back"], cue: "Tall and braced, crush the handles, walk smooth and controlled." },
  { name: "Suitcase carry", zone: "dumbbell", pattern: "carry", region: "core", exp: 1, impact: 1, unilateral: true, avoid: [], muscles: ["core"], cue: "Load one side, resist the lean — anti-lateral-flexion core work." },
  { name: "Dead bug", zone: "bodyweight", pattern: "core", region: "core", exp: 1, impact: 0, unilateral: true, avoid: [], muscles: ["core"], cue: "Low back glued to the floor, extend opposite arm/leg slowly." },
  { name: "Pallof press", zone: "cable", pattern: "core", region: "core", exp: 1, impact: 0, unilateral: false, avoid: [], muscles: ["core"], cue: "Press straight out, resist the rotation — anti-rotation core." },
  { name: "Front plank", zone: "bodyweight", pattern: "core", region: "core", exp: 1, impact: 0, unilateral: false, avoid: ["shoulder", "wrist"], muscles: ["core"], cue: "Squeeze glutes, ribs down, straight line — quality over duration." },
  { name: "Side plank", zone: "bodyweight", pattern: "core", region: "core", exp: 2, impact: 0, unilateral: true, avoid: ["shoulder"], muscles: ["core"], cue: "Stack the hips, drive the bottom hip tall, don't sag." },
  { name: "Hanging knee raise", zone: "rack", pattern: "core", region: "core", exp: 2, impact: 1, unilateral: false, avoid: ["shoulder"], muscles: ["core"], cue: "Curl the pelvis up, control the swing — no kipping." },
  { name: "Cable woodchop", zone: "cable", pattern: "rotation", region: "core", exp: 2, impact: 0, unilateral: true, avoid: ["lowback"], muscles: ["core"], cue: "Rotate from the trunk, arms stay long, control the return." },
  { name: "Ab wheel rollout", zone: "crossfit", pattern: "core", region: "core", exp: 3, impact: 1, unilateral: false, avoid: ["lowback", "shoulder"], muscles: ["core"], cue: "Ribs down, roll only as far as you can keep a flat back." },

  /* ---------------- ISOLATION / ACCESSORY ---------------- */
  { name: "Dumbbell curl", zone: "dumbbell", pattern: "h_pull", region: "pull", exp: 1, impact: 0, unilateral: false, avoid: ["elbow"], muscles: ["arms"], cue: "Elbows pinned, no swing, squeeze at the top." },
  { name: "Cable curl", zone: "cable", pattern: "h_pull", region: "pull", exp: 1, impact: 0, unilateral: false, avoid: ["elbow"], muscles: ["arms"], cue: "Constant tension, control the lowering." },
  { name: "Triceps pushdown", zone: "cable", pattern: "h_push", region: "push", exp: 1, impact: 0, unilateral: false, avoid: ["elbow"], muscles: ["arms"], cue: "Elbows locked at the sides, full extension, control up." },
  { name: "Overhead triceps extension", zone: "dumbbell", pattern: "v_push", region: "push", exp: 1, impact: 0, unilateral: false, avoid: ["elbow", "shoulder"], muscles: ["arms"], cue: "Keep elbows narrow, stretch behind the head, extend fully." },
  { name: "Lateral raise", zone: "dumbbell", pattern: "v_push", region: "push", exp: 1, impact: 0, unilateral: false, avoid: ["shoulder"], muscles: ["shoulders"], cue: "Lead with the elbows, stop at shoulder height, no shrugging." },
  { name: "Face pull", zone: "cable", pattern: "h_pull", region: "pull", exp: 1, impact: 0, unilateral: false, avoid: [], muscles: ["back","shoulders"], cue: "Pull to the forehead, thumbs back — bulletproofs the shoulders." },
  { name: "Rear delt fly", zone: "dumbbell", pattern: "h_pull", region: "pull", exp: 1, impact: 0, unilateral: false, avoid: [], muscles: ["shoulders","back"], cue: "Soft elbows, hinge over, squeeze the rear delts." },
  { name: "Calf raise", zone: "machine", pattern: "squat", region: "lower", exp: 1, impact: 0, unilateral: false, avoid: [], muscles: ["calves"], cue: "Full stretch at the bottom, tall squeeze at the top, controlled." },

  /* ---------------- CONDITIONING ---------------- */
  { name: "Row intervals", zone: "cardio", pattern: "conditioning", region: "cardio", exp: 1, impact: 0, unilateral: false, avoid: ["lowback"], muscles: ["back","hamstrings"], cue: "Legs-drive first, strong finish, relax on the recovery stroke." },
  { name: "Assault bike intervals", zone: "cardio", pattern: "conditioning", region: "cardio", exp: 1, impact: 0, unilateral: false, avoid: [], muscles: [], cue: "Drive arms and legs together — scalable, joint-friendly engine work." },
  { name: "Ski erg intervals", zone: "cardio", pattern: "conditioning", region: "cardio", exp: 1, impact: 0, unilateral: false, avoid: ["shoulder"], muscles: ["back","core"], cue: "Hinge and drive down through the handles, full extension." },
  { name: "Incline treadmill intervals", zone: "cardio", pattern: "conditioning", region: "cardio", exp: 1, impact: 1, unilateral: false, avoid: [], muscles: ["quads","calves"], cue: "Raise incline before speed to spare the joints." },
  { name: "Stair climber intervals", zone: "cardio", pattern: "conditioning", region: "cardio", exp: 1, impact: 1, unilateral: false, avoid: [], muscles: ["quads","glutes","calves"], cue: "Climb tall at a repeatable level; avoid hanging body weight on the rails." },
  { name: "Stationary bike intervals", zone: "cardio", pattern: "conditioning", region: "cardio", exp: 1, impact: 0, unilateral: false, avoid: [], muscles: ["quads","glutes"], cue: "Use resistance that keeps the pedal stroke smooth and the hips quiet." },
  { name: "Elliptical intervals", zone: "cardio", pattern: "conditioning", region: "cardio", exp: 1, impact: 0, unilateral: false, avoid: [], muscles: ["quads","glutes"], cue: "Hold an even stride and use the handles without shrugging the shoulders." },
  { name: "Kettlebell swing", zone: "crossfit", pattern: "hinge", region: "full", exp: 2, impact: 1, unilateral: false, avoid: ["lowback"], muscles: ["glutes","hamstrings","back"], cue: "Hips snap the bell up, arms are just hooks, brace hard at the top." },
  { name: "VersaClimber intervals", zone: "cardio", pattern: "conditioning", region: "full", exp: 1, impact: 0, unilateral: false, avoid: ["shoulder"], muscles: ["shoulders","arms","core"], cue: "Use short, quick strokes at a repeatable pace and keep the trunk braced." },
  { name: "HIITMill forward drive", zone: "cardio", pattern: "conditioning", region: "full", exp: 1, impact: 1, unilateral: false, avoid: [], muscles: ["quads","glutes"], cue: "Use the HIITMill handles, keep a low body angle, and drive with powerful steps." },
  { name: "HIITMill backward drive", zone: "cardio", pattern: "conditioning", region: "full", exp: 1, impact: 0, unilateral: false, avoid: [], muscles: ["quads","glutes"], cue: "Face away only with trainer control, hold the rails, and take short deliberate backward steps." },
  { name: "Treadmill cardio", zone: "cardio", pattern: "conditioning", region: "cardio", exp: 1, impact: 1, unilateral: false, avoid: [], muscles: ["quads","calves"], cue: "Choose speed and incline that match the prescribed effort; stay tall and use the rails only for balance." },
  { name: "Stair climber cardio", zone: "cardio", pattern: "conditioning", region: "cardio", exp: 1, impact: 1, unilateral: false, avoid: [], muscles: ["quads","glutes","calves"], cue: "Climb tall at a repeatable level and avoid hanging body weight on the rails." },
  { name: "Stationary bike cardio", zone: "cardio", pattern: "conditioning", region: "cardio", exp: 1, impact: 0, unilateral: false, avoid: [], muscles: ["quads","glutes"], cue: "Adjust resistance to match the prescribed effort while keeping the pedal stroke smooth." },
  { name: "Rower cardio", zone: "cardio", pattern: "conditioning", region: "cardio", exp: 1, impact: 0, unilateral: false, avoid: ["lowback"], muscles: ["back","hamstrings"], cue: "Drive with the legs, finish with the arms, and keep every recovery stroke relaxed." },
  { name: "Elliptical cardio", zone: "cardio", pattern: "conditioning", region: "cardio", exp: 1, impact: 0, unilateral: false, avoid: [], muscles: ["quads","glutes"], cue: "Keep a smooth stride and let the handles share the work without shrugging." },
  { name: "Ski erg cardio", zone: "cardio", pattern: "conditioning", region: "cardio", exp: 1, impact: 0, unilateral: false, avoid: ["shoulder"], muscles: ["back","core"], cue: "Hinge and drive through the handles at the prescribed effort without rounding the back." },
  { name: "VersaClimber cardio", zone: "cardio", pattern: "conditioning", region: "cardio", exp: 1, impact: 0, unilateral: false, avoid: ["shoulder"], muscles: ["shoulders","core"], cue: "Use smooth opposing arm and leg strokes at a pace you can repeat." },
  { name: "HIITMill cardio", zone: "cardio", pattern: "conditioning", region: "cardio", exp: 1, impact: 1, unilateral: false, avoid: [], muscles: ["quads","glutes"], cue: "Keep a stable body angle and match step speed to the prescribed effort." },
  { name: "Jump rope cardio", zone: "bodyweight", pattern: "conditioning", region: "cardio", exp: 1, impact: 2, unilateral: false, avoid: ["ankle","knee"], muscles: ["calves"], cue: "Stay relaxed, use small quiet contacts, and choose a rhythm you can repeat." },
  { name: "Med ball slam", zone: "crossfit", pattern: "conditioning", region: "full", exp: 1, impact: 1, unilateral: false, avoid: ["lowback", "shoulder"], muscles: ["core","back"], cue: "Full overhead reach, slam hard, absorb the catch." },
  { name: "Box step-over", zone: "crossfit", pattern: "conditioning", region: "full", exp: 1, impact: 1, unilateral: true, avoid: ["knee"], muscles: ["quads","glutes"], cue: "Step up and over continuously, controlled — low-impact engine work." },
  { name: "Mountain climber intervals", zone: "bodyweight", pattern: "conditioning", region: "core", exp: 1, impact: 1, unilateral: true, avoid: ["wrist","shoulder"], muscles: ["core"], cue: "Brace the trunk and drive alternating knees without letting the hips bounce." },
  { name: "Plank shoulder-tap intervals", zone: "bodyweight", pattern: "conditioning", region: "core", exp: 1, impact: 0, unilateral: true, avoid: ["wrist","shoulder"], muscles: ["core"], cue: "Widen the feet, tap slowly, and keep the hips square to the floor." },
  { name: "Dead-bug intervals", zone: "bodyweight", pattern: "conditioning", region: "core", exp: 1, impact: 0, unilateral: true, avoid: [], muscles: ["core"], cue: "Move continuously but slowly; keep the low back gently pressed down." },
  { name: "Suitcase march intervals", zone: "dumbbell", pattern: "conditioning", region: "core", exp: 1, impact: 0, unilateral: true, avoid: [], muscles: ["core"], cue: "Hold one weight, march tall, and resist leaning toward the load." },
  { name: "Hollow-body march intervals", zone: "bodyweight", pattern: "conditioning", region: "core", exp: 1, impact: 0, unilateral: true, avoid: ["lowback"], muscles: ["core"], cue: "Keep the ribs down and alternate slow heel taps without losing trunk position." },
  { name: "Seated knee-tuck intervals", zone: "bodyweight", pattern: "conditioning", region: "core", exp: 1, impact: 0, unilateral: false, avoid: ["lowback"], muscles: ["core"], cue: "Lean back slightly, extend and tuck the legs, and keep the movement controlled." },
  { name: "Pallof step-out intervals", zone: "cable", pattern: "conditioning", region: "core", exp: 1, impact: 0, unilateral: true, avoid: [], muscles: ["core"], cue: "Press the cable out, step away and back, and resist rotation throughout." },

  /* ---------------- PLYO / ATHLETIC ---------------- */
  { name: "Medicine ball chest pass", zone: "crossfit", pattern: "plyo", region: "push", exp: 1, impact: 1, unilateral: false, avoid: ["shoulder"], muscles: ["chest","shoulders","arms"], cue: "Start at the chest, brace, and throw straight ahead with maximum speed; reset fully between reps." },
  { name: "Plyometric push-up", zone: "bodyweight", pattern: "plyo", region: "push", exp: 2, impact: 2, unilateral: false, avoid: ["wrist","shoulder","elbow"], muscles: ["chest","shoulders","arms"], cue: "Explode just high enough for the hands to leave the floor, land softly, and stop the set when speed drops." },
  { name: "Box jump", zone: "crossfit", pattern: "plyo", region: "lower", exp: 2, impact: 3, unilateral: false, avoid: ["knee", "hip", "ankle"], muscles: ["quads","glutes"], cue: "Load the hips, land soft and quiet, step down — never rebound down." },
  { name: "Broad jump", zone: "crossfit", pattern: "plyo", region: "lower", exp: 2, impact: 3, unilateral: false, avoid: ["knee", "hip", "ankle", "lowback"], muscles: ["quads","glutes","hamstrings"], cue: "Big arm swing, land soft with bent knees, stick the landing." },
  { name: "Medicine ball rotational throw", zone: "crossfit", pattern: "rotation", region: "full", exp: 2, impact: 2, unilateral: true, avoid: ["lowback", "shoulder"], muscles: ["core"], cue: "Rotate through the hips, throw hard, control the reset." },
  { name: "Skater bound", zone: "bodyweight", pattern: "plyo", region: "lower", exp: 2, impact: 3, unilateral: true, avoid: ["knee", "hip", "ankle"], muscles: ["quads","glutes"], cue: "Bound side to side, stick each landing — lateral power and control." },
  { name: "Pogo hops", zone: "bodyweight", pattern: "plyo", region: "lower", exp: 1, impact: 2, unilateral: false, avoid: ["ankle"], muscles: ["calves"], cue: "Stiff ankles, quick low hops off the balls of the feet." },
  { name: "Agility ladder", zone: "crossfit", pattern: "plyo", region: "lower", exp: 1, impact: 2, unilateral: false, avoid: ["knee", "ankle"], muscles: ["quads","calves"], cue: "Light quick feet, stay on the balls of the feet, eyes up." },
  { name: "Lateral bound to stick", zone: "bodyweight", pattern: "plyo", region: "lower", exp: 2, impact: 2, unilateral: true, avoid: ["knee", "ankle"], muscles: ["quads","glutes"], cue: "Push off one leg, land and freeze for a beat — builds control." },

  /* ---------------- OLYMPIC / POWER (platform, advanced) ---------------- */
  { name: "Power clean", zone: "platform", pattern: "olympic", region: "full", exp: 3, impact: 2, unilateral: false, avoid: ["lowback", "wrist", "knee"], muscles: ["back","glutes","hamstrings","shoulders"], cue: "Explode through the hips, fast elbows, catch in a quarter squat." },
  { name: "Hang power clean", zone: "platform", pattern: "olympic", region: "full", exp: 3, impact: 2, unilateral: false, avoid: ["lowback", "wrist"], muscles: ["back","glutes","shoulders"], cue: "From the hip, violent hip snap, meet the bar in the front rack." },
  { name: "Push press", zone: "platform", pattern: "v_push", region: "full", exp: 2, impact: 1, unilateral: false, avoid: ["shoulder", "lowback"], muscles: ["shoulders","arms","glutes"], cue: "Small dip, drive with the legs, finish the press overhead." },
  { name: "Medicine ball clean", zone: "crossfit", pattern: "olympic", region: "full", exp: 2, impact: 1, unilateral: false, avoid: ["lowback"], muscles: ["glutes","shoulders","core"], cue: "Great way to learn triple extension without a barbell." },

/* ---------------- ADDED: SQUAT depth ---------------- */
  { name: "Pause back squat", zone: "rack", pattern: "squat", region: "lower", exp: 3, impact: 2, unilateral: false, avoid: ["knee","lowback"], muscles: ["quads","glutes","hamstrings"], cue: "2-count pause in the hole, no bounce — brutal position strength." },
  { name: "Tempo front squat", zone: "rack", pattern: "squat", region: "lower", exp: 3, impact: 2, unilateral: false, avoid: ["knee","wrist"], muscles: ["quads","core"], cue: "4s descent, stay upright, drive out hard — exposes any weak link." },
  { name: "Smith machine squat", zone: "machine", pattern: "squat", region: "lower", exp: 2, impact: 2, unilateral: false, avoid: ["knee","lowback"], muscles: ["quads","glutes"], cue: "Set the safeties, keep the whole foot planted, and stay braced through a pain-free range." },
  { name: "Zercher squat", zone: "rack", pattern: "squat", region: "lower", exp: 3, impact: 2, unilateral: false, avoid: ["knee","lowback"], muscles: ["quads","glutes","core"], cue: "Bar in the elbow crease, brace like your life depends on it." },
  { name: "Belt squat", zone: "machine", pattern: "squat", region: "lower", exp: 2, impact: 1, unilateral: false, avoid: ["knee"], muscles: ["quads","glutes"], cue: "Loads the legs with zero spinal compression." },
  { name: "Front-foot-elevated split squat", zone: "dumbbell", pattern: "lunge", region: "lower", exp: 2, impact: 1, unilateral: true, avoid: ["knee"], muscles: ["quads","glutes"], cue: "Elevate the front foot for extra depth and quad stretch." },
  { name: "Deficit reverse lunge", zone: "dumbbell", pattern: "lunge", region: "lower", exp: 3, impact: 2, unilateral: true, avoid: ["knee","hip"], muscles: ["quads","glutes"], cue: "Step off a plate — bigger range, bigger glute stretch." },
  { name: "Cyclist squat", zone: "dumbbell", pattern: "squat", region: "lower", exp: 2, impact: 1, unilateral: false, avoid: ["knee"], muscles: ["quads"], cue: "Heels elevated, upright torso — quad-dominant squat." },
  { name: "Sissy squat", zone: "bodyweight", pattern: "squat", region: "lower", exp: 3, impact: 2, unilateral: false, avoid: ["knee"], muscles: ["quads"], cue: "Knees travel forward, hips stay extended — advanced quad isolation." },

  /* ---------------- ADDED: HINGE depth ---------------- */
  { name: "Deficit deadlift", zone: "platform", pattern: "hinge", region: "lower", exp: 3, impact: 2, unilateral: false, avoid: ["lowback"], muscles: ["hamstrings","glutes","back"], cue: "Stand on a plate — longer pull, stronger off the floor." },
  { name: "Snatch-grip RDL", zone: "rack", pattern: "hinge", region: "lower", exp: 3, impact: 1, unilateral: false, avoid: ["lowback"], muscles: ["hamstrings","glutes","back"], cue: "Wide grip loads the upper back and hamstrings hard." },
  { name: "Pause deadlift", zone: "platform", pattern: "hinge", region: "lower", exp: 3, impact: 2, unilateral: false, avoid: ["lowback"], muscles: ["hamstrings","glutes","back"], cue: "Pause 2s below the knee — kills any bar drift." },
  { name: "Barbell good morning", zone: "rack", pattern: "hinge", region: "lower", exp: 3, impact: 1, unilateral: false, avoid: ["lowback"], muscles: ["hamstrings","glutes","back"], cue: "Light load, hips back, flat back — posterior chain builder." },
  { name: "Single-leg hip thrust", zone: "bodyweight", pattern: "hinge", region: "lower", exp: 2, impact: 1, unilateral: true, avoid: [], muscles: ["glutes","hamstrings"], cue: "One leg, ribs down, full lockout — exposes side-to-side gaps." },
  { name: "Nordic hamstring curl", zone: "bodyweight", pattern: "hinge", region: "lower", exp: 3, impact: 1, unilateral: false, avoid: ["knee"], muscles: ["hamstrings"], cue: "Lower as slowly as you can control — elite hamstring eccentric." },
  { name: "Romanian deadlift (barbell, tempo)", zone: "rack", pattern: "hinge", region: "lower", exp: 2, impact: 1, unilateral: false, avoid: ["lowback"], muscles: ["hamstrings","glutes"], cue: "3s down, feel the stretch, drive hips through." },
  { name: "45-degree back extension (weighted)", zone: "machine", pattern: "hinge", region: "lower", exp: 2, impact: 1, unilateral: false, avoid: ["lowback"], muscles: ["glutes","hamstrings","back"], cue: "Hold a plate, hinge and squeeze — don't hyperextend." },

  /* ---------------- ADDED: PUSH depth ---------------- */
  { name: "Close-grip bench press", zone: "rack", pattern: "h_push", region: "push", exp: 2, impact: 1, unilateral: false, avoid: ["shoulder","wrist","elbow"], muscles: ["chest","arms"], cue: "Shoulder-width grip, tuck elbows — triceps and lockout strength." },
  { name: "Pause bench press", zone: "rack", pattern: "h_push", region: "push", exp: 3, impact: 1, unilateral: false, avoid: ["shoulder","wrist"], muscles: ["chest","shoulders","arms"], cue: "1s pause on the chest, no bounce — pure pressing strength." },
  { name: "Weighted dip", zone: "rack", pattern: "h_push", region: "push", exp: 3, impact: 1, unilateral: false, avoid: ["shoulder","elbow"], muscles: ["chest","arms","shoulders"], cue: "Slight forward lean, control the bottom — stop if shoulders complain." },
  { name: "Dip", zone: "rack", pattern: "h_push", region: "push", exp: 2, impact: 1, unilateral: false, avoid: ["shoulder","elbow"], muscles: ["chest","arms","shoulders"], cue: "Chest slightly forward, elbows back, full lockout." },
  { name: "Larsen press", zone: "rack", pattern: "h_push", region: "push", exp: 3, impact: 1, unilateral: false, avoid: ["shoulder","wrist"], muscles: ["chest","arms"], cue: "Feet up, no leg drive — all upper body, brutal stability." },
  { name: "Single-arm dumbbell bench press", zone: "dumbbell", pattern: "h_push", region: "push", exp: 3, impact: 1, unilateral: true, avoid: ["shoulder"], muscles: ["chest","core","arms"], cue: "One arm at a time, resist the roll — huge anti-rotation demand." },
  { name: "Deficit push-up", zone: "bodyweight", pattern: "h_push", region: "push", exp: 2, impact: 1, unilateral: false, avoid: ["wrist","shoulder"], muscles: ["chest","shoulders","arms"], cue: "Hands on plates for a deeper stretch." },
  { name: "Archer push-up", zone: "bodyweight", pattern: "h_push", region: "push", exp: 3, impact: 1, unilateral: true, avoid: ["wrist","shoulder"], muscles: ["chest","arms"], cue: "Shift weight to one arm — bridge toward one-arm push-ups." },
  { name: "Seated barbell overhead press", zone: "rack", pattern: "v_push", region: "push", exp: 2, impact: 1, unilateral: false, avoid: ["shoulder"], muscles: ["shoulders","arms"], cue: "Back supported, press straight overhead, ribs down." },
  { name: "Z-press", zone: "platform", pattern: "v_push", region: "push", exp: 3, impact: 1, unilateral: false, avoid: ["shoulder","lowback"], muscles: ["shoulders","core"], cue: "Seated on the floor, legs straight — nowhere to hide." },
  { name: "Arnold press", zone: "dumbbell", pattern: "v_push", region: "push", exp: 2, impact: 1, unilateral: false, avoid: ["shoulder"], muscles: ["shoulders","arms"], cue: "Rotate as you press — hits all three delt heads." },
  { name: "Single-arm dumbbell push press", zone: "dumbbell", pattern: "v_push", region: "push", exp: 2, impact: 1, unilateral: true, avoid: ["shoulder","lowback"], muscles: ["shoulders","glutes","core"], cue: "Small dip, drive with the legs, lock it out overhead." },

  /* ---------------- ADDED: PULL depth ---------------- */
  { name: "Weighted pull-up", zone: "rack", pattern: "v_pull", region: "pull", exp: 3, impact: 1, unilateral: false, avoid: ["shoulder","elbow"], muscles: ["back","arms"], cue: "Add load once bodyweight sets are easy — full dead hang each rep." },
  { name: "Pendlay row", zone: "rack", pattern: "h_pull", region: "pull", exp: 3, impact: 1, unilateral: false, avoid: ["lowback"], muscles: ["back","arms"], cue: "Bar resets on the floor each rep, explosive pull to the sternum." },
  { name: "Meadows row", zone: "platform", pattern: "h_pull", region: "pull", exp: 3, impact: 1, unilateral: true, avoid: ["lowback"], muscles: ["back","arms"], cue: "Landmine, staggered stance, big stretch and squeeze." },
  { name: "Seal row", zone: "dumbbell", pattern: "h_pull", region: "pull", exp: 2, impact: 0, unilateral: false, avoid: [], muscles: ["back","arms"], cue: "Chest on a high bench, no body english — pure back." },
  { name: "T-bar row", zone: "platform", pattern: "h_pull", region: "pull", exp: 2, impact: 1, unilateral: false, avoid: ["lowback"], muscles: ["back","arms"], cue: "Hinge hard, pull to the belly, squeeze the mid-back." },
  { name: "Chest-supported T-bar row", zone: "machine", pattern: "h_pull", region: "pull", exp: 2, impact: 0, unilateral: false, avoid: [], muscles: ["back","arms"], cue: "Pad takes the back out, so chase the squeeze." },
  { name: "Weighted chin-up", zone: "rack", pattern: "v_pull", region: "pull", exp: 3, impact: 1, unilateral: false, avoid: ["elbow"], muscles: ["back","arms"], cue: "Underhand, loaded — one of the best upper-body builders." },
  { name: "Neutral-grip pull-up", zone: "rack", pattern: "v_pull", region: "pull", exp: 2, impact: 1, unilateral: false, avoid: ["shoulder"], muscles: ["back","arms"], cue: "Palms facing, easiest on the shoulders and elbows." },
  { name: "Single-arm lat pulldown", zone: "cable", pattern: "v_pull", region: "pull", exp: 2, impact: 0, unilateral: true, avoid: [], muscles: ["back","arms"], cue: "One arm, full stretch overhead, drive the elbow to the hip." },
  { name: "Chest-supported dumbbell row", zone: "dumbbell", pattern: "h_pull", region: "pull", exp: 1, impact: 0, unilateral: false, avoid: [], muscles: ["back","arms"], cue: "Incline bench, pull the elbows back and squeeze." },
  { name: "Barbell shrug", zone: "rack", pattern: "h_pull", region: "pull", exp: 1, impact: 0, unilateral: false, avoid: ["neck"], muscles: ["back"], cue: "Straight up, pause at the top, no rolling." },
  { name: "Incline dumbbell curl", zone: "dumbbell", pattern: "h_pull", region: "pull", exp: 2, impact: 0, unilateral: false, avoid: ["elbow"], muscles: ["arms"], cue: "Arms behind the torso for a bigger biceps stretch." },
  { name: "Hammer curl", zone: "dumbbell", pattern: "h_pull", region: "pull", exp: 1, impact: 0, unilateral: false, avoid: ["elbow"], muscles: ["arms"], cue: "Neutral grip, elbows pinned — brachialis and forearms." },
  { name: "Preacher curl", zone: "machine", pattern: "h_pull", region: "pull", exp: 2, impact: 0, unilateral: false, avoid: ["elbow"], muscles: ["arms"], cue: "No swing possible — control the eccentric fully." },

  /* ---------------- ADDED: ARMS / ISO depth ---------------- */
  { name: "Skull crusher", zone: "rack", pattern: "v_push", region: "push", exp: 2, impact: 0, unilateral: false, avoid: ["elbow","shoulder"], muscles: ["arms"], cue: "Lower to the forehead, elbows stay pointed up." },
  { name: "Cable overhead triceps extension", zone: "cable", pattern: "v_push", region: "push", exp: 2, impact: 0, unilateral: false, avoid: ["elbow","shoulder"], muscles: ["arms"], cue: "Constant tension through the stretch — great long-head work." },
  { name: "Close-grip push-up", zone: "bodyweight", pattern: "h_push", region: "push", exp: 1, impact: 1, unilateral: false, avoid: ["wrist","elbow"], muscles: ["arms","chest"], cue: "Hands under the shoulders, elbows tight to the ribs." },
  { name: "Cable lateral raise", zone: "cable", pattern: "v_push", region: "push", exp: 2, impact: 0, unilateral: true, avoid: ["shoulder"], muscles: ["shoulders"], cue: "Constant tension from the bottom — better than dumbbells for delts." },
  { name: "Reverse pec deck", zone: "machine", pattern: "h_pull", region: "pull", exp: 1, impact: 0, unilateral: false, avoid: [], muscles: ["shoulders","back"], cue: "Squeeze the rear delts, don't shrug." },
  { name: "Standing calf raise (single-leg)", zone: "bodyweight", pattern: "squat", region: "lower", exp: 2, impact: 0, unilateral: true, avoid: [], muscles: ["calves"], cue: "Full stretch, pause at the top, one leg at a time." },
  { name: "Seated calf raise", zone: "machine", pattern: "squat", region: "lower", exp: 1, impact: 0, unilateral: false, avoid: [], muscles: ["calves"], cue: "Bent knee targets the soleus — slow and full range." },

  /* ---------------- ADDED: CORE depth ---------------- */
  { name: "Hanging leg raise", zone: "rack", pattern: "core", region: "core", exp: 3, impact: 1, unilateral: false, avoid: ["shoulder"], muscles: ["core"], cue: "Straight legs to the bar, no swing — curl the pelvis." },
  { name: "Weighted plank", zone: "bodyweight", pattern: "core", region: "core", exp: 2, impact: 0, unilateral: false, avoid: ["shoulder","wrist"], muscles: ["core"], cue: "Plate on the back, ribs down, squeeze everything." },
  { name: "Copenhagen plank", zone: "bodyweight", pattern: "core", region: "core", exp: 3, impact: 0, unilateral: true, avoid: ["hip"], muscles: ["core"], cue: "Top leg on the bench — elite adductor and core work." },
  { name: "Landmine rotation", zone: "platform", pattern: "rotation", region: "core", exp: 2, impact: 0, unilateral: false, avoid: ["lowback"], muscles: ["core"], cue: "Rotate from the hips, arms long, control the arc." },
  { name: "Turkish get-up", zone: "crossfit", pattern: "carry", region: "full", exp: 3, impact: 1, unilateral: true, avoid: ["shoulder","wrist"], muscles: ["core","shoulders","glutes"], cue: "Slow, deliberate, eyes on the bell — total-body control." },
  { name: "Overhead carry", zone: "dumbbell", pattern: "carry", region: "core", exp: 2, impact: 1, unilateral: true, avoid: ["shoulder"], muscles: ["core","shoulders"], cue: "Lock the elbow, ribs down, walk tall." },
  { name: "Cable crunch", zone: "cable", pattern: "core", region: "core", exp: 1, impact: 0, unilateral: false, avoid: [], muscles: ["core"], cue: "Curl the spine down, hips stay put — loadable ab work." },

  /* ---------------- ADDED: OLYMPIC / POWER depth ---------------- */
  { name: "Power snatch", zone: "platform", pattern: "olympic", region: "full", exp: 3, impact: 2, unilateral: false, avoid: ["lowback","shoulder","wrist"], muscles: ["back","glutes","shoulders","hamstrings"], cue: "Aggressive hip extension, punch under the bar — coach it or skip it." },
  { name: "Hang power snatch", zone: "platform", pattern: "olympic", region: "full", exp: 3, impact: 2, unilateral: false, avoid: ["lowback","shoulder"], muscles: ["back","glutes","shoulders"], cue: "From the hip, violent extension, catch overhead in a quarter squat." },
  { name: "Clean pull", zone: "platform", pattern: "olympic", region: "full", exp: 2, impact: 2, unilateral: false, avoid: ["lowback"], muscles: ["back","glutes","hamstrings"], cue: "Deadlift into a shrug and full extension — no catch, all power." },
  { name: "Push jerk", zone: "platform", pattern: "v_push", region: "full", exp: 3, impact: 1, unilateral: false, avoid: ["shoulder","lowback"], muscles: ["shoulders","glutes","arms"], cue: "Dip, drive, re-dip under the bar, lock it out overhead." },
  { name: "Barbell high pull", zone: "platform", pattern: "olympic", region: "full", exp: 2, impact: 1, unilateral: false, avoid: ["lowback","shoulder"], muscles: ["back","shoulders","glutes"], cue: "Explode the hips, elbows high and outside." },

  /* ---------------- ADDED: PLYO / ATHLETIC depth ---------------- */
  { name: "Depth jump", zone: "crossfit", pattern: "plyo", region: "lower", exp: 3, impact: 3, unilateral: false, avoid: ["knee","hip","ankle"], muscles: ["quads","glutes"], cue: "Step off, land, rebound instantly — advanced reactive strength only." },
  { name: "Single-leg box jump", zone: "crossfit", pattern: "plyo", region: "lower", exp: 3, impact: 3, unilateral: true, avoid: ["knee","hip","ankle"], muscles: ["quads","glutes"], cue: "Low box, soft landing, step down — demands real control." },
  { name: "Lateral line hops", zone: "bodyweight", pattern: "plyo", region: "lower", exp: 2, impact: 3, unilateral: false, avoid: ["knee","ankle"], muscles: ["quads","calves"], cue: "Hop over a floor seam with quick ground contacts, quiet landings, and a tall posture." },
  { name: "Med ball overhead throw", zone: "crossfit", pattern: "plyo", region: "full", exp: 2, impact: 2, unilateral: false, avoid: ["shoulder","lowback"], muscles: ["core","shoulders","glutes"], cue: "Full-body extension, throw for distance." },
  { name: "Trap bar jump", zone: "platform", pattern: "plyo", region: "lower", exp: 3, impact: 3, unilateral: false, avoid: ["knee","ankle","lowback"], muscles: ["quads","glutes","hamstrings"], cue: "Light load, jump for height, land soft — loaded power." },
  { name: "Sprint intervals", zone: "cardio", pattern: "conditioning", region: "cardio", exp: 2, impact: 3, unilateral: false, avoid: ["knee","hip","ankle"], muscles: ["hamstrings","glutes","quads"], cue: "Full recovery between reps — quality over quantity." },

  /* ---------------- ADDED: CONDITIONING depth ---------------- */
  { name: "Assault bike sprints", zone: "cardio", pattern: "conditioning", region: "cardio", exp: 2, impact: 0, unilateral: false, avoid: [], muscles: [], cue: "10–20s all-out, long recovery — brutal, joint-friendly." },
  { name: "Farmer carry medley", zone: "crossfit", pattern: "conditioning", region: "full", exp: 2, impact: 1, unilateral: false, avoid: [], muscles: ["core","back"], cue: "Heavy carries back to back — grip, core, and engine." },
  { name: "Kettlebell snatch", zone: "crossfit", pattern: "conditioning", region: "full", exp: 3, impact: 1, unilateral: true, avoid: ["shoulder","lowback","wrist"], muscles: ["glutes","shoulders","back"], cue: "Hips drive it, punch through at the top — no banging the wrist." },
  { name: "Devil's press", zone: "crossfit", pattern: "conditioning", region: "full", exp: 3, impact: 2, unilateral: false, avoid: ["shoulder","lowback","wrist","knee"], muscles: ["shoulders","glutes","core"], cue: "Burpee into a double-dumbbell snatch — pace it or die." },
  { name: "Rowing sprints", zone: "cardio", pattern: "conditioning", region: "cardio", exp: 2, impact: 0, unilateral: false, avoid: ["lowback"], muscles: ["back","hamstrings"], cue: "250m repeats, legs-drive first, strong finish." },
  { name: "Jump rope intervals", zone: "bodyweight", pattern: "conditioning", region: "cardio", exp: 1, impact: 2, unilateral: false, avoid: ["ankle","knee"], muscles: ["calves"], cue: "Stay on the balls of the feet, relaxed shoulders." },
  { name: "Bear crawl", zone: "bodyweight", pattern: "conditioning", region: "full", exp: 1, impact: 1, unilateral: false, avoid: ["wrist","shoulder"], muscles: ["core","shoulders"], cue: "Knees an inch off the floor, hips low, move controlled." },

  /* ---------------- ADDED: TARGETED WARM-UP / PREP ---------------- */
  { name: "Scapular push-up", zone: "bodyweight", pattern: "mobility", region: "mobility", exp: 1, impact: 0, unilateral: false, avoid: ["wrist"], muscles: [], preps: ["upper","push"], cue: "Plank position, protract and retract the shoulder blades \u2014 wakes up the serratus." },
  { name: "Scapular pull-up", zone: "rack", pattern: "mobility", region: "mobility", exp: 1, impact: 0, unilateral: false, avoid: ["shoulder"], muscles: [], preps: ["upper","pull"], cue: "Dead hang, pull the shoulders down without bending the elbows." },
  { name: "Wall slides", zone: "bodyweight", pattern: "mobility", region: "mobility", exp: 1, impact: 0, unilateral: false, avoid: [], muscles: [], preps: ["upper","push"], cue: "Back to the wall, slide the arms overhead \u2014 opens the shoulders for pressing." },
  { name: "Face pull (band, light)", zone: "cable", pattern: "mobility", region: "mobility", exp: 1, impact: 0, unilateral: false, avoid: [], muscles: [], preps: ["upper","pull","push"], cue: "High reps, light band \u2014 primes the rear delts and rotator cuff." },
  { name: "Push-up plus", zone: "bodyweight", pattern: "mobility", region: "mobility", exp: 1, impact: 0, unilateral: false, avoid: ["wrist","shoulder"], muscles: [], preps: ["upper","push"], cue: "Push-up, then press the upper back to the ceiling at the top." },
  { name: "Lat stretch on rack", zone: "rack", pattern: "mobility", region: "mobility", exp: 1, impact: 0, unilateral: true, avoid: [], muscles: [], preps: ["upper","pull"], cue: "Grip low, sink the hips back, breathe into the lat." },
  { name: "Banded shoulder external rotation", zone: "cable", pattern: "mobility", region: "mobility", exp: 1, impact: 0, unilateral: true, avoid: [], muscles: [], preps: ["upper","push","pull"], cue: "Elbow at the side, rotate out slowly \u2014 rotator cuff prep." },
  { name: "Arm circles", zone: "bodyweight", pattern: "mobility", region: "mobility", exp: 1, impact: 0, unilateral: false, avoid: [], muscles: [], preps: ["upper","general"], cue: "Small to large, both directions \u2014 simple blood flow to the shoulders." },
  { name: "Bodyweight squat (easy)", zone: "bodyweight", pattern: "mobility", region: "mobility", exp: 1, impact: 0, unilateral: false, avoid: ["knee"], muscles: [], preps: ["lower"], cue: "Slow reps to full depth, grooving the pattern before you load it." },
  { name: "Walking knee hug", zone: "bodyweight", pattern: "mobility", region: "mobility", exp: 1, impact: 0, unilateral: true, avoid: [], muscles: [], preps: ["lower"], cue: "Hug the knee, rise to the toe \u2014 dynamic hip and glute prep." },
  { name: "Monster walk (band)", zone: "cable", pattern: "mobility", region: "mobility", exp: 1, impact: 0, unilateral: false, avoid: [], muscles: [], preps: ["lower"], cue: "Band above the knees, step wide \u2014 fires the glute medius." },
  { name: "Hip airplane", zone: "bodyweight", pattern: "mobility", region: "mobility", exp: 2, impact: 0, unilateral: true, avoid: [], muscles: [], preps: ["lower"], cue: "Balance on one leg, rotate the hip open and closed \u2014 demanding control." },
  { name: "Jump rope (easy)", zone: "bodyweight", pattern: "mobility", region: "cardio", exp: 1, impact: 1, unilateral: false, avoid: ["ankle","knee"], muscles: [], preps: ["general","lower"], cue: "Two minutes easy to raise core temperature." },
  { name: "Elliptical easy", zone: "cardio", pattern: "mobility", region: "cardio", exp: 1, impact: 0, unilateral: false, avoid: [], muscles: [], preps: ["general","lower","upper"], cue: "Low resistance, drive with the arms too \u2014 zero-impact warm-up." },
  { name: "Ski erg easy", zone: "cardio", pattern: "mobility", region: "cardio", exp: 1, impact: 0, unilateral: false, avoid: ["shoulder"], muscles: [], preps: ["general","upper"], cue: "Light strokes to warm the lats and shoulders." },
  { name: "Dead bug (slow)", zone: "bodyweight", pattern: "mobility", region: "mobility", exp: 1, impact: 0, unilateral: true, avoid: [], muscles: [], preps: ["core","general"], cue: "Ribs down, opposite arm and leg \u2014 sets the brace before you lift." },

  /* ---------------- ADDED: PUMP / BURNOUT FINISHERS ----------------
     These exist to DESTROY the target muscle at the end of a session.
     finisher:"pump" marks them as burnout-grade. `superset` marks whether the
     movement can be paired without hogging stations (see SUPERSET_ZONES). */
  { name: "Dumbbell chest fly burnout", zone: "dumbbell", pattern: "h_push", region: "push", exp: 1, impact: 0, unilateral: false, avoid: ["shoulder"], muscles: ["chest"], finisher: true, ftype: "pump", fmuscles: ["chest"], cue: "Light dumbbells, 20+ reps, squeeze hard at the top until you can't." },
  { name: "Push-up to failure", zone: "bodyweight", pattern: "h_push", region: "push", exp: 1, impact: 1, unilateral: false, avoid: ["wrist","shoulder"], muscles: ["chest","arms"], finisher: true, ftype: "pump", fmuscles: ["chest","arms"], cue: "Max reps, then drop to knees and keep going \u2014 total chest burnout." },
  { name: "Pec deck drop set", zone: "machine", pattern: "h_push", region: "push", exp: 2, impact: 0, unilateral: false, avoid: ["shoulder"], muscles: ["chest"], finisher: true, ftype: "pump", fmuscles: ["chest"], cue: "To failure, strip the weight, go again. Two drops minimum." },
  { name: "Cable fly 21s", zone: "cable", pattern: "h_push", region: "push", exp: 2, impact: 0, unilateral: false, avoid: ["shoulder"], muscles: ["chest"], finisher: true, ftype: "pump", fmuscles: ["chest"], cue: "7 bottom half, 7 top half, 7 full \u2014 the chest will scream." },
  { name: "Incline press burnout", zone: "dumbbell", pattern: "h_push", region: "push", exp: 1, impact: 0, unilateral: false, avoid: ["shoulder"], muscles: ["chest","shoulders"], finisher: true, ftype: "pump", fmuscles: ["chest","shoulders"], cue: "Light weight, no lockout, constant tension to failure." },

  { name: "Lateral raise drop set", zone: "dumbbell", pattern: "v_push", region: "push", exp: 1, impact: 0, unilateral: false, avoid: ["shoulder"], muscles: ["shoulders"], finisher: true, ftype: "pump", fmuscles: ["shoulders"], cue: "To failure, drop 5 lb, repeat twice. Delts on fire." },
  { name: "Cable lateral raise 21s", zone: "cable", pattern: "v_push", region: "push", exp: 2, impact: 0, unilateral: true, avoid: ["shoulder"], muscles: ["shoulders"], finisher: true, ftype: "pump", fmuscles: ["shoulders"], cue: "7 partials low, 7 partials high, 7 full range per side." },
  { name: "Plate front raise hold", zone: "dumbbell", pattern: "v_push", region: "push", exp: 1, impact: 0, unilateral: false, avoid: ["shoulder"], muscles: ["shoulders"], finisher: true, ftype: "pump", fmuscles: ["shoulders"], cue: "Raise to eye level and hold until the arms give out." },
  { name: "Rear delt fly burnout", zone: "dumbbell", pattern: "h_pull", region: "pull", exp: 1, impact: 0, unilateral: false, avoid: [], muscles: ["shoulders"], finisher: true, ftype: "pump", fmuscles: ["shoulders"], cue: "Light, high reps, squeeze the rear delts until they quit." },

  { name: "Straight-arm pulldown burnout", zone: "cable", pattern: "v_pull", region: "pull", exp: 1, impact: 0, unilateral: false, avoid: ["shoulder"], muscles: ["back"], finisher: true, ftype: "pump", fmuscles: ["back"], cue: "High reps, sweep to the thighs, feel the lats fill up." },
  { name: "Lat pulldown drop set", zone: "cable", pattern: "v_pull", region: "pull", exp: 2, impact: 0, unilateral: false, avoid: [], muscles: ["back","arms"], finisher: true, ftype: "pump", fmuscles: ["back","arms"], cue: "To failure, drop the pin two plates, go again. Twice." },
  { name: "Seated row 21s", zone: "cable", pattern: "h_pull", region: "pull", exp: 2, impact: 0, unilateral: false, avoid: [], muscles: ["back","arms"], finisher: true, ftype: "pump", fmuscles: ["back","arms"], cue: "7 partials, 7 partials, 7 full \u2014 mid-back annihilation." },
  { name: "Chest-supported row burnout", zone: "machine", pattern: "h_pull", region: "pull", exp: 1, impact: 0, unilateral: false, avoid: [], muscles: ["back","arms"], finisher: true, ftype: "pump", fmuscles: ["back","arms"], cue: "Light plates, 20+ reps, squeeze every rep to failure." },
  { name: "Face pull burnout", zone: "cable", pattern: "h_pull", region: "pull", exp: 1, impact: 0, unilateral: false, avoid: [], muscles: ["back","shoulders"], finisher: true, ftype: "pump", fmuscles: ["back","shoulders"], cue: "High reps to failure \u2014 shoulder health and a rear-delt pump." },

  { name: "Bicep curl drop set", zone: "dumbbell", pattern: "h_pull", region: "pull", exp: 1, impact: 0, unilateral: false, avoid: ["elbow"], muscles: ["arms"], finisher: true, ftype: "pump", fmuscles: ["arms"], cue: "Curl to failure, drop 5 lb, repeat twice. No swinging." },
  { name: "Cable curl 21s", zone: "cable", pattern: "h_pull", region: "pull", exp: 2, impact: 0, unilateral: false, avoid: ["elbow"], muscles: ["arms"], finisher: true, ftype: "pump", fmuscles: ["arms"], cue: "7 bottom, 7 top, 7 full \u2014 constant tension the whole way." },
  { name: "Triceps pushdown drop set", zone: "cable", pattern: "h_push", region: "push", exp: 1, impact: 0, unilateral: false, avoid: ["elbow"], muscles: ["arms"], finisher: true, ftype: "pump", fmuscles: ["arms"], cue: "To failure, drop the pin, go again. Elbows locked at the sides." },
  { name: "Bodyweight tricep extension to failure", zone: "rack", pattern: "h_push", region: "push", exp: 2, impact: 0, unilateral: false, avoid: ["elbow","shoulder"], muscles: ["arms"], finisher: true, ftype: "pump", fmuscles: ["arms"], cue: "Bar at hip height, lower the head behind the bar, press out to failure." },
  { name: "Bicep 21s", zone: "dumbbell", pattern: "h_pull", region: "pull", exp: 1, impact: 0, unilateral: false, avoid: ["elbow"], muscles: ["arms"], finisher: true, ftype: "pump", fmuscles: ["arms"], cue: "7 bottom half, 7 top half, 7 full reps. Brutal." },

  { name: "Leg extension drop set", zone: "machine", pattern: "squat", region: "lower", exp: 1, impact: 1, unilateral: false, avoid: ["knee"], muscles: ["quads"], finisher: true, ftype: "pump", fmuscles: ["quads"], cue: "To failure, strip the weight, go again. Twice. Quads will burn." },
  { name: "Goblet squat burnout", zone: "dumbbell", pattern: "squat", region: "lower", exp: 1, impact: 1, unilateral: false, avoid: ["knee"], muscles: ["quads","glutes"], finisher: true, ftype: "pump", fmuscles: ["quads","glutes"], cue: "Light bell, 20+ reps, no lockout \u2014 constant tension to failure." },
  { name: "Wall sit", zone: "bodyweight", pattern: "squat", region: "lower", exp: 1, impact: 0, unilateral: false, avoid: ["knee"], muscles: ["quads"], finisher: true, ftype: "pump", fmuscles: ["quads"], cue: "Thighs parallel, hold until the legs shake and give out." },
  { name: "Walking lunge burnout", zone: "bodyweight", pattern: "lunge", region: "lower", exp: 1, impact: 1, unilateral: true, avoid: ["knee"], muscles: ["quads","glutes"], finisher: true, ftype: "pump", fmuscles: ["quads","glutes"], cue: "Bodyweight only, 40+ steps, don't stop until you can't walk straight." },

  { name: "Hamstring curl drop set", zone: "machine", pattern: "hinge", region: "lower", exp: 1, impact: 0, unilateral: false, avoid: [], muscles: ["hamstrings"], finisher: true, ftype: "pump", fmuscles: ["hamstrings"], cue: "To failure, drop the pin, go again. Squeeze at the top." },
  { name: "Hip thrust burnout", zone: "bodyweight", pattern: "hinge", region: "lower", exp: 1, impact: 0, unilateral: false, avoid: [], muscles: ["glutes"], finisher: true, ftype: "pump", fmuscles: ["glutes"], cue: "Bodyweight or light, 25+ reps, 2s squeeze at the top every rep." },
  { name: "Frog pump", zone: "bodyweight", pattern: "hinge", region: "lower", exp: 1, impact: 0, unilateral: false, avoid: [], muscles: ["glutes"], finisher: true, ftype: "pump", fmuscles: ["glutes"], cue: "Soles together, knees out, pump the hips \u2014 pure glute burn." },
  { name: "Banded glute kickback", zone: "cable", pattern: "hinge", region: "lower", exp: 1, impact: 0, unilateral: true, avoid: [], muscles: ["glutes"], finisher: true, ftype: "pump", fmuscles: ["glutes"], cue: "High reps per side, squeeze at full extension until it burns." },
  { name: "Glute bridge hold", zone: "bodyweight", pattern: "hinge", region: "lower", exp: 1, impact: 0, unilateral: false, avoid: [], muscles: ["glutes"], finisher: true, ftype: "pump", fmuscles: ["glutes"], cue: "Drive up and hold at lockout until the glutes cramp." },
  { name: "Cable kickback burnout", zone: "cable", pattern: "hinge", region: "lower", exp: 1, impact: 0, unilateral: true, avoid: [], muscles: ["glutes"], finisher: true, ftype: "pump", fmuscles: ["glutes"], cue: "Light cable, 20+ per side, full squeeze every rep." },

  { name: "Calf raise burnout", zone: "machine", pattern: "squat", region: "lower", exp: 1, impact: 0, unilateral: false, avoid: [], muscles: ["calves"], finisher: true, ftype: "pump", fmuscles: ["calves"], cue: "30+ reps, full stretch, 1s pause at the top. They will scream." },
  { name: "Calf raise drop set", zone: "machine", pattern: "squat", region: "lower", exp: 1, impact: 0, unilateral: false, avoid: [], muscles: ["calves"], finisher: true, ftype: "pump", fmuscles: ["calves"], cue: "To failure, strip weight, repeat twice. No bouncing." },

  { name: "Cable crunch drop set", zone: "cable", pattern: "core", region: "core", exp: 1, impact: 0, unilateral: false, avoid: [], muscles: ["core"], finisher: true, ftype: "pump", fmuscles: ["core"], cue: "Curl the spine, to failure, drop the pin, keep crunching." },


  /* metabolic + core finishers */
  { name: "Assault bike finisher", zone: "cardio", pattern: "conditioning", region: "cardio", exp: 1, impact: 0, unilateral: false, avoid: [], muscles: [], finisher: true, ftype: "metcon", fmuscles: [], cue: "5 sprints of 15s hard / 45s easy \u2014 empty the tank." },
  { name: "Row sprint finisher", zone: "cardio", pattern: "conditioning", region: "cardio", exp: 1, impact: 0, unilateral: false, avoid: ["lowback"], muscles: [], finisher: true, ftype: "metcon", fmuscles: [], cue: "5 x 150m all-out, walk back between efforts." },
  { name: "VersaClimber finisher", zone: "cardio", pattern: "conditioning", region: "full", exp: 1, impact: 0, unilateral: false, avoid: ["shoulder"], muscles: ["shoulders","arms"], finisher: true, ftype: "metcon", fmuscles: ["shoulders","arms"], cue: "30 seconds hard and 30 seconds easy for four rounds with quick controlled strokes." },
  { name: "Kettlebell swing finisher", zone: "crossfit", pattern: "hinge", region: "full", exp: 2, impact: 1, unilateral: false, avoid: ["lowback"], muscles: ["glutes","hamstrings"], finisher: true, ftype: "metcon", fmuscles: ["glutes","hamstrings"], cue: "10 down to 1, hips snap every rep \u2014 posterior chain burner." },
  { name: "HIITMill drive finisher", zone: "cardio", pattern: "conditioning", region: "full", exp: 1, impact: 1, unilateral: false, avoid: [], muscles: ["quads","glutes"], finisher: true, ftype: "metcon", fmuscles: ["quads","glutes"], cue: "Complete four hard pushes on the HIITMill with a low angle and powerful steps." },
  { name: "Farmer carry finisher", zone: "dumbbell", pattern: "carry", region: "full", exp: 1, impact: 1, unilateral: false, avoid: [], muscles: ["core","back"], finisher: true, ftype: "metcon", fmuscles: ["core"], cue: "Heavy, 3 long trips to grip failure \u2014 total-body brace." },
  { name: "Nordic curl burnout", zone: "bodyweight", pattern: "hinge", region: "lower", exp: 2, impact: 1, unilateral: false, avoid: ["knee"], muscles: ["hamstrings"], finisher: true, ftype: "pump", fmuscles: ["hamstrings"], cue: "Lower as slow as possible, catch and push back \u2014 max reps to failure." },
  { name: "Ab circuit finisher", zone: "bodyweight", pattern: "core", region: "core", exp: 1, impact: 0, unilateral: false, avoid: [], muscles: ["core"], finisher: true, ftype: "core", fmuscles: ["core"], cue: "30s each, no rest: plank, hollow hold, side plank per side." },
  { name: "Hanging leg raise burnout", zone: "rack", pattern: "core", region: "core", exp: 2, impact: 1, unilateral: false, avoid: ["shoulder"], muscles: ["core"], finisher: true, ftype: "core", fmuscles: ["core"], cue: "Max strict reps, then knee raises to failure \u2014 no swing." },
  { name: "Cable crunch burnout", zone: "cable", pattern: "core", region: "core", exp: 1, impact: 0, unilateral: false, avoid: [], muscles: ["core"], finisher: true, ftype: "core", fmuscles: ["core"], cue: "Heavy crunches to failure, lighten, repeat until you can't curl." },
  { name: "Plank to failure", zone: "bodyweight", pattern: "core", region: "core", exp: 1, impact: 0, unilateral: false, avoid: ["shoulder","wrist"], muscles: ["core"], finisher: true, ftype: "core", fmuscles: ["core"], cue: "One max hold, ribs down, glutes tight \u2014 until form breaks." },
];

const EXERCISE_LIBRARY_EDITS_KEY = "fit4life_exercise_library_edits_v1";
const BASE_LIBRARY = LIBRARY.map((exercise) => JSON.parse(JSON.stringify(exercise)));
const MOVEMENT_DEMAND_LABELS = {
  standing:"Standing", seated:"Seated / supported", supine:"Flat on back", prone:"Face-down / plank",
  floor_transfer:"Floor transfer", hanging:"Hanging", loaded_grip:"Loaded grip", wrist_extension:"Loaded wrist extension",
  front_rack:"Front-rack position", overhead:"Overhead", shoulder_extension:"Shoulder extension",
  knee_flexion:"Knee flexion", deep_knee_flexion:"Deep knee flexion", deep_hip_flexion:"Deep hip flexion",
  hip_hinge:"Hip hinge", single_leg:"Single-leg stance", balance_challenge:"Balance challenge",
  axial_load:"Axial / spinal load", unsupported_torso:"Unsupported torso", spinal_flexion:"Spinal flexion",
  spinal_extension:"Spinal extension", spinal_rotation:"Spinal rotation", high_abdominal_pressure:"High bracing / pressure",
  impact:"Impact", ballistic:"Ballistic / explosive", repetitive_step:"Repetitive stepping",
  loaded_carry:"Loaded carry", sustained_cardio:"Sustained cardio",
};
const MOVEMENT_DEMAND_KEYS = Object.keys(MOVEMENT_DEMAND_LABELS);
function inferExerciseDemands(exercise) {
  const item = exercise || {}, name = String(item.name || "").toLowerCase(), demands = new Set(Array.isArray(item.demands) ? item.demands : []);
  const pattern = item.pattern || "", zone = item.zone || "";
  if (pattern === "squat") demands.add("knee_flexion");
  if (pattern === "squat" || pattern === "lunge" || /\b(deep squat|hack squat|leg press)\b/.test(name)) { demands.add("deep_knee_flexion"); demands.add("deep_hip_flexion"); }
  if (pattern === "lunge") { demands.add("knee_flexion"); demands.add("single_leg"); demands.add("balance_challenge"); }
  if (pattern === "hinge") demands.add("hip_hinge");
  if (pattern === "v_push" || pattern === "v_pull" || /\b(overhead|pulldown|pull-up|chin-up|dead hang|lat pull)\b/.test(name)) demands.add("overhead");
  if (pattern === "rotation" || /\b(rotation|wood.?chop|russian twist)\b/.test(name)) demands.add("spinal_rotation");
  if (pattern === "carry") { demands.add("loaded_carry"); demands.add("loaded_grip"); demands.add("axial_load"); }
  if (pattern === "plyo" || pattern === "olympic") { demands.add("ballistic"); demands.add("impact"); demands.add("balance_challenge"); demands.add("high_abdominal_pressure"); }
  if (item.unilateral) { demands.add("single_leg"); demands.add("balance_challenge"); }
  if (Number(item.impact || 0) >= 2 || /\b(jump|bound|sprint|burpee|running|run)\b/.test(name)) demands.add("impact");
  if (/\b(swing|snatch|clean|jerk|throw|slam|sprint|jump|bound|burpee|high pull)\b/.test(name)) demands.add("ballistic");
  if (/\b(front squat|front rack|clean)\b/.test(name)) demands.add("front_rack");
  if (/\b(push-up|push up|plank|cat-cow|bear crawl|burpee|mountain climber)\b/.test(name)) demands.add("wrist_extension");
  if (/\b(pull-up|chin-up|dead hang|hanging)\b/.test(name)) demands.add("hanging");
  if (/\b(dip|fly|pullover|dislocate)\b/.test(name)) demands.add("shoulder_extension");
  if (/\b(crunch|sit-up|sit up|knee raise|leg raise|toes.to.bar)\b/.test(name)) demands.add("spinal_flexion");
  if (/\b(back extension|superman|reverse hyper)\b/.test(name)) demands.add("spinal_extension");
  if (/\b(bent row|bent-over|good morning|one-arm dumbbell row|single-leg rdl)\b/.test(name)) demands.add("unsupported_torso");
  if (/\b(back squat|front squat|deadlift|barbell press|good morning|loaded carry|farmer carry|suitcase carry|yoke)\b/.test(name)) demands.add("axial_load");
  if (item.primary || item.finisher || ["olympic","plyo"].includes(pattern) || /\b(deadlift|squat|press|carry|crunch|plank|row)\b/.test(name)) demands.add("high_abdominal_pressure");
  if (/\b(treadmill|stair|step|walk|run|elliptical|hiitmill)\b/.test(name)) demands.add("repetitive_step");
  if (zone === "cardio" || pattern === "conditioning") demands.add("sustained_cardio");
  if (zone !== "bodyweight" && !["mobility","cardio"].includes(item.region)) demands.add("loaded_grip");
  if (/\b(bench press|floor press|glute bridge|hip thrust|dead bug|hollow|sit-up|crunch|leg raise)\b/.test(name)) demands.add("supine");
  if (/\b(plank|push-up|cat-cow|bird dog|superman|prone)\b/.test(name)) demands.add("prone");
  if (demands.has("supine") || demands.has("prone") || /\b(floor|child.?s pose|90\/90)\b/.test(name)) demands.add("floor_transfer");
  if (/\b(seated|machine|bike|rower|leg press|leg extension|leg curl|pulldown)\b/.test(name) || zone === "machine") demands.add("seated");
  if (!demands.has("supine") && !demands.has("prone") && !demands.has("seated") && !demands.has("hanging")) demands.add("standing");
  return [...demands].filter((key) => MOVEMENT_DEMAND_LABELS[key]);
}
function normalizeExerciseSafetyMetadata(exercise,source) {
  const item = { ...(exercise || {}) };
  item.avoid = [...new Set(Array.isArray(item.avoid) ? item.avoid.filter(Boolean) : [])];
  item.demands = inferExerciseDemands(item);
  item.safetyReviewed = item.safetyReviewed !== false;
  item.safetyMetadataVersion = 2;
  item.safetySource = source || item.safetySource || (Array.isArray(exercise && exercise.demands) ? "trainer" : "inferred");
  return item;
}
function exerciseBankId(exercise) { return String(exercise && (exercise.bankId || exercise.name) || "movement").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/(^-|-$)/g,""); }
function loadExerciseLibraryEdits() { try { const value = JSON.parse(localStorage.getItem(EXERCISE_LIBRARY_EDITS_KEY) || "[]"); return Array.isArray(value) ? value : []; } catch (_) { return []; } }
function writeExerciseLibraryEdits(items) {
  const clean = (items || []).slice(0,1000);
  if (typeof writeLocalArray === "function") return writeLocalArray(EXERCISE_LIBRARY_EDITS_KEY,clean,1000);
  try { localStorage.setItem(EXERCISE_LIBRARY_EDITS_KEY,JSON.stringify(clean)); return true; } catch (_) { return false; }
}
function applyExerciseLibraryEdits() {
  const next = BASE_LIBRARY.map((exercise) => ({ ...normalizeExerciseSafetyMetadata(JSON.parse(JSON.stringify(exercise)),"inferred"), bankId:exerciseBankId(exercise), bankSource:"built-in" }));
  loadExerciseLibraryEdits().forEach((edit) => {
    if (!edit || !edit.id) return;
    const index = next.findIndex((exercise) => exerciseBankId(exercise) === edit.id);
    if (edit.action === "delete") { if (index >= 0) next.splice(index,1); return; }
    if (!edit.exercise) return;
    const exercise = { ...normalizeExerciseSafetyMetadata(JSON.parse(JSON.stringify(edit.exercise)),edit.exercise.safetySource || "trainer"), bankId:edit.id, bankSource:index >= 0 ? "edited" : "custom" };
    if (index >= 0) next[index] = exercise; else next.push(exercise);
  });
  LIBRARY.splice(0,LIBRARY.length,...next);
  return LIBRARY;
}
applyExerciseLibraryEdits();



/* ===== ENGINE ===== */
/* ============================================================
   FIT4LIFE Session Engine
   Turns trainer inputs into a structured, goal-appropriate session.
   Inputs (a "spec"):
     goal        recovery | hypertrophy | strength | fatloss | general | athletic | conditioning
     experience  1 new | 2 intermediate | 3 advanced
     age         18..60
     injuries    array of injury tags
     minutes     30 | 45 | 60 | 90
     zones       array of allowed equipment zones (empty = all)
   Group mode handled separately (see buildGroupSession).
   ============================================================ */

