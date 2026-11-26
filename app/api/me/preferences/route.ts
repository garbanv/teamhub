import { NextResponse } from "next/server";
import { z } from "zod";

import { requireApiUser, routeError } from "@/lib/api";
import { getUserPreferences, updateUserPreferences } from "@/lib/preferences";
import { projectTaskViews } from "@/lib/task-view";

export const runtime = "nodejs";

const updatePreferencesSchema = z.object({
  defaultProjectView: z.enum(projectTaskViews),
});

export async function GET() {
  try {
    const user = await requireApiUser();
    return NextResponse.json({ preferences: await getUserPreferences(user.id) });
  } catch (error) {
    return routeError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await requireApiUser();
    const input = updatePreferencesSchema.parse(await request.json());
    const preferences = await updateUserPreferences(user.id, input);
    return NextResponse.json({ preferences });
  } catch (error) {
    return routeError(error);
  }
}
