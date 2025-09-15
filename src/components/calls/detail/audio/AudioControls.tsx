
import { Button } from "@/components/ui/button";
import { Play, Pause, SkipBack, SkipForward } from "lucide-react";

interface AudioControlsProps {
  isPlaying: boolean;
  onPlayPause: () => void;
  onSkipBackward: () => void;
  onSkipForward: () => void;
}

export default function AudioControls({
  isPlaying,
  onPlayPause,
  onSkipBackward,
  onSkipForward,
}: AudioControlsProps) {
  return (
    <div className="flex items-center space-x-2">
      <Button
        variant="ghost"
        size="icon"
        onClick={onSkipBackward}
        className="h-10 w-10"
      >
        <SkipBack className="h-5 w-5" />
      </Button>
      <Button
        variant="default"
        size="icon"
        onClick={onPlayPause}
        className="h-12 w-12 rounded-full"
      >
        {isPlaying ? (
          <Pause className="h-6 w-6" />
        ) : (
          <Play className="h-6 w-6 ml-1" />
        )}
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={onSkipForward}
        className="h-10 w-10"
      >
        <SkipForward className="h-5 w-5" />
      </Button>
    </div>
  );
}
