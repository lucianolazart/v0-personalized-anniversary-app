"use client"

import { useState } from "react"
import { Check, Clapperboard, Film, Plus, Search, Star, Tv } from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"

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

export default function MoviesPage() {
  const [mediaList, setMediaList] = useState<MediaWithId[]>([
    {
      id: 1,
      title: "La La Land",
      type: "movie",
      year: 2016,
      poster: "/placeholder.svg?height=450&width=300",
      status: "watched",
      rating: 5,
      notes: "Nuestra primera película juntos. Nos encantó la música.",
      dateWatched: "15 de Agosto, 2022",
    } as const,
    {
      id: 2,
      title: "Stranger Things",
      type: "series",
      year: 2016,
      poster: "/placeholder.svg?height=450&width=300",
      status: "in-progress",
      currentSeason: 3,
      currentEpisode: 4,
      notes: "Nos quedamos en el episodio donde...",
    } as const,
    {
      id: 3,
      title: "El Padrino",
      type: "movie",
      year: 1972,
      poster: "/placeholder.svg?height=450&width=300",
      status: "watched",
      rating: 4,
      notes: "Clásico que finalmente vimos juntos.",
      dateWatched: "3 de Octubre, 2022",
    } as const,
    {
      id: 4,
      title: "Breaking Bad",
      type: "series",
      year: 2008,
      poster: "/placeholder.svg?height=450&width=300",
      status: "in-progress",
      currentSeason: 2,
      currentEpisode: 8,
      notes: "Estamos enganchados con esta serie.",
    } as const,
    {
      id: 5,
      title: "Interestelar",
      type: "movie",
      year: 2014,
      poster: "/placeholder.svg?height=450&width=300",
      status: "watched",
      rating: 5,
      notes: "Nos dejó pensando durante días.",
      dateWatched: "12 de Enero, 2023",
    } as const,
    {
      id: 6,
      title: "The Office",
      type: "series",
      year: 2005,
      poster: "/placeholder.svg?height=450&width=300",
      status: "watched",
      rating: 5,
      notes: "Nuestra serie de comedia favorita.",
      dateWatched: "Terminada el 5 de Mayo, 2023",
      currentSeason: 9,
      currentEpisode: 23,
    } as const,
  ])

  const [searchTerm, setSearchTerm] = useState("")
  const [open, setOpen] = useState(false)
  const [newMedia, setNewMedia] = useState<NewMediaFormState>({
    title: "",
    type: "movie",
    year: new Date().getFullYear(),
    poster: "",
    status: "in-progress",
    rating: 0,
    notes: "",
    dateWatched: format(new Date(), "d 'de' MMMM, yyyy", { locale: es }),
  })

  const handleAddMedia = () => {
    if (newMedia.title) {
      const baseMedia = {
        id: mediaList.length + 1,
        title: newMedia.title,
        year: newMedia.year,
        poster: newMedia.poster || "/placeholder.svg?height=450&width=300",
        status: newMedia.status,
        notes: newMedia.notes,
      }

      let mediaToAdd: MediaWithId;

      if (newMedia.type === "movie") {
        mediaToAdd = {
          ...baseMedia,
          type: "movie",
          rating: newMedia.rating || 0,
          dateWatched: format(new Date(), "d 'de' MMMM, yyyy", { locale: es }),
        };
      } else {
        mediaToAdd = {
          ...baseMedia,
          type: "series",
          currentSeason: newMedia.currentSeason || 1,
          currentEpisode: newMedia.currentEpisode || 1,
        };
      }

      setMediaList([mediaToAdd, ...mediaList])

      setNewMedia({
        title: "",
        type: "movie",
        year: new Date().getFullYear(),
        poster: "",
        status: "in-progress",
        rating: 0,
        notes: "",
        dateWatched: format(new Date(), "d 'de' MMMM, yyyy", { locale: es }),
      })

      setOpen(false)
    }
  }

  const filteredMedia = mediaList.filter((media) => 
    media.title.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="container mx-auto px-4 py-8">
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

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2 w-full sm:w-auto">
              <Plus className="h-4 w-4" />
              Añadir película/serie
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Añadir nueva película o serie</DialogTitle>
              <DialogDescription>Registra lo que habéis visto o estáis viendo juntos</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 gap-4">
                <div className="col-span-3">
                  <Label htmlFor="title">Título</Label>
                  <Input
                    id="title"
                    value={newMedia.title}
                    onChange={(e) => setNewMedia({ ...newMedia, title: e.target.value })}
                    placeholder="Título"
                  />
                </div>
                <div>
                  <Label htmlFor="year">Año</Label>
                  <Input
                    id="year"
                    type="number"
                    value={newMedia.year}
                    onChange={(e) => setNewMedia({ ...newMedia, year: Number(e.target.value) })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Tipo</Label>
                  <div className="flex mt-2">
                    <Button
                      type="button"
                      variant={newMedia.type === "movie" ? "default" : "outline"}
                      className="rounded-r-none flex-1"
                      onClick={() => setNewMedia({ ...newMedia, type: "movie" })}
                    >
                      <Film className="h-4 w-4 mr-2" />
                      Película
                    </Button>
                    <Button
                      type="button"
                      variant={newMedia.type === "series" ? "default" : "outline"}
                      className="rounded-l-none flex-1"
                      onClick={() => setNewMedia({ ...newMedia, type: "series" })}
                    >
                      <Tv className="h-4 w-4 mr-2" />
                      Serie
                    </Button>
                  </div>
                </div>
                <div>
                  <Label>Estado</Label>
                  <div className="flex mt-2">
                    <Button
                      type="button"
                      variant={newMedia.status === "watched" ? "default" : "outline"}
                      className="rounded-r-none flex-1"
                      onClick={() => setNewMedia({ ...newMedia, status: "watched" })}
                    >
                      <Check className="h-4 w-4 mr-2" />
                      Vista
                    </Button>
                    <Button
                      type="button"
                      variant={newMedia.status === "in-progress" ? "default" : "outline"}
                      className="rounded-l-none flex-1"
                      onClick={() => setNewMedia({ ...newMedia, status: "in-progress" })}
                    >
                      <Star className="h-4 w-4 mr-2" />
                      En progreso
                    </Button>
                  </div>
                </div>
              </div>

              {newMedia.type === "movie" && (
                <div>
                  <Label>Valoración</Label>
                  <div className="flex gap-2 mt-2">
                    {[1, 2, 3, 4, 5].map((rating) => (
                      <Button
                        key={rating}
                        type="button"
                        variant={(newMedia.rating || 0) >= rating ? "default" : "outline"}
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setNewMedia({ ...newMedia, rating })}
                      >
                        <Star className="h-4 w-4" />
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <Label htmlFor="notes">Notas</Label>
                <Textarea
                  id="notes"
                  value={newMedia.notes}
                  onChange={(e) => setNewMedia({ ...newMedia, notes: e.target.value })}
                  placeholder="Escribe tus pensamientos..."
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" onClick={handleAddMedia}>
                Guardar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

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
          <MediaGrid mediaList={filteredMedia} />
        </TabsContent>
        <TabsContent value="movies">
          <MediaGrid mediaList={filteredMedia.filter((media) => media.type === "movie")} />
        </TabsContent>
        <TabsContent value="series">
          <MediaGrid mediaList={filteredMedia.filter((media) => media.type === "series")} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

function MediaGrid({ mediaList }: { mediaList: MediaWithId[] }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
      {mediaList.map((media) => (
        <Card key={media.id} className="overflow-hidden">
          <div className="aspect-[2/3] relative">
            <img
              src={media.poster}
              alt={media.title}
              className="object-cover"
              width={300}
              height={450}
            />
            <div className="absolute top-2 right-2">
              <Badge variant={media.status === "watched" ? "default" : "secondary"}>
                {media.status === "watched" ? "Vista" : "En progreso"}
              </Badge>
            </div>
          </div>
          <CardFooter className="flex-col items-start p-4">
            <div className="flex items-start justify-between w-full">
              <div>
                <h3 className="font-semibold">{media.title}</h3>
                <p className="text-sm text-gray-500">{media.year}</p>
              </div>
              {media.type === "movie" && media.rating > 0 && (
                <div className="flex">
                  <Star className="h-4 w-4 text-yellow-400 fill-yellow-400" />
                  <span className="ml-1 text-sm">{media.rating}</span>
                </div>
              )}
            </div>
            {media.type === "series" && (
              <p className="text-sm text-gray-500 mt-1">
                Temporada {media.currentSeason}, Episodio {media.currentEpisode}
              </p>
            )}
            {media.notes && (
              <p className="text-sm text-gray-600 mt-2 line-clamp-2">{media.notes}</p>
            )}
          </CardFooter>
        </Card>
      ))}
    </div>
  )
}
