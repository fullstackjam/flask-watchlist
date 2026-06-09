import { useQuery } from "@tanstack/react-query";
import type { User } from "../../../api/src/db/schema";
import { api } from "../lib/api";

export function useMe() {
  return useQuery({
    queryKey: ["me"],
    queryFn: async () => {
      const res = await api.api.me.$get();
      const { user } = (await res.json()) as { user: User | null };
      return user;
    },
  });
}
