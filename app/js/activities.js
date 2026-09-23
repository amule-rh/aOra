/* aOra Activities — photo-first activity ingestion, manual logging, feed and stats. */
const ACTIVITY_TYPES = ["running","cycling","walking","strength","hiit","mobility","swimming","hiking","rowing","trail","elliptical","other"];
let activities = [];
let activityExercises = {};
let activityStatsChart = null;
let pendingActivityImage = null;
let pendingActivityDraft = null;

const ACTIVITY_ICONS = {
  running:"🏃", cycling:"🚴", walking:"🚶", strength:"🏋️", hiit:"⚡", mobility:"🧘",
  swimming:"🏊", hiking:"🥾", rowing:"🚣", other:"◌"
};


function fileToDataUrl(file){
  return new Promise((resolve,reject)=>{
    const reader=new FileReader();
    reader.onerror=()=>reject(new Error("Could not read image."));
    reader.onload=()=>{
      const img=new Image();
      img.onload=()=>{
        const max=1800; const scale=Math.min(1,max/Math.max(img.width,img.height));
        const canvas=document.createElement("canvas"); canvas.width=Math.max(1,Math.round(img.width*scale)); canvas.height=Math.max(1,Math.round(img.height*scale));
        const ctx=canvas.getContext("2d"); ctx.drawImage(img,0,0,canvas.width,canvas.height);
        resolve(canvas.toDataURL("image/jpeg",.84));
      };
      img.onerror=()=>reject(new Error("Could not decode image."));
      img.src=reader.result;
    };
    reader.readAsDataURL(file);
  });
}

function activityTypeLabel(type){ return t(`activity.type.${type}`) || type; }
function activityDateValue(a){ return a?.activity_at ? new Date(a.activity_at).toLocaleString() : "—"; }
function formatDuration(sec){
  if(sec == null || sec === "") return "—";
  const s = Math.max(0, Math.round(Number(sec)));
  const h = Math.floor(s/3600), m = Math.floor((s%3600)/60), ss = s%60;
  return h ? `${h}h ${String(m).padStart(2,"0")}m` : `${m}m ${String(ss).padStart(2,"0")}s`;
}
function formatDistance(km){ return km == null || km === "" ? "—" : `${Number(km).toFixed(Number(km)<10?1:2)} km`; }
function formatPace(sec){
  if(sec == null || sec === "") return "—";
  const s=Math.round(Number(sec));
  return `${Math.floor(s/60)}:${String(s%60).padStart(2,"0")} /km`;
}
function formatActivityMetric(v, suffix=""){ return v == null || v === "" ? "—" : `${v}${suffix}`; }
function safeJson(v){ try{return JSON.stringify(v||{});}catch{return "{}";} }

function renderActivityOptions(select, includeBlank=false){
  if(!select) return;
  select.innerHTML = (includeBlank?`<option value="">—</option>`:"") + ACTIVITY_TYPES.map(x=>`<option value="${x}">${escapeHtml(activityTypeLabel(x))}</option>`).join("");
}

async function loadActivities(userId){
  try{
    activities = await loadUserActivities(userId, 100);
    const ids = activities.filter(a=>a.type==="strength").map(a=>a.id);
    activityExercises = ids.length ? await loadActivityExercises(userId, ids) : {};
    await hydrateActivityImages();
  }catch(e){
    console.warn("Activities module unavailable until the activity migration is applied:", e);
    activities=[]; activityExercises={};
  }
  renderActivities();
  renderActivityStats();
  renderActivityCoachSummary();
}

async function hydrateActivityImages(){
  await Promise.all(activities.map(async a=>{
    a._imageUrl = null;
    if(a.image_url){
      try{ a._imageUrl = await getActivityImageUrl(a.image_url); }catch(_e){}
    }
  }));
}

