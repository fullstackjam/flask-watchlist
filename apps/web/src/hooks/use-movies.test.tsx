import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, expect, it, vi } from "vitest";
import { useMovies } from "./use-movies";

afterEach(() => vi.restoreAllMocks());

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

it("lists movies", async () => {
  vi.spyOn(globalThis, "fetch").mockResolvedValue(
    new Response(JSON.stringify({ movies: [{ id: 1, title: "Dune", status: "want" }] })),
  );
  const { result } = renderHook(() => useMovies(), { wrapper });
  await waitFor(() => expect(result.current.data).toHaveLength(1));
  expect(result.current.data?.[0]?.title).toBe("Dune");
});
