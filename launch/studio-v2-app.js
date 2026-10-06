const API_BASE='https://aistudio.brandineildehaven.workers.dev';
const ROOM='fall-2026-studio-v2';
const OLD_ROOM='fall-2026-launch';
const COHORT=[
  {name:'Aaron Kloss',team:'Fidelity'},
  {name:'Aaron Milner',team:'Fidelity'},
  {name:'Sean Cancel',team:'Fidelity'},
  {name:'Phillip Bierley',team:'Fidelity'},
  {name:'Mark Greene',team:'CMC'},
  {name:'Elaina Hall',team:'CMC'},
  {name:'Nora Ernst',team:'CMC'}
];
const $=id=>document.getElementById(id);
const state={people:[],pendingPhoto:''};

function escapeHtml(v=''){return String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));}
function normalizeName(v=''){return String(v).trim().toLowerCase().replace(/\s+/g,' ');}
function firstName(v=''){return normalizeName(v).split(' ')[0]||'';}
function expectedByName(name){const n=normalizeName(name);return COHORT.find(s=>normalizeName(s.name)===n)||null;}
function expectedByUniqueFirst(name){const f=firstName(name);const matches=COHORT.filter(s=>firstName(s.name)===f);return matches.length===1?matches[0]:null;}
function canonicalStudent(person){return expectedByName(person?.name)||expectedByUniqueFirst(person?.name);}
function currentMap(people=state.people){
  const map=new Map();
  for(const person of people){
    const student=canonicalStudent(person);
    if(!student) continue;
    const key=student.name;
    const prior=map.get(key);
    if(!prior||String(person.createdAt||'')>String(prior.createdAt||'')) map.set(key,{...person,name:student.name});
  }
  return map;
}
function studentJoinLink(name=''){
  const url=new URL(window.location.href);
  url.search='';
  url.searchParams.set('join','1');
  if(name) url.searchParams.set('student',name);
  return url.toString();
}
function publicLink(){const url=new URL(window.location.href);url.search='';return url.toString();}

async function fetchRoom(room=ROOM){
  const r=await fetch(`${API_BASE}?room=${encodeURIComponent(room)}`,{cache:'no-store'});
  if(!r.ok) throw new Error('Could not load the Studio roster.');
  const data=await r.json();
  return Array.isArray(data.people)?data.people:[];
}
async function savePerson(person){
  const r=await fetch(`${API_BASE}?room=${encodeURIComponent(ROOM)}`,{
    method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({room:ROOM,person})
  });
  const data=await r.json().catch(()=>({}));
  if(!r.ok) throw new Error(data.reason==='room-full'?'The clean Studio room is full. Contact Brandi before submitting again.':data.error||'Could not save profile.');
  state.people=Array.isArray(data.people)?data.people:await fetchRoom();
}
async function resizePhoto(file){
  if(!file) return '';
  if(!file.type.startsWith('image/')) throw new Error('Please choose an image file.');
  const bitmap=await createImageBitmap(file);
  const side=Math.min(bitmap.width,bitmap.height),sx=(bitmap.width-side)/2,sy=(bitmap.height-side)/2;
  const canvas=document.createElement('canvas');canvas.width=420;canvas.height=420;
  canvas.getContext('2d').drawImage(bitmap,sx,sy,side,side,0,0,420,420);
  bitmap.close?.();
  return canvas.toDataURL('image/jpeg',0.68);
}
function stableIdFor(name){
  const key='ai-native-studio-v2:'+normalizeName(name)+':id';
  let id=localStorage.getItem(key);
  if(!id){id=crypto.randomUUID();localStorage.setItem(key,id);}
  return id;
}
function renderPublic(){
  const map=currentMap(),grid=$('publicGrid');
  $('publicStatus').textContent=`${map.size} of 7 profiles ready`;
  grid.innerHTML=COHORT.map(student=>{
    const p=map.get(student.name);
    const photo=p?.photo?`<img src="${p.photo}" alt="Portrait of ${escapeHtml(student.name)}" />`:`<div class="placeholder">${escapeHtml(student.name.charAt(0))}</div>`;
    const quote=p?.answer?`<blockquote>“${escapeHtml(p.answer)}”</blockquote>`:'<p class="awaiting">Photo/profile awaiting update.</p>';
    const li=p?.linkedin?`<a href="${escapeHtml(p.linkedin)}" target="_blank" rel="noopener">LinkedIn ↗</a>`:'';
    return `<article class="card"><div class="photo">${photo}</div><div class="meta"><span>${student.team==='CMC'?'Cincinnati Museum Center':student.team}</span><h3>${student.name}</h3>${quote}${li}</div></article>`;
  }).join('');
}
function renderManage(){
  const map=currentMap(),grid=$('manageGrid');
  grid.innerHTML=COHORT.map(student=>{
    const p=map.get(student.name),ready=Boolean(p);
    return `<article class="manage-card">
      <div><span class="team">${student.team}</span><h3>${student.name}</h3><p>${ready?(p.photo?'Profile + photo ready':'Profile ready · photo missing'):'Not yet in clean room'}</p></div>
      <div class="manage-actions">
        <a class="secondary button-link" href="${studentJoinLink(student.name)}">${ready?'UPDATE PROFILE':'ADD PROFILE'}</a>
      </div>
    </article>`;
  }).join('');
  $('studentLink').textContent=studentJoinLink();
}
async function refresh(){state.people=await fetchRoom();renderPublic();renderManage();}

