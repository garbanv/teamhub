"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function CreateWorkspaceForm({
  hasWorkspace,
  defaultName,
}: {
  hasWorkspace?: boolean;
  defaultName?: string;
}) {
  const router = useRouter();
  const [name, setName] = React.useState(defaultName ?? "");
  const [loading, setLoading] = React.useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    try {
      const response = await fetch("/api/workspaces", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = (await response.json()) as {
        workspace?: { slug: string };
        error?: string;
      };
      if (!response.ok || !data.workspace) {
        throw new Error(data.error || "Could not create workspace.");
      }
      toast.success("Workspace created.");
      router.push(`/w/${data.workspace.slug}`);
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not create workspace.",
      );
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-1.5">
        <Label htmlFor="workspace-name">Workspace name</Label>
        <Input
          id="workspace-name"
          autoFocus
          placeholder="Acme Studio"
          value={name}
          onChange={(event) => setName(event.target.value)}
          required
          minLength={2}
          maxLength={60}
          disabled={loading}
          className="h-10"
        />
        <p className="text-[0.6875rem] leading-4 text-muted-foreground/70">
          This is usually your company or team name. You can change it later.
        </p>
      </div>

      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? (
          <Loader2 className="size-4 animate-spin" />
        ) : hasWorkspace ? (
          "Create workspace"
        ) : (
          "Create my workspace"
        )}
      </Button>
    </form>
  );
}
