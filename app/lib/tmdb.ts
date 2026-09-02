export const TMDB_API_KEY =
  process.env.TMDB_API_KEY || "8366d34811d3ef227a9e7b601c2de78e"

export const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p/w500"

export const TMDB_LANG_KEY = "tmdb-lang"

export type TmdbLang = "en-US" | "es-ES"

export function parseTmdbLang(value: string | null | undefined): TmdbLang {
  return value === "es-ES" ? "es-ES" : "en-US"
}
