"use client";

import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { IconSun, IconMoon } from "@tabler/icons-react";
import { useSyncExternalStore } from "react";

// Subscribe to nothing, just return the mounted state
const emptySubscribe = () => () => { };

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  // Use useSyncExternalStore to avoid hydration mismatch without triggering cascading renders
  const mounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );

  if (!mounted) {
    return (
      <Button variant="ghost" size="icon" className="h-8 w-8">
        <IconSun className="h-4 w-4" />
      </Button>
    );
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-8 w-8"
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
    >
      {theme === "dark" ? (
        <IconSun className="h-4 w-4" />
      ) : (
        <IconMoon className="h-4 w-4" />
      )}
    </Button>
  );
}
