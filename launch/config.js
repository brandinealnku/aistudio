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

  function joinUrl() {
    const url = new URL(window.location.href);
    url.search = "";
    url.searchParams.set("join", "1");
    url.searchParams.set("room", room);
    url.hash = "";
    return url.toString();
  }

  function refreshJoinUi() {
    const url = joinUrl();
    const joinUrlEl = document.getElementById("joinUrl");
    const qrImage = document.getElementById("qrImage");
    if (joinUrlEl) joinUrlEl.textContent = url;
    if (qrImage) qrImage.src = `https://api.qrserver.com/v1/create-qr-code/?size=420x420&data=${encodeURIComponent(url)}`;
  }

  document.addEventListener("click", async (event) => {
    const resetButton = event.target.closest?.("#resetBtn");
    if (resetButton) {
      event.preventDefault();
      event.stopImmediatePropagation();
      if (!window.confirm("Start a fresh studio session? The current room will be left unchanged, and a new empty room will open.")) return;
      const nextRoom = `fall-2026-launch-${Date.now().toString(36)}`;
      localStorage.setItem(ROOM_KEY, nextRoom);
      const url = new URL(window.location.href);
      url.search = "";
      url.searchParams.set("room", nextRoom);
      url.hash = "";
      window.location.href = url.toString();
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
