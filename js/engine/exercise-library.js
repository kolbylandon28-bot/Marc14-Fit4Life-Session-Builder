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
  { name: "Treadmill incline walk", family: "warmup_cardio", rank: 5, zone: "cardio", pattern: "mobility", region: "cardio", exp: 1, impact: 0, unilateral: false, avoid: [], muscles: [], preps: ["general", "lower"], cue: "Tall posture, easy nasal breathing to raise core temp." },
  { name: "Bike easy spin", family: "warmup_cardio", rank: 1, zone: "cardio", pattern: "mobility", region: "cardio", exp: 1, impact: 0, unilateral: false, avoid: [], muscles: [], preps: ["general", "lower"], cue: "Light resistance, spin to loosen hips and knees." },
  { name: "Rower easy pace", family: "warmup_cardio", rank: 3, zone: "cardio", pattern: "mobility", region: "cardio", exp: 1, impact: 0, unilateral: false, avoid: ["lowback"], muscles: [], preps: ["general", "upper", "lower"], cue: "Legs-first drive, keep the back tall, don't yank with arms." },
  { name: "Stair climber easy pace", family: "warmup_cardio", rank: 4, zone: "cardio", pattern: "mobility", region: "cardio", exp: 1, impact: 0, unilateral: false, avoid: [], muscles: [], preps: ["general", "lower"], cue: "Use a level that keeps posture tall; hold the rails only for balance." },
  { name: "Leg swings", family: "mobility", rank: 6, zone: "bodyweight", pattern: "mobility", region: "mobility", exp: 1, impact: 0, unilateral: true, avoid: [], muscles: [], preps: ["lower"], cue: "Controlled front-to-back and lateral swings, hold something for balance." },
  { name: "World's greatest stretch", family: "mobility", rank: 10, zone: "bodyweight", pattern: "mobility", region: "mobility", exp: 1, impact: 0, unilateral: true, avoid: [], muscles: [], preps: ["general", "lower"], cue: "Lunge, elbow to instep, rotate open — one of the best full-body openers." },
  { name: "Cat-cow", family: "mobility", rank: 2, zone: "bodyweight", pattern: "mobility", region: "mobility", exp: 1, impact: 0, unilateral: false, avoid: ["wrist"], muscles: [], preps: ["general", "core"], cue: "Segment the spine slowly, breathe with each rep." },
  { name: "Band pull-apart", family: "activation", rank: 1, zone: "cable", pattern: "mobility", region: "pull", exp: 1, impact: 0, unilateral: false, avoid: [], muscles: [], preps: ["upper", "push", "pull"], cue: "Squeeze shoulder blades, keep ribs down — great shoulder prep." },
  { name: "Band dislocates", family: "mobility", rank: 14, zone: "cable", pattern: "mobility", region: "mobility", exp: 1, impact: 0, unilateral: false, avoid: ["shoulder"], muscles: [], preps: ["upper", "push"], cue: "Wide grip, slow overhead pass-through to open the shoulders." },
  { name: "Glute bridge", family: "glute", rank: 2, zone: "bodyweight", pattern: "hinge", region: "lower", exp: 1, impact: 0, unilateral: false, avoid: [], muscles: ["glutes"], preps: ["lower"], cue: "Drive through heels, squeeze glutes at the top, don't arch the low back." },
  { name: "Bird dog", family: "core", rank: 3, zone: "bodyweight", pattern: "core", region: "core", exp: 1, impact: 0, unilateral: true, avoid: ["wrist"], muscles: ["core"], preps: ["core", "general"], cue: "Opposite arm/leg, move slow, keep hips level — anti-rotation control." },
  { name: "90/90 hip switch", family: "mobility", rank: 8, zone: "bodyweight", pattern: "mobility", region: "mobility", exp: 1, impact: 0, unilateral: true, avoid: [], muscles: [], preps: ["lower"], cue: "Rotate both knees side to side, sit tall — opens internal/external hip rotation." },
  { name: "Ankle rocks", family: "mobility", rank: 4, zone: "bodyweight", pattern: "mobility", region: "mobility", exp: 1, impact: 0, unilateral: true, avoid: [], muscles: [], preps: ["lower"], cue: "Knee over toe, heel down, gentle rock to free the ankle." },
  { name: "Thoracic rotation", family: "mobility", rank: 9, zone: "bodyweight", pattern: "rotation", region: "mobility", exp: 1, impact: 0, unilateral: true, avoid: [], muscles: ["core"], preps: ["upper", "core", "general"], cue: "Open the upper back, follow the hand with your eyes." },
  { name: "Dead hang", family: "mobility", rank: 13, zone: "rack", pattern: "mobility", region: "mobility", exp: 1, impact: 0, unilateral: false, avoid: ["shoulder"], muscles: [], preps: ["upper", "pull"], cue: "Relax and decompress the spine and shoulders; skip if shoulders are irritable." },
  { name: "Couch stretch", family: "mobility", rank: 7, zone: "bodyweight", pattern: "mobility", region: "mobility", exp: 1, impact: 0, unilateral: true, avoid: ["knee"], muscles: [], preps: ["lower"], cue: "Rear foot elevated, tuck the pelvis — strong hip-flexor and quad stretch." },
  { name: "Child's pose reach", family: "mobility", rank: 3, zone: "bodyweight", pattern: "mobility", region: "mobility", exp: 1, impact: 0, unilateral: false, avoid: [], muscles: [], preps: ["general", "upper"], cue: "Sit hips back, walk hands out, breathe into the lats." },

  /* ---------------- SQUAT ---------------- */
  { name: "Goblet squat", family: "squat", rank: 9, zone: "dumbbell", pattern: "squat", region: "lower", exp: 1, impact: 1, unilateral: false, avoid: [], muscles: ["quads","glutes"], cue: "Elbows inside knees, sit between the hips, chest tall." },
  { name: "Box squat", family: "squat", rank: 10, zone: "rack", pattern: "squat", region: "lower", exp: 1, impact: 1, unilateral: false, avoid: [], muscles: ["quads","glutes"], cue: "Sit back to the box, pause, drive up — teaches depth safely." },
  { name: "Leg press", family: "squat", rank: 3, zone: "machine", pattern: "squat", region: "lower", exp: 1, impact: 1, unilateral: false, avoid: ["knee"], muscles: ["quads","glutes"], cue: "Feet shoulder-width, control the descent, don't let knees cave." },
  { name: "Hack squat", family: "squat", rank: 5, zone: "machine", pattern: "squat", region: "lower", exp: 2, impact: 1, unilateral: false, avoid: ["knee"], muscles: ["quads","glutes"], cue: "Back flat on the pad, full controlled range." },
  { name: "Barbell back squat", family: "squat", rank: 11, zone: "rack", pattern: "squat", region: "lower", exp: 2, impact: 2, unilateral: false, avoid: ["knee", "lowback"], muscles: ["quads","glutes","hamstrings"], cue: "Brace hard, break at hips and knees together, drive the floor away." },
  { name: "Barbell front squat", family: "squat", rank: 12, zone: "rack", pattern: "squat", region: "lower", exp: 2, impact: 2, unilateral: false, avoid: ["knee", "wrist"], muscles: ["quads","glutes","core"], cue: "Elbows high, upright torso, stay tall through the whole rep." },
  { name: "Bulgarian split squat", family: "unilateral_lower", rank: 14, zone: "dumbbell", pattern: "lunge", region: "lower", exp: 2, impact: 1, unilateral: true, avoid: ["knee", "hip"], muscles: ["quads","glutes"], cue: "Rear foot elevated, drop straight down, weight through the front heel." },
  { name: "Walking lunge", family: "unilateral_lower", rank: 12, zone: "dumbbell", pattern: "lunge", region: "lower", exp: 2, impact: 2, unilateral: true, avoid: ["knee", "hip"], muscles: ["quads","glutes","hamstrings"], cue: "Long stride, vertical shin, control the descent each step." },
  { name: "Reverse lunge", family: "unilateral_lower", rank: 7, zone: "dumbbell", pattern: "lunge", region: "lower", exp: 1, impact: 1, unilateral: true, avoid: ["knee"], muscles: ["quads","glutes"], cue: "Step back, drop the knee softly — easier on the joints than forward lunges." },
  { name: "Step-up", family: "unilateral_lower", rank: 3, zone: "dumbbell", pattern: "lunge", region: "lower", exp: 1, impact: 1, unilateral: true, avoid: ["knee"], muscles: ["quads","glutes"], cue: "Full foot on the box, drive through the heel, control down." },
  { name: "Leg extension", family: "knee_extension", rank: 1, zone: "machine", pattern: "squat", region: "lower", exp: 1, impact: 1, unilateral: false, avoid: ["knee"], muscles: ["quads"], cue: "Squeeze the quad at the top, lower slow — great isolation finisher." },

  /* ---------------- HINGE ---------------- */
  { name: "Dumbbell RDL", family: "hinge", rank: 5, zone: "dumbbell", pattern: "hinge", region: "lower", exp: 1, impact: 1, unilateral: false, avoid: ["lowback"], muscles: ["hamstrings","glutes"], cue: "Soft knees, push hips back, feel the hamstrings, flat back." },
  { name: "Barbell RDL", family: "hinge", rank: 6, zone: "rack", pattern: "hinge", region: "lower", exp: 2, impact: 1, unilateral: false, avoid: ["lowback"], muscles: ["hamstrings","glutes"], cue: "Bar close to the legs, hips back, stop at mid-shin with a flat back." },
  { name: "Kettlebell deadlift", family: "hinge", rank: 4, zone: "crossfit", pattern: "hinge", region: "lower", exp: 1, impact: 1, unilateral: false, avoid: ["lowback"], muscles: ["hamstrings","glutes","back"], cue: "Hinge, grab the bell, stand tall by squeezing glutes." },
  { name: "Trap bar deadlift", family: "hinge", rank: 7, zone: "platform", pattern: "hinge", region: "lower", exp: 2, impact: 2, unilateral: false, avoid: ["lowback"], muscles: ["hamstrings","glutes","quads","back"], cue: "Most joint-friendly deadlift — brace, push the floor away, lock out tall." },
  { name: "Conventional deadlift", family: "hinge", rank: 8, zone: "platform", pattern: "hinge", region: "lower", exp: 3, impact: 2, unilateral: false, avoid: ["lowback"], muscles: ["hamstrings","glutes","back"], cue: "Bar over midfoot, wedge in, push floor away — flat back throughout." },
  { name: "Hip thrust", family: "glute", rank: 4, zone: "rack", pattern: "hinge", region: "lower", exp: 1, impact: 1, unilateral: false, avoid: [], muscles: ["glutes","hamstrings"], cue: "Ribs down, chin tucked, drive hips to full lockout and squeeze." },
  { name: "Single-leg RDL", family: "hinge", rank: 13, zone: "dumbbell", pattern: "hinge", region: "lower", exp: 3, impact: 1, unilateral: true, avoid: ["lowback"], muscles: ["hamstrings","glutes"], cue: "Hinge over one leg, hips square, reach long — big balance demand." },
  { name: "Seated hamstring curl", family: "hamstring_curl", rank: 1, zone: "machine", pattern: "hinge", region: "lower", exp: 1, impact: 0, unilateral: false, avoid: [], muscles: ["hamstrings"], cue: "Control both directions, avoid yanking — isolates the hamstrings." },
  { name: "Back extension", family: "hinge", rank: 1, zone: "machine", pattern: "hinge", region: "lower", exp: 1, impact: 1, unilateral: false, avoid: ["lowback"], muscles: ["glutes","hamstrings","back"], cue: "Hinge at the hips, squeeze glutes at the top, don't hyperextend." },
  { name: "Cable pull-through", family: "hinge", rank: 3, zone: "cable", pattern: "hinge", region: "lower", exp: 1, impact: 0, unilateral: false, avoid: [], muscles: ["glutes","hamstrings"], cue: "Hinge back, then snap hips forward — teaches the hinge with light load." },

  /* ---------------- HORIZONTAL PUSH ---------------- */
  { name: "Push-up", family: "h_push", rank: 5, zone: "bodyweight", pattern: "h_push", region: "push", exp: 1, impact: 1, unilateral: false, avoid: ["wrist", "shoulder"], muscles: ["chest","shoulders","arms"], cue: "Straight line head to heels, elbows ~45°, full range." },
  { name: "Incline push-up", family: "h_push", rank: 4, zone: "bodyweight", pattern: "h_push", region: "push", exp: 1, impact: 0, unilateral: false, avoid: ["wrist"], muscles: ["chest","shoulders","arms"], cue: "Hands elevated on a bench — regression that keeps the pattern honest." },
  { name: "Machine chest press", family: "h_push", rank: 2, zone: "machine", pattern: "h_push", region: "push", exp: 1, impact: 1, unilateral: false, avoid: [], muscles: ["chest","shoulders","arms"], cue: "Handles at mid-chest, press smooth, don't lock out hard." },
  { name: "Dumbbell bench press", family: "h_push", rank: 8, zone: "dumbbell", pattern: "h_push", region: "push", exp: 1, impact: 1, unilateral: false, avoid: ["shoulder"], muscles: ["chest","shoulders","arms"], cue: "Shoulder blades set, lower to chest level, press to stacked over shoulders." },
  { name: "Barbell bench press", family: "h_push", rank: 11, zone: "rack", pattern: "h_push", region: "push", exp: 2, impact: 1, unilateral: false, avoid: ["shoulder", "wrist"], muscles: ["chest","shoulders","arms"], cue: "Tuck elbows, touch mid-chest, leg drive, controlled bar path." },
  { name: "Incline dumbbell press", family: "h_push", rank: 10, zone: "dumbbell", pattern: "h_push", region: "push", exp: 2, impact: 1, unilateral: false, avoid: ["shoulder"], muscles: ["chest","shoulders"], cue: "30–45° bench, press up and slightly in — upper-chest bias." },
  { name: "Incline barbell bench press", family: "h_push", rank: 13, zone: "rack", pattern: "h_push", region: "push", exp: 2, impact: 1, unilateral: false, avoid: ["shoulder","wrist"], muscles: ["chest","shoulders","arms"], cue: "Set the bench to 30–45°, touch the upper chest, and keep the shoulder blades anchored." },
  { name: "Decline barbell bench press", family: "h_push", rank: 14, zone: "rack", pattern: "h_push", region: "push", exp: 2, impact: 1, unilateral: false, avoid: ["shoulder","wrist"], muscles: ["chest","arms"], cue: "Secure the legs, lower to the lower chest, and press back over the shoulders." },
  { name: "Decline dumbbell bench press", family: "h_push", rank: 12, zone: "dumbbell", pattern: "h_push", region: "push", exp: 2, impact: 1, unilateral: false, avoid: ["shoulder"], muscles: ["chest","arms"], cue: "Use a small decline, keep the wrists stacked, and control the deeper dumbbell range." },
  { name: "Neutral-grip dumbbell bench press", family: "h_push", rank: 9, zone: "dumbbell", pattern: "h_push", region: "push", exp: 1, impact: 0, unilateral: false, avoid: [], muscles: ["chest","arms"], cue: "Palms face each other, elbows stay close, and the shoulders remain packed." },
  { name: "Cable chest fly", family: "chest_isolation", rank: 2, zone: "cable", pattern: "h_push", region: "push", exp: 1, impact: 1, unilateral: false, avoid: ["shoulder"], muscles: ["chest"], cue: "Soft elbows, hug the arms together, squeeze the chest." },
  { name: "Floor press", family: "h_push", rank: 7, zone: "dumbbell", pattern: "h_push", region: "push", exp: 1, impact: 0, unilateral: false, avoid: ["wrist"], muscles: ["chest","arms"], cue: "Elbows stop at the floor — shoulder-friendly pressing option." },

  /* ---------------- VERTICAL PUSH ---------------- */
  { name: "Seated dumbbell press", family: "v_push", rank: 3, zone: "dumbbell", pattern: "v_push", region: "push", exp: 1, impact: 1, unilateral: false, avoid: ["shoulder"], muscles: ["shoulders","arms"], cue: "Ribs down, press overhead without flaring the low back." },
  { name: "Machine shoulder press", family: "v_push", rank: 2, zone: "machine", pattern: "v_push", region: "push", exp: 1, impact: 1, unilateral: false, avoid: ["shoulder"], muscles: ["shoulders","arms"], cue: "Set the seat so handles start at shoulder height, press smooth." },
  { name: "Standing barbell press", family: "v_push", rank: 6, zone: "rack", pattern: "v_push", region: "push", exp: 3, impact: 1, unilateral: false, avoid: ["shoulder", "lowback"], muscles: ["shoulders","arms","core"], cue: "Squeeze glutes, press the bar and bring the head through at lockout." },
  { name: "Landmine press", family: "v_push", rank: 1, zone: "platform", pattern: "v_push", region: "push", exp: 1, impact: 0, unilateral: true, avoid: [], muscles: ["shoulders","chest"], cue: "Angled press is easy on the shoulder — great overhead alternative." },
  { name: "Half-kneeling cable press", family: "h_push", rank: 3, zone: "cable", pattern: "v_push", region: "push", exp: 2, impact: 0, unilateral: true, avoid: ["shoulder"], muscles: ["shoulders","core"], cue: "Tall half-kneel, press up, resist the twist — core plus shoulder." },

  /* ---------------- HORIZONTAL PULL ---------------- */
  { name: "Seated cable row", family: "h_pull", rank: 7, zone: "cable", pattern: "h_pull", region: "pull", exp: 1, impact: 0, unilateral: false, avoid: [], muscles: ["back","arms"], cue: "Tall chest, pull to the belly, squeeze the mid-back, control back out." },
  { name: "Chest-supported row", family: "h_pull", rank: 4, zone: "machine", pattern: "h_pull", region: "pull", exp: 1, impact: 0, unilateral: false, avoid: [], muscles: ["back","arms"], cue: "Chest on the pad takes the low back out — pure upper-back work." },
  { name: "Single-arm machine row with iso hold", family: "h_pull", rank: 5, zone: "machine", pattern: "h_pull", region: "pull", exp: 1, impact: 0, unilateral: true, avoid: [], muscles: ["back","arms"], cue: "Hold one handle at full contraction while the other arm rows; meet in the squeeze, then switch sides." },
  { name: "One-arm dumbbell row", family: "h_pull", rank: 14, zone: "dumbbell", pattern: "h_pull", region: "pull", exp: 1, impact: 1, unilateral: true, avoid: ["lowback"], muscles: ["back","arms"], cue: "Flat back, drive the elbow to the hip, don't twist the torso." },
  { name: "Barbell bent row", family: "h_pull", rank: 12, zone: "rack", pattern: "h_pull", region: "pull", exp: 2, impact: 1, unilateral: false, avoid: ["lowback"], muscles: ["back","arms"], cue: "Hinge to ~45°, pull to the lower ribs, flat back throughout." },
  { name: "Inverted row", family: "h_pull", rank: 8, zone: "crossfit", pattern: "h_pull", region: "pull", exp: 1, impact: 1, unilateral: false, avoid: ["shoulder"], muscles: ["back","arms"], cue: "Body in a plank, pull chest to the bar — scalable bodyweight pull." },
  { name: "TRX row", family: "h_pull", rank: 2, zone: "crossfit", pattern: "h_pull", region: "pull", exp: 1, impact: 0, unilateral: false, avoid: [], muscles: ["back","arms"], cue: "Adjust foot position for difficulty, squeeze the shoulder blades." },

  /* ---------------- VERTICAL PULL ---------------- */
  { name: "Lat pulldown", family: "v_pull", rank: 3, zone: "cable", pattern: "v_pull", region: "pull", exp: 1, impact: 0, unilateral: false, avoid: [], muscles: ["back","arms"], cue: "Drive elbows down to the ribs, chest up, control the return." },
  { name: "Assisted pull-up", family: "v_pull", rank: 1, zone: "machine", pattern: "v_pull", region: "pull", exp: 1, impact: 1, unilateral: false, avoid: ["shoulder"], muscles: ["back","arms"], cue: "Full hang to chin over bar, let the machine assist the sticking point." },
  { name: "Pull-up", family: "v_pull", rank: 7, zone: "rack", pattern: "v_pull", region: "pull", exp: 3, impact: 1, unilateral: false, avoid: ["shoulder", "elbow"], muscles: ["back","arms"], cue: "Dead hang, pull the chest to the bar, control all the way down." },
  { name: "Chin-up", family: "v_pull", rank: 5, zone: "rack", pattern: "v_pull", region: "pull", exp: 2, impact: 1, unilateral: false, avoid: ["elbow"], muscles: ["back","arms"], cue: "Underhand grip, drive elbows down — a little more biceps." },
  { name: "Straight-arm pulldown", family: "lat_accessory", rank: 1, zone: "cable", pattern: "v_pull", region: "pull", exp: 1, impact: 0, unilateral: false, avoid: ["shoulder"], muscles: ["back"], cue: "Soft elbows, sweep the bar to the thighs — lat isolation." },

  /* ---------------- CARRY / CORE ---------------- */
  { name: "Farmer carry", family: "carry", rank: 1, zone: "dumbbell", pattern: "carry", region: "core", exp: 1, impact: 1, unilateral: false, avoid: [], muscles: ["core","back"], cue: "Tall and braced, crush the handles, walk smooth and controlled." },
  { name: "Single Arm farmer carry", family: "carry", rank: 4, zone: "dumbbell", pattern: "carry", region: "core", exp: 1, impact: 1, unilateral: true, avoid: [], muscles: ["core"], cue: "Load one side, resist the lean — anti-lateral-flexion core work." },
  { name: "Dead bug", family: "core", rank: 1, zone: "bodyweight", pattern: "core", region: "core", exp: 1, impact: 0, unilateral: true, avoid: [], muscles: ["core"], cue: "Low back glued to the floor, extend opposite arm/leg slowly." },
  { name: "Pallof press", family: "core", rank: 7, zone: "cable", pattern: "core", region: "core", exp: 1, impact: 0, unilateral: false, avoid: [], muscles: ["core"], cue: "Press straight out, resist the rotation — anti-rotation core." },
  { name: "Front plank", family: "core", rank: 5, zone: "bodyweight", pattern: "core", region: "core", exp: 1, impact: 0, unilateral: false, avoid: ["shoulder", "wrist"], muscles: ["core"], cue: "Squeeze glutes, ribs down, straight line — quality over duration." },
  { name: "Side plank", family: "core", rank: 6, zone: "bodyweight", pattern: "core", region: "core", exp: 2, impact: 0, unilateral: true, avoid: ["shoulder"], muscles: ["core"], cue: "Stack the hips, drive the bottom hip tall, don't sag." },
  { name: "Hanging knee raise", family: "core", rank: 13, zone: "rack", pattern: "core", region: "core", exp: 2, impact: 1, unilateral: false, avoid: ["shoulder"], muscles: ["core"], cue: "Curl the pelvis up, control the swing — no kipping." },
  { name: "Cable woodchop", family: "rotation", rank: 3, zone: "cable", pattern: "rotation", region: "core", exp: 2, impact: 0, unilateral: true, avoid: ["lowback"], muscles: ["core"], cue: "Rotate from the trunk, arms stay long, control the return." },
  { name: "Ab wheel rollout", family: "core", rank: 16, zone: "crossfit", pattern: "core", region: "core", exp: 3, impact: 1, unilateral: false, avoid: ["lowback", "shoulder"], muscles: ["core"], cue: "Ribs down, roll only as far as you can keep a flat back." },

  /* ---------------- ISOLATION / ACCESSORY ---------------- */
  { name: "Dumbbell curl", family: "biceps", rank: 3, zone: "dumbbell", pattern: "h_pull", region: "pull", exp: 1, impact: 0, unilateral: false, avoid: ["elbow"], muscles: ["arms"], cue: "Elbows pinned, no swing, squeeze at the top." },
  { name: "Cable curl", family: "biceps", rank: 1, zone: "cable", pattern: "h_pull", region: "pull", exp: 1, impact: 0, unilateral: false, avoid: ["elbow"], muscles: ["arms"], cue: "Constant tension, control the lowering." },
  { name: "Triceps pushdown", family: "triceps", rank: 1, zone: "cable", pattern: "h_push", region: "push", exp: 1, impact: 0, unilateral: false, avoid: ["elbow"], muscles: ["arms"], cue: "Elbows locked at the sides, full extension, control up." },
  { name: "Overhead triceps extension", family: "triceps", rank: 3, zone: "dumbbell", pattern: "v_push", region: "push", exp: 1, impact: 0, unilateral: false, avoid: ["elbow", "shoulder"], muscles: ["arms"], cue: "Keep elbows narrow, stretch behind the head, extend fully." },
  { name: "Lateral raise", family: "shoulder_scapular", rank: 6, zone: "dumbbell", pattern: "v_push", region: "push", exp: 1, impact: 0, unilateral: false, avoid: ["shoulder"], muscles: ["shoulders"], cue: "Lead with the elbows, stop at shoulder height, no shrugging." },
  { name: "Face pull", family: "shoulder_scapular", rank: 3, zone: "cable", pattern: "h_pull", region: "pull", exp: 1, impact: 0, unilateral: false, avoid: [], muscles: ["back","shoulders"], cue: "Pull to the forehead, thumbs back — bulletproofs the shoulders." },
  { name: "Rear delt fly", family: "shoulder_scapular", rank: 7, zone: "dumbbell", pattern: "h_pull", region: "pull", exp: 1, impact: 0, unilateral: false, avoid: [], muscles: ["shoulders","back"], cue: "Soft elbows, hinge over, squeeze the rear delts." },
  { name: "Calf raise", family: "calf", rank: 2, zone: "machine", pattern: "squat", region: "lower", exp: 1, impact: 0, unilateral: false, avoid: [], muscles: ["calves"], cue: "Full stretch at the bottom, tall squeeze at the top, controlled." },

  /* ---------------- CONDITIONING ---------------- */
  { name: "Rower", family: "conditioning", rank: 6, zone: "cardio", pattern: "conditioning", region: "cardio", exp: 1, impact: 0, unilateral: false, avoid: ["lowback"], muscles: ["back","hamstrings"], cue: "Legs, then hips, then arms. Brace the back — never round it to reach.", demands: ["sustained_cardio","seated"], safetyReviewed: true, safetyMetadataVersion: 2, safetySource: "inferred", bankId: "rower", bankSource: "built-in" },
  { name: "Assault bike", family: "conditioning", rank: 9, zone: "cardio", pattern: "conditioning", region: "cardio", exp: 1, impact: 0, unilateral: false, avoid: [], muscles: [], cue: "Arms and legs together. Scales from an easy spin to all-out.", demands: ["sustained_cardio","seated"], safetyReviewed: true, safetyMetadataVersion: 2, safetySource: "inferred", bankId: "assault-bike", bankSource: "built-in" },
  { name: "Ski erg", family: "conditioning", rank: 7, zone: "cardio", pattern: "conditioning", region: "cardio", exp: 1, impact: 0, unilateral: false, avoid: ["shoulder"], muscles: ["back","core"], cue: "Hinge and drive down through the handles, finish past the hips.", demands: ["sustained_cardio","standing"], safetyReviewed: true, safetyMetadataVersion: 2, safetySource: "inferred", bankId: "ski-erg", bankSource: "built-in" },
  { name: "Incline treadmill", family: "conditioning", rank: 5, zone: "cardio", pattern: "conditioning", region: "cardio", exp: 1, impact: 1, unilateral: false, avoid: [], muscles: ["quads","calves"], cue: "Walk the hill. Raise the grade before you raise the speed.", demands: ["repetitive_step","sustained_cardio","standing"], safetyReviewed: true, safetyMetadataVersion: 2, safetySource: "inferred", bankId: "incline-treadmill", bankSource: "built-in" },
  { name: "Stair climber", family: "conditioning", rank: 4, zone: "cardio", pattern: "conditioning", region: "cardio", exp: 1, impact: 1, unilateral: false, avoid: [], muscles: ["quads","glutes","calves"], cue: "Tall posture, full step, let go of the rails when you can.", demands: ["repetitive_step","sustained_cardio","standing"], safetyReviewed: true, safetyMetadataVersion: 2, safetySource: "inferred", bankId: "stair-climber", bankSource: "built-in" },
  { name: "Stationary bike", family: "conditioning", rank: 1, zone: "cardio", pattern: "conditioning", region: "cardio", exp: 1, impact: 0, unilateral: false, avoid: [], muscles: ["quads","glutes"], cue: "Seated, steady cadence — the lowest-impact engine work in the building.", demands: ["sustained_cardio","seated"], safetyReviewed: true, safetyMetadataVersion: 2, safetySource: "inferred", bankId: "stationary-bike", bankSource: "built-in" },
  { name: "Elliptical", family: "conditioning", rank: 2, zone: "cardio", pattern: "conditioning", region: "cardio", exp: 1, impact: 0, unilateral: false, avoid: [], muscles: ["quads","glutes"], cue: "Smooth stride, light grip on the handles, no impact through the knees.", demands: ["repetitive_step","sustained_cardio","standing"], safetyReviewed: true, safetyMetadataVersion: 2, safetySource: "inferred", bankId: "elliptical", bankSource: "built-in" },
  { name: "Kettlebell swing", family: "hinge", rank: 10, zone: "crossfit", pattern: "hinge", region: "full", exp: 2, impact: 1, unilateral: false, avoid: ["lowback"], muscles: ["glutes","hamstrings","back"], cue: "Hips snap the bell up, arms are just hooks, brace hard at the top." },
  { name: "VersaClimber", family: "conditioning", rank: 8, zone: "cardio", pattern: "conditioning", region: "cardio", exp: 1, impact: 0, unilateral: false, avoid: ["shoulder"], muscles: ["shoulders","core"], cue: "Opposite arm and leg, short strokes. Brutal engine work, zero impact.", demands: ["sustained_cardio","standing"], safetyReviewed: true, safetyMetadataVersion: 2, safetySource: "inferred", bankId: "versaclimber", bankSource: "built-in" },
  { name: "HIITMill forward drive", family: "conditioning", rank: 12, zone: "cardio", pattern: "conditioning", region: "full", exp: 1, impact: 1, unilateral: false, avoid: [], muscles: ["quads","glutes"], cue: "Use the HIITMill handles, keep a low body angle, and drive with powerful steps." },
  { name: "HIITMill backward drive", family: "conditioning", rank: 13, zone: "cardio", pattern: "conditioning", region: "full", exp: 1, impact: 0, unilateral: false, avoid: [], muscles: ["quads","glutes"], cue: "Face away only with trainer control, hold the rails, and take short deliberate backward steps." },
  { name: "Treadmill", family: "conditioning", rank: 3, zone: "cardio", pattern: "conditioning", region: "cardio", exp: 1, impact: 1, unilateral: false, avoid: [], muscles: ["quads","calves"], cue: "Steady pace you could still hold a short sentence at.", demands: ["repetitive_step","sustained_cardio","standing"], safetyReviewed: true, safetyMetadataVersion: 2, safetySource: "inferred", bankId: "treadmill", bankSource: "built-in" },
  { name: "Jump rope", family: "conditioning", rank: 11, zone: "bodyweight", pattern: "conditioning", region: "cardio", exp: 1, impact: 2, unilateral: false, avoid: ["ankle","knee"], muscles: ["calves"], cue: "Light bounce off the balls of the feet, wrists doing the turning.", demands: ["impact","ballistic","sustained_cardio","standing"], safetyReviewed: true, safetyMetadataVersion: 2, safetySource: "inferred", bankId: "jump-rope", bankSource: "built-in" },
  { name: "Med ball slam", family: "power_plyometric", rank: 5, zone: "crossfit", pattern: "conditioning", region: "full", exp: 1, impact: 1, unilateral: false, avoid: ["lowback", "shoulder"], muscles: ["core","back"], cue: "Full overhead reach, slam hard, absorb the catch." },
  { name: "Box step-over", family: "unilateral_lower", rank: 4, zone: "crossfit", pattern: "conditioning", region: "full", exp: 1, impact: 1, unilateral: true, avoid: ["knee"], muscles: ["quads","glutes"], cue: "Step up and over continuously, controlled — low-impact engine work." },
  { name: "Mountain climber", family: "conditioning", rank: 10, zone: "bodyweight", pattern: "conditioning", region: "core", exp: 1, impact: 1, unilateral: true, avoid: ["wrist","shoulder"], muscles: ["core"], cue: "Hips low and level, drive one knee at a time without bouncing.", demands: ["single_leg","balance_challenge","wrist_extension","sustained_cardio","standing"], safetyReviewed: true, safetyMetadataVersion: 2, safetySource: "inferred", bankId: "mountain-climber", bankSource: "built-in" },
  { name: "Plank shoulder tap", family: "core", rank: 10, zone: "bodyweight", pattern: "core", region: "core", exp: 1, impact: 0, unilateral: true, avoid: ["wrist","shoulder"], muscles: ["core"], cue: "Feet wide, tap the opposite shoulder without letting the hips rock.", demands: ["single_leg","balance_challenge","wrist_extension","high_abdominal_pressure","sustained_cardio","prone","floor_transfer"], safetyReviewed: true, safetyMetadataVersion: 2, safetySource: "inferred", bankId: "plank-shoulder-tap", bankSource: "built-in" },
  { name: "Hollow-body march", family: "core", rank: 8, zone: "bodyweight", pattern: "core", region: "core", exp: 1, impact: 0, unilateral: true, avoid: ["lowback"], muscles: ["core"], cue: "Low back pressed into the floor, march the legs slowly.", demands: ["single_leg","balance_challenge","sustained_cardio","supine","floor_transfer"], safetyReviewed: true, safetyMetadataVersion: 2, safetySource: "inferred", bankId: "hollow-body-march", bankSource: "built-in" },
  { name: "Seated knee tuck", family: "core", rank: 9, zone: "bodyweight", pattern: "core", region: "core", exp: 1, impact: 0, unilateral: false, avoid: ["lowback"], muscles: ["core"], cue: "Lean back, tuck the knees in, control the way back out.", demands: ["sustained_cardio","seated"], safetyReviewed: true, safetyMetadataVersion: 2, safetySource: "inferred", bankId: "seated-knee-tuck", bankSource: "built-in" },
  { name: "Pallof step-out", family: "core", rank: 12, zone: "cable", pattern: "core", region: "core", exp: 1, impact: 0, unilateral: true, avoid: [], muscles: ["core"], cue: "Press out, step away from the stack, refuse to let it twist you.", demands: ["single_leg","balance_challenge","repetitive_step","sustained_cardio","loaded_grip","standing"], safetyReviewed: true, safetyMetadataVersion: 2, safetySource: "inferred", bankId: "pallof-step-out", bankSource: "built-in" },

  /* ---------------- PLYO / ATHLETIC ---------------- */
  { name: "Medicine ball chest pass", family: "power_plyometric", rank: 3, zone: "crossfit", pattern: "plyo", region: "push", exp: 1, impact: 1, unilateral: false, avoid: ["shoulder"], muscles: ["chest","shoulders","arms"], cue: "Start at the chest, brace, and throw straight ahead with maximum speed; reset fully between reps." },
  { name: "Plyometric push-up", family: "power_plyometric", rank: 11, zone: "bodyweight", pattern: "plyo", region: "push", exp: 2, impact: 2, unilateral: false, avoid: ["wrist","shoulder","elbow"], muscles: ["chest","shoulders","arms"], cue: "Explode just high enough for the hands to leave the floor, land softly, and stop the set when speed drops." },
  { name: "Box jump", family: "power_plyometric", rank: 7, zone: "crossfit", pattern: "plyo", region: "lower", exp: 2, impact: 3, unilateral: false, avoid: ["knee", "hip", "ankle"], muscles: ["quads","glutes"], cue: "Load the hips, land soft and quiet, step down — never rebound down." },
  { name: "Broad jump", family: "power_plyometric", rank: 8, zone: "crossfit", pattern: "plyo", region: "lower", exp: 2, impact: 3, unilateral: false, avoid: ["knee", "hip", "ankle", "lowback"], muscles: ["quads","glutes","hamstrings"], cue: "Big arm swing, land soft with bent knees, stick the landing." },
  { name: "Medicine ball rotational throw", family: "rotation", rank: 5, zone: "crossfit", pattern: "rotation", region: "full", exp: 2, impact: 2, unilateral: true, avoid: ["lowback", "shoulder"], muscles: ["core"], cue: "Rotate through the hips, throw hard, control the reset." },
  { name: "Skater bound", family: "power_plyometric", rank: 9, zone: "bodyweight", pattern: "plyo", region: "lower", exp: 2, impact: 3, unilateral: true, avoid: ["knee", "hip", "ankle"], muscles: ["quads","glutes"], cue: "Bound side to side, stick each landing — lateral power and control." },
  { name: "Pogo hops", family: "power_plyometric", rank: 1, zone: "bodyweight", pattern: "plyo", region: "lower", exp: 1, impact: 2, unilateral: false, avoid: ["ankle"], muscles: ["calves"], cue: "Stiff ankles, quick low hops off the balls of the feet." },
  { name: "Agility ladder", family: "agility", rank: 1, zone: "crossfit", pattern: "plyo", region: "lower", exp: 1, impact: 2, unilateral: false, avoid: ["knee", "ankle"], muscles: ["quads","calves"], cue: "Light quick feet, stay on the balls of the feet, eyes up." },
  { name: "Lateral bound to stick", family: "power_plyometric", rank: 10, zone: "bodyweight", pattern: "plyo", region: "lower", exp: 2, impact: 2, unilateral: true, avoid: ["knee", "ankle"], muscles: ["quads","glutes"], cue: "Push off one leg, land and freeze for a beat — builds control." },

  /* ---------------- OLYMPIC / POWER (platform, advanced) ---------------- */
  { name: "Power clean", family: "olympic", rank: 4, zone: "platform", pattern: "olympic", region: "full", exp: 3, impact: 2, unilateral: false, avoid: ["lowback", "wrist", "knee"], muscles: ["back","glutes","hamstrings","shoulders"], cue: "Explode through the hips, fast elbows, catch in a quarter squat." },
  { name: "Hang power clean", family: "olympic", rank: 3, zone: "platform", pattern: "olympic", region: "full", exp: 3, impact: 2, unilateral: false, avoid: ["lowback", "wrist"], muscles: ["back","glutes","shoulders"], cue: "From the hip, violent hip snap, meet the bar in the front rack." },
  { name: "Push press", family: "v_push", rank: 7, zone: "platform", pattern: "v_push", region: "full", exp: 2, impact: 1, unilateral: false, avoid: ["shoulder", "lowback"], muscles: ["shoulders","arms","glutes"], cue: "Small dip, drive with the legs, finish the press overhead." },
  { name: "Medicine ball clean", family: "power_plyometric", rank: 4, zone: "crossfit", pattern: "olympic", region: "full", exp: 2, impact: 1, unilateral: false, avoid: ["lowback"], muscles: ["glutes","shoulders","core"], cue: "Great way to learn triple extension without a barbell." },

