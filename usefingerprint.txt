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

async function hashString(input: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
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