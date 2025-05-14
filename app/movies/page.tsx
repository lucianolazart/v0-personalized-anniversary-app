"use client"

import { useState, useEffect } from "react"
import { Check, Clapperboard, Film, Plus, Search, Star, Tv, Clock, Edit2, Trash2 } from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { collection, addDoc, query, onSnapshot, orderBy, doc, updateDoc, deleteDoc } from "firebase/firestore"
import { db } from "../lib/firebase"
import { useLongPress } from "../hooks/useLongPress"
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

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardFooter } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import type { MediaWithId, NewMediaFormState } from "../types/media"
import { MediaCard } from "../components/MediaCard"

export default function MoviesPage() {
  const [mediaList, setMediaList] = useState<MediaWithId[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(true)
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
        console.error("Error al guardar media:", error)
      }
    }
  }

  const handleOpenDialog = () => {
    setNewMedia(initialFormState)
    setEditingMedia(null)
    setOpen(true)
  }

  const handleCloseDialog = () => {
    setNewMedia(initialFormState)
    setEditingMedia(null)
    setOpen(false)
  }

  const handleEdit = (media: MediaWithId) => {
    setEditingMedia(media)
    setNewMedia({
      title: media.title,
      type: media.type,
      year: media.year,
      image: media.image,
      state: media.state,
    })
    setOpen(true)
  }

  const handleDelete = async (media: MediaWithId) => {
    try {
      await deleteDoc(doc(db, "peliculas", media.id))
      setDeletingMedia(null)
    } catch (error) {
      console.error("Error al eliminar media:", error)
    }
  }

  const filteredMedia = mediaList.filter((media) => 
    media.title.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const getStateIcon = (state: MediaWithId["state"]) => {
    switch (state) {
      case "watched":
        return <Check className="h-4 w-4" />;
      case "in-progress":
        return <Clock className="h-4 w-4" />;
      case "pending":
        return <Star className="h-4 w-4" />;
    }
  };

  const getStateText = (state: MediaWithId["state"]) => {
    switch (state) {
      case "watched":
        return "Vista";
      case "in-progress":
        return "En progreso";
      case "pending":
        return "Pendiente";
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 pb-safe">
      <header className="text-center mb-8">
        <div className="inline-flex items-center justify-center p-2 bg-purple-100 dark:bg-purple-900/30 rounded-full mb-4">
          <Clapperboard className="h-6 w-6 text-purple-500 dark:text-purple-400" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Nuestras Películas y Series</h1>
        <p className="text-gray-600 dark:text-gray-300 mt-2">Recuerdos de momentos compartidos frente a la pantalla</p>
      </header>

      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-6">
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500 dark:text-gray-400" />
          <Input
            placeholder="Buscar..."
            className="pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <Dialog open={open} onOpenChange={(isOpen) => isOpen ? handleOpenDialog() : handleCloseDialog()}>
          <DialogTrigger asChild>
            <Button className="gap-2 w-full sm:w-auto">
              <Plus className="h-4 w-4" />
              Añadir película/serie
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingMedia ? "Editar película o serie" : "Añadir nueva película o serie"}
              </DialogTitle>
              <DialogDescription>
                {editingMedia 
                  ? "Modifica los detalles de la película o serie"
                  : "Registra lo que habéis visto o estáis viendo juntos"}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <div className="col-span-3">
                  <Label htmlFor="title">Título</Label>
                  <Input
                    id="title"
                    value={newMedia.title}
                    onChange={(e) => setNewMedia({ ...newMedia, title: e.target.value })}
                    placeholder="Título"
                    autoFocus={false}
                  />
                </div>
                <div>
                  <Label htmlFor="year">Año</Label>
                  <Input
                    id="year"
                    type="number"
                    value={newMedia.year}
                    onChange={(e) => setNewMedia({ ...newMedia, year: Number(e.target.value) })}
                    autoFocus={false}
                  />
                </div>
              </div>

              <div>
                <Label>Tipo</Label>
                <div className="flex mt-2 space-x-2">
                  <Button
                    type="button"
                    variant={newMedia.type === "pelicula" ? "default" : "outline"}
                    className="flex-1"
                    onClick={() => setNewMedia({ ...newMedia, type: "pelicula" })}
                  >
                    <Film className="h-4 w-4 mr-2" />
                    Película
                  </Button>
                  <Button
                    type="button"
                    variant={newMedia.type === "serie" ? "default" : "outline"}
                    className="flex-1"
                    onClick={() => setNewMedia({ ...newMedia, type: "serie" })}
                  >
                    <Tv className="h-4 w-4 mr-2" />
                    Serie
                  </Button>
                </div>
              </div>

              <div>
                <Label>Estado</Label>
                <div className="grid grid-cols-3 gap-2 mt-2">
                  <Button
                    type="button"
                    variant={newMedia.state === "watched" ? "default" : "outline"}
                    className="w-full"
                    onClick={() => setNewMedia({ ...newMedia, state: "watched" })}
                  >
                    <Check className="h-4 w-4 mr-2" />
                    Vista
                  </Button>
                  <Button
                    type="button"
                    variant={newMedia.state === "in-progress" ? "default" : "outline"}
                    className="w-full"
                    onClick={() => setNewMedia({ ...newMedia, state: "in-progress" })}
                  >
                    <Clock className="h-4 w-4 mr-2" />
                    En progreso
                  </Button>
                  <Button
                    type="button"
                    variant={newMedia.state === "pending" ? "default" : "outline"}
                    className="w-full"
                    onClick={() => setNewMedia({ ...newMedia, state: "pending" })}
                  >
                    <Star className="h-4 w-4 mr-2" />
                    Pendiente
                  </Button>
                </div>
              </div>

              <div>
                <Label htmlFor="image">URL de la imagen</Label>
                <Input
                  id="image"
                  value={newMedia.image}
                  onChange={(e) => setNewMedia({ ...newMedia, image: e.target.value })}
                  placeholder="https://ejemplo.com/imagen.jpg"
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" onClick={handleAddMedia}>
                {editingMedia ? "Guardar cambios" : "Guardar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <AlertDialog open={!!deletingMedia} onOpenChange={(open) => !open && setDeletingMedia(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará permanentemente {deletingMedia?.title} de tu lista.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-500 hover:bg-red-600"
              onClick={() => deletingMedia && handleDelete(deletingMedia)}
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
        </div>
      ) : (
        <div className="mb-safe">
          <Tabs defaultValue="all" className="w-full">
            <TabsList className="w-full sm:w-auto">
              <TabsTrigger value="all" className="flex-1 sm:flex-none">
                Todos
              </TabsTrigger>
              <TabsTrigger value="movies" className="flex-1 sm:flex-none">
                Películas
              </TabsTrigger>
              <TabsTrigger value="series" className="flex-1 sm:flex-none">
                Series
              </TabsTrigger>
            </TabsList>
            <TabsContent value="all">
              <MediaGrid 
                mediaList={filteredMedia} 
                onEdit={handleEdit}
                onDelete={(media) => setDeletingMedia(media)}
              />
            </TabsContent>
            <TabsContent value="movies">
              <MediaGrid 
                mediaList={filteredMedia.filter((media) => media.type === "pelicula")} 
                onEdit={handleEdit}
                onDelete={(media) => setDeletingMedia(media)}
              />
            </TabsContent>
            <TabsContent value="series">
              <MediaGrid 
                mediaList={filteredMedia.filter((media) => media.type === "serie")} 
                onEdit={handleEdit}
                onDelete={(media) => setDeletingMedia(media)}
              />
            </TabsContent>
          </Tabs>
        </div>
      )}
    </div>
  )
}

function MediaGrid({ 
  mediaList, 
  onEdit,
  onDelete 
}: { 
  mediaList: MediaWithId[];
  onEdit: (media: MediaWithId) => void;
  onDelete: (media: MediaWithId) => void;
}) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
      {mediaList.map((media) => (
        <MediaCard
          key={media.id}
          media={media}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}
