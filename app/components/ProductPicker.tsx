"use client"

import { useEffect, useRef, useState } from "react"
import { ArrowLeft, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { FoodImage, FoodSearchResult } from "../types/groceries"
import { parseFoodLang, FOOD_LANG_KEY, type FoodLang } from "../lib/food"
import { cn } from "@/lib/utils"

interface ProductPickerProps {
  query: string
  image: string
  onImageChange: (image: string) => void
  onSelectResult: (result: {
    name: string
    brand: string
    barcode: string
    image: string
  }) => void
}

export function ProductPicker({
  query,
  image,
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
  const pickedRef = useRef<FoodSearchResult | null>(null)

  useEffect(() => {
    const saved = parseFoodLang(window.localStorage.getItem(FOOD_LANG_KEY))
    setLang(saved)
  }, [])

  const handleLangChange = (next: FoodLang) => {
    setLang(next)
    window.localStorage.setItem(FOOD_LANG_KEY, next)
  }

  useEffect(() => {
    const q = query.trim()
    if (pickedRef.current && q !== pickedRef.current.name) {
      pickedRef.current = null
      setPicked(null)
      setPhotos([])
      setPhotosError(null)
    }

    if (q.length < 2) {
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
        const params = new URLSearchParams({ q, lang })
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
  }, [query, lang])

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

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <Label>Photo</Label>
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
          Type a product name, pick a match, then choose a photo.
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

          {!loading && query.trim().length >= 2 && results.length === 0 && !error && (
            <p className="text-sm text-muted-foreground">
              No products found. You can paste an image URL below.
            </p>
          )}

          {results.length > 0 && (
            <div className="grid grid-cols-3 gap-2 max-h-56 overflow-y-auto pr-1">
              {results.map((result) => (
                <button
                  key={`${result.barcode}-${result.name}`}
                  type="button"
                  onClick={() => handleSelectProduct(result)}
                  className="relative aspect-square rounded-md overflow-hidden border-2 border-transparent bg-muted hover:border-primary/50"
                >
                  <img
                    src={result.image}
                    alt={result.name}
                    className="w-full h-full object-cover"
                  />
                  <span className="absolute inset-x-0 bottom-0 bg-black/60 text-[10px] text-white px-1 py-0.5 truncate">
                    {result.name}
                  </span>
                </button>
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
        Product data from Open Food Facts, a free and open food database.
      </p>
    </div>
  )
}
