"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

export function NewDocPageButton({
  workspaceId,
  workspaceSlug,
  parentId,
  variant = "default",
  size = "sm",
  label = "New page",
}: {
  workspaceId: string;
  workspaceSlug: string;
  parentId?: string | null;
  variant?: React.ComponentProps<typeof Button>["variant"];
  size?: React.ComponentProps<typeof Button>["size"];
  label?: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = React.useState(false);

  async function create() {
    if (loading) return;
    setLoading(true);
    try {
      const response = await fetch(
        `/api/workspaces/${workspaceId}/docs/pages`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ parentId: parentId ?? null }),
        },
      );
      const data = (await response.json()) as {
        page?: { id: string };
        error?: string;
      };
      if (!response.ok || !data.page) {
        throw new Error(data.error || "Could not create the page.");
      }
      router.push(`/w/${workspaceSlug}/docs/${data.page.id}`);
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not create the page.",
      );
      setLoading(false);
    }
  }

  return (
    <Button variant={variant} size={size} onClick={create} disabled={loading}>
      {loading ? (
        <Loader2 className="size-3.5 animate-spin" />
      ) : (
        <Plus className="size-3.5" />
      )}
      {label}
    </Button>
  );
}
