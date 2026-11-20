"use client";

import * as React from "react";
import { useTheme } from "next-themes";
import { Check, Monitor, Moon, Sun } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => setMounted(true), []);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size={compact ? "icon-sm" : "icon"}
          className="text-muted-foreground hover:text-foreground"
          aria-label="Change theme"
        >
          {mounted && resolvedTheme === "dark" ? (
            <Moon className="size-4" />
          ) : (
            <Sun className="size-4" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        <DropdownMenuLabel>Appearance</DropdownMenuLabel>
        {[
          { value: "light", label: "Light", icon: Sun },
          { value: "dark", label: "Dark", icon: Moon },
          { value: "system", label: "System", icon: Monitor },
        ].map((option) => (
          <DropdownMenuItem
            key={option.value}
            onClick={() => setTheme(option.value)}
            className="gap-2"
          >
            <option.icon className="size-3.5" />
            {option.label}
            {mounted && theme === option.value && (
              <Check className="ml-auto size-3.5" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
