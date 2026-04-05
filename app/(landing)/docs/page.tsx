import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  IconBook,
  IconRocket,
  IconReceipt,
  IconBuildingBank,
  IconCash,
  IconCalendarRepeat,
  IconBrandTelegram,
  IconHelpCircle,
  IconTool,
  IconArrowRight,
  IconExternalLink,
} from "@tabler/icons-react";

const docSections = [
  {
    title: "Getting Started",
    description: "New to Chamber? Start here with our first-time user guide.",
    href: "https://github.com/Sukhendu2002/Chamber/blob/dev/docs/getting-started.md",
    icon: IconRocket,
    color: "text-green-500",
    bg: "bg-green-500/10",
  },
  {
    title: "Expense Tracking",
    description: "Learn how to add, edit, and manage expenses with receipt uploads.",
    href: "https://github.com/Sukhendu2002/Chamber/blob/dev/docs/features/expenses.md",
    icon: IconReceipt,
    color: "text-blue-500",
    bg: "bg-blue-500/10",
  },
  {
    title: "Account Management",
    description: "Track bank accounts, investments, and monitor your net worth.",
    href: "https://github.com/Sukhendu2002/Chamber/blob/dev/docs/features/accounts.md",
    icon: IconBuildingBank,
    color: "text-purple-500",
    bg: "bg-purple-500/10",
  },
  {
    title: "Loan Tracking",
    description: "Monitor money you've lent and track repayments.",
    href: "https://github.com/Sukhendu2002/Chamber/blob/dev/docs/features/loans.md",
    icon: IconCash,
    color: "text-yellow-500",
    bg: "bg-yellow-500/10",
  },
  {
    title: "Subscriptions",
    description: "Manage recurring payments and get alerts before bills are due.",
    href: "https://github.com/Sukhendu2002/Chamber/blob/dev/docs/features/subscriptions.md",
    icon: IconCalendarRepeat,
    color: "text-orange-500",
    bg: "bg-orange-500/10",
  },
  {
    title: "Telegram Bot",
    description: "Add expenses on the go with AI-powered receipt parsing.",
    href: "https://github.com/Sukhendu2002/Chamber/blob/dev/docs/features/telegram-bot.md",
    icon: IconBrandTelegram,
    color: "text-cyan-500",
    bg: "bg-cyan-500/10",
  },
  {
    title: "FAQ",
    description: "Find answers to commonly asked questions about Chamber.",
    href: "https://github.com/Sukhendu2002/Chamber/blob/dev/docs/faq.md",
    icon: IconHelpCircle,
    color: "text-pink-500",
    bg: "bg-pink-500/10",
  },
  {
    title: "Troubleshooting",
    description: "Solutions to common issues and error messages.",
    href: "https://github.com/Sukhendu2002/Chamber/blob/dev/docs/troubleshooting.md",
    icon: IconTool,
    color: "text-red-500",
    bg: "bg-red-500/10",
  },
];

export default function DocsPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-md">
        <div className="container mx-auto max-w-6xl flex h-14 items-center justify-between px-4 sm:h-16">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground font-bold">
              C
            </div>
            <span className="font-semibold">Chamber</span>
          </Link>
          <Link href="/dashboard">
            <Button variant="default" size="sm" className="rounded-md">
              Go to Dashboard
              <IconArrowRight className="ml-1 h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>
      </header>

      <main className="container mx-auto max-w-6xl px-4 py-12 sm:py-16">
        {/* Hero */}
        <div className="mb-12 text-center">
          <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
            <IconBook className="h-6 w-6 text-primary" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Documentation
          </h1>
          <p className="mt-3 max-w-2xl mx-auto text-muted-foreground">
            Everything you need to know about using Chamber. Learn how to track expenses, 
            manage accounts, and make the most of our AI-powered features.
          </p>
        </div>

        {/* Docs Grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {docSections.map((section) => (
            <a
              key={section.title}
              href={section.href}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex flex-col rounded-xl border bg-card p-5 transition-colors hover:bg-muted/50"
            >
              <div className="mb-3 flex items-center gap-3">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-lg ${section.bg} ${section.color}`}
                >
                  <section.icon className="h-5 w-5" />
                </div>
                <h2 className="font-semibold">{section.title}</h2>
              </div>
              <p className="mb-4 flex-1 text-sm text-muted-foreground">
                {section.description}
              </p>
              <div className="flex items-center text-sm font-medium text-primary">
                Read docs
                <IconExternalLink className="ml-1 h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
              </div>
            </a>
          ))}
        </div>

        {/* Quick Links */}
        <div className="mt-12 rounded-2xl border bg-muted/30 p-6 sm:p-8">
          <h2 className="mb-4 text-lg font-semibold">Quick Links</h2>
          <div className="flex flex-wrap gap-3">
            <Link href="https://github.com/Sukhendu2002/Chamber" target="_blank">
              <Button variant="outline" size="sm">
                GitHub Repository
                <IconExternalLink className="ml-1 h-3.5 w-3.5" />
              </Button>
            </Link>
            <Link href="/dashboard">
              <Button variant="outline" size="sm">
                Open Dashboard
                <IconArrowRight className="ml-1 h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t">
        <div className="container mx-auto max-w-6xl flex flex-col items-center gap-2 px-4 py-6 sm:flex-row sm:justify-between sm:py-8">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded bg-primary text-primary-foreground text-xs font-bold">
              C
            </div>
            <span className="text-sm font-medium">Chamber</span>
          </div>
          <p className="text-xs text-muted-foreground sm:text-sm">
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
