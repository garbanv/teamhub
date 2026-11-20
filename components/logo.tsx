import * as React from "react";

import { workspaceColor } from "@/lib/colors";
import { cn, initials } from "@/lib/utils";

export function HubMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "relative inline-flex size-7 shrink-0 items-center justify-center overflow-hidden rounded-[8px] bg-[linear-gradient(135deg,#f97362_0%,#8b7cf6_52%,#4f46e5_100%)] text-white shadow-[0_1px_2px_rgba(30,20,80,0.28),inset_0_1px_0_rgba(255,255,255,0.22)]",
        className,
      )}
    >
      <svg viewBox="0 0 24 24" aria-hidden="true" className="size-[18px]">
        <path
          d="M12 5.2 6.1 8.6v6.8L12 18.8l5.9-3.4V8.6L12 5.2Z"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.2"
          strokeLinejoin="round"
          opacity="0.72"
        />
        <circle cx="12" cy="12" r="2.5" fill="currentColor" />
        <circle cx="12" cy="5.2" r="1.45" fill="currentColor" />
        <circle cx="6.1" cy="15.4" r="1.45" fill="currentColor" />
        <circle cx="17.9" cy="15.4" r="1.45" fill="currentColor" />
      </svg>
    </span>
  );
}

export function Logo({
  className,
  showWordmark = true,
}: {
  className?: string;
  showWordmark?: boolean;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <HubMark />
      {showWordmark && (
        <span className="text-[15px] font-semibold tracking-[-0.02em]">
          Hub
        </span>
      )}
    </span>
  );
}

export function WorkspaceGlyph({
  name,
  color,
  className,
}: {
  name: string;
  color?: string | null;
  className?: string;
}) {
  const theme = workspaceColor(color);
  return (
    <span
      className={cn(
        "relative inline-flex size-7 shrink-0 items-center justify-center overflow-hidden rounded-[8px] text-[11px] font-semibold tracking-wide text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.25),0_1px_2px_rgba(16,16,24,0.12)]",
        className,
      )}
      style={{
        backgroundImage: `linear-gradient(145deg, ${theme.from}, ${theme.to})`,
      }}
      aria-hidden="true"
    >
      {initials(name)}
    </span>
  );
}
