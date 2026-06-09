import { Outlet, createRootRoute } from "@tanstack/react-router";
import { TopBar } from "@/components/top-bar";

export const rootRoute = createRootRoute({
  component: () => (
    <div className="min-h-screen bg-background text-foreground">
      <TopBar />
      <main className="mx-auto max-w-6xl p-6">
        <Outlet />
      </main>
    </div>
  ),
});
