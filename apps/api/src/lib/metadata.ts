export type MetadataResult = {
  imdbId: string;
  title: string;
  year: string | null;
  posterUrl: string | null;
};

type OmdbSearchItem = { Title: string; Year: string; imdbID: string; Poster: string };
type OmdbSearchResponse = { Search?: OmdbSearchItem[]; Error?: string };

const clean = (v: string) => (v && v !== "N/A" ? v : null);

export async function searchMetadata(query: string, apiKey: string): Promise<MetadataResult[]> {
  const url = `https://www.omdbapi.com/?apikey=${apiKey}&type=movie&s=${encodeURIComponent(query)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`OMDb request failed: ${res.status}`);
  const data = (await res.json()) as OmdbSearchResponse;
  if (!data.Search) return [];
  return data.Search.map((item) => ({
    imdbId: item.imdbID,
    title: item.Title,
    year: clean(item.Year),
    posterUrl: clean(item.Poster),
  }));
}
