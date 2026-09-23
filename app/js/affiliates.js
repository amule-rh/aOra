const AFFILIATE_CATEGORIES=["all","supplements","equipment","apparel","recovery","books"];
const AFFILIATE_REGIONS=["US","EU"];
const AFFILIATE_PRODUCTS=[
  {id:"creatine-monohydrate",category:"supplements",merchant:"Amazon",regions:["US","EU"],name:"Creatine monohydrate",price:"€15–€35 / $15–$35",reasonKey:"aff.reason.creatine",tags:["strength","hypertrophy","performance"],goals:["strength","hypertrophy","recomp","power"],levels:["beginner","intermediate","advanced","elite"],space:"any",destination:{US:"https://www.amazon.com/s?k=creatine+monohydrate",EU:"https://www.amazon.es/s?k=creatine+monohydrate"},image:"assets/affiliate-creatine.svg"},
  {id:"protein",category:"supplements",merchant:"Amazon",regions:["US","EU"],name:"Protein powder",price:"€25–€55 / $25–$55",reasonKey:"aff.reason.protein",tags:["protein","hypertrophy","recomp"],goals:["hypertrophy","recomp","strength"],levels:["beginner","intermediate","advanced","elite"],space:"any",destination:{US:"https://www.amazon.com/s?k=whey+protein",EU:"https://www.amazon.es/s?k=whey+protein"},image:"assets/affiliate-protein.svg"},
  {id:"adjustable-dumbbells",category:"equipment",merchant:"Amazon",regions:["US","EU"],name:"Adjustable dumbbells",price:"€150–€450 / $150–$450",reasonKey:"aff.reason.dumbbells",tags:["home gym","strength","hypertrophy"],goals:["strength","hypertrophy","recomp"],levels:["beginner","intermediate","advanced","elite"],space:"small",destination:{US:"https://www.amazon.com/s?k=adjustable+dumbbells",EU:"https://www.amazon.es/s?k=mancuernas+ajustables"},image:"assets/affiliate-dumbbells.svg"},
  {id:"resistance-bands",category:"equipment",merchant:"Decathlon",regions:["EU"],name:"Resistance band set",price:"€15–€45",reasonKey:"aff.reason.bands",tags:["portable","small space","home gym"],goals:["strength","hypertrophy","recomp","power"],levels:["beginner","intermediate","advanced","elite"],space:"small",destination:{EU:"https://www.decathlon.es/es/search?Ntt=bandas%20elasticas"},image:"assets/affiliate-bands.svg"},
  {id:"foam-roller",category:"recovery",merchant:"Decathlon",regions:["EU"],name:"Foam roller",price:"€15–€45",reasonKey:"aff.reason.roller",tags:["recovery","mobility"],goals:["strength","hypertrophy","recomp","power"],levels:["beginner","intermediate","advanced","elite"],space:"small",destination:{EU:"https://www.decathlon.es/es/search?Ntt=foam%20roller"},image:"assets/affiliate-recovery.svg"},
  {id:"massage-gun",category:"recovery",merchant:"Amazon",regions:["US","EU"],name:"Massage gun",price:"€50–€180 / $50–$180",reasonKey:"aff.reason.massage",tags:["recovery","portable"],goals:["strength","hypertrophy","recomp","power"],levels:["intermediate","advanced","elite"],space:"small",destination:{US:"https://www.amazon.com/s?k=massage+gun",EU:"https://www.amazon.es/s?k=massage+gun"},image:"assets/affiliate-massage.svg"},
  {id:"training-shoes",category:"apparel",merchant:"Amazon",regions:["US","EU"],name:"Training shoes",price:"€60–€160 / $60–$160",reasonKey:"aff.reason.shoes",tags:["training","stability"],goals:["strength","hypertrophy","recomp","power"],levels:["beginner","intermediate","advanced","elite"],space:"any",destination:{US:"https://www.amazon.com/s?k=training+shoes",EU:"https://www.amazon.es/s?k=zapatillas+entrenamiento"},image:"assets/affiliate-shoes.svg"},
  {id:"strength-book",category:"books",merchant:"Amazon",regions:["US","EU"],name:"Strength training reference book",price:"€20–€45 / $20–$45",reasonKey:"aff.reason.book",tags:["education","programming"],goals:["strength","hypertrophy","power"],levels:["intermediate","advanced","elite"],space:"any",destination:{US:"https://www.amazon.com/s?k=strength+training+book",EU:"https://www.amazon.es/s?k=strength+training+book"},image:"assets/affiliate-book.svg"}
];

