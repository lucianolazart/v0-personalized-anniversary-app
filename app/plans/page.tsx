"use client"

import { useState, useEffect } from "react"
import { Plus, Calendar, MoreVertical, CheckCircle2 } from "lucide-react"
import { collection, addDoc, query, onSnapshot, orderBy, doc, updateDoc, deleteDoc } from "firebase/firestore"
import { db } from "../lib/firebase"
import type { Plan, NewPlanFormState } from "../types/plans"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
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
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

const categoryEmojis: Record<Plan["category"], string> = {
  gastronomia: "🍽️",
  aire_libre: "🌳",
  entretenimiento: "🎮",
  educativo: "📚",
  otros: "✨"
}

const categoryNames: Record<Plan["category"], string> = {
  gastronomia: "Dining",
  aire_libre: "Outdoor",
  entretenimiento: "Entertainment",
  educativo: "Educational",
  otros: "Other"
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
        console.error("Error saving plan:", error)
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
      console.error("Error updating plan status:", error)
    }
  }

  const handleDelete = async (plan: Plan) => {
    try {
      await deleteDoc(doc(db, "planes", plan.id))
    } catch (error) {
      console.error("Error deleting plan:", error)
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

  const filteredPlans = plans.filter(plan => {
    const matchesCategory = categoryFilter === "todas" || plan.category === categoryFilter
    const matchesCompletion = showCompleted ? true : !plan.completed
    return matchesCategory && matchesCompletion
  })

  const filterOptions: Array<{ value: Plan["category"] | "todas"; label: string; emoji?: string }> = [
    { value: "todas", label: "All Plans", emoji: "✨" },
    { value: "gastronomia", label: categoryNames.gastronomia, emoji: categoryEmojis.gastronomia },
    { value: "aire_libre", label: categoryNames.aire_libre, emoji: categoryEmojis.aire_libre },
    { value: "entretenimiento", label: categoryNames.entretenimiento, emoji: categoryEmojis.entretenimiento },
    { value: "educativo", label: categoryNames.educativo, emoji: categoryEmojis.educativo },
    { value: "otros", label: categoryNames.otros, emoji: categoryEmojis.otros },
  ]

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950">
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        {/* Header */}
        <header className="mb-6">
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white mb-1 tracking-tight">
            Plans
          </h1>
        </header>

        {/* Filter Buttons */}
        <div className="mb-6 space-y-3">
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4">
            {filterOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => setCategoryFilter(option.value)}
                className={cn(
                  "px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all",
                  "border",
                  categoryFilter === option.value
                    ? "bg-[#EA580C] text-white border-[#EA580C] shadow-sm"
                    : "bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800"
                )}
              >
                {option.emoji && <span className="mr-1.5">{option.emoji}</span>}
                {option.label}
              </button>
            ))}
          </div>

          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4">
            <button
              onClick={() => setShowCompleted(false)}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all",
                "border",
                !showCompleted
                  ? "bg-[#EA580C] text-white border-[#EA580C] shadow-sm"
                  : "bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800"
              )}
            >
              Active
            </button>
            <button
              onClick={() => setShowCompleted(true)}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all",
                "border",
                showCompleted
                  ? "bg-[#EA580C] text-white border-[#EA580C] shadow-sm"
                  : "bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800"
              )}
            >
              Completed
            </button>
          </div>
        </div>

        <Dialog open={open} onOpenChange={(isOpen) => isOpen ? handleOpenDialog() : handleCloseDialog()}>
          <DialogTrigger asChild>
            <Button 
              className="w-full mb-6 bg-[#EA580C] hover:bg-[#C2410C] text-white shadow-sm font-medium"
              size="lg"
            >
              <Plus className="h-5 w-5 mr-2" />
              New Plan
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle className="text-xl font-semibold">
                {editingPlan ? "Edit Plan" : "Add New Plan"}
              </DialogTitle>
              <DialogDescription className="text-gray-500 dark:text-gray-400">
                {editingPlan ? "Modify the plan details" : "Add a new plan to do together"}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-5 py-4">
              <div className="grid gap-2">
                <Label htmlFor="title" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Title
                </Label>
                <Input
                  id="title"
                  value={newPlan.title}
                  onChange={(e) => setNewPlan({ ...newPlan, title: e.target.value })}
                  placeholder="Enter plan title"
                  className="h-11 border-gray-200 dark:border-gray-800 focus:border-[#EA580C] focus:ring-[#EA580C]"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="description" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Description (optional)
                </Label>
                <Textarea
                  id="description"
                  value={newPlan.description}
                  onChange={(e) => setNewPlan({ ...newPlan, description: e.target.value })}
                  placeholder="Add more details..."
                  className="min-h-[100px] border-gray-200 dark:border-gray-800 focus:border-[#EA580C] focus:ring-[#EA580C]"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="date" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Date (optional)
                </Label>
                <Input
                  id="date"
                  type="date"
                  className="h-11 border-gray-200 dark:border-gray-800 focus:border-[#EA580C] focus:ring-[#EA580C]"
                  value={newPlan.date}
                  onChange={(e) => setNewPlan({ ...newPlan, date: e.target.value })}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="category" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Category
                </Label>
                <Select value={newPlan.category} onValueChange={(value: Plan["category"]) => setNewPlan({ ...newPlan, category: value })}>
                  <SelectTrigger className="h-11 border-gray-200 dark:border-gray-800 focus:border-[#EA580C] focus:ring-[#EA580C]">
                    <SelectValue placeholder="Select category" />
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
              <Button 
                onClick={handleAddPlan}
                className="bg-[#EA580C] hover:bg-[#C2410C] text-white font-medium"
              >
                {editingPlan ? "Save Changes" : "Save Plan"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#FED7AA] border-t-[#EA580C]"></div>
        </div>
      ) : (
        <div className="space-y-3 pb-24">
          {filteredPlans.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">
                No plans match the selected filters
              </p>
            </div>
          ) : (
            filteredPlans.map((plan) => (
              <Card
                key={plan.id}
                className={cn(
                  "border border-gray-200 dark:border-gray-800 shadow-sm hover:shadow-md transition-all",
                  "bg-white dark:bg-gray-900",
                  plan.completed && "opacity-60"
                )}
              >
                <CardHeader className="p-4">
                  <div className="flex items-start gap-3">
                    <Checkbox
                      checked={plan.completed}
                      onCheckedChange={() => handleToggleComplete(plan)}
                      className={cn(
                        "mt-0.5 h-5 w-5 rounded-md border-2",
                        plan.completed 
                          ? "bg-[#EA580C] border-[#EA580C] text-white" 
                          : "border-gray-300 dark:border-gray-700"
                      )}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <CardTitle className={cn(
                          "text-base font-semibold text-gray-900 dark:text-white leading-tight flex items-center gap-2",
                          plan.completed && "line-through text-gray-400 dark:text-gray-500"
                        )}>
                          <span>{categoryEmojis[plan.category]}</span>
                          <span>{plan.title}</span>
                        </CardTitle>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                            >
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-40">
                            <DropdownMenuItem onClick={() => handleEdit(plan)}>
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleDelete(plan)}
                              className="text-red-600 focus:text-red-600 dark:text-red-400"
                            >
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                      {plan.date && (
                        <CardDescription className="flex items-center gap-1.5 mt-1.5 text-sm text-gray-500 dark:text-gray-400">
                          <Calendar className="h-3.5 w-3.5" />
                          <span>
                            {(() => {
                              const date = new Date(plan.date)
                              const dateStr = date.toLocaleDateString("en-US", {
                                weekday: "long",
                                year: "numeric",
                                month: "long",
                                day: "numeric"
                              })
                              const timeStr = date.toLocaleTimeString("en-US", {
                                hour: "2-digit",
                                minute: "2-digit"
                              })
                              return timeStr !== "00:00" ? `${dateStr} • ${timeStr}` : dateStr
                            })()}
                          </span>
                        </CardDescription>
                      )}
                      {!plan.date && (
                        <CardDescription className="text-sm text-gray-400 dark:text-gray-500 mt-1.5">
                          No date set
                        </CardDescription>
                      )}
                      {plan.completed && (
                        <div className="flex items-center gap-1.5 mt-2">
                          <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                          <span className="text-xs font-medium text-green-600 dark:text-green-400">
                            Completed {plan.date && new Date(plan.date).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric"
                            })}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </CardHeader>
                {plan.description && (
                  <CardContent className="px-4 pb-4 pt-0">
                    <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed whitespace-pre-line break-words">
                      {plan.description}
                    </p>
                  </CardContent>
                )}
              </Card>
            ))
          )}
        </div>
      )}
    </div>
  )
} 