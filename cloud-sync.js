(function fit4LifeCloudModule() {
  "use strict";

  const CONFIG_CACHE_KEY = "fit4life_public_cloud_config_v1";
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
    exerciseLibraryEdits: "fit4life_exercise_library_edits_v1",
    clientDaily: "fit4life_client_daily_v1",
    clientMessages: "fit4life_client_messages_v1",
    activeWorkout: "fit4life_active_workout_v1",
    activeClient: "fit4life_active_client_v1"
  };

  const ARRAY_KEYS = new Set([
    CLOUD_KEYS.profiles, CLOUD_KEYS.assignments, CLOUD_KEYS.programs,
    CLOUD_KEYS.progress, CLOUD_KEYS.requests, CLOUD_KEYS.scans,
    CLOUD_KEYS.goals, CLOUD_KEYS.checkins, CLOUD_KEYS.metrics,
    CLOUD_KEYS.teams, CLOUD_KEYS.mentalPlans, CLOUD_KEYS.marketPrograms,
    CLOUD_KEYS.automations, CLOUD_KEYS.automationAlerts,
    CLOUD_KEYS.clientMessages, CLOUD_KEYS.exerciseLibraryEdits
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
  let cloudRegistrationRequests = [];
  let portalOrganizationId = "";
  let portalOrganizationSlug = "fit-4-life";
  let portalPublicRegistrationEnabled = true;
  let cloudOrganizationSlug = "";
  let authMode = "signin";
  const pendingScopes = new Set();
  const remoteProfilesByExternalId = new Map();

  window.fit4lifeCloudRole = "";
  window.fit4lifeCloudReady = false;
  window.fit4lifeCloudRegistrationRequests = [];
  window.fit4lifeCloudOrganizationId = "";
  window.fit4lifeCloudOrganizationSlug = "";
  window.fit4lifeCloudIdentity = null;
  window.fit4lifeCloudTrainers = [];

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

  function authRedirectUrl() {
    const configured = document.querySelector && document.querySelector('meta[name="fit4life-site-url"]');
    const value = configured && configured.content ? configured.content.trim().replace(/\/$/, "") : "";
    return value || window.location.origin;
  }

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
    if (request && request.status) rows.push(["Status", request.status.charAt(0).toUpperCase() + request.status.slice(1)]);
    meta.innerHTML = rows.map((row) => "<div><span>" + row[0] + "</span><b>" + String(row[1]).replace(/[&<>\"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '\"': "&quot;" }[character])) + "</b></div>").join("");
  }

  function showPendingRequest(request, needsVerification) {
    showAuthMode("pending");
    requestMeta(request || readJson("fit4life_pending_signup_v1", {}));
    const status = request && request.status ? request.status : "pending";
    if (status === "rejected") {
      setText("cloudPendingIcon", "!");
      setText("cloudPendingTitle", "Request needs attention");
      setText("cloudPendingCopy", request.review_note || "A trainer could not approve this request. Contact " + portalName() + " for help.");
      setText("cloudPendingCheck", "Check status again");
    } else if (needsVerification) {
      setText("cloudPendingIcon", "✉");
      setText("cloudPendingTitle", "Check your email");
      setText("cloudPendingCopy", "Open the verification email sent to your address. After verification, return here and sign in to activate your client workspace.");
      setText("cloudPendingCheck", "I verified my email");
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
      .select("id,organization_id,user_id,email,full_name,username,status,review_note,created_at,updated_at")
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
      .select("id,organization_id,user_id,email,full_name,username,status,review_note,created_at,updated_at")
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

  async function loadOrganizationSettings() {
    if (!cloudClient || !cloudOrganizationId) return null;
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
    return response.data;
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
    pendingScopes.add("organization");
    clearTimeout(cloudPushTimer);
    cloudPushTimer = setTimeout(pushPending, 200);
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

  async function findSyncRecord(clientId, recordType, recordKey) {
    let query = cloudClient
      .from("sync_records")
      .select("id")
      .eq("organization_id", cloudOrganizationId)
      .eq("record_type", recordType)
      .eq("record_key", recordKey || "default");
    query = clientId ? query.eq("client_id", clientId) : query.is("client_id", null);
    const response = await query.limit(1).maybeSingle();
    if (response.error) throw response.error;
    return response.data;
  }

  async function saveSyncRecord(clientId, recordType, recordKey, payload) {
    const existing = await findSyncRecord(clientId, recordType, recordKey);
    const record = {
      organization_id: cloudOrganizationId,
      client_id: clientId || null,
      record_type: recordType,
      record_key: recordKey || "default",
      payload,
      deleted_at: null
    };
    const response = existing
      ? await cloudClient.from("sync_records").update(record).eq("id", existing.id)
      : await cloudClient.from("sync_records").insert(record);
    if (response.error) throw response.error;
  }

  function profileProgress(profile) {
    return readJson(CLOUD_KEYS.progress, []).filter((item) => itemBelongsToProfile(item, profile));
  }

  function planBundle(profile) {
    const assignments = readJson(CLOUD_KEYS.assignments, []);
    const progress = profileProgress(profile);
    const progressIds = new Set(progress.map((entry) => entry.id).filter(Boolean));
    const summaryMeta = readJson(CLOUD_KEYS.summaryMeta, {});
    const filteredMeta = {};
    Object.keys(summaryMeta || {}).forEach((id) => { if (progressIds.has(id)) filteredMeta[id] = summaryMeta[id]; });
    const wearables = readJson(CLOUD_KEYS.wearableConnections, {});
    const wearableForProfile = wearables && wearables[profile.id] ? { [profile.id]: wearables[profile.id] } : {};
    return {
      version: 1,
      profile,
      assignment: assignments.find((item) => item.profileId === profile.id || sameClientName(item.client, profile.name)) || null,
      programs: readJson(CLOUD_KEYS.programs, []).filter((item) => itemBelongsToProfile(item, profile)),
      inBodyScans: readJson(CLOUD_KEYS.scans, []).filter((item) => itemBelongsToProfile(item, profile)),
      bodyGoals: readJson(CLOUD_KEYS.goals, []).filter((item) => itemBelongsToProfile(item, profile)),
      summaryMeta: filteredMeta,
      athleteMetrics: readJson(CLOUD_KEYS.metrics, []).filter((item) => itemBelongsToProfile(item, profile)),
      mentalPlans: readJson(CLOUD_KEYS.mentalPlans, []).filter((item) => itemBelongsToProfile(item, profile)),
      wearableConnections: wearableForProfile,
      savedAt: new Date().toISOString()
    };
  }

  function activityBundle(profile) {
    const assignments = readJson(CLOUD_KEYS.assignments, []);
    const assignment = assignments.find((item) => item.profileId === profile.id || sameClientName(item.client, profile.name));
    const daily = readJson(CLOUD_KEYS.clientDaily, {});
    const activeWorkout = readJson(CLOUD_KEYS.activeWorkout, null);
    return {
      version: 1,
      profileId: profile.id,
      progress: profileProgress(profile),
      checkIns: readJson(CLOUD_KEYS.checkins, []).filter((item) => itemBelongsToProfile(item, profile)),
      messages: readJson(CLOUD_KEYS.clientMessages, []).filter((item) => itemBelongsToProfile(item, profile)),
      daily: daily && daily[profile.id] ? { [profile.id]: daily[profile.id] } : {},
      activeWorkout: activeWorkout && activeWorkout.profileId === profile.id ? activeWorkout : null,
      assignmentState: assignment ? {
        id: assignment.id,
        status: assignment.status,
        startedAt: assignment.startedAt || null,
        completedAt: assignment.completedAt || null,
        reviewedAt: assignment.reviewedAt || null,
        clientReview: assignment.clientReview || null
      } : null,
      savedAt: new Date().toISOString()
    };
  }

  function organizationBundle() {
    return {
      version: 1,
      profileRequests: readJson(CLOUD_KEYS.requests, []),
      gymBrand: readJson(CLOUD_KEYS.gymBrand, {}),
      gymEquipment: readJson(CLOUD_KEYS.gymEquipment, {}),
      teams: readJson(CLOUD_KEYS.teams, []),
      marketPrograms: readJson(CLOUD_KEYS.marketPrograms, []),
      automations: readJson(CLOUD_KEYS.automations, []),
      automationAlerts: readJson(CLOUD_KEYS.automationAlerts, []),
      exerciseLibraryEdits: readJson(CLOUD_KEYS.exerciseLibraryEdits, []),
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
    if (!cloudReady || !cloudClient || !cloudUser || cloudApplying || cloudPushing) return;
    if (!navigator.onLine) {
      cloudStatus("Offline · changes waiting", "offline");
      return;
    }
    const scopes = new Set(pendingScopes.size ? pendingScopes : ["all"]);
    pendingScopes.clear();
    cloudPushing = true;
    cloudStatus("Saving…", "syncing");
    try {
      if (cloudRole === "owner" || cloudRole === "trainer") await pushTrainerState(scopes);
      else await pushClientState();
      cloudStatus("Saved across devices", "synced");
    } catch (error) {
      scopes.forEach((scope) => pendingScopes.add(scope));
      cloudStatus("Save waiting · tap account", "error");
      console.error("FIT 4 LIFE cloud save failed", error);
    } finally {
      cloudPushing = false;
    }
  }

  function queueCloudSync(scope) {
    if (cloudApplying) return;
    pendingScopes.add(scope || "all");
    clearTimeout(cloudPushTimer);
    cloudPushTimer = setTimeout(pushPending, 650);
  }

  function applyOrganizationBundle(payload) {
    if (!payload) return;
    writeJson(CLOUD_KEYS.requests, payload.profileRequests || []);
    writeJson(CLOUD_KEYS.gymBrand, payload.gymBrand || {});
    writeJson(CLOUD_KEYS.gymEquipment, payload.gymEquipment || {});
    writeJson(CLOUD_KEYS.teams, payload.teams || []);
    writeJson(CLOUD_KEYS.marketPrograms, payload.marketPrograms || []);
    writeJson(CLOUD_KEYS.automations, payload.automations || []);
    writeJson(CLOUD_KEYS.automationAlerts, payload.automationAlerts || []);
    writeJson(CLOUD_KEYS.exerciseLibraryEdits, payload.exerciseLibraryEdits || []);
    if (typeof window.applyExerciseLibraryEdits === "function") window.applyExerciseLibraryEdits();
  }

  function applyBundles(profileRows, records) {
    const byClientAndType = new Map();
    records.forEach((record) => byClientAndType.set((record.client_id || "organization") + "|" + record.record_type, record.payload || {}));
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
    let summaryMeta = {};
    let clientDaily = {};
    let wearableConnections = {};
    let clientActiveWorkout = null;

    profileRows.filter((row) => row.status === "active").forEach((row) => {
      remoteProfilesByExternalId.set(row.external_id, row);
      const plan = byClientAndType.get(row.id + "|client_plan") || {};
      const activity = byClientAndType.get(row.id + "|client_activity") || {};
      const profile = { ...(plan.profile || cachedProfileFromRow(row)), id: row.external_id || row.id, name: row.full_name, username: row.username, email: row.email || (plan.profile && plan.profile.email) || "" };
      profiles.push(profile);
      if (plan.assignment) assignments.push(plan.assignment);
      programs = mergeRecords(programs, plan.programs);
      scans = mergeRecords(scans, plan.inBodyScans);
      goals = mergeRecords(goals, plan.bodyGoals);
      metrics = mergeRecords(metrics, plan.athleteMetrics);
      mentalPlans = mergeRecords(mentalPlans, plan.mentalPlans);
      summaryMeta = Object.assign(summaryMeta, plan.summaryMeta || {});
      wearableConnections = Object.assign(wearableConnections, plan.wearableConnections || {});
      progress = mergeRecords(progress, activity.progress);
      checkins = mergeRecords(checkins, activity.checkIns);
      messages = mergeRecords(messages, activity.messages);
      clientDaily = Object.assign(clientDaily, activity.daily || {});
      if (activity.activeWorkout && (!clientActiveWorkout || profile.auth_user_id === cloudUser.id)) clientActiveWorkout = activity.activeWorkout;

      if (activity.assignmentState) {
        const index = assignments.findIndex((assignment) => assignment.profileId === profile.id || assignment.id === activity.assignmentState.id);
        if (index >= 0) assignments[index] = { ...assignments[index], ...activity.assignmentState };
      }
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
    writeJson(CLOUD_KEYS.clientDaily, clientDaily);
    writeJson(CLOUD_KEYS.wearableConnections, wearableConnections);
    writeJson(CLOUD_KEYS.activeWorkout, clientActiveWorkout);

    if (cloudRole === "client" && profiles[0]) localStorage.setItem(CLOUD_KEYS.activeClient, profiles[0].id);
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

      cloudApplying = true;
      remoteProfilesByExternalId.clear();
      applyBundles(profileResponse.data, recordResponse.data || []);
      if (isTrainer) {
        const orgRecord = (recordResponse.data || []).find((record) => record.client_id == null && record.record_type === "organization_snapshot");
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
      if (authMode !== "signup" && authMode !== "reset" && authMode !== "update") showAuthMode("signin");
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
        cloudStatus(request.status === "rejected" ? "Registration needs attention" : "Finish client activation", request.status === "rejected" ? "error" : "syncing");
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
    await pullCloudState(true);
    if ((cloudRole === "owner" || cloudRole === "trainer") && window.fit4lifeCloudListTrainers) await window.fit4lifeCloudListTrainers();
    cloudReady = true;
    window.fit4lifeCloudReady = true;
    subscribeToChanges();
    authMessage("", false);
    showAuthGate(false);

    if (cloudRole === "client") {
      portalRole = "client";
      if (typeof openClientTab === "function") openClientTab("home");
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
    const response = await cloudClient.auth.signInWithPassword({ email, password });
    button.disabled = false;
    button.textContent = "Sign in securely";
    if (response.error) {
      authMessage(response.error.message, true);
      return false;
    }
    await handleSession(response.data.session);
    return true;
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
    button.disabled = false;
    button.textContent = "Create client account";
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
    const response = await cloudClient.auth.resetPasswordForEmail(email, { redirectTo: authRedirectUrl() });
    button.disabled = false;
    button.textContent = "Send password reset";
    if (response.error) {
      authMessage(response.error.message, true);
      return false;
    }
    authMessage("If an account matches that email, a password-reset link is on its way.", false);
    return true;
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
    const response = await cloudClient.auth.updateUser({ password });
    button.disabled = false;
    button.textContent = "Update password";
    if (response.error) {
      authMessage(response.error.message, true);
      return false;
    }
    document.getElementById("cloudNewPassword").value = "";
    document.getElementById("cloudNewPasswordConfirm").value = "";
    showAuthMode("signin");
    authMessage("Password updated. You can now sign in with the new password.", false);
    return true;
  };

  window.fit4lifeCloudCheckApproval = async function fit4lifeCloudCheckApproval() {
    if (!cloudClient) return false;
    const sessionResponse = await cloudClient.auth.getSession();
    if (sessionResponse.error || !sessionResponse.data.session) {
      const pending = readJson("fit4life_pending_signup_v1", {});
      showAuthMode("signin");
      if (pending.email) document.getElementById("cloudAuthEmail").value = pending.email;
      authMessage("After verifying your email, sign in to activate the client workspace.", false);
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

  window.fit4lifeCloudApproveTrainer = async function fit4lifeCloudApproveTrainer(email, displayName) {
    if (!cloudClient || cloudRole !== "owner") return { ok:false,message:"Only the owner can approve trainer accounts." };
    const response = await cloudClient.rpc("approve_fit4life_trainer_account", { target_email:normalizedEmail(email),target_display_name:String(displayName || "").trim() });
    if (response.error) return { ok:false,message:response.error.message || "Trainer approval failed." };
    await window.fit4lifeCloudListTrainers();
    return { ok:true,data:response.data };
  };

  window.fit4lifeCloudUpdateMyTrainerName = async function fit4lifeCloudUpdateMyTrainerName(displayName) {
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
    if (cloudClient) await cloudClient.auth.signOut();
    if (cloudRegistrationChannel && cloudClient) cloudClient.removeChannel(cloudRegistrationChannel);
    cloudRegistrationChannel = null;
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
    if ([CLOUD_KEYS.progress, CLOUD_KEYS.checkins, CLOUD_KEYS.clientMessages, CLOUD_KEYS.clientDaily, CLOUD_KEYS.activeWorkout].includes(key)) return "activity";
    if ([CLOUD_KEYS.profiles, CLOUD_KEYS.assignments, CLOUD_KEYS.programs, CLOUD_KEYS.summaryMeta, CLOUD_KEYS.scans, CLOUD_KEYS.goals, CLOUD_KEYS.metrics, CLOUD_KEYS.mentalPlans, CLOUD_KEYS.wearableConnections].includes(key)) return cloudRole === "client" ? "activity" : "plan";
    if ([CLOUD_KEYS.requests, CLOUD_KEYS.gymBrand, CLOUD_KEYS.gymEquipment, CLOUD_KEYS.teams, CLOUD_KEYS.marketPrograms, CLOUD_KEYS.automations, CLOUD_KEYS.automationAlerts, CLOUD_KEYS.exerciseLibraryEdits].includes(key)) return "organization";
    return "all";
  }

  function wrapWriter(name, fixedScope, keyPosition) {
    const original = window[name];
    if (typeof original !== "function" || original.__cloudWrapped) return;
    const wrapped = function cloudAwareWriter() {
      const result = original.apply(this, arguments);
      if (result !== false) {
        const key = keyPosition == null ? "" : arguments[keyPosition];
        queueCloudSync(fixedScope || scopeForLocalKey(key));
      }
      return result;
    };
    wrapped.__cloudWrapped = true;
    window[name] = wrapped;
  }

  function installWriterHooks() {
    wrapWriter("writeProfiles", "plan");
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
    if (!cloudClient || !(cloudRole === "owner" || cloudRole === "trainer")) return false;
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
      pushPending().then(() => pullCloudState(false));
    } else initializeCloud();
  });
  window.addEventListener("offline", () => cloudStatus("Offline · changes cached", "offline"));

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initializeCloud, { once: true });
  else initializeCloud();
})();
