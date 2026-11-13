"use client"

import { useState } from "react"
import { Check, CircleDot, MoreVertical, Play, RotateCcw, type LucideIcon } from "lucide-react"
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

/** Only the states that ask for something (keep watching, pick it back up) use orange. */
const NEEDS_ATTENTION: Record<MediaWithId["state"], boolean> = {
  watched: false,
  "in-progress": true,
  pending: false,
  "up-to-date": false,
  "to-resume": true,
}

const STATE_ICONS: Record<MediaWithId["state"], LucideIcon | null> = {
  watched: Check,
  "in-progress": Play,
  pending: null,
  "up-to-date": CircleDot,
  "to-resume": RotateCcw,
}

/** "Nueva temporada" when the unseen episode opens a new season, otherwise "Nuevo cap.". */
function newContentLabel(media: MediaWithId) {
  if (media.progress && media.lastAired) {
    return media.lastAired.season > media.progress.season ? "Nueva temporada" : "Nuevo cap."
  }
  return "Por retomar"
}

/** The tag over the poster; "Por ver" and "Vista" have none (Vista dims the poster instead). */
function posterTag(media: MediaWithId): { label: string; attention: boolean } | null {
  switch (media.state) {
    case "in-progress":
      return {
        label: media.type === "serie" && media.progress ? formatEpisode(media.progress) : "Viendo",
        attention: true,
      }
    case "to-resume":
      return { label: newContentLabel(media), attention: true }
    case "up-to-date":
      return { label: "Al día", attention: false }
    default:
      return null
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
    const watched = media.state === "watched"
    const tag = posterTag(media)
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
            className={cn(
              "pointer-events-none h-full w-full object-cover transition-opacity",
              watched && "opacity-55 grayscale-[35%]"
            )}
            draggable={false}
          />
          {watched && (
            <span
              className="absolute top-1.5 right-1.5 h-5 w-5 rounded-full bg-black/65 text-white inline-flex items-center justify-center pointer-events-none"
              aria-label="Vista"
            >
              <Check className="h-3 w-3" strokeWidth={3} />
            </span>
          )}
          {tag && (
            <span
              className={cn(
                "absolute bottom-1.5 left-1.5 max-w-[calc(100%-2.75rem)] truncate rounded px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wide pointer-events-none",
                tag.attention ? "bg-primary text-primary-foreground" : "bg-black/60 text-white"
              )}
            >
              {tag.label}
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
        <p className={cn("mt-1.5 text-xs leading-tight font-medium line-clamp-1", watched ? "text-muted-foreground" : "text-foreground")}>
          {media.title}
        </p>
      </div>
    )
  }

  const StateIcon = STATE_ICONS[media.state]
  const attention = NEEDS_ATTENTION[media.state]

  return (
    <div className="flex items-center gap-3.5 py-2.5 border-b border-border">
      <div className="relative shrink-0 w-9 h-[54px] overflow-hidden rounded bg-muted">
        <img
          src={media.image || "/placeholder.svg?height=450&width=300"}
          alt=""
          className={cn("h-full w-full object-cover", media.state === "watched" && "opacity-60 grayscale-[35%]")}
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
      <span
        className={cn(
          "flex shrink-0 items-center gap-1 text-xs",
          attention ? "font-semibold text-primary" : "text-muted-foreground"
        )}
      >
        {StateIcon && <StateIcon className="h-3.5 w-3.5" strokeWidth={2} />}
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
