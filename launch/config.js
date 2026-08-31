(() => {
  const DEFAULT_ROOM = "fall-2026-launch";
  const ROOM_KEY = "ai-native-studio:active-room";
  const params = new URLSearchParams(window.location.search);
  const roomFromUrl = params.get("room");
  const savedRoom = localStorage.getItem(ROOM_KEY);
  const room = roomFromUrl || savedRoom || DEFAULT_ROOM;

  localStorage.setItem(ROOM_KEY, room);

  window.AI_STUDIO_LAUNCH_CONFIG = {
    apiBase: "https://aistudio.brandineildehaven.workers.dev",
    maxSignals: 6,
    room
  };

  function joinUrl(activeRoom = room) {
    const url = new URL(window.location.href);
    url.search = "";
    url.searchParams.set("join", "1");
    url.searchParams.set("room", activeRoom);
    url.hash = "";
    return url.toString();
  }

  function navigateToRoom(nextRoom) {
    localStorage.setItem(ROOM_KEY, nextRoom);
    const url = new URL(window.location.href);
    url.search = "";
    url.searchParams.set("room", nextRoom);
    url.hash = "";
    window.location.href = url.toString();
  }

  function refreshJoinUi() {
    const url = joinUrl();
    const joinUrlEl = document.getElementById("joinUrl");
    const qrImage = document.getElementById("qrImage");
    if (joinUrlEl) joinUrlEl.textContent = url;
    if (qrImage) qrImage.src = `https://api.qrserver.com/v1/create-qr-code/?size=420x420&data=${encodeURIComponent(url)}`;
  }

  async function cloneRoomWithoutPerson(personId) {
    const response = await fetch(`${window.AI_STUDIO_LAUNCH_CONFIG.apiBase}?room=${encodeURIComponent(room)}`, { cache: "no-store" });
    if (!response.ok) throw new Error("Could not read the current studio room.");
    const data = await response.json();
    const remaining = Array.isArray(data.people) ? data.people.filter((person) => person.id !== personId) : [];
    const nextRoom = `fall-2026-launch-${Date.now().toString(36)}`;

    for (const person of remaining) {
      const createResponse = await fetch(`${window.AI_STUDIO_LAUNCH_CONFIG.apiBase}?room=${encodeURIComponent(nextRoom)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ room: nextRoom, person })
      });
      if (!createResponse.ok) throw new Error("Could not create the updated studio room.");
    }

    navigateToRoom(nextRoom);
  }

  document.addEventListener("click", async (event) => {
    const resetButton = event.target.closest?.("#resetBtn");
    if (resetButton) {
      event.preventDefault();
      event.stopImmediatePropagation();
      if (!window.confirm("Start a fresh studio session? The current room will be left unchanged, and a new empty room will open.")) return;
      navigateToRoom(`fall-2026-launch-${Date.now().toString(36)}`);
      return;
    }

    const removeButton = event.target.closest?.(".person-remove");
    if (removeButton) {
      event.preventDefault();
      event.stopImmediatePropagation();
      const personId = removeButton.dataset.personId;
      const personName = removeButton.dataset.personName || "this person";
      if (!personId || !window.confirm(`Remove ${personName} from this studio session?`)) return;
      removeButton.disabled = true;
      const oldText = removeButton.textContent;
      removeButton.textContent = "REMOVING…";
      try {
        await cloneRoomWithoutPerson(personId);
      } catch (error) {
        removeButton.disabled = false;
        removeButton.textContent = oldText;
        window.alert(error?.message || "Could not remove that person.");
      }
      return;
    }

    const copyButton = event.target.closest?.("#copyJoinBtn");
    if (copyButton) {
      event.preventDefault();
      event.stopImmediatePropagation();
      try {
        await navigator.clipboard.writeText(joinUrl());
        const old = copyButton.textContent;
        copyButton.textContent = "COPIED";
        setTimeout(() => copyButton.textContent = old, 1200);
      } catch {
        window.prompt("Copy this join link:", joinUrl());
      }
    }
  }, true);

  window.addEventListener("DOMContentLoaded", () => setTimeout(refreshJoinUi, 0));
  window.addEventListener("load", refreshJoinUi);
})();
