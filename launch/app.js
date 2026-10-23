const cfg=window.AI_STUDIO_LAUNCH_CONFIG||{apiBase:"",maxSignals:7,room:"fall-2026-cohort"};
const CURRENT_STUDENTS=['Aaron Kloss','Aaron Milner','Sean Cancel','Phillip Bierley','Mark Greene','Elaina Hall','Nora Ernst'];
const CURRENT_SET=new Set(CURRENT_STUDENTS.map(v=>v.toLowerCase()));
const LEGACY_ALIAS=new Map([['sean','Sean Cancel'],['phillip','Phillip Bierley'],['philip','Phillip Bierley'],['mark','Mark Greene'],['elaina','Elaina Hall'],['nora','Nora Ernst']]);
const screens=[...document.querySelectorAll('.screen')];
const state={people:[],managePeople:[],manageSelected:new Set(),demoMode:false,connected:false,synthesis:null,pendingPhoto:'',managePhotoPersonId:''};
const storageKey=`ai-native-studio:${cfg.room}`,participantKey=`${storageKey}:participant-id`;
const $=id=>document.getElementById(id);
function show(id){screens.forEach(s=>s.classList.toggle('active',s.id===id));window.scrollTo({top:0,behavior:'instant'});}
function escapeHtml(value=''){return String(value).replace(/[&<>'\"]/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#039;','\"':'&quot;'}[ch]));}
function participantId(){let id=localStorage.getItem(participantKey);if(!id){id=crypto.randomUUID();localStorage.setItem(participantKey,id);}return id;}
function currentParticipant(){const id=localStorage.getItem(participantKey);return id?state.people.find(p=>p.id===id):null;}
function prepareJoinForm(){const existing=currentParticipant(),title=$('join-title'),note=$('joinModeNote'),submit=$('joinForm')?.querySelector('button[type="submit"]');if(existing){if(title)title.textContent='Update your Studio profile.';if(note)note.classList.remove('hidden');if($('nameInput'))$('nameInput').value=existing.name||'';if($('answerInput'))$('answerInput').value=existing.answer||'';if($('linkedinInput'))$('linkedinInput').value=existing.linkedin||'';state.pendingPhoto=existing.photo||'';if(existing.photo&&$('portraitPreview')){$('portraitPreview').src=existing.photo;$('portraitPreviewWrap')?.classList.remove('hidden');if($('photoPickerText'))$('photoPickerText').textContent='CHANGE PHOTO';}if(submit)submit.textContent='UPDATE MY STUDIO PROFILE';}else{if(title)title.textContent='Add your signal.';if(note)note.classList.add('hidden');if(submit)submit.textContent='ADD ME TO THE STUDIO';}}
function loadLocal(){try{state.people=JSON.parse(localStorage.getItem(storageKey)||'[]');}catch{state.people=[];}}
function saveLocal(){try{localStorage.setItem(storageKey,JSON.stringify(state.people));}catch(error){console.warn('Local cache skipped',error);}}
function setConnection(mode){const el=$('connectionStatus');if(!el)return;el.className='status-pill';if(mode==='demo'){el.textContent='DEMO MODE';el.classList.add('demo');return;}if(mode==='online'){el.textContent='LIVE · CONNECTED';el.classList.add('online');return;}el.textContent='OFFLINE';el.classList.add('offline');}
function joinLink(){const url=new URL(window.location.href);url.search='';url.searchParams.set('join','1');url.searchParams.set('room',cfg.room);url.hash='';return url.toString();}
function rosterLink(){const url=new URL('roster.html',window.location.href);url.searchParams.set('room',cfg.room);return url.toString();}
function renderManageRoster(){const grid=$('manageGrid'),countEl=$('manageCount'),selectedEl=$('manageSelectedCount'),removeSelectedBtn=$('manageRemoveSelectedBtn'),joinEl=$('manageJoinUrl'),people=state.managePeople.length?state.managePeople:state.people;if(joinEl)joinEl.textContent=joinLink();if(countEl)countEl.textContent=people.length;if(selectedEl)selectedEl.textContent=state.manageSelected.size;if(removeSelectedBtn)removeSelectedBtn.disabled=state.manageSelected.size===0;if(!grid)return;if(!people.length){grid.innerHTML='<div class="manage-empty">No students are currently in this Studio room.</div>';return;}grid.innerHTML=people.map((person,index)=>{const selected=state.manageSelected.has(person.id),photo=person.photo?`<img src="${person.photo}" alt="Portrait of ${escapeHtml(person.name)}" />`:`<div class="manage-initial">${escapeHtml(String(person.name||'?').charAt(0).toUpperCase())}</div>`;const linkedin=person.linkedin?`<a href="${escapeHtml(person.linkedin)}" target="_blank" rel="noopener">LinkedIn ↗</a>`:'';return `<article class="manage-person ${selected?'selected':''}" data-manage-card-id="${person.id}"><label class="manage-select"><input type="checkbox" data-manage-select-id="${person.id}" ${selected?'checked':''} /><span aria-hidden="true"></span><b>SELECT</b></label><div class="manage-photo">${photo}</div><div class="manage-copy"><div class="manage-number">${String(index+1).padStart(2,'0')}</div><h3>${escapeHtml(person.name)}</h3><p>${escapeHtml(person.answer)}</p>${linkedin}</div><div class="manage-actions"><button class="manage-photo-button" type="button" data-manage-photo-id="${person.id}">${person.photo?'CHANGE PHOTO':'ADD PHOTO'}</button><button class="manage-remove person-remove" type="button" data-person-id="${person.id}" data-person-name="${escapeHtml(person.name)}">REMOVE ONLY THIS ENTRY</button></div></article>`;}).join('');}
function validateLinkedIn(value){const raw=String(value||'').trim();if(!raw)return'';let url;try{url=new URL(raw);}catch{throw new Error('Please enter a valid LinkedIn profile URL.');}const host=url.hostname.toLowerCase(),validHost=['linkedin.com','www.linkedin.com'].includes(host),validPath=url.pathname.toLowerCase().startsWith('/in/');if(url.protocol!=='https:'||!validHost||!validPath)throw new Error('Please use your public LinkedIn profile URL, such as https://www.linkedin.com/in/your-name');url.search='';url.hash='';return url.toString();}
const excludedStudioNames=new Set(['ashok','ashok gaire','joe','brandi','brandi neal','broseph','broseph neal']);
function visiblePeople(people=[]){return people.filter(p=>CURRENT_SET.has(String(p?.name||'').trim().toLowerCase())&&!excludedStudioNames.has(String(p?.name||'').trim().toLowerCase()));}
function posterMission(count){return `${count} ${count===1?'student':'students'} turning curiosity into useful AI products through real client work.`;}
function conciseSignal(value,themes=[]){const raw=String(value||'').trim();const parts=raw?raw.split('×').map(v=>v.trim()).filter(Boolean):themes.map(v=>String(v).trim().toUpperCase()).filter(Boolean);return(parts.length?parts:['CURIOUS','EXPERIMENTAL','HUMAN-CENTERED']).slice(0,3).join(' × ');}
async function syncRemote(){if(!cfg.apiBase||state.demoMode)return;try{const response=await fetch(`${cfg.apiBase}?room=${encodeURIComponent(cfg.room)}&all=1`,{cache:'no-store'});if(!response.ok)throw new Error('sync failed');const data=await response.json();state.connected=true;setConnection('online');if(Array.isArray(data.people)){state.managePeople=data.people.slice(0,cfg.maxSignals);state.people=visiblePeople(data.people).slice(0,cfg.maxSignals);state.manageSelected=new Set([...state.manageSelected].filter(id=>state.managePeople.some(p=>p.id===id)));saveLocal();renderPeople();renderManageRoster();if(document.getElementById('join')?.classList.contains('active')&&!$('joinForm')?.classList.contains('hidden'))prepareJoinForm();}}catch(error){state.connected=false;setConnection('offline');console.warn('Live sync unavailable',error);}}
async function submitSignal(person){state.demoMode=false;if(!CURRENT_SET.has(String(person?.name||'').trim().toLowerCase()))throw new Error('Please choose your name from the current Studio roster.');if(cfg.apiBase){const response=await fetch(`${cfg.apiBase}?room=${encodeURIComponent(cfg.room)}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({room:cfg.room,person})});const data=await response.json().catch(()=>({}));if(!response.ok)throw new Error(data.reason==='room-full'?'The studio wall is full.':data.error||'Submission failed');state.connected=true;if(Array.isArray(data.people)){state.managePeople=data.people.slice(0,cfg.maxSignals);state.people=visiblePeople(data.people).slice(0,cfg.maxSignals);state.manageSelected=new Set([...state.manageSelected].filter(id=>state.managePeople.some(p=>p.id===id)));saveLocal();renderPeople();renderManageRoster();}return;}const existingIndex=state.people.findIndex(p=>p.id===person.id);if(existingIndex>=0)state.people[existingIndex]=person;else if(state.people.length<cfg.maxSignals)state.people.push(person);saveLocal();renderPeople();renderManageRoster();}
function renderPeople(){const grid=$('peopleGrid');if(!grid)return;grid.innerHTML='';for(let index=0;index<cfg.maxSignals;index+=1){const person=state.people[index],card=document.createElement('article');card.className=`person-card ${person?'filled':''}`;const portrait=person?.photo?`<img class="person-portrait" src="${person.photo}" alt="Portrait of ${escapeHtml(person.name)}" />`:'';const linkedInMark=person?.linkedin?'<span class="person-linkedin" title="LinkedIn profile included">in</span>':'';const remove=person?`<button class="person-remove" type="button" data-person-id="${person.id}" data-person-name="${escapeHtml(person.name)}" aria-label="Remove ${escapeHtml(person.name)}">REMOVE</button>`:'';card.innerHTML=`${portrait}${remove}<div class="person-num">${String(index+1).padStart(2,'0')}</div><div class="person-name">${person?`${escapeHtml(person.name)} ${linkedInMark}`:'WAITING'}</div><div class="person-answer">${person?escapeHtml(person.answer):'Signal not received yet.'}</div>`;grid.appendChild(card);}const count=state.people.length;$('count').textContent=count;if($('createPosterBtn'))$('createPosterBtn').disabled=count===0;const ready=$('readinessStatus'),hint=$('posterHint');if(count===0){if(ready)ready.textContent='Waiting for the first signal.';if(hint)hint.textContent='Add at least one student to create the poster.';}else if(count<cfg.maxSignals){if(ready)ready.textContent=`${count} of ${cfg.maxSignals} signals received.`;if(hint)hint.textContent=`Poster ready with ${count}. Best result when all ${cfg.maxSignals} students are in.`;}else{if(ready)ready.textContent='All seven signals received.';if(hint)hint.textContent='All seven students are in. Create the poster.';}}
async function resizePortrait(file){if(!file||!file.type.startsWith('image/'))throw new Error('Please choose an image.');if(file.size>12*1024*1024)throw new Error('That photo is too large. Choose one under 12 MB.');const bitmap=await createImageBitmap(file),side=Math.min(bitmap.width,bitmap.height),sx=(bitmap.width-side)/2,sy=(bitmap.height-side)/2,canvas=document.createElement('canvas');canvas.width=420;canvas.height=420;canvas.getContext('2d').drawImage(bitmap,sx,sy,side,side,0,0,420,420);bitmap.close?.();return canvas.toDataURL('image/jpeg',0.68);}
function fallbackSynthesis(){const count=state.people.length;return{themes:['curiosity','experimentation','human-centered','useful'],signal:'CURIOUS × EXPERIMENTAL × HUMAN-CENTERED × USEFUL',mission:posterMission(count),linkedin:`What happens when a classroom starts operating like an AI product studio?\n\nToday, ${count} students in NKU’s INF 396: AI Native Studio shared what they want to make possible with AI this semester.\n\nThose individual ambitions became our first studio signal.\n\nWe’re not studying AI. We’re building with it.\n\n7 humans. 2 clients. 1 AI studio.`,source:'fallback'};}
async function getSynthesis(){if(cfg.apiBase&&!state.demoMode){try{const response=await fetch(`${cfg.apiBase}/synthesize?room=${encodeURIComponent(cfg.room)}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({room:cfg.room})});if(response.ok){const result=await response.json();if(result?.mission)return result;}}catch(error){console.warn('AI synthesis unavailable',error);}}return fallbackSynthesis();}
function normalizePosterPeople(rawPeople=[]){
  const byName=new Map();
  const aliases=new Map([
    ['sean','Sean Cancel'],['phillip','Phillip Bierley'],['philip','Phillip Bierley'],
    ['mark','Mark Greene'],['elaina','Elaina Hall'],['nora','Nora Ernst']
  ]);

  for(const raw of Array.isArray(rawPeople)?rawPeople:[]){
    const original=String(raw?.name||'').trim();
    const lower=original.toLowerCase();
    let canonical=CURRENT_STUDENTS.find(name=>name.toLowerCase()===lower)||aliases.get(lower)||null;
    if(!canonical)continue;

    const candidate={...raw,name:canonical,missing:false};
    const existing=byName.get(canonical);
    if(!existing){
      byName.set(canonical,candidate);
      continue;
    }

    const candidateScore=(candidate.photo?4:0)+(candidate.answer?2:0)+(candidate.linkedin?1:0);
    const existingScore=(existing.photo?4:0)+(existing.answer?2:0)+(existing.linkedin?1:0);
    if(candidateScore>existingScore)byName.set(canonical,candidate);
  }

  return CURRENT_STUDENTS.map(name=>byName.get(name)||{
    id:`missing-${name.toLowerCase().replace(/[^a-z0-9]+/g,'-')}`,
    name,
    answer:'',
    linkedin:'',
    photo:'',
    missing:true
  });
}

