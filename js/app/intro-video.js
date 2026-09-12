/* FIT 4 LIFE intro video. Plays once per client profile per device, right before the
   required questionnaire, and can be replayed from Tutorials. */
const INTRO_VIDEO_SRC = "/media/fit4life-intro.mp4";
const INTRO_VIDEO_POSTER = "/media/fit4life-intro-poster.jpg";
const INTRO_VIDEO_SEEN_KEY = "fit4life_intro_video_seen_v1";
// Also held in memory, so a browser that refuses storage cannot loop the intro.
const introVideoSeenThisSession = new Set();

function introVideoSeenMap() {
  try {
    const data = JSON.parse(localStorage.getItem(INTRO_VIDEO_SEEN_KEY) || "{}");
    return data && typeof data === "object" && !Array.isArray(data) ? data : {};
  } catch (_) { return {}; }
}
function introVideoSeen(profileId) {
  return Boolean(profileId) && (introVideoSeenThisSession.has(profileId) || Boolean(introVideoSeenMap()[profileId]));
}
function markIntroVideoSeen(profileId) {
  if (!profileId) return;
  introVideoSeenThisSession.add(profileId);
  const seen = introVideoSeenMap();
  seen[profileId] = new Date().toISOString();
  try { localStorage.setItem(INTRO_VIDEO_SEEN_KEY, JSON.stringify(seen)); } catch (_) {}
}
function introVideoOpen() {
  const overlay = document.getElementById("introVideoOverlay");
  return Boolean(overlay && overlay.classList.contains("open"));
}

function openIntroVideo(options) {
  const opts = options || {};
  const replay = Boolean(opts.replay);
  let overlay = document.getElementById("introVideoOverlay");
  if (!overlay) {
    overlay = document.createElement("div");
    overlay.id = "introVideoOverlay";
    overlay.className = "intro-video-overlay";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("aria-labelledby", "introVideoTitle");
    overlay.innerHTML = '<div class="intro-video-card">'
      + '<span class="intro-video-kicker">Welcome to FIT 4 LIFE</span>'
      + '<h2 id="introVideoTitle">Start here</h2>'
      + '<video id="introVideoPlayer" class="intro-video-player" controls playsinline preload="metadata" poster="' + INTRO_VIDEO_POSTER + '">'
      + '<source src="' + INTRO_VIDEO_SRC + '" type="video/mp4">'
      + '</video>'
      + '<p class="intro-video-copy" id="introVideoCopy"></p>'
      + '<div class="tool-actions intro-video-actions"><button class="small-btn primary" id="introVideoContinue" type="button"></button></div>'
      + '</div>';
    document.body.appendChild(overlay);
  }
  const player = document.getElementById("introVideoPlayer");
  const button = document.getElementById("introVideoContinue");
  const copy = document.getElementById("introVideoCopy");
  copy.textContent = replay ? "" : "A quick welcome before your first questionnaire. Watch it, or skip ahead whenever you like.";
  button.textContent = replay ? "Close" : "Skip intro";

  let finished = false;
  const finish = () => {
    if (finished) return;
    finished = true;
    try { player.pause(); } catch (_) {}
    overlay.classList.remove("open");
    document.body.classList.remove("intro-video-active");
    if (!replay && opts.profileId) markIntroVideoSeen(opts.profileId);
    player.onended = null;
    button.onclick = null;
    overlay.onkeydown = null;
    if (typeof opts.onDone === "function") opts.onDone();
  };
  player.onended = () => {
    if (!replay && opts.profileId) markIntroVideoSeen(opts.profileId);
    button.textContent = replay ? "Close" : "Continue to my questionnaire";
    button.focus();
  };
  button.onclick = finish;
  overlay.onkeydown = (event) => { if (event.key === "Escape") finish(); };

  try { player.currentTime = 0; } catch (_) {}
  overlay.classList.add("open");
  document.body.classList.add("intro-video-active");
  setTimeout(() => { try { button.focus(); } catch (_) {} }, 30);
  return true;
}

/* True when the intro is showing. The caller resumes from onDone. */
function maybePlayIntroVideo(profile, onDone) {
  if ((window.fit4lifeCloudRole || "") !== "client") return false;
  if (!profile || !profile.id) return false;
  if (introVideoOpen()) return true;
  if (introVideoSeen(profile.id)) return false;
  return openIntroVideo({ profileId: profile.id, onDone });
}

function replayIntroVideo() {
  if (introVideoOpen()) return true;
  return openIntroVideo({ replay: true });
}
