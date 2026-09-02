"use client"

import { useEffect, useRef, useState } from "react"
import { ArrowLeft, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { TmdbPoster, TmdbSearchResult } from "../types/tmdb"
import { cn } from "@/lib/utils"

interface CoverPickerProps {
  query: string
  image: string
  onImageChange: (image: string) => void
  onSelectResult: (result: {
    title: string
    year: number
    type: "pelicula" | "serie"
    image: string
  }) => void
}

export function CoverPicker({
  query,
  image,
  onImageChange,
  onSelectResult,
}: CoverPickerProps) {
  const [results, setResults] = useState<TmdbSearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [picked, setPicked] = useState<TmdbSearchResult | null>(null)
  const [posters, setPosters] = useState<TmdbPoster[]>([])
  const [postersLoading, setPostersLoading] = useState(false)
  const [postersError, setPostersError] = useState<string | null>(null)
  const pickedRef = useRef<TmdbSearchResult | null>(null)

  useEffect(() => {
    const q = query.trim()
    if (pickedRef.current && q !== pickedRef.current.title) {
      pickedRef.current = null
      setPicked(null)
      setPosters([])
      setPostersError(null)
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
        const res = await fetch(`/api/tmdb/search?q=${encodeURIComponent(q)}`, {
          signal: controller.signal,
        })
        const data = await res.json()
        if (!res.ok) {
          throw new Error(data.error || "No se pudieron buscar portadas")
        }
        setResults(data.results ?? [])
      } catch (err) {
        if ((err as Error).name === "AbortError") return
        setError(err instanceof Error ? err.message : "No se pudieron buscar portadas")
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
  }, [query])

  const loadPosters = async (result: TmdbSearchResult) => {
    setPostersLoading(true)
    setPostersError(null)
    try {
      const res = await fetch(
        `/api/tmdb/images?id=${result.id}&type=${result.mediaType}`
      )
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || "No se pudieron cargar más portadas")
      }
      const nextPosters: TmdbPoster[] = data.posters ?? []
      if (!nextPosters.some((poster) => poster.url === result.posterUrl)) {
        nextPosters.unshift({ url: result.posterUrl })
      }
      setPosters(nextPosters)
    } catch (err) {
      if ((err as Error).name === "AbortError") return
      setPostersError(err instanceof Error ? err.message : "No se pudieron cargar más portadas")
      setPosters([{ url: result.posterUrl }])
    } finally {
      setPostersLoading(false)
    }
  }

  const handleSelectTitle = (result: TmdbSearchResult) => {
    pickedRef.current = result
    setPicked(result)
    setPosters([{ url: result.posterUrl }])
    onSelectResult({
      title: result.title,
      year: result.year,
      type: result.type,
      image: result.posterUrl,
    })
    void loadPosters(result)
  }

  const handleBackToSearch = () => {
    pickedRef.current = null
    setPicked(null)
    setPosters([])
    setPostersError(null)
  }

  const showingPosters = Boolean(picked)

  return (
    <div className="space-y-3">
      <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
        Cover
      </Label>

      {image ? (
        <div className="flex items-center gap-3">
          <div className="relative shrink-0 w-16 h-24 rounded-lg overflow-hidden bg-muted border border-border">
            <img
              src={image}
              alt="Cover preview"
              className="w-full h-full object-cover"
            />
          </div>
          <p className="text-xs text-muted-foreground">Cover selected</p>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">
          Type a title, pick the movie or show, then choose a poster.
        </p>
      )}

      {showingPosters ? (
        <>
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">
              Posters for {picked?.title}
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

          {postersLoading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading more posters...
            </div>
          )}

          {postersError && <p className="text-sm text-red-500">{postersError}</p>}

          {posters.length > 0 && (
            <div className="grid grid-cols-3 gap-2 max-h-56 overflow-y-auto pr-1">
              {posters.map((poster) => {
                const selected = image === poster.url
                return (
                  <button
                    key={poster.url}
                    type="button"
                    onClick={() => onImageChange(poster.url)}
                    className={cn(
                      "relative aspect-[2/3] rounded-lg overflow-hidden border-2 bg-muted",
                      selected
                        ? "border-[#EA580C]"
                        : "border-transparent hover:border-[#EA580C]/50"
                    )}
                  >
                    <img
                      src={poster.url}
                      alt={picked?.title ?? "Poster"}
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
              No titles found. You can paste an image URL below.
            </p>
          )}

          {results.length > 0 && (
            <div className="grid grid-cols-3 gap-2 max-h-56 overflow-y-auto pr-1">
              {results.map((result) => (
                <button
                  key={`${result.mediaType}-${result.id}`}
                  type="button"
                  onClick={() => handleSelectTitle(result)}
                  className="relative aspect-[2/3] rounded-lg overflow-hidden border-2 border-transparent bg-muted hover:border-[#EA580C]/50"
                >
                  <img
                    src={result.posterUrl}
                    alt={result.title}
                    className="w-full h-full object-cover"
                  />
                  <span className="absolute inset-x-0 bottom-0 bg-black/60 text-[10px] text-white px-1 py-0.5 truncate">
                    {result.title}
                    {result.year ? ` (${result.year})` : ""}
                  </span>
                </button>
              ))}
            </div>
          )}
        </>
      )}

      <div>
        <Label
          htmlFor="image"
          className="text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          Or paste image URL
        </Label>
        <Input
          id="image"
          value={image}
          onChange={(e) => onImageChange(e.target.value)}
          placeholder="https://example.com/image.jpg"
          className="h-11 mt-2 border-gray-200 dark:border-gray-800 focus:border-[#EA580C] focus:ring-[#EA580C]"
        />
      </div>

      <p className="text-[10px] text-muted-foreground">
        This product uses the TMDB API but is not endorsed or certified by TMDB.
      </p>
    </div>
  )
}