function detectAffiliateRegion(){
  const saved=localStorage.getItem("aora_affiliate_region");
  if(AFFILIATE_REGIONS.includes(saved)) return saved;
  const tz=Intl.DateTimeFormat().resolvedOptions().timeZone||"";
  const lang=(navigator.language||"").toLowerCase();
  const usTz=["America/Los_Angeles","America/Denver","America/Chicago","America/New_York","America/Phoenix","America/Anchorage","Pacific/Honolulu"];
  return (usTz.includes(tz)||lang==="en-us")?"US":"EU";
}
let affiliateRegion=detectAffiliateRegion();
let affiliateProducts=[];

function setAffiliateRegion(region, persist=true){
  affiliateRegion=AFFILIATE_REGIONS.includes(region)?region:"EU";
  if(persist) localStorage.setItem("aora_affiliate_region",affiliateRegion);
  renderAffiliateRegionSelectors();
  renderRecommendations();
  document.dispatchEvent(new CustomEvent("aora-affiliate-region-changed",{detail:{region:affiliateRegion}}));
  if(typeof saveProfile === "function" && typeof user !== "undefined" && user){
    saveProfile({id:user.id,affiliate_region:affiliateRegion}).catch(()=>{});
  }
}

function scoreProduct(product){
  const p=profile||{};
  const goal=String(p.goal||"").toLowerCase();
  const level=String(p.training_level||"").toLowerCase();
  const equipment=String(p.equipment||"").toLowerCase();
  const limitations=String(p.physical_limitations||"").toLowerCase();
  const recovery=String(p.recovery||"").toLowerCase();
  const prefs=String(p.preferences||"").toLowerCase();
  const space=String(p.available_space||"").toLowerCase();
  const goalTerms={
    strength:["strength","fuerza","force","kraft","сил","근력","kuvvet","शक्ति","força","forca","力量"],
    hypertrophy:["hypertrophy","hipertrofia","hypertrophie","근비대","筋肥大","гипертроф","增肌","मांसपेशी","hipertrofi"],
    recomp:["recomp","recomposición","recomposition","rekombination","rekomposisi","体态重组","إعادة تركيب","rekopozisyon"],
    power:["power","potencia","puissance","leistung","мощ","爆发","पावर","potência","güç","パワー"],
    fatLoss:["fat loss","pérdida de grasa","perte de graisse","fettverlust","жир","减脂","脂肪減少","체지방 감량","fat loss"]
  };
  const normalizedGoals=Object.entries(goalTerms).filter(([,terms])=>terms.some(x=>goal.includes(x))).map(([k])=>k);
  let score=0;
  if(product.goals.some(x=>normalizedGoals.includes(x))) score+=4;
  if(product.levels.some(x=>level.includes(x)||({beginner:["principiante","débutant","anfänger","iniciante","初级","مبتدئ","शुरुआती","начальный","pemula","초급","başlangıç"],intermediate:["intermedio","intermédiaire","mittelstufe","intermediário","中级","متوسط","मध्यवर्ती","средний","menengah","중급","orta"],advanced:["avanzado","avancé","fortgeschritten","avançado","高级","متقدم","उन्नत","продвинут","lanjutan","고급","ileri"],elite:["élite","elite","эли"]}[x]||[]))) score+=2;
  if(product.category==="equipment" && !equipment.trim()) score+=3;
  if(product.category==="equipment" && /dumbbell|mancuerna|barbell|barra|gym|gimnasio|banda|band|halter|гантел|哑铃|バンド|밴드|dambıl/.test(equipment)) score+=1;
  if(product.space==="small" && /small|pequeñ|poco|limit|reduc|casa|home|apart|espacio|space|klein|petit|小|صغير|छोट|мал|kecil|작|küçük/.test(space)) score+=3;
  if(product.space==="small" && !space.trim()) score+=1;
  if(product.category==="recovery" && /sleep|sueño|sommeil|schlaf|sono|睡眠|نوم|नींद|сон|tidur|수면|uyku|stress|estrés|stress|stres|疲劳|fatigue|fatiga|fatigue|recuper/.test(`${recovery} ${prefs}`)) score+=2;
  if(product.category==="supplements" && /protein|proteína|protéine|protein|proteína|proteine|蛋白|بروتين|प्रोटीन|белок|protein|단백질|タンパク/.test(`${goal} ${prefs}`)) score+=1;
  if(/knee|rodilla|genou|knie|joelho|膝|ركبة|घुटना|колен|lutut|무릎|diz/.test(limitations) && product.id==="training-shoes") score+=1;
  return score;
}

