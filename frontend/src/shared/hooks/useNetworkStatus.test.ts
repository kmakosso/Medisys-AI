import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useNetworkStatus } from "./useNetworkStatus";

describe("useNetworkStatus", () => {
  afterEach(() => vi.restoreAllMocks());

  it("reflète l'état initial de navigator.onLine", () => {
    vi.spyOn(navigator, "onLine", "get").mockReturnValue(true);
    const { result } = renderHook(() => useNetworkStatus());
    expect(result.current.isOnline).toBe(true);
  });

  it("passe hors-ligne sur l'événement offline puis revient en ligne", () => {
    const { result } = renderHook(() => useNetworkStatus());
    act(() => window.dispatchEvent(new Event("offline")));
    expect(result.current.isOnline).toBe(false);
    act(() => window.dispatchEvent(new Event("online")));
    expect(result.current.isOnline).toBe(true);
  });
});
