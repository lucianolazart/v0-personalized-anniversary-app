"use client"

import { useMemo, useState, useEffect } from "react"
import { Plus, MoreVertical, Check, MapPin, Navigation } from "lucide-react"
import { collection, addDoc, onSnapshot, doc, updateDoc, deleteDoc, deleteField } from "firebase/firestore"
import { db } from "../lib/firebase"
import type { Plan, NewPlanFormState } from "../types/plans"
import { categoryNames, directionsUrl, groupActivePlans, isLink, planFromDoc } from "../lib/plans"
import { parseLocalDate, relativeDay, shortDateParts, toInputDate } from "../lib/dates"
import { CategoryIcon, categoryIcon } from "../components/CategoryIcon"
import { RemindersButton } from "../components/RemindersButton"

import { Button } from "@/components/ui/button"
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import { PageHeader, SectionLabel } from "@/components/page-header"
import { DateColumn } from "@/components/date-column"

const initialFormState: NewPlanFormState = {
  title: "",
  description: "",
  date: "",
  location: "",
  category: "entretenimiento",
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
  const [showAllOverdue, setShowAllOverdue] = useState(false)

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "planes"), (snapshot) => {
      setPlans(snapshot.docs.map((item) => planFromDoc(item.id, item.data())))
      setLoading(false)
    })

    return () => unsubscribe()
  }, [])

  const visiblePlans = useMemo(() => {
    return plans.filter((plan) => categoryFilter === "todas" || plan.category === categoryFilter)
  }, [plans, categoryFilter])

  const { overdue, highlight, thisWeek, later, ideas } = useMemo(
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
        location: newPlan.location?.trim() || null,
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
      const completed = !plan.completed
      await updateDoc(doc(db, "planes", plan.id), {
        completed,
        completedAt: completed ? new Date() : deleteField(),
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
      location: plan.location || "",
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

  // "/plans?nuevo=1" (icon shortcut, calendar link) opens the new-plan form right away.
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("nuevo") === "1") {
      setNewPlan(initialFormState)
      setEditingPlan(null)
      setOpen(true)
      window.history.replaceState(null, "", window.location.pathname)
    }
  }, [])

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

  const filterOptions: Array<{ value: Plan["category"] | "todas"; label: string }> = [
    { value: "todas", label: "Todos" },
    { value: "gastronomia", label: categoryNames.gastronomia },
    { value: "aire_libre", label: categoryNames.aire_libre },
    { value: "entretenimiento", label: categoryNames.entretenimiento },
    { value: "educativo", label: categoryNames.educativo },
    { value: "otros", label: categoryNames.otros },
  ]

  const rowHandlers = {
    onEdit: handleEdit,
    onDelete: handleDelete,
    onSchedule: openSchedule,
    onClearDate: handleClearDate,
    onToggleComplete: handleToggleComplete,
  }

  const visibleOverdue = showAllOverdue ? overdue : overdue.slice(0, 3)

  return (
    <div className="min-h-screen bg-background text-foreground">
      <PageHeader
        title="Planes"
        actions={
          <RemindersButton
            heading="📅 Recordatorios de planes"
            grantedText="Te avisamos el día antes y el mismo día de cada plan con fecha."
            defaultText="Activá las notificaciones para recibir un aviso 📅 el día antes y el mismo día."
          />
        }
      />

      <div className="px-5 max-w-xl mx-auto">
        <div role="tablist" aria-label="Estado" className="mt-3 flex gap-6 border-b border-border">
          {[
            { value: false, label: "Pendientes" },
            { value: true, label: "Hechos" },
          ].map((tab) => (
            <button
              key={tab.label}
              type="button"
              role="tab"
              aria-selected={showCompleted === tab.value}
              onClick={() => setShowCompleted(tab.value)}
              className={cn(
                "-mb-px h-10 border-b-2 text-[15px] transition-colors",
                showCompleted === tab.value
                  ? "border-primary font-semibold text-foreground"
                  : "border-transparent font-medium text-muted-foreground hover:text-foreground"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex gap-1.5 overflow-x-auto scrollbar-hide py-3 -mx-5 px-5">
          {filterOptions.map((option) => {
            const active = categoryFilter === option.value
            const Icon = option.value === "todas" ? null : categoryIcon(option.value)
            return (
              <button
                key={option.value}
                type="button"
                aria-pressed={active}
                onClick={() => setCategoryFilter(option.value)}
                className={cn(
                  "h-8 shrink-0 whitespace-nowrap rounded-lg border px-3 text-[13px] transition-colors inline-flex items-center gap-1.5",
                  active
                    ? "border-primary/30 bg-accent font-semibold text-accent-foreground"
                    : "border-border bg-card font-medium text-foreground hover:bg-muted"
                )}
              >
                {Icon && <Icon className="h-3.5 w-3.5" strokeWidth={1.75} />}
                {option.label}
              </button>
            )
          })}
        </div>
      </div>

      <Dialog open={open} onOpenChange={(isOpen) => (isOpen ? handleOpenDialog() : handleCloseDialog())}>
        <DialogTrigger asChild>
          <button
            type="button"
            aria-label="Nuevo plan"
            className="fixed bottom-24 right-5 z-50 h-[52px] w-[52px] rounded-[14px] bg-foreground text-background flex items-center justify-center shadow-lg active:scale-95 transition-transform"
          >
            <Plus className="h-6 w-6" />
          </button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold tracking-tight">
              {editingPlan ? "Editar plan" : "Nuevo plan"}
            </DialogTitle>
            <DialogDescription>
              {editingPlan
                ? "Cambiá los datos del plan."
                : "Ponele fecha para agendarlo, o dejala vacía y queda como idea."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-5 py-4">
            <div className="grid gap-2">
              <Label htmlFor="title">Título</Label>
              <Input
                id="title"
                value={newPlan.title}
                onChange={(e) => setNewPlan({ ...newPlan, title: e.target.value })}
                placeholder="¿Qué quieren hacer?"
                className="h-11"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description">Descripción (opcional)</Label>
              <Textarea
                id="description"
                value={newPlan.description}
                onChange={(e) => setNewPlan({ ...newPlan, description: e.target.value })}
                placeholder="Más detalles..."
                className="min-h-[100px]"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="location">Lugar (opcional)</Label>
              <Input
                id="location"
                value={newPlan.location}
                onChange={(e) => setNewPlan({ ...newPlan, location: e.target.value })}
                placeholder="Dirección o link de Google Maps"
                className="h-11"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="date">Fecha (opcional)</Label>
              <Input
                id="date"
                type="date"
                className="h-11"
                value={newPlan.date}
                onChange={(e) => setNewPlan({ ...newPlan, date: e.target.value })}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="category">Categoría</Label>
              <Select
                value={newPlan.category}
                onValueChange={(value: Plan["category"]) => setNewPlan({ ...newPlan, category: value })}
              >
                <SelectTrigger className="h-11">
                  <SelectValue placeholder="Elegí una categoría" />
                </SelectTrigger>
                <SelectContent>
                  {filterOptions
                    .filter((option) => option.value !== "todas")
                    .map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleAddPlan}>{editingPlan ? "Guardar cambios" : "Guardar plan"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <main className="px-5 pb-28 max-w-xl mx-auto">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-7 w-7 border-2 border-muted border-t-primary" />
          </div>
        ) : showCompleted ? (
          <section className="mt-2">
            <SectionLabel count={completedPlans.length}>Hechos</SectionLabel>
            {completedPlans.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">Todavía no hay planes hechos</p>
            ) : (
              completedPlans.map((plan) => <PlanRow key={plan.id} plan={plan} {...rowHandlers} />)
            )}
          </section>
        ) : (
          <div className="space-y-7 mt-2">
            {overdue.length > 0 && (
              <section className="rounded-2xl bg-accent px-4 pt-3.5 pb-2">
                <div className="flex items-center justify-between gap-3 pb-1">
                  <p className="label-mono font-semibold text-primary">¿Lo hicieron? · {overdue.length}</p>
                  {overdue.length > 3 && (
                    <button
                      type="button"
                      onClick={() => setShowAllOverdue(!showAllOverdue)}
                      className="h-8 text-[13px] font-medium text-accent-foreground"
                    >
                      {showAllOverdue ? "Ver menos" : `Ver ${overdue.length - 3} más`}
                    </button>
                  )}
                </div>
                <p className="text-[13px] text-accent-foreground/80 pb-1">Estos planes ya pasaron y siguen pendientes.</p>
                {visibleOverdue.map((plan, index) => (
                  <div key={plan.id} className={cn("py-3", index > 0 && "border-t border-primary/15")}>
                    <div className="flex gap-3.5">
                      <DateColumn date={plan.date} top="month" />
                      <div className="min-w-0 flex-1">
                        <p className="text-[15px] font-semibold leading-snug">{plan.title}</p>
                        <p className="mt-0.5 text-[13px] text-muted-foreground">
                          {plan.date ? capitalize(plan.date.toLocaleDateString("es-AR", { weekday: "long" })) : ""} ·{" "}
                          {categoryNames[plan.category]}
                        </p>
                      </div>
                    </div>
                    <div className="mt-2.5 grid grid-cols-3 gap-1.5">
                      <Button size="sm" className="h-9 rounded-lg px-2" onClick={() => handleToggleComplete(plan)}>
                        <Check className="h-3.5 w-3.5 mr-1" />
                        Hecho
                      </Button>
                      <Button size="sm" variant="outline" className="h-9 rounded-lg px-2 bg-card" onClick={() => openSchedule(plan)}>
                        Reprogramar
                      </Button>
                      <Button size="sm" variant="outline" className="h-9 rounded-lg px-2 bg-card" onClick={() => handleClearDate(plan)}>
                        A ideas
                      </Button>
                    </div>
                  </div>
                ))}
              </section>
            )}

            <section>
              {highlight ? (
                <div className="rounded-[14px] border border-border bg-card p-4">
                  <div className="flex items-start justify-between gap-2">
                    <p className="pt-0.5 font-mono text-[11px] font-semibold uppercase tracking-[0.06em] text-primary">
                      {highlight.date
                        ? `${shortDateParts(highlight.date).weekday} ${shortDateParts(highlight.date).day} ${shortDateParts(highlight.date).month} · ${relativeDay(highlight.date)}`
                        : "Próximo"}
                    </p>
                    <PlanMenu plan={highlight} {...rowHandlers} />
                  </div>
                  <div className="mt-1.5 flex items-start gap-3">
                    <CategoryIcon category={highlight.category} />
                    <div className="min-w-0 flex-1">
                      <h2 className="text-[22px] font-semibold leading-tight tracking-[-0.03em]">{highlight.title}</h2>
                      <p className="mt-0.5 text-[13px] text-muted-foreground">{categoryNames[highlight.category]}</p>
                    </div>
                  </div>
                  {highlight.location && <PlanLocation location={highlight.location} />}
                  {highlight.description && (
                    <p className="mt-2 text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                      {highlight.description}
                    </p>
                  )}
                  <Button
                    className="mt-4 h-11 w-full rounded-[10px] bg-foreground text-background hover:bg-foreground/90"
                    onClick={() => handleToggleComplete(highlight)}
                  >
                    <Check className="h-4 w-4 mr-2" />
                    Marcar como hecho
                  </Button>
                </div>
              ) : (
                <div className="rounded-[14px] border border-dashed border-border px-4 py-8 text-center">
                  <p className="text-lg font-semibold mb-1">Nada agendado</p>
                  <p className="text-sm text-muted-foreground">Ponele fecha a una idea o agregá un plan nuevo.</p>
                </div>
              )}
            </section>

            <PlanSection title="Esta semana" empty="No hay otros planes esta semana." items={thisWeek} hideWhenEmpty {...rowHandlers} />
            <PlanSection title="Más adelante" empty="Nada más adelante." items={later} hideWhenEmpty {...rowHandlers} />
            <PlanSection title="Ideas" empty="Planes sin fecha para algún día." items={ideas} hideWhenEmpty={false} {...rowHandlers} />
          </div>
        )}
      </main>

      <Dialog open={Boolean(schedulingId)} onOpenChange={(isOpen) => !isOpen && setSchedulingId(null)}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="font-semibold tracking-tight">Agendar</DialogTitle>
            <DialogDescription>Elegí una fecha para pasarlo al calendario.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-2 py-2">
            <Label htmlFor="schedule-date">Fecha</Label>
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
              Guardar fecha
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function capitalize(text: string) {
  return text.charAt(0).toUpperCase() + text.slice(1)
}

type RowHandlers = {
  onEdit: (plan: Plan) => void
  onDelete: (plan: Plan) => void
  onSchedule: (plan: Plan) => void
  onClearDate: (plan: Plan) => void
  onToggleComplete: (plan: Plan) => void
}

function PlanSection({
  title,
  empty,
  items,
  hideWhenEmpty,
  ...handlers
}: {
  title: string
  empty: string
  items: Plan[]
  hideWhenEmpty: boolean
} & RowHandlers) {
  if (hideWhenEmpty && items.length === 0) return null

  return (
    <section>
      <SectionLabel count={items.length}>{title}</SectionLabel>
      {items.length === 0 ? (
        <p className="py-3.5 text-sm text-muted-foreground border-b border-border">{empty}</p>
      ) : (
        items.map((plan) => <PlanRow key={plan.id} plan={plan} {...handlers} />)
      )}
    </section>
  )
}

function PlanLocation({ location }: { location: string }) {
  const link = isLink(location)
  return (
    <div className="mt-2 flex items-center justify-between gap-3 text-[13px]">
      <span className="flex min-w-0 items-center gap-1.5 text-muted-foreground">
        <MapPin className="h-3.5 w-3.5 shrink-0" />
        <span className="truncate">{link ? "Ubicación en Maps" : location}</span>
      </span>
      <a
        href={directionsUrl(location)}
        target="_blank"
        rel="noopener noreferrer"
        className="shrink-0 inline-flex items-center gap-1 font-semibold text-primary hover:underline"
      >
        <Navigation className="h-3.5 w-3.5" />
        Cómo llegar
      </a>
    </div>
  )
}

function PlanMenu({ plan, onEdit, onDelete, onSchedule, onClearDate, onToggleComplete }: { plan: Plan } & RowHandlers) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          aria-label={`Opciones de ${plan.title}`}
          className="-mr-1.5 -mt-1 h-8 w-8 shrink-0 p-0 text-muted-foreground hover:text-foreground"
        >
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuItem onClick={() => onEdit(plan)}>Editar</DropdownMenuItem>
        {!plan.completed && (
          <DropdownMenuItem onClick={() => onSchedule(plan)}>{plan.date ? "Cambiar fecha" : "Agendar"}</DropdownMenuItem>
        )}
        {plan.date && !plan.completed && (
          <DropdownMenuItem onClick={() => onClearDate(plan)}>Pasar a ideas</DropdownMenuItem>
        )}
        <DropdownMenuItem onClick={() => onToggleComplete(plan)}>
          {plan.completed ? "Volver a pendientes" : "Marcar como hecho"}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onDelete(plan)} className="text-destructive focus:text-destructive">
          Borrar
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function PlanRow({ plan, ...handlers }: { plan: Plan } & RowHandlers) {
  return (
    <div className="flex items-start gap-3.5 py-3 border-b border-border">
      {plan.date ? <DateColumn date={plan.date} top={plan.completed ? "month" : "weekday"} /> : <CategoryIcon category={plan.category} />}
      <div className="min-w-0 flex-1">
        <p
          className={cn(
            "text-[15px] font-semibold leading-snug",
            plan.completed && "line-through text-muted-foreground"
          )}
        >
          {plan.title}
        </p>
        <p className="mt-0.5 text-[13px] text-muted-foreground">
          {categoryNames[plan.category]}
          {plan.date && !plan.completed ? ` · ${relativeDay(plan.date)}` : ""}
        </p>
        {plan.location && <PlanLocation location={plan.location} />}
        {plan.description && (
          <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed whitespace-pre-line break-words">
            {plan.description}
          </p>
        )}
      </div>
      <PlanMenu plan={plan} {...handlers} />
    </div>
  )
}
