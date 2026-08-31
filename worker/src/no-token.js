import base, { LaunchRoom } from "./index.js";

const DEFAULT_MAX_SIGNALS = 6;

function corsHeaders(request, env) {
  const origin = request.headers.get("Origin") || "";
  const allowed = (env.ALLOWED_ORIGINS || "https://brandinealnku.github.io")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  const allowOrigin = allowed.includes(origin) ? origin : allowed[0];
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": "GET,POST,DELETE,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type,X-Reset-Token",
    Vary: "Origin",
  };
}

function normalizeRoom(value) {
  const room = String(value || "fall-2026-launch").trim().toLowerCase();
  if (!/^[a-z0-9][a-z0-9-]{2,63}$/.test(room)) throw new Error("Invalid room name");
  return room;
}

function normalizeId(value) {
  const id = String(value || "").trim();
  if (!/^[a-f0-9-]{36}$/i.test(id)) throw new Error("Invalid participant id");
  return id;
}

function json(data, status, headers) {
  return Response.json(data, {
    status,
    headers: { "Cache-Control": "no-store", ...headers },
  });
}

export { LaunchRoom };

export default {
  async fetch(request, env, ctx) {
    if (request.method !== "DELETE") return base.fetch(request, env, ctx);

    const cors = corsHeaders(request, env);
    try {
      const url = new URL(request.url);
      const roomName = normalizeRoom(url.searchParams.get("room") || undefined);
      const room = env.LAUNCH_ROOM.getByName(roomName);
      const max = Number(env.MAX_SIGNALS || DEFAULT_MAX_SIGNALS);

      if (url.pathname === "/person") {
        const id = normalizeId(url.searchParams.get("id"));
        return json({ room: roomName, ...(await room.remove(id, max)) }, 200, cors);
      }

      return json({ room: roomName, ...(await room.clear()) }, 200, cors);
    } catch (error) {
      console.error(JSON.stringify({ event: "delete_request_error", message: error?.message || "Unknown error" }));
      return json({ error: error?.message || "Request failed" }, 400, cors);
    }
  },
};
