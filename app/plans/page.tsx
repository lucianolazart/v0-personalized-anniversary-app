"use client"

import { useMemo, useState, useEffect } from "react"
import { Plus, Calendar, MoreVertical, Check } from "lucide-react"
import { collection, addDoc, onSnapshot, doc, updateDoc, deleteDoc } from "firebase/firestore"
import { db } from "../lib/firebase"
import type { Plan, NewPlanFormState } from "../types/plans"
import { categoryEmojis, categoryNames, groupActivePlans } from "../lib/plans"
import { formatDisplayDate, parseLocalDate, toInputDate } from "../lib/dates"

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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import { ThemeToggle } from "@/components/theme-toggle"
import { MovieNightPushPrompt } from "../components/MovieNightPushPrompt"

const initialFormState: NewPlanFormState = {
  title: "",
  description: "",
  date: "",
  category: "entretenimiento",
}

function toFirestoreDate(value?: Date | { toDate?: () => Date } | null) {
  if (!value) return undefined
  if (value instanceof Date) return value
  if (typeof value.toDate === "function") return value.toDate()
  return undefined
}

export default function PlansPage() {
  const [plans, setPlans] = useState<Plan[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null)
  const [categoryFilter, setCategoryFilter] = useState<Plan["category"] | "todas">("todas")
  const [showCompleted, setShowCompleted] = useState(false)
  const [newPlan, setNewPlan] = useState<NewPlanFormState>(initialFormState)
  const [schedulingId, setSchedulingId] = useState<string | null>(null)
  const [scheduleDate, setScheduleDate] = useState("")

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "planes"), (snapshot) => {
      const updatedPlans = snapshot.docs.map((item) => {
        const data = item.data()
        return {
          id: item.id,
          ...data,
          date: toFirestoreDate(data.date),
        } as Plan
      })

      setPlans(updatedPlans)
      setLoading(false)
    })

    return () => unsubscribe()
  }, [])

  const visiblePlans = useMemo(() => {
    return plans.filter((plan) => categoryFilter === "todas" || plan.category === categoryFilter)
  }, [plans, categoryFilter])

  const { highlight, thisWeek, later, ideas } = useMemo(
    () => groupActivePlans(visiblePlans),
    [visiblePlans]
  )

  const completedPlans = useMemo(() => {
    return visiblePlans
      .filter((plan) => plan.completed)
      .sort((a, b) => (b.date?.getTime() ?? 0) - (a.date?.getTime() ?? 0))
  }, [visiblePlans])

  const handleAddPlan = async () => {
    if (!newPlan.title) return
    try {
      const payload = {
        title: newPlan.title,
        description: newPlan.description,
        date: newPlan.date ? parseLocalDate(newPlan.date) : null,
        category: newPlan.category,
      }

      if (editingPlan) {
        await updateDoc(doc(db, "planes", editingPlan.id), payload)
      } else {
        await addDoc(collection(db, "planes"), {
          ...payload,
          completed: false,
        })
      }

      handleCloseDialog()
    } catch (error) {
      console.error("Error saving plan:", error)
    }
  }

  const handleToggleComplete = async (plan: Plan) => {
    try {
      await updateDoc(doc(db, "planes", plan.id), {
        completed: !plan.completed,
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
      date: plan.date ? toInputDate(plan.date) : "",
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

  const openSchedule = (plan: Plan) => {
    setSchedulingId(plan.id)
    setScheduleDate(plan.date ? toInputDate(plan.date) : "")
  }

  const handleSchedule = async () => {
    if (!schedulingId || !scheduleDate) return
    try {
      await updateDoc(doc(db, "planes", schedulingId), {
        date: parseLocalDate(scheduleDate),
      })
      setSchedulingId(null)
      setScheduleDate("")
    } catch (error) {
      console.error("Error scheduling plan:", error)
    }
  }

  const handleClearDate = async (plan: Plan) => {
    try {
      await updateDoc(doc(db, "planes", plan.id), {
        date: null,
      })
    } catch (error) {
      console.error("Error moving plan to ideas:", error)
    }
  }

  const filterOptions: Array<{ value: Plan["category"] | "todas"; label: string; emoji?: string }> = [
    { value: "todas", label: "All Plans", emoji: "✨" },
    { value: "gastronomia", label: categoryNames.gastronomia, emoji: categoryEmojis.gastronomia },
    { value: "aire_libre", label: categoryNames.aire_libre, emoji: categoryEmojis.aire_libre },
    { value: "entretenimiento", label: categoryNames.entretenimiento, emoji: categoryEmojis.entretenimiento },
    { value: "educativo", label: categoryNames.educativo, emoji: categoryEmojis.educativo },
    { value: "otros", label: categoryNames.otros, emoji: categoryEmojis.otros },
  ]

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        <header className="mb-6 flex items-start justify-between gap-3">
          <h1 className="text-3xl font-serif font-medium text-foreground tracking-tight">
            Plans
          </h1>
          <ThemeToggle />
        </header>

        <div className="mb-6 space-y-2">
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide -mx-4 px-4">
            {filterOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => setCategoryFilter(option.value)}
                className={cn(
                  "px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors border",
                  categoryFilter === option.value
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-card text-muted-foreground border-border hover:text-foreground"
                )}
              >
                {option.emoji && <span className="mr-1.5">{option.emoji}</span>}
                {option.label}
              </button>
            ))}
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide -mx-4 px-4">
            <button
              onClick={() => setShowCompleted(false)}
              className={cn(
                "px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors border",
                !showCompleted
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card text-muted-foreground border-border hover:text-foreground"
              )}
            >
              Active
            </button>
            <button
              onClick={() => setShowCompleted(true)}
              className={cn(
                "px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors border",
                showCompleted
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card text-muted-foreground border-border hover:text-foreground"
              )}
            >
              Completed
            </button>
          </div>
        </div>

        <div className="mb-6">
          <MovieNightPushPrompt
            heading="📅 Plan reminders"
            grantedText="You will get a ping the day before and the day of a scheduled plan."
            defaultText="Allow notifications to get a 📅 alert the day before and the same day."
          />
        </div>

        <Dialog open={open} onOpenChange={(isOpen) => isOpen ? handleOpenDialog() : handleCloseDialog()}>
          <DialogTrigger asChild>
            <Button
              className="w-full mb-6"
              size="lg"
            >
              <Plus className="h-5 w-5 mr-2" />
              New Plan
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle className="text-xl font-serif font-medium">
                {editingPlan ? "Edit Plan" : "Add New Plan"}
              </DialogTitle>
              <DialogDescription>
                {editingPlan ? "Modify the plan details" : "Add a date to schedule it, or leave it empty as an idea."}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-5 py-4">
              <div className="grid gap-2">
                <Label htmlFor="title">
                  Title
                </Label>
                <Input
                  id="title"
                  value={newPlan.title}
                  onChange={(e) => setNewPlan({ ...newPlan, title: e.target.value })}
                  placeholder="Enter plan title"
                  className="h-11"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="description">
                  Description (optional)
                </Label>
                <Textarea
                  id="description"
                  value={newPlan.description}
                  onChange={(e) => setNewPlan({ ...newPlan, description: e.target.value })}
                  placeholder="Add more details..."
                  className="min-h-[100px]"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="date">
                  Date (optional)
                </Label>
                <Input
                  id="date"
                  type="date"
                  className="h-11"
                  value={newPlan.date}
                  onChange={(e) => setNewPlan({ ...newPlan, date: e.target.value })}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="category">
                  Category
                </Label>
                <Select value={newPlan.category} onValueChange={(value: Plan["category"]) => setNewPlan({ ...newPlan, category: value })}>
                  <SelectTrigger className="h-11">
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
              <Button onClick={handleAddPlan}>
                {editingPlan ? "Save Changes" : "Save Plan"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-muted border-t-primary" />
        </div>
      ) : showCompleted ? (
        <div className="space-y-2 px-4 pb-24 max-w-4xl mx-auto">
          {completedPlans.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-muted-foreground text-sm">
                No completed plans yet
              </p>
            </div>
          ) : (
            completedPlans.map((plan) => (
              <PlanRow
                key={plan.id}
                plan={plan}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onSchedule={openSchedule}
                onClearDate={handleClearDate}
                onToggleComplete={handleToggleComplete}
              />
            ))
          )}
        </div>
      ) : (
        <div className="space-y-8 px-4 pb-24 max-w-4xl mx-auto">
          <section>
            {highlight ? (
              <div className="rounded-lg border border-border bg-card overflow-hidden">
                <div className="p-5 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-primary font-medium pt-1">
                      Next up
                    </p>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-muted-foreground">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-44">
                        <DropdownMenuItem onClick={() => handleEdit(highlight)}>
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => openSchedule(highlight)}>
                          Edit date
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleClearDate(highlight)}>
                          Move to ideas
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleDelete(highlight)}
                          className="text-destructive focus:text-destructive"
                        >
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <h2 className="text-2xl font-serif font-medium leading-tight flex items-center gap-2">
                    <span>{categoryEmojis[highlight.category]}</span>
                    <span>{highlight.title}</span>
                  </h2>
                  <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5" />
                    {highlight.date ? formatDisplayDate(highlight.date) : ""}
                    <span>· {categoryNames[highlight.category]}</span>
                  </p>
                  {highlight.description && (
                    <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                      {highlight.description}
                    </p>
                  )}
                  <Button className="w-full" onClick={() => handleToggleComplete(highlight)}>
                    <Check className="h-4 w-4 mr-2" />
                    Mark as done
                  </Button>
                </div>
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-border bg-card/50 px-4 py-10 text-center">
                <p className="font-serif text-xl mb-1">Nothing scheduled</p>
                <p className="text-sm text-muted-foreground">
                  Give an idea a date, or add a new plan.
                </p>
              </div>
            )}
          </section>

          <PlanSection
            title="This week"
            empty="No other plans this week."
            items={thisWeek}
            hideWhenEmpty
            onEdit={handleEdit}
            onDelete={handleDelete}
            onSchedule={openSchedule}
            onClearDate={handleClearDate}
            onToggleComplete={handleToggleComplete}
          />

          <PlanSection
            title="Later"
            empty="Nothing further out."
            items={later}
            hideWhenEmpty
            onEdit={handleEdit}
            onDelete={handleDelete}
            onSchedule={openSchedule}
            onClearDate={handleClearDate}
            onToggleComplete={handleToggleComplete}
          />

          <PlanSection
            title="Ideas"
            empty="Bucket-list plans without a date."
            items={ideas}
            hideWhenEmpty={false}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onSchedule={openSchedule}
            onClearDate={handleClearDate}
            onToggleComplete={handleToggleComplete}
          />
        </div>
      )}

      <Dialog open={Boolean(schedulingId)} onOpenChange={(isOpen) => !isOpen && setSchedulingId(null)}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="font-serif">Schedule</DialogTitle>
            <DialogDescription>
              Pick a date to move this idea onto the calendar.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2 py-2">
            <Label htmlFor="schedule-date">Date</Label>
            <Input
              id="schedule-date"
              type="date"
              className="h-11"
              value={scheduleDate}
              onChange={(e) => setScheduleDate(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button onClick={handleSchedule} disabled={!scheduleDate}>
              Save date
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function PlanSection({
  title,
  empty,
  items,
  hideWhenEmpty,
  onEdit,
  onDelete,
  onSchedule,
  onClearDate,
  onToggleComplete,
}: {
  title: string
  empty: string
  items: Plan[]
  hideWhenEmpty: boolean
  onEdit: (plan: Plan) => void
  onDelete: (plan: Plan) => void
  onSchedule: (plan: Plan) => void
  onClearDate: (plan: Plan) => void
  onToggleComplete: (plan: Plan) => void
}) {
  if (hideWhenEmpty && items.length === 0) return null

  return (
    <section className="space-y-3">
      <h3 className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground font-medium">
        {title}
      </h3>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">{empty}</p>
      ) : (
        <div className="space-y-2">
          {items.map((plan) => (
            <PlanRow
              key={plan.id}
              plan={plan}
              onEdit={onEdit}
              onDelete={onDelete}
              onSchedule={onSchedule}
              onClearDate={onClearDate}
              onToggleComplete={onToggleComplete}
            />
          ))}
        </div>
      )}
    </section>
  )
}

