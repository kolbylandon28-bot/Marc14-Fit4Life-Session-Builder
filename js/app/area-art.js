/* ---------- Artwork for each work area ----------
   Line drawings, not emoji. Every area gets a small glyph for its badge and a wider scene
   that sits faded behind the card. Areas are matched on their name as well as their key, so
   a gym that calls its pool "Natatorium" still gets water, and anything unrecognised falls
   back to a building rather than to nothing. */

const AREA_ART_MATCHERS = [
  ["pool", /pool|swim|aquatic|natator|dive|lifeguard/],
  ["gym", /gym|weight|fitness|strength|training floor/],
  ["equipment", /equip|checkout|check-out|rental|gear|locker|towel/],
  ["maintenance", /maint|facilit|custod|repair|grounds|janitor/],
  ["court", /i-?cent|arena|stadium|center|centre|auditorium|court|gymnasium|track|field/]
];

function areaArtKey(key, name) {
  const hay = String(key || "") + " " + String(name || "");
  const match = AREA_ART_MATCHERS.find(([, pattern]) => pattern.test(hay.toLowerCase()));
  return match ? match[0] : "default";
}

/* Each glyph draws inside 0 0 24 24 and inherits colour from the badge. */
const AREA_GLYPHS = {
  pool: '<path d="M2 16.5c1.6 0 1.6 1.2 3.2 1.2s1.6-1.2 3.2-1.2 1.6 1.2 3.2 1.2 1.6-1.2 3.2-1.2 1.6 1.2 3.2 1.2 1.6-1.2 3.2-1.2"/>'
      + '<path d="M2 20.5c1.6 0 1.6 1.2 3.2 1.2s1.6-1.2 3.2-1.2 1.6 1.2 3.2 1.2 1.6-1.2 3.2-1.2 1.6 1.2 3.2 1.2 1.6-1.2 3.2-1.2"/>'
      + '<path d="M7 16V5.4A2.4 2.4 0 0 1 9.4 3h.2A2.4 2.4 0 0 1 12 5.4"/>'
      + '<path d="M16 16V5.4A2.4 2.4 0 0 1 18.4 3h.2A2.4 2.4 0 0 1 21 5.4"/>'
      + '<path d="M7 8.5h9M7 12.5h9"/>',
  gym: '<path d="M3 9v6M6 7v10M18 7v10M21 9v6"/><path d="M6 12h12"/>',
  equipment: '<rect x="2.4" y="4" width="12" height="8.4" rx="1.1"/><path d="M8.4 12.4v2.1M5.6 14.5h5.6"/>'
      + '<rect x="16.6" y="4" width="5" height="16.5" rx="1.1"/><path d="M16.6 9.5h5M16.6 15h5"/>'
      + '<path d="M18.6 6.7h1M18.6 12.2h1M18.6 17.7h1"/><path d="M2.4 20.5h11.4"/>',
  maintenance: '<g transform="rotate(-40 12 12)"><circle cx="5.6" cy="12" r="3.3"/><circle cx="5.6" cy="12" r="1.4"/>'
      + '<circle cx="18.6" cy="12" r="2.9"/><circle cx="18.6" cy="12" r="1.2"/>'
      + '<path d="M8.8 10.1h7M8.8 13.9h7"/></g>',
  court: '<rect x="2.2" y="5.2" width="19.6" height="13.6" rx="1.4"/><path d="M12 5.2v13.6"/>'
      + '<circle cx="12" cy="12" r="2.9"/>'
      + '<path d="M2.2 8.9h4.1v6.2H2.2M21.8 8.9h-4.1v6.2h4.1"/>',
  default: '<path d="M3 20.5h18"/><path d="M5 20.5V6.2L12 3l7 3.2v14.3"/><path d="M9.6 20.5v-5.1h4.8v5.1"/><path d="M9.6 9.3h1.4M13 9.3h1.4M9.6 12.3h1.4M13 12.3h1.4"/>'
};

