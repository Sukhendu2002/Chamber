import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getSubscriptions } from "@/lib/actions/subscriptions";
import { getUserSettings } from "@/lib/actions/settings";
import { getAccounts } from "@/lib/actions/accounts";
import { SubscriptionCalendar } from "@/components/subscription-calendar";
import { AddSubscriptionDialog } from "@/components/add-subscription-dialog";

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
    <div className="flex flex-col gap-4 p-4 sm:gap-6 md:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Subscriptions</h1>
          <p className="text-muted-foreground">
            Track your recurring subscriptions and get reminders before renewal
          </p>
        </div>
        <AddSubscriptionDialog accounts={accountOptions} />
      </div>

      <SubscriptionCalendar 
        subscriptions={subscriptions} 
        currency={settings?.currency || "INR"}
        accounts={accountOptions}
      />
    </div>
  );
}
