import { GitHub } from "arctic";
import type { Bindings } from "../types";

export type GitHubUser = {
  id: number;
  login: string;
  name: string | null;
  avatar_url: string;
};

export function makeGitHub(env: Bindings) {
  const redirectURI = `${env.APP_URL}/api/auth/github/callback`;
  return new GitHub(env.GITHUB_CLIENT_ID, env.GITHUB_CLIENT_SECRET, redirectURI);
}

export async function fetchGitHubUser(accessToken: string): Promise<GitHubUser> {
  const res = await fetch("https://api.github.com/user", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "User-Agent": "watchlist-app",
      Accept: "application/vnd.github+json",
    },
  });
  if (!res.ok) throw new Error(`GitHub user fetch failed: ${res.status}`);
  return (await res.json()) as GitHubUser;
}
