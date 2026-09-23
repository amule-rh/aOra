let sb = null;

function supabaseConfigured() {
  return Boolean(window.SUPERHUMAN_CONFIG.SUPABASE_URL && window.SUPERHUMAN_CONFIG.SUPABASE_ANON_KEY);
}

function initSupabase() {
  if (!supabaseConfigured()) return null;
  if (!sb) sb = window.supabase.createClient(
    window.SUPERHUMAN_CONFIG.SUPABASE_URL,
    window.SUPERHUMAN_CONFIG.SUPABASE_ANON_KEY
  );
  return sb;
}

async function getSession() {
  const client = initSupabase();
  if (!client) return null;
  const { data } = await client.auth.getSession();
  return data.session || null;
}

async function signUpEmail(email, password, name) {
  const client = initSupabase();
  if (!client) throw new Error("Configura primero Supabase.");
  const { data, error } = await client.auth.signUp({
    email, password,
    options: { data: { name } }
  });
  if (error) throw error;
  return data;
}

async function signInEmail(email, password) {
  const client = initSupabase();
  if (!client) throw new Error("Configura primero Supabase.");
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

async function signOutUser() {
  const client = initSupabase();
  if (client) await client.auth.signOut();
}

async function loadProfile(userId) {
  const client = initSupabase();
  const { data, error } = await client.from("profiles").select("*").eq("id", userId).single();
  if (error && error.code !== "PGRST116") throw error;
  return data;
}

async function saveProfile(profile) {
  const client = initSupabase();
  const { data, error } = await client.from("profiles").upsert(profile).select().single();
  if (error) throw error;
  return data;
}

async function loadMeasurements(userId) {
  const client = initSupabase();
  const { data, error } = await client.from("measurements").select("*").eq("user_id", userId).order("measured_at", { ascending: true });
  if (error) throw error;
  return data || [];
}

async function addMeasurement(row) {
  const client = initSupabase();
  const { data, error } = await client.from("measurements").insert(row).select().single();
  if (error) throw error;
  return data;
}

async function loadTodayWorkout(userId, date) {
  const client = initSupabase();
  const { data, error } = await client.from("workout_plans").select("*").eq("user_id", userId).eq("workout_date", date).maybeSingle();
  if (error) throw error;
  return data;
}

async function saveWorkout(plan) {
  const client = initSupabase();
  const { data, error } = await client.from("workout_plans").upsert(plan, { onConflict: "user_id,workout_date" }).select().single();
  if (error) throw error;
  return data;
}

async function loadWorkoutLogs(userId, workoutPlanId) {
  const client = initSupabase();
  const { data, error } = await client.from("workout_logs").select("*").eq("user_id", userId).eq("workout_plan_id", workoutPlanId);
  if (error) throw error;
  return data || [];
}

async function saveWorkoutLog(row) {
  const client = initSupabase();
  const { data, error } = await client.from("workout_logs").upsert(row, { onConflict: "user_id,workout_plan_id,exercise_key" }).select().single();
  if (error) throw error;
  return data;
}

async function loadChat(userId, limit=80) {
  const client = initSupabase();
  const { data, error } = await client.from("chat_messages").select("*").eq("user_id", userId).order("created_at", { ascending: true }).limit(limit);
  if (error) throw error;
  return data || [];
}

async function saveChatMessage(row) {
  const client = initSupabase();
  const { error } = await client.from("chat_messages").insert(row);
  if (error) throw error;
}

async function loadActiveAffiliateProducts() {
  const client = initSupabase();
  if (!client) return [];
  const { data, error } = await client.from("affiliate_products").select("*").eq("active", true).order("priority", { ascending: false });
  if (error) throw error;
  return data || [];
}

async function loadUserActivities(userId, limit=100) {
  const client = initSupabase();
  const { data, error } = await client.from("activities").select("*").eq("user_id", userId).order("activity_at", { ascending: false }).limit(limit);
  if (error) throw error;
  return data || [];
}

async function loadActivityExercises(userId, activityIds) {
  if (!activityIds?.length) return {};
  const client = initSupabase();
  const { data, error } = await client.from("activity_exercises").select("*").eq("user_id", userId).in("activity_id", activityIds).order("exercise_order", { ascending: true });
  if (error) throw error;
  return (data || []).reduce((acc, row) => { (acc[row.activity_id] ||= []).push(row); return acc; }, {});
}

async function insertActivity(row) {
  const client = initSupabase();
  const { data, error } = await client.from("activities").insert(row).select().single();
  if (error) throw error;
  return data;
}

async function insertActivityExercises(userId, activityId, exercises) {
  const client = initSupabase();
  const rows = exercises.map((x, i) => ({ user_id:userId, activity_id:activityId, exercise_order:i, ...x }));
  if (!rows.length) return [];
  const { data, error } = await client.from("activity_exercises").insert(rows).select();
  if (error) throw error;
  return data || [];
}

async function uploadActivityImage(userId, file) {
  const client = initSupabase();
  if (!client) throw new Error("Supabase no está configurado.");
  const ext = (file.name?.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
  const path = `${userId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await client.storage.from("activity-images").upload(path, file, { upsert:false, contentType:file.type || "image/jpeg", cacheControl:"31536000" });
  if (error) throw error;
  return path;
}

async function getActivityImageUrl(path, expiresIn=3600) {
  const client = initSupabase();
  const { data, error } = await client.storage.from("activity-images").createSignedUrl(path, expiresIn);
  if (error) throw error;
  return data?.signedUrl || null;
}

async function deleteActivityImage(path) {
  const client = initSupabase();
  if (!path) return;
  const { error } = await client.storage.from("activity-images").remove([path]);
  if (error) throw error;
}

async function loadGear(userId){const client=initSupabase();const {data,error}=await client.from("gear").select("*").eq("user_id",userId).eq("active",true).order("created_at");if(error)throw error;return data||[];}
async function saveGear(row){const client=initSupabase();const {data,error}=await client.from("gear").upsert(row).select().single();if(error)throw error;return data;}
