import { apiClient } from "./axiosClient";
import type { NotificationItem } from "@/shared/types";

export const notificationsApi = {
  list: (unreadOnly = false) =>
    apiClient
      .get<NotificationItem[]>("/notifications", { params: { unread_only: unreadOnly } })
      .then((r) => r.data),

  unreadCount: () =>
    apiClient.get<{ count: number }>("/notifications/unread-count").then((r) => r.data.count),

  markRead: (id: string) => apiClient.patch(`/notifications/${id}/lu`),

  markAllRead: () => apiClient.post("/notifications/lire-tout"),
};
