import { useQuery } from "@tanstack/react-query";
import type { MetadataResult } from "../../../api/src/lib/metadata";
import { api } from "../lib/api";

export function useMetadataSearch(query: string) {
  return useQuery({
    queryKey: ["metadata", query],
    enabled: query.trim().length > 0,
    queryFn: async () => {
      const res = await api.api.metadata.search.$get({ query: { q: query } });
      const { results } = (await res.json()) as { results: MetadataResult[] };
      return results;
    },
  });
}
