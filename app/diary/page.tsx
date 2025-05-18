"use client"

import { useState, useEffect } from "react"
import { CalendarHeart, Edit, Plus } from "lucide-react"
import { collection, addDoc, query, onSnapshot, orderBy, doc, updateDoc, deleteDoc, Timestamp } from "firebase/firestore"
import { db } from "../lib/firebase"

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
import { Textarea } from "@/components/ui/textarea"

interface DiaryEntry {
  id: string;
  date: Timestamp;
  title: string;
  content: string;
  image?: string;
}

const formatDate = (date: Timestamp) => {
  const jsDate = date.toDate()
  const options: Intl.DateTimeFormatOptions = { 
    year: "numeric", 
    month: "long", 
    day: "numeric"
  }
  return jsDate.toLocaleDateString("es-ES", options)
}

export default function DiaryPage() {
  const [entries, setEntries] = useState<DiaryEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [newEntry, setNewEntry] = useState({
    title: "",
    content: "",
    image: "",
  })
  const [open, setOpen] = useState(false)
  const [editingEntry, setEditingEntry] = useState<DiaryEntry | null>(null)

  useEffect(() => {
    // Configurar el listener de Firestore
    const diaryRef = collection(db, "diario")
    const q = query(diaryRef, orderBy("date", "desc"))

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const updatedEntries = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as DiaryEntry[]
      
      setEntries(updatedEntries)
      setLoading(false)
    })

    // Limpiar el listener cuando el componente se desmonte
    return () => unsubscribe()
  }, [])

  const handleAddEntry = async () => {
    if (newEntry.title && newEntry.content) {
      try {
        if (editingEntry) {
          // Actualizar entrada existente
          const entryRef = doc(db, "diario", editingEntry.id)
          await updateDoc(entryRef, {
            title: newEntry.title,
            content: newEntry.content,
            image: newEntry.image || "/placeholder.svg?height=300&width=500",
          })
        } else {
          // Añadir nueva entrada
          const diaryRef = collection(db, "diario")
          await addDoc(diaryRef, {
            date: Timestamp.now(),
            title: newEntry.title,
            content: newEntry.content,
            image: newEntry.image || "/placeholder.svg?height=300&width=500",
          })
        }

        handleCloseDialog()
      } catch (error) {
        console.error("Error al guardar la entrada:", error)
      }
    }
  }

  const handleEdit = (entry: DiaryEntry) => {
    setEditingEntry(entry)
    setNewEntry({
      title: entry.title,
      content: entry.content,
      image: entry.image || "",
    })
    setOpen(true)
  }

  const handleDelete = async (entry: DiaryEntry) => {
    try {
      await deleteDoc(doc(db, "diario", entry.id))
    } catch (error) {
      console.error("Error al eliminar la entrada:", error)
    }
  }

  const handleCloseDialog = () => {
    setNewEntry({
      title: "",
      content: "",
      image: "",
    })
    setEditingEntry(null)
    setOpen(false)
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
        <Dialog open={open} onOpenChange={(isOpen) => isOpen ? setOpen(true) : handleCloseDialog()}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Nueva entrada
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingEntry ? "Editar entrada" : "Añadir nueva entrada"}</DialogTitle>
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
              <Button onClick={handleAddEntry}>
                {editingEntry ? "Guardar cambios" : "Guardar entrada"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500"></div>
        </div>
      ) : (
        <ScrollArea className="h-[calc(100vh-300px)]">
          <div className="space-y-6">
            {entries.map((entry) => (
              <DiaryEntry 
                key={entry.id} 
                entry={entry} 
                onEdit={() => handleEdit(entry)}
                onDelete={() => handleDelete(entry)}
              />
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  )
}

interface DiaryEntryProps {
  entry: DiaryEntry;
  onEdit: () => void;
  onDelete: () => void;
}

function DiaryEntry({ entry, onEdit, onDelete }: DiaryEntryProps) {
  const [imageDialogOpen, setImageDialogOpen] = useState(false);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>{entry.title}</CardTitle>
            <CardDescription className="mt-1">
              {formatDate(entry.date)}
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="icon" onClick={onEdit}>
              <Edit className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      {entry.image && (
        <>
          <div className="px-6">
            <div 
              className="h-48 rounded-md overflow-hidden cursor-pointer hover:opacity-90 transition-opacity"
              onClick={() => setImageDialogOpen(true)}
            >
              <img 
                src={entry.image} 
                alt={entry.title} 
                className="w-full h-full object-cover" 
              />
            </div>
          </div>
          <Dialog open={imageDialogOpen} onOpenChange={setImageDialogOpen}>
            <DialogContent className="max-w-3xl">
              <DialogHeader>
                <DialogTitle>{entry.title}</DialogTitle>
                <DialogDescription>
                  {formatDate(entry.date)}
                </DialogDescription>
              </DialogHeader>
              <div className="relative w-full">
                <img
                  src={entry.image}
                  alt={entry.title}
                  className="w-full rounded-lg"
                />
              </div>
            </DialogContent>
          </Dialog>
        </>
      )}
      <CardContent>
        <p className="text-gray-700 dark:text-gray-300 whitespace-pre-line">{entry.content}</p>
      </CardContent>
    </Card>
  )
}
