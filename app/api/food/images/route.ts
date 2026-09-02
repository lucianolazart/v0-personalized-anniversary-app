import { NextRequest, NextResponse } from "next/server"
import { OFF_USER_AGENT, uniqueImageUrls } from "@/app/lib/food"
import type { FoodImage } from "@/app/types/groceries"

interface OffSelectedImages {
  front?: { display?: Record<string, string> }
  packaging?: { display?: Record<string, string> }
}

interface OffProduct {
  image_url?: string
  image_front_url?: string
  image_front_small_url?: string
  selected_images?: OffSelectedImages
}

export async function GET(request: NextRequest) {
  const barcode = request.nextUrl.searchParams.get("barcode")?.trim() ?? ""
  if (!barcode) {
    return NextResponse.json({ error: "Missing barcode." }, { status: 400 })
  }

  const url = new URL(`https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(barcode)}.json`)
  url.searchParams.set(
    "fields",
    "code,image_url,image_front_url,image_front_small_url,selected_images"
  )

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": OFF_USER_AGENT,
        Accept: "application/json",
      },
      cache: "no-store",
    })
    if (!response.ok) {
      return NextResponse.json({ images: [] })
    }

    const data = (await response.json()) as { product?: OffProduct }
    const product = data.product
    if (!product) {
      return NextResponse.json({ images: [] })
    }

    const images: FoodImage[] = uniqueImageUrls([
      product.image_front_url,
      product.image_url,
      ...(Object.values(product.selected_images?.front?.display ?? {})),
      ...(Object.values(product.selected_images?.packaging?.display ?? {})),
      product.image_front_small_url,
    ])
      .slice(0, 16)
      .map((item) => ({ url: item }))

    return NextResponse.json({ images })
  } catch {
    return NextResponse.json({ images: [] })
  }
}
