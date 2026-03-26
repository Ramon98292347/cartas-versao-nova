import { api } from "@/lib/endpoints";
import { registerSyncHandler } from "@/lib/offline/syncEngine";

let handlersRegistered = false;

function toOptionalString(value: unknown): string | undefined {
  const safe = String(value || "").trim();
  return safe || undefined;
}

export function registerDefaultOfflineHandlers() {
  if (handlersRegistered) return;
  handlersRegistered = true;

  registerSyncHandler("notifications", "update", async (item) => {
    const mode = String(item.payload?.mode || "").trim();
    const churchTotvsId = toOptionalString(item.payload?.church_totvs_id);

    if (mode === "mark-read") {
      const id = toOptionalString(item.payload?.id);
      if (!id) throw new Error("missing_notification_id");
      await api.markNotificationRead({ id, church_totvs_id: churchTotvsId });
      return;
    }

    if (mode === "mark-all-read") {
      await api.markAllNotificationsRead({ church_totvs_id: churchTotvsId });
      return;
    }

    throw new Error(`unknown_notifications_mode:${mode}`);
  });
}

