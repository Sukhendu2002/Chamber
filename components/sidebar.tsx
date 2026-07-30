"use client";

import { useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useClerk, useUser } from "@clerk/nextjs";
import { cn } from "@/lib/utils";

import { useDemoMode } from "@/components/demo-mode-provider";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  IconLayoutDashboard,
  IconReceipt,
  IconChartPie,
  IconFileImport,
  IconBrandTelegram,
  IconSettings,
  IconLogout,
  IconUser,
  IconCalendarRepeat,
  IconCash,
  IconBuildingBank,
  IconEyeOff,
  IconEye,
  IconMenu2,
  IconPhoto,
  IconReportAnalytics,
  IconCrystalBall,
  IconCamera,
  IconSparkles,
} from "@tabler/icons-react";

const navGroups = [
  {
    label: "Overview",
    items: [
      { title: "Dashboard", href: "/dashboard", icon: IconLayoutDashboard },
      { title: "Expenses", href: "/expenses", icon: IconReceipt },
      { title: "Accounts", href: "/accounts", icon: IconBuildingBank },
      { title: "Analytics", href: "/analytics", icon: IconChartPie },
    ],
  },
  {
    label: "Plan",
    items: [
      { title: "Subscriptions", href: "/subscriptions", icon: IconCalendarRepeat },
      { title: "Lent Money", href: "/loans", icon: IconCash },
      { title: "Forecast", href: "/forecast", icon: IconCrystalBall },
      { title: "Summary", href: "/summary", icon: IconReportAnalytics },
    ],
  },
  {
    label: "Tools",
    items: [
      { title: "Quick Capture", href: "/capture", icon: IconCamera },
      { title: "Receipts", href: "/receipts", icon: IconPhoto },
      { title: "Import", href: "/import", icon: IconFileImport },
      { title: "Telegram", href: "/telegram", icon: IconBrandTelegram },
    ],
  },
];

// Subscribe to nothing, just return the mounted state
const emptySubscribe = () => () => { };

function SidebarNav({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  return (
    <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-4">
      {navGroups.map((group) => (
        <div key={group.label}>
          <p className="mb-1.5 px-3 text-[0.6875rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground/75">
            {group.label}
          </p>
          <div className="space-y-1">
            {group.items.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  prefetch={true}
                  onClick={onNavigate}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "group flex min-h-10 items-center gap-3 rounded-xl px-3 text-sm font-medium transition-all duration-200",
                    isActive
                      ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-[inset_0_0_0_1px_oklch(0.558_0.248_289/0.08)]"
                      : "text-muted-foreground hover:bg-muted/70 hover:text-foreground"
                  )}
                >
                  <item.icon
                    aria-hidden="true"
                    className={cn(
                      "size-[1.125rem] stroke-[1.8]",
                      isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                    )}
                  />
                  {item.title}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}

function SidebarFooter({ mounted, isLoaded, user, signOut, isDemoMode, toggleDemoMode }: {
  mounted: boolean;
  isLoaded: boolean;
  user: ReturnType<typeof useUser>["user"];
  signOut: ReturnType<typeof useClerk>["signOut"];
  isDemoMode: boolean;
  toggleDemoMode: () => void;
}) {
  return (
    <div className="space-y-2 border-t border-sidebar-border p-3">
      <Link
        href="/settings"
        className="flex min-h-10 items-center gap-3 rounded-xl px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted/70 hover:text-foreground"
      >
        <IconSettings aria-hidden="true" className="size-[1.125rem] stroke-[1.8]" />
        Settings
      </Link>
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon-sm"
          className={cn("shrink-0 shadow-none", isDemoMode && "bg-amber-500/10 text-amber-600")}
          onClick={toggleDemoMode}
          title={isDemoMode ? "Demo mode on (Ctrl+D)" : "Demo mode off (Ctrl+D)"}
          aria-label={isDemoMode ? "Turn demo mode off" : "Turn demo mode on"}
        >
          {isDemoMode ? <IconEyeOff className="size-4" /> : <IconEye className="size-4" />}
        </Button>
        {mounted && isLoaded ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                className="min-w-0 flex-1 justify-start gap-2.5 border-sidebar-border bg-sidebar px-2.5 shadow-none"
              >
                {user?.imageUrl ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={user.imageUrl}
                    alt={user.fullName || "User"}
                    className="size-7 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex size-7 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
                    <IconUser className="size-4" />
                  </div>
                )}
                <span className="truncate text-sm font-semibold">
                  {user?.firstName || "User"}
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <div className="px-2 py-1.5">
                <p className="text-sm font-medium">{user?.fullName}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {user?.primaryEmailAddress?.emailAddress}
                </p>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/settings" className="cursor-pointer">
                  <IconSettings className="mr-2 h-4 w-4" />
                  Settings
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => signOut({ redirectUrl: "/" })}
                className="text-destructive cursor-pointer"
              >
                <IconLogout className="mr-2 h-4 w-4" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <div className="flex h-10 flex-1 items-center gap-2 rounded-xl border border-sidebar-border px-2.5">
            <div className="size-7 animate-pulse rounded-full bg-muted" />
            <div className="h-4 w-16 animate-pulse rounded bg-muted" />
          </div>
        )}
      </div>
    </div>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const { user, isLoaded } = useUser();
  const { signOut } = useClerk();
  const { isDemoMode, toggleDemoMode } = useDemoMode();
  const [mobileOpen, setMobileOpen] = useState(false);
  // Use useSyncExternalStore to avoid hydration mismatch without triggering cascading renders
  const mounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );

  const footerProps = { mounted, isLoaded, user, signOut, isDemoMode, toggleDemoMode };

  return (
    <>
      {/* Mobile top bar */}
      <div className="sticky top-0 z-40 flex h-16 items-center gap-2 border-b border-sidebar-border bg-sidebar/95 px-4 backdrop-blur md:hidden">
        <Button
          variant="ghost"
          size="icon"
          className="shadow-none"
          onClick={() => setMobileOpen(true)}
        >
          <IconMenu2 className="h-5 w-5" />
          <span className="sr-only">Open menu</span>
        </Button>
        <span className="text-lg font-semibold tracking-[-0.035em]">Chamber</span>
        <IconSparkles aria-hidden="true" className="size-4 fill-primary/15 text-primary" />
      </div>

      {/* Mobile sheet sidebar */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-[17rem] bg-sidebar p-0" showCloseButton={false}>
          <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
          <div className="flex h-[4.5rem] items-center gap-2 border-b border-sidebar-border px-5">
            <span className="text-xl font-semibold tracking-[-0.04em]">Chamber</span>
            <IconSparkles aria-hidden="true" className="size-4 fill-primary/15 text-primary" />
          </div>
          <SidebarNav pathname={pathname} onNavigate={() => setMobileOpen(false)} />
          <SidebarFooter {...footerProps} />
        </SheetContent>
      </Sheet>

      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen w-[17rem] shrink-0 flex-col border-r border-sidebar-border bg-sidebar md:flex">
        {/* Logo */}
        <div className="flex h-[4.5rem] items-center gap-2 border-b border-sidebar-border px-6">
          <span className="text-2xl font-semibold tracking-[-0.045em]">Chamber</span>
          <IconSparkles aria-hidden="true" className="size-[1.125rem] fill-primary/15 text-primary" />
        </div>

        <SidebarNav pathname={pathname} />
        <SidebarFooter {...footerProps} />
      </aside>
    </>
  );
}
