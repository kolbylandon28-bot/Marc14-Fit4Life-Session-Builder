const crypto = require("crypto");
/* Receives the volunteer sign-up grid from the sheet's own Apps Script and replaces the
   mirror in Supabase. The sheet stays the source of truth; nothing here writes back to it.
   Only first names ever arrive - the script trims them at the sheet, so surnames never
   leave the document Hannah owns. */

function bad(response, status, message) {
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  return response.status(status).json({ ok: false, error: message });
}

module.exports = async function volunteerSync(request, response) {
  response.setHeader("Cache-Control", "no-store");
  if (request.method !== "POST") return bad(response, 405, "POST only");

  const expected = process.env.VOLUNTEER_SYNC_SECRET || "";
  const offered = request.headers["x-fit4life-secret"] || "";
  if (!expected) return bad(response, 503, "VOLUNTEER_SYNC_SECRET is not set on this deployment.");
  // Constant time, so the endpoint cannot be guessed one character at a time.
  const offeredBuffer = Buffer.from(String(offered));
  const expectedBuffer = Buffer.from(String(expected));
  const matches = offeredBuffer.length === expectedBuffer.length
    && crypto.timingSafeEqual(offeredBuffer, expectedBuffer);
  if (!matches) return bad(response, 401, "Not authorised");

  const url = process.env.SUPABASE_URL || "";
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLL_KEY || "";
  const organization = process.env.VOLUNTEER_SYNC_ORG || "";
  if (!url || !serviceKey) return bad(response, 503, "Supabase is not configured on this deployment.");
  if (!organization) return bad(response, 503, "VOLUNTEER_SYNC_ORG is not set on this deployment.");

  let body = request.body;
  if (typeof body === "string") { try { body = JSON.parse(body); } catch (_) { return bad(response, 400, "Body was not JSON"); } }
  const rows = body && Array.isArray(body.rows) ? body.rows : null;
  if (!rows) return bad(response, 400, "Expected { rows: [...] }");
  // A sync replaces everything, so an empty payload would silently wipe the rota.
  if (!rows.length) return bad(response, 400, "Refusing to replace the rota with nothing");
  if (rows.length > 5000) return bad(response, 413, "That is more rows than the grid should ever hold");

  try {
    const result = await fetch(url.replace(/\/$/, "") + "/rest/v1/rpc/replace_fit4life_volunteer_shifts", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: serviceKey,
        Authorization: "Bearer " + serviceKey
      },
      body: JSON.stringify({ target_organization: organization, rows_json: rows })
    });
    const text = await result.text();
    if (!result.ok) return bad(response, 502, "Supabase refused the sync: " + text.slice(0, 300));
    response.setHeader("Content-Type", "application/json; charset=utf-8");
    return response.status(200).json({ ok: true, written: Number(text) || rows.length });
  } catch (error) {
    return bad(response, 502, (error && error.message) || "The sync could not be delivered");
  }
};
