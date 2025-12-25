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
  media: MediaWithId;
  onEdit: (media: MediaWithId) => void;
  onDelete: (media: MediaWithId) => void;
}

export function MediaCard({ media, onEdit, onDelete }: MediaCardProps) {
  const getStateBadge = (state: MediaWithId["state"]) => {
    switch (state) {
      case "watched":
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full bg-muted text-foreground text-xs font-bold border border-border">
            <Check className="h-3.5 w-3.5 mr-1.5" />
            Watched
          </span>
        );
      case "in-progress":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-accent/50 text-accent-foreground text-xs font-bold border border-accent">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#EA580C] opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#EA580C]" />
            </span>
            Watching
          </span>
        );
      case "pending":
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full bg-muted text-muted-foreground text-xs font-bold border border-border">
            <Star className="h-3.5 w-3.5 mr-1.5" />
            Watchlist
          </span>
        );
      case "up-to-date":
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full bg-green-500/10 text-green-600 text-xs font-bold border border-green-500/20">
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
            Up to Date
          </span>
        );
    }
  };

  const getTypeLabel = () => {
    if (media.type === "pelicula") {
      return "Movie";
    }
    return "TV Show";
  };

  return (
    <div className="bg-card rounded-2xl p-3 shadow-sm border border-border/40 flex gap-4">
      <div className="relative shrink-0 w-24 h-36 rounded-xl overflow-hidden bg-muted">
        <img
          src={media.image || "/placeholder.svg?height=450&width=300"}
          alt={media.title}
          className="w-full h-full object-cover"
          width={96}
          height={144}
          draggable={false}
        />
      </div>
      <div className="flex flex-col flex-1 py-1 justify-between">
        <div>
          <div className="flex justify-between items-start mb-1">
            <h3 className="text-lg font-bold leading-tight line-clamp-2 text-foreground">
              {media.title}
            </h3>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreVertical className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40">
                <DropdownMenuItem onClick={() => onEdit(media)}>
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => onDelete(media)}
                  className="text-red-600 focus:text-red-600 dark:text-red-400"
                >
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <p className="text-muted-foreground text-sm font-medium mb-3">
            {media.year} • {getTypeLabel()}
          </p>
        </div>
        <div className="mt-auto">
          {getStateBadge(media.state)}
        </div>
      </div>
    </div>
  );
}
