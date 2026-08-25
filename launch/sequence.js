(() => {
  const cfg = window.AI_STUDIO_LAUNCH_CONFIG || { apiBase: '', maxSignals: 6, room: 'fall-2026-launch' };
  const storageKey = `ai-native-studio:${cfg.room}`;
  const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
  const $ = id => document.getElementById(id);
  let cancelled = false;

  function showScreen(id){
    document.querySelectorAll('.screen').forEach(screen => screen.classList.toggle('active', screen.id === id));
    window.scrollTo({top:0,behavior:'instant'});
  }

  function people(){
    try { return JSON.parse(localStorage.getItem(storageKey) || '[]').slice(0, cfg.maxSignals); }
    catch { return []; }
  }

  function fallbackSynthesis(list){
    const count = list.length;
    const answers = list.map(p => String(p.answer || '').toLowerCase()).join(' ');
    const words = ['curious','experimental','human','useful','bold','creative','responsible','inventive','practical','ambitious'];
    const hits = words.filter(word => answers.includes(word));
    const themes = [...new Set([...hits,'curious','experimental','human-centered','useful'])].slice(0,4);
    return {
      themes,
      signal: themes.map(x => x.toUpperCase()).join(' × '),
      mission: `We are ${count} students turning curiosity into useful AI products—experimenting boldly, building responsibly, and learning through real work.`,
      prediction: 'Six NKU students prove what happens when the classroom starts operating like an AI product studio.',
      linkedin: `I asked ${count} students one question: “What do you want to make possible with AI this semester?”\n\nTheir answers became the first signal for INF 396: AI Native Studio. We’re not studying AI. We’re building with it.\n\n6 humans. 2 clients. 1 AI studio.`,
      source: 'fallback'
    };
  }

  async function getSynthesis(list){
    if(cfg.apiBase && $('connectionStatus')?.textContent !== 'DEMO MODE'){
      try{
        const response = await fetch(`${cfg.apiBase}/synthesize?room=${encodeURIComponent(cfg.room)}`,{
          method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({room:cfg.room})
        });
        if(response.ok){
          const result = await response.json();
          if(result?.mission) return result;
        }
      }catch(error){ console.warn('Activation synthesis fallback', error); }
    }
    return fallbackSynthesis(list);
  }

  function applySynthesis(result){
    const themes = Array.isArray(result.themes) ? result.themes.slice(0,5) : [];
    const chips = $('themeChips');
    if(chips){ chips.innerHTML=''; themes.forEach(theme => { const span=document.createElement('span'); span.textContent=theme; chips.appendChild(span); }); }
    if($('signalLine')) $('signalLine').textContent = result.signal || themes.map(x=>x.toUpperCase()).join(' × ');
    if($('missionText')) $('missionText').textContent = result.mission;
    if($('prediction-title')) $('prediction-title').textContent = result.prediction || fallbackSynthesis(people()).prediction;
    if($('photoMission')) $('photoMission').textContent = result.mission;
    if($('aiSource')) $('aiSource').textContent = result.source === 'ai' ? 'Synthesized live with Cloudflare Workers AI from this room’s signals.' : 'Synthesized from this room’s signals with the classroom fallback.';
    window.__AI_STUDIO_SYNTHESIS__ = result;
  }

  function setStep(step){
    document.querySelectorAll('.activation-progress [data-step]').forEach(el => {
      const keys=['signals','identity','teams','prediction','online'];
      const current=keys.indexOf(step), index=keys.indexOf(el.dataset.step);
      el.classList.toggle('active', index === current);
      el.classList.toggle('complete', index < current);
    });
  }

  function setStage({eyebrow,title,signal='',copy='',visual=''}){
    $('activationEyebrow').textContent=eyebrow;
    $('activationTitle').textContent=title;
    $('activationSignal').textContent=signal;
    $('activationCopy').textContent=copy;
    $('activationVisual').innerHTML=visual;
    const stage=$('activationStage');
    stage.classList.remove('stage-enter'); void stage.offsetWidth; stage.classList.add('stage-enter');
  }

  function escapeHtml(value=''){
    return String(value).replace(/[&<>'"]/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#039;','"':'&quot;'}[ch]));
  }

  function portraitStrip(list){
    return `<div class="activation-portraits">${list.map((p,index)=>`<div class="activation-person" style="--delay:${index*80}ms">${p.photo?`<img src="${p.photo}" alt="" />`:`<div class="activation-initial">${escapeHtml(String(p.name||'?').charAt(0).toUpperCase())}</div>`}<span>${escapeHtml(p.name)}</span></div>`).join('')}</div>`;
  }

  function teamVisual(list){
    const midpoint=Math.ceil(list.length/2);
    const teams=[list.slice(0,midpoint),list.slice(midpoint)];
    return `<div class="activation-teams">${teams.map((team,i)=>`<div class="activation-team"><div class="activation-team-label">CLIENT TEAM ${String(i+1).padStart(2,'0')}</div><div class="activation-team-people">${team.map(p=>`<span>${escapeHtml(p.name)}</span>`).join('')}</div><div class="activation-team-status">MISSION READY</div></div>`).join('')}</div>`;
  }

  async function activate(){
    const list=people();
    if(!list.length) return;
    cancelled=false;
    $('activationFinalActions').classList.add('hidden');
    showScreen('activation');

    setStep('signals');
    setStage({eyebrow:'STUDIO ACTIVATION · 01',title:`${String(list.length).padStart(2,'0')} SIGNALS LOCKED.`,copy:'Every person in the room just changed what this studio can become.',visual:portraitStrip(list)});
    const synthesisPromise=getSynthesis(list);
    await wait(1700); if(cancelled) return;

    setStage({eyebrow:'AI IS READING THE ROOM',title:'FINDING THE PATTERN.',copy:'Turning individual ambitions into one shared studio identity.',visual:`<div class="signal-scan">${list.map(p=>`<span>${escapeHtml(p.answer)}</span>`).join('')}</div>`});
    await wait(1900); if(cancelled) return;

    const synthesis=await synthesisPromise;
    applySynthesis(synthesis);
    if(cancelled) return;

    setStep('identity');
    setStage({eyebrow:'STUDIO IDENTITY · GENERATED LIVE',title:synthesis.signal || 'CURIOUS × EXPERIMENTAL × HUMAN',copy:synthesis.mission,visual:`<div class="theme-burst">${(synthesis.themes||[]).map(t=>`<span>${escapeHtml(t)}</span>`).join('')}</div>`});
    await wait(3100); if(cancelled) return;

    setStep('teams');
    setStage({eyebrow:'TWO CLIENT MISSIONS · ONE STUDIO',title:'NOW WE BUILD.',copy:'Two teams. Shared standards. One studio operating system.',visual:teamVisual(list)});
    await wait(2700); if(cancelled) return;

    setStep('prediction');
    setStage({eyebrow:'DECEMBER 2026 · PREDICTION LOG',title:synthesis.prediction || 'THIS CLASS WILL BUILD SOMETHING WORTH SHOWING.',copy:'Prediction captured on day one. We come back in December and test it against reality.',visual:'<div class="prediction-stamp">PREDICTION LOGGED · AUG 25 2026</div>'});
    await wait(3300); if(cancelled) return;

    setStep('online');
    setStage({eyebrow:'INF 396 · AI NATIVE STUDIO',title:'STUDIO ONLINE.',signal:'6 HUMANS · 2 CLIENTS · 1 AI STUDIO',copy:'The studio is no longer an idea. It is operating.',visual:portraitStrip(list)});
    $('activationFinalActions').classList.remove('hidden');
  }

  const original=$('revealBtn');
  if(original){
    const replacement=original.cloneNode(true);
    original.replaceWith(replacement);
    replacement.addEventListener('click',activate);
  }

  $('skipActivationBtn')?.addEventListener('click',()=>{cancelled=true; const result=window.__AI_STUDIO_SYNTHESIS__ || fallbackSynthesis(people()); applySynthesis(result); showScreen('reveal');});
  $('activationRevealBtn')?.addEventListener('click',()=>showScreen('reveal'));
  $('activationHostBtn')?.addEventListener('click',()=>showScreen('host'));
  $('activationPhotoBtn')?.addEventListener('click',()=>{$('photoBtn')?.click();});

  const updateActivationReadiness=()=>{
    const count=Number($('count')?.textContent||0), max=cfg.maxSignals||6;
    const btn=$('revealBtn'), hint=$('readyHint');
    if(!btn||!hint) return;
    btn.disabled=count===0;
    if(count===0){hint.textContent='The activation unlocks after the first signal.';btn.textContent='ACTIVATE THE STUDIO →';}
    else if(count<max){hint.textContent=`Activation ready with ${count}. Best reveal when all ${max} signals are locked.`;btn.textContent='ACTIVATE THE STUDIO →';}
    else{hint.textContent='ALL SIGNALS LOCKED · The studio is ready to go live.';btn.textContent='ACTIVATE THE STUDIO →';btn.classList.add('ready-pulse');}
  };
  const observer=new MutationObserver(updateActivationReadiness);
  if($('count')) observer.observe($('count'),{childList:true,subtree:true,characterData:true});
  updateActivationReadiness();
})();
