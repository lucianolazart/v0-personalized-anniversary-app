"use client"

import React, { useState, useEffect } from "react"
import { Check, Film, LayoutGrid, List, Plus, Search, Star, Tv, Clock, RefreshCw, Play } from "lucide-react"
import { collection, addDoc, query, onSnapshot, orderBy, doc, updateDoc, deleteDoc } from "firebase/firestore"
import { db } from "../lib/firebase"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import type { MediaWithId, NewMediaFormState } from "../types/media"
import { MediaCard } from "../components/MediaCard"
import { CoverPicker } from "../components/CoverPicker"
import { WatchedOnOptions } from "../components/WatchedOnPicker"
import { SeriesHub } from "../components/SeriesHub"
import { mediaFromDoc } from "../lib/media"
import { useRouter } from "next/navigation"
import { useSeriesCheck } from "../hooks/useSeriesCheck"
import { IconButton, PageHeader, SectionLabel } from "@/components/page-header"

const STATE_GROUPS: Array<{ state: MediaWithId["state"]; title: string; attention?: boolean }> = [
  { state: "in-progress", title: "Viendo", attention: true },
  { state: "to-resume", title: "Por retomar", attention: true },
  { state: "pending", title: "Por ver" },
  { state: "up-to-date", title: "Al día" },
  { state: "watched", title: "Vistas" },
]
import { cn } from "@/lib/utils"

const VIEW_KEY = "movies-view"
type ViewMode = "posters" | "compact"

