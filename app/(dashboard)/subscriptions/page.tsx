import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getSubscriptions } from "@/lib/actions/subscriptions";
import { getUserSettings } from "@/lib/actions/settings";
import { getAccounts } from "@/lib/actions/accounts";
import { SubscriptionCalendar } from "@/components/subscription-calendar";
import { AddSubscriptionDialog } from "@/components/add-subscription-dialog";
import { PageHeader, PageShell } from "@/components/page-shell";

export default async function SubscriptionsPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const [subscriptions, settings, accounts] = await Promise.all([
    getSubscriptions(),
    getUserSettings(),
    getAccounts(),
  ]);

  const accountOptions = accounts.map(a => ({ id: a.id, name: a.name, type: a.type }));

  return (
    <PageShell className="flex flex-col gap-4">
      <PageHeader
        className="mb-0"
        title="Subscriptions"
        description="Track recurring payments and get reminders before renewal"
        actions={<AddSubscriptionDialog accounts={accountOptions} />}
      />

      <SubscriptionCalendar 
        subscriptions={subscriptions} 
        currency={settings?.currency || "INR"}
        accounts={accountOptions}
      />
    </PageShell>
  );
}
