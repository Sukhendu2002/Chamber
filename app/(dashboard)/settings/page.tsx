import { getUserSettings } from "@/lib/actions/settings";
import { SettingsForm } from "@/components/settings-form";
import { PageHeader, PageShell } from "@/components/page-shell";

export default async function SettingsPage() {
  const settings = await getUserSettings();

  return (
    <PageShell>
      <PageHeader
        title="Settings"
        description="Manage your account and product preferences"
      />

      <SettingsForm initialSettings={settings} />
    </PageShell>
  );
}
