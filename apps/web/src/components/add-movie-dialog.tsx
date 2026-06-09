import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useCreateMovie } from "@/hooks/use-movies";
import { useMetadataSearch } from "@/hooks/use-metadata";

export function AddMovieDialog() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  // Debounce keystrokes so we don't hit OMDb (1000/day quota) on every character.
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 350);
    return () => clearTimeout(t);
  }, [query]);
  const { data: results, isFetching } = useMetadataSearch(debouncedQuery);
  const create = useCreateMovie();

  async function add(r: { imdbId: string; title: string; year: string | null; posterUrl: string | null }) {
    await create.mutateAsync({
      imdbId: r.imdbId,
      title: r.title,
      year: r.year ?? undefined,
      posterUrl: r.posterUrl ?? undefined,
      status: "want",
    });
    setOpen(false);
    setQuery("");
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>添加</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>搜索影片</DialogTitle>
        </DialogHeader>
        <Input placeholder="输入片名…" value={query} onChange={(e) => setQuery(e.target.value)} autoFocus />
        <div className="max-h-80 space-y-2 overflow-y-auto">
          {isFetching && <p className="text-sm text-muted-foreground">搜索中…</p>}
          {results?.map((r) => (
            <button
              key={r.imdbId}
              type="button"
              className="flex w-full items-center gap-3 rounded-md p-2 text-left hover:bg-accent"
              onClick={() => add(r)}
            >
              {r.posterUrl ? (
                <img src={r.posterUrl} alt={r.title} className="h-16 w-11 rounded object-cover" />
              ) : (
                <div className="h-16 w-11 rounded bg-muted" />
              )}
              <span>
                <span className="font-medium">{r.title}</span>
                <span className="block text-sm text-muted-foreground">{r.year ?? "—"}</span>
              </span>
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