/* ---------------- ADDED: SQUAT depth ---------------- */
  { name: "Pause back squat", family: "squat", rank: 15, zone: "rack", pattern: "squat", region: "lower", exp: 3, impact: 2, unilateral: false, avoid: ["knee","lowback"], muscles: ["quads","glutes","hamstrings"], cue: "2-count pause in the hole, no bounce — brutal position strength." },
  { name: "Tempo front squat", family: "squat", rank: 16, zone: "rack", pattern: "squat", region: "lower", exp: 3, impact: 2, unilateral: false, avoid: ["knee","wrist"], muscles: ["quads","core"], cue: "4s descent, stay upright, drive out hard — exposes any weak link." },
  { name: "Smith machine squat", family: "squat", rank: 6, zone: "machine", pattern: "squat", region: "lower", exp: 2, impact: 2, unilateral: false, avoid: ["knee","lowback"], muscles: ["quads","glutes"], cue: "Set the safeties, keep the whole foot planted, and stay braced through a pain-free range." },
  { name: "Zercher squat", family: "squat", rank: 17, zone: "rack", pattern: "squat", region: "lower", exp: 3, impact: 2, unilateral: false, avoid: ["knee","lowback"], muscles: ["quads","glutes","core"], cue: "Bar in the elbow crease, brace like your life depends on it." },
  { name: "Belt squat", family: "squat", rank: 4, zone: "machine", pattern: "squat", region: "lower", exp: 2, impact: 1, unilateral: false, avoid: ["knee"], muscles: ["quads","glutes"], cue: "Loads the legs with zero spinal compression." },
  { name: "Front-foot-elevated split squat", family: "unilateral_lower", rank: 10, zone: "dumbbell", pattern: "lunge", region: "lower", exp: 2, impact: 1, unilateral: true, avoid: ["knee"], muscles: ["quads","glutes"], cue: "Elevate the front foot for extra depth and quad stretch." },
  { name: "Deficit reverse lunge", family: "unilateral_lower", rank: 17, zone: "dumbbell", pattern: "lunge", region: "lower", exp: 3, impact: 2, unilateral: true, avoid: ["knee","hip"], muscles: ["quads","glutes"], cue: "Step off a plate — bigger range, bigger glute stretch." , hidden: true },
  { name: "Cyclist squat", family: "squat", rank: 13, zone: "dumbbell", pattern: "squat", region: "lower", exp: 2, impact: 1, unilateral: false, avoid: ["knee"], muscles: ["quads"], cue: "Heels elevated, upright torso — quad-dominant squat." },
  { name: "Sissy squat", family: "squat", rank: 14, zone: "bodyweight", pattern: "squat", region: "lower", exp: 3, impact: 2, unilateral: false, avoid: ["knee"], muscles: ["quads"], cue: "Knees travel forward, hips stay extended — advanced quad isolation." },

  /* ---------------- ADDED: SINGLE-LEG depth ----------------
     The lunge family had seven movements, all dumbbell or bodyweight, only three at
     level 1, and nothing in the frontal plane. Single-leg work is foundational for
     beginners and the main tool for clients with knee limitations. */
  { name: "Split squat", family: "unilateral_lower", rank: 2, zone: "dumbbell", pattern: "lunge", region: "lower", exp: 1, impact: 1, unilateral: true, avoid: ["knee"], muscles: ["quads","glutes"], cue: "Both feet stay planted. Drop the back knee straight down, stand back up." },
  { name: "Lateral lunge", family: "unilateral_lower", rank: 11, zone: "bodyweight", pattern: "lunge", region: "lower", exp: 1, impact: 1, unilateral: true, avoid: ["knee","hip"], muscles: ["quads","glutes"], cue: "Step wide to one side, sit into that hip, push back to the middle." },
  { name: "Box step-down", family: "unilateral_lower", rank: 5, zone: "bodyweight", pattern: "lunge", region: "lower", exp: 1, impact: 1, unilateral: true, avoid: ["knee"], muscles: ["quads","glutes"], cue: "Stand on the box, lower the other foot slowly to tap the floor, stand back up." },
  { name: "TRX-assisted split squat", family: "unilateral_lower", rank: 1, zone: "crossfit", pattern: "lunge", region: "lower", exp: 1, impact: 0, unilateral: true, avoid: [], muscles: ["quads","glutes"], cue: "Hold the straps for balance and take as much weight through your arms as you need." },
  { name: "Goblet reverse lunge", family: "unilateral_lower", rank: 6, zone: "dumbbell", pattern: "lunge", region: "lower", exp: 1, impact: 1, unilateral: true, avoid: ["knee"], muscles: ["quads","glutes"], cue: "Hold one weight at your chest, step back, drop the back knee, step in." },
  { name: "Landmine reverse lunge", family: "unilateral_lower", rank: 9, zone: "platform", pattern: "lunge", region: "lower", exp: 2, impact: 1, unilateral: true, avoid: ["knee"], muscles: ["quads","glutes"], cue: "Hold the bar end at your chest and step straight back under control." },
  { name: "Trap bar split squat", family: "unilateral_lower", rank: 16, zone: "platform", pattern: "lunge", region: "lower", exp: 2, impact: 1, unilateral: true, avoid: ["knee"], muscles: ["quads","glutes"], cue: "Stand inside the bar, one foot back, lower the back knee toward the floor." },
  { name: "Curtsy lunge", family: "unilateral_lower", rank: 13, zone: "dumbbell", pattern: "lunge", region: "lower", exp: 2, impact: 1, unilateral: true, avoid: ["knee","hip"], muscles: ["glutes","quads"], cue: "Step one foot behind and across, lower, then return. Hips stay square." },
  { name: "Front-rack reverse lunge", family: "unilateral_lower", rank: 15, zone: "dumbbell", pattern: "lunge", region: "lower", exp: 2, impact: 1, unilateral: true, avoid: ["knee"], muscles: ["quads","glutes"], cue: "Weights at the shoulders, step back, stay tall through the chest." },
  { name: "Slider reverse lunge", family: "unilateral_lower", rank: 8, zone: "bodyweight", pattern: "lunge", region: "lower", exp: 3, impact: 1, unilateral: true, avoid: ["knee"], muscles: ["quads","glutes"], cue: "Slide one foot back slowly, keep the weight in the front leg, pull it back in." },

  /* ---------------- ADDED: TRX depth ----------------
     The gym owns TRX and the library used it once. It is the best beginner tool here
     because it makes hard movements assistable rather than impossible. */
  { name: "TRX-assisted squat", family: "squat", rank: 1, zone: "crossfit", pattern: "squat", region: "lower", exp: 1, impact: 0, unilateral: false, avoid: [], muscles: ["quads","glutes"], cue: "Hold the handles, sit back into a squat, use your arms for as much help as you need." },
  { name: "TRX chest press", family: "h_push", rank: 1, zone: "crossfit", pattern: "h_push", region: "push", exp: 1, impact: 0, unilateral: false, avoid: ["shoulder","wrist"], muscles: ["chest","arms"], cue: "Lean into the straps, lower your chest to your hands, press back. Walk your feet back to make it harder." },
  { name: "TRX Y-raise", family: "shoulder_scapular", rank: 1, zone: "crossfit", pattern: "v_pull", region: "pull", exp: 1, impact: 0, unilateral: false, avoid: ["shoulder"], muscles: ["shoulders","back"], cue: "Lean back slightly and raise your arms into a Y. Light and controlled." },
  { name: "TRX hamstring curl", family: "hamstring_curl", rank: 3, zone: "crossfit", pattern: "hinge", region: "lower", exp: 2, impact: 0, unilateral: false, avoid: ["lowback"], muscles: ["hamstrings","glutes"], cue: "Heels in the straps, lift your hips, pull your heels toward you." },
  { name: "TRX assisted row", family: "h_pull", rank: 1, zone: "crossfit", pattern: "h_pull", region: "pull", exp: 1, impact: 0, unilateral: false, avoid: [], muscles: ["back","arms"], cue: "Walk your feet forward to make it harder, back to make it easier. Pull your chest to your hands." },

  /* ---------------- ADDED: CARRY depth ---------------- */
  { name: "90 degree DB walks", family: "carry", rank: 6, zone: "dumbbell", pattern: "carry", region: "full", exp: 2, impact: 1, unilateral: false, avoid: ["shoulder"], muscles: ["shoulders","core"], cue: "Elbows locked at 90 degrees, walk without letting the bells drift forward.", demands: ["loaded_grip","overhead_position","gait"], safetyReviewed: true, safetyMetadataVersion: 2, safetySource: "authored", bankId: "90-degree-db-walks", bankSource: "built-in" },
  { name: "Front-rack carry", family: "carry", rank: 3, zone: "dumbbell", pattern: "carry", region: "full", exp: 1, impact: 0, unilateral: false, avoid: ["shoulder"], muscles: ["core","shoulders"], cue: "Weights at the shoulders, ribs down, walk tall and steady." },
  { name: "Trap bar carry", family: "carry", rank: 2, zone: "platform", pattern: "carry", region: "full", exp: 1, impact: 0, unilateral: false, avoid: [], muscles: ["core","back"], cue: "Stand tall inside the bar, grip hard, walk with short controlled steps." },
  { name: "Waiter carry", family: "carry", rank: 7, zone: "dumbbell", pattern: "carry", region: "full", exp: 2, impact: 0, unilateral: true, avoid: ["shoulder"], muscles: ["shoulders","core"], cue: "One weight straight overhead, elbow locked, walk without leaning." },

  /* ---------------- ADDED: ROTATION depth ----------------
     One level-1 option existed in the whole library. */
  { name: "Dead bug with reach", family: "core", rank: 2, zone: "bodyweight", pattern: "rotation", region: "core", exp: 1, impact: 0, unilateral: true, avoid: [], muscles: ["core"], cue: "On your back, lower one arm and the opposite leg, keep your low back flat on the floor." },
  { name: "Half-kneeling band chop", family: "rotation", rank: 1, zone: "cable", pattern: "rotation", region: "core", exp: 1, impact: 0, unilateral: true, avoid: [], muscles: ["core"], cue: "One knee down, pull the band across your body from high to low. Hips stay still." },
  { name: "Half-kneeling band lift", family: "rotation", rank: 2, zone: "cable", pattern: "rotation", region: "core", exp: 2, impact: 0, unilateral: true, avoid: [], muscles: ["core"], cue: "Same position, drive the band from low to high. The movement comes from your trunk." },
  { name: "Bird dog row", family: "rotation", rank: 6, zone: "dumbbell", pattern: "rotation", region: "core", exp: 2, impact: 0, unilateral: true, avoid: ["lowback"], muscles: ["core","back"], cue: "On all fours or braced on a bench, row one weight without letting your hips twist." },

  /* ---------------- ADDED: MACHINE on-ramps ----------------
     For the client who is intimidated by barbells. A legitimate first few weeks. */
  { name: "Machine leg press", family: "squat", rank: 2, zone: "machine", pattern: "squat", region: "lower", exp: 1, impact: 0, unilateral: false, avoid: ["knee"], muscles: ["quads","glutes"], cue: "Feet flat and about hip width. Lower until your knees are near 90 degrees." },
  { name: "Machine seated row", family: "h_pull", rank: 3, zone: "machine", pattern: "h_pull", region: "pull", exp: 1, impact: 0, unilateral: false, avoid: [], muscles: ["back","arms"], cue: "Sit tall, pull the handles to your stomach, let your shoulder blades move." },
  { name: "Machine lat pulldown", family: "v_pull", rank: 2, zone: "machine", pattern: "v_pull", region: "pull", exp: 1, impact: 0, unilateral: false, avoid: ["shoulder"], muscles: ["back","arms"], cue: "Pull the bar to your collarbone, lean back only slightly." },
  { name: "Machine hamstring curl", family: "hamstring_curl", rank: 2, zone: "machine", pattern: "hinge", region: "lower", exp: 1, impact: 0, unilateral: false, avoid: [], muscles: ["hamstrings"], cue: "Curl smoothly, lower slower than you lift." },

  /* ---------------- ADDED: HINGE depth ---------------- */
  { name: "Deficit deadlift", family: "hinge", rank: 12, zone: "platform", pattern: "hinge", region: "lower", exp: 3, impact: 2, unilateral: false, avoid: ["lowback"], muscles: ["hamstrings","glutes","back"], cue: "Stand on a plate — longer pull, stronger off the floor." },
  { name: "Snatch-grip RDL", family: "hinge", rank: 14, zone: "rack", pattern: "hinge", region: "lower", exp: 3, impact: 1, unilateral: false, avoid: ["lowback"], muscles: ["hamstrings","glutes","back"], cue: "Wide grip loads the upper back and hamstrings hard." },
  { name: "Pause deadlift", family: "hinge", rank: 11, zone: "platform", pattern: "hinge", region: "lower", exp: 3, impact: 2, unilateral: false, avoid: ["lowback"], muscles: ["hamstrings","glutes","back"], cue: "Pause 2s below the knee — kills any bar drift." },
  { name: "Barbell good morning", family: "hinge", rank: 9, zone: "rack", pattern: "hinge", region: "lower", exp: 3, impact: 1, unilateral: false, avoid: ["lowback"], muscles: ["hamstrings","glutes","back"], cue: "Light load, hips back, flat back — posterior chain builder." },
  { name: "Single-leg hip thrust", family: "glute", rank: 6, zone: "bodyweight", pattern: "hinge", region: "lower", exp: 2, impact: 1, unilateral: true, avoid: [], muscles: ["glutes","hamstrings"], cue: "One leg, ribs down, full lockout — exposes side-to-side gaps." },
  { name: "Nordic hamstring curl", family: "hamstring_curl", rank: 4, zone: "bodyweight", pattern: "hinge", region: "lower", exp: 3, impact: 1, unilateral: false, avoid: ["knee"], muscles: ["hamstrings"], cue: "Lower as slowly as you can control — elite hamstring eccentric." },
  { name: "Romanian deadlift (barbell, tempo)", family: "hinge", rank: 15, zone: "rack", pattern: "hinge", region: "lower", exp: 2, impact: 1, unilateral: false, avoid: ["lowback"], muscles: ["hamstrings","glutes"], cue: "3s down, feel the stretch, drive hips through." },
  { name: "45-degree back extension", family: "hinge", rank: 2, zone: "machine", pattern: "hinge", region: "lower", exp: 1, impact: 0, unilateral: false, avoid: ["lowback"], muscles: ["glutes","hamstrings"], cue: "Hinge from the hips, squeeze to a straight line — never past it.", demands: ["hip_hinge","prone"], safetyReviewed: true, safetyMetadataVersion: 2, safetySource: "authored", bankId: "45-degree-back-extension", bankSource: "built-in" },
  { name: "45-degree back extension (weighted)", family: "hinge", rank: 16, zone: "machine", pattern: "hinge", region: "lower", exp: 2, impact: 1, unilateral: false, avoid: ["lowback"], muscles: ["glutes","hamstrings","back"], cue: "Hold a plate, hinge and squeeze — don't hyperextend." },

  /* ---------------- ADDED: PUSH depth ---------------- */
  { name: "Close-grip bench press", family: "h_push", rank: 15, zone: "rack", pattern: "h_push", region: "push", exp: 2, impact: 1, unilateral: false, avoid: ["shoulder","wrist","elbow"], muscles: ["chest","arms"], cue: "Shoulder-width grip, tuck elbows — triceps and lockout strength." },
  { name: "Pause bench press", family: "h_push", rank: 16, zone: "rack", pattern: "h_push", region: "push", exp: 3, impact: 1, unilateral: false, avoid: ["shoulder","wrist"], muscles: ["chest","shoulders","arms"], cue: "1s pause on the chest, no bounce — pure pressing strength." },
  { name: "Weighted dip", family: "h_push", rank: 21, zone: "rack", pattern: "h_push", region: "push", exp: 3, impact: 1, unilateral: false, avoid: ["shoulder","elbow"], muscles: ["chest","arms","shoulders"], cue: "Slight forward lean, control the bottom — stop if shoulders complain." },
  { name: "Dip", family: "h_push", rank: 19, zone: "rack", pattern: "h_push", region: "push", exp: 2, impact: 1, unilateral: false, avoid: ["shoulder","elbow"], muscles: ["chest","arms","shoulders"], cue: "Chest slightly forward, elbows back, full lockout." },
  { name: "Larsen press", family: "h_push", rank: 18, zone: "rack", pattern: "h_push", region: "push", exp: 3, impact: 1, unilateral: false, avoid: ["shoulder","wrist"], muscles: ["chest","arms"], cue: "Feet up, no leg drive — all upper body, brutal stability." },
  { name: "Single-arm dumbbell bench press", family: "h_push", rank: 22, zone: "dumbbell", pattern: "h_push", region: "push", exp: 3, impact: 1, unilateral: true, avoid: ["shoulder"], muscles: ["chest","core","arms"], cue: "One arm at a time, resist the roll — huge anti-rotation demand." },
  { name: "Deficit push-up", family: "h_push", rank: 17, zone: "bodyweight", pattern: "h_push", region: "push", exp: 2, impact: 1, unilateral: false, avoid: ["wrist","shoulder"], muscles: ["chest","shoulders","arms"], cue: "Hands on plates for a deeper stretch." },
  { name: "Archer push-up", family: "h_push", rank: 20, zone: "bodyweight", pattern: "h_push", region: "push", exp: 3, impact: 1, unilateral: true, avoid: ["wrist","shoulder"], muscles: ["chest","arms"], cue: "Shift weight to one arm — bridge toward one-arm push-ups." },
  { name: "Seated barbell overhead press", family: "v_push", rank: 5, zone: "rack", pattern: "v_push", region: "push", exp: 2, impact: 1, unilateral: false, avoid: ["shoulder"], muscles: ["shoulders","arms"], cue: "Back supported, press straight overhead, ribs down." },
  { name: "Z-press", family: "v_push", rank: 9, zone: "platform", pattern: "v_push", region: "push", exp: 3, impact: 1, unilateral: false, avoid: ["shoulder","lowback"], muscles: ["shoulders","core"], cue: "Seated on the floor, legs straight — nowhere to hide." },
  { name: "Arnold press", family: "v_push", rank: 4, zone: "dumbbell", pattern: "v_push", region: "push", exp: 2, impact: 1, unilateral: false, avoid: ["shoulder"], muscles: ["shoulders","arms"], cue: "Rotate as you press — hits all three delt heads." },
  { name: "Single-arm dumbbell push press", family: "v_push", rank: 10, zone: "dumbbell", pattern: "v_push", region: "push", exp: 2, impact: 1, unilateral: true, avoid: ["shoulder","lowback"], muscles: ["shoulders","glutes","core"], cue: "Small dip, drive with the legs, lock it out overhead." },

  /* ---------------- ADDED: PULL depth ---------------- */
  { name: "Weighted pull-up", family: "v_pull", rank: 9, zone: "rack", pattern: "v_pull", region: "pull", exp: 3, impact: 1, unilateral: false, avoid: ["shoulder","elbow"], muscles: ["back","arms"], cue: "Add load once bodyweight sets are easy — full dead hang each rep." },
  { name: "Pendlay row", family: "h_pull", rank: 16, zone: "rack", pattern: "h_pull", region: "pull", exp: 3, impact: 1, unilateral: false, avoid: ["lowback"], muscles: ["back","arms"], cue: "Bar resets on the floor each rep, explosive pull to the sternum." },
  { name: "Meadows row", family: "h_pull", rank: 17, zone: "platform", pattern: "h_pull", region: "pull", exp: 3, impact: 1, unilateral: true, avoid: ["lowback"], muscles: ["back","arms"], cue: "Landmine, staggered stance, big stretch and squeeze." },
  { name: "Seal row", family: "h_pull", rank: 10, zone: "dumbbell", pattern: "h_pull", region: "pull", exp: 2, impact: 0, unilateral: false, avoid: [], muscles: ["back","arms"], cue: "Chest on a high bench, no body english — pure back." },
  { name: "Landmine row", family: "h_pull", rank: 13, zone: "platform", pattern: "h_pull", region: "pull", exp: 2, impact: 1, unilateral: false, avoid: ["lowback"], muscles: ["back","arms"], cue: "Both hands on the sleeve, row to the ribs, hips hinged and still.", demands: ["hip_hinge","loaded_grip","spinal_load"], safetyReviewed: true, safetyMetadataVersion: 2, safetySource: "authored", bankId: "landmine-row", bankSource: "built-in" },
  { name: "Single arm Landmine row", family: "h_pull", rank: 15, zone: "platform", pattern: "h_pull", region: "pull", exp: 2, impact: 1, unilateral: true, avoid: ["lowback"], muscles: ["back","arms"], cue: "One hand on the sleeve, square the shoulders, row to the hip.", demands: ["hip_hinge","loaded_grip","spinal_load","unilateral_balance"], safetyReviewed: true, safetyMetadataVersion: 2, safetySource: "authored", bankId: "single-arm-landmine-row", bankSource: "built-in" },
  { name: "T-bar row", family: "h_pull", rank: 11, zone: "platform", pattern: "h_pull", region: "pull", exp: 2, impact: 1, unilateral: false, avoid: ["lowback"], muscles: ["back","arms"], cue: "Hinge hard, pull to the belly, squeeze the mid-back." },
  { name: "Chest-supported T-bar row", family: "h_pull", rank: 6, zone: "machine", pattern: "h_pull", region: "pull", exp: 2, impact: 0, unilateral: false, avoid: [], muscles: ["back","arms"], cue: "Pad takes the back out, so chase the squeeze." },
  { name: "Weighted chin-up", family: "v_pull", rank: 8, zone: "rack", pattern: "v_pull", region: "pull", exp: 3, impact: 1, unilateral: false, avoid: ["elbow"], muscles: ["back","arms"], cue: "Underhand, loaded — one of the best upper-body builders." },
  { name: "Neutral-grip pull-up", family: "v_pull", rank: 6, zone: "rack", pattern: "v_pull", region: "pull", exp: 2, impact: 1, unilateral: false, avoid: ["shoulder"], muscles: ["back","arms"], cue: "Palms facing, easiest on the shoulders and elbows." },
  { name: "Single-arm lat pulldown", family: "v_pull", rank: 4, zone: "cable", pattern: "v_pull", region: "pull", exp: 2, impact: 0, unilateral: true, avoid: [], muscles: ["back","arms"], cue: "One arm, full stretch overhead, drive the elbow to the hip." },
  { name: "Chest-supported dumbbell row", family: "h_pull", rank: 9, zone: "dumbbell", pattern: "h_pull", region: "pull", exp: 1, impact: 0, unilateral: false, avoid: [], muscles: ["back","arms"], cue: "Incline bench, pull the elbows back and squeeze." },
  { name: "Barbell shrug", family: "shoulder_scapular", rank: 5, zone: "rack", pattern: "h_pull", region: "pull", exp: 1, impact: 0, unilateral: false, avoid: ["neck"], muscles: ["back"], cue: "Straight up, pause at the top, no rolling." },
  { name: "Incline dumbbell curl", family: "biceps", rank: 5, zone: "dumbbell", pattern: "h_pull", region: "pull", exp: 2, impact: 0, unilateral: false, avoid: ["elbow"], muscles: ["arms"], cue: "Arms behind the torso for a bigger biceps stretch." },
  { name: "Hammer curl", family: "biceps", rank: 4, zone: "dumbbell", pattern: "h_pull", region: "pull", exp: 1, impact: 0, unilateral: false, avoid: ["elbow"], muscles: ["arms"], cue: "Neutral grip, elbows pinned — brachialis and forearms." },
  { name: "Preacher curl", family: "biceps", rank: 2, zone: "machine", pattern: "h_pull", region: "pull", exp: 2, impact: 0, unilateral: false, avoid: ["elbow"], muscles: ["arms"], cue: "No swing possible — control the eccentric fully." },

  /* ---------------- ADDED: ARMS / ISO depth ---------------- */
  { name: "Skull crusher", family: "triceps", rank: 4, zone: "rack", pattern: "v_push", region: "push", exp: 2, impact: 0, unilateral: false, avoid: ["elbow","shoulder"], muscles: ["arms"], cue: "Lower to the forehead, elbows stay pointed up." },
  { name: "Cable overhead triceps extension", family: "triceps", rank: 2, zone: "cable", pattern: "v_push", region: "push", exp: 2, impact: 0, unilateral: false, avoid: ["elbow","shoulder"], muscles: ["arms"], cue: "Constant tension through the stretch — great long-head work." },
  { name: "Close-grip push-up", family: "h_push", rank: 6, zone: "bodyweight", pattern: "h_push", region: "push", exp: 1, impact: 1, unilateral: false, avoid: ["wrist","elbow"], muscles: ["arms","chest"], cue: "Hands under the shoulders, elbows tight to the ribs." },
  { name: "Cable lateral raise", family: "shoulder_scapular", rank: 4, zone: "cable", pattern: "v_push", region: "push", exp: 2, impact: 0, unilateral: true, avoid: ["shoulder"], muscles: ["shoulders"], cue: "Constant tension from the bottom — better than dumbbells for delts." },
  { name: "Reverse pec deck", family: "shoulder_scapular", rank: 2, zone: "machine", pattern: "h_pull", region: "pull", exp: 1, impact: 0, unilateral: false, avoid: [], muscles: ["shoulders","back"], cue: "Squeeze the rear delts, don't shrug." },
  { name: "Standing calf raise (single-leg)", family: "calf", rank: 3, zone: "bodyweight", pattern: "squat", region: "lower", exp: 2, impact: 0, unilateral: true, avoid: [], muscles: ["calves"], cue: "Full stretch, pause at the top, one leg at a time." },
  { name: "Seated calf raise", family: "calf", rank: 1, zone: "machine", pattern: "squat", region: "lower", exp: 1, impact: 0, unilateral: false, avoid: [], muscles: ["calves"], cue: "Bent knee targets the soleus — slow and full range." },

  /* ---------------- ADDED: CORE depth ---------------- */
  { name: "Hanging leg raise", family: "core", rank: 15, zone: "rack", pattern: "core", region: "core", exp: 3, impact: 1, unilateral: false, avoid: ["shoulder"], muscles: ["core"], cue: "Straight legs to the bar, no swing — curl the pelvis." },
  { name: "Weighted plank", family: "core", rank: 11, zone: "bodyweight", pattern: "core", region: "core", exp: 2, impact: 0, unilateral: false, avoid: ["shoulder","wrist"], muscles: ["core"], cue: "Plate on the back, ribs down, squeeze everything." },
  { name: "Copenhagen plank", family: "core", rank: 14, zone: "bodyweight", pattern: "core", region: "core", exp: 3, impact: 0, unilateral: true, avoid: ["hip"], muscles: ["core"], cue: "Top leg on the bench — elite adductor and core work." },
  { name: "Landmine rotation", family: "rotation", rank: 4, zone: "platform", pattern: "rotation", region: "core", exp: 2, impact: 0, unilateral: false, avoid: ["lowback"], muscles: ["core"], cue: "Rotate from the hips, arms long, control the arc." },
  { name: "Turkish get-up", family: "carry", rank: 8, zone: "crossfit", pattern: "carry", region: "full", exp: 3, impact: 1, unilateral: true, avoid: ["shoulder","wrist"], muscles: ["core","shoulders","glutes"], cue: "Slow, deliberate, eyes on the bell — total-body control." , hidden: true },
  { name: "Overhead carry", family: "carry", rank: 5, zone: "dumbbell", pattern: "carry", region: "core", exp: 2, impact: 1, unilateral: true, avoid: ["shoulder"], muscles: ["core","shoulders"], cue: "Lock the elbow, ribs down, walk tall." },
  { name: "Cable crunch", family: "core", rank: 4, zone: "cable", pattern: "core", region: "core", exp: 1, impact: 0, unilateral: false, avoid: [], muscles: ["core"], cue: "Curl the spine down, hips stay put — loadable ab work." },

  /* ---------------- ADDED: OLYMPIC / POWER depth ---------------- */
  { name: "Power snatch", family: "olympic", rank: 6, zone: "platform", pattern: "olympic", region: "full", exp: 3, impact: 2, unilateral: false, avoid: ["lowback","shoulder","wrist"], muscles: ["back","glutes","shoulders","hamstrings"], cue: "Aggressive hip extension, punch under the bar — coach it or skip it." , hidden: true },
  { name: "Hang power snatch", family: "olympic", rank: 5, zone: "platform", pattern: "olympic", region: "full", exp: 3, impact: 2, unilateral: false, avoid: ["lowback","shoulder"], muscles: ["back","glutes","shoulders"], cue: "From the hip, violent extension, catch overhead in a quarter squat." , hidden: true },
  { name: "Clean pull", family: "olympic", rank: 1, zone: "platform", pattern: "olympic", region: "full", exp: 2, impact: 2, unilateral: false, avoid: ["lowback"], muscles: ["back","glutes","hamstrings"], cue: "Deadlift into a shrug and full extension — no catch, all power." , hidden: true },
  { name: "Push jerk", family: "v_push", rank: 8, zone: "platform", pattern: "v_push", region: "full", exp: 3, impact: 1, unilateral: false, avoid: ["shoulder","lowback"], muscles: ["shoulders","glutes","arms"], cue: "Dip, drive, re-dip under the bar, lock it out overhead." },
  { name: "Barbell high pull", family: "olympic", rank: 2, zone: "platform", pattern: "olympic", region: "full", exp: 2, impact: 1, unilateral: false, avoid: ["lowback","shoulder"], muscles: ["back","shoulders","glutes"], cue: "Explode the hips, elbows high and outside." , hidden: true },

  /* ---------------- ADDED: PLYO / ATHLETIC depth ---------------- */
  { name: "Depth jump", family: "power_plyometric", rank: 15, zone: "crossfit", pattern: "plyo", region: "lower", exp: 3, impact: 3, unilateral: false, avoid: ["knee","hip","ankle"], muscles: ["quads","glutes"], cue: "Step off, land, rebound instantly — advanced reactive strength only." },
  { name: "Single-leg box jump", family: "power_plyometric", rank: 14, zone: "crossfit", pattern: "plyo", region: "lower", exp: 3, impact: 3, unilateral: true, avoid: ["knee","hip","ankle"], muscles: ["quads","glutes"], cue: "Low box, soft landing, step down — demands real control." },
  { name: "Lateral line hops", family: "power_plyometric", rank: 2, zone: "bodyweight", pattern: "plyo", region: "lower", exp: 2, impact: 3, unilateral: false, avoid: ["knee","ankle"], muscles: ["quads","calves"], cue: "Hop over a floor seam with quick ground contacts, quiet landings, and a tall posture." },
  { name: "Med ball overhead throw", family: "power_plyometric", rank: 6, zone: "crossfit", pattern: "plyo", region: "full", exp: 2, impact: 2, unilateral: false, avoid: ["shoulder","lowback"], muscles: ["core","shoulders","glutes"], cue: "Full-body extension, throw for distance." },
  { name: "Trap bar jump", family: "power_plyometric", rank: 13, zone: "platform", pattern: "plyo", region: "lower", exp: 3, impact: 3, unilateral: false, avoid: ["knee","ankle","lowback"], muscles: ["quads","glutes","hamstrings"], cue: "Light load, jump for height, land soft — loaded power." },
  { name: "Sprint", family: "conditioning", rank: 14, zone: "cardio", pattern: "conditioning", region: "cardio", exp: 2, impact: 3, unilateral: false, avoid: ["knee","hip","ankle"], muscles: ["hamstrings","glutes","quads"], cue: "Full effort, then full recovery. End the set when speed drops off.", demands: ["impact","ballistic","sustained_cardio","standing"], safetyReviewed: true, safetyMetadataVersion: 2, safetySource: "inferred", bankId: "sprint", bankSource: "built-in" },

  /* ---------------- ADDED: CONDITIONING depth ---------------- */
  { name: "Kettlebell snatch", family: "power_plyometric", rank: 12, zone: "crossfit", pattern: "conditioning", region: "full", exp: 3, impact: 1, unilateral: true, avoid: ["shoulder","lowback","wrist"], muscles: ["glutes","shoulders","back"], cue: "Hips drive it, punch through at the top — no banging the wrist." , hidden: true },
  { name: "Devil's press", family: "conditioning", rank: 15, zone: "crossfit", pattern: "conditioning", region: "full", exp: 3, impact: 2, unilateral: false, avoid: ["shoulder","lowback","wrist","knee"], muscles: ["shoulders","glutes","core"], cue: "Burpee into a double-dumbbell snatch — pace it or die." },
  { name: "Bear crawl", family: "conditioning", rank: 16, zone: "bodyweight", pattern: "conditioning", region: "full", exp: 1, impact: 1, unilateral: false, avoid: ["wrist","shoulder"], muscles: ["core","shoulders"], cue: "Knees an inch off the floor, hips low, move controlled." },

  /* ---------------- ADDED: TARGETED WARM-UP / PREP ---------------- */
  { name: "Scapular push-up", family: "activation", rank: 6, zone: "bodyweight", pattern: "mobility", region: "mobility", exp: 1, impact: 0, unilateral: false, avoid: ["wrist"], muscles: [], preps: ["upper","push"], cue: "Plank position, protract and retract the shoulder blades \u2014 wakes up the serratus." },
  { name: "Scapular pull-up", family: "activation", rank: 8, zone: "rack", pattern: "mobility", region: "mobility", exp: 1, impact: 0, unilateral: false, avoid: ["shoulder"], muscles: [], preps: ["upper","pull"], cue: "Dead hang, pull the shoulders down without bending the elbows." },
  { name: "Wall slides", family: "mobility", rank: 11, zone: "bodyweight", pattern: "mobility", region: "mobility", exp: 1, impact: 0, unilateral: false, avoid: [], muscles: [], preps: ["upper","push"], cue: "Back to the wall, slide the arms overhead \u2014 opens the shoulders for pressing." },
  { name: "Face pull (band, light)", family: "activation", rank: 2, zone: "cable", pattern: "mobility", region: "mobility", exp: 1, impact: 0, unilateral: false, avoid: [], muscles: [], preps: ["upper","pull","push"], cue: "High reps, light band \u2014 primes the rear delts and rotator cuff." },
  { name: "Push-up plus", family: "activation", rank: 5, zone: "bodyweight", pattern: "mobility", region: "mobility", exp: 1, impact: 0, unilateral: false, avoid: ["wrist","shoulder"], muscles: [], preps: ["upper","push"], cue: "Push-up, then press the upper back to the ceiling at the top." },
  { name: "Lat stretch on rack", family: "mobility", rank: 12, zone: "rack", pattern: "mobility", region: "mobility", exp: 1, impact: 0, unilateral: true, avoid: [], muscles: [], preps: ["upper","pull"], cue: "Grip low, sink the hips back, breathe into the lat." },
  { name: "Banded shoulder external rotation", family: "activation", rank: 4, zone: "cable", pattern: "mobility", region: "mobility", exp: 1, impact: 0, unilateral: true, avoid: [], muscles: [], preps: ["upper","push","pull"], cue: "Elbow at the side, rotate out slowly \u2014 rotator cuff prep." },
  // Added for post-rehab shoulder programming. External rotation shipped without its pair,
  // which is how it is actually prescribed. Named the way a trainer searches: aliases carry
  // the gym shorthand, since the search reads that field.
  { name: "Banded shoulder internal rotation", family: "activation", rank: 4, zone: "cable", pattern: "mobility", region: "mobility", exp: 1, impact: 0, unilateral: true, avoid: [], muscles: [], preps: ["upper","push","pull"], aliases: ["internal rotation","IR","subscap"], cue: "Elbow pinned to the side, rotate the forearm across the body \u2014 the pair to external rotation." },
  { name: "Side-lying external rotation", family: "activation", rank: 5, zone: "dumbbell", pattern: "mobility", region: "mobility", exp: 1, impact: 0, unilateral: true, avoid: [], muscles: [], preps: ["upper","push","pull"], aliases: ["side lying ER"], demands: ["prone","floor_transfer"], cue: "Lie on the opposite side, elbow tight to the ribs, lift the hand toward the ceiling. Light weight only." },
  { name: "Tea cups", family: "mobility", rank: 9, zone: "dumbbell", pattern: "mobility", region: "mobility", exp: 2, impact: 0, unilateral: true, avoid: [], muscles: [], preps: ["upper","push"], aliases: ["teacups","tea cup","waiter walk circles"], cue: "Hold light weight flat like a cup of tea and circle it around the shoulder without spilling. Loaded end-range control." },
  { name: "Arm circles", family: "mobility", rank: 1, zone: "bodyweight", pattern: "mobility", region: "mobility", exp: 1, impact: 0, unilateral: false, avoid: [], muscles: [], preps: ["upper","general"], cue: "Small to large, both directions \u2014 simple blood flow to the shoulders." },
  { name: "Bodyweight squat (easy)", family: "squat", rank: 7, zone: "bodyweight", pattern: "mobility", region: "mobility", exp: 1, impact: 0, unilateral: false, avoid: ["knee"], muscles: [], preps: ["lower"], cue: "Slow reps to full depth, grooving the pattern before you load it." },
  { name: "Walking knee hug", family: "mobility", rank: 5, zone: "bodyweight", pattern: "mobility", region: "mobility", exp: 1, impact: 0, unilateral: true, avoid: [], muscles: [], preps: ["lower"], cue: "Hug the knee, rise to the toe \u2014 dynamic hip and glute prep." },
  { name: "Monster walk (band)", family: "activation", rank: 3, zone: "cable", pattern: "mobility", region: "mobility", exp: 1, impact: 0, unilateral: false, avoid: [], muscles: [], preps: ["lower"], cue: "Band above the knees, step wide \u2014 fires the glute medius." },
  { name: "Hip airplane", family: "mobility", rank: 15, zone: "bodyweight", pattern: "mobility", region: "mobility", exp: 2, impact: 0, unilateral: true, avoid: [], muscles: [], preps: ["lower"], cue: "Balance on one leg, rotate the hip open and closed \u2014 demanding control." },
  { name: "Jump rope (easy)", family: "warmup_cardio", rank: 7, zone: "bodyweight", pattern: "mobility", region: "cardio", exp: 1, impact: 1, unilateral: false, avoid: ["ankle","knee"], muscles: [], preps: ["general","lower"], cue: "Two minutes easy to raise core temperature." },
  { name: "Elliptical easy", family: "warmup_cardio", rank: 2, zone: "cardio", pattern: "mobility", region: "cardio", exp: 1, impact: 0, unilateral: false, avoid: [], muscles: [], preps: ["general","lower","upper"], cue: "Low resistance, drive with the arms too \u2014 zero-impact warm-up." },
  { name: "Ski erg easy", family: "warmup_cardio", rank: 6, zone: "cardio", pattern: "mobility", region: "cardio", exp: 1, impact: 0, unilateral: false, avoid: ["shoulder"], muscles: [], preps: ["general","upper"], cue: "Light strokes to warm the lats and shoulders." },
  { name: "Dead bug (slow)", family: "activation", rank: 7, zone: "bodyweight", pattern: "mobility", region: "mobility", exp: 1, impact: 0, unilateral: true, avoid: [], muscles: [], preps: ["core","general"], cue: "Ribs down, opposite arm and leg \u2014 sets the brace before you lift." },

  /* ---------------- ADDED: PUMP / BURNOUT FINISHERS ----------------
     These exist to DESTROY the target muscle at the end of a session.
     finisher:"pump" marks them as burnout-grade. `superset` marks whether the
     movement can be paired without hogging stations (see SUPERSET_ZONES). */
  { name: "Dumbbell chest fly", family: "chest_isolation", rank: 3, zone: "dumbbell", pattern: "h_push", region: "push", exp: 1, impact: 0, unilateral: false, avoid: ["shoulder"], muscles: ["chest"], cue: "Soft elbows, wide arc, stretch without rolling the shoulders forward.", demands: ["shoulder_extension","high_abdominal_pressure","loaded_grip","standing"], safetyReviewed: true, safetyMetadataVersion: 2, safetySource: "inferred", bankId: "dumbbell-chest-fly", bankSource: "built-in" },
  { name: "Pec deck", family: "chest_isolation", rank: 1, zone: "machine", pattern: "h_push", region: "push", exp: 2, impact: 0, unilateral: false, avoid: ["shoulder"], muscles: ["chest"], cue: "Elbows at chest height, squeeze the handles together, slow on the way back.", demands: ["high_abdominal_pressure","loaded_grip","seated"], safetyReviewed: true, safetyMetadataVersion: 2, safetySource: "inferred", bankId: "pec-deck", bankSource: "built-in" },

  { name: "Plate front raise hold", family: "shoulder_scapular", rank: 8, zone: "dumbbell", pattern: "v_push", region: "push", exp: 1, impact: 0, unilateral: false, avoid: ["shoulder"], muscles: ["shoulders"], finisher: true, ftype: "pump", fmuscles: ["shoulders"], cue: "Raise to eye level and hold until the arms give out." },


  { name: "Bodyweight tricep extension", family: "triceps", rank: 5, zone: "rack", pattern: "h_push", region: "push", exp: 2, impact: 0, unilateral: false, avoid: ["elbow","shoulder"], muscles: ["arms"], cue: "Bar at hip height, bend only at the elbows, body in one line.", demands: ["high_abdominal_pressure","loaded_grip","standing"], safetyReviewed: true, safetyMetadataVersion: 2, safetySource: "inferred", bankId: "bodyweight-tricep-extension", bankSource: "built-in" },

  { name: "Wall sit", family: "squat", rank: 8, zone: "bodyweight", pattern: "squat", region: "lower", exp: 1, impact: 0, unilateral: false, avoid: ["knee"], muscles: ["quads"], finisher: true, ftype: "pump", fmuscles: ["quads"], cue: "Thighs parallel, hold until the legs shake and give out." },

  { name: "Frog pump", family: "glute", rank: 7, zone: "bodyweight", pattern: "hinge", region: "lower", exp: 1, impact: 0, unilateral: false, avoid: [], muscles: ["glutes"], finisher: true, ftype: "pump", fmuscles: ["glutes"], cue: "Soles together, knees out, pump the hips \u2014 pure glute burn." },
  { name: "Banded glute kickback", family: "glute", rank: 3, zone: "cable", pattern: "hinge", region: "lower", exp: 1, impact: 0, unilateral: true, avoid: [], muscles: ["glutes"], finisher: true, ftype: "pump", fmuscles: ["glutes"], cue: "High reps per side, squeeze at full extension until it burns." },
  { name: "Glute bridge hold", family: "glute", rank: 1, zone: "bodyweight", pattern: "hinge", region: "lower", exp: 1, impact: 0, unilateral: false, avoid: [], muscles: ["glutes"], finisher: true, ftype: "pump", fmuscles: ["glutes"], cue: "Drive up and hold at lockout until the glutes cramp." },
  { name: "Cable kickback", family: "glute", rank: 5, zone: "cable", pattern: "hinge", region: "lower", exp: 1, impact: 0, unilateral: true, avoid: [], muscles: ["glutes"], cue: "Stand tall, drive the heel back, squeeze without arching the low back.", demands: ["hip_hinge","single_leg","balance_challenge","high_abdominal_pressure","loaded_grip","standing"], safetyReviewed: true, safetyMetadataVersion: 2, safetySource: "inferred", bankId: "cable-kickback", bankSource: "built-in" },




  /* metabolic + core finishers */
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
  // "Rotation" in a name is not always spinal. The library's one rotator-cuff drill,
  // "Banded shoulder external rotation", is a seated mobility movement with no spinal
  // component - this name match was excluding it from every low-back, thoracic and
  // no-rotation client. Joint-named rotations are exempt; an explicit rotation PATTERN
  // still counts, because that is a deliberate trunk classification.
  // The joint word is not always in the name - "Side-lying external rotation" has none of
  // them - so the phrase itself counts too: internal/external rotation is a joint action,
  // never a trunk one.
  const jointRotation = /\b(shoulder|rotator|cuff|hip|ankle|wrist|neck|arm)\b/.test(name)
    || /\b(internal|external)\s+rotation\b/.test(name);
  if (pattern === "rotation" || (!jointRotation && /\b(rotation|wood.?chop|russian twist)\b/.test(name))) demands.add("spinal_rotation");
  if (pattern === "carry") { demands.add("loaded_carry"); demands.add("loaded_grip"); demands.add("axial_load"); }
  if (pattern === "plyo" || pattern === "olympic") { demands.add("ballistic"); demands.add("impact"); demands.add("balance_challenge"); demands.add("high_abdominal_pressure"); }
  // Unilateral on an ARM movement means one arm, not one leg. Tagging a seated cuff drill or
  // a landmine press as a single-leg balance challenge excluded them for every client with a
  // balance or lower-limb limitation, which is the opposite of what those movements are for.
  const upperOnly = ["push","pull"].includes(item.region)
    || (Array.isArray(item.preps) && item.preps.length && !item.preps.includes("lower") && !item.preps.includes("general"));
  if (item.unilateral && !upperOnly) { demands.add("single_leg"); demands.add("balance_challenge"); }
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