function setupJoin(){
  const select=$('studentSelect');
  select.innerHTML='<option value="">Choose your name…</option>'+COHORT.map(s=>`<option value="${s.name}">${s.name} · ${s.team}</option>`).join('');
  const requested=new URLSearchParams(location.search).get('student');
  if(requested&&COHORT.some(s=>s.name===requested)) select.value=requested;
  const fillExisting=()=>{
    const map=currentMap(),p=map.get(select.value);
    $('answerInput').value=p?.answer||'';
    $('linkedinInput').value=p?.linkedin||'';
    state.pendingPhoto=p?.photo||'';
    if(p?.photo){$('photoPreview').src=p.photo;$('photoPreviewWrap').classList.remove('hidden');}
    else $('photoPreviewWrap').classList.add('hidden');
  };
  select.addEventListener('change',fillExisting);
  if(select.value) fillExisting();
  $('photoInput').addEventListener('change',async e=>{
    try{state.pendingPhoto=await resizePhoto(e.target.files?.[0]);if(state.pendingPhoto){$('photoPreview').src=state.pendingPhoto;$('photoPreviewWrap').classList.remove('hidden');}}catch(err){alert(err.message);}
  });
  $('joinForm').addEventListener('submit',async e=>{
    e.preventDefault();
    const name=select.value,student=COHORT.find(s=>s.name===name);
    if(!student) return;
    const map=currentMap(),existing=map.get(name);
    const person={
      id:existing?.id||stableIdFor(name),
      name,
      answer:$('answerInput').value.trim(),
      linkedin:$('linkedinInput').value.trim(),
      photo:state.pendingPhoto||existing?.photo||'',
      createdAt:new Date().toISOString()
    };
    const button=e.currentTarget.querySelector('button[type=submit]'),old=button.textContent;
    button.disabled=true;button.textContent='SAVING…';
    try{
      await savePerson(person);
      $('joinResult').classList.remove('hidden');
      $('joinResult').innerHTML=`<strong>Saved.</strong> Your current Studio profile is updated. <a href="${publicLink()}">View roster →</a>`;
      renderPublic();renderManage();
    }catch(err){alert(err.message);}
    finally{button.disabled=false;button.textContent=old;}
  });
}

