import { getUserSettings } from "@/lib/actions/settings";
import { SettingsForm } from "@/components/settings-form";
import { PageShell } from "@/components/page-shell";
import { getOpenRouterAnalysisModels } from "@/lib/openrouter-models";

export default async function SettingsPage() {
  const [settings, availableModels] = await Promise.all([
    getUserSettings(),
    getOpenRouterAnalysisModels(),
  ]);

  return (
    <PageShell>
      <SettingsForm initialSettings={settings} availableModels={availableModels} />
    </PageShell>
  );
}
