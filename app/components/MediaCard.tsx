import { Check, Clock, Edit2, Star, Trash2, RefreshCw } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardFooter } from "@/components/ui/card"
import { MediaWithId } from "../types/media"
import { cn } from "@/lib/utils"

interface MediaCardProps {
  media: MediaWithId;
  onEdit: (media: MediaWithId) => void;
  onDelete: (media: MediaWithId) => void;
}

export function MediaCard({ media, onEdit, onDelete }: MediaCardProps) {
  const getStateIcon = (state: MediaWithId["state"]) => {
    switch (state) {
      case "watched":
        return <Check className="h-4 w-4" />;
      case "in-progress":
        return <Clock className="h-4 w-4" />;
      case "pending":
        return <Star className="h-4 w-4" />;
      case "up-to-date":
        return <RefreshCw className="h-4 w-4" />;
    }
  };

  const getStateText = (state: MediaWithId["state"]) => {
    switch (state) {
      case "watched":
        return "Vista";
      case "in-progress":
        return "En progreso";
      case "pending":
        return "Pendiente";
      case "up-to-date":
        return "Al día";
    }
  };

  return (
    <Card className="overflow-hidden group relative">
      <div className="aspect-[2/3] relative">
        <img
          src={media.image}
          alt={media.title}
          className="object-cover w-full h-full"
          width={300}
          height={450}
          draggable={false}
        />
        <div className="absolute top-2 right-2">
          <Badge 
            variant={
              media.state === "watched" 
                ? "default" 
                : media.state === "in-progress" 
                ? "secondary"
                : media.state === "up-to-date"
                ? "outline"
                : "outline"
            }
            className={cn(
              "flex gap-1 items-center",
              media.state === "up-to-date" && "border-green-200 bg-green-100 dark:bg-green-900/30 dark:border-green-800 text-green-700 dark:text-green-400"
            )}
          >
            {getStateIcon(media.state)}
            {getStateText(media.state)}
          </Badge>
        </div>
        <div className="absolute bottom-2 right-2 flex gap-1">
          <Button
            variant="secondary"
            size="sm"
            className="h-8 w-8 bg-black/20 hover:bg-black/40 backdrop-blur-sm"
            onClick={(e) => {
              e.stopPropagation();
              onEdit(media);
            }}
          >
            <Edit2 className="h-4 w-4 text-white" />
          </Button>
          <Button
            variant="secondary"
            size="sm"
            className="h-8 w-8 bg-black/20 hover:bg-black/40 backdrop-blur-sm"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(media);
            }}
          >
            <Trash2 className="h-4 w-4 text-red-400" />
          </Button>
        </div>
      </div>
      <CardFooter className="flex-col items-start p-4">
        <div className="w-full">
          <h3 className="font-semibold line-clamp-2">{media.title}</h3>
          <p className="text-sm text-gray-500">{media.year}</p>
        </div>
      </CardFooter>
    </Card>
  );
} 