function activityCard(a){
  const img = a._imageUrl ? `<img src="${escapeHtml(a._imageUrl)}" alt="" loading="lazy">` : `<div class="activity-thumb-placeholder">${ACTIVITY_ICONS[a.type]||"◌"}</div>`;
  const hr = a.avg_heart_rate != null ? `<span>♥ ${Math.round(a.avg_heart_rate)} bpm</span>` : "";
  const dist = a.distance_km != null ? `<span>${formatDistance(a.distance_km)}</span>` : "";
  const cal = a.calories != null ? `<span>${Math.round(a.calories)} kcal</span>` : "";
  const pace = a.pace_seconds_per_km != null ? `<span>${formatPace(a.pace_seconds_per_km)}</span>` : "";
  return `<article class="activity-card" data-activity-id="${a.id}">
    <div class="activity-thumb">${img}</div>
    <div class="activity-body">
      <div class="activity-topline"><span class="activity-type">${ACTIVITY_ICONS[a.type]||"◌"} ${escapeHtml(activityTypeLabel(a.type))}</span><time>${escapeHtml(activityDateValue(a))}</time></div>
      <h3>${escapeHtml(a.title || activityTypeLabel(a.type))}</h3>
      <div class="activity-metrics"><b>${formatDuration(a.duration_seconds)}</b>${dist}${pace}${cal}${hr}</div>
      ${a.notes ? `<p>${escapeHtml(a.notes)}</p>` : ""}
      <button class="activity-detail-btn" data-activity-detail="${a.id}">${escapeHtml(t("activity.viewDetail"))}</button>
    </div>
  </article>`;
}

function renderActivities(){
  const grid=$("#activityFeed");
  if(!grid) return;
  if(!activities.length){
    grid.innerHTML=`<div class="empty-card"><div class="empty-orb">O</div><b>${escapeHtml(t("activity.noActivities"))}</b><p>${escapeHtml(t("activity.noActivitiesHint"))}</p></div>`;
    return;
  }
  grid.innerHTML=activities.map(activityCard).join("");
  $$('[data-activity-detail]').forEach(b=>b.addEventListener("click",()=>openActivityDetail(b.dataset.activityDetail)));
}

