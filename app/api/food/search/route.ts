import { NextRequest, NextResponse } from "next/server"
import {
  escapeLucene,
  isBarcode,
  OFF_USER_AGENT,
  parseFoodLang,
  parseFoodOrigin,
  uniqueImageUrls,
  type FoodOrigin,
} from "@/app/lib/food"
import type { FoodSearchResult } from "@/app/types/groceries"

interface OffSearchProduct {
  code?: string
  product_name?: string
  product_name_es?: string
  product_name_en?: string
  generic_name?: string
  brands?: string | string[]
  image_url?: string
  image_front_url?: string
  image_front_small_url?: string
  countries_tags?: string[]
  states_tags?: string[]
  unique_scans_n?: number
  completeness?: number
}

function productName(product: OffSearchProduct, lang: "en" | "es") {
  if (lang === "es") {
    return (
      product.product_name_es ||
      product.product_name ||
      product.product_name_en ||
      product.generic_name ||
      ""
    ).trim()
  }
  return (
    product.product_name_en ||
    product.product_name ||
    product.product_name_es ||
    product.generic_name ||
    ""
  ).trim()
}

function productImage(product: OffSearchProduct) {
  return uniqueImageUrls([
    product.image_front_url,
    product.image_url,
    product.image_front_small_url,
  ])[0] ?? ""
}

function productBrand(brands?: string | string[]) {
  if (Array.isArray(brands)) return brands[0]?.trim() ?? ""
  return brands?.split(",")[0]?.trim() ?? ""
}

function normalize(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
}

function queryTokens(query: string) {
  const stop = new Set(["la", "el", "de", "del", "los", "las", "the", "and", "con", "y", "en", "un", "una"])
  return normalize(query)
    .split(/[\s,./+-]+/)
    .filter((token) => token.length > 1 && !stop.has(token))
}

function mapOne(product: OffSearchProduct, lang: "en" | "es"): FoodSearchResult | null {
  const name = productName(product, lang)
  const image = productImage(product)
  if (!name || !image) return null
  return {
    barcode: String(product.code ?? "").trim(),
    name,
    brand: productBrand(product.brands),
    image,
  }
}

function scoreProduct(product: OffSearchProduct, query: string, lang: "en" | "es") {
  const name = normalize(productName(product, lang))
  const brand = normalize(productBrand(product.brands))
  const blob = `${name} ${brand}`
  const tokens = queryTokens(query)
  if (tokens.length === 0) return -1
  if (tokens.some((token) => !blob.includes(token))) return -1

  let score = 0
  const countries = product.countries_tags ?? []
  if (countries.includes("en:argentina")) score += 80
  if (product.image_front_url) score += 20
  if ((product.states_tags ?? []).includes("en:front-photo-selected")) score += 10
  score += Math.log2((product.unique_scans_n ?? 0) + 1) * 10
  score += Math.min(product.completeness ?? 0, 1) * 12

  const first = tokens[0]
  if (name === normalize(query)) score += 50
  if (name.startsWith(first)) score += 35
  if (tokens.every((token) => brand.includes(token) || name.startsWith(token) || name.includes(` ${token}`))) {
    score += 15
  }
  if (tokens.some((token) => brand.includes(token))) score += 25
  score -= Math.max(0, name.length - query.length) * 0.12
  return score
}

async function fetchJson(url: string) {
  const response = await fetch(url, {
    headers: {
      "User-Agent": OFF_USER_AGENT,
      Accept: "application/json",
    },
    cache: "no-store",
    redirect: "follow",
  })
  if (!response.ok) return null
  return response.json()
}

function rank(products: OffSearchProduct[], query: string, lang: "en" | "es") {
  const seen = new Set<string>()
  return products
    .map((product) => ({ product, score: scoreProduct(product, query, lang) }))
    .filter((item) => item.score >= 0)
    .sort((a, b) => b.score - a.score)
    .reduce<FoodSearchResult[]>((acc, item) => {
      const mapped = mapOne(item.product, lang)
      if (!mapped) return acc
      const key = mapped.barcode || `${mapped.name}-${mapped.brand}`
      if (seen.has(key)) return acc
      seen.add(key)
      acc.push(mapped)
      return acc
    }, [])
    .slice(0, 8)
}

async function searchHits(query: string, lang: "en" | "es", origin: FoodOrigin) {
  const lucene =
    origin === "ar"
      ? `${escapeLucene(query)} countries_tags:"en:argentina"`
      : escapeLucene(query)
  const url = new URL("https://search.openfoodfacts.org/search")
  url.searchParams.set("q", lucene)
  url.searchParams.set("page_size", "30")
  url.searchParams.set("langs", lang)
  const data = (await fetchJson(url.toString())) as { hits?: OffSearchProduct[] } | null
  return data?.hits ?? []
}

async function lookupBarcode(code: string, lang: "en" | "es") {
  const url = new URL(`https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(code)}.json`)
  url.searchParams.set(
    "fields",
    "code,product_name,product_name_es,product_name_en,generic_name,brands,image_url,image_front_url,image_front_small_url,countries_tags,states_tags,unique_scans_n,completeness"
  )
  const data = (await fetchJson(url.toString())) as { product?: OffSearchProduct } | null
  const mapped = data?.product ? mapOne(data.product, lang) : null
  return mapped ? [mapped] : []
}

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q")?.trim() ?? ""
  if (query.length < 2) {
    return NextResponse.json({ results: [] })
  }

  const lang = parseFoodLang(request.nextUrl.searchParams.get("lang"))
  const origin = parseFoodOrigin(request.nextUrl.searchParams.get("origin"))

  try {
    if (isBarcode(query)) {
      return NextResponse.json({ results: await lookupBarcode(query, lang) })
    }

    let hits = await searchHits(query, lang, origin)
    let results = rank(hits, query, lang)

    if (results.length < 3 && origin === "ar") {
      const worldHits = await searchHits(query, lang, "all")
      results = rank([...hits, ...worldHits], query, lang)
    }

    if (results.length === 0) {
      const v2Url = new URL("https://world.openfoodfacts.org/api/v2/search")
      v2Url.searchParams.set("search_terms", query)
      v2Url.searchParams.set("page_size", "24")
      v2Url.searchParams.set("lc", lang)
      if (origin === "ar") {
        v2Url.searchParams.set("countries_tags_en", "argentina")
      }
      v2Url.searchParams.set(
        "fields",
        "code,product_name,product_name_es,product_name_en,generic_name,brands,image_url,image_front_url,image_front_small_url,countries_tags,unique_scans_n,completeness"
      )
      const v2Data = (await fetchJson(v2Url.toString())) as { products?: OffSearchProduct[] } | null
      results = rank(v2Data?.products ?? [], query, lang)
    }

    return NextResponse.json({ results })
  } catch (error) {
    console.error("OFF search failed", error)
    return NextResponse.json(
      { error: "Could not connect to Open Food Facts." },
      { status: 502 }
    )
  }
}
