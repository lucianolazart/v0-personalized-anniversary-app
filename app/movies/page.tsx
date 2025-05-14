"use client"

import { useState } from "react"
import { Check, Clapperboard, Film, Search, Star, Tv } from "lucide-react"

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

export default function MoviesPage() {
  // Datos de ejemplo - reemplazar con tus propias películas y series
  const [mediaList, setMediaList] = useState([
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
    },
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
    },
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
    },
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
    },
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
    },
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
    },
  ])

  const [searchTerm, setSearchTerm] = useState("")
  const [open, setOpen] = useState(false)
  const [newMedia, setNewMedia] = useState({
    title: "",
    type: "movie",
    year: new Date().getFullYear(),
    poster: "",
    status: "in-progress",
    rating: 0,
    notes: "",
    currentSeason: 1,
    currentEpisode: 1,
  })

  const handleAddMedia = () => {
    if (newMedia.title) {
      setMediaList([
        {
          id: mediaList.length + 1,
          ...newMedia,
          poster: newMedia.poster || "/placeholder.svg?height=450&width=300",
        },
        ...mediaList,
      ])

      setNewMedia({
        title: "",
        type: "movie",
        year: new Date().getFullYear(),
        poster: "",
        status: "in-progress",
        rating: 0,
        notes: "",
        currentSeason: 1,
        currentEpisode: 1,
      })

      setOpen(false)
    }
  }

  const filteredMedia = mediaList.filter((media) => media.title.toLowerCase().includes(searchTerm.toLowerCase()))

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
                    onChange={(e) => setNewMedia({ ...newMedia, year: Number.parseInt(e.target.value) })}
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
                      <Clock className="h-4 w-4 mr-2" />
                      En proceso
                    </Button>
                  </div>
                </div>
              </div>

              {newMedia.type === "series" && newMedia.status === "in-progress" && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="season">Temporada actual</Label>
                    <Input
                      id="season"
                      type="number"
                      min="1"
                      value={newMedia.currentSeason}
                      onChange={(e) => setNewMedia({ ...newMedia, currentSeason: Number.parseInt(e.target.value) })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="episode">Episodio actual</Label>
                    <Input
                      id="episode"
                      type="number"
                      min="1"
                      value={newMedia.currentEpisode}
                      onChange={(e) => setNewMedia({ ...newMedia, currentEpisode: Number.parseInt(e.target.value) })}
                    />
                  </div>
                </div>
              )}

              {newMedia.status === "watched" && (
                <div>
                  <Label>Valoración</Label>
                  <div className="flex gap-1 mt-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Button
                        key={star}
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => setNewMedia({ ...newMedia, rating: star })}
                      >
                        <Star
                          className={`h-5 w-5 ${
                            star <= newMedia.rating
                              ? "fill-yellow-400 text-yellow-400"
                              : "text-gray-300 dark:text-gray-600"
                          }`}
                        />
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <Label htmlFor="poster">URL del póster (opcional)</Label>
                <Input
                  id="poster"
                  value={newMedia.poster}
                  onChange={(e) => setNewMedia({ ...newMedia, poster: e.target.value })}
                  placeholder="https://ejemplo.com/poster.jpg"
                />
              </div>

              <div>
                <Label htmlFor="notes">Notas</Label>
                <Textarea
                  id="notes"
                  value={newMedia.notes}
                  onChange={(e) => setNewMedia({ ...newMedia, notes: e.target.value })}
                  placeholder="Añade notas o comentarios sobre esta película/serie..."
                />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleAddMedia}>Guardar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="all" className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-6">
          <TabsTrigger value="all">Todas</TabsTrigger>
          <TabsTrigger value="watched">Vistas</TabsTrigger>
          <TabsTrigger value="in-progress">En proceso</TabsTrigger>
        </TabsList>

        <TabsContent value="all">
          <MediaGrid mediaList={filteredMedia} />
        </TabsContent>

        <TabsContent value="watched">
          <MediaGrid mediaList={filteredMedia.filter((media) => media.status === "watched")} />
        </TabsContent>

        <TabsContent value="in-progress">
          <MediaGrid mediaList={filteredMedia.filter((media) => media.status === "in-progress")} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

function MediaGrid({ mediaList }: { mediaList: any[] }) {
  return (
    <ScrollArea className="h-[calc(100vh-300px)]">
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {mediaList.map((media) => (
          <Card key={media.id} className="overflow-hidden">
            <div className="relative aspect-[2/3] overflow-hidden">
              <img src={media.poster || "/placeholder.svg"} alt={media.title} className="w-full h-full object-cover" />
              <div className="absolute top-2 right-2">
                <Badge variant={media.status === "watched" ? "default" : "secondary"}>
                  {media.status === "watched" ? (
                    <span className="flex items-center gap-1">
                      <Check className="h-3 w-3" />
                      Vista
                    </span>
                  ) : (
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      En proceso
                    </span>
                  )}
                </Badge>
              </div>
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3">
                <h3 className="font-medium text-white truncate">{media.title}</h3>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-white/80">
                    {media.year} • {media.type === "movie" ? "Película" : "Serie"}
                  </span>
                  {media.status === "watched" && media.rating && (
                    <div className="flex items-center">
                      <Star className="h-3 w-3 fill-yellow-400 text-yellow-400 mr-1" />
                      <span className="text-xs text-white/80">{media.rating}/5</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
            {media.type === "series" && media.status === "in-progress" && (
              <CardFooter className="p-2 text-xs text-gray-500 dark:text-gray-400">
                T{media.currentSeason} E{media.currentEpisode}
              </CardFooter>
            )}
          </Card>
        ))}
      </div>
    </ScrollArea>
  )
}

function Plus({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M12 5v14M5 12h14" />
    </svg>
  )
}

function Clock({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  )
}
