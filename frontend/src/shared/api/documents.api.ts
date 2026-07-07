import { apiClient } from "./axiosClient";
import type { DocumentItem, TypeDocument } from "@/shared/types";

export const documentsApi = {
  list: (patientId: string) =>
    apiClient.get<DocumentItem[]>(`/patients/${patientId}/documents`).then((r) => r.data),

  upload: (patientId: string, file: File, typeDocument: TypeDocument) => {
    const form = new FormData();
    form.append("file", file);
    form.append("type_document", typeDocument);
    return apiClient
      .post<DocumentItem>(`/patients/${patientId}/documents`, form, {
        headers: { "Content-Type": "multipart/form-data" },
      })
      .then((r) => r.data);
  },

  download: (patientId: string, documentId: string) =>
    apiClient
      .get(`/patients/${patientId}/documents/${documentId}/download`, {
        responseType: "blob",
      })
      .then((r) => r.data as Blob),
};