function getRecommendedProducts(limit=4){
  const pool=(affiliateProducts.length?affiliateProducts:AFFILIATE_PRODUCTS).filter(p=>p.regions.includes(affiliateRegion));
  return pool.map(p=>({...p,score:scoreProduct(p)})).sort((a,b)=>b.score-a.score).slice(0,limit);
}

async function loadAffiliateProducts(){
  if(typeof loadActiveAffiliateProducts !== "function") return AFFILIATE_PRODUCTS;
  try{
    const rows=await loadActiveAffiliateProducts();
    if(rows?.length) affiliateProducts=rows.map(normalizeAffiliateRow);
  }catch(_){ affiliateProducts=[]; }
  if(!affiliateProducts.length) affiliateProducts=AFFILIATE_PRODUCTS;
  return affiliateProducts;
}

function normalizeAffiliateRow(row){
  return {id:row.slug||row.id,category:row.category,merchant:row.merchant_default||"Partner",regions:row.regions||["EU","US"],name:row.name,price:row.price_label||"",reasonKey:row.reason_key||"aff.reason.default",tags:row.tags||[],goals:row.goals||[],levels:row.levels||["beginner","intermediate","advanced","elite"],space:row.space_requirement||"any",destination:row.destination_urls||{},affiliate:row.affiliate_urls||{},image:row.image_url||"assets/affiliate-generic.svg"};
}

function productUrl(product){return product.affiliate?.[affiliateRegion]||product.destination?.[affiliateRegion]||"#"}
function productReason(product){return t(product.reasonKey||"aff.reason.default")}
function productCard(product,compact=false){
  const url=productUrl(product); const hasAffiliate=Boolean(product.affiliate?.[affiliateRegion]);
  return `<article class="product-card ${compact?"compact":""}">
    <div class="product-image"><img src="${escapeHtml(product.image||"assets/affiliate-generic.svg")}" alt="" loading="lazy"></div>
    <div class="product-body"><div class="product-top"><span class="product-category">${escapeHtml(t(`aff.category.${product.category}`))}</span><span class="product-merchant">${escapeHtml(product.merchant||"")}</span></div>
    <h3>${escapeHtml(product.name)}</h3><p>${escapeHtml(productReason(product))}</p><div class="product-price">${escapeHtml(product.price||"")}</div>
    <a class="product-buy" href="${escapeHtml(url)}" target="_blank" rel="sponsored noopener noreferrer">${escapeHtml(t("aff.viewProduct"))} ↗</a></div>
  </article>`;
}

function renderAffiliateRegionSelectors(){
  $$("[data-affiliate-region]").forEach(e=>{e.innerHTML=`<option value="EU">${escapeHtml(t("aff.region.eu"))}</option><option value="US">${escapeHtml(t("aff.region.us"))}</option>`;e.value=affiliateRegion;});
  const label=$("#affiliateRegionText"); if(label) label.textContent=affiliateRegion==="US"?t("aff.region.us"):t("aff.region.eu");
}

function renderRecommendations(){
  const grid=$("#recommendationGrid"); if(!grid)return;
  const products=getRecommendedProducts(4);
  grid.innerHTML=products.map(p=>productCard(p,true)).join("")||`<div class="empty-card">${escapeHtml(t("aff.noProducts"))}</div>`;
  renderAffiliateRegionSelectors();
}

function renderAffiliateSection(){
  const grid=$("#affiliateGrid"); if(!grid)return;
  const filter=$("#affiliateFilter")?.value||"all";
  const pool=(affiliateProducts.length?affiliateProducts:AFFILIATE_PRODUCTS).filter(p=>p.regions.includes(affiliateRegion)).filter(p=>filter==="all"||p.category===filter).map(p=>({...p,score:scoreProduct(p)})).sort((a,b)=>b.score-a.score);
  grid.innerHTML=pool.map(p=>productCard(p)).join("")||`<div class="empty-card">${escapeHtml(t("aff.noProducts"))}</div>`;
  renderAffiliateRegionSelectors();
}

function affiliateContext(){
  return getRecommendedProducts(6).map(p=>({id:p.id,name:p.name,category:p.category,reason:productReason(p),region:affiliateRegion,affiliate_available:Boolean(p.affiliate?.[affiliateRegion])}));
}
