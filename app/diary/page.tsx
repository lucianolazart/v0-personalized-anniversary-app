"use client"

import { useState } from "react"
import { CalendarHeart, Edit, Plus } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
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

export default function DiaryPage() {
  const [entries, setEntries] = useState([
    {
      id: 1,
      date: "10 de Julio, 2023",
      title: "Nuestro Primer Aniversario",
      content:
        "Hoy celebramos nuestro primer año juntos. Fuimos a cenar a ese restaurante especial donde tuvimos nuestra tercera cita. Fue una noche mágica.",
      author: "Tú",
      image: "/placeholder.svg?height=300&width=500",
    },
    {
      id: 2,
      date: "24 de Diciembre, 2023",
      title: "Navidad en Familia",
      content:
        "Segunda Navidad juntos, esta vez con ambas familias. Fue un día lleno de risas y buenos momentos. Me encantó ver cómo nuestras familias se llevan tan bien.",
      author: "Tu pareja",
      image: "/placeholder.svg?height=300&width=500",
    },
    {
      id: 3,
      date: "14 de Febrero, 2024",
      title: "San Valentín Sorpresa",
      content:
        "No me esperaba esa sorpresa tan especial. Gracias por hacer de este día algo inolvidable. Cada momento contigo es un tesoro.",
      author: "Tu pareja",
      image: "/placeholder.svg?height=300&width=500",
    },
  ])

  const [newEntry, setNewEntry] = useState({
    title: "",
    content: "",
    image: "",
  })

  const [open, setOpen] = useState(false)

  const handleAddEntry = () => {
    if (newEntry.title && newEntry.content) {
      const today = new Date()
      const options: Intl.DateTimeFormatOptions = { year: "numeric", month: "long", day: "numeric" }
      const formattedDate = today.toLocaleDateString("es-ES", options)

      setEntries([
        {
          id: entries.length + 1,
          date: formattedDate,
          title: newEntry.title,
          content: newEntry.content,
          author: "Tú",
          image: newEntry.image || "/placeholder.svg?height=300&width=500",
        },
        ...entries,
      ])

      setNewEntry({
        title: "",
        content: "",
        image: "",
      })

      setOpen(false)
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <header className="text-center mb-8">
        <div className="inline-flex items-center justify-center p-2 bg-amber-100 dark:bg-amber-900/30 rounded-full mb-4">
          <CalendarHeart className="h-6 w-6 text-amber-500 dark:text-amber-400" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Nuestro Diario</h1>
        <p className="text-gray-600 dark:text-gray-300 mt-2">Momentos y pensamientos compartidos</p>
      </header>

      <div className="flex justify-end mb-6">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Nueva entrada
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Añadir nueva entrada</DialogTitle>
              <DialogDescription>Comparte un momento especial o un pensamiento</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="title">Título</Label>
                <Input
                  id="title"
                  value={newEntry.title}
                  onChange={(e) => setNewEntry({ ...newEntry, title: e.target.value })}
                  placeholder="Título de tu entrada"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="content">Contenido</Label>
                <Textarea
                  id="content"
                  value={newEntry.content}
                  onChange={(e) => setNewEntry({ ...newEntry, content: e.target.value })}
                  placeholder="Escribe tus pensamientos aquí..."
                  className="min-h-[150px]"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="image">URL de imagen (opcional)</Label>
                <Input
                  id="image"
                  value={newEntry.image}
                  onChange={(e) => setNewEntry({ ...newEntry, image: e.target.value })}
                  placeholder="https://ejemplo.com/imagen.jpg"
                />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleAddEntry}>Guardar entrada</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="all" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger value="all">Todas las entradas</TabsTrigger>
          <TabsTrigger value="yours">Tus entradas</TabsTrigger>
        </TabsList>

        <TabsContent value="all">
          <ScrollArea className="h-[calc(100vh-300px)]">
            <div className="space-y-6">
              {entries.map((entry) => (
                <DiaryEntry key={entry.id} entry={entry} />
              ))}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="yours">
          <ScrollArea className="h-[calc(100vh-300px)]">
            <div className="space-y-6">
              {entries
                .filter((entry) => entry.author === "Tú")
                .map((entry) => (
                  <DiaryEntry key={entry.id} entry={entry} />
                ))}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  )
}

function DiaryEntry({ entry }: { entry: any }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>{entry.title}</CardTitle>
            <CardDescription className="flex items-center gap-1 mt-1">
              <span>{entry.date}</span>
              <span className="text-xs">•</span>
              <span>{entry.author}</span>
            </CardDescription>
          </div>
          <Button variant="ghost" size="icon">
            <Edit className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      {entry.image && (
        <div className="px-6">
          <div className="aspect-video rounded-md overflow-hidden">
            <img src={entry.image || "/placeholder.svg"} alt={entry.title} className="w-full h-full object-cover" />
          </div>
        </div>
      )}
      <CardContent>
        <p className="text-gray-700 dark:text-gray-300 whitespace-pre-line">{entry.content}</p>
      </CardContent>
      <CardFooter className="flex justify-end">
        <Button variant="ghost" size="sm">
          Comentar
        </Button>
      </CardFooter>
    </Card>
  )
}
