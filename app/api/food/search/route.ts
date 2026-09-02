import { NextRequest, NextResponse } from "next/server"
import { OFF_USER_AGENT, parseFoodLang, uniqueImageUrls } from "@/app/lib/food"
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

function mapResults(products: OffSearchProduct[], lang: "en" | "es"): FoodSearchResult[] {
  return products
    .map((product) => {
      const name = productName(product, lang)
      const image = productImage(product)
      return {
        barcode: String(product.code ?? "").trim(),
        name,
        brand: productBrand(product.brands),
        image,
      }
    })
    .filter((item) => item.name && item.image)
    .slice(0, 12)
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

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q")?.trim() ?? ""
  if (query.length < 2) {
    return NextResponse.json({ results: [] })
  }

  const lang = parseFoodLang(request.nextUrl.searchParams.get("lang"))

  try {
    const searchUrl = new URL("https://search.openfoodfacts.org/search")
    searchUrl.searchParams.set("q", query)
    searchUrl.searchParams.set("page_size", "12")
    searchUrl.searchParams.set("langs", lang)

    const searchData = (await fetchJson(searchUrl.toString())) as { hits?: OffSearchProduct[] } | null
    const searchResults = mapResults(searchData?.hits ?? [], lang)
    if (searchResults.length > 0) {
      return NextResponse.json({ results: searchResults })
    }

    const v2Url = new URL("https://world.openfoodfacts.org/api/v2/search")
    v2Url.searchParams.set("search_terms", query)
    v2Url.searchParams.set("page_size", "12")
    v2Url.searchParams.set("lc", lang)
    v2Url.searchParams.set(
      "fields",
      "code,product_name,product_name_es,product_name_en,generic_name,brands,image_url,image_front_url,image_front_small_url"
    )

    const v2Data = (await fetchJson(v2Url.toString())) as { products?: OffSearchProduct[] } | null
    return NextResponse.json({ results: mapResults(v2Data?.products ?? [], lang) })
  } catch (error) {
    console.error("OFF search failed", error)
    return NextResponse.json(
      { error: "Could not connect to Open Food Facts." },
      { status: 502 }
    )
  }
}
