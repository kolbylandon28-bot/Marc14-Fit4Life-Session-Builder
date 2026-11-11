/* ---------- training locations ----------
   A client does not have "equipment". They have PLACES, and each place has its own
   equipment: a commercial gym with everything, a garage with two dumbbells, a hotel room
   with nothing. The generator has to filter to the place they are standing in today.

   profile.zones stays as a live MIRROR of the active location, because nine other files
   read it. Locations are the source of truth; the mirror keeps everything else working. */

const LOCATION_KINDS = {
  gym:    { label: "Gym",        hint: "A commercial gym or a facility you belong to" },
  home:   { label: "Home",       hint: "Whatever you actually own" },
  travel: { label: "Travelling", hint: "Hotels, family, anywhere temporary" },
  outdoor:{ label: "Outdoors",   hint: "A park, a track, a hill" },
  other:  { label: "Somewhere else", hint: "" }
};

const ALL_ZONE_KEYS = ["bodyweight","dumbbell","kettlebell","band","rack","machine",
  "cable","cardio","platform","crossfit","household","outdoor"];

function locationId() {
  return "loc-" + Date.now().toString(36) + "-" + Math.floor(Math.random() * 1e6).toString(36);
}

function normalizeZoneList(zones) {
  if (!Array.isArray(zones)) return [];
  const seen = new Set(), out = [];
  zones.forEach((zone) => {
    const key = String(zone || "").trim();
    if (!key || seen.has(key) || !ALL_ZONE_KEYS.includes(key)) return;
    seen.add(key); out.push(key);
  });
  return out;
}

function makeLocation(input) {
  const raw = input || {};
  const kind = Object.prototype.hasOwnProperty.call(LOCATION_KINDS, raw.kind) ? raw.kind : "other";
  return {
    id: raw.id || locationId(),
    name: String(raw.name || LOCATION_KINDS[kind].label).trim().slice(0, 60),
    kind,
    zones: normalizeZoneList(raw.zones),
    notes: String(raw.notes || "").trim().slice(0, 300),
    /* "org" means the branch supplied it - a gym's own floor. The client may pick it but
       may not edit it, because a member deleting the squat racks from the gym's list would
       quietly give themselves worse programming. */
    source: raw.source === "org" ? "org" : "client",
    updatedAt: raw.updatedAt || new Date().toISOString()
  };
}

function locationIsEditable(location) {
  return Boolean(location) && location.source !== "org";
}

/* The branch's own floor, where the branch HAS a floor. A gym knows its equipment; an
   employer whose people train in seven different places does not, and gets nothing here. */
function orgLocationFor(orgName, orgZones) {
  const zones = normalizeZoneList(orgZones);
  if (!zones.length) return null;
  return makeLocation({
    id: "loc-org",
    name: String(orgName || "Your gym").trim().slice(0, 60),
    kind: "gym",
    zones,
    source: "org"
  });
}

/* Every profile predates this, so each one is migrated on read rather than in a batch.
   An existing single zone list becomes one location and nothing visibly changes. */
function normalizeLocations(profile, context) {
  const ctx = context || {};
  const existing = Array.isArray(profile && profile.locations) ? profile.locations.map(makeLocation) : [];
  const out = existing.filter((loc) => loc.source !== "org");

  const org = orgLocationFor(ctx.orgName, ctx.orgZones);
  if (org) out.unshift(org);

  if (!out.length) {
    const legacy = normalizeZoneList(profile && profile.zones);
    if (legacy.length) {
      out.push(makeLocation({ name: ctx.orgName || "Where I train", kind: "gym", zones: legacy }));
    }
  }
  return out;
}

function activeLocation(profile, context) {
  const list = normalizeLocations(profile, context);
  if (!list.length) return null;
  const wanted = profile && profile.activeLocationId;
  return list.find((loc) => loc.id === wanted) || list[0];
}

/* The mirror. Everything downstream still reads profile.zones; this is the only place that
   decides what it contains. */
function applyActiveLocation(profile, context) {
  const list = normalizeLocations(profile, context);
  const active = activeLocation(profile, context);
  return {
    ...profile,
    locations: list,
    activeLocationId: active ? active.id : "",
    zones: active ? [...active.zones] : [],
    equipmentNotes: active && active.notes ? active.notes : (profile && profile.equipmentNotes) || ""
  };
}

/* Declaring nothing used to hand over the ENTIRE library, barbells included - the worst
   possible failure, because the person who skipped the question is exactly the person who
   should not be given a loaded bar. A branch with its own floor can still fall back to it;
   a branch without one has nothing safe to assume. */
function generationBlockedReason(profile, context) {
  const ctx = context || {};
  const list = normalizeLocations(profile, ctx);
  if (!list.length) {
    return ctx.orgHasFloor
      ? ""
      : "Add where you train before building a workout, so the plan only uses equipment you actually have.";
  }
  const active = activeLocation(profile, ctx);
  if (!active || !active.zones.length) {
    return ctx.orgHasFloor
      ? ""
      : "Tick what is available at " + ((active && active.name) || "this location") + " before building a workout.";
  }
  return "";
}

function locationSummary(location) {
  if (!location) return "No location";
  const count = location.zones.length;
  return location.name + " · " + (count ? count + (count === 1 ? " equipment type" : " equipment types") : "nothing ticked yet");
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { LOCATION_KINDS, ALL_ZONE_KEYS, makeLocation, normalizeZoneList, normalizeLocations,
    activeLocation, applyActiveLocation, generationBlockedReason, locationIsEditable, orgLocationFor, locationSummary };
}
