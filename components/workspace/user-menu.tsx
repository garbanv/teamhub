"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { LogOut, Settings2, SlidersHorizontal } from "lucide-react";

import { UserAvatar } from "@/components/user-avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { authClient } from "@/lib/auth-client";
import type { SessionUser } from "@/lib/types";

export function UserMenu({
  user,
  workspaceSlug,
}: {
  user: SessionUser;
  workspaceSlug: string;
}) {
  const router = useRouter();
  const [signingOut, setSigningOut] = React.useState(false);

  async function signOut() {
    setSigningOut(true);
    await authClient.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left transition-colors hover:bg-sidebar-accent/70 focus-visible:ring-2 focus-visible:ring-sidebar-ring/50 focus-visible:outline-none">
          <UserAvatar
            name={user.name}
            image={user.image}
            className="size-7 border-0"
          />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[0.7812rem] font-medium">
              {user.name}
            </span>
            <span className="block truncate text-[0.6562rem] text-muted-foreground">
              {user.email}
            </span>
          </span>
          <span className="size-1.5 rounded-full bg-success/80" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" side="top" className="w-[15.25rem]">
        <DropdownMenuLabel className="font-normal normal-case">
          <div className="flex items-center gap-2.5 py-1">
            <UserAvatar name={user.name} image={user.image} className="size-8" />
            <div className="min-w-0">
              <p className="truncate text-[0.7812rem] font-medium text-foreground">
                {user.name}
              </p>
              <p className="truncate text-[0.6562rem] text-muted-foreground">
                {user.email}
              </p>
            </div>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <a href={`/w/${workspaceSlug}/preferences`} className="gap-2">
            <SlidersHorizontal className="size-3.5" />
            My preferences
          </a>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <a href={`/w/${workspaceSlug}/settings`} className="gap-2">
            <Settings2 className="size-3.5" />
            Workspace settings
          </a>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={signOut}
          disabled={signingOut}
          className="gap-2"
        >
          <LogOut className="size-3.5" />
          {signingOut ? "Signing out…" : "Sign out"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