/* Each scene draws inside 0 0 320 200 and sits behind the card at low opacity. */
const AREA_SCENES = {
  pool:
      '<path d="M18 72h284v112H18z" rx="6"/>'
    + '<path d="M18 72c14 0 14 9 28 9s14-9 28-9 14 9 28 9 14-9 28-9 14 9 28 9 14-9 28-9 14 9 28 9 14-9 28-9 14 9 28 9"/>'
    + '<path d="M18 104h284M18 134h284M18 164h284" stroke-dasharray="13 9"/>'
    + '<path d="M24 72V48h40v24"/><path d="M24 56h40"/>'
    + '<path d="M262 72V42M286 72V42"/><path d="M262 50h24M262 60h24M262 70h24"/>'
    + '<circle cx="160" cy="36" r="24"/><circle cx="160" cy="36" r="11"/>'
    + '<path d="M160 12v13M160 47v13M136 36h13M171 36h13"/>',
  gym:
      '<path d="M10 186h300"/>'
    + '<path d="M66 186V36M254 186V36"/>'
    + '<path d="M66 54h12M66 70h12M66 86h12M66 102h12M242 54h12M242 70h12M242 86h12M242 102h12"/>'
    + '<path d="M34 78h252"/>'
    + '<path d="M44 58v40M56 50v56M264 50v56M276 58v40"/>'
    + '<path d="M118 150h84v13h-84z"/><path d="M126 163v23M194 163v23"/><path d="M160 150v-9"/>'
    + '<path d="M140 136h40"/><path d="M144 130v12M176 130v12"/>',
  equipment:
      '<path d="M10 186h300"/>'
    + '<path d="M62 54h84v56H62z"/><path d="M72 64h64v36H72z"/>'
    + '<path d="M104 110v12"/><path d="M94 122h20l8 6H86z"/>'
    + '<path d="M34 128h176v10H34z"/>'
    + '<path d="M44 138v48"/><path d="M154 138h50v48h-50z"/>'
    + '<path d="M154 154h50M154 170h50"/><path d="M170 146h18M170 162h18M170 178h18"/>'
    + '<path d="M150 118h50v10h-50z"/>'
    + '<path d="M220 78h48v108h-48z"/><path d="M220 105h48M220 132h48M220 159h48"/>'
    + '<path d="M236 91h16M236 118h16M236 145h16M236 172h16"/>'
    + '<path d="M278 120h34v66h-34z"/><path d="M278 153h34"/><path d="M288 136h14M288 169h14"/>',
  maintenance:
      '<path d="M10 186h300"/>'
    + '<path d="M36 186 72 56M62 186 98 56"/>'
    + '<path d="M42.5 162.6h26M49.7 136.6h26M56.9 110.6h26M64.1 84.6h26"/>'
    + '<path d="M124 136h112v50H124z"/><path d="M124 154h112"/>'
    + '<path d="M152 136v-10a7 7 0 0 1 7-7h42a7 7 0 0 1 7 7v10"/>'
    + '<path d="M170 154h20v13h-20z"/>'
    + '<circle cx="186" cy="74" r="17"/><circle cx="186" cy="74" r="8"/>'
    + '<circle cx="282" cy="74" r="14"/><circle cx="282" cy="74" r="6.5"/>'
    + '<path d="M202 67h66M202 81h66"/>',
  court:
      '<rect x="16" y="28" width="288" height="152" rx="3"/>'
    + '<path d="M160 28v152"/>'
    + '<circle cx="160" cy="104" r="26"/><circle cx="160" cy="104" r="9"/>'
    + '<path d="M16 80h58v48H16"/><circle cx="74" cy="104" r="18"/>'
    + '<path d="M304 80h-58v48h58"/><circle cx="246" cy="104" r="18"/>'
    + '<path d="M16 37h42a72 72 0 0 1 0 134H16"/>'
    + '<path d="M304 37h-42a72 72 0 0 0 0 134h42"/>'
    + '<path d="M27 94v20M293 94v20"/><circle cx="33" cy="104" r="5"/><circle cx="287" cy="104" r="5"/>',
  default:
      '<path d="M10 186h300"/>'
    + '<path d="M56 186V66l84-38 84 38v120"/>'
    + '<path d="M122 186v-46h36v46"/>'
    + '<path d="M84 90h24v22H84zM172 90h24v22h-24zM84 128h24v22H84zM172 128h24v22h-24z"/>'
    + '<path d="M244 186v-74h52v74"/><path d="M256 126h12v14h-12zM276 126h12v14h-12zM256 152h12v14h-12zM276 152h12v14h-12z"/>'
};

const areaGlyphSvg = (key, name) =>
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">'
  + (AREA_GLYPHS[areaArtKey(key, name)] || AREA_GLYPHS.default) + '</svg>';

const areaSceneSvg = (key, name) =>
  '<svg class="area-art" viewBox="0 0 320 200" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">'
  + (AREA_SCENES[areaArtKey(key, name)] || AREA_SCENES.default) + '</svg>';

if (typeof module !== "undefined" && module.exports) {
  module.exports = { areaArtKey, areaGlyphSvg, areaSceneSvg, AREA_GLYPHS, AREA_SCENES };
}
