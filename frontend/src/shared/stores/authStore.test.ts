import { beforeEach, describe, expect, it } from "vitest";
import { refreshStore, useAuthStore } from "./authStore";

describe("authStore", () => {
  beforeEach(() => {
    useAuthStore.getState().clear();
    localStorage.clear();
  });

  it("stocke l'access token en mémoire et le refresh token persistant", () => {
    useAuthStore.getState().setSession({
      access_token: "acc",
      refresh_token: "ref",
      token_type: "bearer",
    });
    expect(useAuthStore.getState().accessToken).toBe("acc");
    expect(refreshStore.get()).toBe("ref");
    // L'access token ne doit JAMAIS être en localStorage
    expect(localStorage.getItem("medisysai_access")).toBeNull();
  });

  it("clear() purge la session et le refresh token", () => {
    useAuthStore.getState().setSession({
      access_token: "acc",
      refresh_token: "ref",
      token_type: "bearer",
    });
    useAuthStore.getState().clear();
    expect(useAuthStore.getState().accessToken).toBeNull();
    expect(useAuthStore.getState().user).toBeNull();
    expect(refreshStore.get()).toBeNull();
  });
});
