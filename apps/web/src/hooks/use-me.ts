import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";

export function useMe() {
  return useQuery({
    queryKey: ["me"],
    queryFn: async () => {
      const res = await api.api.me.$get();
      const { user } = await res.json();
      return user;
    },
  });
}
