(() => {
  const cfg = window.AI_STUDIO_LAUNCH_CONFIG || { apiBase: "", maxSignals: 6, room: "fall-2026-launch" };
  const storageKey = `ai-native-studio:${cfg.room}`;

  function savePeople(people) {
    try { localStorage.setItem(storageKey, JSON.stringify(people)); } catch {}
    window.dispatchEvent(new StorageEvent("storage", { key: storageKey, newValue: JSON.stringify(people) }));
  }

  async function resetWithoutToken(event) {
    const button = event.target.closest?.("#resetBtn");
    if (!button) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    if (!window.confirm("Reset this studio session and remove all submitted signals and portraits?")) return;

    if (!cfg.apiBase) {
      savePeople([]);
      location.reload();
      return;
    }

    const response = await fetch(`${cfg.apiBase}?room=${encodeURIComponent(cfg.room)}`, { method: "DELETE" });
    if (!response.ok) {
      alert("Reset failed. Please try again.");
      return;
    }
    savePeople([]);
    location.reload();
  }

  async function removeWithoutToken(event) {
    const button = event.target.closest?.(".person-remove");
    if (!button) return;
    event.preventDefault();
    event.stopImmediatePropagation();

    const id = button.dataset.personId;
    const name = button.dataset.personName || "this person";
    if (!id || !window.confirm(`Remove ${name} from this studio session?`)) return;

    if (!cfg.apiBase) return;
    const response = await fetch(`${cfg.apiBase}/person?room=${encodeURIComponent(cfg.room)}&id=${encodeURIComponent(id)}`, { method: "DELETE" });
    if (!response.ok) {
      alert("Could not remove that person.");
      return;
    }
    const data = await response.json().catch(() => ({}));
    if (Array.isArray(data.people)) {
      savePeople(data.people.slice(0, cfg.maxSignals));
      location.reload();
    }
  }

  document.addEventListener("click", resetWithoutToken, true);
  document.addEventListener("click", removeWithoutToken, true);
})();
