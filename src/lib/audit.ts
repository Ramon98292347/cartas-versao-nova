export type AuditAction =
  | "worker_toggled"
  | "worker_reset_password"
  | "church_created"
  | "church_deactivated"
  | "church_pastor_changed"
  | "announcement_saved"
  | "announcement_deleted"
  | "letter_status_changed";

type AuditEntry = {
  action: AuditAction;
  at: string;
  data?: Record<string, unknown>;
};

const KEY = "ipda_audit_log";

export function addAuditLog(action: AuditAction, data?: Record<string, unknown>) {
  try {
    const raw = localStorage.getItem(KEY);
    const list: AuditEntry[] = raw ? JSON.parse(raw) : [];
    list.unshift({ action, at: new Date().toISOString(), data });
    localStorage.setItem(KEY, JSON.stringify(list.slice(0, 300)));
  } catch {
    // ignore logging errors
  }
}

