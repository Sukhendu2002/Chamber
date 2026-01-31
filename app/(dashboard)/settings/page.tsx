import { getUserSettings } from "@/lib/actions/settings";
import { SettingsForm } from "@/components/settings-form";

export default async function SettingsPage() {
  const settings = await getUserSettings();

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Manage your account preferences
        </p>
      </div>

      <SettingsForm initialSettings={settings} />
    </div>
  );
}
