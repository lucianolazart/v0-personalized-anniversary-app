"use client"

import { useState, useEffect } from "react"
import { ListTodo, Plus, Calendar, Tag } from "lucide-react"
import { collection, addDoc, query, onSnapshot, orderBy, doc, updateDoc, deleteDoc, Timestamp } from "firebase/firestore"
import { db } from "../lib/firebase"
import type { Plan, NewPlanFormState } from "../types/plans"

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { cn } from "@/lib/utils"

const categoryEmojis: Record<Plan["category"], string> = {
  gastronomia: "🍽️",
  aire_libre: "🌳",
  entretenimiento: "🎮",
  educativo: "📚",
  otros: "✨"
}

const categoryNames: Record<Plan["category"], string> = {
  gastronomia: "Gastronomía",
  aire_libre: "Aire Libre",
  entretenimiento: "Entretenimiento",
  educativo: "Educativo",
  otros: "Otros"
}

export default function PlansPage() {
  const [plans, setPlans] = useState<Plan[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null)
  const [categoryFilter, setCategoryFilter] = useState<Plan["category"] | "todas">("todas")
  const [showCompleted, setShowCompleted] = useState(false)

  const initialFormState: NewPlanFormState = {
    title: "",
    description: "",
    date: "",
    category: "entretenimiento",
  }
  const [newPlan, setNewPlan] = useState<NewPlanFormState>(initialFormState)

  useEffect(() => {
    const plansRef = collection(db, "planes")
    const q = query(plansRef, orderBy("date", "asc"))

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const updatedPlans = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        date: doc.data().date?.toDate(),
      })) as Plan[]
      
      setPlans(updatedPlans)
      setLoading(false)
    })

    return () => unsubscribe()
  }, [])

  const handleAddPlan = async () => {
    if (newPlan.title) {
      try {
        if (editingPlan) {
          const planRef = doc(db, "planes", editingPlan.id)
          await updateDoc(planRef, {
            title: newPlan.title,
            description: newPlan.description,
            date: newPlan.date ? new Date(newPlan.date) : null,
            category: newPlan.category,
          })
        } else {
          const plansRef = collection(db, "planes")
          await addDoc(plansRef, {
            title: newPlan.title,
            description: newPlan.description,
            date: newPlan.date ? new Date(newPlan.date) : null,
            completed: false,
            category: newPlan.category,
          })
        }

        handleCloseDialog()
      } catch (error) {
        console.error("Error al guardar el plan:", error)
      }
    }
  }

  const handleToggleComplete = async (plan: Plan) => {
    try {
      const planRef = doc(db, "planes", plan.id)
      await updateDoc(planRef, {
        completed: !plan.completed
      })
    } catch (error) {
      console.error("Error al actualizar el estado del plan:", error)
    }
  }

  const handleDelete = async (plan: Plan) => {
    try {
      await deleteDoc(doc(db, "planes", plan.id))
    } catch (error) {
      console.error("Error al eliminar el plan:", error)
    }
  }

  const handleEdit = (plan: Plan) => {
    setEditingPlan(plan)
    setNewPlan({
      title: plan.title,
      description: plan.description || "",
      date: plan.date ? plan.date.toISOString().split('T')[0] : "",
      category: plan.category,
    })
    setOpen(true)
  }

  const handleOpenDialog = () => {
    setNewPlan(initialFormState)
    setEditingPlan(null)
    setOpen(true)
  }

  const handleCloseDialog = () => {
    setNewPlan(initialFormState)
    setEditingPlan(null)
    setOpen(false)
  }

  const getCategoryColor = (category: Plan["category"]) => {
    switch (category) {
      case "gastronomia":
        return "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400"
      case "aire_libre":
        return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
      case "entretenimiento":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400"
      case "educativo":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
      case "otros":
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400"
    }
  }

  const filteredPlans = plans.filter(plan => {
    const matchesCategory = categoryFilter === "todas" || plan.category === categoryFilter
    const matchesCompletion = showCompleted ? true : !plan.completed
    return matchesCategory && matchesCompletion
  })

  return (
    <div className="container mx-auto px-4 py-8">
      <header className="text-center mb-8">
        <div className="inline-flex items-center justify-center p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-full mb-4">
          <ListTodo className="h-6 w-6 text-emerald-500 dark:text-emerald-400" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Nuestros Planes</h1>
        <p className="text-gray-600 dark:text-gray-300 mt-2">Ideas y sueños por cumplir juntos</p>
      </header>

      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-6">
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          <Select value={categoryFilter} onValueChange={(value: Plan["category"] | "todas") => setCategoryFilter(value)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Categoría" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">✨ Todas</SelectItem>
              <SelectItem value="gastronomia">{categoryEmojis.gastronomia} {categoryNames.gastronomia}</SelectItem>
              <SelectItem value="aire_libre">{categoryEmojis.aire_libre} {categoryNames.aire_libre}</SelectItem>
              <SelectItem value="entretenimiento">{categoryEmojis.entretenimiento} {categoryNames.entretenimiento}</SelectItem>
              <SelectItem value="educativo">{categoryEmojis.educativo} {categoryNames.educativo}</SelectItem>
              <SelectItem value="otros">{categoryEmojis.otros} {categoryNames.otros}</SelectItem>
            </SelectContent>
          </Select>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="showCompleted"
              checked={showCompleted}
              onCheckedChange={(checked) => setShowCompleted(checked as boolean)}
            />
            <label
              htmlFor="showCompleted"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              Mostrar completados
            </label>
          </div>
        </div>

        <Dialog open={open} onOpenChange={(isOpen) => isOpen ? handleOpenDialog() : handleCloseDialog()}>
          <DialogTrigger asChild>
            <Button className="gap-2 w-full sm:w-auto">
              <Plus className="h-4 w-4" />
              Nuevo plan
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingPlan ? "Editar plan" : "Añadir nuevo plan"}
              </DialogTitle>
              <DialogDescription>
                {editingPlan ? "Modifica los detalles del plan" : "Añade un nuevo plan para hacer juntos"}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="title">Título</Label>
                <Input
                  id="title"
                  value={newPlan.title}
                  onChange={(e) => setNewPlan({ ...newPlan, title: e.target.value })}
                  placeholder="¿Qué plan tienes en mente?"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="description">Descripción (opcional)</Label>
                <Textarea
                  id="description"
                  value={newPlan.description}
                  onChange={(e) => setNewPlan({ ...newPlan, description: e.target.value })}
                  placeholder="Añade más detalles sobre el plan..."
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="date">Fecha (opcional)</Label>
                <Input
                  id="date"
                  type="date"
                  value={newPlan.date}
                  onChange={(e) => setNewPlan({ ...newPlan, date: e.target.value })}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="category">Categoría</Label>
                <Select value={newPlan.category} onValueChange={(value: Plan["category"]) => setNewPlan({ ...newPlan, category: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona categoría" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gastronomia">{categoryEmojis.gastronomia} {categoryNames.gastronomia}</SelectItem>
                    <SelectItem value="aire_libre">{categoryEmojis.aire_libre} {categoryNames.aire_libre}</SelectItem>
                    <SelectItem value="entretenimiento">{categoryEmojis.entretenimiento} {categoryNames.entretenimiento}</SelectItem>
                    <SelectItem value="educativo">{categoryEmojis.educativo} {categoryNames.educativo}</SelectItem>
                    <SelectItem value="otros">{categoryEmojis.otros} {categoryNames.otros}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleAddPlan}>
                {editingPlan ? "Guardar cambios" : "Guardar plan"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
        </div>
      ) : (
        <ScrollArea className="h-[calc(100vh-300px)]">
          <div className="space-y-4">
            {filteredPlans.length === 0 ? (
              <div className="text-center py-10 text-gray-500">
                <p>No hay planes que coincidan con los filtros seleccionados</p>
              </div>
            ) : (
              filteredPlans.map((plan) => (
                <Card
                  key={plan.id}
                  className={cn(
                    "transition-opacity",
                    plan.completed && "opacity-60"
                  )}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-2">
                        <Checkbox
                          checked={plan.completed}
                          onCheckedChange={() => handleToggleComplete(plan)}
                          className="mt-1"
                        />
                        <div>
                          <CardTitle className={cn(
                            "flex items-center gap-2",
                            plan.completed && "line-through"
                          )}>
                            <span className="text-xl">{categoryEmojis[plan.category]}</span>
                            {plan.title}
                          </CardTitle>
                          {plan.date && (
                            <CardDescription className="flex items-center gap-1 mt-1">
                              <Calendar className="h-3 w-3" />
                              {new Date(plan.date).toLocaleDateString("es-ES", {
                                year: "numeric",
                                month: "long",
                                day: "numeric"
                              })}
                            </CardDescription>
                          )}
                        </div>
                      </div>
                      <Badge variant="secondary" className={getCategoryColor(plan.category)}>
                        <Tag className="h-3 w-3 mr-1" />
                        {categoryNames[plan.category]}
                      </Badge>
                    </div>
                  </CardHeader>
                  {plan.description && (
                    <CardContent className="pb-3">
                      <p className="text-sm text-gray-600 dark:text-gray-300 whitespace-pre-line">
                        {plan.description}
                      </p>
                    </CardContent>
                  )}
                  <CardFooter className="flex justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(plan)}
                    >
                      Editar
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
                      onClick={() => handleDelete(plan)}
                    >
                      Eliminar
                    </Button>
                  </CardFooter>
                </Card>
              ))
            )}
          </div>
        </ScrollArea>
      )}
    </div>
  )
} 