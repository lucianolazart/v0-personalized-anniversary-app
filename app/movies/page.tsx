"use client"

import React, { useState, useEffect } from "react"
import { Check, Film, Plus, Search, Star, Tv, Clock, RefreshCw } from "lucide-react"
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { MediaWithId, NewMediaFormState } from "../types/media"
import { MediaCard } from "../components/MediaCard"
import { CoverPicker } from "../components/CoverPicker"
import { cn } from "@/lib/utils"

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

  return (
    <div className="flex flex-col h-full bg-background font-sans text-foreground relative min-h-screen">
      {/* Header */}
      <header className="flex-none px-6 pt-12 pb-4 bg-background z-20 sticky top-0">
        <div className="mb-4">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              Movies & Shows
            </h1>
            <button 
              onClick={() => {
                setShowSearch(!showSearch)
                if (showSearch) {
                  setSearchTerm("")
                }
              }}
              className="p-2 rounded-full bg-secondary text-foreground shadow-sm border border-border hover:bg-accent transition-colors"
            >
              <Search className="h-6 w-6" />
            </button>
          </div>
          {showSearch && (
            <Input
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-9 border-border focus:border-[#EA580C] focus:ring-[#EA580C]"
              autoFocus
            />
          )}
        </div>
        <div className="space-y-3">
          {/* Type Filters */}
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
            <button
              onClick={() => setTypeFilter("all")}
              className={cn(
                "px-5 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-all",
                typeFilter === "all"
                  ? "bg-[#EA580C] text-white shadow-sm"
                  : "bg-card text-muted-foreground border border-border"
              )}
            >
              All
            </button>
            <button
              onClick={() => setTypeFilter("movies")}
              className={cn(
                "px-5 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all",
                typeFilter === "movies"
                  ? "bg-[#EA580C] text-white shadow-sm"
                  : "bg-card text-muted-foreground border border-border"
              )}
            >
              Movies
            </button>
            <button
              onClick={() => setTypeFilter("series")}
              className={cn(
                "px-5 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all",
                typeFilter === "series"
                  ? "bg-[#EA580C] text-white shadow-sm"
                  : "bg-card text-muted-foreground border border-border"
              )}
            >
              TV Shows
            </button>
          </div>

          {/* State Filters */}
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
            <button
              onClick={() => setStateFilter("all")}
              className={cn(
                "px-5 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all flex items-center gap-1.5",
                stateFilter === "all"
                  ? "bg-[#EA580C] text-white shadow-sm"
                  : "bg-card text-muted-foreground border border-border"
              )}
            >
              All Status
            </button>
            <button
              onClick={() => setStateFilter("watched")}
              className={cn(
                "px-5 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all flex items-center gap-1.5",
                stateFilter === "watched"
                  ? "bg-[#EA580C] text-white shadow-sm"
                  : "bg-card text-muted-foreground border border-border"
              )}
            >
              <Check className="h-3.5 w-3.5" />
              Watched
            </button>
            <button
              onClick={() => setStateFilter("in-progress")}
              className={cn(
                "px-5 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all flex items-center gap-1.5",
                stateFilter === "in-progress"
                  ? "bg-[#EA580C] text-white shadow-sm"
                  : "bg-card text-muted-foreground border border-border"
              )}
            >
              <Clock className="h-3.5 w-3.5" />
              Watching
            </button>
            <button
              onClick={() => setStateFilter("pending")}
              className={cn(
                "px-5 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all flex items-center gap-1.5",
                stateFilter === "pending"
                  ? "bg-[#EA580C] text-white shadow-sm"
                  : "bg-card text-muted-foreground border border-border"
              )}
            >
              <Star className="h-3.5 w-3.5" />
              Watchlist
            </button>
            <button
              onClick={() => setStateFilter("up-to-date")}
              className={cn(
                "px-5 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all flex items-center gap-1.5",
                stateFilter === "up-to-date"
                  ? "bg-[#EA580C] text-white shadow-sm"
                  : "bg-card text-muted-foreground border border-border"
              )}
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Up to Date
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto px-6 pb-24 pt-2">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#FED7AA] border-t-[#EA580C]"></div>
          </div>
        ) : (
          <div className="space-y-4">
            {getFilteredMedia().length === 0 ? (
              <div className="text-center py-16">
                <p className="text-muted-foreground text-sm font-medium">
                  No items match the selected filters
                </p>
              </div>
            ) : (
              getFilteredMedia().map((media) => (
                <MediaCard
                  key={media.id}
                  media={media}
                  onEdit={handleEdit}
                  onDelete={(media) => setDeletingMedia(media)}
                />
              ))
            )}
          </div>
        )}
      </main>

      {/* Floating Add Button */}
      <Dialog open={open} onOpenChange={(isOpen) => isOpen ? handleOpenDialog() : handleCloseDialog()}>
        <DialogTrigger asChild>
          <button className="fixed bottom-24 right-6 w-14 h-14 bg-[#EA580C] text-white rounded-full shadow-lg shadow-[#EA580C]/40 flex items-center justify-center z-50 active:scale-95 transition-transform">
            <Plus className="h-7 w-7" />
          </button>
        </DialogTrigger>
          <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto" onInteractOutside={(e) => e.preventDefault()}>
            <DialogHeader>
              <DialogTitle className="text-xl font-semibold">
                {editingMedia ? "Edit movie or show" : "Add new movie or show"}
              </DialogTitle>
              <DialogDescription className="text-gray-500 dark:text-gray-400">
                {editingMedia 
                  ? "Modify the details of the movie or show"
                  : "Record what you've watched or are watching together"}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-5 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <div className="col-span-3">
                  <Label htmlFor="title" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Title
                  </Label>
                  <Input
                    id="title"
                    value={newMedia.title}
                    onChange={(e) => setNewMedia({ ...newMedia, title: e.target.value })}
                    placeholder="Enter movie or show title"
                    className="h-11 mt-2 border-gray-200 dark:border-gray-800 focus:border-[#EA580C] focus:ring-[#EA580C]"
                    autoFocus={false}
                  />
                </div>
                <div>
                  <Label htmlFor="year" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Year
                  </Label>
                  <Input
                    id="year"
                    type="number"
                    value={newMedia.year}
                    onChange={(e) => setNewMedia({ ...newMedia, year: Number(e.target.value) })}
                    className="h-11 mt-2 border-gray-200 dark:border-gray-800 focus:border-[#EA580C] focus:ring-[#EA580C]"
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
                <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">Type</Label>
                <div className="flex mt-2 space-x-2">
                  <Button
                    type="button"
                    variant={newMedia.type === "pelicula" ? "default" : "outline"}
                    className={cn(
                      "flex-1 h-11",
                      newMedia.type === "pelicula" 
                        ? "bg-[#EA580C] hover:bg-[#C2410C] text-white" 
                        : "border-gray-200 dark:border-gray-800"
                    )}
                    onClick={() => setNewMedia({ ...newMedia, type: "pelicula" })}
                  >
                    <Film className="h-4 w-4 mr-2" />
                    Movie
                  </Button>
                  <Button
                    type="button"
                    variant={newMedia.type === "serie" ? "default" : "outline"}
                    className={cn(
                      "flex-1 h-11",
                      newMedia.type === "serie" 
                        ? "bg-[#EA580C] hover:bg-[#C2410C] text-white" 
                        : "border-gray-200 dark:border-gray-800"
                    )}
                    onClick={() => setNewMedia({ ...newMedia, type: "serie" })}
                  >
                    <Tv className="h-4 w-4 mr-2" />
                    TV Show
                  </Button>
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">Status</Label>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <Button
                    type="button"
                    variant={newMedia.state === "watched" ? "default" : "outline"}
                    className={cn(
                      "w-full h-11",
                      newMedia.state === "watched" 
                        ? "bg-[#EA580C] hover:bg-[#C2410C] text-white" 
                        : "border-gray-200 dark:border-gray-800"
                    )}
                    onClick={() => setNewMedia({ ...newMedia, state: "watched" })}
                  >
                    <Check className="h-4 w-4 mr-2" />
                    Watched
                  </Button>
                  <Button
                    type="button"
                    variant={newMedia.state === "in-progress" ? "default" : "outline"}
                    className={cn(
                      "w-full h-11",
                      newMedia.state === "in-progress" 
                        ? "bg-[#EA580C] hover:bg-[#C2410C] text-white" 
                        : "border-gray-200 dark:border-gray-800"
                    )}
                    onClick={() => setNewMedia({ ...newMedia, state: "in-progress" })}
                  >
                    <Clock className="h-4 w-4 mr-2" />
                    Watching
                  </Button>
                  <Button
                    type="button"
                    variant={newMedia.state === "pending" ? "default" : "outline"}
                    className={cn(
                      "w-full h-11",
                      newMedia.state === "pending" 
                        ? "bg-[#EA580C] hover:bg-[#C2410C] text-white" 
                        : "border-gray-200 dark:border-gray-800"
                    )}
                    onClick={() => setNewMedia({ ...newMedia, state: "pending" })}
                  >
                    <Star className="h-4 w-4 mr-2" />
                    Watchlist
                  </Button>
                  <Button
                    type="button"
                    variant={newMedia.state === "up-to-date" ? "default" : "outline"}
                    className={cn(
                      "w-full h-11",
                      newMedia.state === "up-to-date" 
                        ? "bg-[#EA580C] hover:bg-[#C2410C] text-white" 
                        : "border-gray-200 dark:border-gray-800"
                    )}
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
                className="bg-[#EA580C] hover:bg-[#C2410C] text-white font-medium"
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
              <AlertDialogTitle className="text-lg font-semibold">Are you sure?</AlertDialogTitle>
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

