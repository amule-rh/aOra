const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];

let session = null;
let user = null;
let profile = null;
let measurements = [];
let todayPlan = null;
let workoutLogs = [];
let chartWeight = null;
let chartWaist = null;
let affiliateReady = false;

const todayISO = () => new Date().toISOString().slice(0,10);

const ICONS = {
  squat: `<svg viewBox="0 0 48 48"><path d="M10 11h28M16 11v7m16-7v7M15 18c0 5 2 9 4 13l-4 9m18-22c0 5-2 9-4 13l4 9M19 31h10M14 40h7m13 0h-7" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  hinge: `<svg viewBox="0 0 48 48"><path d="M10 12h28M14 13l7 10-5 14m18-24-7 10 5 14M16 37h16" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  push: `<svg viewBox="0 0 48 48"><path d="M9 31h30M16 31l3-13m13 13-3-13M19 18h10M13 38h22" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  pull: `<svg viewBox="0 0 48 48"><path d="M9 10h30M14 10v25m20-25v25M14 35h20M19 17h10M20 25h8" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  legs: `<svg viewBox="0 0 48 48"><path d="M18 8v13l-4 21m16-34v13l4 21M14 42h8m10 0h8M18 21h12" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  core: `<svg viewBox="0 0 48 48"><path d="M15 10v28m18-28v28M19 15h10M19 33h10M13 24h22" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  cardio: `<svg viewBox="0 0 48 48"><path d="M6 26h9l4-11 7 22 4-11h12" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  mobility: `<svg viewBox="0 0 48 48"><circle cx="24" cy="9" r="3"/><path d="M24 13v10m0 0-9 8m9-8 9 8M17 19l7 4 7-4M19 39l5-16 5 16" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`
};

function setOrb(state, label) {
  const orb = $("#orb");
  if (orb) orb.dataset.state = state;
  const st = $("#coachState");
  if (st) st.textContent = label || state.toUpperCase();
}

function toast(message, type="") {
  const el = $("#toast");
  el.textContent = message;
  el.className = "toast show " + type;
  clearTimeout(window.__toast);
  window.__toast = setTimeout(() => el.className = "toast", 3200);
}

function showScreen(id) {
  $$(".screen").forEach(x => x.classList.toggle("active", x.id === id));
  $$(".nav-btn").forEach(x => x.classList.toggle("active", x.dataset.screen === id));
}

function renderAuth() {
  $("#authGate").classList.remove("hidden");
  $("#appShell").classList.add("hidden");
}

function renderApp() {
  $("#authGate").classList.add("hidden");
  $("#appShell").classList.remove("hidden");
  $("#userName").textContent = profile?.name || user?.email?.split("@")[0] || "Atleta";
}

async function boot() {
  initSupabase();
  if (!supabaseConfigured()) {
    $("#setupBanner").classList.remove("hidden");
    renderAuth();
    return;
  }
  const s = await getSession();
  if (!s) {
    renderAuth();
    return;
  }
  session = s; user = s.user;
  await loadUserData();
}

async function loadUserData() {
  profile = await loadProfile(user.id);
  if (profile?.affiliate_region && typeof setAffiliateRegion === "function") setAffiliateRegion(profile.affiliate_region, true);
  if (profile?.language && profile.language !== currentLanguage) await loadLanguage(profile.language);
  measurements = await loadMeasurements(user.id);
  await loadToday();
  await loadChatUI();
  renderApp();
  renderProfile();
  renderMeasurements();
  renderWorkout();
  if (typeof loadActivities === "function") await loadActivities(user.id);
  if (typeof renderEliteAthleteOS === "function") renderEliteAthleteOS();
  if (typeof loadAffiliateProducts === "function") { await loadAffiliateProducts(); affiliateReady=true; renderRecommendations(); renderAffiliateSection(); }
}

async function loadToday() {
  todayPlan = await loadTodayWorkout(user.id, todayISO());
  workoutLogs = todayPlan ? await loadWorkoutLogs(user.id, todayPlan.id) : [];
}

function renderProfile() {
  const p = profile || {};
  const form = $("#profileForm");
  if (!form) return;
  const fields = ["name","age","sex","weight_kg","height_cm","training_level","goal","injuries","equipment","available_space","physical_limitations","available_minutes","recovery","preferences"];
  fields.forEach(k => { const el = form.elements[k]; if (el) el.value = p[k] ?? ""; });
  $("#profileEmail").textContent = user?.email || "";
}

function renderMeasurements() {
  const tbody = $("#measurementRows");
  tbody.innerHTML = "";
  [...measurements].reverse().slice(0,12).forEach(m => {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td>${m.measured_at}</td><td>${m.weight_kg ?? "—"}</td><td>${m.body_fat_pct ?? "—"}</td><td>${m.chest_cm ?? "—"}</td><td>${m.waist_cm ?? "—"}</td><td>${m.biceps_left_cm ?? "—"}/${m.biceps_right_cm ?? "—"}</td><td>${m.thigh_left_cm ?? "—"}/${m.thigh_right_cm ?? "—"}</td>`;
    tbody.appendChild(tr);
  });
  const latest = measurements.at(-1);
  const first = measurements[0];
  $("#metricWeight").textContent = latest?.weight_kg != null ? `${latest.weight_kg} kg` : t("evolution.noData");
  $("#metricWaist").textContent = latest?.waist_cm != null ? `${latest.waist_cm} cm` : t("evolution.noData");
  $("#metricBF").textContent = latest?.body_fat_pct != null ? `${latest.body_fat_pct}%` : t("evolution.noData");
  $("#metricDelta").textContent = first && latest && first.weight_kg != null && latest.weight_kg != null ? `${(latest.weight_kg-first.weight_kg).toFixed(1)} kg` : t("evolution.noData");
  drawCharts();
}

