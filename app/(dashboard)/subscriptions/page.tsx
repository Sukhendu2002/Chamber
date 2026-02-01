import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getSubscriptions } from "@/lib/actions/subscriptions";
import { getUserSettings } from "@/lib/actions/settings";
import { SubscriptionCalendar } from "@/components/subscription-calendar";
import { AddSubscriptionDialog } from "@/components/add-subscription-dialog";

export default async function SubscriptionsPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const [subscriptions, settings] = await Promise.all([
    getSubscriptions(),
    getUserSettings(),
  ]);

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Subscriptions</h1>
          <p className="text-muted-foreground">
            Track your recurring subscriptions and get reminders before renewal
          </p>
        </div>
        <AddSubscriptionDialog />
      </div>

      <SubscriptionCalendar 
        subscriptions={subscriptions} 
        currency={settings?.currency || "INR"} 
      />
    </div>
  );
}
