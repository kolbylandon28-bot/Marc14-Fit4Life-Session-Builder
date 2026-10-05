/* ---------- Artwork for each work area ----------
   Line drawings, not emoji. Every area gets a small glyph for its badge and a wider scene
   that sits faded behind the card. Areas are matched on their name as well as their key, so
   a gym that calls its pool "Natatorium" still gets water, and anything unrecognised falls
   back to a building rather than to nothing. */

const AREA_ART_MATCHERS = [
  ["pool", /pool|swim|aquatic|natator|dive|lifeguard/],
  ["gym", /gym|weight|fitness|strength|training floor|court/],
  ["equipment", /equip|checkout|check-out|rental|gear|locker|towel/],
  ["maintenance", /maint|facilit|custod|repair|grounds|janitor/],
  ["arena", /i-?cent|arena|stadium|center|centre|auditorium|track|field/]
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
  equipment: '<rect x="3" y="3.5" width="18" height="17" rx="1.6"/><path d="M3 9.2h18M3 14.9h18"/>'
      + '<circle cx="7.6" cy="6.4" r="1.5"/><circle cx="7.6" cy="12.1" r="1.5"/><path d="M13 11.4h5M13 17.1h5"/>',
  maintenance: '<g transform="rotate(-40 12 12)"><circle cx="5.6" cy="12" r="3.3"/><circle cx="5.6" cy="12" r="1.4"/>'
      + '<circle cx="18.6" cy="12" r="2.9"/><circle cx="18.6" cy="12" r="1.2"/>'
      + '<path d="M8.8 10.1h7M8.8 13.9h7"/></g>',
  arena: '<path d="M2.5 20.5h19"/><path d="M4 20.5v-7.2a8 8 0 0 1 16 0v7.2"/>'
      + '<path d="M8 20.5v-6.2a4 4 0 0 1 8 0v6.2"/><path d="M4 16.4h3.9M16.1 16.4H20"/>',
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
    + '<path d="M26 48h148v138H26z"/><path d="M26 94h148M26 140h148"/>'
    + '<circle cx="60" cy="72" r="17"/><path d="M43 72h34M60 55v34"/>'
    + '<circle cx="110" cy="74" r="15"/><circle cx="148" cy="76" r="13"/>'
    + '<path d="M44 118h36v18H44zM92 118h36v18H92zM140 122h24v14h-24z"/>'
    + '<path d="M44 164h118"/>'
    + '<path d="M196 128h108v58H196z"/><path d="M196 146h108"/>'
    + '<path d="M222 60h26v34h-26z" rx="3"/><path d="M228 60V48h14v12"/><path d="M228 72h14M228 82h14"/>'
    + '<ellipse cx="282" cy="68" rx="15" ry="20"/><path d="M282 88v26"/><path d="M270 60h24M270 72h24M282 50v38"/>',
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
  arena:
      '<path d="M6 186h308"/>'
    + '<path d="M22 186v-50a138 70 0 0 1 276 0v50"/>'
    + '<path d="M22 136h276"/>'
    + '<path d="M58 186v-44M94 186v-44M130 186v-44M190 186v-44M226 186v-44M262 186v-44"/>'
    + '<path d="M146 186v-38a14 14 0 0 1 28 0v38"/>'
    + '<path d="M160 106a70 70 0 0 1 0-1"/>'
    + '<path d="M90 112h140M106 96h108"/>'
    + '<path d="M300 186V28"/><path d="M300 32h30v18h-30z"/>',
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