function drawCharts() {
  if (typeof Chart === "undefined") return;
  const labels = measurements.map(m => m.measured_at);
  const weight = measurements.map(m => m.weight_kg);
  const waist = measurements.map(m => m.waist_cm);
  if (chartWeight) chartWeight.destroy();
  if (chartWaist) chartWaist.destroy();
  chartWeight = new Chart($("#weightChart"), {
    type:"line",
    data:{labels,datasets:[{label:t("evolution.chartWeight"),data:weight,tension:.35,borderWidth:2.5,pointRadius:3}]},
    options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{x:{grid:{display:false}},y:{grid:{color:"rgba(255,255,255,.06)"}}}}
  });
  chartWaist = new Chart($("#waistChart"), {
    type:"line",
    data:{labels,datasets:[{label:t("evolution.chartWaist"),data:waist,tension:.35,borderWidth:2.5,pointRadius:3}]},
    options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{x:{grid:{display:false}},y:{grid:{color:"rgba(255,255,255,.06)"}}}}
  });
}

function renderWorkout() {
  const area = $("#workoutCards");
  if (!todayPlan) {
    area.innerHTML = `<div class="empty-card"><div class="empty-orb">O</div><h3>${t("training.emptyTitle")}</h3><p>${t("training.emptyText")}</p><button id="generateWorkoutBtn" class="primary">${t("training.generate")}</button></div>`;
    $("#generateWorkoutBtn").onclick = generateTodayWorkout;
    return;
  }
  $("#workoutTitle").textContent = todayPlan.title;
  $("#workoutMeta").textContent = `${todayPlan.focus || t("training.adaptive")} · ${todayPlan.duration_minutes || profile.available_minutes || 45} min`;
  $("#workoutNote").textContent = todayPlan.coach_note || "";
  $("#adaptationNote").textContent = todayPlan.adaptation_note || "";
  const done = new Set(workoutLogs.filter(x => x.completed).map(x => x.exercise_key));
  area.innerHTML = todayPlan.exercises.map((ex,i) => {
    const completed = done.has(ex.key);
    return `<article class="exercise-card ${completed?"completed":""}">
      <button class="exercise-check" data-key="${ex.key}" aria-label="${t("training.completed")}">${completed?"✓":""}</button>
      <div class="exercise-icon">${ICONS[ex.icon] || ICONS.core}</div>
      <div class="exercise-main">
        <div class="exercise-top"><span class="exercise-index">${String(i+1).padStart(2,"0")}</span><span class="exercise-tag">${translateCategory(ex.category)}</span></div>
        <h3>${escapeHtml(ex.name)}</h3>
        <div class="exercise-prescription"><b>${ex.sets} × ${escapeHtml(String(ex.reps))}</b>${ex.rir != null?`<span>RIR ${ex.rir}</span>`:""}${ex.rpe != null?`<span>RPE ${ex.rpe}</span>`:""}${ex.rest?`<span>${escapeHtml(ex.rest)}</span>`:""}</div>
        <p>${escapeHtml(ex.note || "")}</p>
      </div>
    </article>`;
  }).join("");
  $$(".exercise-check").forEach(btn => btn.onclick = () => toggleExercise(btn.dataset.key));
}

