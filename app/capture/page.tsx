import type { Metadata } from "next";
import Link from "next/link";
import { IconArrowLeft, IconShieldCheck } from "@tabler/icons-react";
import {
  AndroidShareInstructions,
  PwaCapture,
  PwaInstallButton,
} from "@/components/pwa-capture";
import { Button } from "@/components/ui/button";
import { getAccounts } from "@/lib/actions/accounts";
import { getUserCategories } from "@/lib/actions/categories";
import { getUserSettings } from "@/lib/actions/settings";

export const metadata: Metadata = {
  title: "Quick Capture | Chamber",
  description: "Share a payment screenshot to Chamber or add an expense manually.",
};

export default async function CapturePage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string; source?: string }>;
}) {
  const params = await searchParams;
  const initialMode = params.mode === "manual" ? "manual" : "screenshot";
  const [accounts, categories, settings] = await Promise.all([
    getAccounts(),
    getUserCategories(),
    getUserSettings(),
  ]);

  return (
    <main className="min-h-dvh bg-background text-foreground">
      <div className="mx-auto w-full max-w-3xl px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))] sm:px-6">
        <header className="mb-8 flex items-center justify-between gap-3">
          <Button asChild variant="ghost" className="min-h-11">
            <Link href="/dashboard">
              <IconArrowLeft aria-hidden="true" />
              Dashboard
            </Link>
          </Button>
          <PwaInstallButton />
        </header>

        <section className="mb-8">
          <div className="mb-3 flex size-10 items-center justify-center rounded-md bg-secondary text-primary">
            <IconShieldCheck aria-hidden="true" className="size-6" />
          </div>
          <h1 className="page-title">Quick Capture</h1>
          <p className="mt-2 max-w-xl text-sm text-muted-foreground">
            Chamber cannot float above or capture another app from a PWA. Android can
            securely hand Chamber a screenshot through the system Share menu.
          </p>
        </section>

        <PwaCapture
          accounts={accounts.map((account) => ({
            id: account.id,
            name: account.name,
            type: account.type,
            currentBalance: account.currentBalance,
            creditLimit: account.creditLimit,
          }))}
          categories={categories.map((category) => ({
            id: category.id,
            name: category.name,
          }))}
          currency={settings.currency}
          initialMode={initialMode}
          source={params.source}
        />

        <section className="mt-6">
          <AndroidShareInstructions />
        </section>
      </div>
    </main>
  );
}
