import type { Metadata } from "next";
import { SlidersHorizontal } from "lucide-react";

import {
  DefaultViewSetting,
  TextSizeSetting,
} from "@/components/workspace/settings/preferences-form";
import {
  Card,
  CardHeader,
  PageHeader,
  PageShell,
} from "@/components/workspace/page";
import { getUserPreferences } from "@/lib/preferences";
import { requireWorkspacePage } from "@/lib/workspace-page";

export const metadata: Metadata = { title: "My preferences" };

export default async function PreferencesPage({
  params,
}: {
  params: Promise<{ workspace: string }>;
}) {
  const { workspace: slug } = await params;
  const { user } = await requireWorkspacePage(slug);
  const preferences = await getUserPreferences(user.id);

  return (
    <PageShell className="max-w-[55rem]">
      <PageHeader
        eyebrow={
          <>
            <SlidersHorizontal className="size-3" />
            Personal
          </>
        }
        title="My preferences"
        description="These only change how Hub looks and works for you."
      />

      <div className="mt-6 space-y-5">
        <Card>
          <CardHeader
            title="Default project view"
            description="How a project opens when you visit it. You can still switch views any time."
          />
          <DefaultViewSetting initialValue={preferences.defaultProjectView} />
        </Card>

        <Card>
          <CardHeader
            title="Text size"
            description="Make everything in Hub larger. Saved on this device."
          />
          <TextSizeSetting />
        </Card>
      </div>
    </PageShell>
  );
}
