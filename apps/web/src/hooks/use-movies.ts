import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { CreateMovieInput, UpdateMovieInput, WatchStatus } from "@watchlist/shared";
import type { Movie } from "../../../api/src/db/schema";
import { api } from "../lib/api";

export function useMovies(status?: WatchStatus, enabled = true) {
  return useQuery({
    queryKey: ["movies", status ?? "all"],
    enabled,
    queryFn: async () => {
      const res = await api.api.movies.$get({ query: status ? { status } : {} });
      const { movies } = (await res.json()) as { movies: Movie[] };
      return movies;
    },
  });
}

export function useCreateMovie() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateMovieInput) => {
      const res = await api.api.movies.$post({ json: input });
      if (!res.ok) throw new Error("create failed");
      return ((await res.json()) as { movie: Movie }).movie;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["movies"] }),
  });
}

export function useUpdateMovie() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, input }: { id: number; input: UpdateMovieInput }) => {
      const res = await api.api.movies[":id"].$patch({ param: { id: String(id) }, json: input });
      if (!res.ok) throw new Error("update failed");
      return ((await res.json()) as { movie: Movie }).movie;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["movies"] }),
  });
}

export function useDeleteMovie() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const res = await api.api.movies[":id"].$delete({ param: { id: String(id) } });
      if (!res.ok) throw new Error("delete failed");
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["movies"] }),
  });
}
