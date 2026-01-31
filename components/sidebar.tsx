"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  IconLayoutDashboard,
  IconReceipt,
  IconChartPie,
  IconFileImport,
  IconBrandTelegram,
  IconSettings,
} from "@tabler/icons-react";

const navItems = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: IconLayoutDashboard,
  },
  {
    title: "Expenses",
    href: "/expenses",
    icon: IconReceipt,
  },
  {
    title: "Analytics",
    href: "/analytics",
    icon: IconChartPie,
  },
  {
    title: "Import",
    href: "/import",
    icon: IconFileImport,
  },
  {
    title: "Telegram",
    href: "/telegram",
    icon: IconBrandTelegram,
  },
  {
    title: "Settings",
    href: "/settings",
    icon: IconSettings,
  },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-screen w-56 flex-col border-r bg-background">
      {/* Logo */}
      <div className="flex h-16 items-center gap-2 border-b px-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground font-bold text-sm">
          C
        </div>
        <span className="font-semibold">Chamber</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 p-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.title}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
