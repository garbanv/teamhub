import {
  Box,
  FolderKanban,
  Globe2,
  Layers,
  Palette,
  Rocket,
  Smartphone,
  Sparkles,
} from "lucide-react";

import type { ProjectIconName } from "@/lib/project-constants";
import { cn } from "@/lib/utils";

const iconMap = {
  folder: FolderKanban,
  globe: Globe2,
  smartphone: Smartphone,
  palette: Palette,
  rocket: Rocket,
  layers: Layers,
  sparkles: Sparkles,
  box: Box,
} satisfies Record<ProjectIconName, React.ComponentType<{ className?: string }>>;

export function ProjectIcon({
  icon,
  className,
}: {
  icon: string;
  className?: string;
}) {
  const Icon = iconMap[icon as ProjectIconName] ?? FolderKanban;
  return <Icon className={cn("size-4", className)} aria-hidden="true" />;
}

export function ProjectGlyph({
  icon,
  color,
  className,
}: {
  icon: string;
  color: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "flex size-8 shrink-0 items-center justify-center rounded-lg text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.24)]",
        className,
      )}
      style={{ backgroundColor: color }}
    >
      <ProjectIcon icon={icon} className="size-4" />
    </span>
  );
}