function posterProfileStatus(people){
  const missingProfiles=people.filter(person=>person.missing);
  const missingPhotos=people.filter(person=>!person.missing&&!person.photo);
  return{
    ready:missingProfiles.length===0&&missingPhotos.length===0,
    missingProfiles,
    missingPhotos
  };
}

function posterCard(person){
  const item=document.createElement('article');
  item.className=`cohort-card ${person.missing?'is-missing':''}`;

  const photo=person.photo
    ? `<img src="${person.photo}" alt="Portrait of ${escapeHtml(person.name)}" />`
    : `<div class="cohort-card-placeholder" aria-hidden="true"><span>${escapeHtml(person.name.split(' ').map(part=>part[0]).join('').slice(0,2))}</span><small>${person.missing?'Awaiting profile':'Photo needed'}</small></div>`;

  item.innerHTML=`
    <div class="cohort-card-photo">${photo}</div>
    <h3 class="cohort-card-name">${escapeHtml(person.name)}</h3>
  `;
  return item;
}

function buildPosterAltText(people){
  const available=people.filter(person=>!person.missing);
  const names=available.map(person=>person.name).join(', ');
  const missing=people.filter(person=>person.missing).map(person=>person.name);
  let text=`LinkedIn poster for Northern Kentucky University’s Fall 2026 AI Native Studio inaugural cohort. The poster headline reads “Meet the inaugural AI Native Studio cohort.” It features student portraits for ${names||'the cohort'} and the line “We’re not just studying AI. We’re building with it.”`;
  if(missing.length)text+=` Profiles still awaiting submission: ${missing.join(', ')}.`;
  return text;
}

