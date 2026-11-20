"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, ChevronsUpDown, Plus, Settings2 } from "lucide-react";

import { WorkspaceGlyph } from "@/components/logo";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { WorkspaceSummary } from "@/lib/types";
import { cn } from "@/lib/utils";

export function WorkspaceSwitcher({
  workspace,
  workspaces,
}: {
  workspace: WorkspaceSummary;
  workspaces: WorkspaceSummary[];
}) {
  const router = useRouter();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="h-auto w-full justify-start gap-2.5 rounded-lg px-2 py-2 text-left hover:bg-sidebar-accent/70"
        >
          <WorkspaceGlyph name={workspace.name} color={workspace.logoColor} />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[13px] leading-4 font-semibold tracking-[-0.01em]">
              {workspace.name}
            </span>
            <span className="block truncate text-[10.5px] leading-3.5 font-normal text-muted-foreground">
              {workspace.memberCount} member
              {workspace.memberCount === 1 ? "" : "s"}
            </span>
          </span>
          <ChevronsUpDown className="size-3.5 shrink-0 text-muted-foreground/60" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start" sideOffset={6} className="w-[244px]">
        <DropdownMenuLabel>Workspaces</DropdownMenuLabel>
        {workspaces.map((item) => (
          <DropdownMenuItem
            key={item.id}
            className="gap-2.5 py-2"
            onSelect={() => {
              if (item.id !== workspace.id) router.push(`/w/${item.slug}`);
            }}
          >
            <WorkspaceGlyph
              name={item.name}
              color={item.logoColor}
              className="size-6 rounded-md text-[10px]"
            />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[12.5px] font-medium">
                {item.name}
              </span>
              <span className="block truncate text-[10px] text-muted-foreground">
                {item.memberCount} member{item.memberCount === 1 ? "" : "s"}
              </span>
            </span>
            {item.id === workspace.id && (
              <Check className="size-3.5 text-muted-foreground" />
            )}
          </DropdownMenuItem>
        ))}

        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/onboarding?new=1" className="gap-2">
            <span className="flex size-6 items-center justify-center rounded-md border border-dashed border-border">
              <Plus className="size-3.5" />
            </span>
            <span className="text-[12.5px]">Create workspace</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href={`/w/${workspace.slug}/settings`} className="gap-2">
            <span className="flex size-6 items-center justify-center rounded-md border border-border/70 bg-card">
              <Settings2 className="size-3.5" />
            </span>
            <span className="text-[12.5px]">Workspace settings</span>
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
