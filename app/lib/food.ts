export const FOOD_LANG_KEY = "food-lang"
export const FOOD_ORIGIN_KEY = "food-origin"

export type FoodLang = "en" | "es"
export type FoodOrigin = "ar" | "all"

export const OFF_USER_AGENT = "Lazarski/1.0 (personalized-anniversary-app)"

export function parseFoodLang(value: string | null | undefined): FoodLang {
  return value === "en" ? "en" : "es"
}

export function parseFoodOrigin(value: string | null | undefined): FoodOrigin {
  return value === "all" ? "all" : "ar"
}

export function isBarcode(value: string) {
  return /^\d{8,14}$/.test(value.trim())
}

export function uniqueImageUrls(urls: Array<string | null | undefined>) {
  const seen = new Set<string>()
  const next: string[] = []
  for (const url of urls) {
    const upgraded = preferLargerOffImage(url)
    if (!upgraded || !upgraded.startsWith("http") || seen.has(upgraded)) continue
    seen.add(upgraded)
    next.push(upgraded)
  }
  return next
}

export function preferLargerOffImage(url?: string | null) {
  if (!url) return ""
  return url.replace(/(\.\d+)\.(100|200)(\.jpg)(\?.*)?$/i, "$1.400$3$4")
}

export function escapeLucene(value: string) {
  return value.replace(/[+\-!():^{}[\]~*?\\]/g, "\\$&")
}
