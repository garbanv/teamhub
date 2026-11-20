import {
  Flame,
  Minus,
  SignalHigh,
  SignalLow,
  SignalMedium,
} from "lucide-react";

import type { TaskPriority } from "@/lib/types";
import { cn } from "@/lib/utils";

const mapping = {
  urgent: { icon: Flame, className: "text-destructive" },
  high: { icon: SignalHigh, className: "text-orange-500" },
  medium: { icon: SignalMedium, className: "text-amber-500" },
  low: { icon: SignalLow, className: "text-sky-500" },
  none: { icon: Minus, className: "text-muted-foreground/35" },
} satisfies Record<
  TaskPriority,
  { icon: React.ComponentType<{ className?: string }>; className: string }
>;

export function TaskPriorityIcon({
  priority,
  className,
}: {
  priority: TaskPriority;
  className?: string;
}) {
  const meta = mapping[priority];
  return (
    <meta.icon
      className={cn("size-3.5 shrink-0", meta.className, className)}
      aria-hidden="true"
    />
  );
}