/* ============================================================
   MODIFIERS
   A modifier is a way of running a movement, not a movement.
   The library holds base movements only; the generator expands
   base + modifier at runtime, so any exercise can take any
   modifier that suits it instead of the handful that used to
   have a hand-written row.
     key        stable id stored on a saved workout
     label      what the trainer sees
     suffix     appended to the base name for display
     finisher   true = only ever fills the finisher slot
     ftype      finisher family: pump | metcon | core | gentle
     auto       true = the generator may pick it on its own
     fits(ex)   which base movements it suits
   ============================================================ */
const ISO_FAMILIES = ["biceps","triceps","chest_isolation","shoulder_scapular","lat_accessory",
                      "hamstring_curl","knee_extension","calf","glute"];
const COMPOUND_FAMILIES = ["squat","hinge","h_push","v_push","h_pull","v_pull","unilateral_lower"];
const NO_MODIFIER_FAMILIES = ["mobility","activation","warmup_cardio","olympic","power_plyometric","agility","rotation"];
const SPRINTABLE = ["Rower","Assault bike","Ski erg","VersaClimber","Stationary bike","Treadmill","Sprint",
                    "HIITMill forward drive","HIITMill backward drive"];

function modLoadable(ex) { return ["machine","cable","dumbbell"].includes(ex.zone); }
function modAccessory(ex) { return ISO_FAMILIES.includes(ex.family) || COMPOUND_FAMILIES.includes(ex.family); }
function modBlocked(ex) { return NO_MODIFIER_FAMILIES.includes(ex.family) || ex.pattern === "mobility"; }

