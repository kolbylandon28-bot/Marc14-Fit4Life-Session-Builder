/**
 * FIT4LIFE — watches this Gmail for Jason's booking report and hands it to the app.
 *
 * Runs inside your own Google account. Nothing about your clients leaves it except the
 * one CSV going straight to your own site.
 *
 * Set these two, then follow the numbered steps you were given.
 */
var IMPORT_URL    = "https://marc14-fit4-life-session-builder.vercel.app/api/import-jason-export";
var SHARED_SECRET = "JMYKS3u70EjFjikL5x8tyDN0TvQ-q18B";
var SENDER        = "lefevrej@byui.edu";

function checkForBookingReport() {
  // Only mail from Jason, only with an attachment, only what this script has not already
  // handled. The label is how it remembers, so a report is never sent twice.
  var label = GmailApp.getUserLabelByName("FIT4LIFE imported")
           || GmailApp.createLabel("FIT4LIFE imported");

  var threads = GmailApp.search(
    'from:' + SENDER + ' has:attachment -label:"FIT4LIFE imported" newer_than:30d', 0, 20);

  if (!threads.length) { Logger.log("Nothing new from " + SENDER); return; }

  threads.forEach(function (thread) {
    var handledSomething = false;

    thread.getMessages().forEach(function (message) {
      message.getAttachments().forEach(function (file) {
        var name = file.getName() || "";
        if (!/\.csv$/i.test(name)) return;   // the report is a CSV; ignore anything else

        // Send the real sender, not SENDER, so the server checks it independently
        // instead of trusting whatever this script asserts.
        var raw = message.getFrom() || "";
        var match = raw.match(/<([^>]+)>/);
        var actualFrom = (match ? match[1] : raw).trim().toLowerCase();

        var payload = {
          from: actualFrom,
          subject: message.getSubject(),
          filename: name,
          csv: file.getDataAsString()
        };

        var result = UrlFetchApp.fetch(IMPORT_URL, {
          method: "post",
          contentType: "application/json",
          headers: { "X-FIT4LIFE-SECRET": SHARED_SECRET },
          payload: JSON.stringify(payload),
          muteHttpExceptions: true
        });

        var code = result.getResponseCode();
        Logger.log(name + " -> HTTP " + code + " " + result.getContentText().slice(0, 200));

        // 200 = stored. 409/422 = the app already has it, or it was not a booking report -
        // either way there is nothing to retry, so mark it done and stop re-sending.
        if (code === 200 || code === 409 || code === 422) handledSomething = true;
      });
    });

    if (handledSomething) thread.addLabel(label);
  });
}

/** Run this ONCE to make it check every 15 minutes. Safe to run again; it will not stack up. */
function installTrigger() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === "checkForBookingReport") ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger("checkForBookingReport").timeBased().everyMinutes(15).create();
  Logger.log("Installed. It will check every 15 minutes from now on.");
}
