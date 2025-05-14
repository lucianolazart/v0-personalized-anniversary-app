import { Check, Clock, Edit2, Star, Trash2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardFooter } from "@/components/ui/card"
import { MediaWithId } from "../types/media"
import { useLongPress } from "../hooks/useLongPress"

interface MediaCardProps {
  media: MediaWithId;
  onEdit: (media: MediaWithId) => void;
  onDelete: (media: MediaWithId) => void;
}

export function MediaCard({ media, onEdit, onDelete }: MediaCardProps) {
  const longPressProps = useLongPress({
    onLongPress: () => onDelete(media),
    onClick: () => onEdit(media),
    ms: 500,
  });

  const getStateIcon = (state: MediaWithId["state"]) => {
    switch (state) {
      case "watched":
        return <Check className="h-4 w-4" />;
      case "in-progress":
        return <Clock className="h-4 w-4" />;
      case "pending":
        return <Star className="h-4 w-4" />;
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
    }
  };

  return (
    <Card 
      className={`overflow-hidden group relative ${longPressProps.isLongPressing ? 'scale-95' : ''} transition-transform cursor-pointer`}
      {...longPressProps}
    >
      <div className="aspect-[2/3] relative">
        <img
          src={media.image}
          alt={media.title}
          className="object-cover w-full h-full"
          width={300}
          height={450}
        />
        <div className="absolute top-2 right-2">
          <Badge 
            variant={
              media.state === "watched" 
                ? "default" 
                : media.state === "in-progress" 
                ? "secondary"
                : "outline"
            }
            className="flex gap-1 items-center"
          >
            {getStateIcon(media.state)}
            {getStateText(media.state)}
          </Badge>
        </div>
        {longPressProps.isLongPressing && (
          <div className="absolute inset-0 bg-red-500/60 flex items-center justify-center">
            <Trash2 className="h-8 w-8 text-white animate-bounce" />
          </div>
        )}
      </div>
      <CardFooter className="flex-col items-start p-4">
        <div className="flex items-start justify-between w-full">
          <div>
            <h3 className="font-semibold">{media.title}</h3>
            <p className="text-sm text-gray-500">{media.year}</p>
          </div>
        </div>
      </CardFooter>
    </Card>
  );
} 