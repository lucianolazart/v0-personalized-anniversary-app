"use client"

import React, { useState, useEffect } from "react"
import { Check, Film, LayoutGrid, List, Plus, Search, Star, Tv, Clock, RefreshCw } from "lucide-react"
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
import { ThemeToggle } from "@/components/theme-toggle"
import { cn } from "@/lib/utils"

const VIEW_KEY = "movies-view"
type ViewMode = "posters" | "compact"

export default function MoviesPage() {
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
      const updatedMedia = snapshot.docs.map(doc => {
        const data = doc.data()
        return {
          id: doc.id,
          title: data.title,
          year: data.year,
          image: data.image,
          state: data.state,
          type: data.type,
        } as MediaWithId
      })
      
      setMediaList(updatedMedia)
      setLoading(false)
    })

    // Limpiar el listener cuando el componente se desmonte
    return () => unsubscribe()
  }, [])

  const handleAddMedia = async () => {
    if (newMedia.title) {
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
    })
    setOpen(true)
    // Restaurar la posición del scroll después de un pequeño delay
    setTimeout(() => {
      window.scrollTo(0, currentScroll)
    }, 0)
  }

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
  const [viewMode, setViewMode] = useState<ViewMode>("posters")

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

  const chipClass = (active: boolean) =>
    cn(
      "px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors flex items-center gap-1.5",
      active
        ? "bg-primary text-primary-foreground"
        : "bg-card text-muted-foreground border border-border"
    )

  const filteredMedia = getFilteredMedia()

  return (
    <div className="flex flex-col h-full bg-background text-foreground relative min-h-screen">
      <header className="flex-none px-4 pt-12 pb-3 bg-background/90 backdrop-blur-md z-20 sticky top-0">
        <div className="mb-3">
          <div className="flex items-center gap-2 mb-3">
            <h1 className="flex-1 text-3xl font-serif font-medium tracking-tight text-foreground">
              Movies & Shows
            </h1>
            <div className="inline-flex rounded-md border border-border bg-card p-0.5">
              <button
                type="button"
                onClick={() => handleViewMode("posters")}
                className={cn(
                  "h-8 w-8 inline-flex items-center justify-center rounded-sm transition-colors",
                  viewMode === "posters"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
                aria-label="Poster grid"
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => handleViewMode("compact")}
                className={cn(
                  "h-8 w-8 inline-flex items-center justify-center rounded-sm transition-colors",
                  viewMode === "compact"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
                aria-label="Compact list"
              >
                <List className="h-4 w-4" />
              </button>
            </div>
            <button
              onClick={() => {
                setShowSearch(!showSearch)
                if (showSearch) {
                  setSearchTerm("")
                }
              }}
              className="h-9 w-9 inline-flex items-center justify-center rounded-md border border-border bg-card text-foreground hover:bg-accent transition-colors"
              aria-label="Search"
            >
              <Search className="h-4 w-4" />
            </button>
            <ThemeToggle />
          </div>
          {showSearch && (
            <Input
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-9"
              autoFocus
            />
          )}
        </div>
        <div className="space-y-2">
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            <button onClick={() => setTypeFilter("all")} className={chipClass(typeFilter === "all")}>
              All
            </button>
            <button onClick={() => setTypeFilter("movies")} className={chipClass(typeFilter === "movies")}>
              Movies
            </button>
            <button onClick={() => setTypeFilter("series")} className={chipClass(typeFilter === "series")}>
              TV Shows
            </button>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            <button onClick={() => setStateFilter("all")} className={chipClass(stateFilter === "all")}>
              All Status
            </button>
            <button onClick={() => setStateFilter("watched")} className={chipClass(stateFilter === "watched")}>
              <Check className="h-3 w-3" />
              Watched
            </button>
            <button onClick={() => setStateFilter("in-progress")} className={chipClass(stateFilter === "in-progress")}>
              <Clock className="h-3 w-3" />
              Watching
            </button>
            <button onClick={() => setStateFilter("pending")} className={chipClass(stateFilter === "pending")}>
              <Star className="h-3 w-3" />
              Watchlist
            </button>
            <button onClick={() => setStateFilter("up-to-date")} className={chipClass(stateFilter === "up-to-date")}>
              <RefreshCw className="h-3 w-3" />
              Up to Date
            </button>
          </div>
        </div>
      </header>

      <main className={cn("flex-1 overflow-y-auto pb-24 pt-2", viewMode === "posters" ? "px-3" : "px-4")}>
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-muted border-t-primary" />
          </div>
        ) : filteredMedia.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-muted-foreground text-sm">
              No items match the selected filters
            </p>
          </div>
        ) : viewMode === "posters" ? (
          <div className="grid grid-cols-3 gap-x-2 gap-y-4">
            {filteredMedia.map((media) => (
              <MediaCard
                key={media.id}
                media={media}
                variant="poster"
                onEdit={handleEdit}
                onDelete={(item) => setDeletingMedia(item)}
              />
            ))}
          </div>
        ) : (
          <div>
            {filteredMedia.map((media) => (
              <MediaCard
                key={media.id}
                media={media}
                variant="compact"
                onEdit={handleEdit}
                onDelete={(item) => setDeletingMedia(item)}
              />
            ))}
          </div>
        )}
      </main>

      {/* Floating Add Button */}
      <Dialog open={open} onOpenChange={(isOpen) => isOpen ? handleOpenDialog() : handleCloseDialog()}>
        <DialogTrigger asChild>
          <button className="fixed bottom-24 right-6 w-14 h-14 bg-primary text-primary-foreground rounded-full shadow-lg shadow-primary/30 flex items-center justify-center z-50 active:scale-95 transition-transform">
            <Plus className="h-7 w-7" />
          </button>
        </DialogTrigger>
          <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto" onInteractOutside={(e) => e.preventDefault()}>
            <DialogHeader>
              <DialogTitle className="text-xl font-serif font-medium">
                {editingMedia ? "Edit movie or show" : "Add new movie or show"}
              </DialogTitle>
              <DialogDescription>
                {editingMedia 
                  ? "Modify the details of the movie or show"
                  : "Record what you've watched or are watching together"}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-5 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <div className="col-span-3">
                  <Label htmlFor="title">
                    Title
                  </Label>
                  <Input
                    id="title"
                    value={newMedia.title}
                    onChange={(e) => setNewMedia({ ...newMedia, title: e.target.value })}
                    placeholder="Enter movie or show title"
                    className="h-11 mt-2"
                    autoFocus={false}
                  />
                </div>
                <div>
                  <Label htmlFor="year">
                    Year
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
                  }))
                }
              />

              <div>
                <Label>Type</Label>
                <div className="flex mt-2 space-x-2">
                  <Button
                    type="button"
                    variant={newMedia.type === "pelicula" ? "default" : "outline"}
                    className="flex-1 h-11"
                    onClick={() => setNewMedia({ ...newMedia, type: "pelicula" })}
                  >
                    <Film className="h-4 w-4 mr-2" />
                    Movie
                  </Button>
                  <Button
                    type="button"
                    variant={newMedia.type === "serie" ? "default" : "outline"}
                    className="flex-1 h-11"
                    onClick={() => setNewMedia({ ...newMedia, type: "serie" })}
                  >
                    <Tv className="h-4 w-4 mr-2" />
                    TV Show
                  </Button>
                </div>
              </div>

              <div>
                <Label>Status</Label>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <Button
                    type="button"
                    variant={newMedia.state === "watched" ? "default" : "outline"}
                    className="w-full h-11"
                    onClick={() => setNewMedia({ ...newMedia, state: "watched" })}
                  >
                    <Check className="h-4 w-4 mr-2" />
                    Watched
                  </Button>
                  <Button
                    type="button"
                    variant={newMedia.state === "in-progress" ? "default" : "outline"}
                    className="w-full h-11"
                    onClick={() => setNewMedia({ ...newMedia, state: "in-progress" })}
                  >
                    <Clock className="h-4 w-4 mr-2" />
                    Watching
                  </Button>
                  <Button
                    type="button"
                    variant={newMedia.state === "pending" ? "default" : "outline"}
                    className="w-full h-11"
                    onClick={() => setNewMedia({ ...newMedia, state: "pending" })}
                  >
                    <Star className="h-4 w-4 mr-2" />
                    Watchlist
                  </Button>
                  <Button
                    type="button"
                    variant={newMedia.state === "up-to-date" ? "default" : "outline"}
                    className="w-full h-11"
                    onClick={() => setNewMedia({ ...newMedia, state: "up-to-date" })}
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Up to Date
                  </Button>
                </div>
              </div>

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
                    Saving...
                  </>
                ) : (
                  editingMedia ? "Save Changes" : "Save Media"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <AlertDialog open={!!deletingMedia} onOpenChange={(open) => !open && setDeletingMedia(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="text-lg font-serif font-medium">Are you sure?</AlertDialogTitle>
              <AlertDialogDescription className="text-muted-foreground">
                This action cannot be undone. This will permanently delete {deletingMedia?.title} from your list.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="border-border">Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-red-500 hover:bg-red-600 text-white"
                onClick={() => deletingMedia && handleDelete(deletingMedia)}
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
    </div>
  )
}