async function generateTodayWorkout() {
  if (!profile) return toast(t("toast.profileFirst"), "warn");
  if (!window.SUPERHUMAN_CONFIG.GROQ_API_KEY) return toast(t("toast.groq"), "warn");
  setOrb("thinking","BUILDING TODAY");
  try {
    const plan = await generateWorkout(profile, measurements, todayPlan);
    todayPlan = await saveWorkout({
      user_id:user.id, workout_date:todayISO(), title:plan.title, focus:plan.focus,
      duration_minutes:plan.duration_minutes || profile.available_minutes || 45,
      coach_note:plan.coach_note, adaptation_note:plan.adaptation_note,
      exercises:plan.exercises || [], source:"aora"
    });
    workoutLogs = [];
    renderWorkout();
    showScreen("training");
    toast(t("toast.workoutGenerated"));
  } catch (e) {
    toast(e.message || "No se pudo generar.", "error");
  } finally {
    setOrb("idle","READY");
  }
}

async function toggleExercise(key) {
  const existing = workoutLogs.find(x => x.exercise_key === key);
  const completed = !existing?.completed;
  try {
    const row = await saveWorkoutLog({
      user_id:user.id, workout_plan_id:todayPlan.id, exercise_key:key,
      completed, completed_at:completed ? new Date().toISOString() : null
    });
    workoutLogs = workoutLogs.filter(x => x.exercise_key !== key);
    workoutLogs.push(row);
    renderWorkout();
  } catch (e) { toast(e.message, "error"); }
}

async function sendChat() {
  const input = $("#chatInput");
  const text = input.value.trim();
  if (!text) return;
  input.value = "";
  appendChat("user", text);
  setOrb("thinking","THINKING");
  try {
    await saveChatMessage({user_id:user.id, role:"user", content:text});
    const history = await loadChat(user.id, 18);
    const answer = await groqChat(history.map(m => ({role:m.role, content:m.content})), workoutContext(profile, measurements, todayPlan));
    await saveChatMessage({user_id:user.id, role:"assistant", content:answer});
    appendChat("assistant", answer);
    speak(answer);
  } catch (e) {
    appendChat("assistant", `No puedo responder ahora: ${e.message}`);
  } finally {
    setOrb("idle","READY");
  }
}

async function loadChatUI() {
  const history = await loadChat(user.id, 40);
  $("#chatMessages").innerHTML = "";
  history.forEach(m => appendChat(m.role, m.content));
}

function appendChat(role, content) {
  const el = document.createElement("div");
  el.className = `message ${role}`;
  const tokenRegex = /\[\[?PRODUCT:([a-z0-9-]+)\]?\]/gi;
  let html = escapeHtml(content).replace(/\n/g,"<br>");
  html = html.replace(tokenRegex, (_, id) => {
    const product=(affiliateProducts.length?affiliateProducts:AFFILIATE_PRODUCTS).find(p=>p.id===id);
    return product ? `<div class="chat-product-card">${productCard(product,true)}</div>` : "";
  });
  el.innerHTML = `<div class="message-bubble">${html}</div>`;
  $("#chatMessages").appendChild(el);
  $("#chatMessages").scrollTop = $("#chatMessages").scrollHeight;
}

