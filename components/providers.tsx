"use client";

import * as React from "react";
import { ThemeProvider, useTheme } from "next-themes";
import { Toaster } from "sonner";

import { TooltipProvider } from "@/components/ui/tooltip";

function AppToaster() {
  const { resolvedTheme } = useTheme();
  return (
    <Toaster
      theme={(resolvedTheme as "light" | "dark" | undefined) ?? "system"}
      position="bottom-right"
      toastOptions={{
        classNames: {
          toast:
            "!rounded-lg !border !border-border !bg-popover !text-popover-foreground !shadow-[0_16px_48px_-16px_rgba(16,16,24,0.35)]",
          description: "!text-muted-foreground",
          actionButton: "!bg-primary !text-primary-foreground",
        },
      }}
    />
  );
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <TooltipProvider delayDuration={250}>
        {children}
        <AppToaster />
      </TooltipProvider>
    </ThemeProvider>
  );
}
