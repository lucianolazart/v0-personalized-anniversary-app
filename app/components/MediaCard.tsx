"use client"

import { useState } from "react"
import { MoreVertical } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { MediaWithId } from "../types/media"
import { cn } from "@/lib/utils"
import { useLongPress } from "../hooks/useLongPress"
import { WatchedOnIcon } from "./WatchedOnPicker"
import { formatEpisode } from "../lib/episodes"

interface MediaCardProps {
  media: MediaWithId
  variant: "poster" | "compact"
  onEdit: (media: MediaWithId) => void
  onDelete: (media: MediaWithId) => void
  /** Series only: opens "¿Por dónde van?". */
  onTrack?: (media: MediaWithId) => void
}

export const STATE_LABELS: Record<MediaWithId["state"], string> = {
  watched: "Vista",
  "in-progress": "Viendo",
  pending: "Por ver",
  "up-to-date": "Al día",
  "to-resume": "Por retomar",
}

export function stateDotClass(state: MediaWithId["state"]) {
  switch (state) {
    case "watched":
      return "bg-foreground"
    case "in-progress":
      return "bg-primary"
    case "pending":
      return "bg-muted-foreground/50"
    case "up-to-date":
      return "bg-emerald-600"
    case "to-resume":
      return "bg-sky-600"
  }
}

function metaLine(media: MediaWithId) {
  const parts: string[] = [String(media.year), media.type === "pelicula" ? "Peli" : "Serie"]
  if (media.type === "serie" && media.progress) parts.push(formatEpisode(media.progress))
  if (media.state === "watched" && media.watchedOn) {
    parts.push(
      media.watchedOn.kind === "streaming"
        ? media.watchedOn.name
        : media.watchedOn.kind === "cine"
          ? "Cine"
          : "Pirata"
    )
  }
  return parts.join(" · ")
}

export function MediaCard({ media, variant, onEdit, onDelete, onTrack }: MediaCardProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const { isLongPressing, ...pressHandlers } = useLongPress({
    onLongPress: () => setMenuOpen(true),
    ms: 450,
    moveThreshold: 12,
  })

  const menu = (
    <DropdownMenuContent align="end" className="w-48">
      {media.type === "serie" && onTrack && (
        <DropdownMenuItem onClick={() => onTrack(media)}>¿Por dónde van?</DropdownMenuItem>
      )}
      <DropdownMenuItem onClick={() => onEdit(media)}>Editar</DropdownMenuItem>
      <DropdownMenuItem
        onClick={() => onDelete(media)}
        className="text-destructive focus:text-destructive"
      >
        Borrar
      </DropdownMenuItem>
    </DropdownMenuContent>
  )

  if (variant === "poster") {
    return (
      <div className="w-full">
        <div
          className={cn(
            "relative aspect-[2/3] overflow-hidden rounded-md bg-muted touch-pan-y select-none",
            isLongPressing && "opacity-80"
          )}
          {...pressHandlers}
        >
          <img
            src={media.image || "/placeholder.svg?height=450&width=300"}
            alt={media.title}
            className="pointer-events-none h-full w-full object-cover"
            draggable={false}
          />
          <span
            className={cn(
              "absolute top-1.5 right-1.5 h-2 w-2 rounded-full ring-2 ring-white/80 pointer-events-none",
              stateDotClass(media.state)
            )}
          />
          {media.type === "serie" && media.progress && (
            <span className="absolute bottom-1.5 left-1.5 rounded bg-black/60 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-white pointer-events-none">
              {formatEpisode(media.progress)}
            </span>
          )}
          <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                aria-label={`Opciones de ${media.title}`}
                className="absolute bottom-1.5 right-1.5 h-7 w-7 inline-flex items-center justify-center rounded-full bg-black/55 text-white backdrop-blur-sm"
                onPointerDown={(e) => e.stopPropagation()}
                onTouchStart={(e) => e.stopPropagation()}
              >
                <MoreVertical className="h-3.5 w-3.5" />
              </button>
            </DropdownMenuTrigger>
            {menu}
          </DropdownMenu>
        </div>
        <p className="mt-1.5 text-xs leading-tight font-medium text-foreground line-clamp-1">
          {media.title}
        </p>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-3.5 py-2.5 border-b border-border">
      <div className="relative shrink-0 w-9 h-[54px] overflow-hidden rounded bg-muted">
        <img
          src={media.image || "/placeholder.svg?height=450&width=300"}
          alt=""
          className="h-full w-full object-cover"
          width={36}
          height={54}
          draggable={false}
        />
      </div>
      <button
        type="button"
        className="min-w-0 flex-1 text-left"
        onClick={() => (media.type === "serie" && onTrack ? onTrack(media) : onEdit(media))}
      >
        <h3 className="text-[15px] font-semibold leading-tight line-clamp-1 text-foreground">{media.title}</h3>
        <p className="mt-1 font-mono text-[11px] uppercase text-muted-foreground line-clamp-1">{metaLine(media)}</p>
      </button>
      {media.state === "watched" && media.watchedOn && <WatchedOnIcon value={media.watchedOn} />}
      <span className="flex shrink-0 items-center gap-1.5 text-xs text-foreground/80">
        <span className={cn("h-1.5 w-1.5 rounded-full", stateDotClass(media.state))} />
        {STATE_LABELS[media.state]}
      </span>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            aria-label={`Opciones de ${media.title}`}
            className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
            onClick={(e) => e.stopPropagation()}
          >
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        {menu}
      </DropdownMenu>
    </div>
  )
}
