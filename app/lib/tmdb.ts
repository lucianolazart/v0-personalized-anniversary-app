/**
 * Server only (API routes): the key comes from the TMDB_API_KEY env var
 * (Vercel → Settings → Environment Variables, or .env.local in development).
 */
export function getTmdbApiKey(): string | null {
  return process.env.TMDB_API_KEY?.trim() || null
}

export const TMDB_KEY_MISSING_ERROR = "Falta configurar TMDB_API_KEY en el servidor."

export const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p/w500"

export const TMDB_LANG_KEY = "tmdb-lang"

export type TmdbLang = "en-US" | "es-ES"

export function parseTmdbLang(value: string | null | undefined): TmdbLang {
  return value === "es-ES" ? "es-ES" : "en-US"
}