function renderPoster(rawPeople=state.people){
  const people=normalizePosterPeople(rawPeople);
  const row1=$('posterRow1'),row2=$('posterRow2');
  if(!row1||!row2)return people;

  row1.innerHTML='';
  row2.innerHTML='';
  people.slice(0,4).forEach(person=>row1.appendChild(posterCard(person)));
  people.slice(4,7).forEach(person=>row2.appendChild(posterCard(person)));

  const status=posterProfileStatus(people);
  const statusEl=$('posterStatus'),titleEl=$('posterReadyTitle'),saveBtn=$('savePosterBtn');

  if(status.ready){
    if(titleEl)titleEl.textContent='Poster ready to publish';
    if(statusEl)statusEl.textContent='All seven student profiles and photos are present.';
    if(saveBtn){saveBtn.disabled=false;saveBtn.textContent='SAVE FINAL POSTER PNG';}
  }else{
    const parts=[];
    if(status.missingProfiles.length)parts.push(`Awaiting profiles: ${status.missingProfiles.map(p=>p.name).join(', ')}`);
    if(status.missingPhotos.length)parts.push(`Photo needed: ${status.missingPhotos.map(p=>p.name).join(', ')}`);
    if(titleEl)titleEl.textContent='Poster preview';
    if(statusEl)statusEl.textContent=parts.join(' · ');
    if(saveBtn){saveBtn.disabled=false;saveBtn.textContent='SAVE PREVIEW PNG';}
  }

  window.AI_STUDIO_POSTER_PEOPLE=people;
  window.AI_STUDIO_POSTER_ALT_TEXT=buildPosterAltText(people);
  return people;
}

