(function(){
  'use strict';
  const CONFIG = window.AI_STUDIO_CONFIG;
  const STORAGE_KEY = 'aistudio.foundation.v1';
  const charterFields = ['problem','primaryUsers','objective','inScope','outOfScope','expectedMvp','successMeasures','clientResponsibilities','studioResponsibilities','dataAccess','feedbackTurnaround','security','showcaseRestrictions','finalDeliverables','handoff','approval'];
  const discoveryFields = ['problem','primaryUsers','evidence','constraints','successMeasures','initialScope','sponsor','dayContact','approver','smEs','currentWorkflow','painPoints','dataAvailable','dataAccess','projectOwner','notes'];

  function blankProject(project){
    const starter = project.starter || {};
    const discovery = {};
    discoveryFields.forEach(k => discovery[k] = starter[k] || '');
    return {
      discovery,
      charter: {
        problem: starter.problem || '', primaryUsers: starter.primaryUsers || '', objective: starter.objective || '',
        inScope: starter.initialScope || '', outOfScope: '', expectedMvp: starter.expectedMvp || '',
        successMeasures: starter.successMeasures || '', clientResponsibilities: '', studioResponsibilities: '',
        dataAccess: '', feedbackTurnaround: '', security: starter.constraints || '', showcaseRestrictions: '',
        finalDeliverables: '', handoff: '', approval: ''
      },
      gate1: { decision: 'Not Ready', conditions: '', decisionDate: '', approvedBy: '', notes: '' },
      updatedAt: null
    };
  }

  function defaultState(){
    const projects = {};
    Object.values(CONFIG.projects).forEach(p => projects[p.id] = blankProject(p));
    return { version: CONFIG.version, projects };
  }

  function normalize(state){
    const base = defaultState();
    if(!state || typeof state !== 'object') return base;
    Object.keys(base.projects).forEach(id => {
      const incoming = state.projects && state.projects[id] ? state.projects[id] : {};
      base.projects[id] = {
        ...base.projects[id], ...incoming,
        discovery: {...base.projects[id].discovery, ...(incoming.discovery||{})},
        charter: {...base.projects[id].charter, ...(incoming.charter||{})},
        gate1: {...base.projects[id].gate1, ...(incoming.gate1||{})}
      };
    });
    return base;
  }

  const Store = {
    load(){ try { return normalize(JSON.parse(localStorage.getItem(STORAGE_KEY))); } catch(e){ return defaultState(); } },
    save(state){ localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); },
    export(){
      const blob = new Blob([JSON.stringify(Store.load(),null,2)],{type:'application/json'});
      const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='ai-native-studio-foundation-data.json'; a.click(); URL.revokeObjectURL(a.href);
    },
    import(file){
      const reader=new FileReader();
      reader.onload=()=>{ try{ Store.save(normalize(JSON.parse(reader.result))); location.reload(); } catch(e){ alert('That file is not valid AI Native Studio data.'); } };
      reader.readAsText(file);
    }
  };

  function esc(s){return String(s||'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));}
  function filled(v){return String(v||'').trim().length>2;}
  function gateEvidence(p){
    const d=p.discovery;
    return [
      ['Validated problem', filled(d.problem)], ['Primary users', filled(d.primaryUsers)], ['Evidence / current-state input', filled(d.evidence)],
      ['Constraints', filled(d.constraints)], ['Success measures', filled(d.successMeasures)], ['Initial scope', filled(d.initialScope)]
    ];
  }
  function gatePct(p){ const ev=gateEvidence(p); return Math.round(ev.filter(x=>x[1]).length/ev.length*100); }

  function renderLifecycle(active){
    const el=document.getElementById('lifecycle'); if(!el)return;
    el.innerHTML=CONFIG.lifecycle.map(([name,weeks])=>`<div class="phase ${name===active?'active':''}"><strong>${esc(name)}</strong><small>${esc(weeks)}</small></div>`).join('');
  }

  function renderDashboard(){
    const cards=document.getElementById('projectCards'); if(!cards)return;
    const state=Store.load();
    cards.innerHTML=Object.values(CONFIG.projects).map(project=>{
      const p=state.projects[project.id], pct=gatePct(p), status=p.gate1.decision;
      return `<article class="card project-card">
        <div class="project-head"><div><div class="eyebrow">Active engagement</div><h2>${esc(project.name)}</h2></div><span class="badge ${status==='GO'?'ok':status==='GO WITH CONDITIONS'?'warn':'bad'}">${esc(status)}</span></div>
        <div class="team">${esc(project.team.join(' · '))}</div>
        <div><div class="inline"><strong>Gate 1 readiness</strong><span class="muted">${pct}%</span></div><div class="progress" aria-label="Gate 1 readiness ${pct}%"><span style="width:${pct}%"></span></div></div>
        <div class="kv"><b>Phase</b><span>${esc(project.phase)}</span><b>Next gate</b><span>${esc(project.nextGate)}</span><b>Updated</b><span>${esc(p.updatedAt ? new Date(p.updatedAt).toLocaleString() : 'No saved activity yet')}</span></div>
        <a class="btn primary" href="workspace.html?project=${encodeURIComponent(project.id)}">Open project workspace</a>
      </article>`;
    }).join('');
    renderLifecycle('Discovery');
    const total=Object.values(state.projects).reduce((n,p)=>n+gatePct(p),0)/Object.keys(state.projects).length;
    const e=document.getElementById('portfolioProgress'); if(e)e.textContent=Math.round(total)+'%';
  }

  function projectFromUrl(){const id=new URLSearchParams(location.search).get('project')||'cmc'; return CONFIG.projects[id]||CONFIG.projects.cmc;}
  function bindTabs(){
    document.querySelectorAll('.tab').forEach(btn=>btn.addEventListener('click',()=>{
      document.querySelectorAll('.tab').forEach(b=>b.setAttribute('aria-selected','false'));
      document.querySelectorAll('.panel').forEach(p=>p.hidden=true);
      btn.setAttribute('aria-selected','true'); document.getElementById(btn.dataset.panel).hidden=false;
    }));
  }
  function setFormValues(scope,obj){ scope.querySelectorAll('[data-field]').forEach(el=>{ const k=el.dataset.field; if(k in obj) el.value=obj[k]||''; }); }
  function collect(scope){ const o={}; scope.querySelectorAll('[data-field]').forEach(el=>o[el.dataset.field]=el.value); return o; }
  function copyDiscoveryToCharter(state,id){
    const d=state.projects[id].discovery,c=state.projects[id].charter;
    ['problem','primaryUsers','successMeasures'].forEach(k=>{if(filled(d[k]))c[k]=d[k]});
    if(filled(d.initialScope)) c.inScope=d.initialScope;
    if(filled(d.constraints)) c.security=d.constraints;
    if(filled(d.dataAccess)) c.dataAccess=d.dataAccess;
  }
  function renderEvidence(projectState){
    const root=document.getElementById('gateEvidence'); if(!root)return;
    const ev=gateEvidence(projectState);
    root.innerHTML=ev.map(([label,ok])=>`<div class="evidence-row"><span><span class="state-dot ${ok?'ok':'warn'}"></span>${esc(label)}</span><strong>${ok?'Ready':'Missing'}</strong></div>`).join('');
    const pct=gatePct(projectState); document.getElementById('gatePercent').textContent=pct+'%';
    document.getElementById('gateProgress').style.width=pct+'%';
    document.getElementById('gateBlocker').textContent=pct===100?'Evidence package complete. A decision can be recorded.':`${ev.filter(x=>!x[1]).length} evidence item(s) still missing.`;
  }
  function saveWorkspace(){
    const project=projectFromUrl(),state=Store.load(),p=state.projects[project.id];
    p.discovery=collect(document.getElementById('discoveryPanel'));
    p.charter=collect(document.getElementById('charterPanel'));
    p.gate1=collect(document.getElementById('gatePanel'));
    p.updatedAt=new Date().toISOString(); Store.save(state); renderEvidence(p);
    const s=document.getElementById('saveStatus'); s.textContent='Saved locally '+new Date().toLocaleTimeString([], {hour:'numeric',minute:'2-digit'});
  }
  function renderWorkspace(){
    if(!document.getElementById('workspaceTitle')) return;
    const project=projectFromUrl(),state=Store.load(),p=state.projects[project.id];
    document.title=`AI Native Studio | ${project.name}`;
    document.getElementById('workspaceTitle').textContent=project.name;
    document.getElementById('workspaceTeam').textContent=project.team.join(' · ');
    document.getElementById('workspacePhase').textContent=project.phase;
    document.getElementById('workspaceGate').textContent=project.nextGate;
    const legacy=document.getElementById('legacyDiscovery');
    if(project.legacyDiscoveryUrl){legacy.href=project.legacyDiscoveryUrl;legacy.hidden=false}else legacy.hidden=true;
    setFormValues(document.getElementById('discoveryPanel'),p.discovery);
    setFormValues(document.getElementById('charterPanel'),p.charter);
    setFormValues(document.getElementById('gatePanel'),p.gate1);
    renderLifecycle(project.phase); renderEvidence(p); bindTabs();
    document.querySelectorAll('[data-autosave]').forEach(el=>el.addEventListener('change',saveWorkspace));
    document.getElementById('saveBtn').addEventListener('click',saveWorkspace);
    document.getElementById('charterFromDiscovery').addEventListener('click',()=>{const fresh=Store.load();fresh.projects[project.id].discovery=collect(document.getElementById('discoveryPanel'));copyDiscoveryToCharter(fresh,project.id);setFormValues(document.getElementById('charterPanel'),fresh.projects[project.id].charter);Store.save(fresh);saveWorkspace();});
  }
  function bindDataTools(){
    const exp=document.getElementById('exportData');if(exp)exp.addEventListener('click',Store.export);
    const imp=document.getElementById('importData');if(imp)imp.addEventListener('change',e=>{if(e.target.files[0])Store.import(e.target.files[0]);});
  }
  document.addEventListener('DOMContentLoaded',()=>{renderDashboard();renderWorkspace();bindDataTools();});
})();
