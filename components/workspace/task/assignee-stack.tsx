import { UserAvatar } from "@/components/user-avatar";
import type { TaskAssignee } from "@/lib/types";
import { cn } from "@/lib/utils";

/** Compact overlapping avatars for a task's assignees. */
export function AssigneeStack({
  assignees,
  max = 3,
  className,
  avatarClassName = "size-5 [&_[data-slot=avatar-fallback]]:text-[0.4375rem]",
}: {
  assignees: TaskAssignee[];
  max?: number;
  className?: string;
  avatarClassName?: string;
}) {
  if (assignees.length === 0) {
    return (
      <span
        className={cn(
          "inline-block rounded-full border border-dashed border-border/80",
          avatarClassName.split(" ").find((c) => c.startsWith("size-")),
          className,
        )}
        title="Unassigned"
      />
    );
  }
  const shown = assignees.slice(0, max);
  const extra = assignees.length - shown.length;
  return (
    <span
      className={cn("flex items-center -space-x-1.5", className)}
      title={assignees.map((a) => a.name).join(", ")}
    >
      {shown.map((assignee) => (
        <UserAvatar
          key={assignee.id}
          name={assignee.name}
          image={assignee.image}
          className={cn("border-2 border-card", avatarClassName)}
        />
      ))}
      {extra > 0 && (
        <span className="z-10 pl-2 text-[0.5625rem] font-medium text-muted-foreground">
          +{extra}
        </span>
      )}
    </span>
  );
}