function PlanRow({
  plan,
  onEdit,
  onDelete,
  onSchedule,
  onClearDate,
  onToggleComplete,
}: {
  plan: Plan
  onEdit: (plan: Plan) => void
  onDelete: (plan: Plan) => void
  onSchedule: (plan: Plan) => void
  onClearDate: (plan: Plan) => void
  onToggleComplete: (plan: Plan) => void
}) {
  return (
    <Card
      className={cn(
        "border border-border shadow-none bg-card",
        plan.completed && "opacity-60"
      )}
    >
      <CardHeader className="p-4">
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-1">
              <CardTitle className={cn(
                "text-base font-serif font-medium text-foreground leading-tight flex items-center gap-2",
                plan.completed && "line-through text-muted-foreground"
              )}>
                <span>{categoryEmojis[plan.category]}</span>
                <span>{plan.title}</span>
              </CardTitle>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                  >
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-40">
                  <DropdownMenuItem onClick={() => onEdit(plan)}>
                    Edit
                  </DropdownMenuItem>
                  {!plan.completed && (
                    <DropdownMenuItem onClick={() => onSchedule(plan)}>
                      {plan.date ? "Edit date" : "Schedule"}
                    </DropdownMenuItem>
                  )}
                  {plan.date && !plan.completed && (
                    <DropdownMenuItem onClick={() => onClearDate(plan)}>
                      Move to ideas
                    </DropdownMenuItem>
                  )}
                  {!plan.completed && (
                    <DropdownMenuItem onClick={() => onToggleComplete(plan)}>
                      Mark as done
                    </DropdownMenuItem>
                  )}
                  {plan.completed && (
                    <DropdownMenuItem onClick={() => onToggleComplete(plan)}>
                      Mark as active
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem
                    onClick={() => onDelete(plan)}
                    className="text-destructive focus:text-destructive"
                  >
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            {plan.date ? (
              <CardDescription className="flex items-center gap-1.5 mt-1.5 text-sm">
                <Calendar className="h-3.5 w-3.5" />
                <span>{formatDisplayDate(plan.date)}</span>
              </CardDescription>
            ) : (
              <CardDescription className="text-sm mt-1.5">
                No date set
              </CardDescription>
            )}
          </div>
        </div>
      </CardHeader>
      {plan.description && (
        <CardContent className="px-4 pb-4 pt-0">
          <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line break-words">
            {plan.description}
          </p>
        </CardContent>
      )}
    </Card>
  )
}
