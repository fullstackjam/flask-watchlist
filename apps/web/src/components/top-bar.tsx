import { useQueryClient } from "@tanstack/react-query";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { useMe } from "@/hooks/use-me";

export function TopBar() {
  const { data: user } = useMe();
  const qc = useQueryClient();

  async function logout() {
    await api.api.auth.logout.$post();
    await qc.invalidateQueries({ queryKey: ["me"] });
  }

  return (
    <header className="flex items-center justify-between border-b px-6 py-3">
      <a href="/" className="text-lg font-semibold">🎬 Watchlist</a>
      {user ? (
        <div className="flex items-center gap-3">
          <Avatar className="size-8">
            <AvatarImage src={user.avatarUrl ?? undefined} alt={user.githubLogin} />
            <AvatarFallback>{user.githubLogin.slice(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>
          <Button variant="ghost" size="sm" onClick={logout}>Sign out</Button>
        </div>
      ) : (
        <Button asChild size="sm">
          <a href="/api/auth/github">Sign in with GitHub</a>
        </Button>
      )}
    </header>
  );
}
