import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { AuthShell } from "@/components/auth/auth-shell";
import { CreateWorkspaceForm } from "@/components/auth/create-workspace-form";
import { WorkspaceGlyph } from "@/components/logo";
import { requireUser } from "@/lib/session";
import { getWorkspacesForUser } from "@/lib/workspaces";

export const metadata: Metadata = {
  title: "Create workspace",
};

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ new?: string }>;
}) {
  const user = await requireUser("/onboarding");
  const workspaces = await getWorkspacesForUser(user.id);
  const params = await searchParams;
  const creatingAnother = params.new === "1";

  if (workspaces.length > 0 && !creatingAnother) {
    redirect(`/w/${workspaces[0]!.slug}`);
  }

  const firstName = user.name.split(" ")[0] ?? "";

  return (
    <AuthShell footer="One workspace, then the real work.">
      <div>
        {workspaces.length > 0 && (
          <Link
            href={`/w/${workspaces[0]!.slug}`}
            className="mb-7 inline-flex items-center gap-1.5 text-[0.75rem] text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="size-3.5" />
            Back to {workspaces[0]!.name}
          </Link>
        )}

        <div className="mb-8">
          <p className="mb-3 text-[0.6875rem] font-medium tracking-[0.12em] text-muted-foreground/70 uppercase">
            {creatingAnother ? "New workspace" : `Hi, ${firstName}`}
          </p>
          <h1 className="text-[1.6875rem] font-semibold tracking-[-0.03em]">
            {creatingAnother ? "Create another workspace" : "Make a home for your team"}
          </h1>
          <p className="mt-2 text-[0.8125rem] leading-5 text-muted-foreground">
            {creatingAnother
              ? "Keep a separate space for another team or project."
              : "Set up your workspace, then invite the people you work with."}
          </p>
        </div>

        {workspaces.length > 0 && (
          <div className="mb-5 flex items-center gap-2.5 rounded-lg border border-border bg-card px-3 py-2.5">
            <WorkspaceGlyph
              name={workspaces[0]!.name}
              color={workspaces[0]!.logoColor}
            />
            <div className="min-w-0">
              <p className="truncate text-[0.7812rem] font-medium">
                {workspaces[0]!.name}
              </p>
              <p className="text-[0.6562rem] text-muted-foreground">
                {workspaces[0]!.memberCount} member
                {workspaces[0]!.memberCount === 1 ? "" : "s"}
              </p>
            </div>
          </div>
        )}

        <CreateWorkspaceForm
          hasWorkspace={workspaces.length > 0}
          defaultName={workspaces.length === 0 ? `${firstName}'s workspace` : ""}
        />

        <p className="mt-7 text-center text-[0.6875rem] leading-4 text-muted-foreground/60">
          Signed in as {user.email}
        </p>
      </div>
    </AuthShell>
  );
}
