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
    teams: "fit4life_teams_v1",
    mentalPlans: "fit4life_mental_plans_v1",
    marketPrograms: "fit4life_market_programs_v1",
    wearableConnections: "fit4life_wearable_connections_v1",
    automations: "fit4life_automations_v1",
    automationAlerts: "fit4life_automation_alerts_v1",
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
    CLOUD_KEYS.clientMessages
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
  const pendingScopes = new Set();
  const remoteProfilesByExternalId = new Map();

  window.fit4lifeCloudRole = "";
  window.fit4lifeCloudReady = false;

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

  function sameClientName(a, b) {
    return Boolean(a && b) && normalizedName(a) === normalizedName(b);
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
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (!response.error && response.data) return response.data;

    const claim = await cloudClient.rpc("claim_my_client_profile");
    if (claim.error) return null;

    response = await cloudClient
      .from("memberships")
      .select("organization_id, role, is_active")
      .eq("user_id", cloudUser.id)
      .eq("is_active", true)
      .limit(1)
      .maybeSingle();
    return response.error ? null : response.data;
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
      teams: readJson(CLOUD_KEYS.teams, []),
      marketPrograms: readJson(CLOUD_KEYS.marketPrograms, []),
      automations: readJson(CLOUD_KEYS.automations, []),
      automationAlerts: readJson(CLOUD_KEYS.automationAlerts, []),
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
    writeJson(CLOUD_KEYS.teams, payload.teams || []);
    writeJson(CLOUD_KEYS.marketPrograms, payload.marketPrograms || []);
    writeJson(CLOUD_KEYS.automations, payload.automations || []);
    writeJson(CLOUD_KEYS.automationAlerts, payload.automationAlerts || []);
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
      if (initial && isTrainer && profileResponse.data.length === 0 && localProfiles.length) {
        cloudStatus("Uploading existing records…", "syncing");
        await pushTrainerState(new Set(["all"]));
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
      }
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
      .subscribe();
  }

  function updateAccountUi() {
    const button = document.getElementById("cloudAccountBtn");
    if (!button) return;
    if (!cloudUser) {
      button.textContent = "Sign in";
      button.onclick = () => showAuthGate(true);
      return;
    }
    button.textContent = (cloudRole === "owner" ? "Owner" : cloudRole === "trainer" ? "Trainer" : "Client") + " · Sign out";
    button.onclick = window.fit4lifeCloudSignOut;
  }

  async function handleSession(session) {
    cloudUser = session && session.user ? session.user : null;
    if (!cloudUser) {
      cloudReady = false;
      window.fit4lifeCloudReady = false;
      window.fit4lifeCloudRole = "";
      cloudRole = "";
      updateAccountUi();
      showAuthGate(true);
      cloudStatus("Sign in to sync", "offline");
      return;
    }

    authMessage("Confirming your FIT 4 LIFE access…", false);
    const membership = await getMembership();
    if (!membership) {
      cloudUser = null;
      authMessage("No trainer-created profile matches this account. Ask a trainer to add your email before signing in.", true);
      showAuthGate(true);
      return;
    }

    cloudRole = membership.role;
    cloudOrganizationId = membership.organization_id;
    window.fit4lifeCloudRole = cloudRole;
    if (cloudRole === "owner" || cloudRole === "trainer") {
      try { sessionStorage.setItem("fit4life_trainer_unlocked", "yes"); } catch (_) {}
    }
    updateAccountUi();
    await pullCloudState(true);
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

  window.fit4lifeCloudSignOut = async function fit4lifeCloudSignOut() {
    if (cloudClient) await cloudClient.auth.signOut();
    try { sessionStorage.removeItem("fit4life_trainer_unlocked"); } catch (_) {}
    cloudReady = false;
    cloudUser = null;
    cloudRole = "";
    window.fit4lifeCloudReady = false;
    window.fit4lifeCloudRole = "";
    updateAccountUi();
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
    if ([CLOUD_KEYS.requests, CLOUD_KEYS.gymBrand, CLOUD_KEYS.teams, CLOUD_KEYS.marketPrograms, CLOUD_KEYS.automations, CLOUD_KEYS.automationAlerts].includes(key)) return "organization";
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
    authMessage("Connecting to the shared FIT 4 LIFE records…", false);
    try {
      const config = await loadPublicConfig();
      if (!window.supabase || typeof window.supabase.createClient !== "function") throw new Error("The secure sign-in library did not load. Check the internet connection and retry.");
      cloudClient = window.supabase.createClient(config.url, config.key, {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
      });
      installWriterHooks();
      const sessionResponse = await cloudClient.auth.getSession();
      if (sessionResponse.error) throw sessionResponse.error;
      await handleSession(sessionResponse.data.session);
      cloudClient.auth.onAuthStateChange((event, session) => {
        if (event === "SIGNED_OUT") handleSession(null);
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
