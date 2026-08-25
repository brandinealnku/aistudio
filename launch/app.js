const cfg = window.AI_STUDIO_LAUNCH_CONFIG || { apiBase: "", maxSignals: 6, room: "fall-2026-launch" };
const screens = [...document.querySelectorAll('.screen')];
const state = { people: [], lastScreen: 'landing' };
const storageKey = `ai-native-studio:${cfg.room}`;
const participantKey = `${storageKey}:participant-id`;

function show(id){
  screens.forEach(s=>s.classList.toggle('active', s.id===id));
  state.lastScreen = id;
  window.scrollTo({top:0,behavior:'instant'});
}
function joinLink(){
  const url = new URL(window.location.href);
  url.search = '?join=1';
  url.hash = '';
  return url.toString();
}
function participantId(){
  let id = localStorage.getItem(participantKey);
  if(!id){ id = crypto.randomUUID(); localStorage.setItem(participantKey,id); }
  return id;
}
function loadLocal(){
  try { state.people = JSON.parse(localStorage.getItem(storageKey) || '[]'); }
  catch { state.people = []; }
}
function saveLocal(){
  localStorage.setItem(storageKey, JSON.stringify(state.people));
}
async function syncRemote(){
  if(!cfg.apiBase) return;
  try{
    const r = await fetch(`${cfg.apiBase}?room=${encodeURIComponent(cfg.room)}`,{cache:'no-store'});
    if(r.ok){
      const data = await r.json();
      if(Array.isArray(data.people)){
        state.people = data.people.slice(0,cfg.maxSignals);
        saveLocal();
        renderPeople();
      }
    }
  }catch(e){ console.warn('Live sync unavailable',e); }
}
async function submitSignal(person){
  if(cfg.apiBase){
    const r = await fetch(`${cfg.apiBase}?room=${encodeURIComponent(cfg.room)}`,{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({room:cfg.room,person})
    });
    const data = await r.json().catch(()=>({}));
    if(!r.ok) throw new Error(data.reason==='room-full'?'The studio wall is full.':'Submission failed');
    if(Array.isArray(data.people)){
      state.people = data.people.slice(0,cfg.maxSignals);
      saveLocal();
      renderPeople();
    }
    return;
  }
  const existingIndex = state.people.findIndex(p=>p.id===person.id);
  if(existingIndex >= 0) state.people[existingIndex] = person;
  else if(state.people.length < cfg.maxSignals) state.people.push(person);
  saveLocal();
  renderPeople();
}
async function resetSignals(){
  if(!cfg.apiBase){ state.people=[];saveLocal();renderPeople();return; }
  const token = window.prompt('Enter the host reset token.');
  if(!token) return;
  const r = await fetch(`${cfg.apiBase}?room=${encodeURIComponent(cfg.room)}`,{
    method:'DELETE',
    headers:{'X-Reset-Token':token}
  });
  if(!r.ok){ alert('Reset failed. Check the host token.'); return; }
  state.people=[];saveLocal();renderPeople();
}
function renderPeople(){
  const grid=document.getElementById('peopleGrid');
  if(!grid) return;
  grid.innerHTML='';
  for(let i=0;i<cfg.maxSignals;i++){
    const p=state.people[i];
    const card=document.createElement('article');
    card.className=`person-card ${p?'filled':''}`;
    card.innerHTML=`<div class="person-num">0${i+1}</div><div class="person-name">${p?escapeHtml(p.name):'WAITING'}</div><div class="person-answer">${p?escapeHtml(p.answer):'Signal not received yet.'}</div>`;
    grid.appendChild(card);
  }
  document.getElementById('count').textContent=state.people.length;
  const revealBtn=document.getElementById('revealBtn');
  revealBtn.disabled=state.people.length===0;
  document.getElementById('photoNames').textContent=state.people.map(p=>p.name).join(' · ');
}
function escapeHtml(str=''){
  return String(str).replace(/[&<>'"]/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#039;','"':'&quot;'}[ch]));
}
function buildMission(){
  const answers=state.people.map(p=>p.answer.toLowerCase()).join(' ');
  const words=['curious','experimental','human','useful','bold','creative','responsible','inventive','practical','ambitious'];
  const hits=words.filter(w=>answers.includes(w)).slice(0,5);
  const signal=[...new Set([...hits,'CURIOUS','EXPERIMENTAL','HUMAN','USEFUL','UNFINISHED'])].slice(0,5).map(x=>x.toUpperCase());
  document.getElementById('signalLine').textContent=signal.join(' × ');
  const names=state.people.length===1?'one student':`${state.people.length} students`;
  document.getElementById('missionText').textContent=`We are ${names} building at the edge of what AI can do—alongside real organizations, with real stakes.`;
}
function loadDemo(){
  state.people=[
    {id:crypto.randomUUID(),name:'Aaron',answer:'Build intelligent agents that can make better decisions with people.'},
    {id:crypto.randomUUID(),name:'Ashok',answer:'Turn ambitious ideas into useful AI products people can trust.'},
    {id:crypto.randomUUID(),name:'Mark',answer:'Use computer vision to help people discover stories in museum collections.'},
    {id:crypto.randomUUID(),name:'Elaina',answer:'Create human-centered AI experiences that make information easier to explore.'},
    {id:crypto.randomUUID(),name:'Nora',answer:'Experiment boldly while keeping the technology responsible and useful.'},
    {id:crypto.randomUUID(),name:'Aaron',answer:'Learn how real AI teams move from uncertainty to working products.'}
  ];
  saveLocal();renderPeople();
}

