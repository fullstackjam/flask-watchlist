import { createRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AddMovieDialog } from "@/components/add-movie-dialog";
import { MovieCard } from "@/components/movie-card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { WATCH_STATUSES, type WatchStatus } from "@watchlist/shared";
import { useMe } from "@/hooks/use-me";
import { useMovies } from "@/hooks/use-movies";
import { rootRoute } from "./__root";

const STATUS_LABEL: Record<WatchStatus, string> = { want: "想看", watching: "在看", watched: "看完" };

function Home() {
  const { data: user, isLoading } = useMe();
  const [tab, setTab] = useState<WatchStatus | "all">("all");
  const { data: movies } = useMovies(tab === "all" ? undefined : tab);

  if (isLoading) return null;

  if (!user) {
    return (
      <div className="flex flex-col items-center gap-4 py-24 text-center">
        <h1 className="text-3xl font-bold">你的影视清单</h1>
        <p className="text-muted-foreground">登录后管理你的「想看 / 在看 / 看完」。</p>
        <Button asChild size="lg">
          <a href="/api/auth/github">Sign in with GitHub</a>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Tabs value={tab} onValueChange={(v) => setTab(v as WatchStatus | "all")}>
          <TabsList>
            <TabsTrigger value="all">全部</TabsTrigger>
            {WATCH_STATUSES.map((s) => (
              <TabsTrigger key={s} value={s}>{STATUS_LABEL[s]}</TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <AddMovieDialog />
      </div>
      {movies && movies.length > 0 ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {movies.map((m) => (
            <MovieCard key={m.id} movie={m} />
          ))}
        </div>
      ) : (
        <p className="py-16 text-center text-muted-foreground">还没有影片，点「添加」开始吧。</p>
      )}
    </div>
  );
}

export const indexRoute = createRoute({ getParentRoute: () => rootRoute, path: "/", component: Home });
