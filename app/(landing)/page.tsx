import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  IconBrain,
  IconBrandTelegram,
  IconChartBar,
  IconMessagePlus,
  IconSparkles,
  IconLayoutDashboard,
  IconShieldLock,
  IconBuildingBank,
  IconCalendarRepeat,
  IconCash,
  IconArrowRight,
} from "@tabler/icons-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-sm">
        <div className="container mx-auto flex h-14 items-center justify-between px-4 sm:h-16">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground font-bold">
              C
            </div>
            <span className="font-semibold">Chamber</span>
          </div>
          <Link href="/dashboard">
            <Button variant="default" size="sm" className="rounded-md">
              <span className="hidden sm:inline">Go to Dashboard →</span>
              <span className="sm:hidden">Dashboard</span>
            </Button>
          </Link>
        </div>
      </header>

      <main>
        {/* Hero Section */}
        <section className="container mx-auto px-4">
          <div className="flex flex-col items-center justify-center px-2 py-16 text-center sm:py-20 md:py-28">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border bg-muted/50 px-3 py-1 text-xs font-medium text-muted-foreground sm:mb-6 sm:text-sm">
              <IconSparkles className="h-3.5 w-3.5" />
              AI-powered expense management
            </div>
            <h1 className="max-w-4xl text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl lg:text-6xl">
              Track Every Rupee,{" "}
              <span className="text-primary">Effortlessly</span>
            </h1>
            <p className="mt-4 max-w-2xl text-base text-muted-foreground sm:mt-6 sm:text-lg">
              Eliminate the friction of manual expense tracking. Input anywhere
              via Telegram or Web, and let AI automatically categorize your
              spending.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:mt-10 sm:flex-row sm:gap-4">
              <Link href="/dashboard">
                <Button size="lg" className="rounded-md px-6">
                  Get Started Free
                  <IconArrowRight className="ml-1 h-4 w-4" />
                </Button>
              </Link>
              <Link href="#features">
                <Button variant="outline" size="lg" className="rounded-md px-6">
                  See Features
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Stats Section */}
        <section className="border-y bg-muted/30">
          <div className="container mx-auto grid grid-cols-2 gap-4 px-4 py-8 sm:py-12 md:grid-cols-4 md:gap-8">
            <div className="text-center">
              <div className="text-2xl font-bold sm:text-3xl">100%</div>
              <div className="mt-1 text-xs text-muted-foreground sm:text-sm">Free &amp; Open Source</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold sm:text-3xl">10+</div>
              <div className="mt-1 text-xs text-muted-foreground sm:text-sm">Expense Categories</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold sm:text-3xl">AI</div>
              <div className="mt-1 text-xs text-muted-foreground sm:text-sm">Smart Categorization</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold sm:text-3xl">24/7</div>
              <div className="mt-1 text-xs text-muted-foreground sm:text-sm">Telegram Bot Access</div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="container mx-auto px-4 py-12 sm:py-16 md:py-20">
          <div className="mb-8 text-center sm:mb-12">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Everything You Need
            </h2>
            <p className="mt-2 text-sm text-muted-foreground sm:text-base">
              Powerful features to take control of your finances
            </p>
          </div>
          <div className="grid gap-4 sm:gap-6 md:grid-cols-3 md:gap-8">
            <Card className="border bg-card transition-shadow hover:shadow-md">
              <CardContent className="flex flex-col items-center p-6 text-center sm:p-8">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary sm:mb-4 sm:h-12 sm:w-12">
                  <IconBrain className="h-5 w-5 sm:h-6 sm:w-6" />
                </div>
                <h3 className="mb-2 font-semibold">Smart Capture</h3>
                <p className="text-sm text-muted-foreground">
                  Send &quot;Lunch 450&quot; via Telegram and AI extracts
                  amount, category, and merchant automatically.
                </p>
              </CardContent>
            </Card>

            <Card className="border bg-card transition-shadow hover:shadow-md">
              <CardContent className="flex flex-col items-center p-6 text-center sm:p-8">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-blue-500/10 text-blue-500 sm:mb-4 sm:h-12 sm:w-12">
                  <IconBrandTelegram className="h-5 w-5 sm:h-6 sm:w-6" />
                </div>
                <h3 className="mb-2 font-semibold">Telegram Integration</h3>
                <p className="text-sm text-muted-foreground">
                  Link your Telegram account and track expenses on the go. Just
                  send a message or photo.
                </p>
              </CardContent>
            </Card>

            <Card className="border bg-card transition-shadow hover:shadow-md">
              <CardContent className="flex flex-col items-center p-6 text-center sm:p-8">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-green-500/10 text-green-500 sm:mb-4 sm:h-12 sm:w-12">
                  <IconChartBar className="h-5 w-5 sm:h-6 sm:w-6" />
                </div>
                <h3 className="mb-2 font-semibold">Deep Analytics</h3>
                <p className="text-sm text-muted-foreground">
                  Visualize spending patterns, track budgets, and import bank
                  statements for reconciliation.
                </p>
              </CardContent>
            </Card>

            <Card className="border bg-card transition-shadow hover:shadow-md">
              <CardContent className="flex flex-col items-center p-6 text-center sm:p-8">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-purple-500/10 text-purple-500 sm:mb-4 sm:h-12 sm:w-12">
                  <IconBuildingBank className="h-5 w-5 sm:h-6 sm:w-6" />
                </div>
                <h3 className="mb-2 font-semibold">Multi-Account Tracking</h3>
                <p className="text-sm text-muted-foreground">
                  Track bank accounts, investments, wallets, and credit cards
                  all in one place with balance history.
                </p>
              </CardContent>
            </Card>

            <Card className="border bg-card transition-shadow hover:shadow-md">
              <CardContent className="flex flex-col items-center p-6 text-center sm:p-8">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-orange-500/10 text-orange-500 sm:mb-4 sm:h-12 sm:w-12">
                  <IconCalendarRepeat className="h-5 w-5 sm:h-6 sm:w-6" />
                </div>
                <h3 className="mb-2 font-semibold">Subscription Manager</h3>
                <p className="text-sm text-muted-foreground">
                  Never miss a renewal. Track recurring subscriptions with
                  calendar view and smart alerts.
                </p>
              </CardContent>
            </Card>

            <Card className="border bg-card transition-shadow hover:shadow-md">
              <CardContent className="flex flex-col items-center p-6 text-center sm:p-8">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-yellow-500/10 text-yellow-600 sm:mb-4 sm:h-12 sm:w-12">
                  <IconCash className="h-5 w-5 sm:h-6 sm:w-6" />
                </div>
                <h3 className="mb-2 font-semibold">Lent Money Tracker</h3>
                <p className="text-sm text-muted-foreground">
                  Keep track of money you&apos;ve lent with repayment progress,
                  due dates, and receipt uploads.
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* How It Works Section */}
        <section className="border-y bg-muted/30">
          <div className="container mx-auto px-4 py-12 sm:py-16 md:py-20">
            <div className="mb-8 text-center sm:mb-12">
              <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
                How It Works
              </h2>
              <p className="mt-2 text-sm text-muted-foreground sm:text-base">
                Start tracking in under a minute
              </p>
            </div>
            <div className="grid gap-8 md:grid-cols-3">
              <div className="flex flex-col items-center text-center">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground text-lg font-bold">
                  1
                </div>
                <div className="mb-2 flex items-center gap-2">
                  <IconShieldLock className="h-4 w-4 text-muted-foreground" />
                  <h3 className="font-semibold">Sign Up</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  Create your account in seconds. Set your monthly budget and
                  preferred currency.
                </p>
              </div>
              <div className="flex flex-col items-center text-center">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground text-lg font-bold">
                  2
                </div>
                <div className="mb-2 flex items-center gap-2">
                  <IconMessagePlus className="h-4 w-4 text-muted-foreground" />
                  <h3 className="font-semibold">Add Expenses</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  Log expenses via the web dashboard or send a quick message to
                  our Telegram bot. AI handles the rest.
                </p>
              </div>
              <div className="flex flex-col items-center text-center">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground text-lg font-bold">
                  3
                </div>
                <div className="mb-2 flex items-center gap-2">
                  <IconLayoutDashboard className="h-4 w-4 text-muted-foreground" />
                  <h3 className="font-semibold">Get Insights</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  View spending breakdowns, track budgets, and discover patterns
                  with beautiful charts and analytics.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="container mx-auto px-4">
          <div className="flex flex-col items-center justify-center py-16 text-center sm:py-20 md:py-24">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl md:text-4xl">
              Ready to Take Control of Your Finances?
            </h2>
            <p className="mt-3 max-w-xl text-sm text-muted-foreground sm:mt-4 sm:text-base">
              Join Chamber and start tracking your expenses smarter, not harder.
              It&apos;s free, open-source, and privacy-first.
            </p>
            <div className="mt-8">
              <Link href="/dashboard">
                <Button size="lg" className="rounded-md px-8">
                  Start Tracking Now
                  <IconArrowRight className="ml-1 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t">
          <div className="container mx-auto flex flex-col items-center gap-2 px-4 py-6 sm:flex-row sm:justify-between sm:py-8">
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded bg-primary text-primary-foreground text-xs font-bold">
                C
              </div>
              <span className="text-sm font-medium">Chamber</span>
            </div>
            <p className="text-xs text-muted-foreground sm:text-sm">
              Built by Sukhendu &middot; 
              <Link href="https://github.com/Sukhendu2002/Chamber" target="_blank" className="hover:text-primary transition-colors">
                GitHub
              </Link>
            </p>
          </div>
        </footer>
      </main>
    </div>
  );
}
