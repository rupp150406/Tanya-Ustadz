// ============================================================
// PROJECT: TANYA USTADZ V3
// FILE: composables/useFingerprint.ts
// DESC: Generate stable fingerprint for anti-spam:
//       - 1 vote per question
//       - 1 question per 5 minutes
//       Fingerprint = hash(userAgent + random UUID from localStorage)
//       UUID is generated once and persisted in localStorage.
//       NOTE: fingerprint is sent to SERVER — IP is added server-side.
// ============================================================

const STORAGE_KEY = "tanya_ustadz_fp";

function generateUUID(): string {
  // Fallback if crypto.randomUUID is not available
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

// Pure-JS SHA-256. Same output as crypto.subtle.digest("SHA-256"), so a device
// gets the SAME fingerprint on http and https. Only used when crypto.subtle is
// missing (non-secure pages, e.g. http://192.168.x.x during local phone testing).
function sha256Fallback(input: string): string {
  const bytes = new TextEncoder().encode(input);
  const rotr = (x: number, n: number) => (x >>> n) | (x << (32 - n));

  // Constants: fractional parts of the square/cube roots of the first primes
  const K: number[] = [];
  const H: number[] = [];
  for (let candidate = 2; K.length < 64; candidate++) {
    let isPrime = true;
    for (let d = 2; d * d <= candidate; d++) {
      if (candidate % d === 0) { isPrime = false; break; }
    }
    if (!isPrime) continue;
    if (H.length < 8) H.push(((Math.sqrt(candidate) % 1) * 2 ** 32) | 0);
    K.push(((Math.cbrt(candidate) % 1) * 2 ** 32) | 0);
  }

  // Padding
  const len = bytes.length;
  const padded = new Uint8Array(((len + 9 + 63) >> 6) << 6);
  padded.set(bytes);
  padded[len] = 0x80;
  const view = new DataView(padded.buffer);
  view.setUint32(padded.length - 8, Math.floor((len * 8) / 2 ** 32));
  view.setUint32(padded.length - 4, (len * 8) >>> 0);

  const w = new Array<number>(64);
  for (let off = 0; off < padded.length; off += 64) {
    for (let i = 0; i < 16; i++) w[i] = view.getUint32(off + i * 4);
    for (let i = 16; i < 64; i++) {
      const s0 = rotr(w[i - 15], 7) ^ rotr(w[i - 15], 18) ^ (w[i - 15] >>> 3);
      const s1 = rotr(w[i - 2], 17) ^ rotr(w[i - 2], 19) ^ (w[i - 2] >>> 10);
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) | 0;
    }
    let [a, b, c, d, e, f, g, h] = H;
    for (let i = 0; i < 64; i++) {
      const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
      const ch = (e & f) ^ (~e & g);
      const t1 = (h + S1 + ch + K[i] + w[i]) | 0;
      const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const t2 = (S0 + maj) | 0;
      h = g; g = f; f = e; e = (d + t1) | 0;
      d = c; c = b; b = a; a = (t1 + t2) | 0;
    }
    H[0] = (H[0] + a) | 0; H[1] = (H[1] + b) | 0;
    H[2] = (H[2] + c) | 0; H[3] = (H[3] + d) | 0;
    H[4] = (H[4] + e) | 0; H[5] = (H[5] + f) | 0;
    H[6] = (H[6] + g) | 0; H[7] = (H[7] + h) | 0;
  }
  return H.map((x) => (x >>> 0).toString(16).padStart(8, "0")).join("");
}

async function hashString(input: string): Promise<string> {
  // crypto.subtle only exists on secure pages (HTTPS or localhost).
  const subtle = globalThis.crypto?.subtle;
  if (subtle) {
    const encoder = new TextEncoder();
    const data = encoder.encode(input);
    const hashBuffer = await subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  }
  return sha256Fallback(input);
}

export function useFingerprint() {
  const fingerprint = useState<string>("fingerprint", () => "");

  async function getFingerprint(): Promise<string> {
    // Return cached value if already computed
    if (fingerprint.value) return fingerprint.value;

    // Server-side: no localStorage, return placeholder
    if (typeof window === "undefined") return "ssr-placeholder";

    // Get or create UUID from localStorage
    let storedUUID = localStorage.getItem(STORAGE_KEY);
    if (!storedUUID) {
      storedUUID = generateUUID();
      localStorage.setItem(STORAGE_KEY, storedUUID);
    }

    // Combine with user agent for a more unique fingerprint
    const userAgent = navigator.userAgent;
    const raw = `${storedUUID}:${userAgent}`;
    const hashed = await hashString(raw);

    fingerprint.value = hashed;
    return hashed;
  }

  // Sync check: returns stored fingerprint or empty string
  // Use getFingerprint() for async resolution on first load
  function getFingerprintSync(): string {
    return fingerprint.value;
  }

  return {
    fingerprint,
    getFingerprint,
    getFingerprintSync,
  };
}