const MODIFIERS = [
  { key:"burnout", label:"Burnout", suffix:"burnout", finisher:true, ftype:"pump", auto:true,
    rx:{ sets:"1", reps:"to failure, drop, repeat", rest:"none until done" },
    cue:"Go to failure, cut the load, straight back in. Stop when the rep quality goes.",
    fits:(ex) => !modBlocked(ex) && modAccessory(ex)
      && ["machine","cable","dumbbell","bodyweight","crossfit"].includes(ex.zone) },

  { key:"dropset", label:"Drop set", suffix:"drop set", finisher:true, ftype:"pump", auto:true,
    rx:{ sets:"1", reps:"3 drops, no rest", rest:"none between drops" },
    cue:"Failure, strip roughly a third of the load, go again. Three times through.",
    fits:(ex) => !modBlocked(ex) && modAccessory(ex) && modLoadable(ex) },

  { key:"21s", label:"21s", suffix:"21s", finisher:true, ftype:"pump", auto:true,
    rx:{ sets:"1–2", reps:"7 bottom, 7 top, 7 full", rest:"90 sec" },
    cue:"Seven bottom halves, seven top halves, seven full reps. Load light.",
    fits:(ex) => !modBlocked(ex) && ISO_FAMILIES.includes(ex.family) && ["cable","dumbbell"].includes(ex.zone) },

  { key:"tofailure", label:"To failure", suffix:"to failure", finisher:true, ftype:"pump", auto:true,
    rx:{ sets:"1", reps:"max", rest:"—" },
    cue:"One set, every rep you own, clean form only.",
    fits:(ex) => !modBlocked(ex) && ex.zone === "bodyweight" && modAccessory(ex) },

  { key:"finisher", label:"Finisher", suffix:"finisher", finisher:true, ftype:"metcon", auto:true,
    rx:{ sets:"1", reps:"3–5 min all-out", rest:"—" },
    cue:"One hard push to close the session. Effort, not technique work.",
    fits:(ex) => ex.family === "conditioning" || ex.family === "carry" || ex.zone === "crossfit" },

  { key:"circuit", label:"Circuit", suffix:"circuit", finisher:true, ftype:"core", auto:true,
    rx:{ sets:"2–3 rounds", reps:"30–45 sec each", rest:"30 sec between rounds" },
    cue:"Back to back with no rest inside the round.",
    fits:(ex) => ["core","conditioning","carry"].includes(ex.family) },

  { key:"intervals", label:"Intervals", suffix:"intervals", finisher:false, auto:true,
    rx:{ sets:"6–10", reps:"30 sec hard / 60 sec easy", rest:"built in" },
    cue:"Hard, then easy. The last round should match the first.",
    fits:(ex) => ["conditioning","core"].includes(ex.family) },

  { key:"sprints", label:"Sprints", suffix:"sprints", finisher:false, auto:true,
    rx:{ sets:"6–8", reps:"10–15 sec max", rest:"full, 60–90 sec" },
    cue:"Max effort, full recovery. End the set when speed drops.",
    fits:(ex) => ex.family === "conditioning" && SPRINTABLE.includes(ex.name) },

  { key:"tempo", label:"Tempo", suffix:"tempo", finisher:false, auto:false,
    rx:{ sets:"3–4", reps:"6–8 @ 3-1-1", rest:"2 min" },
    cue:"Three seconds down, one second pause, normal speed up.",
    fits:(ex) => !modBlocked(ex) && COMPOUND_FAMILIES.includes(ex.family) },

  { key:"pause", label:"Pause", suffix:"pause", finisher:false, auto:false,
    rx:{ sets:"3–5", reps:"3–5", rest:"2–3 min" },
    cue:"Full stop at the hardest point, no bounce out of it.",
    fits:(ex) => !modBlocked(ex) && COMPOUND_FAMILIES.includes(ex.family) },

  { key:"isohold", label:"Iso hold", suffix:"iso hold", finisher:false, auto:false,
    rx:{ sets:"2–3", reps:"20–40 sec", rest:"60 sec" },
    cue:"Hold the hardest position and breathe. No sagging.",
    fits:(ex) => !modBlocked(ex) && (ISO_FAMILIES.includes(ex.family) || ex.family === "core") },
];

