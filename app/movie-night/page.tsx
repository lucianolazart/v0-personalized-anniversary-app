"use client"

import { useEffect, useMemo, useState } from "react"
import { Check, ChevronDown, MoreVertical, Plus } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  updateDoc,
} from "firebase/firestore"
import { db } from "../lib/firebase"
import type { MediaWithId } from "../types/media"
import type { MovieNight, NewMovieNightFormState } from "../types/movie-night"
import {
  findOrCreateMovie,
  parseLocalDate,
  startOfToday,
  toInputDate,
} from "../lib/movie-night"
import { CoverPicker } from "../components/CoverPicker"
import { WatchProviders } from "../components/WatchProviders"
import { WatchedOnIcon, WatchedOnOptions } from "../components/WatchedOnPicker"
import { parseWatchedOn } from "../lib/watched-on"
import { relativeDay, shortDateParts } from "../lib/dates"
import type { WatchedOn } from "../types/media"
import { PageHeader, SectionLabel } from "@/components/page-header"
import { DateColumn } from "@/components/date-column"
import { RemindersButton } from "../components/RemindersButton"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

const initialForm: NewMovieNightFormState = {
  title: "",
  year: new Date().getFullYear(),
  image: "",
  date: "",
}

export default function MovieNightPage() {
  const [nights, setNights] = useState<MovieNight[]>([])
  const [catalog, setCatalog] = useState<MediaWithId[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<NewMovieNightFormState>(initialForm)
  const [schedulingId, setSchedulingId] = useState<string | null>(null)
  const [scheduleDate, setScheduleDate] = useState("")
  const [deletingNight, setDeletingNight] = useState<MovieNight | null>(null)
  const [watchingNight, setWatchingNight] = useState<MovieNight | null>(null)

  useEffect(() => {
    const nightsUnsub = onSnapshot(collection(db, "movieNights"), (snapshot) => {
      const next = snapshot.docs.map((item) => {
        const data = item.data()
        return {
          id: item.id,
          mediaId: data.mediaId,
          title: data.title,
          year: data.year,
          image: data.image,
          date: data.date?.toDate?.() ?? null,
          status: data.status,
          tmdbId: typeof data.tmdbId === "number" ? data.tmdbId : undefined,
          watchedOn: parseWatchedOn(data.watchedOn),
        } as MovieNight
      })
      setNights(next)
      setLoading(false)
    })

    const catalogUnsub = onSnapshot(collection(db, "peliculas"), (snapshot) => {
      const next = snapshot.docs.map((item) => {
        const data = item.data()
        return {
          id: item.id,
          title: data.title,
          year: data.year,
          image: data.image,
          state: data.state,
          type: data.type,
          tmdbId: typeof data.tmdbId === "number" ? data.tmdbId : undefined,
        } as MediaWithId
      })
      setCatalog(next)
    })

    return () => {
      nightsUnsub()
      catalogUnsub()
    }
  }, [])

  const { highlight, ideas, upcoming, history } = useMemo(() => {
    const today = startOfToday()
    const queued = nights.filter((night) => night.status === "queued")
    const scheduled = nights.filter((night) => night.status === "scheduled" && night.date)
    const watched = nights
      .filter((night) => night.status === "watched")
      .sort((a, b) => (b.date?.getTime() ?? 0) - (a.date?.getTime() ?? 0))

    const future = scheduled
      .filter((night) => night.date && night.date >= today)
      .sort((a, b) => (a.date?.getTime() ?? 0) - (b.date?.getTime() ?? 0))
    const pastScheduled = scheduled
      .filter((night) => night.date && night.date < today)
      .sort((a, b) => (b.date?.getTime() ?? 0) - (a.date?.getTime() ?? 0))

    const nextNight = future[0] ?? pastScheduled[0] ?? null
    const restUpcoming = scheduled
      .filter((night) => night.id !== nextNight?.id)
      .sort((a, b) => (a.date?.getTime() ?? 0) - (b.date?.getTime() ?? 0))

    return {
      highlight: nextNight,
      ideas: queued,
      upcoming: restUpcoming,
      history: watched,
    }
  }, [nights])

  const handleCloseDialog = () => {
    setForm(initialForm)
    setOpen(false)
  }

  // "/movie-night?nuevo=1" (icon shortcut, calendar link) opens the add form right away.
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("nuevo") === "1") {
      setOpen(true)
      window.history.replaceState(null, "", window.location.pathname)
    }
  }, [])

  const handleSave = async () => {
    if (!form.title) return
    try {
      setSaving(true)
      const mediaId = await findOrCreateMovie({
        catalog,
        title: form.title,
        year: form.year,
        image: form.image || "/placeholder.svg?height=450&width=300",
        tmdbId: form.tmdbId,
      })
      const hasDate = Boolean(form.date)
      await addDoc(collection(db, "movieNights"), {
        mediaId,
        title: form.title,
        year: form.year,
        image: form.image || "/placeholder.svg?height=450&width=300",
        date: hasDate ? parseLocalDate(form.date) : null,
        status: hasDate ? "scheduled" : "queued",
        ...(form.tmdbId ? { tmdbId: form.tmdbId } : {}),
      })
      handleCloseDialog()
    } catch (error) {
      console.error("Error saving movie night:", error)
    } finally {
      setSaving(false)
    }
  }

  const handleMarkWatched = async (night: MovieNight, watchedOn: WatchedOn | null) => {
    setWatchingNight(null)
    const where = watchedOn ? { watchedOn } : {}
    try {
      await updateDoc(doc(db, "movieNights", night.id), { status: "watched", ...where })
      if (night.mediaId) {
        await updateDoc(doc(db, "peliculas", night.mediaId), { state: "watched", ...where })
      }
    } catch (error) {
      console.error("Error marking movie night as watched:", error)
    }
  }

  const handleSchedule = async () => {
    if (!schedulingId || !scheduleDate) return
    try {
      await updateDoc(doc(db, "movieNights", schedulingId), {
        date: parseLocalDate(scheduleDate),
        status: "scheduled",
      })
      setSchedulingId(null)
      setScheduleDate("")
    } catch (error) {
      console.error("Error scheduling movie night:", error)
    }
  }

  const handleClearDate = async (night: MovieNight) => {
    try {
      await updateDoc(doc(db, "movieNights", night.id), {
        date: null,
        status: "queued",
      })
    } catch (error) {
      console.error("Error moving movie night to ideas:", error)
    }
  }

  const handleDelete = async (night: MovieNight) => {
    try {
      await deleteDoc(doc(db, "movieNights", night.id))
      setDeletingNight(null)
    } catch (error) {
      console.error("Error deleting movie night:", error)
    }
  }

  const openSchedule = (night: MovieNight) => {
    setSchedulingId(night.id)
    setScheduleDate(night.date ? toInputDate(night.date) : "")
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <PageHeader title="Noche de peli" actions={<RemindersButton />} />

      <main className="px-5 pb-28 max-w-xl mx-auto">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-7 w-7 border-2 border-muted border-t-primary" />
          </div>
        ) : (
          <>
            <section className="mt-4">
              {highlight ? (
                <div className="rounded-[14px] border border-border bg-card p-3.5">
                  <div className="flex gap-4">
                    <img
                      src={highlight.image || "/placeholder.svg?height=450&width=300"}
                      alt={highlight.title}
                      className="h-36 w-24 shrink-0 rounded-md object-cover bg-muted"
                    />
                    <div className="min-w-0 flex-1 flex flex-col">
                      <div className="flex items-start justify-between gap-2">
                        <p className="pt-0.5 font-mono text-[11px] font-semibold uppercase tracking-[0.06em] text-primary">
                          {highlight.date
                            ? `${shortDateParts(highlight.date).weekday} ${shortDateParts(highlight.date).day} ${shortDateParts(highlight.date).month} · ${relativeDay(highlight.date)}`
                            : "Próxima"}
                        </p>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              aria-label="Más opciones"
                              className="-mr-1.5 -mt-1.5 h-8 w-8 p-0 text-muted-foreground"
                            >
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-44">
                            <DropdownMenuItem onClick={() => openSchedule(highlight)}>
                              Cambiar fecha
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleClearDate(highlight)}>
                              Pasar a ideas
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => setDeletingNight(highlight)}
                              className="text-destructive focus:text-destructive"
                            >
                              Borrar
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                      <h2 className="mt-1.5 text-2xl font-semibold leading-[1.05] tracking-[-0.03em]">
                        {highlight.title}
                      </h2>
                      <p className="mt-1 font-mono text-xs text-muted-foreground">{highlight.year}</p>
                      <WatchProviders
                        key={highlight.id}
                        className="mt-auto pt-3"
                        title={highlight.title}
                        year={highlight.year}
                        type="pelicula"
                        tmdbId={highlight.tmdbId}
                      />
                    </div>
                  </div>
                  <Button
                    className="mt-3.5 h-11 w-full rounded-[10px] bg-foreground text-background hover:bg-foreground/90"
                    onClick={() => setWatchingNight(highlight)}
                  >
                    <Check className="h-4 w-4 mr-2" />
                    Marcar como vista
                  </Button>
                </div>
              ) : (
                <div className="rounded-[14px] border border-dashed border-border px-4 py-10 text-center">
                  <p className="text-lg font-semibold mb-1">No hay noche de peli agendada</p>
                  <p className="text-sm text-muted-foreground mb-4">
                    Elegí una peli y una fecha, o guardala como idea.
                  </p>
                  <Button onClick={() => setOpen(true)}>Agendar una</Button>
                </div>
              )}
            </section>

            <div className="mt-7 space-y-7">
              <NightList
                title="Próximas"
                empty="No hay otras noches agendadas."
                items={upcoming}
                onSchedule={openSchedule}
                onUnschedule={handleClearDate}
                onDelete={setDeletingNight}
              />

              <NightList
                title="Ideas"
                empty="Pelis para alguna próxima noche. Tocá + para sumar una."
                items={ideas}
                collapseKey="movie-night-ideas-open"
                onSchedule={openSchedule}
                onUnschedule={handleClearDate}
                onDelete={setDeletingNight}
              />

              <NightList
                title="Historial"
                empty="Acá aparecen las noches que ya vieron."
                items={history}
                history
                collapseKey="movie-night-history-open"
                onSchedule={openSchedule}
                onUnschedule={handleClearDate}
                onDelete={setDeletingNight}
              />
            </div>
          </>
        )}
      </main>

      <Dialog open={open} onOpenChange={(isOpen) => (isOpen ? setOpen(true) : handleCloseDialog())}>
        <DialogTrigger asChild>
          <button
            type="button"
            className="fixed bottom-24 right-5 z-50 h-[52px] w-[52px] rounded-[14px] bg-foreground text-background flex items-center justify-center shadow-lg active:scale-95 transition-transform"
            aria-label="Agregar noche de peli"
          >
            <Plus className="h-6 w-6" />
          </button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto" onInteractOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle className="font-semibold tracking-tight text-xl">Agregar una peli</DialogTitle>
            <DialogDescription>
              Guardala como idea o ponele fecha para agendar la próxima noche de peli. También se suma a Pelis como “por ver”.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-5 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <div className="col-span-3">
                <Label htmlFor="night-title">Título</Label>
                <Input
                  id="night-title"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value, tmdbId: undefined })}
                  placeholder="Buscá una peli"
                  className="h-11 mt-2"
                />
              </div>
              <div>
                <Label htmlFor="night-year">Año</Label>
                <Input
                  id="night-year"
                  type="number"
                  value={form.year}
                  onChange={(e) => setForm({ ...form, year: Number(e.target.value) })}
                  className="h-11 mt-2"
                />
              </div>
            </div>
            <CoverPicker
              key={open ? "open" : "closed"}
              mediaFilter="movie"
              query={form.title}
              image={form.image}
              onImageChange={(image) => setForm((prev) => ({ ...prev, image }))}
              onSelectResult={(result) =>
                setForm((prev) => ({
                  ...prev,
                  title: result.title,
                  year: result.year,
                  image: result.image,
                  tmdbId: result.tmdbId,
                }))
              }
            />
            <div>
              <Label htmlFor="night-date">Fecha (opcional)</Label>
              <Input
                id="night-date"
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                className="h-11 mt-2"
              />
              <p className="text-xs text-muted-foreground mt-1.5">
                Sin fecha queda como idea; con fecha se agenda.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleSave} disabled={saving || !form.title}>
              {saving ? "Guardando..." : form.date ? "Agendar noche" : "Guardar idea"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!schedulingId} onOpenChange={(isOpen) => !isOpen && setSchedulingId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-semibold tracking-tight">Elegí una fecha</DialogTitle>
            <DialogDescription>Queda agendada como noche de peli.</DialogDescription>
          </DialogHeader>
          <Input
            type="date"
            value={scheduleDate}
            onChange={(e) => setScheduleDate(e.target.value)}
            className="h-11"
          />
          <DialogFooter>
            <Button onClick={handleSchedule} disabled={!scheduleDate}>
              Agendar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={!!watchingNight} onOpenChange={(isOpen) => !isOpen && setWatchingNight(null)}>
        <DialogContent className="sm:max-w-[440px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-semibold tracking-tight text-xl">¿Dónde la vieron?</DialogTitle>
            <DialogDescription>{watchingNight?.title}</DialogDescription>
          </DialogHeader>
          {watchingNight && (
            <WatchedOnOptions
              title={watchingNight.title}
              year={watchingNight.year}
              type="pelicula"
              tmdbId={watchingNight.tmdbId}
              onPick={(watchedOn) => handleMarkWatched(watchingNight, watchedOn)}
            />
          )}
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => watchingNight && handleMarkWatched(watchingNight, null)}
            >
              Marcar sin elegir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deletingNight} onOpenChange={(isOpen) => !isOpen && setDeletingNight(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-semibold tracking-tight">¿Sacarla de noche de peli?</AlertDialogTitle>
            <AlertDialogDescription>
              {deletingNight?.title} sale de esta lista, pero queda en Pelis.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deletingNight && handleDelete(deletingNight)}
            >
              Borrar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function NightList({
  title,
  empty,
  items,
  history = false,
  collapseKey,
  onSchedule,
  onUnschedule,
  onDelete,
}: {
  title: string
  empty: string
  items: MovieNight[]
  history?: boolean
  /** When set, the section folds like an accordion (closed by default) and remembers it per device. */
  collapseKey?: string
  onSchedule: (night: MovieNight) => void
  onUnschedule: (night: MovieNight) => void
  onDelete: (night: MovieNight) => void
}) {
  const [open, setOpen] = useState(!collapseKey)

  useEffect(() => {
    if (!collapseKey) return
    try {
      const saved = window.localStorage.getItem(collapseKey)
      if (saved !== null) setOpen(saved === "1")
    } catch {
      // Storage can be unavailable (private mode); the section just starts closed.
    }
  }, [collapseKey])

  const toggle = () => {
    const next = !open
    setOpen(next)
    if (!collapseKey) return
    try {
      window.localStorage.setItem(collapseKey, next ? "1" : "0")
    } catch {
      // Ignore: the choice just won't be remembered.
    }
  }

  return (
    <section>
      {collapseKey ? (
        <button
          type="button"
          onClick={toggle}
          aria-expanded={open}
          className="flex h-12 w-full items-center justify-between gap-3 border-b border-border text-left"
        >
          <span className="flex items-baseline gap-2">
            <span className="text-[15px] font-semibold">{title}</span>
            <span className="font-mono text-xs text-muted-foreground tabular-nums">{items.length}</span>
          </span>
          <ChevronDown
            className={cn("h-[18px] w-[18px] text-muted-foreground transition-transform", open && "rotate-180")}
          />
        </button>
      ) : (
        <SectionLabel count={items.length}>{title}</SectionLabel>
      )}
      {collapseKey && !open ? null : items.length === 0 ? (
        <p className="py-3.5 text-sm text-muted-foreground border-b border-border">{empty}</p>
      ) : (
        <div>
          {items.map((night) => (
            <div key={night.id} className="flex items-center gap-3.5 py-2.5 border-b border-border">
              <DateColumn date={night.date} top={history ? "month" : "weekday"} />
              <img
                src={night.image || "/placeholder.svg?height=450&width=300"}
                alt=""
                className="h-[45px] w-[30px] shrink-0 rounded object-cover bg-muted"
              />
              <div className="min-w-0 flex-1">
                <p className="text-[15px] font-medium line-clamp-1">{night.title}</p>
                <p className="font-mono text-[11px] text-muted-foreground">{night.year}</p>
              </div>
              {history && night.watchedOn && <WatchedOnIcon value={night.watchedOn} />}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-label={`Opciones de ${night.title}`}
                    className="h-8 w-8 p-0 text-muted-foreground"
                  >
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44">
                  {!history && (
                    <DropdownMenuItem onClick={() => onSchedule(night)}>
                      {night.date ? "Cambiar fecha" : "Agendar"}
                    </DropdownMenuItem>
                  )}
                  {!history && night.date && (
                    <DropdownMenuItem onClick={() => onUnschedule(night)}>
                      Pasar a ideas
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem
                    onClick={() => onDelete(night)}
                    className="text-destructive focus:text-destructive"
                  >
                    Borrar
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
