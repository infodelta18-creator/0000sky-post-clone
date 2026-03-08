import { Eye, Headphones } from "lucide-react";
import { useLiveViewerCount } from "@/hooks/use-live-viewers";

interface LiveViewerCountProps {
  liveStatusId: string;
  isAudio?: boolean;
  className?: string;
}

export default function LiveViewerCount({ liveStatusId, isAudio, className = "" }: LiveViewerCountProps) {
  const { data: count = 0 } = useLiveViewerCount(liveStatusId);

  if (count === 0) return null;

  return (
    <span className={`inline-flex items-center gap-1 text-xs text-muted-foreground ${className}`}>
      {isAudio ? <Headphones className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
      <span className="font-medium">{count}</span>
    </span>
  );
}