export default function MoviesPage() {
  const router = useRouter()
  const [mediaList, setMediaList] = useState<MediaWithId[]>([])
  const [open, setOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [showSearch, setShowSearch] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editingMedia, setEditingMedia] = useState<MediaWithId | null>(null)
  const [deletingMedia, setDeletingMedia] = useState<MediaWithId | null>(null)
  const initialFormState: NewMediaFormState = {
    title: "",
    type: "pelicula",
    year: new Date().getFullYear(),
    image: "",
    state: "pending",
  }
  const [newMedia, setNewMedia] = useState<NewMediaFormState>(initialFormState)

  useEffect(() => {
    // Configurar el listener de Firestore
    const mediaRef = collection(db, "peliculas")
    const q = query(mediaRef, orderBy("title"))

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const updatedMedia = snapshot.docs.map((item) => mediaFromDoc(item.id, item.data()))
      
      setMediaList(updatedMedia)
      setLoading(false)
    })

    // Limpiar el listener cuando el componente se desmonte
    return () => unsubscribe()
  }, [])

  const handleAddMedia = async () => {
    if (newMedia.title) {
      // Firestore rejects undefined values, so the TMDB ids only go in when we have them.
      const tmdb = {
        ...(newMedia.tmdbId ? { tmdbId: newMedia.tmdbId, tmdbType: newMedia.tmdbType ?? null } : {}),
        ...(newMedia.state === "watched" && newMedia.watchedOn ? { watchedOn: newMedia.watchedOn } : {}),
      }
      try {
        setSaving(true)
        if (editingMedia) {
          // Actualizar media existente
          const mediaRef = doc(db, "peliculas", editingMedia.id)
          await updateDoc(mediaRef, {
            title: newMedia.title,
            type: newMedia.type,
            year: newMedia.year,
            image: newMedia.image || "/placeholder.svg?height=450&width=300",
            state: newMedia.state,
            ...tmdb,
          })
        } else {
          // Añadir nuevo media
          const mediaRef = collection(db, "peliculas")
          await addDoc(mediaRef, {
            title: newMedia.title,
            type: newMedia.type,
            year: newMedia.year,
            image: newMedia.image || "/placeholder.svg?height=450&width=300",
            state: newMedia.state,
            ...tmdb,
          })
        }

        handleCloseDialog()
      } catch (error) {
        console.error("Error saving media:", error)
      } finally {
        setSaving(false)
      }
    }
  }

  const handleOpenDialog = () => {
    setNewMedia(initialFormState)
    setEditingMedia(null)
    setOpen(true)
  }

  const handleCloseDialog = () => {
    // Prevenir el scroll al cerrar
    const currentScroll = window.scrollY
    setNewMedia(initialFormState)
    setEditingMedia(null)
    setOpen(false)
    // Restaurar la posición del scroll después de un pequeño delay
    setTimeout(() => {
      window.scrollTo(0, currentScroll)
    }, 0)
  }

  const handleEdit = (media: MediaWithId) => {
    const currentScroll = window.scrollY
    setEditingMedia(media)
    setNewMedia({
      title: media.title,
      type: media.type,
      year: media.year,
      image: media.image,
      state: media.state,
      tmdbId: media.tmdbId,
      tmdbType: media.tmdbType,
      watchedOn: media.watchedOn,
    })
    setOpen(true)
    // Restaurar la posición del scroll después de un pequeño delay
    setTimeout(() => {
      window.scrollTo(0, currentScroll)
    }, 0)
  }

  // Series marked "Al día" go to "Por retomar" by themselves when a new episode is out.
  useSeriesCheck(mediaList, loading)

  const handleDelete = async (media: MediaWithId) => {
    try {
      await deleteDoc(doc(db, "peliculas", media.id))
      setDeletingMedia(null)
    } catch (error) {
      console.error("Error deleting media:", error)
    }
  }


  const [typeFilter, setTypeFilter] = useState<"all" | "movies" | "series">("all")
  const [stateFilter, setStateFilter] = useState<MediaWithId["state"] | "all">("all")
  const [viewMode, setViewMode] = useState<ViewMode>("compact")

  useEffect(() => {
    const saved = window.localStorage.getItem(VIEW_KEY)
    if (saved === "posters" || saved === "compact") {
      setViewMode(saved)
    }
  }, [])

  const handleViewMode = (mode: ViewMode) => {
    setViewMode(mode)
    window.localStorage.setItem(VIEW_KEY, mode)
  }

  const getFilteredMedia = () => {
    let filtered = mediaList

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter((media) => 
        media.title.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Filter by type
    if (typeFilter === "movies") {
      filtered = filtered.filter((media) => media.type === "pelicula")
    } else if (typeFilter === "series") {
      filtered = filtered.filter((media) => media.type === "serie")
    }

    // Filter by state
    if (stateFilter !== "all") {
      filtered = filtered.filter((media) => media.state === stateFilter)
    }

    return filtered
  }

  const stateFilters: Array<{ value: MediaWithId["state"] | "all"; label: string }> = [
    { value: "all", label: "Todos" },
    { value: "watched", label: "Vistas" },
    { value: "in-progress", label: "Viendo" },
    { value: "pending", label: "Por ver" },
    { value: "up-to-date", label: "Al día" },
    { value: "to-resume", label: "Por retomar" },
  ]
  const typeTabs: Array<{ value: "all" | "movies" | "series"; label: string }> = [
    { value: "all", label: "Todo" },
    { value: "movies", label: "Pelis" },
    { value: "series", label: "Series" },
  ]

  const filteredMedia = getFilteredMedia()

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-md">
        <PageHeader
          title="Pelis y series"
          actions={
            <>
              <IconButton
                aria-label={showSearch ? "Cerrar búsqueda" : "Buscar"}
                aria-pressed={showSearch}
                onClick={() => {
                  setShowSearch(!showSearch)
                  if (showSearch) setSearchTerm("")
                }}
              >
                <Search className="h-[18px] w-[18px]" />
              </IconButton>
              <IconButton
                aria-label={viewMode === "posters" ? "Ver como lista" : "Ver como pósters"}
                onClick={() => handleViewMode(viewMode === "posters" ? "compact" : "posters")}
              >
                {viewMode === "posters" ? (
                  <List className="h-[18px] w-[18px]" />
                ) : (
                  <LayoutGrid className="h-[18px] w-[18px]" />
                )}
              </IconButton>
            </>
          }
        />
        <div className="px-5 max-w-xl mx-auto">
          {showSearch && (
            <Input
              placeholder="Buscar por título..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="mt-2 h-10"
              autoFocus
            />
          )}
          <div role="tablist" aria-label="Tipo" className="mt-3 flex gap-6 border-b border-border">
            {typeTabs.map((tab) => (
              <button
                key={tab.value}
                type="button"
                role="tab"
                aria-selected={typeFilter === tab.value}
                onClick={() => setTypeFilter(tab.value)}
                className={cn(
                  "-mb-px h-10 border-b-2 text-[15px] transition-colors",
                  typeFilter === tab.value
                    ? "border-primary font-semibold text-foreground"
                    : "border-transparent font-medium text-muted-foreground hover:text-foreground"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <div className="flex gap-1.5 overflow-x-auto scrollbar-hide py-3 -mx-5 px-5">
            {stateFilters.map((filter) => (
              <button
                key={filter.value}
                type="button"
                aria-pressed={stateFilter === filter.value}
                onClick={() => setStateFilter(filter.value)}
                className={cn(
                  "h-8 shrink-0 whitespace-nowrap rounded-lg border px-3 text-[13px] transition-colors",
                  stateFilter === filter.value
                    ? "border-primary/30 bg-accent font-semibold text-accent-foreground"
                    : "border-border bg-card font-medium text-foreground hover:bg-muted"
                )}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <main className={cn("pb-28 max-w-xl mx-auto", viewMode === "posters" ? "px-4 pt-1" : "px-5")}>
        {!loading && typeFilter === "series" && stateFilter === "all" && !searchTerm && (
          <div className={viewMode === "posters" ? "px-1" : ""}>
            <SeriesHub series={filteredMedia} />
          </div>
        )}
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-7 w-7 border-2 border-muted border-t-primary" />
          </div>
        ) : filteredMedia.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-muted-foreground text-sm">No hay nada con esos filtros</p>
          </div>
        ) : viewMode === "posters" ? (
          <div className="grid grid-cols-3 gap-x-3 gap-y-5">
            {filteredMedia.map((media) => (
              <MediaCard
                key={media.id}
                media={media}
                variant="poster"
                onEdit={handleEdit}
                onDelete={(item) => setDeletingMedia(item)}
                onTrack={(item) => router.push(`/series/${item.id}`)}
              />
            ))}
          </div>
        ) : (
          // With "Todos" the list is grouped by state: what they're watching first, what they saw last.
          <div className="space-y-6 pt-1">
            {(stateFilter === "all"
              ? STATE_GROUPS.map((group) => ({
                  ...group,
                  items: filteredMedia.filter((media) => media.state === group.state),
                }))
              : [{ state: stateFilter, title: "", items: filteredMedia }]
            )
              .filter((group) => group.items.length > 0)
              .map((group) => (
                <section key={group.state}>
                  {group.title && (
                    <SectionLabel count={group.items.length} tone={group.attention ? "primary" : "muted"}>
                      {group.title}
                    </SectionLabel>
                  )}
                  {group.items.map((media) => (
                    <MediaCard
                      key={media.id}
                      media={media}
                      variant="compact"
                      onEdit={handleEdit}
                      onDelete={(item) => setDeletingMedia(item)}
                      onTrack={(item) => router.push(`/series/${item.id}`)}
                    />
                  ))}
                </section>
              ))}
          </div>
        )}
      </main>

      <Dialog open={open} onOpenChange={(isOpen) => isOpen ? handleOpenDialog() : handleCloseDialog()}>
        <DialogTrigger asChild>
          <button
            aria-label="Agregar peli o serie"
            className="fixed bottom-24 right-5 z-50 h-[52px] w-[52px] rounded-[14px] bg-foreground text-background flex items-center justify-center shadow-lg active:scale-95 transition-transform"
          >
            <Plus className="h-6 w-6" />
          </button>
        </DialogTrigger>
          <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto" onInteractOutside={(e) => e.preventDefault()}>
            <DialogHeader>
              <DialogTitle className="text-xl font-semibold tracking-tight">
                {editingMedia ? "Editar peli o serie" : "Agregar peli o serie"}
              </DialogTitle>
              <DialogDescription>
                {editingMedia 
                  ? "Cambiá los datos de la peli o serie"
                  : "Anotá lo que vieron o están viendo juntos"}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-5 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <div className="col-span-3">
                  <Label htmlFor="title">
                    Título
                  </Label>
                  <Input
                    id="title"
                    value={newMedia.title}
                    onChange={(e) =>
                      setNewMedia({ ...newMedia, title: e.target.value, tmdbId: undefined, tmdbType: undefined })
                    }
                    placeholder="Nombre de la peli o serie"
                    className="h-11 mt-2"
                    autoFocus={false}
                  />
                </div>
                <div>
                  <Label htmlFor="year">
                    Año
                  </Label>
                  <Input
                    id="year"
                    type="number"
                    value={newMedia.year}
                    onChange={(e) => setNewMedia({ ...newMedia, year: Number(e.target.value) })}
                    className="h-11 mt-2"
                    autoFocus={false}
                  />
                </div>
              </div>

              <CoverPicker
                key={editingMedia?.id ?? "new"}
                query={newMedia.title}
                image={newMedia.image}
                onImageChange={(image) => setNewMedia((prev) => ({ ...prev, image }))}
                onSelectResult={(result) =>
                  setNewMedia((prev) => ({
                    ...prev,
                    title: result.title,
                    year: result.year,
                    type: result.type,
                    image: result.image,
                    tmdbId: result.tmdbId,
                    tmdbType: result.tmdbType,
                  }))
                }
              />

              <div>
                <Label>Tipo</Label>
                <div className="flex mt-2 space-x-2">
                  <Button
                    type="button"
                    variant={newMedia.type === "pelicula" ? "default" : "outline"}
                    className="flex-1 h-11"
                    onClick={() =>
                      setNewMedia({
                        ...newMedia,
                        type: "pelicula",
                        // "Por retomar" only makes sense for series.
                        state: newMedia.state === "to-resume" ? "pending" : newMedia.state,
                      })
                    }
                  >
                    <Film className="h-4 w-4 mr-2" />
                    Peli
                  </Button>
                  <Button
                    type="button"
                    variant={newMedia.type === "serie" ? "default" : "outline"}
                    className="flex-1 h-11"
                    onClick={() => setNewMedia({ ...newMedia, type: "serie" })}
                  >
                    <Tv className="h-4 w-4 mr-2" />
                    Serie
                  </Button>
                </div>
              </div>

              <div>
                <Label>Estado</Label>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <Button
                    type="button"
                    variant={newMedia.state === "watched" ? "default" : "outline"}
                    className="w-full h-11"
                    onClick={() => setNewMedia({ ...newMedia, state: "watched" })}
                  >
                    <Check className="h-4 w-4 mr-2" />
                    Vista
                  </Button>
                  <Button
                    type="button"
                    variant={newMedia.state === "in-progress" ? "default" : "outline"}
                    className="w-full h-11"
                    onClick={() => setNewMedia({ ...newMedia, state: "in-progress" })}
                  >
                    <Clock className="h-4 w-4 mr-2" />
                    Viendo
                  </Button>
                  <Button
                    type="button"
                    variant={newMedia.state === "pending" ? "default" : "outline"}
                    className="w-full h-11"
                    onClick={() => setNewMedia({ ...newMedia, state: "pending" })}
                  >
                    <Star className="h-4 w-4 mr-2" />
                    Por ver
                  </Button>
                  <Button
                    type="button"
                    variant={newMedia.state === "up-to-date" ? "default" : "outline"}
                    className="w-full h-11"
                    onClick={() => setNewMedia({ ...newMedia, state: "up-to-date" })}
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Al día
                  </Button>
                  {newMedia.type === "serie" && (
                    <Button
                      type="button"
                      variant={newMedia.state === "to-resume" ? "default" : "outline"}
                      className="w-full h-11 col-span-2"
                      onClick={() => setNewMedia({ ...newMedia, state: "to-resume" })}
                    >
                      <Play className="h-4 w-4 mr-2" />
                      Por retomar (salió otra temporada)
                    </Button>
                  )}
                </div>
              </div>

              {newMedia.state === "watched" && newMedia.title.trim().length >= 2 && (
                <div>
                  <Label>¿Dónde la vieron? (opcional)</Label>
                  <div className="mt-2">
                    <WatchedOnOptions
                      title={newMedia.title}
                      year={newMedia.year}
                      type={newMedia.type}
                      tmdbId={newMedia.tmdbId}
                      value={newMedia.watchedOn}
                      onPick={(watchedOn) => setNewMedia((prev) => ({ ...prev, watchedOn }))}
                    />
                  </div>
                </div>
              )}

            </div>
            <DialogFooter>
              <Button 
                type="submit" 
                onClick={handleAddMedia} 
                disabled={saving}
                className="font-medium"
              >
                {saving ? (
                    <>
                    <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    Guardando...
                  </>
                ) : (
                  editingMedia ? "Guardar cambios" : "Guardar"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <AlertDialog open={!!deletingMedia} onOpenChange={(open) => !open && setDeletingMedia(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="text-lg font-semibold tracking-tight">¿Seguro?</AlertDialogTitle>
              <AlertDialogDescription className="text-muted-foreground">
                Se va a borrar {deletingMedia?.title} de la lista. No se puede deshacer.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="border-border">Cancelar</AlertDialogCancel>
              <AlertDialogAction
                className="bg-red-500 hover:bg-red-600 text-white"
                onClick={() => deletingMedia && handleDelete(deletingMedia)}
              >
                Borrar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

    </div>
  )
}

