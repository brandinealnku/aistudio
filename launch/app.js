const cfg = window.AI_STUDIO_LAUNCH_CONFIG || { apiBase: "", maxSignals: 6, room: "fall-2026-launch" };
const screens = [...document.querySelectorAll('.screen')];
const state = { people: [], lastScreen: 'landing' };
const storageKey = `ai-native-studio:${cfg.room}`;

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
function loadLocal(){
  try { state.people = JSON.parse(localStorage.getItem(storageKey) || '[]'); }
  catch { state.people = []; }
}
function saveLocal(){
  localStorage.setItem(storageKey, JSON.stringify(state.people));
  window.dispatchEvent(new StorageEvent('storage',{key:storageKey,newValue:JSON.stringify(state.people)}));
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
    const r = await fetch(cfg.apiBase,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({room:cfg.room,person})});
    if(!r.ok) throw new Error('Submission failed');
    return;
  }
  const duplicate = state.people.some(p=>p.name.toLowerCase()===person.name.toLowerCase());
  if(!duplicate && state.people.length < cfg.maxSignals){
    state.people.push(person);
    saveLocal();
  }
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
  return str.replace(/[&<>'"]/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#039;','"':'&quot;'}[ch]));
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
    {name:'Aaron',answer:'Build intelligent agents that can make better decisions with people.'},
    {name:'Ashok',answer:'Turn ambitious ideas into useful AI products people can trust.'},
    {name:'Mark',answer:'Use computer vision to help people discover stories in museum collections.'},
    {name:'Elaina',answer:'Create human-centered AI experiences that make information easier to explore.'},
    {name:'Nora',answer:'Experiment boldly while keeping the technology responsible and useful.'},
    {name:'Aaron',answer:'Learn how real AI teams move from uncertainty to working products.'}
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
    await submitSignal({name,answer,createdAt:new Date().toISOString()});
    e.currentTarget.classList.add('hidden');
    document.getElementById('joinSuccess').classList.remove('hidden');
  }catch{
    alert('Your signal could not be submitted. Please try again.');
  }
});

document.getElementById('copyJoinBtn').addEventListener('click',async()=>{
  await navigator.clipboard.writeText(joinLink());
  const b=document.getElementById('copyJoinBtn');const t=b.textContent;b.textContent='COPIED';setTimeout(()=>b.textContent=t,1200);
});
document.getElementById('demoBtn').addEventListener('click',loadDemo);
document.getElementById('resetBtn').addEventListener('click',()=>{state.people=[];saveLocal();renderPeople();});
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
if(cfg.apiBase){syncRemote();setInterval(syncRemote,2500);}
