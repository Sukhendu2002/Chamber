import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  IconArrowLeft,
  IconFileText,
  IconReceipt,
  IconBuildingBank,
  IconCash,
  IconCalendarRepeat,
  IconBrandTelegram,
  IconHelpCircle,
  IconTool,
  IconSparkles,
} from "@tabler/icons-react";

export default function DocsLandingPage() {
  const sections = [
    {
      title: "Getting Started",
      description: "New to Chamber? Start here with our first-time user guide.",
      href: "/docs/getting-started",
      icon: IconFileText,
      color: "text-green-500",
      bg: "bg-green-500/10",
    },
    {
      title: "Expense Tracking",
      description: "Learn how to add, edit, and manage expenses with receipt uploads.",
      href: "/docs/expenses",
      icon: IconReceipt,
      color: "text-blue-500",
      bg: "bg-blue-500/10",
    },
    {
      title: "Account Management",
      description: "Track bank accounts, investments, and monitor your net worth.",
      href: "/docs/accounts",
      icon: IconBuildingBank,
      color: "text-purple-500",
      bg: "bg-purple-500/10",
    },
    {
      title: "Loan Tracking",
      description: "Monitor money you've lent and track repayments.",
      href: "/docs/loans",
      icon: IconCash,
      color: "text-yellow-500",
      bg: "bg-yellow-500/10",
    },
    {
      title: "Subscriptions",
      description: "Manage recurring payments and get alerts before bills are due.",
      href: "/docs/subscriptions",
      icon: IconCalendarRepeat,
      color: "text-orange-500",
      bg: "bg-orange-500/10",
    },
    {
      title: "Telegram Bot",
      description: "Add expenses on the go with AI-powered receipt parsing.",
      href: "/docs/telegram-bot",
      icon: IconBrandTelegram,
      color: "text-cyan-500",
      bg: "bg-cyan-500/10",
    },
    {
      title: "FAQ",
      description: "Find answers to commonly asked questions about Chamber.",
      href: "/docs/faq",
      icon: IconHelpCircle,
      color: "text-pink-500",
      bg: "bg-pink-500/10",
    },
    {
      title: "Troubleshooting",
      description: "Solutions to common issues and error messages.",
      href: "/docs/troubleshooting",
      icon: IconTool,
      color: "text-red-500",
      bg: "bg-red-500/10",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border/80 bg-background/85 backdrop-blur-xl">
        <div className="container mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:h-[4.5rem]">
          <Link href="/" className="flex items-center gap-2 text-xl font-semibold tracking-[-0.04em]">
            <span>Chamber</span>
            <IconSparkles aria-hidden="true" className="size-4 fill-primary/15 text-primary" />
          </Link>
          <Link href="/dashboard">
            <Button variant="default" size="sm">
              Go to Dashboard
            </Button>
          </Link>
        </div>
      </header>

      <main className="container mx-auto max-w-5xl px-4 py-14 sm:py-20">
        {/* Back Link */}
        <Link 
          href="/" 
          className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <IconArrowLeft className="h-4 w-4" />
          Back to home
        </Link>

        {/* Hero */}
        <div className="mb-12">
          <p className="eyebrow mb-3">Learn Chamber</p>
          <h1 className="mb-4 text-4xl font-semibold tracking-[-0.045em] sm:text-5xl">
            Documentation
          </h1>
          <p className="text-muted-foreground max-w-2xl">
            Everything you need to know about using Chamber. Learn how to track expenses, 
            manage accounts, and make the most of our AI-powered features.
          </p>
        </div>

        {/* Docs Grid */}
        <div className="grid gap-4 sm:grid-cols-2">
          {sections.map((section) => (
            <Link
              key={section.title}
              href={section.href}
              className="group flex items-start gap-4 rounded-2xl border border-border/80 bg-card p-5 shadow-[0_1px_2px_oklch(0.2_0.02_286/0.04)] transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-lg"
            >
              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${section.bg} ${section.color}`}
              >
                <section.icon className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-semibold mb-1">{section.title}</h2>
                <p className="text-sm text-muted-foreground">
                  {section.description}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-12 border-t border-border/80">
        <div className="container mx-auto max-w-5xl flex flex-col items-center gap-2 px-4 py-6 sm:flex-row sm:justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold tracking-[-0.02em]">Chamber</span>
            <IconSparkles aria-hidden="true" className="size-3.5 fill-primary/15 text-primary" />
          </div>
          <p className="text-xs text-muted-foreground">
            Built by Sukhendu &middot;{" "}
            <Link
              href="https://github.com/Sukhendu2002/Chamber"
              target="_blank"
              className="hover:text-primary transition-colors"
            >
              GitHub
            </Link>
          </p>
        </div>
      </footer>
    </div>
  );
}
