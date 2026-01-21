import { Button } from "@/components/ui/button";
import { Gauge } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface PlaybackSpeedControlProps {
  playbackRate: number;
  onPlaybackRateChange: (rate: number) => void;
}

const speedOptions = [
  { value: 0.5, label: "0.5x" },
  { value: 0.75, label: "0.75x" },
  { value: 1, label: "1x" },
  { value: 1.25, label: "1.25x" },
  { value: 1.5, label: "1.5x" },
  { value: 1.75, label: "1.75x" },
  { value: 2, label: "2x" },
];

export default function PlaybackSpeedControl({
  playbackRate,
  onPlaybackRateChange,
}: PlaybackSpeedControlProps) {
  const currentSpeed = speedOptions.find(option => option.value === playbackRate);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-1">
          <Gauge className="h-4 w-4" />
          {currentSpeed?.label || "1x"}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="center">
        {speedOptions.map((option) => (
          <DropdownMenuItem
            key={option.value}
            onClick={() => onPlaybackRateChange(option.value)}
            className={playbackRate === option.value ? "bg-accent" : ""}
          >
            {option.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}