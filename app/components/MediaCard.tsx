"use client"

import { Check, Clock, Star, RefreshCw, MoreVertical } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { MediaWithId } from "../types/media"
import { cn } from "@/lib/utils"

interface MediaCardProps {
  media: MediaWithId
  variant: "poster" | "compact"
  onEdit: (media: MediaWithId) => void
  onDelete: (media: MediaWithId) => void
}

function getTypeLabel(type: MediaWithId["type"]) {
  return type === "pelicula" ? "Movie" : "TV Show"
}

function stateDotClass(state: MediaWithId["state"]) {
  switch (state) {
    case "watched":
      return "bg-foreground/70"
    case "in-progress":
      return "bg-primary"
    case "pending":
      return "bg-muted-foreground"
    case "up-to-date":
      return "bg-emerald-500"
  }
}

function StateIcon({ state }: { state: MediaWithId["state"] }) {
  const className = "h-3.5 w-3.5 shrink-0"
  switch (state) {
    case "watched":
      return <Check className={cn(className, "text-foreground/70")} />
    case "in-progress":
      return <Clock className={cn(className, "text-primary")} />
    case "pending":
      return <Star className={cn(className, "text-muted-foreground")} />
    case "up-to-date":
      return <RefreshCw className={cn(className, "text-emerald-600 dark:text-emerald-400")} />
  }
}

export function MediaCard({ media, variant, onEdit, onDelete }: MediaCardProps) {
  const menu = (
    <DropdownMenuContent align="end" className="w-40">
      <DropdownMenuItem onClick={() => onEdit(media)}>Edit</DropdownMenuItem>
      <DropdownMenuItem
        onClick={() => onDelete(media)}
        className="text-destructive focus:text-destructive"
      >
        Delete
      </DropdownMenuItem>
    </DropdownMenuContent>
  )

  if (variant === "poster") {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button type="button" className="group w-full text-left outline-none">
            <div className="relative aspect-[2/3] overflow-hidden rounded-sm bg-muted">
              <img
                src={media.image || "/placeholder.svg?height=450&width=300"}
                alt={media.title}
                className="h-full w-full object-cover"
                draggable={false}
              />
              <span
                className={cn(
                  "absolute top-1.5 right-1.5 h-2 w-2 rounded-full ring-2 ring-black/50",
                  stateDotClass(media.state)
                )}
              />
            </div>
            <p className="mt-1.5 text-[11px] leading-tight font-medium text-foreground line-clamp-1">
              {media.title}
            </p>
          </button>
        </DropdownMenuTrigger>
        {menu}
      </DropdownMenu>
    )
  }

  return (
    <div className="flex items-center gap-3 py-2 border-b border-border/60">
      <div className="relative shrink-0 w-10 h-[60px] overflow-hidden rounded-sm bg-muted">
        <img
          src={media.image || "/placeholder.svg?height=450&width=300"}
          alt={media.title}
          className="h-full w-full object-cover"
          width={40}
          height={60}
          draggable={false}
        />
      </div>
      <div className="min-w-0 flex-1">
        <h3 className="text-sm font-medium leading-tight line-clamp-1 text-foreground">
          {media.title}
        </h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          {media.year} · {getTypeLabel(media.type)}
        </p>
      </div>
      <StateIcon state={media.state} />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
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
