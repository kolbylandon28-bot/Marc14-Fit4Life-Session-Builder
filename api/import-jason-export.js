/* Receives Jason's booking report and parks it for the app to apply.
   Deliberately does NOT parse or apply the CSV. That logic lives in
   js/engine/booking-import.js with tests against it, and duplicating it here would give
   two copies of the rules that decide what happens to client records - which is exactly
   how a rule ends up disagreeing with itself. This endpoint verifies, stores, and stops. */
const SENDER_ALLOWLIST = ["lefevrej@byui.edu"];

function bad(response, status, message) {
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  return response.status(status).json({ ok: false, error: message });
}

module.exports = async function importJasonExport(request, response) {
  response.setHeader("Cache-Control", "no-store");
  if (request.method !== "POST") return bad(response, 405, "POST only");

  // A shared secret, because this URL is publicly reachable and anyone who learns it could
  // otherwise park a file that a trainer would later be shown as if it came from Jason.
  const expected = process.env.BOOKING_IMPORT_SECRET || "";
  const offered = request.headers["x-fit4life-secret"] || "";
  if (!expected) return bad(response, 503, "BOOKING_IMPORT_SECRET is not set on this deployment.");
  if (offered !== expected) return bad(response, 401, "Bad or missing secret.");

  let body = request.body;
  if (typeof body === "string") { try { body = JSON.parse(body); } catch (_) { return bad(response, 400, "Body was not JSON."); } }
  if (!body || typeof body !== "object") return bad(response, 400, "Body was not JSON.");

  const sender = String(body.from || "").trim().toLowerCase();
  const csv = String(body.csv || "");
  const filename = String(body.filename || "booking-report.csv").slice(0, 200);
  const subject = String(body.subject || "").slice(0, 300);

  // The envelope address, never the display name - a display name is trivially forged.
  if (!SENDER_ALLOWLIST.includes(sender)) return bad(response, 403, "Sender " + (sender || "(none)") + " is not allowed to send imports.");
  if (!csv.trim()) return bad(response, 400, "No CSV content.");
  if (csv.length > 5 * 1024 * 1024) return bad(response, 413, "That file is too large to be a booking report.");
  if (csv.indexOf("Email") < 0 || csv.indexOf("Package") < 0) return bad(response, 422, "That attachment does not look like a booking report.");

  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.STORAGE_SUPABASE_URL || "";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.STORAGE_SUPABASE_SERVICE_ROLE_KEY || "";
  if (!url || !key) return bad(response, 503, "Supabase is not connected to this deployment.");

  // Same fingerprint the browser parser computes, so re-delivery of an identical file is
  // recognised as the same import rather than counted as a new one.
  let hash = 2166136261;
  for (let i = 0; i < csv.length; i++) { hash ^= csv.charCodeAt(i); hash = Math.imul(hash, 16777619); }
  const fingerprint = (hash >>> 0).toString(16).padStart(8, "0") + ":" + csv.length;

  try {
    const saved = await fetch(url.replace(/\/$/, "") + "/rest/v1/booking_imports", {
      method: "POST",
      headers: {
        apikey: key,
        Authorization: "Bearer " + key,
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates,return=representation"
      },
      body: JSON.stringify([{
        fingerprint, filename, subject, sender,
        csv_body: csv,
        received_at: new Date().toISOString(),
        status: "pending"
      }])
    });
    if (!saved.ok) return bad(response, 502, "Could not store the report: " + (await saved.text()).slice(0, 300));
  } catch (error) {
    return bad(response, 502, "Could not reach the database: " + String(error && error.message || error));
  }

  response.setHeader("Content-Type", "application/json; charset=utf-8");
  return response.status(200).json({ ok: true, fingerprint, stored: filename });
};
