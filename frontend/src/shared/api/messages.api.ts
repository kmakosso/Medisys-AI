import { apiClient } from "./axiosClient";
import type { Conversation, Message } from "@/shared/types";

export const messagesApi = {
  listConversations: () =>
    apiClient.get<Conversation[]>("/messages").then((r) => r.data),

  /** Démarre ou récupère une conversation. Le patient fournit medecinId,
   * le médecin fournit patientId (l'API accepte l'un ou l'autre). */
  startConversation: (params: { medecinId?: string; patientId?: string }) =>
    apiClient
      .post<Conversation>("/messages", {
        medecin_id: params.medecinId,
        patient_id: params.patientId,
      })
      .then((r) => r.data),

  getMessages: (conversationId: string) =>
    apiClient.get<Message[]>(`/messages/${conversationId}`).then((r) => r.data),

  sendMessage: (conversationId: string, contenu: string) =>
    apiClient
      .post<Message>(`/messages/${conversationId}`, { contenu })
      .then((r) => r.data),
};