function renderAaronRecovery(oldPeople){
  const host=$('aaronRecovery');
  if(!host) return;
  const aarons=oldPeople.filter(p=>firstName(p.name)==='aaron');
  const exactKloss=aarons.find(p=>normalizeName(p.name)==='aaron kloss');
  const exactMilner=aarons.find(p=>normalizeName(p.name)==='aaron milner');
  const unresolved=aarons.filter(p=>p.id!==exactKloss?.id&&p.id!==exactMilner?.id);

  if(exactKloss&&exactMilner){host.classList.add('hidden');return;}
  if(!unresolved.length){host.classList.add('hidden');return;}

  host.classList.remove('hidden');
  host.innerHTML='<div class="recovery-head"><div><div class="kicker">RECOVERED FROM ORIGINAL LAUNCH</div><h3>Two Aaron profiles need names.</h3><p>I found the older Aaron profile data, but the original version stored both students simply as “Aaron.” Use the photo/response below to assign each profile without guessing.</p></div></div>'+
    '<div class="recovery-grid">'+unresolved.map((p,i)=>{
      const photo=p.photo?'<img src="'+p.photo+'" alt="Recovered Aaron profile '+(i+1)+'" />':'<div class="recovery-placeholder">A</div>';
      const answer=p.answer?'<blockquote>“'+escapeHtml(p.answer)+'”</blockquote>':'<p>No response text saved.</p>';
      const linkedin=p.linkedin?'<a href="'+escapeHtml(p.linkedin)+'" target="_blank" rel="noopener">Open LinkedIn ↗</a>':'';
      return '<article class="recovery-card" data-old-id="'+escapeHtml(p.id)+'"><div class="recovery-photo">'+photo+'</div><div><div class="team">RECOVERED AARON '+(i+1)+'</div>'+answer+linkedin+'<div class="recovery-actions"><button class="secondary assign-aaron" data-old-id="'+escapeHtml(p.id)+'" data-name="Aaron Kloss">THIS IS AARON KLOSS</button><button class="secondary assign-aaron" data-old-id="'+escapeHtml(p.id)+'" data-name="Aaron Milner">THIS IS AARON MILNER</button></div></div></article>';
    }).join('')+'</div>';

  host.querySelectorAll('.assign-aaron').forEach(btn=>btn.addEventListener('click',async()=>{
    const person=oldPeople.find(p=>p.id===btn.dataset.oldId);
    if(!person) return;
    const targetName=btn.dataset.name;
    const current=currentMap();
    if(current.has(targetName)&&!confirm(targetName+' already has a profile in Studio v2. Replace it with this recovered profile?')) return;
    const original=btn.textContent;btn.disabled=true;btn.textContent='IMPORTING…';
    try{
      await savePerson({...person,name:targetName,createdAt:new Date().toISOString()});
      await refresh();
      renderAaronRecovery(oldPeople);
    }catch(err){alert(err.message);}
    finally{btn.disabled=false;btn.textContent=original;}
  }));
}

async function migrateOldRoom(){
  const button=$('migrateBtn'),status=$('migrationStatus'),oldText=button.textContent;
  button.disabled=true;button.textContent='IMPORTING…';
  try{
    const oldPeople=await fetchRoom(OLD_ROOM),current=currentMap();renderAaronRecovery(oldPeople);
    let imported=0;
    const messages=[];
    for(const student of COHORT){
      if(current.has(student.name)){messages.push(`${student.name}: already in clean room`);continue;}
      const exact=oldPeople.filter(p=>normalizeName(p.name)===normalizeName(student.name));
      const uniqueFirst=COHORT.filter(s=>firstName(s.name)===firstName(student.name)).length===1
        ? oldPeople.filter(p=>firstName(p.name)===firstName(student.name))
        : [];
      const matches=[...exact,...uniqueFirst].filter((p,i,a)=>a.findIndex(x=>x.id===p.id)===i);
      matches.sort((a,b)=>Number(Boolean(b.photo))-Number(Boolean(a.photo))||String(b.createdAt||'').localeCompare(String(a.createdAt||'')));
      if(!matches.length){messages.push(`${student.name}: needs new upload`);continue;}
      const chosen={...matches[0],name:student.name,createdAt:new Date().toISOString()};
      try{await savePerson(chosen);imported++;messages.push(`${student.name}: imported`);}
      catch(err){messages.push(`${student.name}: could not import (${err.message})`);}
    }
    await refresh();
    status.classList.remove('hidden');
    status.innerHTML=`<strong>Import complete: ${imported} profile${imported===1?'':'s'} copied.</strong><br>${messages.join('<br>')}`;
  }catch(err){
    status.classList.remove('hidden');status.textContent=err.message;
  }finally{button.disabled=false;button.textContent=oldText;}
}

(async function init(){
  const params=new URLSearchParams(location.search);
  await refresh().catch(err=>{$('publicStatus').textContent=err.message;});
  if(params.get('join')==='1'){$('publicView').classList.add('hidden');$('joinView').classList.remove('hidden');setupJoin();}
  else if(params.get('manage')==='1'){$('publicView').classList.add('hidden');$('manageView').classList.remove('hidden');fetchRoom(OLD_ROOM).then(renderAaronRecovery).catch(()=>{});$('migrateBtn').addEventListener('click',migrateOldRoom);$('copyStudentLink').addEventListener('click',async()=>{await navigator.clipboard.writeText(studentJoinLink());const b=$('copyStudentLink'),t=b.textContent;b.textContent='COPIED';setTimeout(()=>b.textContent=t,1200);});}
})();