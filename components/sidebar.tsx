"use client";

import { useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useClerk, useUser } from "@clerk/nextjs";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/theme-toggle";
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
    title: "Subscriptions",
    href: "/subscriptions",
    icon: IconCalendarRepeat,
  },
  {
    title: "Lent Money",
    href: "/loans",
    icon: IconCash,
  },
  {
    title: "Accounts",
    href: "/accounts",
    icon: IconBuildingBank,
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

// Subscribe to nothing, just return the mounted state
const emptySubscribe = () => () => { };

function SidebarNav({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  return (
    <nav className="flex-1 space-y-1 p-2">
      {navItems.map((item) => {
        const isActive = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            prefetch={true}
            onClick={onNavigate}
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
    <div className="border-t p-2">
      <div className="flex items-center justify-between px-2 py-1">
        <div className="flex items-center gap-1">
          <ThemeToggle />
          <Button
            variant="ghost"
            size="icon"
            className={cn("h-8 w-8", isDemoMode && "text-yellow-500")}
            onClick={toggleDemoMode}
            title={isDemoMode ? "Demo mode on (Ctrl+D)" : "Demo mode off (Ctrl+D)"}
          >
            {isDemoMode ? <IconEyeOff className="h-4 w-4" /> : <IconEye className="h-4 w-4" />}
          </Button>
        </div>
        {mounted && isLoaded ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center gap-2 px-2">
                {user?.imageUrl ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={user.imageUrl}
                    alt={user.fullName || "User"}
                    className="h-7 w-7 rounded-full"
                  />
                ) : (
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-muted">
                    <IconUser className="h-4 w-4" />
                  </div>
                )}
                <span className="text-sm font-medium truncate max-w-[80px]">
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
          <div className="flex items-center gap-2 px-2">
            <div className="h-7 w-7 rounded-full bg-muted animate-pulse" />
            <div className="h-4 w-16 bg-muted rounded animate-pulse" />
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
      <div className="sticky top-0 z-40 flex h-14 items-center gap-2 border-b bg-background px-4 md:hidden">
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9"
          onClick={() => setMobileOpen(true)}
        >
          <IconMenu2 className="h-5 w-5" />
          <span className="sr-only">Open menu</span>
        </Button>
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground font-bold text-xs">
          C
        </div>
        <span className="font-semibold text-sm">Chamber</span>
      </div>

      {/* Mobile sheet sidebar */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-64 p-0" showCloseButton={false}>
          <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
          <div className="flex h-14 items-center gap-2 border-b px-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground font-bold text-sm">
              C
            </div>
            <span className="font-semibold">Chamber</span>
          </div>
          <SidebarNav pathname={pathname} onNavigate={() => setMobileOpen(false)} />
          <SidebarFooter {...footerProps} />
        </SheetContent>
      </Sheet>

      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen w-56 flex-col border-r bg-background md:flex">
        {/* Logo */}
        <div className="flex h-16 items-center gap-2 border-b px-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground font-bold text-sm">
            C
          </div>
          <span className="font-semibold">Chamber</span>
        </div>

        <SidebarNav pathname={pathname} />
        <SidebarFooter {...footerProps} />
      </aside>
    </>
  );
}
