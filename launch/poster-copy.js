(() => {
  const cfg = window.AI_STUDIO_LAUNCH_CONFIG || { apiBase: '', maxSignals: 7, room: 'fall-2026-cohort' };
  const CURRENT_STUDENTS = new Set(['aaron kloss','aaron milner','sean cancel','phillip bierley','mark greene','elaina hall','nora ernst']);
  const LEGACY_FIRST_NAMES = new Set(['aaron','sean','phillip','philip','mark','elaina','nora']);
  const escapeHtml = (value = '') => String(value).replace(/[&<>'\"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#039;', '\"': '&quot;' }[ch]));

  const style = document.createElement('link');
  style.rel = 'stylesheet';
  style.href = 'showcase.css?v=22';
  document.head.appendChild(style);

  const footerStrong = document.querySelector('.poster-footer-copy strong');
  if (footerStrong) footerStrong.innerHTML = '<span id="posterCount">7</span> HUMANS · 2 TEAMS · 1 AI STUDIO';
  const posterMissionEl = document.getElementById('posterMission');
  if (posterMissionEl) posterMissionEl.textContent = 'Students turning curiosity into useful AI work through real-world studio challenges.';

  const landing = document.getElementById('landing');
  if (!landing) return;

  landing.classList.add('showcase-screen');
  landing.innerHTML = `
    <div class="showcase-wrap">
      <nav class="showcase-nav" aria-label="AI Native Studio">
        <div class="showcase-brand">Northern Kentucky University · AI Native Studio</div>
        <div class="showcase-term">Fall 2026 · Inaugural Cohort</div>
      </nav>

      <header class="showcase-hero">
        <div>
          <div class="showcase-kicker">Meet the Studio</div>
          <h1>7 humans.<br><span>1 semester.</span><br>A different way to learn AI.</h1>
        </div>
        <div>
          <p class="showcase-intro">We’re not studying AI from the sidelines. We’re learning by building, testing, questioning, and solving real problems.</p>
          <div class="showcase-actions">
            <button class="showcase-primary" id="showcasePosterBtn" disabled>View LinkedIn Poster</button>
            <button class="showcase-secondary" id="showcaseMeetBtn">Meet the Cohort ↓</button>
          </div>
        </div>
      </header>

      <div class="showcase-rule" aria-label="Studio at a glance">
        <div class="showcase-stat"><strong>7</strong><span>Emerging technologists</span></div>
        <div class="showcase-stat"><strong>2</strong><span>Studio teams</span></div>
        <div class="showcase-stat"><strong>1</strong><span>AI-native learning experience</span></div>
      </div>

      <section class="showcase-section" id="meetTheStudio" aria-labelledby="showcaseCohortTitle">
        <div class="showcase-section-head">
          <h2 id="showcaseCohortTitle">Meet the cohort.</h2>
          <p>Each student started the semester with one question: <strong>What do you want to make possible with AI?</strong> Their answers are the first signal of where this Studio could go.</p>
        </div>
        <div class="showcase-grid" id="showcaseGrid">
          <div class="showcase-loading">Loading the inaugural cohort…</div>
        </div>
      </section>

      <section class="showcase-philosophy" aria-labelledby="showcasePhilosophyTitle">
        <div class="showcase-philosophy-label">How the Studio works</div>
        <div>
          <h2 id="showcasePhilosophyTitle">Build later.<br>Understand first.</h2>
          <p>The Studio starts with people, problems, evidence, and uncertainty. Students learn to investigate before they invent — and to treat AI as a tool for solving meaningful problems, not the starting point.</p>
          <div class="showcase-method" aria-label="Studio method">
            <span>Discover</span><span>Understand</span><span>Build</span><span>Test</span><span>Learn</span>
          </div>
        </div>
      </section>

      <section class="showcase-tease" aria-labelledby="showcaseTeaseTitle">
        <div class="showcase-tease-label">What comes next</div>
        <h2 id="showcaseTeaseTitle">Real work is coming.</h2>
        <p>Two teams are preparing to take on real-world AI challenges. For now, meet the people. The work — and the organizations behind it — will be revealed next.</p>
        <div class="showcase-coming">Partner reveal coming soon</div>
      </section>

      <footer class="showcase-footer">
        <div><strong>INF 396 · AI Native Studio</strong><br>Northern Kentucky University</div>
        <div>Fall 2026 · Inaugural Cohort</div>
      </footer>
    </div>`;

  const grid = document.getElementById('showcaseGrid');
  const posterButton = document.getElementById('showcasePosterBtn');
  const underlyingPosterButton = document.getElementById('createPosterBtn');
  let showcasePeople = [];

  function showScreen(id) {
    document.querySelectorAll('.screen').forEach(screen => screen.classList.toggle('active', screen.id === id));
    window.scrollTo({ top: 0, behavior: 'instant' });
  }

  function readLocalPeople() {
    try {
      const storageKey = `ai-native-studio:${cfg.room}`;
      const parsed = JSON.parse(localStorage.getItem(storageKey) || '[]');
      return Array.isArray(parsed) ? parsed.filter(p => CURRENT_STUDENTS.has(String(p?.name || '').trim().toLowerCase()) || LEGACY_FIRST_NAMES.has(String(p?.name || '').trim().toLowerCase())).slice(0, cfg.maxSignals || 7) : [];
    } catch {
      return [];
    }
  }

  function renderCohort(people) {
    if (!grid) return;
    if (!people.length) {
      grid.innerHTML = '<div class="showcase-loading">The cohort showcase is being prepared.</div>';
      return;
    }
    grid.innerHTML = people.map(person => {
      const name = escapeHtml(person.name || 'AI Native Studio student');
      const answer = escapeHtml(person.answer || 'Exploring what AI can make possible.');
      const photo = person.photo
        ? `<img src="${person.photo}" alt="Portrait of ${name}" />`
        : `<div class="showcase-initial" aria-hidden="true">${escapeHtml((person.name || '?').charAt(0).toUpperCase())}</div>`;
      const linkedIn = person.linkedin
        ? `<a class="showcase-link" href="${escapeHtml(person.linkedin)}" target="_blank" rel="noopener" aria-label="View ${name} on LinkedIn">in</a>`
        : '';
      return `<article class="showcase-person">
        <div class="showcase-photo">${photo}</div>
        <div class="showcase-person-top"><h3>${name}</h3>${linkedIn}</div>
        <blockquote>${answer}</blockquote>
      </article>`;
    }).join('');
  }

  async function loadCohort() {
    let people = readLocalPeople();

    function allowed(person) {
      const name = String(person?.name || '').trim().toLowerCase();
      return CURRENT_STUDENTS.has(name) || LEGACY_FIRST_NAMES.has(name);
    }

    function mergeUnique(...groups) {
      const merged = [];
      const seenIds = new Set();
      const seenNames = new Set();
      let bareAaronCount = 0;

      for (const group of groups) {
        for (const person of (group || [])) {
          if (!allowed(person) || seenIds.has(person.id)) continue;

          const normalizedName = String(person?.name || '').trim().toLowerCase();

          if (normalizedName === 'aaron') {
            if (bareAaronCount >= 2) continue;
            bareAaronCount += 1;
          } else {
            if (seenNames.has(normalizedName)) continue;
            seenNames.add(normalizedName);
          }

          seenIds.add(person.id);
          merged.push(person);
        }
      }
      return merged.slice(0, cfg.maxSignals || 7);
    }

    function readHistoricalBrowserRooms() {
      const found = [];
      try {
        for (let i = 0; i < localStorage.length; i += 1) {
          const key = localStorage.key(i) || '';
          if (!key.startsWith('ai-native-studio:fall-2026-launch') || key.endsWith(':participant-id')) continue;
          const parsed = JSON.parse(localStorage.getItem(key) || '[]');
          if (Array.isArray(parsed)) found.push(...parsed.filter(allowed));
        }
      } catch {}
      return found;
    }

    async function fetchRoom(roomName) {
      try {
        const response = await fetch(`${cfg.apiBase}?room=${encodeURIComponent(roomName)}&all=1`, { cache: 'no-store' });
        if (!response.ok) return [];
        const data = await response.json();
        return Array.isArray(data.people) ? data.people.filter(allowed) : [];
      } catch {
        return [];
      }
    }

    const historical = readHistoricalBrowserRooms();
    if (cfg.apiBase) {
      const clean = await fetchRoom(cfg.room);
      const legacy = clean.length ? [] : await fetchRoom('fall-2026-launch');
      people = mergeUnique(clean, legacy, historical, people);
    } else {
      people = mergeUnique(historical, people);
    }

    showcasePeople = people;
    renderCohort(people);
    if (posterButton) posterButton.disabled = people.length === 0;
  }

  document.getElementById('showcaseMeetBtn')?.addEventListener('click', () => {
    document.getElementById('meetTheStudio')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  posterButton?.addEventListener('click', async () => {
    if (typeof window.AI_STUDIO_CREATE_POSTER_FROM_PEOPLE === 'function') {
      await window.AI_STUDIO_CREATE_POSTER_FROM_PEOPLE(showcasePeople);
      return;
    }
    if (underlyingPosterButton && !underlyingPosterButton.disabled) {
      underlyingPosterButton.click();
      return;
    }
    window.alert('The LinkedIn poster is still loading. Refresh the page and try again.');
  });

  const copyCaptionButton = document.getElementById('copyCaptionBtn');
  copyCaptionButton?.addEventListener('click', async event => {
    event.preventDefault();
    event.stopImmediatePropagation();
    const count = document.querySelectorAll('.showcase-person').length || 7;
    const url = new URL(window.location.href);
    url.search = '';
    url.hash = '';
    const caption = `What happens when students stop studying AI from the sidelines and start learning by building?\n\nMeet the inaugural Fall 2026 AI Native Studio cohort at Northern Kentucky University.\n\n${count} students. Two studio teams. One semester built around curiosity, evidence, experimentation, and human judgment.\n\nWe’re not revealing the work just yet. That comes next.\n\nMeet the Studio: ${url.toString()}`;
    try {
      await navigator.clipboard.writeText(caption);
      const original = copyCaptionButton.textContent;
      copyCaptionButton.textContent = 'CAPTION COPIED';
      setTimeout(() => { copyCaptionButton.textContent = original; }, 1400);
    } catch {
      window.prompt('Copy your LinkedIn caption:', caption);
    }
  }, true);

  document.getElementById('backToHostBtn')?.addEventListener('click', event => {
    event.preventDefault();
    event.stopImmediatePropagation();
    showScreen('landing');
  }, true);

  const params = new URLSearchParams(window.location.search);
  if (params.get('host') === '1') showScreen('host');

  loadCohort();

  const posterObserver = new MutationObserver(() => {
    const mission = document.getElementById('posterMission');
    if (mission && /client/i.test(mission.textContent || '')) {
      mission.textContent = 'Students turning curiosity into useful AI work through real-world studio challenges.';
    }
    const footer = document.querySelector('.poster-footer-copy strong');
    if (footer && /client/i.test(footer.textContent || '')) {
      footer.innerHTML = '<span id="posterCount">7</span> HUMANS · 2 TEAMS · 1 AI STUDIO';
    }
  });
  const poster = document.getElementById('linkedinPoster');
  if (poster) posterObserver.observe(poster, { childList: true, subtree: true, characterData: true });
})();
