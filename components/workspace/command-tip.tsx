"use client";

import { Command, CornerDownLeft } from "lucide-react";

import { useCommandMenu } from "@/components/workspace/command-palette";

export function CommandTip() {
  const { open } = useCommandMenu();

  return (
    <button
      onClick={open}
      className="group flex w-full items-center gap-3.5 rounded-xl border border-border/80 bg-card px-4 py-3.5 text-left shadow-[0_1px_2px_rgba(16,16,24,0.02)] transition-colors hover:border-border hover:bg-accent/25"
    >
      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-border bg-muted/40 text-muted-foreground transition-colors group-hover:bg-card">
        <Command className="size-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[12.5px] font-medium">
          Jump anywhere, fast
        </span>
        <span className="block text-[11px] leading-4 text-muted-foreground">
          Search tasks, projects, and pages.
        </span>
      </span>
      <span className="flex items-center gap-1">
        <kbd className="rounded border border-border bg-muted/50 px-1.5 py-0.5 text-[9px] font-medium text-muted-foreground">
          ⌘K
        </kbd>
        <CornerDownLeft className="size-3 text-muted-foreground/40" />
      </span>
    </button>
  );
}
