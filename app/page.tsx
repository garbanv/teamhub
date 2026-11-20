import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/session";
import { getWorkspacesForUser } from "@/lib/workspaces";

export const dynamic = "force-dynamic";

export default async function RootPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const workspaces = await getWorkspacesForUser(user.id);
  if (workspaces.length === 0) redirect("/onboarding");

  redirect(`/w/${workspaces[0]!.slug}`);
}
