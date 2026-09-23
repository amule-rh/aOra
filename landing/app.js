(() => {
  const CONFIG = window.AORA_CONFIG || {};
  const hasSupabase = window.supabase && CONFIG.SUPABASE_URL && CONFIG.SUPABASE_ANON_KEY && !CONFIG.SUPABASE_URL.includes('YOUR-PROJECT') && !CONFIG.SUPABASE_ANON_KEY.includes('YOUR_');
  const sb = hasSupabase ? window.supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY, {auth:{persistSession:false}}) : null;
  const state = { lang: localStorage.getItem('aora_landing_lang') || ((navigator.language || 'en').toLowerCase().startsWith('es') ? 'es' : 'en') };
  const copy = {
    en:{eyebrow:'8 MONTHS. BUILT IN SILENCE.',heroTitle:'Human performance,<br><em>rethought.</em>',heroCopy:'Something new is coming for people who refuse to treat their body like a spreadsheet.',cta:'Get Early Access',emailPlaceholder:'your@email.com',micro:'Private early access · No spam · Unsubscribe anytime',mysteryKicker:'THE QUIET BUILD',mysteryTitle:'We didn\'t want to build<br><span>another fitness app.</span>',mysteryBody:'For eight months, we\'ve been building something quietly. No launch campaign. No noise. Just an obsessive question: what would happen if your training, recovery, progress and decisions were connected by one intelligent layer?',mysteryBody2:'We are not ready to show everything yet. That\'s intentional.',signalsKicker:'EARLY SIGNALS',signal1:'months in development',signal2:'designed for a global launch',signal3:'built around an intelligent coach',quote:'“The goal isn\'t to give you more data. It\'s to make the right decision easier.”',tease:'The interface is only the beginning.',finalKicker:'WHEN IT\'S READY',finalTitle:'Be there before<br><em>everyone else.</em>',finalCopy:'Join the private list. We\'ll send you the first signal when aOra is ready to be seen.',privacy:'Privacy Policy',terms:'Terms'},
    es:{eyebrow:'8 MESES. CONSTRUYENDO EN SILENCIO.',heroTitle:'El rendimiento humano,<br><em>repensado.</em>',heroCopy:'Algo nuevo está llegando para quienes se niegan a tratar su cuerpo como una simple hoja de cálculo.',cta:'Acceso anticipado',emailPlaceholder:'tu@email.com',micro:'Acceso privado · Sin spam · Cancela cuando quieras',mysteryKicker:'LA CONSTRUCCIÓN SILENCIOSA',mysteryTitle:'No queríamos crear<br><span>otra app de fitness.</span>',mysteryBody:'Durante ocho meses hemos estado construyendo algo en silencio. Sin campaña de lanzamiento. Sin ruido. Solo una pregunta obsesiva: ¿qué pasaría si entrenamiento, recuperación, progreso y decisiones estuvieran conectados por una única capa inteligente?',mysteryBody2:'Todavía no estamos preparados para enseñarlo todo. Es intencionado.',signalsKicker:'PRIMERAS SEÑALES',signal1:'meses de desarrollo',signal2:'diseñado para un lanzamiento global',signal3:'con un coach inteligente en el centro',quote:'“El objetivo no es darte más datos. Es hacer más fácil tomar la decisión correcta.”',tease:'La interfaz es solo el principio.',finalKicker:'CUANDO ESTÉ LISTO',finalTitle:'Llega antes que<br><em>los demás.</em>',finalCopy:'Únete a la lista privada. Te enviaremos la primera señal cuando aOra esté listo para ser visto.',privacy:'Política de privacidad',terms:'Términos'}
  };
  const $ = s => document.querySelector(s);
  const $$ = s => [...document.querySelectorAll(s)];
  function render(){
    document.documentElement.lang=state.lang; document.documentElement.dir='ltr';
    $$('.lang').forEach(b=>b.textContent=state.lang==='en'?'ES':'EN');
    $$('[data-i18n]').forEach(el=>{const k=el.dataset.i18n;if(copy[state.lang][k])el.innerHTML=copy[state.lang][k]});
    $$('[data-i18n-placeholder]').forEach(el=>el.placeholder=copy[state.lang][el.dataset.i18nPlaceholder]);
  }
  async function saveLead(email, form, messageEl){
    if ($('#website')?.value) return false;
    const normalized=email.trim().toLowerCase();
    if(!/^\S+@\S+\.\S+$/.test(normalized)){messageEl.textContent=state.lang==='es'?'Introduce un email válido.':'Enter a valid email address.';return false}
    const last=Number(localStorage.getItem('aora_waitlist_ts')||0);
    if(Date.now()-last<4000){messageEl.textContent=state.lang==='es'?'Espera unos segundos.':'Please wait a few seconds.';return false}
    const btn=form.querySelector('button');btn.disabled=true;messageEl.textContent='';
    try{
      if(!sb) throw new Error('CONFIG');
      const {error}=await sb.from('waitlist').insert({email:normalized,source:'aora-landing',locale:state.lang});
      if(error && !/duplicate|unique/i.test(error.message)) throw error;
      localStorage.setItem('aora_waitlist_ts',String(Date.now()));
      messageEl.textContent=state.lang==='es'?'Estás dentro. Te avisaremos cuando llegue el momento.':'You’re in. We’ll let you know when the time comes.';
      form.reset(); return true;
    }catch(e){
      messageEl.textContent=state.lang==='es'?'La lista privada aún no está conectada. Configura Supabase para activar el acceso.':'The private list is not connected yet. Configure Supabase to activate access.';
      return false;
    }finally{btn.disabled=false}
  }
  function bind(formId,emailId,messageId){const f=$(formId);if(!f)return;f.addEventListener('submit',e=>{e.preventDefault();saveLead($(emailId).value,f,$(messageId))})}
  $('#langToggle').addEventListener('click',()=>{state.lang=state.lang==='en'?'es':'en';localStorage.setItem('aora_landing_lang',state.lang);render()});
  bind('#waitlistForm','#email','#formMessage');bind('#waitlistForm2','#email2','#formMessage2');
  $('#year').textContent=new Date().getFullYear();render();
})();