const MODIFIER_BY_KEY = MODIFIERS.reduce((map, mod) => { map[mod.key] = mod; return map; }, {});

// core work stays core even when it is run as a finisher
function modifierFinisherType(base, mod) {
  if (!mod.finisher) return null;
  if (base.family === "core" || base.pattern === "core") return "core";
  if (base.family === "conditioning" || base.zone === "crossfit" || base.family === "carry") return "metcon";
  return mod.ftype;
}
function modifiersFor(exercise) {
  if (!exercise) return [];
  return MODIFIERS.filter((mod) => { try { return mod.fits(exercise); } catch (err) { return false; } });
}
function applyModifier(base, modKey) {
  const mod = MODIFIER_BY_KEY[modKey]; if (!base || !mod) return base;
  const ftype = modifierFinisherType(base, mod);
  const out = Object.assign({}, base, {
    name: base.name + " " + mod.suffix,
    baseName: base.name, modifier: mod.key, modifierLabel: mod.label,
    cue: mod.cue, modRx: mod.rx,
  });
  if (mod.finisher) { out.finisher = true; out.ftype = ftype; out.fmuscles = (base.muscles || []).slice(); }
  return out;
}
// the generator only ever sees auto modifiers; tempo, pause and iso hold are trainer-applied
function expandWithModifiers(pool) {
  const out = pool.slice();
  pool.forEach((base) => {
    if (base.modifier) return;
    MODIFIERS.forEach((mod) => { if (mod.auto && mod.fits(base)) out.push(applyModifier(base, mod.key)); });
  });
  return out;
}

