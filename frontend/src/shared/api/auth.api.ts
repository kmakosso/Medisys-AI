import { apiClient } from "./axiosClient";
import type { TokenResponse, User } from "@/shared/types";

export interface RegisterPayload {
  email: string;
  password: string;
  nom: string;
  prenom: string;
}

export const authApi = {
  login: (email: string, password: string) =>
    apiClient.post<TokenResponse>("/auth/login", { email, password }).then((r) => r.data),

  register: (payload: RegisterPayload) =>
    apiClient.post<TokenResponse>("/auth/register", payload).then((r) => r.data),

  me: () => apiClient.get<User>("/auth/me").then((r) => r.data),

  // Réinitialisation du mot de passe (endpoints backend ajoutés en v2.1).
  forgotPassword: (email: string) =>
    apiClient.post("/auth/forgot-password", { email }).then((r) => r.data),

  resetPassword: (token: string, password: string) =>
    apiClient.post("/auth/reset-password", { token, password }).then((r) => r.data),
};
