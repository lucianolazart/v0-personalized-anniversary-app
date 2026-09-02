"use client"

import { useEffect, useMemo, useState } from "react"
import { Calendar, Check, MoreVertical, Plus } from "lucide-react"
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
  formatNightDate,
  parseLocalDate,
  startOfToday,
  toInputDate,
} from "../lib/movie-night"
import { CoverPicker } from "../components/CoverPicker"
import { ThemeToggle } from "@/components/theme-toggle"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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

  const handleSave = async () => {
    if (!form.title) return
    try {
      setSaving(true)
      const mediaId = await findOrCreateMovie({
        catalog,
        title: form.title,
        year: form.year,
        image: form.image || "/placeholder.svg?height=450&width=300",
      })
      const hasDate = Boolean(form.date)
      await addDoc(collection(db, "movieNights"), {
        mediaId,
        title: form.title,
        year: form.year,
        image: form.image || "/placeholder.svg?height=450&width=300",
        date: hasDate ? parseLocalDate(form.date) : null,
        status: hasDate ? "scheduled" : "queued",
      })
      handleCloseDialog()
    } catch (error) {
      console.error("Error saving movie night:", error)
    } finally {
      setSaving(false)
    }
  }

  const handleMarkWatched = async (night: MovieNight) => {
    try {
      await updateDoc(doc(db, "movieNights", night.id), { status: "watched" })
      if (night.mediaId) {
        await updateDoc(doc(db, "peliculas", night.mediaId), { state: "watched" })
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
      <header className="px-4 pt-12 pb-4 sticky top-0 z-20 bg-background/90 backdrop-blur-md">
        <div className="flex items-start justify-between gap-3">
          <h1 className="text-3xl font-serif font-medium tracking-tight">Movie Night</h1>
          <ThemeToggle />
        </div>
      </header>

      <main className="px-4 pb-28 space-y-8">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-muted border-t-primary" />
          </div>
        ) : (
          <>
            <section>
              {highlight ? (
                <div className="rounded-lg border border-border bg-card overflow-hidden">
                  <div className="relative aspect-[2/3] max-h-[420px] mx-auto w-full sm:max-w-sm bg-muted">
                    <img
                      src={highlight.image || "/placeholder.svg?height=450&width=300"}
                      alt={highlight.title}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="p-4 space-y-3">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-primary font-medium">
                      Next up
                    </p>
                    <h2 className="text-2xl font-serif font-medium leading-tight">
                      {highlight.title}
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      {highlight.year}
                      {highlight.date ? ` · ${formatNightDate(highlight.date)}` : ""}
                    </p>
                    <Button className="w-full" onClick={() => handleMarkWatched(highlight)}>
                      <Check className="h-4 w-4 mr-2" />
                      Mark as watched
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="rounded-lg border border-dashed border-border bg-card/50 px-4 py-10 text-center">
                  <p className="font-serif text-xl mb-1">No movie night scheduled</p>
                  <p className="text-sm text-muted-foreground mb-4">
                    Pick a film and a date, or add an idea for later.
                  </p>
                  <Button onClick={() => setOpen(true)}>Schedule one</Button>
                </div>
              )}
            </section>

            <NightList
              title="Ideas"
              empty="Films you might watch on a future night."
              items={ideas}
              onSchedule={openSchedule}
              onUnschedule={handleClearDate}
              onDelete={handleDelete}
            />

            <NightList
              title="Upcoming"
              empty="No other nights on the calendar."
              items={upcoming}
              onSchedule={openSchedule}
              onUnschedule={handleClearDate}
              onDelete={handleDelete}
            />

            <NightList
              title="History"
              empty="Watched nights will show up here with their planned date."
              items={history}
              history
              onSchedule={openSchedule}
              onUnschedule={handleClearDate}
              onDelete={handleDelete}
            />
          </>
        )}
      </main>

      <Dialog open={open} onOpenChange={(isOpen) => (isOpen ? setOpen(true) : handleCloseDialog())}>
        <DialogTrigger asChild>
          <button
            type="button"
            className="fixed bottom-24 right-6 w-14 h-14 bg-primary text-primary-foreground rounded-full shadow-lg shadow-primary/30 flex items-center justify-center z-50 active:scale-95 transition-transform"
            aria-label="Add movie night"
          >
            <Plus className="h-7 w-7" />
          </button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto" onInteractOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle className="font-serif font-medium text-xl">Add a movie</DialogTitle>
            <DialogDescription>
              Add an idea, or pick a date to schedule the next Movie Night. It also goes on the Movies watchlist.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-5 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <div className="col-span-3">
                <Label htmlFor="night-title">Title</Label>
                <Input
                  id="night-title"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="Search a movie"
                  className="h-11 mt-2"
                />
              </div>
              <div>
                <Label htmlFor="night-year">Year</Label>
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
                }))
              }
            />
            <div>
              <Label htmlFor="night-date">Date (optional)</Label>
              <Input
                id="night-date"
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                className="h-11 mt-2"
              />
              <p className="text-xs text-muted-foreground mt-1.5">
                Leave empty to save as an idea. Add a date to schedule it.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleSave} disabled={saving || !form.title}>
              {saving ? "Saving..." : form.date ? "Schedule night" : "Save idea"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!schedulingId} onOpenChange={(isOpen) => !isOpen && setSchedulingId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-serif font-medium">Pick a date</DialogTitle>
            <DialogDescription>This becomes a scheduled Movie Night.</DialogDescription>
          </DialogHeader>
          <Input
            type="date"
            value={scheduleDate}
            onChange={(e) => setScheduleDate(e.target.value)}
            className="h-11"
          />
          <DialogFooter>
            <Button onClick={handleSchedule} disabled={!scheduleDate}>
              Schedule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function NightList({
  title,
  empty,
  items,
  history = false,
  onSchedule,
  onUnschedule,
  onDelete,
}: {
  title: string
  empty: string
  items: MovieNight[]
  history?: boolean
  onSchedule: (night: MovieNight) => void
  onUnschedule: (night: MovieNight) => void
  onDelete: (night: MovieNight) => void
}) {
  return (
    <section>
      <h2 className="font-serif text-lg font-medium mb-3">{title}</h2>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">{empty}</p>
      ) : (
        <div className="space-y-2">
          {items.map((night) => (
            <div
              key={night.id}
              className="flex items-center gap-3 rounded-md border border-border bg-card p-2"
            >
              <div className="relative shrink-0 w-12 h-[72px] overflow-hidden rounded-sm bg-muted">
                <img
                  src={night.image || "/placeholder.svg?height=450&width=300"}
                  alt={night.title}
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium line-clamp-1">{night.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {night.year}
                  {night.date ? ` · ${formatNightDate(night.date)}` : ""}
                </p>
              </div>
              {!history && night.date && (
                <Calendar className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              )}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-muted-foreground">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44">
                  {!history && (
                    <DropdownMenuItem onClick={() => onSchedule(night)}>
                      {night.date ? "Edit date" : "Schedule"}
                    </DropdownMenuItem>
                  )}
                  {!history && night.date && (
                    <DropdownMenuItem onClick={() => onUnschedule(night)}>
                      Move to ideas
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem
                    onClick={() => onDelete(night)}
                    className="text-destructive focus:text-destructive"
                  >
                    Delete
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
