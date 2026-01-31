import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  IconBrain,
  IconBrandTelegram,
  IconChartBar,
} from "@tabler/icons-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground font-bold">
              C
            </div>
            <span className="font-semibold">Chamber</span>
          </div>
          <Link href="/dashboard">
            <Button variant="default" size="sm">
              Go to Dashboard →
            </Button>
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <main className="container mx-auto px-4">
        <section className="flex flex-col items-center justify-center py-24 text-center">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
            AI-Powered Expense Tracking
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-muted-foreground">
            Eliminate the friction of manual expense tracking. Input anywhere
            via Telegram or Web, and let AI automatically categorize your
            spending.
          </p>
          <div className="mt-10">
            <Link href="/dashboard">
              <Button size="lg">
                Get Started →
              </Button>
            </Link>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-16">
          <div className="grid gap-8 md:grid-cols-3">
            <Card className="border bg-card">
              <CardContent className="flex flex-col items-center p-8 text-center">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                  <IconBrain className="h-6 w-6" />
                </div>
                <h3 className="mb-2 font-semibold">Smart Capture</h3>
                <p className="text-sm text-muted-foreground">
                  Send &quot;Lunch 450&quot; via Telegram and AI extracts
                  amount, category, and merchant automatically.
                </p>
              </CardContent>
            </Card>

            <Card className="border bg-card">
              <CardContent className="flex flex-col items-center p-8 text-center">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                  <IconBrandTelegram className="h-6 w-6" />
                </div>
                <h3 className="mb-2 font-semibold">Telegram Integration</h3>
                <p className="text-sm text-muted-foreground">
                  Link your Telegram account and track expenses on the go. Just
                  send a message or photo.
                </p>
              </CardContent>
            </Card>

            <Card className="border bg-card">
              <CardContent className="flex flex-col items-center p-8 text-center">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                  <IconChartBar className="h-6 w-6" />
                </div>
                <h3 className="mb-2 font-semibold">Deep Analytics</h3>
                <p className="text-sm text-muted-foreground">
                  Visualize spending patterns, track budgets, and import bank
                  statements for reconciliation.
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t py-8 text-center text-sm text-muted-foreground">
          Built with TanStack Start, Prisma, and Gemini AI
        </footer>
      </main>
    </div>
  );
}