document.getElementById('hostBtn').addEventListener('click',()=>show('host'));
document.getElementById('joinBtn').addEventListener('click',()=>show('join'));
document.querySelectorAll('[data-back]').forEach(b=>b.addEventListener('click',()=>show(b.dataset.back)));

document.getElementById('joinForm').addEventListener('submit',async e=>{
  e.preventDefault();
  const name=document.getElementById('nameInput').value.trim();
  const answer=document.getElementById('answerInput').value.trim();
  if(!name||!answer)return;
  try{
    await submitSignal({id:participantId(),name,answer,createdAt:new Date().toISOString()});
    e.currentTarget.classList.add('hidden');
    document.getElementById('joinSuccess').classList.remove('hidden');
  }catch(error){
    alert(error?.message || 'Your signal could not be submitted. Please try again.');
  }
});

document.getElementById('copyJoinBtn').addEventListener('click',async()=>{
  await navigator.clipboard.writeText(joinLink());
  const b=document.getElementById('copyJoinBtn');const t=b.textContent;b.textContent='COPIED';setTimeout(()=>b.textContent=t,1200);
});
document.getElementById('demoBtn').addEventListener('click',loadDemo);
document.getElementById('resetBtn').addEventListener('click',resetSignals);
document.getElementById('revealBtn').addEventListener('click',()=>{buildMission();show('reveal')});
document.getElementById('predictionBtn').addEventListener('click',()=>show('prediction'));
document.getElementById('photoBtn').addEventListener('click',()=>show('photo'));
document.getElementById('predictionPhotoBtn').addEventListener('click',()=>show('photo'));
document.getElementById('exitPhotoBtn').addEventListener('click',()=>show('reveal'));

window.addEventListener('storage',e=>{if(e.key===storageKey){loadLocal();renderPeople();}});

const url=joinLink();
document.getElementById('joinUrl').textContent=url;
document.getElementById('qrImage').src=`https://api.qrserver.com/v1/create-qr-code/?size=420x420&data=${encodeURIComponent(url)}`;
loadLocal();renderPeople();
if(new URLSearchParams(location.search).get('join')==='1') show('join');
else show('landing');
if(cfg.apiBase){syncRemote();setInterval(syncRemote,1000);}
