(() => {
  const cfg = window.AI_STUDIO_LAUNCH_CONFIG || { apiBase: '', room: 'fall-2026-launch' };
  const nativeFetch = window.fetch.bind(window);

  function rosterUrl() {
    const url = new URL('roster.html', window.location.href);
    url.searchParams.set('room', cfg.room);
    return url.toString();
  }

  window.fetch = async (input, init = {}) => {
    try {
      const method = String(init.method || 'GET').toUpperCase();
      const target = typeof input === 'string' ? input : input?.url || '';
      if (method === 'POST' && cfg.apiBase && target.startsWith(cfg.apiBase) && !target.includes('/synthesize') && init.body) {
        const payload = JSON.parse(init.body);
        if (payload?.person) {
          payload.person.linkedin = document.getElementById('linkedinInput')?.value?.trim() || payload.person.linkedin || '';
          init = { ...init, body: JSON.stringify(payload) };
        }
      }
    } catch (error) {
      console.warn('LinkedIn profile capture skipped', error);
    }
    return nativeFetch(input, init);
  };

  window.addEventListener('DOMContentLoaded', () => {
    const roster = rosterUrl();
    const qr = document.getElementById('rosterQr');
    if (qr) qr.src = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(roster)}`;
    document.getElementById('openRosterBtn')?.addEventListener('click', () => window.open(roster, '_blank', 'noopener'));
  });
})();