async function createPoster(rawPeople=state.people){
  const source=Array.isArray(rawPeople)?rawPeople:state.people;
  if(!source.length){window.alert('No cohort profiles are available for the poster yet.');return;}
  renderPoster(source);
  show('poster');
}

window.AI_STUDIO_CREATE_POSTER_FROM_PEOPLE=async function(people){
  const source=Array.isArray(people)?people:[];
  if(!source.length){window.alert('No cohort profiles are available for the poster yet.');return;}
  await createPoster(source);
};

async function copyCaption(){
  const people=window.AI_STUDIO_POSTER_PEOPLE||normalizePosterPeople(state.people);
  const completed=people.filter(person=>!person.missing).length;
  const text=`Meet the inaugural Fall 2026 AI Native Studio cohort at Northern Kentucky University.\n\nThis semester, our students are learning AI by building, testing, questioning, and working through real-world problems—not just studying the technology from the sidelines.\n\n${completed} of 7 student profiles are currently live.\n\nMeet the Studio: ${rosterLink()}`;
  try{
    await navigator.clipboard.writeText(text);
    const button=$('copyCaptionBtn'),original=button.textContent;
    button.textContent='CAPTION COPIED';
    setTimeout(()=>button.textContent=original,1400);
  }catch{window.prompt('Copy your LinkedIn caption:',text);}
}

