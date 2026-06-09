export type MetadataResult = {
  imdbId: string; // external id (TMDB movie id, stored as the entry's external id)
  title: string;
  year: string | null;
  posterUrl: string | null;
};

type TmdbSearchItem = {
  id: number;
  title: string;
  release_date?: string;
  poster_path?: string | null;
};
type TmdbSearchResponse = { results?: TmdbSearchItem[] };

const POSTER_BASE = "https://image.tmdb.org/t/p/w342";

export async function searchMetadata(query: string, apiKey: string): Promise<MetadataResult[]> {
  const url = `https://api.themoviedb.org/3/search/movie?api_key=${apiKey}&language=zh-CN&include_adult=false&query=${encodeURIComponent(query)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`TMDB request failed: ${res.status}`);
  const data = (await res.json()) as TmdbSearchResponse;
  if (!data.results) return [];
  return data.results.map((item) => ({
    imdbId: String(item.id),
    title: item.title,
    year: item.release_date ? item.release_date.slice(0, 4) || null : null,
    posterUrl: item.poster_path ? `${POSTER_BASE}${item.poster_path}` : null,
  }));
}