function openActivityDetail(id){
  const a=activities.find(x=>x.id===id); if(!a) return;
  const ex=activityExercises[id]||[];
  $("#activityModalTitle").textContent=a.title || activityTypeLabel(a.type);
  $("#activityModalBody").innerHTML=`
    <div class="activity-detail-grid">
      <div><span>${escapeHtml(t("activity.typeLabel"))}</span><b>${ACTIVITY_ICONS[a.type]||"◌"} ${escapeHtml(activityTypeLabel(a.type))}</b></div>
      <div><span>${escapeHtml(t("activity.date"))}</span><b>${escapeHtml(activityDateValue(a))}</b></div>
      <div><span>${escapeHtml(t("activity.duration"))}</span><b>${formatDuration(a.duration_seconds)}</b></div>
      <div><span>${escapeHtml(t("activity.distance"))}</span><b>${formatDistance(a.distance_km)}</b></div>
      <div><span>${escapeHtml(t("activity.pace"))}</span><b>${formatPace(a.pace_seconds_per_km)}</b></div>
      <div><span>${escapeHtml(t("activity.calories"))}</span><b>${formatActivityMetric(a.calories," kcal")}</b></div>
      <div><span>${escapeHtml(t("activity.avgHr"))}</span><b>${formatActivityMetric(a.avg_heart_rate," bpm")}</b></div>
      <div><span>${escapeHtml(t("activity.maxHr"))}</span><b>${formatActivityMetric(a.max_heart_rate," bpm")}</b></div>
    </div>
    ${a._imageUrl?`<img class="activity-detail-image" src="${escapeHtml(a._imageUrl)}" alt="">`:""}${a.route_data?.length?`<div class="activity-route-mini" id="routeDetail-${a.id}"></div>`:""}
    ${a.notes?`<div class="activity-detail-note">${escapeHtml(a.notes)}</div>`:""}
    ${ex.length?`<div class="activity-exercise-list"><h4>${escapeHtml(t("activity.exercises"))}</h4>${ex.map(x=>`<div class="activity-exercise-row"><b>${escapeHtml(x.exercise_name)}</b><span>${x.sets??"—"} × ${x.reps??"—"}${x.load?` · ${escapeHtml(x.load)}`:""}</span></div>`).join("")}</div>`:""}
    <details class="activity-raw"><summary>${escapeHtml(t("activity.rawData"))}</summary><pre>${escapeHtml(safeJson(a.raw_data))}</pre></details>`;
  $("#activityModal").classList.add("open"); if(a.route_data?.length && typeof L!=="undefined"){const el=$("#routeDetail-"+a.id); if(el){const m=L.map(el,{zoomControl:false}).setView([a.route_data[0].lat,a.route_data[0].lng],14);L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",{maxZoom:19,attribution:"© OpenStreetMap contributors"}).addTo(m);const line=L.polyline(a.route_data.map(p=>[p.lat,p.lng]),{weight:4}).addTo(m);m.fitBounds(line.getBounds(),{padding:[16,16]});setTimeout(()=>m.invalidateSize(),50);}}
}

function closeActivityModal(){ $("#activityModal")?.classList.remove("open"); }

function renderActivityStats(){
  const now=new Date();
  const startWeek=new Date(now); startWeek.setDate(now.getDate()-6); startWeek.setHours(0,0,0,0);
  const startMonth=new Date(now.getFullYear(),now.getMonth(),1);
  const week=activities.filter(a=>new Date(a.activity_at)>=startWeek);
  const month=activities.filter(a=>new Date(a.activity_at)>=startMonth);
  const sum=(arr,key)=>arr.reduce((n,a)=>n+(Number(a[key])||0),0);
  const set=(id,val)=>{const e=$(id);if(e)e.textContent=val;};
  set("activityWeekTime",formatDuration(sum(week,"duration_seconds")));
  set("activityWeekDistance",formatDistance(sum(week,"distance_km")));
  set("activityWeekCount",week.length);
  set("activityMonthTime",formatDuration(sum(month,"duration_seconds")));
  set("activityMonthDistance",formatDistance(sum(month,"distance_km")));
  set("activityMonthCount",month.length);
  if(typeof Chart==="undefined" || !$("#activityStatsChart")) return;
  const labels=[]; const values=[];
  for(let i=6;i>=0;i--){const d=new Date(now);d.setDate(now.getDate()-i);d.setHours(0,0,0,0);const end=new Date(d);end.setDate(d.getDate()+1);labels.push(d.toLocaleDateString(undefined,{weekday:"short"}));values.push(activities.filter(a=>{const x=new Date(a.activity_at);return x>=d&&x<end;}).reduce((n,a)=>n+(Number(a.duration_seconds)||0)/60,0));}
  if(activityStatsChart) activityStatsChart.destroy();
  activityStatsChart=new Chart($("#activityStatsChart"),{type:"bar",data:{labels,datasets:[{label:t("activity.minutes"),data:values,borderRadius:7}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{y:{beginAtZero:true}}}});
}

function renderActivityCoachSummary(){
  const e=$("#activityCoachSummary"); if(!e)return;
  if(!activities.length){e.textContent=t("activity.coachNoData");return;}
  const recent=activities[0];
  e.textContent=t("activity.coachSummary").replace("{type}",activityTypeLabel(recent.type)).replace("{duration}",formatDuration(recent.duration_seconds));
}

function resetActivityForm(){
  const f=$("#manualActivityForm"); if(f){f.reset(); if(f.elements.activity_at)f.elements.activity_at.value=new Date().toISOString().slice(0,16);}
  renderStrengthExerciseRows("#manualExerciseRows", []);
}

function openActivityUpload(){
  pendingActivityImage=null; pendingActivityDraft=null;
  $("#activityImageInput").value="";
  $("#activityUploadPreview").innerHTML="";
  $("#activityUploadStep").classList.remove("hidden");
  $("#activityConfirmStep").classList.add("hidden");
  $("#activityUploadModal").classList.add("open");
}
function closeActivityUpload(){ $("#activityUploadModal")?.classList.remove("open"); }

async function analyzeActivityImage(file){
  if(!file) return;
  if(!file.type.startsWith("image/")) return toast(t("activity.invalidImage"),"warn");
  if(file.size>12*1024*1024) return toast(t("activity.imageTooLarge"),"warn");
  pendingActivityImage=file;
  const preview=URL.createObjectURL(file);
  $("#activityUploadPreview").innerHTML=`<img src="${preview}" alt="">`;
  $("#activityAnalyzeBtn").disabled=true;
  $("#activityAnalysisStatus").textContent=t("activity.analyzing");
  setOrb("thinking","SCANNING");
  try{
    const vision=await extractActivityFromImage(file);
    pendingActivityDraft=vision;
    fillActivityConfirmation(vision);
    $("#activityUploadStep").classList.add("hidden");
    $("#activityConfirmStep").classList.remove("hidden");
    $("#activityAnalysisStatus").textContent=t("activity.analysisReady");
  }catch(e){
    $("#activityAnalysisStatus").textContent=t("activity.analysisFailed");
    toast(e.message||t("activity.analysisFailed"),"error");
  }finally{
    $("#activityAnalyzeBtn").disabled=false; setOrb("idle","READY");
  }
}

async function extractActivityFromImage(file){
  const dataUrl=await fileToDataUrl(file);
  const visionModel=window.SUPERHUMAN_CONFIG.GROQ_VISION_MODEL || "meta-llama/llama-4-scout-17b-16e-instruct";
  const prompt=`Analyze this fitness/training activity screenshot. Extract only information visibly supported by the image. Return VALID JSON ONLY with this schema:
{"type":"running|cycling|walking|strength|hiit|mobility|swimming|hiking|rowing|other","title":"","duration_seconds":null,"distance_km":null,"pace_seconds_per_km":null,"calories":null,"avg_heart_rate":null,"max_heart_rate":null,"activity_at":null,"source":"unknown|apple_fitness|garmin|strava|nike_run_club|hevy|strong|other","notes":"","confidence":0,"raw_metrics":{},"exercises":[{"exercise_name":"","sets":null,"reps":null,"load":null,"rest_seconds":null,"notes":""}]}
Rules: convert durations and pace to seconds; convert distance to km; use null when absent or unreadable; never infer hidden numbers; confidence is 0-1 based on legibility; date/time may be approximate only when visibly shown; for strength include each visible exercise/set/rep/load, otherwise [] .`;
  const res=await fetch("https://api.groq.com/openai/v1/chat/completions",{method:"POST",headers:{"Content-Type":"application/json","Authorization":`Bearer ${window.SUPERHUMAN_CONFIG.GROQ_API_KEY}`},body:JSON.stringify({model:visionModel,temperature:0,max_tokens:1800,messages:[{role:"system",content:"You are a precise fitness screenshot OCR and data extraction engine. Do not hallucinate."},{role:"user",content:[{type:"text",text:prompt},{type:"image_url",image_url:{url:dataUrl}}]}]})});
  if(!res.ok){const body=await res.text();throw new Error(`Vision ${res.status}: ${body.slice(0,220)}`);}
  const data=await res.json(); const raw=data.choices?.[0]?.message?.content||"";
  const clean=raw.replace(/^```json\s*/i,"").replace(/\s*```$/i,"").trim();
  let parsed; try{parsed=JSON.parse(clean);}catch(e){throw new Error(t("activity.badVisionJson"));}
  return normalizeActivityDraft(parsed);
}

function normalizeActivityDraft(x){
  const type=ACTIVITY_TYPES.includes(String(x.type||"").toLowerCase())?String(x.type).toLowerCase():"other";
  const n=(v)=>v==null||v===""?null:Number(v);
  return {type,title:String(x.title||"").slice(0,120),duration_seconds:n(x.duration_seconds),distance_km:n(x.distance_km),pace_seconds_per_km:n(x.pace_seconds_per_km),calories:n(x.calories),avg_heart_rate:n(x.avg_heart_rate),max_heart_rate:n(x.max_heart_rate),activity_at:x.activity_at||new Date().toISOString(),source:String(x.source||"unknown"),notes:String(x.notes||""),confidence:Math.max(0,Math.min(1,n(x.confidence)||0)),raw_metrics:x.raw_metrics||{},exercises:Array.isArray(x.exercises)?x.exercises:[]};
}

function fillActivityConfirmation(d){
  const f=$("#activityConfirmForm"); if(!f)return;
  f.elements.type.value=d.type; f.elements.title.value=d.title||activityTypeLabel(d.type); f.elements.activity_at.value=toDatetimeLocal(d.activity_at);
  ["duration_seconds","distance_km","pace_seconds_per_km","calories","avg_heart_rate","max_heart_rate"].forEach(k=>f.elements[k].value=d[k]??"");
  f.elements.notes.value=d.notes||""; f.elements.source.value=d.source||"unknown";
  $("#activityConfidence").textContent=`${Math.round(d.confidence*100)}%`;
  renderStrengthExerciseRows("#activityExerciseRows", d.exercises||[]);
}
function toDatetimeLocal(v){const d=new Date(v);return isNaN(d)?new Date().toISOString().slice(0,16):new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,16);}

function renderStrengthExerciseRows(selector, rows){
  const wrap=$(selector); if(!wrap)return;
  wrap.innerHTML=(rows||[]).map((x,i)=>`<div class="strength-row" data-row="${i}"><input name="exercise_name" placeholder="${escapeHtml(t("activity.exercise"))}" value="${escapeHtml(x.exercise_name||"")}"><input name="sets" type="number" min="1" placeholder="${escapeHtml(t("activity.sets"))}" value="${x.sets??""}"><input name="reps" placeholder="${escapeHtml(t("activity.reps"))}" value="${escapeHtml(x.reps??"")}"><input name="load" placeholder="${escapeHtml(t("activity.load"))}" value="${escapeHtml(x.load||"")}"><button type="button" class="icon-btn remove-exercise">×</button></div>`).join("");
  $$(".remove-exercise").forEach(b=>b.onclick=()=>{b.closest(".strength-row").remove();});
}
function collectExerciseRows(selector="#activityExerciseRows"){return $$(`${selector} .strength-row`).map(row=>{const i=row.querySelectorAll("input");return {exercise_name:i[0].value.trim(),sets:i[1].value?Number(i[1].value):null,reps:i[2].value.trim()||null,load:i[3].value.trim()||null};}).filter(x=>x.exercise_name);}

async function saveActivityFromForm(form, imageFile=null, extracted=null){
  const fd=new FormData(form); const row=Object.fromEntries(fd.entries());
  row.user_id=user.id; row.type=row.type||"other"; row.activity_at=row.activity_at?new Date(row.activity_at).toISOString():new Date().toISOString();
  ["duration_seconds","distance_km","pace_seconds_per_km","calories","avg_heart_rate","max_heart_rate"].forEach(k=>row[k]=row[k]===""?null:Number(row[k]));
  row.raw_data={source:"manual", ...(extracted||{})}; row.extraction_method=extracted?"vision":"manual";
  row.confidence=extracted?.confidence ?? 1;
  row.image_url=null;
  let imagePath=null;
  try{
    if(imageFile){
      imagePath=await uploadActivityImage(user.id,imageFile);
      row.image_url=imagePath;
    }
    const saved=await insertActivity(row);
    const ex=collectExerciseRows(form.id==="manualActivityForm"?"#manualExerciseRows":"#activityExerciseRows");
    if(ex.length) await insertActivityExercises(user.id,saved.id,ex);
    await loadActivities(user.id);
    closeActivityUpload();
    resetActivityForm();
    toast(t("activity.saved"),"ok");
    showScreen("activities");
  }catch(e){
    if(imagePath) await deleteActivityImage(imagePath).catch(()=>{});
    throw e;
  }
}

function openManualActivity(){
  resetActivityForm();
  $("#manualActivityModal").classList.add("open");
}
function closeManualActivity(){$("#manualActivityModal")?.classList.remove("open");}

function bindActivities(){
  renderActivityOptions($("#manualType"),false); renderActivityOptions($("#activityConfirmType"),false);
  $("#activityUploadBtn")?.addEventListener("click",openActivityUpload);
  $("#activityManualBtn")?.addEventListener("click",openManualActivity);
  $("#activityUploadClose")?.addEventListener("click",closeActivityUpload);
  $("#manualActivityClose")?.addEventListener("click",closeManualActivity);
  $("#activityModalClose")?.addEventListener("click",closeActivityModal);
  $("#activityImageInput")?.addEventListener("change",e=>analyzeActivityImage(e.target.files?.[0]));
  $("#activityAnalyzeBtn")?.addEventListener("click",()=>analyzeActivityImage($("#activityImageInput").files?.[0]));
  $("#addExerciseRow")?.addEventListener("click",()=>{const rows=collectExerciseRows("#activityExerciseRows");rows.push({});renderStrengthExerciseRows("#activityExerciseRows",rows);});
  $("#addManualExerciseRow")?.addEventListener("click",()=>{const rows=collectExerciseRows("#manualExerciseRows");rows.push({});renderStrengthExerciseRows("#manualExerciseRows",rows);});
  $("#activityConfirmForm")?.addEventListener("submit",async e=>{e.preventDefault();try{await saveActivityFromForm(e.currentTarget,pendingActivityImage,pendingActivityDraft);}catch(err){toast(err.message,"error");}});
  $("#manualActivityForm")?.addEventListener("submit",async e=>{e.preventDefault();try{await saveActivityFromForm(e.currentTarget,null,null);closeManualActivity();}catch(err){toast(err.message,"error");}});
  $("#activityFeed")?.addEventListener("click",e=>{const card=e.target.closest(".activity-card");if(card&&!e.target.closest("button"))openActivityDetail(card.dataset.activityId);});
  ["activityUploadModal","manualActivityModal","activityModal"].forEach(id=>$("#"+id)?.addEventListener("click",e=>{if(e.target.id===id)e.currentTarget.classList.remove("open");}));
}
