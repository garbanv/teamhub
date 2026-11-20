"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";

export function AcceptInvitationButton({
  token,
  disabled,
  allowAccept = true,
}: {
  token: string;
  disabled?: boolean;
  allowAccept?: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = React.useState(false);
  const [switching, setSwitching] = React.useState(false);

  async function accept() {
    setLoading(true);
    try {
      const response = await fetch(`/api/invitations/${token}/accept`, {
        method: "POST",
      });
      const data = (await response.json()) as {
        workspace?: { workspaceSlug: string };
        error?: string;
      };
      if (!response.ok || !data.workspace) {
        throw new Error(data.error || "Could not accept invitation.");
      }
      toast.success("Welcome to the workspace.");
      router.push(`/w/${data.workspace.workspaceSlug}`);
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not accept invitation.",
      );
      setLoading(false);
    }
  }

  async function switchAccount() {
    setSwitching(true);
    await authClient.signOut();
    router.push(`/login?next=${encodeURIComponent(`/invite/${token}`)}`);
    router.refresh();
  }

  return (
    <div className="space-y-2">
      {allowAccept && (
        <Button
          className="w-full"
          onClick={accept}
          disabled={disabled || loading || switching}
        >
          {loading ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            "Accept invitation"
          )}
        </Button>
      )}
      <Button
        variant={allowAccept ? "ghost" : "default"}
        className="w-full"
        onClick={switchAccount}
        disabled={loading || switching}
      >
        {switching ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          "Use a different account"
        )}
      </Button>
    </div>
  );
}
