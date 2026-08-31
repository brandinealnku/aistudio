(() => {
  const cfg = window.AI_STUDIO_LAUNCH_CONFIG || { apiBase: '', room: 'fall-2026-launch', maxSignals: 6 };
  const params = new URLSearchParams(location.search);
  const room = params.get('room') || cfg.room;
  const grid = document.getElementById('rosterGrid');
  const status = document.getElementById('rosterStatus');
  const escapeHtml = value => String(value || '').replace(/[&<>'"]/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#039;','"':'&quot;'}[ch]));

  function card(person, index) {
    const portrait = person.photo ? `<img src="${person.photo}" alt="Portrait of ${escapeHtml(person.name)}">` : `<div class="roster-placeholder">${escapeHtml(String(person.name || '?').charAt(0).toUpperCase())}</div>`;
    const linkedin = person.linkedin ? `<a class="roster-linkedin" href="${escapeHtml(person.linkedin)}" target="_blank" rel="noopener">VIEW LINKEDIN ↗</a>` : `<span class="roster-linkedin muted">LINKEDIN NOT ADDED</span>`;
    return `<article class="roster-card"><div class="roster-index">${String(index + 1).padStart(2,'0')}</div><div class="roster-media">${portrait}</div><h2>${escapeHtml(person.name)}</h2><p>${escapeHtml(person.answer)}</p>${linkedin}</article>`;
  }

  async function load() {
    if (!cfg.apiBase) { status.textContent = 'Studio roster is unavailable offline.'; return; }
    try {
      const response = await fetch(`${cfg.apiBase}?room=${encodeURIComponent(room)}`, { cache: 'no-store' });
      if (!response.ok) throw new Error('Could not load studio');
      const data = await response.json();
      const people = Array.isArray(data.people) ? data.people.slice(0, cfg.maxSignals || 6) : [];
      grid.innerHTML = people.map(card).join('');
      status.textContent = people.length ? `${people.length} studio member${people.length === 1 ? '' : 's'} · Fall 2026` : 'The studio roster is waiting for its first member.';
    } catch (error) {
      console.warn(error);
      status.textContent = 'Could not load the studio roster right now.';
    }
  }
  load();
})();
