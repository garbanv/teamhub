import { notFound, redirect } from "next/navigation";

import { getCurrentUser } from "./session";
import { getWorkspaceForUser } from "./workspaces";

export async function requireWorkspacePage(slug: string) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const workspace = await getWorkspaceForUser(slug, user.id);
  if (!workspace) notFound();

  return { user, workspace };
}
