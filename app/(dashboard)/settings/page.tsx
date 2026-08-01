import { getUserSettings } from "@/lib/actions/settings";
import { SettingsForm } from "@/components/settings-form";
import { PageShell } from "@/components/page-shell";

export default async function SettingsPage() {
  const settings = await getUserSettings();

  return (
    <PageShell>
      <SettingsForm initialSettings={settings} />
    </PageShell>
  );
}
