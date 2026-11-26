import type { Metadata } from "next";
import { Mail, Settings2, Shield, Users } from "lucide-react";

import { InviteMemberDialog } from "@/components/workspace/invite-member-dialog";
import { DeletePermissionsForm } from "@/components/workspace/settings/delete-permissions-form";
import { InvitationsList } from "@/components/workspace/settings/invitations-list";
import { MembersList } from "@/components/workspace/settings/members-list";
import { WorkspaceNameForm } from "@/components/workspace/settings/workspace-name-form";
import {
  Card,
  CardHeader,
  PageHeader,
  PageShell,
} from "@/components/workspace/page";
import { Badge } from "@/components/ui/badge";
import { canManageWorkspace } from "@/lib/permissions";
import {
  getPendingInvitations,
  getWorkspaceMembers,
} from "@/lib/workspaces";
import { requireWorkspacePage } from "@/lib/workspace-page";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage({
  params,
}: {
  params: Promise<{ workspace: string }>;
}) {
  const { workspace: slug } = await params;
  const { user, workspace } = await requireWorkspacePage(slug);
  const canManage = canManageWorkspace(workspace.role);

  const [members, invitations] = await Promise.all([
    getWorkspaceMembers(workspace.id),
    canManage ? getPendingInvitations(workspace.id) : Promise.resolve([]),
  ]);

  return (
    <PageShell className="max-w-[55rem]">
      <PageHeader
        eyebrow={
          <>
            <Settings2 className="size-3" />
            Workspace
          </>
        }
        title="Settings"
        description={`Manage ${workspace.name}, its members, and who can join.`}
        actions={
          canManage ? (
            <InviteMemberDialog
              workspaceId={workspace.id}
              workspaceName={workspace.name}
            />
          ) : null
        }
      />

      {!canManage && (
        <div className="mt-5 flex items-start gap-2.5 rounded-lg border border-border bg-muted/30 px-3.5 py-3">
          <Shield className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
          <p className="text-[0.7188rem] leading-4 text-muted-foreground">
            You&apos;re a member of this workspace. Ask an owner or admin if you
            need something changed.
          </p>
        </div>
      )}

      <div className="mt-6 space-y-5">
        <Card>
          <CardHeader
            title="General"
            description="The name and address your team sees."
          />
          <WorkspaceNameForm
            workspaceId={workspace.id}
            slug={workspace.slug}
            name={workspace.name}
            canEdit={canManage}
          />
        </Card>

        <Card>
          <CardHeader
            title="Permissions"
            description="What regular members are allowed to delete."
          />
          <DeletePermissionsForm
            workspaceId={workspace.id}
            initial={{
              membersCanDeleteTasks: workspace.membersCanDeleteTasks,
              membersCanDeleteDocs: workspace.membersCanDeleteDocs,
            }}
            canEdit={canManage}
          />
        </Card>

        <Card id="members" className="scroll-mt-20">
          <CardHeader
            title={
              <span className="flex items-center gap-2">
                <Users className="size-3.5 text-muted-foreground" />
                Members
              </span>
            }
            description="Everyone with access to this workspace."
            actions={
              <Badge variant="outline">
                {members.length} member{members.length === 1 ? "" : "s"}
              </Badge>
            }
          />
          <MembersList
            workspaceId={workspace.id}
            members={members}
            currentUserId={user.id}
            callerRole={workspace.role}
          />
          {workspace.role === "owner" && (
            <div className="border-t border-border/70 px-4 py-2.5 sm:px-5">
              <p className="text-[0.625rem] text-muted-foreground/65">
                Owners can change roles and remove members. At least one owner
                must remain in the workspace.
              </p>
            </div>
          )}
        </Card>

        {canManage && (
          <Card id="invitations" className="scroll-mt-20">
            <CardHeader
              title={
                <span className="flex items-center gap-2">
                  <Mail className="size-3.5 text-muted-foreground" />
                  Pending invitations
                </span>
              }
              description="Invite links that haven't been accepted yet."
              actions={
                <InviteMemberDialog
                  workspaceId={workspace.id}
                  workspaceName={workspace.name}
                />
              }
            />
            <InvitationsList
              workspaceId={workspace.id}
              invitations={invitations}
            />
          </Card>
        )}
      </div>

      <p className="mt-6 text-[0.625rem] text-muted-foreground/50">
        Workspace ID · <span className="font-mono">{workspace.id}</span>
      </p>
    </PageShell>
  );
}
