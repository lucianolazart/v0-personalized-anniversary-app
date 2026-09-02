"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { ArrowLeft, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { FoodCatalogItem, FoodImage, FoodSearchResult } from "../types/groceries"
import {
  FOOD_LANG_KEY,
  FOOD_ORIGIN_KEY,
  isBarcode,
  parseFoodLang,
  parseFoodOrigin,
  type FoodLang,
  type FoodOrigin,
} from "../lib/food"
import { cn } from "@/lib/utils"

interface ProductPickerProps {
  query: string
  image: string
  catalog?: FoodCatalogItem[]
  onImageChange: (image: string) => void
  onSelectResult: (result: {
    name: string
    brand: string
    barcode: string
    image: string
  }) => void
}

function normalize(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
}

export function ProductPicker({
  query,
  image,
  catalog = [],
  onImageChange,
  onSelectResult,
}: ProductPickerProps) {
  const [results, setResults] = useState<FoodSearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [picked, setPicked] = useState<FoodSearchResult | null>(null)
  const [photos, setPhotos] = useState<FoodImage[]>([])
  const [photosLoading, setPhotosLoading] = useState(false)
  const [photosError, setPhotosError] = useState<string | null>(null)
  const [lang, setLang] = useState<FoodLang>("es")
  const [origin, setOrigin] = useState<FoodOrigin>("ar")
  const pickedRef = useRef<FoodSearchResult | null>(null)

  useEffect(() => {
    setLang(parseFoodLang(window.localStorage.getItem(FOOD_LANG_KEY)))
    setOrigin(parseFoodOrigin(window.localStorage.getItem(FOOD_ORIGIN_KEY)))
  }, [])

  const handleLangChange = (next: FoodLang) => {
    setLang(next)
    window.localStorage.setItem(FOOD_LANG_KEY, next)
  }

  const handleOriginChange = (next: FoodOrigin) => {
    setOrigin(next)
    window.localStorage.setItem(FOOD_ORIGIN_KEY, next)
  }

  const savedMatches = useMemo(() => {
    const q = normalize(query.trim())
    if (q.length < 2) return []
    const seen = new Set<string>()
    return catalog
      .filter((item) => {
        const blob = normalize(`${item.name} ${item.brand ?? ""} ${item.barcode ?? ""}`)
        return blob.includes(q)
      })
      .filter((item) => {
        const key = item.barcode || item.name
        if (seen.has(key)) return false
        seen.add(key)
        return Boolean(item.image)
      })
      .slice(0, 4)
  }, [catalog, query])

  useEffect(() => {
    const q = query.trim()
    const pickedItem = pickedRef.current
    if (pickedItem && q !== pickedItem.name && q !== pickedItem.barcode) {
      pickedRef.current = null
      setPicked(null)
      setPhotos([])
      setPhotosError(null)
    }

    const barcode = isBarcode(q)
    if (q.length < (barcode ? 8 : 3)) {
      setResults([])
      setLoading(false)
      setError(null)
      return
    }

    const controller = new AbortController()
    const timeout = window.setTimeout(async () => {
      setLoading(true)
      setError(null)
      try {
        const params = new URLSearchParams({ q, lang, origin })
        const res = await fetch(`/api/food/search?${params.toString()}`, {
          signal: controller.signal,
        })
        const data = await res.json()
        if (!res.ok) {
          throw new Error(data.error || "Could not search products")
        }
        setResults(data.results ?? [])
      } catch (err) {
        if ((err as Error).name === "AbortError") return
        setError(err instanceof Error ? err.message : "Could not search products")
        setResults([])
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false)
        }
      }
    }, 400)

    return () => {
      window.clearTimeout(timeout)
      controller.abort()
    }
  }, [query, lang, origin])

  const loadPhotos = async (result: FoodSearchResult) => {
    if (!result.barcode) {
      setPhotos([{ url: result.image }])
      return
    }

    setPhotosLoading(true)
    setPhotosError(null)
    try {
      const res = await fetch(`/api/food/images?barcode=${encodeURIComponent(result.barcode)}`)
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || "Could not load more photos")
      }
      const nextPhotos: FoodImage[] = data.images ?? []
      if (result.image && !nextPhotos.some((photo) => photo.url === result.image)) {
        nextPhotos.unshift({ url: result.image })
      }
      setPhotos(nextPhotos.length > 0 ? nextPhotos : [{ url: result.image }])
    } catch (err) {
      setPhotosError(err instanceof Error ? err.message : "Could not load more photos")
      setPhotos([{ url: result.image }])
    } finally {
      setPhotosLoading(false)
    }
  }

  const handleSelectProduct = (result: FoodSearchResult) => {
    pickedRef.current = result
    setPicked(result)
    setPhotos([{ url: result.image }])
    onSelectResult({
      name: result.name,
      brand: result.brand,
      barcode: result.barcode,
      image: result.image,
    })
    void loadPhotos(result)
  }

  const handleBackToSearch = () => {
    pickedRef.current = null
    setPicked(null)
    setPhotos([])
    setPhotosError(null)
  }

  const showingPhotos = Boolean(picked)
  const remoteResults = results.filter((result) => {
    const key = result.barcode || result.name
    return !savedMatches.some((item) => (item.barcode || item.name) === key)
  })

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <Label>Photo</Label>
        <div className="flex items-center gap-1">
          <div className="inline-flex rounded-md border border-border bg-card p-0.5">
            <button
              type="button"
              onClick={() => handleOriginChange("ar")}
              className={cn(
                "h-8 px-2 rounded-sm text-[11px] font-medium",
                origin === "ar" ? "bg-primary/20 text-foreground" : "text-muted-foreground hover:text-foreground"
              )}
            >
              AR
            </button>
            <button
              type="button"
              onClick={() => handleOriginChange("all")}
              className={cn(
                "h-8 px-2 rounded-sm text-[11px] font-medium",
                origin === "all" ? "bg-primary/20 text-foreground" : "text-muted-foreground hover:text-foreground"
              )}
            >
              World
            </button>
          </div>
          <div className="inline-flex rounded-md border border-border bg-card p-0.5">
            <button
              type="button"
              onClick={() => handleLangChange("en")}
              className={cn(
                "h-8 w-9 rounded-sm text-base leading-none",
                lang === "en" ? "bg-primary/20" : "opacity-60 hover:opacity-100"
              )}
              aria-label="Search products in English"
            >
              🇬🇧
            </button>
            <button
              type="button"
              onClick={() => handleLangChange("es")}
              className={cn(
                "h-8 w-9 rounded-sm text-base leading-none",
                lang === "es" ? "bg-primary/20" : "opacity-60 hover:opacity-100"
              )}
              aria-label="Buscar productos en español"
            >
              🇪🇸
            </button>
          </div>
        </div>
      </div>

      {image ? (
        <div className="flex items-center gap-3">
          <div className="relative shrink-0 w-16 h-16 rounded-lg overflow-hidden bg-muted border border-border">
            <img
              src={image}
              alt="Product preview"
              className="w-full h-full object-cover"
            />
          </div>
          <p className="text-xs text-muted-foreground">Photo selected</p>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">
          Brand + product works best — or paste a barcode.
        </p>
      )}

      {showingPhotos ? (
        <>
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-medium truncate">
              Photos for {picked?.name}
            </p>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="shrink-0 h-8 px-2 text-muted-foreground"
              onClick={handleBackToSearch}
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
          </div>

          {photosLoading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading more photos...
            </div>
          )}

          {photosError && <p className="text-sm text-red-500">{photosError}</p>}

          {photos.length > 0 && (
            <div className="grid grid-cols-3 gap-2 max-h-56 overflow-y-auto pr-1">
              {photos.map((photo) => {
                const selected = image === photo.url
                return (
                  <button
                    key={photo.url}
                    type="button"
                    onClick={() => onImageChange(photo.url)}
                    className={cn(
                      "relative aspect-square rounded-lg overflow-hidden border-2 bg-muted",
                      selected
                        ? "border-primary"
                        : "border-transparent hover:border-primary/50"
                    )}
                  >
                    <img
                      src={photo.url}
                      alt={picked?.name ?? "Product"}
                      className="w-full h-full object-cover"
                    />
                  </button>
                )
              })}
            </div>
          )}
        </>
      ) : (
        <>
          {loading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Searching...
            </div>
          )}

          {error && <p className="text-sm text-red-500">{error}</p>}

          {!loading && query.trim().length >= 3 && results.length === 0 && savedMatches.length === 0 && !error && (
            <p className="text-sm text-muted-foreground">
              No good matches. Try a brand name, a barcode, or paste a photo URL.
            </p>
          )}

          {(savedMatches.length > 0 || remoteResults.length > 0) && (
            <div className="space-y-1 max-h-64 overflow-y-auto pr-1">
              {savedMatches.map((item) => (
                <ProductMatch
                  key={`saved-${item.barcode || item.name}`}
                  name={item.name}
                  brand={item.brand || "Already in Shop"}
                  image={item.image}
                  onSelect={() =>
                    handleSelectProduct({
                      name: item.name,
                      brand: item.brand ?? "",
                      barcode: item.barcode ?? "",
                      image: item.image,
                    })
                  }
                />
              ))}
              {remoteResults.map((result) => (
                <ProductMatch
                  key={`${result.barcode}-${result.name}`}
                  name={result.name}
                  brand={result.brand}
                  image={result.image}
                  onSelect={() => handleSelectProduct(result)}
                />
              ))}
            </div>
          )}
        </>
      )}

      <div>
        <Label htmlFor="grocery-image">
          Or paste image URL
        </Label>
        <Input
          id="grocery-image"
          value={image}
          onChange={(e) => onImageChange(e.target.value)}
          placeholder="https://example.com/image.jpg"
          className="h-11 mt-2"
        />
      </div>

      <p className="text-[10px] text-muted-foreground">
        Product data from Open Food Facts. Argentina first; switch to World if needed.
      </p>
    </div>
  )
}

function ProductMatch({
  name,
  brand,
  image,
  onSelect,
}: {
  name: string
  brand: string
  image: string
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className="w-full flex items-center gap-3 rounded-md border border-transparent hover:border-primary/40 hover:bg-muted/50 p-2 text-left"
    >
      <div className="h-14 w-14 shrink-0 overflow-hidden rounded-md bg-muted border border-border">
        <img src={image} alt="" className="h-full w-full object-cover" />
      </div>
      <div className="min-w-0">
        <p className="text-sm font-medium leading-tight line-clamp-2">{name}</p>
        {brand ? (
          <p className="text-xs text-muted-foreground mt-0.5 truncate">{brand}</p>
        ) : null}
      </div>
    </button>
  )
}
