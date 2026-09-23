/* aOra Athlete OS: lightweight, explainable training intelligence layer. */
function activityLoadScore(a){
  const duration=Math.max(0,Number(a.duration_seconds)||0)/60;
  let intensity=1;
  if(Number(a.avg_heart_rate)>0) intensity=Math.min(2,Math.max(.65,Number(a.avg_heart_rate)/140));
  else if(Number(a.pace_seconds_per_km)>0) intensity=Math.min(1.8,Math.max(.65,300/Number(a.pace_seconds_per_km)));
  const elevation=(Number(a.elevation_gain_m)||0)/1000;
  return duration*intensity + elevation*2;
}
function eliteWindow(days){
  const now=Date.now(), start=now-days*86400000;
  return (typeof activities!=='undefined'?activities:[]).filter(a=>new Date(a.activity_at||a.created_at).getTime()>=start);
}
function eliteTrainingSnapshot(){
  const recent=eliteWindow(7), baseline=eliteWindow(35).filter(a=>new Date(a.activity_at||a.created_at).getTime()<Date.now()-7*86400000);
  const load7=recent.reduce((s,a)=>s+activityLoadScore(a),0);
  const baselineAvg=baseline.length?baseline.reduce((s,a)=>s+activityLoadScore(a),0)/4:0;
  const ratio=baselineAvg?load7/baselineAvg:null;
  const lowerBody=recent.filter(a=>['running','cycling','walking','hiking','trail','elliptical','strength'].includes(a.type)).length;
  const enduranceKm=recent.reduce((s,a)=>s+(Number(a.distance_km)||0),0);
  const sessions=recent.length;
  let status='balanced';
  if(ratio!=null&&ratio>1.35) status='high';
  else if(ratio!=null&&ratio<.55&&sessions===0) status='low';
  return {load7,baselineAvg,ratio,status,sessions,enduranceKm,lowerBody};
}
function renderEliteAthleteOS(){
  const snap=eliteTrainingSnapshot();
  const set=(id,v)=>{const e=$(id);if(e)e.textContent=v;};
  set('osLoad7',Math.round(snap.load7));
  set('osSessions7',snap.sessions);
  set('osDistance7',snap.enduranceKm.toFixed(1)+' km');
  const status=snap.status==='high'?t('activity.os.high'):snap.status==='low'?t('activity.os.low'):t('activity.os.balanced');
  set('osStatus',status);
  const note=snap.status==='high'?t('activity.os.noteHigh'):snap.status==='low'?t('activity.os.noteLow'):t('activity.os.noteBalanced');
  set('osNote',note);
}