/* ============================================================
   LEGACY NAMES
   Workouts logged before modifiers became a field still name the
   old combined rows ("Bicep curl drop set", "Row intervals"). Map
   them onto base + modifier so client history and strength trends
   keep resolving instead of silently vanishing from progress.
   ============================================================ */
const LEGACY_EXERCISE_NAMES = {
  "Row intervals": {"base":"Rower","mod":"intervals"},
  "Rower cardio": {"base":"Rower"},
  "Rowing sprints": {"base":"Rower","mod":"sprints"},
  "Row sprint finisher": {"base":"Rower","mod":"finisher"},
  "Assault bike intervals": {"base":"Assault bike","mod":"intervals"},
  "Assault bike sprints": {"base":"Assault bike","mod":"sprints"},
  "Assault bike finisher": {"base":"Assault bike","mod":"finisher"},
  "Ski erg intervals": {"base":"Ski erg","mod":"intervals"},
  "Ski erg cardio": {"base":"Ski erg"},
  "Incline treadmill intervals": {"base":"Incline treadmill","mod":"intervals"},
  "Stair climber intervals": {"base":"Stair climber","mod":"intervals"},
  "Stair climber cardio": {"base":"Stair climber"},
  "Stationary bike intervals": {"base":"Stationary bike","mod":"intervals"},
  "Stationary bike cardio": {"base":"Stationary bike"},
  "Elliptical intervals": {"base":"Elliptical","mod":"intervals"},
  "Elliptical cardio": {"base":"Elliptical"},
  "VersaClimber intervals": {"base":"VersaClimber","mod":"intervals"},
  "VersaClimber cardio": {"base":"VersaClimber"},
  "VersaClimber finisher": {"base":"VersaClimber","mod":"finisher"},
  "Treadmill cardio": {"base":"Treadmill"},
  "HIITMill cardio": {"base":"HIITMill forward drive"},
  "HIITMill drive finisher": {"base":"HIITMill forward drive","mod":"finisher"},
  "Jump rope cardio": {"base":"Jump rope"},
  "Jump rope intervals": {"base":"Jump rope","mod":"intervals"},
  "Mountain climber intervals": {"base":"Mountain climber","mod":"intervals"},
  "Sprint intervals": {"base":"Sprint","mod":"intervals"},
  "Plank shoulder-tap intervals": {"base":"Plank shoulder tap","mod":"intervals"},
  "Dead-bug intervals": {"base":"Dead bug","mod":"intervals"},
  "Suitcase march intervals": {"base":"Single Arm farmer carry","mod":"intervals"},
  "Hollow-body march intervals": {"base":"Hollow-body march","mod":"intervals"},
  "Seated knee-tuck intervals": {"base":"Seated knee tuck","mod":"intervals"},
  "Pallof step-out intervals": {"base":"Pallof step-out","mod":"intervals"},
  "Farmer carry medley": {"base":"Farmer carry","mod":"circuit"},
  "Farmer carry finisher": {"base":"Farmer carry","mod":"finisher"},
  "Dumbbell chest fly burnout": {"base":"Dumbbell chest fly","mod":"burnout"},
  "Push-up to failure": {"base":"Push-up","mod":"tofailure"},
  "Pec deck drop set": {"base":"Pec deck","mod":"dropset"},
  "Cable fly 21s": {"base":"Cable chest fly","mod":"21s"},
  "Incline press burnout": {"base":"Incline dumbbell press","mod":"burnout"},
  "Lateral raise drop set": {"base":"Lateral raise","mod":"dropset"},
  "Cable lateral raise 21s": {"base":"Cable lateral raise","mod":"21s"},
  "Rear delt fly burnout": {"base":"Rear delt fly","mod":"burnout"},
  "Straight-arm pulldown burnout": {"base":"Straight-arm pulldown","mod":"burnout"},
  "Lat pulldown drop set": {"base":"Lat pulldown","mod":"dropset"},
  "Seated row 21s": {"base":"Seated cable row","mod":"21s"},
  "Chest-supported row burnout": {"base":"Chest-supported row","mod":"burnout"},
  "Face pull burnout": {"base":"Face pull","mod":"burnout"},
  "Bicep curl drop set": {"base":"Dumbbell curl","mod":"dropset"},
  "Cable curl 21s": {"base":"Cable curl","mod":"21s"},
  "Bicep 21s": {"base":"Dumbbell curl","mod":"21s"},
  "Triceps pushdown drop set": {"base":"Triceps pushdown","mod":"dropset"},
  "Bodyweight tricep extension to failure": {"base":"Bodyweight tricep extension","mod":"tofailure"},
  "Leg extension drop set": {"base":"Leg extension","mod":"dropset"},
  "Goblet squat burnout": {"base":"Goblet squat","mod":"burnout"},
  "Walking lunge burnout": {"base":"Walking lunge","mod":"burnout"},
  "Hamstring curl drop set": {"base":"Machine hamstring curl","mod":"dropset"},
  "Hip thrust burnout": {"base":"Hip thrust","mod":"burnout"},
  "Cable kickback burnout": {"base":"Cable kickback","mod":"burnout"},
  "Calf raise burnout": {"base":"Calf raise","mod":"burnout"},
  "Calf raise drop set": {"base":"Calf raise","mod":"dropset"},
  "Cable crunch drop set": {"base":"Cable crunch","mod":"dropset"},
  "Cable crunch burnout": {"base":"Cable crunch","mod":"burnout"},
  "Kettlebell swing finisher": {"base":"Kettlebell swing","mod":"finisher"},
  "Nordic curl burnout": {"base":"Nordic hamstring curl","mod":"burnout"},
  "Ab circuit finisher": {"base":"Front plank","mod":"circuit"},
  "Hanging leg raise burnout": {"base":"Hanging leg raise","mod":"burnout"},
  "Plank to failure": {"base":"Front plank","mod":"tofailure"},
  "Suitcase carry": {"base":"Single Arm farmer carry"},
  "Elliptical easy pace": {"base":"Elliptical easy"},};
function findExerciseByName(name) {
  if (!name) return null;
  const wanted = String(name).trim(), lower = wanted.toLowerCase();
  const direct = LIBRARY.find((ex) => ex.name.toLowerCase() === lower);
  if (direct) return direct;
  const legacy = LEGACY_EXERCISE_NAMES[wanted]
    || Object.keys(LEGACY_EXERCISE_NAMES).find((key) => key.toLowerCase() === lower);
  const mapped = typeof legacy === "string" ? LEGACY_EXERCISE_NAMES[legacy] : legacy;
  if (mapped) {
    const base = LIBRARY.find((ex) => ex.name === mapped.base);
    if (base) return mapped.mod ? applyModifier(base, mapped.mod) : base;
  }
  // anything else shaped "<base> <modifier>"
  for (const mod of MODIFIERS) {
    const tail = " " + mod.suffix.toLowerCase();
    if (lower.endsWith(tail)) {
      const base = LIBRARY.find((ex) => ex.name.toLowerCase() === lower.slice(0, -tail.length));
      if (base) return applyModifier(base, mod.key);
    }
  }
  return null;
}
