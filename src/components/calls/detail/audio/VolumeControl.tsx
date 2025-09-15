
import { Button } from "@/components/ui/button";
import { Volume2, VolumeX } from "lucide-react";

interface VolumeControlProps {
  volume: number;
  isMuted: boolean;
  onVolumeChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onMute: () => void;
}

export default function VolumeControl({
  volume,
  isMuted,
  onVolumeChange,
  onMute,
}: VolumeControlProps) {
  return (
    <div className="flex items-center space-x-2">
      <Button
        variant="ghost"
        size="icon"
        onClick={onMute}
        className="h-8 w-8"
      >
        {isMuted ? (
          <VolumeX className="h-4 w-4" />
        ) : (
          <Volume2 className="h-4 w-4" />
        )}
      </Button>
      <input
        type="range"
        min="0"
        max="1"
        step="0.01"
        value={isMuted ? 0 : volume}
        onChange={onVolumeChange}
        className="w-24 h-2 rounded-full appearance-none bg-secondary cursor-pointer"
        style={{
          backgroundImage: `linear-gradient(to right, var(--primary) 0%, var(--primary) ${
            (isMuted ? 0 : volume) * 100
          }%, var(--secondary) ${
            (isMuted ? 0 : volume) * 100
          }%, var(--secondary) 100%)`,
        }}
      />
    </div>
  );
}
