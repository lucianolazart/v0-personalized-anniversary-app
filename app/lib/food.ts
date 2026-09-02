export const FOOD_LANG_KEY = "food-lang"

export type FoodLang = "en" | "es"

export const OFF_USER_AGENT = "Lazarski/1.0 (personalized-anniversary-app)"

export function parseFoodLang(value: string | null | undefined): FoodLang {
  return value === "en" ? "en" : "es"
}

export function uniqueImageUrls(urls: Array<string | null | undefined>) {
  const seen = new Set<string>()
  const next: string[] = []
  for (const url of urls) {
    if (!url || !url.startsWith("http") || seen.has(url)) continue
    seen.add(url)
    next.push(url)
  }
  return next
}
