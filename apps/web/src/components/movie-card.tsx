import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import type { WatchStatus } from "@watchlist/shared";
import { EditMovieDialog } from "./edit-movie-dialog";

type Movie = {
  id: number;
  title: string;
  year: string | null;
  posterUrl: string | null;
  status: WatchStatus;
  userRating: number | null;
  notes: string | null;
  watchedAt: string | null;
};

const STATUS_LABEL: Record<WatchStatus, string> = {
  want: "想看",
  watching: "在看",
  watched: "看完",
};

export function MovieCard({ movie }: { movie: Movie }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Card className="cursor-pointer overflow-hidden" onClick={() => setOpen(true)}>
        {movie.posterUrl ? (
          <img src={movie.posterUrl} alt={movie.title} className="aspect-[2/3] w-full object-cover" />
        ) : (
          <div className="flex aspect-[2/3] items-center justify-center bg-muted text-muted-foreground">
            No poster
          </div>
        )}
        <div className="space-y-1 p-3">
          <div className="flex items-center justify-between gap-2">
            <h3 className="truncate font-medium">{movie.title}</h3>
            <Badge variant="secondary">{STATUS_LABEL[movie.status]}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            {movie.year ?? "—"}
            {movie.userRating ? ` · ★ ${movie.userRating}/10` : ""}
          </p>
        </div>
      </Card>
      <EditMovieDialog movie={movie} open={open} onOpenChange={setOpen} />
    </>
  );
}
