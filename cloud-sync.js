(function fit4LifeCloudModule() {
  "use strict";

  const CONFIG_CACHE_KEY = "fit4life_public_cloud_config_v1";
  const PENDING_SYNC_KEY = "fit4life_cloud_pending_scopes_v1";
  const ACCOUNT_CACHE_OWNER_KEY = "fit4life_account_cache_owner_v1";
  const CLOUD_KEYS = {
    profiles: "fit4life_profiles_v1",
    assignments: "fit4life_assigned_workouts_v1",
    programs: "fit4life_saved_programs_v1",
    progress: "fit4life_progress_v1",
    requests: "fit4life_profile_requests_v1",
    summaryMeta: "fit4life_summary_meta_v1",
    scans: "fit4life_inbody_v1",
    goals: "fit4life_body_goals_v1",
    checkins: "fit4life_checkins_v1",
    metrics: "fit4life_athlete_metrics_v1",
    gymBrand: "fit4life_gym_brand_v1",
    gymEquipment: "fit4life_gym_equipment_v1",
    teams: "fit4life_teams_v1",
    mentalPlans: "fit4life_mental_plans_v1",
    marketPrograms: "fit4life_market_programs_v1",
    wearableConnections: "fit4life_wearable_connections_v1",
    automations: "fit4life_automations_v1",
    automationAlerts: "fit4life_automation_alerts_v1",
    attentionState: "fit4life_attention_state_v1",
    exerciseLibraryEdits: "fit4life_exercise_library_edits_v1",
    ownerRequests: "fit4life_owner_requests_v1",
    coachTaskClaims: "fit4life_coach_task_claims_v1",
    coachNotes: "fit4life_coach_notes_v1",
    calendarEvents: "fit4life_calendar_events_v1",
    calendarAudit: "fit4life_calendar_audit_v1",
    calendarNotices: "fit4life_calendar_notices_v1",
    workoutRequests: "fit4life_workout_requests_v1",
    clientDaily: "fit4life_client_daily_v1",
    clientMessages: "fit4life_client_messages_v1",
    progressReceipts: "fit4life_progress_receipts_v1",
    progressReceiptResponses: "fit4life_progress_receipt_responses_v1",
    activeWorkout: "fit4life_active_workout_v1",
    activeClient: "fit4life_active_client_v1"
  };

  const ARRAY_KEYS = new Set([
    CLOUD_KEYS.profiles, CLOUD_KEYS.assignments, CLOUD_KEYS.programs,
    CLOUD_KEYS.progress, CLOUD_KEYS.requests, CLOUD_KEYS.scans,
    CLOUD_KEYS.goals, CLOUD_KEYS.checkins, CLOUD_KEYS.metrics,
    CLOUD_KEYS.teams, CLOUD_KEYS.mentalPlans, CLOUD_KEYS.marketPrograms,
    CLOUD_KEYS.automations, CLOUD_KEYS.automationAlerts,
    CLOUD_KEYS.clientMessages, CLOUD_KEYS.progressReceipts,
    CLOUD_KEYS.progressReceiptResponses, CLOUD_KEYS.exerciseLibraryEdits,
    CLOUD_KEYS.ownerRequests, CLOUD_KEYS.coachTaskClaims, CLOUD_KEYS.coachNotes,
    CLOUD_KEYS.calendarEvents, CLOUD_KEYS.calendarAudit,
    CLOUD_KEYS.calendarNotices, CLOUD_KEYS.workoutRequests
  ]);

  let cloudClient = null;
  let cloudUser = null;
  let cloudRole = "";
  let cloudOrganizationId = "";
  let cloudReady = false;
  let cloudApplying = false;
  let cloudPushing = false;
  let cloudPullTimer = null;
  let cloudPushTimer = null;
  let cloudChannel = null;
  let cloudRegistrationChannel = null;
  let cloudOrganizationPullTimer = null;
  let cloudOrganizationRefreshTimer = null;
  let organizationSettingsLoad = null;
  let lastOrganizationSettingsLoadedAt = 0;
  let organizationRefreshListenersBound = false;
  let cloudRegistrationRequests = [];
  let portalOrganizationId = "";
  let portalOrganizationSlug = "fit-4-life";
  let portalPublicRegistrationEnabled = true;
  let cloudOrganizationSlug = "";
  let authMode = "signin";
  const pendingScopes = new Set();
  const remoteProfilesByExternalId = new Map();
  const remoteSyncRecords = new Map();

  window.fit4lifeCloudRole = "";
  window.fit4lifeCloudReady = false;
  window.fit4lifeCloudRegistrationRequests = [];
  window.fit4lifeCloudOrganizationId = "";
  window.fit4lifeCloudOrganizationSlug = "";
  window.fit4lifeCloudIdentity = null;
  window.fit4lifeCloudTrainers = [];
  window.fit4lifeCloudTrainerRequests = [];

  function readJson(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      if (raw == null) return fallback;
      const parsed = JSON.parse(raw);
      return parsed == null ? fallback : parsed;
    } catch (_) {
      return fallback;
    }
  }

  function writeJson(key, value) {
    try {
      if (value == null) localStorage.removeItem(key);
      else localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (_) {
      return false;
    }
  }

  function restorePendingScopes() {
    const stored = readJson(PENDING_SYNC_KEY, []);
    (Array.isArray(stored) ? stored : []).forEach((scope) => {
      if (typeof scope === "string" && scope) pendingScopes.add(scope);
    });
  }

  function persistPendingScopes() {
    writeJson(PENDING_SYNC_KEY, Array.from(pendingScopes));
  }

  function browserIsOffline() {
    return typeof navigator !== "undefined" && navigator.onLine === false;
  }

  function localInteractionTestMode() {
    if (!/^(?:localhost|127\.0\.0\.1)$/.test(String(window.location.hostname || ""))) return false;
    try { return new URLSearchParams(window.location.search).get("interaction-test") === "1"; }
    catch (_) { return false; }
  }

  function initializeLocalInteractionTest() {
    const today = new Date(), missedDate = new Date(today.getFullYear(),today.getMonth(),today.getDate() - 1), dateKey = [missedDate.getFullYear(),String(missedDate.getMonth() + 1).padStart(2,"0"),String(missedDate.getDate()).padStart(2,"0")].join("-");
    const profileId = "interaction-test-client", assignmentId = "interaction-test-assignment", savedStaffName = String(localStorage.getItem("fit4life_interaction_staff_name_v1") || "Interaction Test Owner").trim() || "Interaction Test Owner";
    const profiles = readJson(CLOUD_KEYS.profiles, []);
    if (!profiles.some((profile) => profile && profile.id === profileId)) {
      profiles.push({id:profileId,name:"Interaction Test Client",username:"interaction-test",email:"interaction@example.test",age:30,experience:2,minutes:60,availableDays:3,goals:["general"],muscles:[],injuries:[],zones:[],assignedTrainerId:"interaction-test-owner",assignedTrainerName:"Interaction Test Owner",createdAt:new Date().toISOString()});
      writeJson(CLOUD_KEYS.profiles,profiles);
    }
    const assignments = readJson(CLOUD_KEYS.assignments, []);
    if (!assignments.some((assignment) => assignment && assignment.id === assignmentId)) {
      assignments.push({id:assignmentId,profileId,client:"Interaction Test Client",status:"assigned",scheduledDate:dateKey,scheduledTime:"12:30",assignedAt:new Date().toISOString(),session:{type:"solo",data:{sessionId:"interaction-test-session",goalLabel:"Interaction Test Workout",spec:{client:"Interaction Test Client",goal:"general"},blocks:[]}}});
      writeJson(CLOUD_KEYS.assignments,assignments);
    }
    try { localStorage.setItem(CLOUD_KEYS.activeClient,profileId); } catch (_) {}
    cloudUser = {id:"interaction-test-owner",email:"owner@interaction.test",user_metadata:{display_name:savedStaffName}};
    cloudRole = "owner"; cloudReady = true;
    window.fit4lifeCloudRole = "owner"; window.fit4lifeCloudReady = true;
    window.fit4lifeCloudIdentity = {id:cloudUser.id,email:cloudUser.email,role:"owner",displayName:savedStaffName};
    window.fit4lifeCloudTrainers = [{user_id:cloudUser.id,display_name:savedStaffName,email:cloudUser.email,role:"owner",is_active:true}];
    showAuthGate(false); cloudStatus("Local interaction test", "offline"); authMessage("", false);
    setTimeout(() => { refreshVisibleApp(); if (typeof routeAuthenticatedWorkspace === "function") routeAuthenticatedWorkspace(); },0);
  }

  function isolateSensitiveCacheForUser(userId, role) {
    let previous = "";
    try { previous = localStorage.getItem(ACCOUNT_CACHE_OWNER_KEY) || ""; } catch (_) {}
    if (role === "client" && previous !== userId) {
      Object.values(CLOUD_KEYS).forEach((key) => {
        if (key !== CLOUD_KEYS.gymBrand && key !== CLOUD_KEYS.gymEquipment) {
          try { localStorage.removeItem(key); } catch (_) {}
        }
      });
      pendingScopes.clear();
      persistPendingScopes();
    }
    try { localStorage.setItem(ACCOUNT_CACHE_OWNER_KEY, userId || ""); } catch (_) {}
  }

  function accountVisibleProfileRows(rows, role, userId) {
    const list = Array.isArray(rows) ? rows : [];
    if (role === "owner" || role === "trainer") return list;
    if (role !== "client" || !userId) return [];
    return list.filter((row) => row && row.auth_user_id === userId);
  }

  function accountVisibleSyncRecords(records, profileRows, role) {
    const list = Array.isArray(records) ? records : [];
    if (role === "owner" || role === "trainer") return list;
    const clientIds = new Set((profileRows || []).map((row) => row && row.id).filter(Boolean));
    return list.filter((record) => record && record.client_id && clientIds.has(record.client_id));
  }

  restorePendingScopes();

  function normalizedEmail(value) {
    return String(value || "").trim().toLowerCase();
  }

  function normalizedName(value) {
    return String(value || "").trim().toLowerCase().replace(/\s+/g, " ");
  }

  function accountDisplayName(user) {
    const metadata = user && user.user_metadata || {};
    return String(metadata.display_name || metadata.full_name || metadata.name || (user && user.email ? user.email.split("@")[0] : "FIT 4 LIFE coach")).trim();
  }

  function configuredPublicSiteUrl() {
    const configured = document.querySelector && document.querySelector('meta[name="fit4life-site-url"]');
    const value = configured && configured.content ? configured.content.trim().replace(/\/$/, "") : "";
    return value || window.location.origin;
  }

  function publicSiteUrl(pathname,params) {
    const url = new URL(pathname || "/", configuredPublicSiteUrl() + "/");
    Object.entries(params || {}).forEach(([key,value]) => { if (value != null && value !== "") url.searchParams.set(key,String(value)); });
    return url.toString();
  }

  function authRedirectUrl() {
    const gym = requestedPortalSlug();
    return publicSiteUrl("/", gym ? { gym } : {});
  }

  window.fit4lifePublicSiteUrl = publicSiteUrl;

  function publishCloudIdentity() {
    window.fit4lifeCloudIdentity = cloudUser ? { id:cloudUser.id,email:cloudUser.email || "",role:cloudRole || "",displayName:accountDisplayName(cloudUser) } : null;
  }

  function sameClientName(a, b) {
    return Boolean(a && b) && normalizedName(a) === normalizedName(b);
  }

  function requestedPortalSlug() {
    try {
      const value = new URLSearchParams(window.location.search).get("gym");
      return String(value || "").trim().toLowerCase().replace(/[^a-z0-9-]/g, "");
    } catch (_) {
      return "";
    }
  }

  function portalName() {
    const brand = readJson(CLOUD_KEYS.gymBrand, {});
    return String(brand.name || "your gym").trim();
  }

  function applyPortalContext(context) {
    if (!context) return null;
    portalOrganizationId = context.organization_id || portalOrganizationId;
    portalOrganizationSlug = context.slug || portalOrganizationSlug;
    portalPublicRegistrationEnabled = context.public_registration_enabled !== false;
    if (context.brand_config && typeof context.brand_config === "object") writeJson(CLOUD_KEYS.gymBrand, context.brand_config);
    if (context.equipment_config && typeof context.equipment_config === "object") writeJson(CLOUD_KEYS.gymEquipment, context.equipment_config);
    lastOrganizationSettingsLoadedAt = Date.now();
    try { if (typeof applyGymBrand === "function") applyGymBrand(); } catch (_) {}
    const signupTab = document.querySelector && document.querySelector('[data-auth-mode="signup"]');
    if (signupTab) signupTab.style.display = portalPublicRegistrationEnabled ? "" : "none";
    return context;
  }

  async function loadPortalContext() {
    if (!cloudClient) return null;
    const slug = requestedPortalSlug();
    const hostname = String(window.location.hostname || "").toLowerCase();
    let response = await cloudClient.rpc("resolve_gym_portal", {
      requested_slug: slug || null,
      requested_hostname: hostname || null
    });
    let context = !response.error && Array.isArray(response.data) ? response.data[0] : null;
    if (!context && !slug) {
      response = await cloudClient.rpc("resolve_gym_portal", { requested_slug: null, requested_hostname: null });
      context = !response.error && Array.isArray(response.data) ? response.data[0] : null;
    }
    if (context) return applyPortalContext(context);
    portalOrganizationSlug = slug || "fit-4-life";
    return null;
  }

  function itemBelongsToProfile(item, profile) {
    if (!item || !profile) return false;
    if (item.profileId && item.profileId === profile.id) return true;
    if (item.client && sameClientName(item.client, profile.name)) return true;
    if (item.setup && item.setup.client && sameClientName(item.setup.client, profile.name)) return true;
    return false;
  }

  function mergeRecords(current, incoming) {
    const result = [];
    const positions = new Map();
    [...(Array.isArray(current) ? current : []), ...(Array.isArray(incoming) ? incoming : [])].forEach((item) => {
      if (!item) return;
      const id = item.id || [item.profileId, item.date, item.type, item.label].filter(Boolean).join("|") || JSON.stringify(item);
      if (!positions.has(id)) {
        positions.set(id, result.length);
        result.push(item);
        return;
      }
      const index = positions.get(id);
      const previous = result[index];
      const previousTime = String(previous.updatedAt || previous.createdAt || previous.date || "");
      const nextTime = String(item.updatedAt || item.createdAt || item.date || "");
      if (nextTime >= previousTime) result[index] = item;
    });
    return result.sort((a, b) => String(b.createdAt || b.updatedAt || b.date || "").localeCompare(String(a.createdAt || a.updatedAt || a.date || "")));
  }

  function syncRecordCacheKey(clientId, recordType, recordKey) {
    return [clientId || "organization", recordType, recordKey || "default"].join("|");
  }

  function recordTime(value) {
    const parsed = Date.parse(value || "");
    return Number.isFinite(parsed) ? parsed : 0;
  }

  function newestObject(current, incoming) {
    if (!current) return incoming || null;
    if (!incoming) return current;
    const currentTime = recordTime(current.updatedAt || current.savedAt || current.completedAt || current.createdAt);
    const incomingTime = recordTime(incoming.updatedAt || incoming.savedAt || incoming.completedAt || incoming.createdAt);
    return incomingTime >= currentTime ? { ...current, ...incoming } : { ...incoming, ...current };
  }

  function mergeBundlePayload(recordType, current, incoming) {
    const left = current && typeof current === "object" ? current : {};
    const right = incoming && typeof incoming === "object" ? incoming : {};
    if (!Object.keys(left).length) return right;
    if (!Object.keys(right).length) return left;

    if (recordType === "client_plan") {
      const leftAssignments = Array.isArray(left.assignments) ? left.assignments : left.assignment ? [left.assignment] : [];
      const rightAssignments = Array.isArray(right.assignments) ? right.assignments : right.assignment ? [right.assignment] : [];
      const merged = {
        ...left,
        ...right,
        version: Math.max(Number(left.version || 0), Number(right.version || 0), 3),
        profile: newestObject(left.profile, right.profile),
        assignments: mergeRecords(leftAssignments, rightAssignments),
        programs: mergeRecords(left.programs, right.programs),
        inBodyScans: mergeRecords(left.inBodyScans, right.inBodyScans),
        bodyGoals: mergeRecords(left.bodyGoals, right.bodyGoals),
        athleteMetrics: mergeRecords(left.athleteMetrics, right.athleteMetrics),
        mentalPlans: mergeRecords(left.mentalPlans, right.mentalPlans),
        progressReceipts: mergeRecords(left.progressReceipts, right.progressReceipts),
        clientCoachNotes: mergeRecords(left.clientCoachNotes, right.clientCoachNotes),
        calendarEvents: mergeRecords(left.calendarEvents, right.calendarEvents),
        summaryMeta: { ...(left.summaryMeta || {}), ...(right.summaryMeta || {}) },
        wearableConnections: { ...(left.wearableConnections || {}), ...(right.wearableConnections || {}) },
        savedAt: recordTime(right.savedAt) >= recordTime(left.savedAt) ? right.savedAt : left.savedAt
      };
      merged.assignment = merged.assignments[0] || null;
      return merged;
    }

    if (recordType === "client_activity") {
      const leftStates = Array.isArray(left.assignmentStates) ? left.assignmentStates : left.assignmentState ? [left.assignmentState] : [];
      const rightStates = Array.isArray(right.assignmentStates) ? right.assignmentStates : right.assignmentState ? [right.assignmentState] : [];
      const merged = {
        ...left,
        ...right,
        version: Math.max(Number(left.version || 0), Number(right.version || 0), 3),
        progress: mergeRecords(left.progress, right.progress),
        checkIns: mergeRecords(left.checkIns, right.checkIns),
        messages: mergeRecords(left.messages, right.messages),
        progressReceiptResponses: mergeRecords(left.progressReceiptResponses, right.progressReceiptResponses),
        workoutRequests: mergeRecords(left.workoutRequests, right.workoutRequests),
        daily: { ...(left.daily || {}), ...(right.daily || {}) },
        activeWorkout: newestObject(left.activeWorkout, right.activeWorkout),
        assignmentStates: mergeRecords(leftStates, rightStates),
        savedAt: recordTime(right.savedAt) >= recordTime(left.savedAt) ? right.savedAt : left.savedAt
      };
      merged.assignmentState = merged.assignmentStates[0] || null;
      if (meaningfulIntake(left.clientIntake) && meaningfulIntake(right.clientIntake)) {
        merged.clientIntake = intakeTime(right.clientIntake, right) >= intakeTime(left.clientIntake, left) ? right.clientIntake : left.clientIntake;
      } else if (meaningfulIntake(left.clientIntake)) merged.clientIntake = left.clientIntake;
      return merged;
    }

    if (recordType === "organization_snapshot") {
      return {
        ...left,
        ...right,
        profileRequests: mergeRecords(left.profileRequests, right.profileRequests),
        teams: mergeRecords(left.teams, right.teams),
        marketPrograms: mergeRecords(left.marketPrograms, right.marketPrograms),
        automations: mergeRecords(left.automations, right.automations),
        automationAlerts: mergeRecords(left.automationAlerts, right.automationAlerts),
        exerciseLibraryEdits: mergeRecords(left.exerciseLibraryEdits, right.exerciseLibraryEdits),
        ownerRequests: mergeRecords(left.ownerRequests, right.ownerRequests),
        coachTaskClaims: mergeRecords(left.coachTaskClaims, right.coachTaskClaims),
        coachNotes: mergeRecords(left.coachNotes, right.coachNotes),
        calendarAudit: mergeRecords(left.calendarAudit, right.calendarAudit),
        calendarNotices: mergeRecords(left.calendarNotices, right.calendarNotices),
        calendarTeamEvents: mergeRecords(left.calendarTeamEvents, right.calendarTeamEvents),
        gymBrand: { ...(left.gymBrand || {}), ...(right.gymBrand || {}) },
        gymEquipment: { ...(left.gymEquipment || {}), ...(right.gymEquipment || {}) },
        attentionState: { ...(left.attentionState || {}), ...(right.attentionState || {}) },
        savedAt: recordTime(right.savedAt) >= recordTime(left.savedAt) ? right.savedAt : left.savedAt
      };
    }

    return { ...left, ...right };
  }

  function cloudStatus(label, state) {
    const target = document.getElementById("cloudStatus");
    if (!target) return;
    target.textContent = label;
    target.dataset.state = state || "";
    target.title = label;
  }

  function authMessage(message, isError) {
    const target = document.getElementById("cloudAuthMessage");
    if (!target) return;
    target.textContent = message || "";
    target.classList.toggle("error", Boolean(isError));
  }

  function showAuthGate(show) {
    const gate = document.getElementById("cloudAuthGate");
    if (gate) gate.classList.toggle("open", Boolean(show));
    document.body.classList.toggle("cloud-auth-locked", Boolean(show));
  }

  function setText(id, value) {
    const target = document.getElementById(id);
    if (target) target.textContent = value || "";
  }

  function showAuthMode(mode) {
    authMode = mode || "signin";
    const panels = {
      signin: "cloudSignInPanel",
      signup: "cloudSignUpPanel",
      trainer_signup: "cloudTrainerSignUpPanel",
      reset: "cloudResetPanel",
      update: "cloudUpdatePasswordPanel",
      pending: "cloudPendingPanel"
    };
    Object.keys(panels).forEach((key) => {
      const panel = document.getElementById(panels[key]);
      if (panel) panel.classList.toggle("open", key === authMode);
    });
    const tabs = document.getElementById("cloudAuthTabs");
    if (tabs) {
      tabs.style.display = ["signin", "signup"].includes(authMode) ? "grid" : "none";
      tabs.querySelectorAll("button[data-auth-mode]").forEach((button) => button.classList.toggle("on", button.dataset.authMode === authMode));
    }
    const copy = {
      signin: ["Sign in to your workspace", "Access your workouts and progress from any device."],
      signup: ["Create your client account", "Verify the message sent to your email, then sign in to the client workspace."],
      trainer_signup: ["Request trainer access", "Create a verified login, then wait for an approved gym trainer or owner to confirm trainer permissions."],
      reset: ["Reset your password", "We will email you a secure link to choose a new password."],
      update: ["Choose a new password", "Enter a new password for your training account."],
      pending: ["Account status", "Your secure login is active while your client access is reviewed."]
    }[authMode] || ["Training account", "Secure shared training system."];
    setText("cloudAuthTitle", copy[0]);
    setText("cloudAuthIntro", copy[1]);
    authMessage("", false);
  }

  window.fit4lifeCloudShowAuthMode = function fit4lifeCloudShowAuthMode(mode) {
    showAuthMode(mode);
    showAuthGate(true);
  };

  function requestMeta(request) {
    const meta = document.getElementById("cloudPendingMeta");
    if (!meta) return;
    const rows = [];
    if (request && request.full_name) rows.push(["Name", request.full_name]);
    if (request && request.email) rows.push(["Email", request.email]);
    if (request && request.username) rows.push(["Username", "@" + String(request.username).replace(/^@/, "")]);
    if (request && request.requested_role) rows.push(["Requested access", request.requested_role === "trainer" ? "Trainer" : "Client"]);
    if (request && request.status) rows.push(["Status", request.status.charAt(0).toUpperCase() + request.status.slice(1)]);
    meta.innerHTML = rows.map((row) => "<div><span>" + row[0] + "</span><b>" + String(row[1]).replace(/[&<>\"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '\"': "&quot;" }[character])) + "</b></div>").join("");
  }

  function showPendingRequest(request, needsVerification) {
    showAuthMode("pending");
    requestMeta(request || readJson("fit4life_pending_signup_v1", {}));
    const status = request && request.status ? request.status : "pending";
    const trainerRequest = request && request.requested_role === "trainer";
    if (status === "rejected") {
      setText("cloudPendingIcon", "!");
      setText("cloudPendingTitle", "Request needs attention");
      setText("cloudPendingCopy", request.review_note || "A trainer could not approve this request. Contact " + portalName() + " for help.");
      setText("cloudPendingCheck", "Check status again");
    } else if (needsVerification) {
      setText("cloudPendingIcon", "✉");
      setText("cloudPendingTitle", "Check your email");
      setText("cloudPendingCopy", trainerRequest
        ? "Open the verification email sent to your address. After verification, an approved gym trainer or owner can confirm access from the Trainer Access center."
        : "Open the verification email sent to your address. After verification, return here and sign in to activate your client workspace.");
      setText("cloudPendingCheck", "I verified my email");
    } else if (trainerRequest) {
      setText("cloudPendingIcon", "⏳");
      setText("cloudPendingTitle", "Trainer approval pending");
      setText("cloudPendingCopy", "Your email is verified. An approved gym trainer or owner must confirm this request before any client records become available.");
      setText("cloudPendingCheck", "Check trainer approval");
    } else {
      setText("cloudPendingIcon", "✓");
      setText("cloudPendingTitle", "Finish client activation");
      setText("cloudPendingCopy", "Your email is verified. Sign in again if needed; the app will connect or create your protected client profile automatically.");
      setText("cloudPendingCheck", "Open client workspace");
    }
    showAuthGate(true);
  }

  function refreshVisibleApp() {
    try {
      if (typeof refreshProfileSelects === "function") refreshProfileSelects();
      if (typeof renderForms === "function") renderForms();
      if (typeof renderProgressHistory === "function") renderProgressHistory();
      if (typeof applyGymBrand === "function") applyGymBrand();
      if (currentView === "trainer" && typeof renderTrainerHub === "function") renderTrainerHub(selectedTrainerClient || "");
      if (String(currentView || "").indexOf("client-") === 0 && typeof renderClientAppView === "function") renderClientAppView(currentView);
    } catch (_) {}
  }

  async function loadPublicConfig() {
    try {
      const response = await fetch("/api/supabase-config", { cache: "no-store" });
      const config = await response.json();
      if (!response.ok || !config.configured || !config.url || !config.key) throw new Error(config.message || "Cloud connection is not configured.");
      localStorage.setItem(CONFIG_CACHE_KEY, JSON.stringify(config));
      return config;
    } catch (error) {
      const cached = readJson(CONFIG_CACHE_KEY, null);
      if (cached && cached.url && cached.key) return cached;
      throw error;
    }
  }

  async function getMembership() {
    let response = await cloudClient
      .from("memberships")
      .select("organization_id, role, is_active")
      .eq("user_id", cloudUser.id)
      .eq("is_active", true)
      .order("created_at", { ascending: true });

    if (!response.error && Array.isArray(response.data)) {
      const selected = portalOrganizationId
        ? response.data.find((membership) => membership.organization_id === portalOrganizationId)
        : response.data[0];
      if (selected) return selected;
    }

    const claim = portalOrganizationId
      ? await cloudClient.rpc("claim_my_client_profile_for_org", { target_organization: portalOrganizationId })
      : await cloudClient.rpc("claim_my_client_profile");
    if (claim.error) {
      const activation = await cloudClient.rpc("activate_my_fit4life_client_account");
      if (activation.error) return null;
    }

    response = await cloudClient
      .from("memberships")
      .select("organization_id, role, is_active")
      .eq("user_id", cloudUser.id)
      .eq("is_active", true);
    if (response.error || !Array.isArray(response.data)) return null;
    return portalOrganizationId
      ? response.data.find((membership) => membership.organization_id === portalOrganizationId) || null
      : response.data[0] || null;
  }

  async function getMyRegistrationRequest() {
    if (!cloudClient || !cloudUser) return null;
    const response = await cloudClient
      .from("registration_requests")
      .select("*")
      .eq("user_id", cloudUser.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (response.error) {
      if (response.error.code === "42P01") return null;
      console.error("Registration request lookup failed", response.error);
      return null;
    }
    return response.data || null;
  }

  async function loadTrainerRegistrationRequests() {
    if (!cloudClient || !cloudOrganizationId || !(cloudRole === "owner" || cloudRole === "trainer")) return [];
    const response = await cloudClient
      .from("registration_requests")
      .select("*")
      .eq("organization_id", cloudOrganizationId)
      .eq("status", "pending")
      .order("created_at", { ascending: true });
    if (response.error) {
      if (response.error.code !== "42P01") console.error("Registration queue failed", response.error);
      cloudRegistrationRequests = [];
    } else {
      cloudRegistrationRequests = response.data || [];
    }
    window.fit4lifeCloudRegistrationRequests = cloudRegistrationRequests.slice();
    try { if (typeof renderProfileRequests === "function") renderProfileRequests(); } catch (_) {}
    return cloudRegistrationRequests;
  }
  window.fit4lifeCloudRefreshRegistrationRequests = loadTrainerRegistrationRequests;

  async function loadOrganizationSettings() {
    if (!cloudClient || !cloudOrganizationId) return null;
    if (organizationSettingsLoad) return organizationSettingsLoad;
    organizationSettingsLoad = (async () => {
      const response = await cloudClient
        .from("organizations")
        .select("id,slug,name,brand_config,equipment_config,public_registration_enabled,status,default_timezone,default_units,plan_code")
        .eq("id", cloudOrganizationId)
        .maybeSingle();
      if (response.error || !response.data) {
        if (response.error) console.error("Gym settings could not be loaded", response.error);
        return null;
      }
      cloudOrganizationSlug = response.data.slug || portalOrganizationSlug;
      window.fit4lifeCloudOrganizationId = cloudOrganizationId;
      window.fit4lifeCloudOrganizationSlug = cloudOrganizationSlug;
      applyPortalContext({
        organization_id: response.data.id,
        slug: response.data.slug,
        name: response.data.name,
        brand_config: response.data.brand_config,
        equipment_config: response.data.equipment_config,
        public_registration_enabled: response.data.public_registration_enabled
      });
      lastOrganizationSettingsLoadedAt = Date.now();
      return response.data;
    })();
    try {
      return await organizationSettingsLoad;
    } finally {
      organizationSettingsLoad = null;
    }
  }
  window.fit4lifeCloudRefreshOrganizationSettings = loadOrganizationSettings;

  function scheduleOrganizationSettingsPull(delay) {
    if (!cloudReady || !cloudOrganizationId) return;
    clearTimeout(cloudOrganizationPullTimer);
    cloudOrganizationPullTimer = setTimeout(async () => {
      const before = readJson(CLOUD_KEYS.gymBrand, {});
      const loaded = await loadOrganizationSettings();
      const after = readJson(CLOUD_KEYS.gymBrand, {});
      if (loaded && JSON.stringify(before) !== JSON.stringify(after) && typeof showToast === "function") showToast("Portal theme updated for this gym");
    }, Number.isFinite(delay) ? delay : 250);
  }

  function refreshOrganizationSettingsIfStale(force) {
    if (typeof document !== "undefined" && document.hidden) return;
    if (!force && Date.now() - lastOrganizationSettingsLoadedAt < 45000) return;
    if (!cloudReady || !cloudOrganizationId) {
      if (cloudClient) loadPortalContext();
      return;
    }
    scheduleOrganizationSettingsPull(0);
  }

  function startOrganizationSettingsRefresh() {
    clearInterval(cloudOrganizationRefreshTimer);
    cloudOrganizationRefreshTimer = setInterval(() => refreshOrganizationSettingsIfStale(false), 60000);
    if (!organizationRefreshListenersBound) {
      organizationRefreshListenersBound = true;
      document.addEventListener("visibilitychange", () => { if (!document.hidden) refreshOrganizationSettingsIfStale(true); });
      window.addEventListener("focus", () => refreshOrganizationSettingsIfStale(false));
      window.addEventListener("online", () => refreshOrganizationSettingsIfStale(true));
    }
  }

  window.fit4lifeCloudSaveOrganizationSettings = async function fit4lifeCloudSaveOrganizationSettings(brand, equipment) {
    if (!cloudClient || !cloudOrganizationId || cloudRole !== "owner") {
      if (typeof showToast === "function") showToast("Only the gym owner can change shared branding and equipment");
      return false;
    }
    if (!brand || typeof brand !== "object" || !equipment || typeof equipment !== "object") return false;
    const response = await cloudClient.rpc("update_my_organization_setup", {
      target_organization: cloudOrganizationId,
      new_brand_config: brand,
      new_equipment_config: equipment
    });
    const saved = !response.error && Array.isArray(response.data) ? response.data[0] : response.data;
    if (response.error || !saved) {
      if (typeof showToast === "function") showToast(response.error && response.error.message || "Gym settings could not be saved");
      return false;
    }
    applyPortalContext(saved);
    lastOrganizationSettingsLoadedAt = Date.now();
    queueCloudSync("organization");
    if (typeof showToast === "function") showToast("Gym setup saved for every device");
    return true;
  };

  function subscribeToPendingRegistration() {
    if (!cloudClient || !cloudUser) return;
    if (cloudRegistrationChannel) cloudClient.removeChannel(cloudRegistrationChannel);
    cloudRegistrationChannel = cloudClient
      .channel("fit4life-registration-" + cloudUser.id)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "registration_requests", filter: "user_id=eq." + cloudUser.id }, async () => {
        const sessionResponse = await cloudClient.auth.getSession();
        if (sessionResponse.data && sessionResponse.data.session) await handleSession(sessionResponse.data.session);
      })
      .subscribe();
  }

  function tableProfile(profile) {
    return {
      organization_id: cloudOrganizationId,
      external_id: String(profile.id),
      full_name: String(profile.name || "Client").trim(),
      username: String(profile.username || "").replace(/^@/, "").trim().toLowerCase(),
      email: normalizedEmail(profile.email) || null,
      status: "active",
      created_by: cloudUser.id
    };
  }

  function cachedProfileFromRow(row) {
    return {
      id: row.external_id || row.id,
      name: row.full_name,
      username: row.username,
      email: row.email || "",
      goals: ["general"],
      trainingStyle: "auto",
      cardioMode: "any",
      cardioModes: ["any"],
      experience: 1,
      age: 30,
      minutes: 60,
      muscles: [],
      injuries: [],
      zones: [],
      updatedAt: row.updated_at
    };
  }

  async function ensureRemoteProfiles(localProfiles) {
    const profiles = (localProfiles || []).filter((profile) => profile && profile.id && profile.name);
    if (!profiles.length) return [];
    const rows = profiles.map(tableProfile);
    const response = await cloudClient
      .from("client_profiles")
      .upsert(rows, { onConflict: "organization_id,external_id" })
      .select("id,organization_id,external_id,auth_user_id,full_name,username,email,status,updated_at");
    if (response.error) throw response.error;
    response.data.forEach((row) => remoteProfilesByExternalId.set(row.external_id, row));
    return response.data;
  }

  async function hydrateRemoteProfileMap() {
    const response = await cloudClient
      .from("client_profiles")
      .select("id,organization_id,external_id,auth_user_id,full_name,username,email,status,updated_at")
      .eq("organization_id", cloudOrganizationId);
    if (response.error) throw response.error;
    const visibleRows = accountVisibleProfileRows(response.data, cloudRole, cloudUser && cloudUser.id);
    remoteProfilesByExternalId.clear();
    visibleRows.forEach((row) => remoteProfilesByExternalId.set(String(row.external_id || row.id), row));
    return visibleRows;
  }

  async function findSyncRecord(clientId, recordType, recordKey) {
    let query = cloudClient
      .from("sync_records")
      .select("id,payload,version,updated_at")
      .eq("organization_id", cloudOrganizationId)
      .eq("record_type", recordType)
      .eq("record_key", recordKey || "default");
    query = clientId ? query.eq("client_id", clientId) : query.is("client_id", null);
    const response = await query.limit(1).maybeSingle();
    if (response.error) throw response.error;
    return response.data;
  }

  async function saveSyncRecord(clientId, recordType, recordKey, payload) {
    const cacheKey = syncRecordCacheKey(clientId, recordType, recordKey);
    let expected = remoteSyncRecords.get(cacheKey) || null;
    let nextPayload = payload;

    for (let attempt = 0; attempt < 4; attempt += 1) {
      if (!expected) expected = await findSyncRecord(clientId, recordType, recordKey);
      const record = {
        organization_id: cloudOrganizationId,
        client_id: clientId || null,
        record_type: recordType,
        record_key: recordKey || "default",
        payload: nextPayload,
        deleted_at: null
      };

      if (!expected) {
        const inserted = await cloudClient.from("sync_records").insert(record).select("id,payload,version,updated_at").maybeSingle();
        if (!inserted.error && inserted.data) {
          remoteSyncRecords.set(cacheKey, inserted.data);
          return inserted.data;
        }
        if (!inserted.error || inserted.error.code === "23505") {
          expected = await findSyncRecord(clientId, recordType, recordKey);
          nextPayload = mergeBundlePayload(recordType, expected && expected.payload, nextPayload);
          continue;
        }
        throw inserted.error;
      }

      const updated = await cloudClient
        .from("sync_records")
        .update(record)
        .eq("id", expected.id)
        .eq("version", expected.version)
        .select("id,payload,version,updated_at")
        .maybeSingle();
      if (updated.error) throw updated.error;
      if (updated.data) {
        remoteSyncRecords.set(cacheKey, updated.data);
        return updated.data;
      }

      const latest = await findSyncRecord(clientId, recordType, recordKey);
      if (!latest) { expected = null; continue; }
      nextPayload = mergeBundlePayload(recordType, latest.payload, nextPayload);
      expected = latest;
    }

    throw new Error("This record changed on another device while it was saving. Its updates were preserved; retry the save.");
  }

  function profileProgress(profile) {
    return readJson(CLOUD_KEYS.progress, []).filter((item) => itemBelongsToProfile(item, profile));
  }

  function planBundle(profile) {
    const assignments = readJson(CLOUD_KEYS.assignments, []);
    const profileAssignments = assignments.filter((item) => itemBelongsToProfile(item, profile));
    const progress = profileProgress(profile);
    const progressIds = new Set(progress.map((entry) => entry.id).filter(Boolean));
    const summaryMeta = readJson(CLOUD_KEYS.summaryMeta, {});
    const filteredMeta = {};
    Object.keys(summaryMeta || {}).forEach((id) => { if (progressIds.has(id)) filteredMeta[id] = summaryMeta[id]; });
    const wearables = readJson(CLOUD_KEYS.wearableConnections, {});
    const wearableForProfile = wearables && wearables[profile.id] ? { [profile.id]: wearables[profile.id] } : {};
    return {
      version: 4,
      profile,
      assignments: profileAssignments,
      assignment: profileAssignments[0] || null,
      programs: readJson(CLOUD_KEYS.programs, []).filter((item) => itemBelongsToProfile(item, profile)),
      inBodyScans: readJson(CLOUD_KEYS.scans, []).filter((item) => itemBelongsToProfile(item, profile)),
      bodyGoals: readJson(CLOUD_KEYS.goals, []).filter((item) => itemBelongsToProfile(item, profile)),
      summaryMeta: filteredMeta,
      athleteMetrics: readJson(CLOUD_KEYS.metrics, []).filter((item) => itemBelongsToProfile(item, profile)),
      mentalPlans: readJson(CLOUD_KEYS.mentalPlans, []).filter((item) => itemBelongsToProfile(item, profile)),
      wearableConnections: wearableForProfile,
      progressReceipts: readJson(CLOUD_KEYS.progressReceipts, []).filter((item) => itemBelongsToProfile(item, profile) && item.status === "published"),
      clientCoachNotes: readJson(CLOUD_KEYS.coachNotes, []).filter((item) => itemBelongsToProfile(item, profile) && item.visibility === "client" && !item.archivedAt),
      calendarEvents: readJson(CLOUD_KEYS.calendarEvents, []).filter((item) => itemBelongsToProfile(item, profile)),
      savedAt: new Date().toISOString()
    };
  }

  function activityBundle(profile) {
    const assignments = readJson(CLOUD_KEYS.assignments, []);
    const profileAssignments = assignments.filter((item) => itemBelongsToProfile(item, profile));
    const daily = readJson(CLOUD_KEYS.clientDaily, {});
    const dailyForProfile = {};
    Object.keys(daily || {}).forEach((key) => {
      if (key === profile.id || key.indexOf(profile.id + ":") === 0) dailyForProfile[key] = daily[key];
    });
    const activeWorkout = readJson(CLOUD_KEYS.activeWorkout, null);
    return {
      version: 3,
      profileId: profile.id,
      clientIntake: profile.intake || {},
      clientIntakeUpdatedAt: profile.intake && profile.intake.updatedAt || null,
      progress: profileProgress(profile),
      checkIns: readJson(CLOUD_KEYS.checkins, []).filter((item) => itemBelongsToProfile(item, profile)),
      messages: readJson(CLOUD_KEYS.clientMessages, []).filter((item) => itemBelongsToProfile(item, profile)),
      progressReceiptResponses: readJson(CLOUD_KEYS.progressReceiptResponses, []).filter((item) => itemBelongsToProfile(item, profile)),
      workoutRequests: readJson(CLOUD_KEYS.workoutRequests, []).filter((item) => itemBelongsToProfile(item, profile)),
      daily: dailyForProfile,
      activeWorkout: activeWorkout && activeWorkout.profileId === profile.id ? activeWorkout : null,
      assignmentStates: profileAssignments.map((assignment) => ({
        id: assignment.id,
        profileId: profile.id,
        status: assignment.status,
        startedAt: assignment.startedAt || null,
        completedAt: assignment.completedAt || null,
        reviewedAt: assignment.reviewedAt || null,
        clientReview: assignment.clientReview || null,
        updatedAt: assignment.updatedAt || assignment.completedAt || assignment.startedAt || assignment.assignedAt || null
      })),
      assignmentState: profileAssignments[0] ? {
        id: profileAssignments[0].id,
        profileId: profile.id,
        status: profileAssignments[0].status,
        startedAt: profileAssignments[0].startedAt || null,
        completedAt: profileAssignments[0].completedAt || null,
        reviewedAt: profileAssignments[0].reviewedAt || null,
        clientReview: profileAssignments[0].clientReview || null,
        updatedAt: profileAssignments[0].updatedAt || profileAssignments[0].completedAt || profileAssignments[0].startedAt || profileAssignments[0].assignedAt || null
      } : null,
      savedAt: new Date().toISOString()
    };
  }

  function organizationBundle() {
    return {
      version: 2,
      profileRequests: readJson(CLOUD_KEYS.requests, []),
      gymBrand: readJson(CLOUD_KEYS.gymBrand, {}),
      gymEquipment: readJson(CLOUD_KEYS.gymEquipment, {}),
      teams: readJson(CLOUD_KEYS.teams, []),
      marketPrograms: readJson(CLOUD_KEYS.marketPrograms, []),
      automations: readJson(CLOUD_KEYS.automations, []),
      automationAlerts: readJson(CLOUD_KEYS.automationAlerts, []),
      attentionState: readJson(CLOUD_KEYS.attentionState, {}),
      exerciseLibraryEdits: readJson(CLOUD_KEYS.exerciseLibraryEdits, []),
      ownerRequests: readJson(CLOUD_KEYS.ownerRequests, []),
      coachTaskClaims: readJson(CLOUD_KEYS.coachTaskClaims, []),
      coachNotes: readJson(CLOUD_KEYS.coachNotes, []),
      calendarAudit: readJson(CLOUD_KEYS.calendarAudit, []),
      calendarNotices: readJson(CLOUD_KEYS.calendarNotices, []),
      calendarTeamEvents: readJson(CLOUD_KEYS.calendarEvents, []).filter((item) => !item.profileId),
      savedAt: new Date().toISOString()
    };
  }

  async function pushTrainerState(scopes) {
    const profiles = readJson(CLOUD_KEYS.profiles, []);
    await ensureRemoteProfiles(profiles);

    if (scopes.has("all") || scopes.has("organization")) {
      await saveSyncRecord(null, "organization_snapshot", "main", organizationBundle());
    }

    for (const profile of profiles) {
      const remote = remoteProfilesByExternalId.get(String(profile.id));
      if (!remote) continue;
      if (scopes.has("all") || scopes.has("plan")) await saveSyncRecord(remote.id, "client_plan", "main", planBundle(profile));
      if (scopes.has("all") || scopes.has("activity")) await saveSyncRecord(remote.id, "client_activity", "main", activityBundle(profile));
    }
  }

  async function pushClientState() {
    const profiles = readJson(CLOUD_KEYS.profiles, []);
    const profile = profiles.find((item) => item && item.id) || null;
    if (!profile) throw new Error("Your trainer-created profile is not linked yet.");
    const remote = remoteProfilesByExternalId.get(String(profile.id));
    if (!remote) throw new Error("Your cloud profile is not available yet.");
    await saveSyncRecord(remote.id, "client_activity", "main", activityBundle(profile));
  }

  async function pushPending() {
    if (!cloudReady || !cloudClient || !cloudUser || cloudApplying || cloudPushing) return false;
    if (browserIsOffline()) {
      persistPendingScopes();
      cloudStatus("Offline · changes waiting", "offline");
      return false;
    }
    const scopes = new Set(pendingScopes.size ? pendingScopes : ["all"]);
    pendingScopes.clear();
    persistPendingScopes();
    cloudPushing = true;
    cloudStatus("Saving…", "syncing");
    try {
      if (cloudRole === "owner" || cloudRole === "trainer") await pushTrainerState(scopes);
      else await pushClientState();
      persistPendingScopes();
      cloudStatus("Saved across devices", "synced");
      return true;
    } catch (error) {
      scopes.forEach((scope) => pendingScopes.add(scope));
      persistPendingScopes();
      cloudStatus("Save waiting · tap account", "error");
      console.error("FIT 4 LIFE cloud save failed", error);
      return false;
    } finally {
      cloudPushing = false;
    }
  }

  function queueCloudSync(scope) {
    if (cloudApplying) return;
    pendingScopes.add(scope || "all");
    persistPendingScopes();
    clearTimeout(cloudPushTimer);
    cloudPushTimer = setTimeout(pushPending, 650);
  }

  async function flushCloudSync(scope) {
    if (!cloudApplying) {
      pendingScopes.add(scope || "all");
      persistPendingScopes();
    }
    clearTimeout(cloudPushTimer);
    if (!cloudReady || !cloudClient || !cloudUser) return false;
    if (cloudPushing) {
      const started = Date.now();
      while (cloudPushing && Date.now() - started < 8000) await new Promise((resolve) => setTimeout(resolve, 80));
    }
    return pushPending();
  }

  window.fit4lifeCloudSaveProfileNow = function fit4lifeCloudSaveProfileNow() {
    return flushCloudSync(cloudRole === "client" ? "activity" : "plan");
  };

  function applyOrganizationBundle(payload) {
    if (!payload) return;
    writeJson(CLOUD_KEYS.requests, payload.profileRequests || []);
    writeJson(CLOUD_KEYS.gymBrand, payload.gymBrand || {});
    writeJson(CLOUD_KEYS.gymEquipment, payload.gymEquipment || {});
    writeJson(CLOUD_KEYS.teams, payload.teams || []);
    writeJson(CLOUD_KEYS.marketPrograms, payload.marketPrograms || []);
    writeJson(CLOUD_KEYS.automations, payload.automations || []);
    writeJson(CLOUD_KEYS.automationAlerts, payload.automationAlerts || []);
    writeJson(CLOUD_KEYS.attentionState, payload.attentionState || {});
    writeJson(CLOUD_KEYS.exerciseLibraryEdits, payload.exerciseLibraryEdits || []);
    writeJson(CLOUD_KEYS.ownerRequests, payload.ownerRequests || []);
    writeJson(CLOUD_KEYS.coachTaskClaims, payload.coachTaskClaims || []);
    writeJson(CLOUD_KEYS.coachNotes, payload.coachNotes || []);
    writeJson(CLOUD_KEYS.calendarAudit, payload.calendarAudit || []);
    writeJson(CLOUD_KEYS.calendarNotices, payload.calendarNotices || []);
    writeJson(CLOUD_KEYS.calendarEvents, mergeRecords(readJson(CLOUD_KEYS.calendarEvents, []),payload.calendarTeamEvents || []));
    if (typeof window.applyExerciseLibraryEdits === "function") window.applyExerciseLibraryEdits();
  }

  function meaningfulIntake(value) {
    if (!value || typeof value !== "object" || Array.isArray(value)) return false;
    return Object.keys(value).some((key) => {
      const item = value[key];
      if (Array.isArray(item)) return item.length > 0;
      if (item && typeof item === "object") return Object.keys(item).length > 0;
      return item !== "" && item != null && item !== false;
    });
  }

  function intakeTime(intake,bundle) {
    const value = intake && (intake.updatedAt || intake.submittedAt) || bundle && (bundle.clientIntakeUpdatedAt || bundle.savedAt) || "";
    const parsed = Date.parse(value); return Number.isFinite(parsed) ? parsed : 0;
  }

  function newestClientIntake(plan,activity) {
    const planIntake = plan && plan.profile && plan.profile.intake || {}, activityIntake = activity && activity.clientIntake || {};
    const planReady = meaningfulIntake(planIntake), activityReady = meaningfulIntake(activityIntake);
    if (planReady && !activityReady) return planIntake;
    if (activityReady && !planReady) return activityIntake;
    if (!planReady && !activityReady) return {};
    return intakeTime(activityIntake,activity) >= intakeTime(planIntake,plan) ? activityIntake : planIntake;
  }

  function applyBundles(profileRows, records) {
    const byClientAndType = new Map();
    records.forEach((record) => {
      byClientAndType.set((record.client_id || "organization") + "|" + record.record_type, record.payload || {});
      remoteSyncRecords.set(syncRecordCacheKey(record.client_id, record.record_type, record.record_key), record);
    });
    const profiles = [];
    let assignments = [];
    let programs = [];
    let progress = [];
    let scans = [];
    let goals = [];
    let checkins = [];
    let metrics = [];
    let mentalPlans = [];
    let messages = [];
    let progressReceipts = (cloudRole === "owner" || cloudRole === "trainer")
      ? readJson(CLOUD_KEYS.progressReceipts, []).filter((item) => item && item.status === "draft")
      : [];
    let progressReceiptResponses = [];
    let summaryMeta = {};
    let clientDaily = {};
    let wearableConnections = {};
    let coachNotes = [];
    let calendarEvents = [];
    let workoutRequests = [];
    let clientActiveWorkout = null;

    profileRows.filter((row) => row.status === "active").forEach((row) => {
      remoteProfilesByExternalId.set(row.external_id, row);
      const plan = byClientAndType.get(row.id + "|client_plan") || {};
      const activity = byClientAndType.get(row.id + "|client_activity") || {};
      const profile = {
        ...(plan.profile || cachedProfileFromRow(row)),
        id: row.external_id || row.id,
        name: row.full_name,
        username: row.username,
        email: row.email || (plan.profile && plan.profile.email) || "",
        intake: newestClientIntake(plan,activity)
      };
      profiles.push(profile);
      const planAssignments = Array.isArray(plan.assignments) ? plan.assignments : plan.assignment ? [plan.assignment] : [];
      assignments = mergeRecords(assignments, planAssignments);
      programs = mergeRecords(programs, plan.programs);
      scans = mergeRecords(scans, plan.inBodyScans);
      goals = mergeRecords(goals, plan.bodyGoals);
      metrics = mergeRecords(metrics, plan.athleteMetrics);
      mentalPlans = mergeRecords(mentalPlans, plan.mentalPlans);
      progressReceipts = mergeRecords(progressReceipts, plan.progressReceipts);
      coachNotes = mergeRecords(coachNotes, plan.clientCoachNotes);
      calendarEvents = mergeRecords(calendarEvents, plan.calendarEvents);
      summaryMeta = Object.assign(summaryMeta, plan.summaryMeta || {});
      wearableConnections = Object.assign(wearableConnections, plan.wearableConnections || {});
      progress = mergeRecords(progress, activity.progress);
      checkins = mergeRecords(checkins, activity.checkIns);
      messages = mergeRecords(messages, activity.messages);
      progressReceiptResponses = mergeRecords(progressReceiptResponses, activity.progressReceiptResponses);
      workoutRequests = mergeRecords(workoutRequests, activity.workoutRequests);
      clientDaily = Object.assign(clientDaily, activity.daily || {});
      if (activity.activeWorkout && (!clientActiveWorkout || profile.auth_user_id === cloudUser.id)) clientActiveWorkout = activity.activeWorkout;

      const assignmentStates = Array.isArray(activity.assignmentStates) ? activity.assignmentStates : activity.assignmentState ? [activity.assignmentState] : [];
      assignmentStates.forEach((assignmentState) => {
        const index = assignments.findIndex((assignment) => assignment.id === assignmentState.id);
        if (index >= 0) assignments[index] = { ...assignments[index], ...assignmentState };
      });
    });

    writeJson(CLOUD_KEYS.profiles, profiles);
    writeJson(CLOUD_KEYS.assignments, assignments);
    writeJson(CLOUD_KEYS.programs, programs);
    writeJson(CLOUD_KEYS.progress, progress);
    writeJson(CLOUD_KEYS.scans, scans);
    writeJson(CLOUD_KEYS.goals, goals);
    writeJson(CLOUD_KEYS.summaryMeta, summaryMeta);
    writeJson(CLOUD_KEYS.checkins, checkins);
    writeJson(CLOUD_KEYS.metrics, metrics);
    writeJson(CLOUD_KEYS.mentalPlans, mentalPlans);
    writeJson(CLOUD_KEYS.clientMessages, messages);
    writeJson(CLOUD_KEYS.progressReceipts, progressReceipts);
    writeJson(CLOUD_KEYS.progressReceiptResponses, progressReceiptResponses);
    writeJson(CLOUD_KEYS.clientDaily, clientDaily);
    writeJson(CLOUD_KEYS.wearableConnections, wearableConnections);
    writeJson(CLOUD_KEYS.coachNotes, coachNotes);
    writeJson(CLOUD_KEYS.calendarEvents, calendarEvents);
    writeJson(CLOUD_KEYS.workoutRequests, workoutRequests);
    writeJson(CLOUD_KEYS.activeWorkout, clientActiveWorkout);

    if (cloudRole === "client" && profiles.length) {
      let existingActiveId = "";
      try { existingActiveId = localStorage.getItem(CLOUD_KEYS.activeClient) || ""; } catch (_) {}
      const stillValid = existingActiveId && profiles.some((item) => item.id === existingActiveId);
      if (!stillValid) localStorage.setItem(CLOUD_KEYS.activeClient, profiles[0].id);
    }
  }

  async function pullCloudState(initial) {
    if (!cloudClient || !cloudUser || cloudPushing) return;
    cloudStatus("Syncing…", "syncing");
    try {
      let profileResponse = await cloudClient
        .from("client_profiles")
        .select("id,organization_id,external_id,auth_user_id,full_name,username,email,status,updated_at")
        .eq("organization_id", cloudOrganizationId)
        .order("created_at", { ascending: true });
      if (profileResponse.error) throw profileResponse.error;

      const isTrainer = cloudRole === "owner" || cloudRole === "trainer";
      const localProfiles = readJson(CLOUD_KEYS.profiles, []);
      const mayImportLegacyFit4Life = cloudOrganizationSlug === "fit-4-life"
        && localStorage.getItem("fit4life_legacy_migration_complete_v1") !== "yes";
      if (initial && isTrainer && mayImportLegacyFit4Life && profileResponse.data.length === 0 && localProfiles.length) {
        cloudStatus("Uploading existing records…", "syncing");
        await pushTrainerState(new Set(["all"]));
        localStorage.setItem("fit4life_legacy_migration_complete_v1", "yes");
        profileResponse = await cloudClient
          .from("client_profiles")
          .select("id,organization_id,external_id,auth_user_id,full_name,username,email,status,updated_at")
          .eq("organization_id", cloudOrganizationId)
          .order("created_at", { ascending: true });
        if (profileResponse.error) throw profileResponse.error;
      }

      const recordResponse = await cloudClient
        .from("sync_records")
        .select("id,client_id,record_type,record_key,payload,version,updated_at")
        .eq("organization_id", cloudOrganizationId)
        .is("deleted_at", null);
      if (recordResponse.error) throw recordResponse.error;

      const visibleProfileRows = accountVisibleProfileRows(profileResponse.data, cloudRole, cloudUser.id);
      const visibleRecords = accountVisibleSyncRecords(recordResponse.data, visibleProfileRows, cloudRole);

      cloudApplying = true;
      remoteProfilesByExternalId.clear();
      applyBundles(visibleProfileRows, visibleRecords);
      if (isTrainer) {
        const orgRecord = visibleRecords.find((record) => record.client_id == null && record.record_type === "organization_snapshot");
        if (orgRecord) applyOrganizationBundle(orgRecord.payload);
        await loadTrainerRegistrationRequests();
      }
      await loadOrganizationSettings();
      cloudApplying = false;
      refreshVisibleApp();
      cloudStatus("Saved across devices", "synced");
    } catch (error) {
      cloudApplying = false;
      cloudStatus(navigator.onLine ? "Sync needs attention" : "Offline · cached data", navigator.onLine ? "error" : "offline");
      console.error("FIT 4 LIFE cloud load failed", error);
      if (initial) authMessage(error.message || "The cloud records could not be loaded.", true);
    }
  }

  function scheduleCloudPull() {
    if (!cloudReady || cloudPushing) return;
    clearTimeout(cloudPullTimer);
    cloudPullTimer = setTimeout(() => pullCloudState(false), 450);
  }

  function subscribeToChanges() {
    if (cloudChannel) cloudClient.removeChannel(cloudChannel);
    cloudChannel = cloudClient
      .channel("fit4life-live-" + cloudUser.id)
      .on("postgres_changes", { event: "*", schema: "public", table: "sync_records" }, scheduleCloudPull)
      .on("postgres_changes", { event: "*", schema: "public", table: "client_profiles" }, scheduleCloudPull)
      .on("postgres_changes", { event: "*", schema: "public", table: "registration_requests" }, () => loadTrainerRegistrationRequests())
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "organizations", filter:"id=eq." + cloudOrganizationId }, () => scheduleOrganizationSettingsPull(120))
      .subscribe();
  }

  function updateAccountUi() {
    const button = document.getElementById("cloudAccountBtn");
    if (!button) return;
    if (!cloudUser) {
      button.textContent = "Sign in";
      button.onclick = () => { showAuthMode("signin"); showAuthGate(true); };
      return;
    }
    button.textContent = (cloudRole === "owner" ? "Owner" : cloudRole === "trainer" ? "Trainer" : cloudRole === "client" ? "Client" : "Pending") + " · Sign out";
    button.onclick = window.fit4lifeCloudSignOut;
  }

  async function handleSession(session) {
    cloudUser = session && session.user ? session.user : null;
    if (!cloudUser) {
      cloudReady = false;
      window.fit4lifeCloudReady = false;
      window.fit4lifeCloudRole = "";
      cloudRole = "";
      publishCloudIdentity();
      if (cloudRegistrationChannel && cloudClient) cloudClient.removeChannel(cloudRegistrationChannel);
      cloudRegistrationChannel = null;
      updateAccountUi();
      if (authMode !== "signup" && authMode !== "trainer_signup" && authMode !== "reset" && authMode !== "update") showAuthMode("signin");
      showAuthGate(true);
      cloudStatus("Sign in to sync", "offline");
      return;
    }

    authMessage("Confirming your gym access…", false);
    const membership = await getMembership();
    if (!membership) {
      cloudReady = false;
      window.fit4lifeCloudReady = false;
      window.fit4lifeCloudRole = "";
      cloudRole = "";
      publishCloudIdentity();
      const request = await getMyRegistrationRequest();
      updateAccountUi();
      if (request) {
        showPendingRequest(request, false);
        cloudStatus(
          request.status === "rejected" ? "Registration needs attention" : request.requested_role === "trainer" ? "Trainer approval pending" : "Finish client activation",
          request.status === "rejected" ? "error" : "syncing"
        );
        subscribeToPendingRegistration();
      } else {
        showPendingRequest({ email: cloudUser.email || "", status: "pending" }, false);
        setText("cloudPendingIcon", "!");
        setText("cloudPendingTitle", "No client access assigned");
        setText("cloudPendingCopy", "This login exists, but it is not connected to a client profile or registration request for " + portalName() + ". Contact that gym's trainer.");
        cloudStatus("Access not assigned", "error");
      }
      return;
    }

    cloudRole = membership.role;
    cloudOrganizationId = membership.organization_id;
    isolateSensitiveCacheForUser(cloudUser.id, cloudRole);
    await loadOrganizationSettings();
    if (cloudRole === "client") {
      try { await cloudClient.rpc("complete_my_fit4life_registration"); } catch (_) {}
    }
    if (cloudRegistrationChannel) cloudClient.removeChannel(cloudRegistrationChannel);
    cloudRegistrationChannel = null;
    writeJson("fit4life_pending_signup_v1", null);
    window.fit4lifeCloudRole = cloudRole;
    publishCloudIdentity();
    if (cloudRole === "owner" || cloudRole === "trainer") {
      try { sessionStorage.setItem("fit4life_trainer_unlocked", "yes"); } catch (_) {}
    }
    updateAccountUi();
    cloudReady = true;
    window.fit4lifeCloudReady = true;
    let safeToPull = true;
    try {
      await hydrateRemoteProfileMap();
      if (pendingScopes.size) safeToPull = await pushPending();
    } catch (error) {
      safeToPull = false;
      cloudStatus(browserIsOffline() ? "Offline · changes waiting" : "Sync needs attention", browserIsOffline() ? "offline" : "error");
      console.error("FIT 4 LIFE pending-save recovery failed", error);
    }
    if (safeToPull) await pullCloudState(true);
    else authMessage("Your saved-on-this-device changes are still waiting to upload. They were not replaced by older cloud data.", true);
    if ((cloudRole === "owner" || cloudRole === "trainer") && window.fit4lifeCloudListTrainers) await window.fit4lifeCloudListTrainers();
    subscribeToChanges();
    startOrganizationSettingsRefresh();
    authMessage("", false);
    showAuthGate(false);

    if (typeof routeAuthenticatedWorkspace === "function") routeAuthenticatedWorkspace();
    else if (cloudRole === "client") {
      portalRole = "client";
      if (typeof openClientTab === "function") openClientTab("home");
    } else if (cloudRole === "owner" || cloudRole === "trainer") {
      portalRole = "trainer";
      if (typeof show === "function") show("trainer-menu");
    }
  }

  window.fit4lifeCloudSignIn = async function fit4lifeCloudSignIn() {
    if (!cloudClient) {
      authMessage("The cloud connection is not ready yet.", true);
      return false;
    }
    const email = normalizedEmail(document.getElementById("cloudAuthEmail").value);
    const password = document.getElementById("cloudAuthPassword").value;
    if (!email || !password) {
      authMessage("Enter your email and password.", true);
      return false;
    }
    const button = document.getElementById("cloudAuthSubmit");
    button.disabled = true;
    button.textContent = "Signing in…";
    authMessage("", false);
    try {
      const response = await cloudClient.auth.signInWithPassword({ email, password });
      if (response.error) {
        authMessage(response.error.message, true);
        return false;
      }
      await handleSession(response.data.session);
      return true;
    } catch (error) {
      authMessage("Could not reach the sign-in service. Check your connection and try again.", true);
      return false;
    } finally {
      button.disabled = false;
      button.textContent = "Sign in securely";
    }
  };

  window.fit4lifeCloudSignUp = async function fit4lifeCloudSignUp() {
    if (!cloudClient) {
      authMessage("The secure account service is still connecting. Try again in a moment.", true);
      return false;
    }
    if (!portalPublicRegistrationEnabled) {
      authMessage("This gym is not accepting public client account requests. Ask a trainer for an invitation.", true);
      return false;
    }
    const fullName = String(document.getElementById("cloudSignUpName").value || "").trim().replace(/\s+/g, " ");
    const username = String(document.getElementById("cloudSignUpUsername").value || "").trim().toLowerCase().replace(/^@/, "");
    const email = normalizedEmail(document.getElementById("cloudSignUpEmail").value);
    const password = document.getElementById("cloudSignUpPassword").value;
    const confirmation = document.getElementById("cloudSignUpConfirm").value;
    const consent = document.getElementById("cloudSignUpConsent").checked;
    if (fullName.length < 2) {
      authMessage("Enter your full name.", true);
      return false;
    }
    if (!/^[a-z0-9][a-z0-9._-]{2,39}$/.test(username)) {
      authMessage("Choose a username with 3–40 letters, numbers, periods, underscores, or hyphens.", true);
      return false;
    }
    if (!email || !email.includes("@")) {
      authMessage("Enter a valid email address.", true);
      return false;
    }
    if (password.length < 8) {
      authMessage("Use a password with at least 8 characters.", true);
      return false;
    }
    if (password !== confirmation) {
      authMessage("The passwords do not match.", true);
      return false;
    }
    if (!consent) {
      authMessage("Confirm that you will verify the email sent to your address.", true);
      return false;
    }
    const button = document.getElementById("cloudSignUpSubmit");
    button.disabled = true;
    button.textContent = "Creating account…";
    authMessage("Creating your secure client login…", false);
    try {
      const response = await cloudClient.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: authRedirectUrl(),
          data: {
            full_name: fullName,
            username,
            requested_role: "client",
            registration_source: "fit4life_web",
            organization_slug: portalOrganizationSlug || "fit-4-life"
          }
        }
      });
      if (response.error) {
        const message = /already|registered|exists/i.test(response.error.message || "")
          ? "If this email already has an account, sign in or use Forgot password. Otherwise, wait a minute and try again."
          : response.error.message;
        authMessage(message, true);
        return false;
      }
      const pending = { full_name: fullName, username, email, status: "pending", created_at: new Date().toISOString() };
      writeJson("fit4life_pending_signup_v1", pending);
      document.getElementById("cloudSignUpPassword").value = "";
      document.getElementById("cloudSignUpConfirm").value = "";
      if (response.data && response.data.session) await handleSession(response.data.session);
      else showPendingRequest(pending, true);
      return true;
    } catch (error) {
      authMessage("Could not reach the account service. Check your connection and try again.", true);
      return false;
    } finally {
      button.disabled = false;
      button.textContent = "Create client account";
    }
  };

  window.fit4lifeCloudTrainerSignUp = async function fit4lifeCloudTrainerSignUp() {
    if (!cloudClient) {
      authMessage("The secure account service is still connecting. Try again in a moment.", true);
      return false;
    }
    const fullName = String(document.getElementById("cloudTrainerSignUpName").value || "").trim().replace(/\s+/g, " ");
    const email = normalizedEmail(document.getElementById("cloudTrainerSignUpEmail").value);
    const password = document.getElementById("cloudTrainerSignUpPassword").value;
    const confirmation = document.getElementById("cloudTrainerSignUpConfirm").value;
    const consent = document.getElementById("cloudTrainerSignUpConsent").checked;
    if (fullName.length < 2) {
      authMessage("Enter your full name.", true);
      return false;
    }
    if (!email || !email.includes("@")) {
      authMessage("Enter a valid work email address.", true);
      return false;
    }
    if (password.length < 8) {
      authMessage("Use a password with at least 8 characters.", true);
      return false;
    }
    if (password !== confirmation) {
      authMessage("The passwords do not match.", true);
      return false;
    }
    if (!consent) {
      authMessage("Confirm the email-verification and staff-confirmation requirements.", true);
      return false;
    }
    const button = document.getElementById("cloudTrainerSignUpSubmit");
    button.disabled = true;
    button.textContent = "Submitting request…";
    authMessage("Creating a restricted trainer-access request…", false);
    try {
      const response = await cloudClient.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: authRedirectUrl(),
          data: {
            full_name: fullName,
            requested_role: "trainer",
            registration_source: "fit4life_trainer_request",
            organization_slug: portalOrganizationSlug || "fit-4-life"
          }
        }
      });
      if (response.error) {
        const message = /already|registered|exists/i.test(response.error.message || "")
          ? "If this email already has an account, sign in or use Forgot password. An approved trainer or owner can confirm a pending request for that verified login."
          : response.error.message;
        authMessage(message, true);
        return false;
      }
      const pending = {
        full_name: fullName,
        email,
        requested_role: "trainer",
        status: "pending",
        created_at: new Date().toISOString()
      };
      writeJson("fit4life_pending_signup_v1", pending);
      document.getElementById("cloudTrainerSignUpPassword").value = "";
      document.getElementById("cloudTrainerSignUpConfirm").value = "";
      if (response.data && response.data.session) await handleSession(response.data.session);
      else showPendingRequest(pending, true);
      return true;
    } catch (error) {
      authMessage("Could not reach the account service. Check your connection and try again.", true);
      return false;
    } finally {
      button.disabled = false;
      button.textContent = "Submit trainer request";
    }
  };

  window.fit4lifeCloudRequestPasswordReset = async function fit4lifeCloudRequestPasswordReset() {
    if (!cloudClient) {
      authMessage("The secure account service is still connecting.", true);
      return false;
    }
    const email = normalizedEmail(document.getElementById("cloudResetEmail").value || document.getElementById("cloudAuthEmail").value);
    if (!email || !email.includes("@")) {
      authMessage("Enter the email used for your training account.", true);
      return false;
    }
    const button = document.getElementById("cloudResetSubmit");
    button.disabled = true;
    button.textContent = "Sending…";
    try {
      const response = await cloudClient.auth.resetPasswordForEmail(email, { redirectTo: authRedirectUrl() });
      if (response.error) {
        authMessage(response.error.message, true);
        return false;
      }
      authMessage("If an account matches that email, a password-reset link is on its way.", false);
      return true;
    } catch (error) {
      authMessage("Could not reach the account service. Check your connection and try again.", true);
      return false;
    } finally {
      button.disabled = false;
      button.textContent = "Send password reset";
    }
  };

  window.fit4lifeCloudUpdatePassword = async function fit4lifeCloudUpdatePassword() {
    if (!cloudClient) return false;
    const password = document.getElementById("cloudNewPassword").value;
    const confirmation = document.getElementById("cloudNewPasswordConfirm").value;
    if (password.length < 8) {
      authMessage("Use a password with at least 8 characters.", true);
      return false;
    }
    if (password !== confirmation) {
      authMessage("The passwords do not match.", true);
      return false;
    }
    const button = document.getElementById("cloudUpdatePasswordSubmit");
    button.disabled = true;
    button.textContent = "Updating…";
    try {
      const response = await cloudClient.auth.updateUser({ password });
      if (response.error) {
        authMessage(response.error.message, true);
        return false;
      }
      document.getElementById("cloudNewPassword").value = "";
      document.getElementById("cloudNewPasswordConfirm").value = "";
      showAuthMode("signin");
      authMessage("Password updated. You can now sign in with the new password.", false);
      return true;
    } catch (error) {
      authMessage("Could not reach the account service. Check your connection and try again.", true);
      return false;
    } finally {
      button.disabled = false;
      button.textContent = "Update password";
    }
  };

  window.fit4lifeCloudCheckApproval = async function fit4lifeCloudCheckApproval() {
    if (!cloudClient) return false;
    const sessionResponse = await cloudClient.auth.getSession();
    if (sessionResponse.error || !sessionResponse.data.session) {
      const pending = readJson("fit4life_pending_signup_v1", {});
      showAuthMode("signin");
      if (pending.email) document.getElementById("cloudAuthEmail").value = pending.email;
      authMessage(pending.requested_role === "trainer"
        ? "After verifying your email, sign in to check whether an approved gym trainer or owner confirmed trainer access."
        : "After verifying your email, sign in to activate the client workspace.", false);
      return false;
    }
    await handleSession(sessionResponse.data.session);
    return true;
  };

  window.fit4lifeCloudApproveRegistration = async function fit4lifeCloudApproveRegistration(requestId) {
    if (!cloudClient || !(cloudRole === "owner" || cloudRole === "trainer")) return false;
    const response = await cloudClient.rpc("approve_fit4life_registration", { target_request: requestId });
    if (response.error) {
      if (typeof showToast === "function") showToast(response.error.message || "The account could not be approved");
      return false;
    }
    if (typeof showToast === "function") showToast("Client account approved and connected");
    await loadTrainerRegistrationRequests();
    await pullCloudState(false);
    return true;
  };

  window.fit4lifeCloudRejectRegistration = async function fit4lifeCloudRejectRegistration(requestId) {
    if (!cloudClient || !(cloudRole === "owner" || cloudRole === "trainer")) return false;
    if (!window.confirm("Reject this client account request? The person will keep their login but will not receive client access.")) return false;
    const response = await cloudClient.rpc("reject_fit4life_registration", { target_request: requestId, trainer_note: "Please contact the gym so a trainer can verify your account details." });
    if (response.error) {
      if (typeof showToast === "function") showToast(response.error.message || "The request could not be rejected");
      return false;
    }
    if (typeof showToast === "function") showToast("Account request rejected");
    await loadTrainerRegistrationRequests();
    return true;
  };

  window.fit4lifeCloudListTrainers = async function fit4lifeCloudListTrainers() {
    if (!cloudClient || !(cloudRole === "owner" || cloudRole === "trainer")) return [];
    const response = await cloudClient.rpc("list_fit4life_trainers");
    if (response.error) { console.error("Trainer list failed", response.error); return null; }
    window.fit4lifeCloudTrainers = Array.isArray(response.data) ? response.data : [];
    const mine = window.fit4lifeCloudTrainers.find((trainer) => trainer.user_id === cloudUser.id);
    if (mine && window.fit4lifeCloudIdentity) window.fit4lifeCloudIdentity.displayName = mine.display_name || window.fit4lifeCloudIdentity.displayName;
    return window.fit4lifeCloudTrainers;
  };

  window.fit4lifeCloudListTrainerRequests = async function fit4lifeCloudListTrainerRequests() {
    if (!cloudClient || !cloudOrganizationId || cloudRole !== "owner") return [];
    const response = await cloudClient
      .from("registration_requests")
      .select("id,user_id,email,full_name,requested_role,status,created_at,reviewed_by,reviewed_at,review_note")
      .eq("organization_id", cloudOrganizationId)
      .eq("requested_role", "trainer")
      .order("created_at", { ascending: false })
      .limit(100);
    if (response.error) { console.error("Trainer request history failed", response.error); return null; }
    window.fit4lifeCloudTrainerRequests = Array.isArray(response.data) ? response.data : [];
    return window.fit4lifeCloudTrainerRequests;
  };

  window.fit4lifeCloudApproveTrainer = async function fit4lifeCloudApproveTrainer(email, displayName) {
    if (!cloudClient || cloudRole !== "owner") return { ok:false,message:"Only an active owner can approve trainer access." };
    const response = await cloudClient.rpc("approve_fit4life_trainer_account", { target_email:normalizedEmail(email),target_display_name:String(displayName || "").trim() });
    if (response.error) return { ok:false,message:response.error.message || "Trainer approval failed." };
    await window.fit4lifeCloudListTrainers();
    return { ok:true,data:response.data };
  };

  window.fit4lifeCloudUpdateMyTrainerName = async function fit4lifeCloudUpdateMyTrainerName(displayName) {
    if (localInteractionTestMode() && (cloudRole === "owner" || cloudRole === "trainer")) {
      const name = String(displayName || "").trim(); if (name.length < 2) return {ok:false,message:"Enter the name clients should see."};
      try { localStorage.setItem("fit4life_interaction_staff_name_v1",name); } catch (_) { return {ok:false,message:"This browser could not save the sender name."}; }
      cloudUser.user_metadata = {...(cloudUser.user_metadata || {}),display_name:name};
      window.fit4lifeCloudIdentity = {...(window.fit4lifeCloudIdentity || {}),displayName:name};
      window.fit4lifeCloudTrainers = (window.fit4lifeCloudTrainers || []).map((trainer) => trainer.user_id === cloudUser.id ? {...trainer,display_name:name} : trainer);
      return {ok:true};
    }
    if (!cloudClient || !(cloudRole === "owner" || cloudRole === "trainer")) return { ok:false,message:"Trainer access is required." };
    const response = await cloudClient.rpc("update_my_fit4life_staff_name", { target_display_name:String(displayName || "").trim() });
    if (response.error) return { ok:false,message:response.error.message || "The display name could not be saved." };
    await window.fit4lifeCloudListTrainers();
    return { ok:true };
  };

  window.fit4lifeCloudDeactivateTrainer = async function fit4lifeCloudDeactivateTrainer(userId) {
    if (!cloudClient || cloudRole !== "owner") return { ok:false,message:"Only the owner can deactivate trainer accounts." };
    const response = await cloudClient.rpc("deactivate_fit4life_trainer_account", { target_user:userId });
    if (response.error) return { ok:false,message:response.error.message || "Trainer deactivation failed." };
    await window.fit4lifeCloudListTrainers();
    return { ok:true };
  };

  window.fit4lifeCloudSignOut = async function fit4lifeCloudSignOut() {
    if (pendingScopes.size && typeof window.confirm === "function" && !window.confirm("Some changes on this device have not reached the shared database yet. Sign out anyway and discard the pending upload?")) return;
    pendingScopes.clear();
    persistPendingScopes();
    if (cloudClient) await cloudClient.auth.signOut();
    if (cloudRegistrationChannel && cloudClient) cloudClient.removeChannel(cloudRegistrationChannel);
    cloudRegistrationChannel = null;
    if (cloudChannel && cloudClient) cloudClient.removeChannel(cloudChannel);
    cloudChannel = null;
    try { sessionStorage.removeItem("fit4life_trainer_unlocked"); } catch (_) {}
    cloudReady = false;
    cloudUser = null;
    cloudRole = "";
    window.fit4lifeCloudReady = false;
    window.fit4lifeCloudRole = "";
    window.fit4lifeCloudIdentity = null;
    window.fit4lifeCloudTrainers = [];
    updateAccountUi();
    showAuthMode("signin");
    showAuthGate(true);
    cloudStatus("Signed out", "offline");
  };

  window.fit4lifeCloudRetry = function fit4lifeCloudRetry() {
    authMessage("Retrying the secure connection…", false);
    initializeCloud();
  };

  function scopeForLocalKey(key) {
    if ([CLOUD_KEYS.progress, CLOUD_KEYS.checkins, CLOUD_KEYS.clientMessages, CLOUD_KEYS.progressReceiptResponses, CLOUD_KEYS.clientDaily, CLOUD_KEYS.activeWorkout, CLOUD_KEYS.workoutRequests].includes(key)) return "activity";
    if ([CLOUD_KEYS.profiles, CLOUD_KEYS.assignments, CLOUD_KEYS.programs, CLOUD_KEYS.summaryMeta, CLOUD_KEYS.scans, CLOUD_KEYS.goals, CLOUD_KEYS.metrics, CLOUD_KEYS.mentalPlans, CLOUD_KEYS.wearableConnections, CLOUD_KEYS.progressReceipts, CLOUD_KEYS.calendarEvents].includes(key)) return cloudRole === "client" ? "activity" : "plan";
    if ([CLOUD_KEYS.requests, CLOUD_KEYS.gymBrand, CLOUD_KEYS.gymEquipment, CLOUD_KEYS.teams, CLOUD_KEYS.marketPrograms, CLOUD_KEYS.automations, CLOUD_KEYS.automationAlerts, CLOUD_KEYS.attentionState, CLOUD_KEYS.exerciseLibraryEdits, CLOUD_KEYS.ownerRequests, CLOUD_KEYS.coachTaskClaims, CLOUD_KEYS.calendarAudit, CLOUD_KEYS.calendarNotices].includes(key)) return "organization";
    if (key === CLOUD_KEYS.coachNotes) return "all";
    return "all";
  }

  function wrapWriter(name, fixedScope, keyPosition) {
    const original = window[name];
    if (typeof original !== "function" || original.__cloudWrapped) return;
    const wrapped = function cloudAwareWriter() {
      const result = original.apply(this, arguments);
      if (result !== false) {
        const key = keyPosition == null ? "" : arguments[keyPosition];
        const requestedScope = typeof fixedScope === "function" ? fixedScope() : fixedScope;
        queueCloudSync(requestedScope || scopeForLocalKey(key));
      }
      return result;
    };
    wrapped.__cloudWrapped = true;
    window[name] = wrapped;
  }

  function installWriterHooks() {
    wrapWriter("writeProfiles", () => cloudRole === "client" ? "activity" : "plan");
    wrapWriter("writeAssignedWorkouts", "plan");
    wrapWriter("writeSavedPrograms", "plan");
    wrapWriter("writeProgress", "activity");
    wrapWriter("writeProfileRequests", "organization");
    wrapWriter("writeSummaryMeta", "plan");
    wrapWriter("writeInBodyScans", "plan");
    wrapWriter("writeBodyGoals", "plan");
    wrapWriter("writeLocalArray", null, 0);
    wrapWriter("writeLocalObject", null, 0);
    wrapWriter("saveActiveWorkoutState", "activity");
  }

  window.fit4lifeCloudDeleteProfile = async function fit4lifeCloudDeleteProfile(externalId, permanent) {
    if (!cloudClient || cloudRole !== "owner") return false;
    const remote = remoteProfilesByExternalId.get(String(externalId));
    if (!remote) return false;
    const response = permanent
      ? await cloudClient.from("client_profiles").delete().eq("id", remote.id)
      : await cloudClient.from("client_profiles").update({ status: "archived" }).eq("id", remote.id);
    if (response.error) {
      console.error("Cloud profile deletion failed", response.error);
      return false;
    }
    remoteProfilesByExternalId.delete(String(externalId));
    return true;
  };

  async function initializeCloud() {
    if (localInteractionTestMode()) { initializeLocalInteractionTest(); return; }
    showAuthGate(true);
    cloudStatus("Connecting…", "syncing");
    authMessage("Connecting to your gym's secure records…", false);
    try {
      const config = await loadPublicConfig();
      if (!window.supabase || typeof window.supabase.createClient !== "function") throw new Error("The secure sign-in library did not load. Check the internet connection and retry.");
      cloudClient = window.supabase.createClient(config.url, config.key, {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
      });
      await loadPortalContext();
      startOrganizationSettingsRefresh();
      installWriterHooks();
      const sessionResponse = await cloudClient.auth.getSession();
      if (sessionResponse.error) throw sessionResponse.error;
      const recoveryRedirect = /(?:[?#&])type=recovery(?:&|$)/.test(window.location.href);
      if (recoveryRedirect && sessionResponse.data.session) {
        cloudUser = sessionResponse.data.session.user;
        updateAccountUi();
        showAuthMode("update");
        showAuthGate(true);
        cloudStatus("Choose a new password", "syncing");
      } else {
        await handleSession(sessionResponse.data.session);
      }
      cloudClient.auth.onAuthStateChange((event, session) => {
        if (event === "SIGNED_OUT") handleSession(null);
        else if (event === "PASSWORD_RECOVERY") {
          cloudUser = session && session.user ? session.user : cloudUser;
          updateAccountUi();
          showAuthMode("update");
          showAuthGate(true);
          cloudStatus("Choose a new password", "syncing");
        }
        else if (event === "SIGNED_IN" && session && (!cloudUser || cloudUser.id !== session.user.id)) handleSession(session);
      });
    } catch (error) {
      cloudStatus("Cloud setup needed", "error");
      authMessage(error.message || "The cloud connection could not start.", true);
      showAuthGate(true);
    }
  }

  window.addEventListener("online", () => {
    cloudStatus("Reconnecting…", "syncing");
    if (cloudReady) {
      pendingScopes.add("all");
      persistPendingScopes();
      pushPending().then((saved) => { if (saved) pullCloudState(false); });
    } else initializeCloud();
  });
  window.addEventListener("offline", () => cloudStatus("Offline · changes cached", "offline"));

  if (window.__FIT4LIFE_TEST__) {
    window.fit4lifeCloudTestHooks = {
      CLOUD_KEYS,
      mergeRecords,
      mergeBundlePayload,
      planBundle,
      activityBundle,
      applyBundles,
      syncRecordCacheKey
    };
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initializeCloud, { once: true });
  else initializeCloud();
})();
