import { DurableObject } from "cloudflare:workers";

const DEFAULT_MAX_SIGNALS = 6;
const MAX_NAME_LENGTH = 40;
const MAX_ANSWER_LENGTH = 240;
const DEFAULT_AI_MODEL = "@cf/meta/llama-3.1-8b-instruct";

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

function fallbackSynthesis(people) {
  const count = people.length;
  return {
    themes: ["curiosity", "experimentation", "human-centered", "useful"],
    signal: "CURIOUS × EXPERIMENTAL × HUMAN-CENTERED × USEFUL",
    mission: `We are ${count} students turning curiosity into useful AI products—experimenting boldly, building responsibly, and learning through real work.`,
    prediction: "Six NKU students prove what happens when the classroom starts operating like an AI product studio.",
    linkedin: `I asked ${count} students one question: “What do you want to make possible with AI this semester?”\n\nTheir answers became the first signal for INF 396: AI Native Studio. We’re not studying AI. We’re building with it.\n\n6 humans. 2 clients. 1 AI studio.`,
    source: "fallback",
  };
}

function cleanSynthesis(value, people) {
  const fallback = fallbackSynthesis(people);
  const input = value && typeof value === "object" ? value : {};
  const themes = Array.isArray(input.themes)
    ? input.themes.map((item) => String(item).trim()).filter(Boolean).slice(0, 5)
    : fallback.themes;
  const mission = String(input.mission || "").trim().slice(0, 320) || fallback.mission;
  const prediction = String(input.prediction || "").trim().slice(0, 260) || fallback.prediction;
  const linkedin = String(input.linkedin || "").trim().slice(0, 1100) || fallback.linkedin;
  const signal = String(input.signal || "").trim().slice(0, 180) || themes.map((item) => item.toUpperCase()).join(" × ");
  return { themes, signal, mission, prediction, linkedin, source: "ai" };
}

function parseModelJson(response) {
  const raw = typeof response === "string"
    ? response
    : String(response?.response || response?.result?.response || "");
  const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("AI response did not contain JSON");
  return JSON.parse(cleaned.slice(start, end + 1));
}

async function synthesizeWithAI(env, people) {
  if (!env.AI) return fallbackSynthesis(people);
  const responses = people.map((person, index) => `${index + 1}. ${person.answer}`).join("\n");
  const prompt = `You are synthesizing the first-day identity of a university AI product studio.\n\nThe students answered: “What do you want to make possible with AI this semester?”\n\nRESPONSES:\n${responses}\n\nReturn ONLY valid JSON with exactly these keys:\n{\n  "themes": ["3 to 5 short themes, 1-3 words each"],\n  "signal": "the themes as a punchy uppercase line separated by ×",\n  "mission": "one vivid sentence, 22-38 words, grounded only in the responses",\n  "prediction": "one ambitious but plausible December 2026 headline, 16-28 words",\n  "linkedin": "a LinkedIn-ready launch caption, 70-130 words, warm and energetic, beginning with a strong hook and ending with '6 humans. 2 clients. 1 AI studio.'"\n}\n\nDo not invent specific student accomplishments, client outcomes, or facts not present in the responses. Do not use hashtags. Avoid generic corporate language.`;

  try {
    const response = await env.AI.run(env.AI_MODEL || DEFAULT_AI_MODEL, { prompt });
    return cleanSynthesis(parseModelJson(response), people);
  } catch (error) {
    console.error(JSON.stringify({ event: "ai_synthesis_fallback", message: error?.message || "AI synthesis failed" }));
    return fallbackSynthesis(people);
  }
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
        return json({ ok: true, service: "inf396-launch", ai: Boolean(env.AI) }, 200, cors);
      }

      const roomName = normalizeRoom(url.searchParams.get("room") || undefined);
      const room = env.LAUNCH_ROOM.getByName(roomName);
      const maxSignals = Number(env.MAX_SIGNALS || DEFAULT_MAX_SIGNALS);

      if (url.pathname === "/synthesize" && request.method === "POST") {
        const people = await room.list(maxSignals);
        if (!people.length) return json({ error: "No signals to synthesize" }, 409, cors);
        const synthesis = await synthesizeWithAI(env, people);
        return json({ room: roomName, count: people.length, ...synthesis }, 200, cors);
      }

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