async function copyAltText(){
  const text=window.AI_STUDIO_POSTER_ALT_TEXT||buildPosterAltText(normalizePosterPeople(state.people));
  try{
    await navigator.clipboard.writeText(text);
    const button=$('copyAltTextBtn'),original=button.textContent;
    button.textContent='ALT TEXT COPIED';
    setTimeout(()=>button.textContent=original,1400);
  }catch{window.prompt('Copy the image alt text:',text);}
}

async function savePosterPng(){
  const poster=$('linkedinPoster'),button=$('savePosterBtn');
  const people=window.AI_STUDIO_POSTER_PEOPLE||normalizePosterPeople(state.people);
  const status=posterProfileStatus(people);
  if(!poster||typeof html2canvas!=='function'){alert('Poster export is still loading. Try again in a moment.');return;}
  const original=button.textContent;
  button.disabled=true;
  button.textContent='PREPARING IMAGE…';
  try{
    await document.fonts?.ready;
    const canvas=await html2canvas(poster,{
      scale:2,
      backgroundColor:'#0b0d10',
      useCORS:true,
      allowTaint:false,
      logging:false,
      width:1200,
      height:1500,
      windowWidth:1200,
      windowHeight:1500
    });
    const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png',1));
    if(!blob)throw new Error('Could not create image');
    const filename=status.ready?'nku-ai-native-studio-inaugural-cohort.png':'nku-ai-native-studio-cohort-preview.png';
    const file=new File([blob],filename,{type:'image/png'});
    if(navigator.share&&navigator.canShare?.({files:[file]})){
      try{await navigator.share({files:[file],title:'NKU AI Native Studio · Inaugural Cohort'});return;}
      catch(error){if(error?.name==='AbortError')return;}
    }
    const url=URL.createObjectURL(blob),a=document.createElement('a');
    a.href=url;a.download=file.name;document.body.appendChild(a);a.click();a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),1500);
  }catch(error){
    console.error('Poster export failed',error);
    alert('The image could not be saved automatically. Please refresh and try again.');
  }finally{
    button.disabled=false;
    button.textContent=status.ready?'SAVE FINAL POSTER PNG':'SAVE PREVIEW PNG';
  }
}
function openRoster(){window.open(rosterLink(),'_blank','noopener');}
function loadDemo(){state.demoMode=true;state.synthesis=null;state.people=[{id:crypto.randomUUID(),name:'Aaron Kloss',answer:'Build intelligent agents that can make better decisions with people.',linkedin:'',photo:'',createdAt:new Date().toISOString()},{id:crypto.randomUUID(),name:'Aaron Milner',answer:'Learn how real AI teams move from uncertainty to working products.',linkedin:'',photo:'',createdAt:new Date().toISOString()},{id:crypto.randomUUID(),name:'Sean Cancel',answer:'Explore how AI systems can collaborate, learn, and support better decisions.',linkedin:'',photo:'',createdAt:new Date().toISOString()},{id:crypto.randomUUID(),name:'Phillip Bierley',answer:'Turn emerging AI capabilities into useful, testable experiences.',linkedin:'',photo:'',createdAt:new Date().toISOString()},{id:crypto.randomUUID(),name:'Mark Greene',answer:'Use computer vision to help people discover stories in museum collections.',linkedin:'',photo:'',createdAt:new Date().toISOString()},{id:crypto.randomUUID(),name:'Elaina Hall',answer:'Create human-centered AI experiences that make information easier to explore.',linkedin:'',photo:'',createdAt:new Date().toISOString()},{id:crypto.randomUUID(),name:'Nora Ernst',answer:'Experiment boldly while keeping the technology responsible and useful.',linkedin:'',photo:'',createdAt:new Date().toISOString()}];saveLocal();renderPeople();renderManageRoster();setConnection('demo');}
function canonicalLegacyPerson(person){
  const raw=String(person?.name||'').trim(),lower=raw.toLowerCase();
  if(CURRENT_SET.has(lower))return {...person,name:CURRENT_STUDENTS.find(n=>n.toLowerCase()===lower)};
  if(LEGACY_ALIAS.has(lower))return {...person,name:LEGACY_ALIAS.get(lower)};
  return null;
}
function renderLegacyAarons(candidates=[]){
  const host=$('legacyRecovery');if(!host)return;
  const bare=candidates.filter(p=>String(p?.name||'').trim().toLowerCase()==='aaron');
  if(!bare.length){host.classList.add('hidden');host.innerHTML='';return;}
  host.classList.remove('hidden');
  host.innerHTML='<div class="legacy-recovery-head"><div class="eyebrow">LEGACY PROFILE RECOVERY</div><h3>Identify the two Aaron profiles.</h3><p>The original Studio stored both Aaron students by first name only. Use the photo and response to assign each profile correctly.</p></div><div class="legacy-recovery-grid">'+bare.map((p,i)=>{
    const photo=p.photo?'<img src="'+p.photo+'" alt="Recovered Aaron profile '+(i+1)+'" />':'<div class="legacy-initial">A</div>';
    return '<article class="legacy-card"><div class="legacy-photo">'+photo+'</div><div><strong>Recovered Aaron '+(i+1)+'</strong><p>“'+escapeHtml(p.answer||'')+'”</p><div class="legacy-actions"><button type="button" class="secondary small legacy-assign" data-id="'+escapeHtml(p.id)+'" data-target="Aaron Kloss">AARON KLOSS</button><button type="button" class="secondary small legacy-assign" data-id="'+escapeHtml(p.id)+'" data-target="Aaron Milner">AARON MILNER</button></div></div></article>';
  }).join('')+'</div>';
  host.querySelectorAll('.legacy-assign').forEach(button=>button.addEventListener('click',async()=>{
    const person=bare.find(p=>p.id===button.dataset.id);if(!person)return;
    const target=button.dataset.target,original=button.textContent;button.disabled=true;button.textContent='IMPORTING…';
    try{await submitSignal({...person,name:target,createdAt:new Date().toISOString()});await syncRemote();button.closest('.legacy-card')?.remove();if(!host.querySelector('.legacy-card'))host.classList.add('hidden');}
    catch(error){alert(error?.message||'Could not import that profile.');}
    finally{button.disabled=false;button.textContent=original;}
  }));
}
async function importLegacyProfiles(){
  const button=$('manageImportLegacyBtn'),original=button?.textContent||'IMPORT';if(button){button.disabled=true;button.textContent='SEARCHING OLD ROOM…';}
  try{
    const response=await fetch(`${cfg.apiBase}?room=fall-2026-launch&all=1`,{cache:'no-store'});
    if(!response.ok)throw new Error('Could not read the original Studio room.');
    const data=await response.json(),legacy=Array.isArray(data.people)?data.people:[];
    const currentNames=new Set(state.people.map(p=>String(p.name||'').trim().toLowerCase()));
    let imported=0;
    for(const raw of legacy){
      const person=canonicalLegacyPerson(raw);
      if(!person||currentNames.has(person.name.toLowerCase()))continue;
      await submitSignal({...person,createdAt:new Date().toISOString()});
      currentNames.add(person.name.toLowerCase());imported++;
    }
    renderLegacyAarons(legacy);
    await syncRemote();
    const testCount=legacy.filter(p=>excludedStudioNames.has(String(p?.name||'').trim().toLowerCase())).length;
    alert(`Imported ${imported} real student profile${imported===1?'':'s'} into the clean cohort room. ${testCount} legacy test profile${testCount===1?' was':'s were'} excluded.`+(legacy.some(p=>String(p?.name||'').trim().toLowerCase()==='aaron')?' Use the Aaron recovery cards below to assign the two historical Aaron profiles.':''));
  }catch(error){alert(error?.message||'Could not import the legacy profiles.');}
  finally{if(button){button.disabled=false;button.textContent=original;}}
}
$('hostBtn').addEventListener('click',()=>show('host'));$('joinBtn').addEventListener('click',()=>{prepareJoinForm();show('join');});$('manageRosterBtn')?.addEventListener('click',()=>{renderManageRoster();show('manage');});$('manageBackBtn')?.addEventListener('click',()=>show('host'));$('manageOpenRosterBtn')?.addEventListener('click',openRoster);$('manageImportLegacyBtn')?.addEventListener('click',importLegacyProfiles);
$('manageCopyJoinBtn')?.addEventListener('click',async()=>{const button=$('manageCopyJoinBtn');try{await navigator.clipboard.writeText(joinLink());const original=button.textContent;button.textContent='LINK COPIED';setTimeout(()=>button.textContent=original,1200);}catch{window.prompt('Copy this student join link:',joinLink());}});document.querySelectorAll('[data-back]').forEach(button=>button.addEventListener('click',()=>show(button.dataset.back)));
$('photoInput').addEventListener('change',async event=>{const file=event.target.files?.[0];if(!file)return;try{state.pendingPhoto=await resizePortrait(file);$('portraitPreview').src=state.pendingPhoto;$('portraitPreviewWrap').classList.remove('hidden');$('photoPickerText').textContent='CHANGE PHOTO';}catch(error){alert(error.message||'Could not prepare that photo.');event.target.value='';}});
$('removePhotoBtn').addEventListener('click',()=>{state.pendingPhoto='';$('photoInput').value='';$('portraitPreviewWrap').classList.add('hidden');$('photoPickerText').textContent='TAKE OR CHOOSE PHOTO';});
$('joinForm').addEventListener('submit',async event=>{event.preventDefault();const form=event.currentTarget,name=$('nameInput').value.trim(),answer=$('answerInput').value.trim();if(!name||!answer)return;let linkedin='';try{linkedin=validateLinkedIn($('linkedinInput').value);}catch(error){alert(error.message);return;}const existing=currentParticipant();const person={id:participantId(),name,answer,linkedin,photo:state.pendingPhoto||existing?.photo||'',createdAt:existing?.createdAt||new Date().toISOString()};try{await submitSignal(person);form.classList.add('hidden');$('joinSuccess').classList.remove('hidden');$('joinSuccess').querySelector('h3').textContent=existing?'Profile updated.':'Signal received.';$('joinSuccess').querySelector('p').textContent=existing?'Your Studio profile and photo are up to date.':'You’re part of the studio poster.';$('studentRosterLink').href=rosterLink();}catch(error){alert(error?.message||'Your signal could not be submitted. Please try again.');}});
document.addEventListener('change',event=>{const checkbox=event.target.closest?.('[data-manage-select-id]');if(!checkbox)return;const id=checkbox.dataset.manageSelectId;if(checkbox.checked)state.manageSelected.add(id);else state.manageSelected.delete(id);renderManageRoster();});
$('manageRemoveSelectedBtn')?.addEventListener('click',async()=>{const ids=[...state.manageSelected];if(!ids.length)return;const people=state.managePeople.length?state.managePeople:state.people;const names=people.filter(p=>ids.includes(p.id)).map(p=>p.name);if(!window.confirm(`Remove ${names.length} selected entr${names.length===1?'y':'ies'} from the Studio?\n\n${names.join(', ')}`))return;const button=$('manageRemoveSelectedBtn');button.disabled=true;button.textContent='REMOVING…';try{if(typeof window.AI_STUDIO_REMOVE_PEOPLE!=='function')throw new Error('Roster removal is still loading. Refresh and try again.');await window.AI_STUDIO_REMOVE_PEOPLE(ids);}catch(error){button.disabled=false;button.textContent='REMOVE SELECTED';window.alert(error?.message||'Could not remove the selected entries.');}});
document.addEventListener('click',event=>{const button=event.target.closest?.('[data-manage-photo-id]');if(!button)return;state.managePhotoPersonId=button.dataset.managePhotoId||'';$('managePhotoInput')?.click();});
$('managePhotoInput')?.addEventListener('change',async event=>{const file=event.target.files?.[0],person=(state.managePeople.length?state.managePeople:state.people).find(p=>p.id===state.managePhotoPersonId);if(!file||!person)return;try{const photo=await resizePortrait(file);const updated={...person,photo};await submitSignal(updated);renderManageRoster();}catch(error){alert(error?.message||'Could not update that photo.');}finally{event.target.value='';state.managePhotoPersonId='';}});
$('copyJoinBtn').addEventListener('click',async()=>{try{await navigator.clipboard.writeText(joinLink());const button=$('copyJoinBtn'),original=button.textContent;button.textContent='COPIED';setTimeout(()=>button.textContent=original,1200);}catch{window.prompt('Copy this join link:',joinLink());}});
$('createPosterBtn').addEventListener('click',()=>createPoster(state.people));$('savePosterBtn').addEventListener('click',savePosterPng);$('copyCaptionBtn').addEventListener('click',copyCaption);$('copyAltTextBtn')?.addEventListener('click',copyAltText);$('openRosterBtn').addEventListener('click',openRoster);$('posterRosterBtn').addEventListener('click',openRoster);$('backToHostBtn').addEventListener('click',()=>show('host'));
window.addEventListener('storage',event=>{if(event.key===storageKey){loadLocal();renderPeople();}});
const joinUrl=joinLink();$('joinUrl').textContent=joinUrl;$('qrImage').src=`https://api.qrserver.com/v1/create-qr-code/?size=420x420&data=${encodeURIComponent(joinUrl)}`;$('studentRosterLink').href=rosterLink();const params=new URLSearchParams(window.location.search);loadLocal();renderPeople();renderManageRoster();if(params.get('manage')==='1')show('manage');else if(params.get('join')==='1'){prepareJoinForm();show('join');}syncRemote();setInterval(syncRemote,1000);