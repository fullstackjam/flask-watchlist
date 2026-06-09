import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, expect, it, vi } from "vitest";
import { useMe } from "./use-me";

afterEach(() => vi.restoreAllMocks());

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

it("returns the user from /api/me", async () => {
  vi.spyOn(globalThis, "fetch").mockResolvedValue(
    new Response(JSON.stringify({ user: { id: 1, githubLogin: "alice", name: "Alice", avatarUrl: "" } })),
  );
  const { result } = renderHook(() => useMe(), { wrapper });
  await waitFor(() => expect(result.current.data?.githubLogin).toBe("alice"));
});

it("returns null when logged out", async () => {
  vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ user: null })));
  const { result } = renderHook(() => useMe(), { wrapper });
  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  expect(result.current.data).toBeNull();
});
