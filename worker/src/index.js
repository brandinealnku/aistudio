import { DurableObject } from "cloudflare:workers";

const DEFAULT_MAX_SIGNALS = 6;
const MAX_NAME_LENGTH = 40;
const MAX_ANSWER_LENGTH = 240;

function json(data, status = 200, extraHeaders = {}) {
  return Response.json(data, {
    status,
    headers: {
      "Cache-Control": "no-store",
      ...extraHeaders,
    },
  });
}

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
  if (!/^[a-z0-9][a-z0-9-]{2,63}$/.test(room)) {
    throw new Error("Invalid room name");
  }
  return room;
}

function normalizePerson(value) {
  const person = value && typeof value === "object" ? value : {};
  const id = String(person.id || "").trim();
  const name = String(person.name || "").trim().slice(0, MAX_NAME_LENGTH);
  const answer = String(person.answer || "").trim().slice(0, MAX_ANSWER_LENGTH);
  const createdAt = String(person.createdAt || new Date().toISOString());

  if (!/^[a-f0-9-]{36}$/i.test(id)) throw new Error("Invalid participant id");
  if (!name || !answer) throw new Error("Name and answer are required");
  return { id, name, answer, createdAt };
}

async function verifyToken(provided, expected) {
  if (!expected) return false;
  const encoder = new TextEncoder();
  const [providedHash, expectedHash] = await Promise.all([
    crypto.subtle.digest("SHA-256", encoder.encode(provided || "")),
    crypto.subtle.digest("SHA-256", encoder.encode(expected)),
  ]);
  return crypto.subtle.timingSafeEqual(providedHash, expectedHash);
}

export class LaunchRoom extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    ctx.blockConcurrencyWhile(async () => {
      this.ctx.storage.sql.exec(`
        CREATE TABLE IF NOT EXISTS signals (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          answer TEXT NOT NULL,
          created_at TEXT NOT NULL
        )
      `);
    });
  }

  list(maxSignals = DEFAULT_MAX_SIGNALS) {
    return this.ctx.storage.sql
      .exec(
        "SELECT id, name, answer, created_at AS createdAt FROM signals ORDER BY created_at ASC LIMIT ?",
        maxSignals,
      )
      .toArray();
  }

  upsert(person, maxSignals = DEFAULT_MAX_SIGNALS) {
    const existing = this.ctx.storage.sql
      .exec("SELECT id FROM signals WHERE id = ? LIMIT 1", person.id)
      .toArray();

    if (existing.length === 0) {
      const count = this.ctx.storage.sql.exec("SELECT COUNT(*) AS count FROM signals").one().count;
      if (Number(count) >= maxSignals) {
        return { accepted: false, reason: "room-full", people: this.list(maxSignals) };
      }
    }

    this.ctx.storage.sql.exec(
      `INSERT INTO signals (id, name, answer, created_at)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         name = excluded.name,
         answer = excluded.answer,
         created_at = excluded.created_at`,
      person.id,
      person.name,
      person.answer,
      person.createdAt,
    );

    return { accepted: true, people: this.list(maxSignals) };
  }

  clear() {
    this.ctx.storage.sql.exec("DELETE FROM signals");
    return { people: [] };
  }
}

export default {
  async fetch(request, env) {
    const cors = corsHeaders(request, env);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: cors });
    }

    try {
      const url = new URL(request.url);
      if (url.pathname === "/health") {
        return json({ ok: true, service: "inf396-launch" }, 200, cors);
      }

      const roomName = normalizeRoom(url.searchParams.get("room") || undefined);
      const room = env.LAUNCH_ROOM.getByName(roomName);
      const maxSignals = Number(env.MAX_SIGNALS || DEFAULT_MAX_SIGNALS);

      if (request.method === "GET") {
        return json({ room: roomName, people: await room.list(maxSignals) }, 200, cors);
      }

      if (request.method === "POST") {
        const body = await request.json();
        const submittedRoom = normalizeRoom(body.room || roomName);
        const target = env.LAUNCH_ROOM.getByName(submittedRoom);
        const person = normalizePerson(body.person);
        const result = await target.upsert(person, maxSignals);
        return json({ room: submittedRoom, ...result }, result.accepted ? 200 : 409, cors);
      }

      if (request.method === "DELETE") {
        const resetToken = request.headers.get("X-Reset-Token") || "";
        if (!(await verifyToken(resetToken, env.RESET_TOKEN))) {
          return json({ error: "Unauthorized" }, 401, cors);
        }
        return json({ room: roomName, ...(await room.clear()) }, 200, cors);
      }

      return json({ error: "Method not allowed" }, 405, cors);
    } catch (error) {
      console.error(JSON.stringify({ event: "request_error", message: error?.message || "Unknown error" }));
      return json({ error: error?.message || "Request failed" }, 400, cors);
    }
  },
};
