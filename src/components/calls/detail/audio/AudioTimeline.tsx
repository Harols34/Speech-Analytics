
import { formatTime } from "./audioUtils";

interface AudioTimelineProps {
  currentTime: number;
  duration: number;
  onSeek: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export default function AudioTimeline({
  currentTime,
  duration,
  onSeek,
}: AudioTimelineProps) {
  return (
    <div className="flex-1 mx-4">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-2">
        <div className="text-sm">
          {/* Filename is now moved to the main component */}
        </div>
        <div className="text-sm text-muted-foreground">
          {formatTime(currentTime)} / {formatTime(duration)}
        </div>
      </div>
      <input
        type="range"
        min="0"
        max={duration || 0}
        value={currentTime}
        onChange={onSeek}
        className="w-full h-2 rounded-full appearance-none bg-secondary cursor-pointer"
        style={{
          backgroundImage: `linear-gradient(to right, var(--primary) 0%, var(--primary) ${
            (currentTime / (duration || 1)) * 100
          }%, var(--secondary) ${
            (currentTime / (duration || 1)) * 100
          }%, var(--secondary) 100%)`,
        }}
      />
    </div>
  );
}