function speak(text) {
  if (!("speechSynthesis" in window)) return;
  const utterance = new SpeechSynthesisUtterance(text.replace(/[*_#`]/g,""));
  utterance.lang = ({en:"en-US",es:"es-ES",fr:"fr-FR",pt:"pt-BR",de:"de-DE",zh:"zh-CN",ar:"ar-SA",hi:"hi-IN",ru:"ru-RU",id:"id-ID",ja:"ja-JP",ko:"ko-KR",tr:"tr-TR"})[currentLanguage] || "en-US";
  utterance.rate = .96;
  utterance.onstart = () => setOrb("speaking","SPEAKING");
  utterance.onend = () => setOrb("idle","READY");
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
}

function escapeHtml(v) {
  return String(v ?? "").replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

async function handleAuth(mode) {
  const email = $("#authEmail").value.trim();
  const password = $("#authPassword").value;
  const name = $("#authName").value.trim();
  if (!email || password.length < 6) return toast(t("toast.authFields"), "warn");
  try {
    $("#authSubmit").disabled = true;
    const data = mode === "signup" ? await signUpEmail(email,password,name) : await signInEmail(email,password);
    if (!data.session) {
      toast(t("toast.accountCreated"), "ok");
      return;
    }
    session = data.session; user = session.user;
    await loadUserData();
  } catch (e) {
    toast(e.message, "error");
  } finally { $("#authSubmit").disabled = false; }
}

function translateCategory(category){const k=String(category||"accessory").toLowerCase();return t(({main:"training.main",accessory:"training.accessory",conditioning:"training.conditioning",mobility:"training.mobility"})[k]||"training.accessory");}
function refreshAuthText(){const signup=$("#authMode").value==="signup";$("#authSubmit").textContent=signup?t("auth.signup"):t("auth.signin");$("#authToggle").textContent=signup?t("auth.haveAccount"):t("auth.createAccount");}
function bind() {
  $("#languageSelect")?.addEventListener("change",async e=>{await loadLanguage(e.target.value);refreshAuthText();renderProfile();renderMeasurements();renderWorkout();renderRecommendations();renderAffiliateSection();if(typeof renderEliteAthleteOS==="function")renderEliteAthleteOS();});
  $("#languageSelectAuth")?.addEventListener("change",async e=>{await loadLanguage(e.target.value);refreshAuthText();renderRecommendations();renderAffiliateSection();});
  $("#saveAuthConfig").onclick = () => {
    localStorage.setItem("aora_supabase_url", $("#authSupabaseUrl").value.trim());
    localStorage.setItem("aora_supabase_anon_key", $("#authSupabaseAnon").value.trim());
    localStorage.setItem("aora_groq_key", $("#authGroqKey").value.trim());
    localStorage.setItem("aora_groq_model", $("#authGroqModel").value.trim() || "openai/gpt-oss-120b");
    localStorage.setItem("aora_groq_vision_model", $("#authGroqVisionModel").value.trim() || "meta-llama/llama-4-scout-17b-16e-instruct");
    toast("Configuración guardada. Recargando…");
    setTimeout(() => location.reload(), 450);
  };
  $$(".nav-btn").forEach(b => b.onclick = () => { showScreen(b.dataset.screen); if(b.dataset.screen==="affiliate") renderAffiliateSection(); if(b.dataset.screen==="activities") renderActivityStats(); });
  $$("[data-affiliate-region]").forEach(e => e.addEventListener("change", async ev => { setAffiliateRegion(ev.target.value); renderAffiliateSection(); renderRecommendations(); }));
  $("#affiliateFilter")?.addEventListener("change", renderAffiliateSection);
  $("#sendBtn").onclick = sendChat;
  $("#chatInput").addEventListener("keydown", e => { if(e.key==="Enter" && !e.shiftKey){e.preventDefault();sendChat();}});
  $("#generateTop").onclick = generateTodayWorkout;
  $("#authToggle").onclick = () => {
    const signup = $("#authMode").value !== "signup";
    $("#authMode").value = signup ? "signup" : "signin";
    $("#authToggle").textContent = signup ? t("auth.haveAccount") : t("auth.createAccount");
    $("#authNameWrap").classList.toggle("hidden", !signup);
    $("#authSubmit").textContent = signup ? t("auth.signup") : t("auth.signin");
  };
  $("#authSubmit").onclick = () => handleAuth($("#authMode").value);
  $("#logoutBtn").onclick = async () => { await signOutUser(); location.reload(); };

  $("#profileForm").onsubmit = async e => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const data = Object.fromEntries(f.entries());
    ["age","weight_kg","height_cm","available_minutes"].forEach(k => data[k] = data[k] === "" ? null : Number(data[k]));
    try {
      profile = await saveProfile({id:user.id,...data,affiliate_region:affiliateRegion,language:currentLanguage});
      renderProfile(); renderApp(); toast(t("toast.profileSaved"));
    } catch(e){ toast(e.message,"error"); }
  };

  $("#measurementForm").onsubmit = async e => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const row = Object.fromEntries(f.entries());
    row.user_id = user.id;
    ["weight_kg","body_fat_pct","chest_cm","shoulders_cm","biceps_left_cm","biceps_right_cm","waist_cm","hips_cm","thigh_left_cm","thigh_right_cm","calf_cm","neck_cm"].forEach(k => row[k] = row[k] === "" ? null : Number(row[k]));
    try {
      await addMeasurement(row);
      measurements = await loadMeasurements(user.id);
      renderMeasurements(); toast(t("toast.measurementSaved"));
      e.currentTarget.reset();
      e.currentTarget.elements.measured_at.value = todayISO();
    } catch(e){ toast(e.message,"error"); }
  };

  $("#saveConfig").onclick = () => {
    const url = $("#supabaseUrl").value.trim();
    const key = $("#supabaseAnon").value.trim();
    const groq = $("#groqKey").value.trim();
    const model = $("#groqModel").value.trim();
    localStorage.setItem("aora_supabase_url",url);
    localStorage.setItem("aora_supabase_anon_key",key);
    localStorage.setItem("aora_groq_key",groq);
    localStorage.setItem("aora_groq_model",model || "openai/gpt-oss-120b");
    localStorage.setItem("aora_groq_vision_model",$("#groqVisionModel").value.trim() || "meta-llama/llama-4-scout-17b-16e-instruct");
    toast("Configuración guardada. Recargando…");
    setTimeout(()=>location.reload(),500);
  };
}

function loadConfigUI() {
  if ($("#authSupabaseUrl")) {
    $("#authSupabaseUrl").value = window.SUPERHUMAN_CONFIG.SUPABASE_URL;
    $("#authSupabaseAnon").value = window.SUPERHUMAN_CONFIG.SUPABASE_ANON_KEY;
    $("#authGroqKey").value = window.SUPERHUMAN_CONFIG.GROQ_API_KEY;
    $("#authGroqModel").value = window.SUPERHUMAN_CONFIG.GROQ_MODEL;
    $("#authGroqVisionModel").value = window.SUPERHUMAN_CONFIG.GROQ_VISION_MODEL;
  }
  $("#supabaseUrl").value = window.SUPERHUMAN_CONFIG.SUPABASE_URL;
  $("#supabaseAnon").value = window.SUPERHUMAN_CONFIG.SUPABASE_ANON_KEY;
  $("#groqKey").value = window.SUPERHUMAN_CONFIG.GROQ_API_KEY;
  $("#groqModel").value = window.SUPERHUMAN_CONFIG.GROQ_MODEL;
  $("#groqVisionModel").value = window.SUPERHUMAN_CONFIG.GROQ_VISION_MODEL;
  $("#measurementDate").value = todayISO();
}

document.addEventListener("DOMContentLoaded", async () => {
  bind();
  loadConfigUI();
  await initI18n();
  if(typeof bindActivities === "function") bindActivities();
  bindGps();
  if(typeof bindEliteActivities === "function") bindEliteActivities();
  if (typeof loadAffiliateProducts === "function") { await loadAffiliateProducts(); affiliateReady=true; renderRecommendations(); renderAffiliateSection(); }
  refreshAuthText();
  $("#orb").addEventListener("click", () => { $("#chatInput").focus(); setOrb("listening","LISTENING"); });
  $("#chatInput").addEventListener("input", () => {
    if ($("#chatInput").value.trim() && $("#orb").dataset.state === "idle") setOrb("listening","LISTENING");
  });
  await boot();
});
