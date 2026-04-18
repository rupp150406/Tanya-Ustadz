// ============================================================
// PROJECT: TANYA USTADZ V3
// FILE: server/api/questions/index.post.ts
// DESC: Submit a new question (anonymous Jemaah)
//       - Rate limit: 5 questions / 5 min / fingerprint
//       - Input validation & sanitization (XSS prevention)
// ============================================================

import { defineEventHandler, readBody, getRequestIP, createError } from "h3";
import { createClient } from "@supabase/supabase-js";

// KONFIGURASI RATE LIMIT
const RATE_LIMIT_WINDOW_MS = 5 * 60 * 1000; // 5 menit
const MAX_SUBMISSIONS = 5; // Maksimal 5 pertanyaan

// Struktur log: fingerprint -> { count: jumlah, startTime: awal_jendela_waktu }
const submissionLog = new Map<string, { count: number; startTime: number }>();

const VALID_CATEGORIES = ["Fikih", "Akhlak & Adab", "Keluarga", "Muamalah", "Umum"] as const;

function getClientIP(event: any): string {
  const forwarded = event.node.req.headers["x-forwarded-for"];
  if (typeof forwarded === "string") return forwarded.split(",")[0].trim();
  return getRequestIP(event) ?? "unknown";
}

function sanitizeText(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;")
    .replace(/\//g, "&#x2F;");
}

export default defineEventHandler(async (event) => {
  const body = await readBody(event);

  // --- INPUT EXTRACTION ---
  // FIX BUG #1: Destructure 'category' sebagai 'rawCategory' agar tidak
  // bentrok dengan deklarasi ulang 'category' di bawah (variable shadowing).
  // Sebelumnya: const { question: rawQuestion, category, fingerprint: rawFingerprint } = body
  // lalu const category = rawCategory || null — rawCategory tidak pernah ada!
  const { question: rawQuestion, category: rawCategory, fingerprint: rawFingerprint } = body;

  // --- VALIDATION ---
  if (!rawQuestion) {
    throw createError({ statusCode: 400, message: "Pertanyaan tidak boleh kosong." });
  }
  if (!rawFingerprint) {
    throw createError({ statusCode: 400, message: "Fingerprint tidak valid." });
  }
  if (rawQuestion.length > 500) {
    throw createError({ statusCode: 400, message: "Pertanyaan maksimal 500 karakter." });
  }

  // FIX BUG #1 (lanjutan): Sekarang rawCategory ada, deklarasi ini valid.
  const category = rawCategory || null;
  if (category && !(VALID_CATEGORIES as readonly string[]).includes(category)) {
    throw createError({ statusCode: 400, message: "Kategori tidak valid." });
  }

  // --- RATE LIMIT LOGIC: 5 QUESTIONS PER 5 MINUTES ---
  const ip = getClientIP(event);
  const rateLimitKey = `${ip}:${rawFingerprint}`;
  const now = Date.now();
  const userLog = submissionLog.get(rateLimitKey);

  if (userLog) {
    // Jika jendela waktu 5 menit sudah berlalu, reset hitungan
    if (now - userLog.startTime > RATE_LIMIT_WINDOW_MS) {
      submissionLog.set(rateLimitKey, { count: 1, startTime: now });
    } else {
      // Jika masih dalam jendela 5 menit, cek jumlah kiriman
      if (userLog.count >= MAX_SUBMISSIONS) {
        const remainingMs = RATE_LIMIT_WINDOW_MS - (now - userLog.startTime);
        const waitMinutes = Math.ceil(remainingMs / 60000);
        const waitSeconds = Math.ceil((remainingMs % 60000) / 1000);
        
        throw createError({
          statusCode: 429,
          message: `Batas pengiriman tercapai (5 tanya/5 menit). Tunggu ${waitMinutes} menit ${waitSeconds} detik lagi.`,
        });
      }
      // Jika kuota masih ada, tambahkan hitungan
      userLog.count++;
    }
  } else {
    // Inisialisasi kiriman pertama dalam jendela waktu baru
    submissionLog.set(rateLimitKey, { count: 1, startTime: now });
  }

  // --- SANITIZE INPUT ---
  const safeQuestion = sanitizeText(rawQuestion);
  const safeCategory = category ? sanitizeText(category) : null;

  // --- INSERT INTO SUPABASE ---
  const config = useRuntimeConfig();
  const supabase = createClient(
    config.public.supabaseUrl,
    config.supabaseServiceRoleKey
  );

  const { data, error } = await supabase
    .from("questions")
    .insert([
      {
        question: safeQuestion,
        category: safeCategory,
        fingerprint: rawFingerprint
      }
    ])
    .select("id, ticket_id, created_at, status")
    .single();

  if (error) {
    console.error('ERROR INSERT:', error);
    throw createError({
      statusCode: 500,
      message: error.message || 'Gagal menyimpan ke database'
    });
  }

  // Cleanup Map secara berkala (Memory Management)
  if (submissionLog.size > 1000) {
    for (const [key, val] of submissionLog.entries()) {
      if (now - val.startTime > RATE_LIMIT_WINDOW_MS) submissionLog.delete(key);
    }
  }

  return {
    success: true,
    ticket_id: data.ticket_id,
    created_at: data.created_at,
  };
});