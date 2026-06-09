import { z } from "zod";

export const WATCH_STATUSES = ["want", "watching", "watched"] as const;
export const watchStatusSchema = z.enum(WATCH_STATUSES);
export type WatchStatus = z.infer<typeof watchStatusSchema>;

// Payload for creating a movie in the user's list.
export const createMovieSchema = z.object({
  title: z.string().min(1).max(200),
  year: z
    .string()
    .regex(/^\d{4}$/)
    .optional(),
  imdbId: z.string().optional(),
  posterUrl: z.string().url().optional(),
  overview: z.string().optional(),
  genres: z.array(z.string()).optional(),
  externalRating: z.string().optional(),
  status: watchStatusSchema.default("want"),
});
export type CreateMovieInput = z.infer<typeof createMovieSchema>;

// Payload for updating a movie (all optional).
export const updateMovieSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  year: z
    .string()
    .regex(/^\d{4}$/)
    .optional(),
  status: watchStatusSchema.optional(),
  userRating: z.number().int().min(1).max(10).nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
  watchedAt: z.string().datetime().nullable().optional(),
});
export type UpdateMovieInput = z.infer<typeof updateMovieSchema>;

export const movieListQuerySchema = z.object({
  status: watchStatusSchema.optional(),
  sort: z.enum(["created", "title", "year", "rating"]).default("created"),
});
