import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { WATCH_STATUSES, type WatchStatus } from "@watchlist/shared";
import { useDeleteMovie, useUpdateMovie } from "@/hooks/use-movies";

type Movie = {
  id: number;
  title: string;
  status: WatchStatus;
  userRating: number | null;
  notes: string | null;
};

const STATUS_LABEL: Record<WatchStatus, string> = { want: "想看", watching: "在看", watched: "看完" };

export function EditMovieDialog({
  movie,
  open,
  onOpenChange,
}: {
  movie: Movie;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const update = useUpdateMovie();
  const remove = useDeleteMovie();
  const [status, setStatus] = useState<WatchStatus>(movie.status);
  const [rating, setRating] = useState(movie.userRating?.toString() ?? "");
  const [notes, setNotes] = useState(movie.notes ?? "");

  async function save() {
    await update.mutateAsync({
      id: movie.id,
      input: {
        status,
        userRating: rating ? Number(rating) : null,
        notes: notes || null,
        watchedAt: status === "watched" ? new Date().toISOString() : null,
      },
    });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{movie.title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <Select value={status} onValueChange={(v) => setStatus(v as WatchStatus)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {WATCH_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>{STATUS_LABEL[s]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            type="number"
            min={1}
            max={10}
            placeholder="评分 1-10"
            value={rating}
            onChange={(e) => setRating(e.target.value)}
          />
          <Textarea placeholder="笔记" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
        <DialogFooter className="justify-between">
          <Button variant="destructive" onClick={() => remove.mutate(movie.id, { onSuccess: () => onOpenChange(false) })}>
            删除
          </Button>
          <Button onClick={save} disabled={update.isPending}>保存</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
