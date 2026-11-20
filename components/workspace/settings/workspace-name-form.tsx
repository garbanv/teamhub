"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function WorkspaceNameForm({
  workspaceId,
  slug,
  name,
  canEdit,
}: {
  workspaceId: string;
  slug: string;
  name: string;
  canEdit: boolean;
}) {
  const router = useRouter();
  const [value, setValue] = React.useState(name);
  const [loading, setLoading] = React.useState(false);
  const dirty = value.trim() !== name && value.trim().length >= 2;

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!dirty || loading) return;
    setLoading(true);
    try {
      const response = await fetch(`/api/workspaces/${workspaceId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: value.trim() }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error || "Could not save changes.");
      toast.success("Workspace name updated.");
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not save changes.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={save} className="space-y-4 px-4 py-4 sm:px-5">
      <div className="grid gap-4 sm:grid-cols-[1fr_1fr]">
        <div className="space-y-1.5">
          <Label htmlFor="workspace-name">Workspace name</Label>
          <Input
            id="workspace-name"
            value={value}
            onChange={(event) => setValue(event.target.value)}
            disabled={!canEdit || loading}
            maxLength={60}
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="workspace-url">Workspace URL</Label>
          <Input
            id="workspace-url"
            value={`/w/${slug}`}
            readOnly
            disabled
            className="font-mono text-[11.5px]"
          />
        </div>
      </div>
      <div className="flex items-center justify-between gap-3">
        <p className="text-[10.5px] text-muted-foreground/70">
          {canEdit
            ? "The URL stays stable when you rename the workspace."
            : "Only workspace admins can change the name."}
        </p>
        {canEdit && (
          <Button type="submit" size="sm" disabled={!dirty || loading}>
            {loading && <Loader2 className="size-3.5 animate-spin" />}
            Save changes
          </Button>
        )}
      </div>
    </form>
  );
}
