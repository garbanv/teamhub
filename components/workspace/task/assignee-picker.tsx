"use client";

import * as React from "react";
import { ChevronDown } from "lucide-react";

import { AssigneeStack } from "@/components/workspace/task/assignee-stack";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { WorkspaceMember } from "@/lib/types";
import { cn } from "@/lib/utils";

/** Multi-select assignee dropdown. `value` is a list of user ids. */
export function AssigneePicker({
  members,
  value,
  onChange,
  disabled,
  className,
}: {
  members: WorkspaceMember[];
  value: string[];
  onChange: (next: string[]) => void;
  disabled?: boolean;
  className?: string;
}) {
  const selected = members
    .filter((member) => value.includes(member.userId))
    .map((member) => ({
      id: member.userId,
      name: member.name,
      image: member.image ?? null,
    }));

  function toggle(userId: string) {
    onChange(
      value.includes(userId)
        ? value.filter((id) => id !== userId)
        : [...value, userId],
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        disabled={disabled}
        className={cn(
          "flex h-8 w-full items-center justify-between gap-2 rounded-md px-1.5 text-left text-[0.7188rem] outline-none hover:bg-accent focus-visible:ring-0 disabled:opacity-50",
          className,
        )}
      >
        <span className="flex min-w-0 items-center gap-1.5">
          <AssigneeStack
            assignees={selected}
            avatarClassName="size-4 [&_[data-slot=avatar-fallback]]:text-[0.375rem]"
          />
          <span className="truncate">
            {selected.length === 0
              ? "Unassigned"
              : selected.length === 1
                ? selected[0]!.name
                : `${selected.length} assignees`}
          </span>
        </span>
        <ChevronDown className="size-3 shrink-0 text-muted-foreground/60" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="max-h-72 min-w-52 overflow-y-auto">
        <DropdownMenuLabel>Assignees</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {members.map((member) => (
          <DropdownMenuCheckboxItem
            key={member.userId}
            checked={value.includes(member.userId)}
            onSelect={(event) => event.preventDefault()}
            onCheckedChange={() => toggle(member.userId)}
          >
            {member.name}
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
