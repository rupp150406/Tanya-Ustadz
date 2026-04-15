// ============================================================
// PROJECT: TANYA USTADZ V3
// FILE: server/api/verify-gate.post.ts
// DESC: Gate 1 — validates the secret password (server-only)
//       - Password NEVER exposed to client
//       - Rate limit: 5 failed attempts / IP / 15 minutes
//       - 500ms artificial delay on failure
// ============================================================

import { defineEventHandler, readBody, getRequestIP, createError } from "h3";
import { createClient } from "@supabase/supabase-js";

// In-memory rate limit store (per server instance)
// For production, consider using Redis via Upstash if scaling horizontally
const failedAttempts = new Map<string, { count: number; resetAt: number }>();

const RATE_LIMIT_MAX    = 5;          // max failed attempts
const RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 minutes in ms
const FAILURE_DELAY_MS  = 500;         // artificial delay per failed attempt

function getClientIP(event: any): string {
  // Prefer x-forwarded-for (Vercel/Netlify proxy header)
  const forwarded = event.node.req.headers["x-forwarded-for"];
  if (typeof forwarded === "string") return forwarded.split(",")[0].trim();
  return getRequestIP(event) ?? "unknown";
}

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const record = failedAttempts.get(ip);

  if (!record) return false;

  // Reset window if expired
  if (now > record.resetAt) {
    failedAttempts.delete(ip);
    return false;
  }

  return record.count >= RATE_LIMIT_MAX;
}

function recordFailedAttempt(ip: string): void {
  const now = Date.now();
  const record = failedAttempts.get(ip);

  if (!record || now > record.resetAt) {
    failedAttempts.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
  } else {
    record.count += 1;
  }
}

function clearFailedAttempts(ip: string): void {
  failedAttempts.delete(ip);
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export default defineEventHandler(async (event) => {
  const ip = getClientIP(event);

  // --- RATE LIMIT CHECK ---
  if (isRateLimited(ip)) {
    throw createError({
      statusCode: 429,
      statusMessage: "Too Many Requests",
      message: "Terlalu banyak percobaan. Coba lagi dalam 15 menit.",
    });
  }

  // --- READ BODY ---
  const body = await readBody(event);
  const inputPassword: string = (body?.password ?? "").trim();

  if (!inputPassword) {
    throw createError({
      statusCode: 400,
      statusMessage: "Bad Request",
      message: "Password tidak boleh kosong.",
    });
  }

  // --- COMPARE PASSWORD (server-side only, never exposed to client) ---
  const correctPassword = process.env.ADMIN_GATE_PASSWORD;

  if (!correctPassword) {
    // Misconfiguration — do not leak details
    console.error("[verify-gate] ADMIN_GATE_PASSWORD is not set in environment.");
    throw createError({
      statusCode: 500,
      statusMessage: "Internal Server Error",
      message: "Konfigurasi server bermasalah.",
    });
  }

  if (inputPassword !== correctPassword) {
    // Artificial delay before responding to failed attempt
    await delay(FAILURE_DELAY_MS);
    recordFailedAttempt(ip);

    const record = failedAttempts.get(ip);
    const remaining = RATE_LIMIT_MAX - (record?.count ?? 0);

    throw createError({
      statusCode: 401,
      statusMessage: "Unauthorized",
      message:
        remaining > 0
          ? `Password salah. ${remaining} percobaan tersisa.`
          : "Terlalu banyak percobaan. Coba lagi dalam 15 menit.",
    });
  }

  // --- SUCCESS: clear any previous failure record ---
  clearFailedAttempts(ip);

  // Set HttpOnly cookie: gate_access=true, 24 hours, SameSite=Strict
  // Nuxt setCookie util
  const { setCookie } = await import("h3");
  setCookie(event, "gate_access", "true", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 60 * 60 * 24, // 24 hours in seconds
    path: "/",
  });

  return { success: true };
});