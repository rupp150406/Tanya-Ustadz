// ============================================================
// PROJECT: TANYA USTADZ V3
// FILE: composables/useUI.ts
// DESC: Global UI state — sidebar, modals, toast notifications
// ============================================================

export interface Toast {
  id: string;
  type: "success" | "error" | "info";
  message: string;
}

export const useUI = () => {
  // Semua state HARUS di dalam fungsi agar auto-import Nuxt berjalan sempurna
  const sidebarOpen = useState<boolean>("ui_sidebar", () => false);
  const replyModalOpen = useState<boolean>("ui_reply_modal", () => false);
  const activeQuestionId = useState<string | null>("ui_active_question", () => null);
  const toasts = useState<Toast[]>("ui_toasts", () => []);

  // --- SIDEBAR ---
  function toggleSidebar() {
    sidebarOpen.value = !sidebarOpen.value;
  }

  function closeSidebar() {
    sidebarOpen.value = false;
  }

  // --- REPLY MODAL (Ustadz) ---
  function openReplyModal(questionId: string) {
    activeQuestionId.value = questionId;
    replyModalOpen.value = true;
  }

  function closeReplyModal() {
    replyModalOpen.value = false;
    activeQuestionId.value = null;
  }

  // --- TOAST ---
  function showToast(type: Toast["type"], message: string, durationMs = 3500) {
    // Gunakan helper Nuxt jika crypto tidak tersedia di browser lama, 
    // tapi randomUUID sudah standar di browser modern.
    const id = Math.random().toString(36).substring(2, 9);
    toasts.value = [...toasts.value, { id, type, message }];

    // Auto-remove after duration
    setTimeout(() => {
      dismissToast(id);
    }, durationMs);
  }

  function dismissToast(id: string) {
    toasts.value = toasts.value.filter((t) => t.id !== id);
  }

  return {
    // State (dikembalikan langsung sebagai Ref agar reaktif)
    sidebarOpen,
    replyModalOpen,
    activeQuestionId,
    toasts,

    // Actions
    toggleSidebar,
    closeSidebar,
    openReplyModal,
    closeReplyModal,
    showToast,
    dismissToast,
  };
};