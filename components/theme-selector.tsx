"use client";

import { useEffect, useCallback } from "react";
import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";
import { cn } from "@/lib/utils";
import { IconCheck, IconMoon, IconSun } from "@tabler/icons-react";

type ThemeKey = "default" | "ocean" | "forest" | "sunset" | "mono";
type ModeKey = "light" | "dark";

// CSS variable definitions for each theme × mode combination
// These are applied directly to document.documentElement.style to guarantee they take effect
const THEME_VARS: Record<string, Record<string, string>> = {
  light: {
    "--background": "oklch(1 0 0)",
    "--foreground": "oklch(0.145 0 0)",
    "--card": "oklch(1 0 0)",
    "--card-foreground": "oklch(0.145 0 0)",
    "--popover": "oklch(1 0 0)",
    "--popover-foreground": "oklch(0.145 0 0)",
    "--primary": "oklch(0.205 0 0)",
    "--primary-foreground": "oklch(0.985 0 0)",
    "--secondary": "oklch(0.97 0 0)",
    "--secondary-foreground": "oklch(0.205 0 0)",
    "--muted": "oklch(0.97 0 0)",
    "--muted-foreground": "oklch(0.556 0 0)",
    "--accent": "oklch(0.97 0 0)",
    "--accent-foreground": "oklch(0.205 0 0)",
    "--destructive": "oklch(0.58 0.22 27)",
    "--border": "oklch(0.922 0 0)",
    "--input": "oklch(0.922 0 0)",
    "--ring": "oklch(0.708 0 0)",
    "--sidebar": "oklch(0.985 0 0)",
    "--sidebar-foreground": "oklch(0.145 0 0)",
    "--sidebar-primary": "oklch(0.205 0 0)",
    "--sidebar-primary-foreground": "oklch(0.985 0 0)",
    "--sidebar-accent": "oklch(0.97 0 0)",
    "--sidebar-accent-foreground": "oklch(0.205 0 0)",
    "--sidebar-border": "oklch(0.922 0 0)",
    "--sidebar-ring": "oklch(0.708 0 0)",
  },
  dark: {
    "--background": "oklch(0.145 0 0)",
    "--foreground": "oklch(0.985 0 0)",
    "--card": "oklch(0.205 0 0)",
    "--card-foreground": "oklch(0.985 0 0)",
    "--popover": "oklch(0.205 0 0)",
    "--popover-foreground": "oklch(0.985 0 0)",
    "--primary": "oklch(0.87 0 0)",
    "--primary-foreground": "oklch(0.205 0 0)",
    "--secondary": "oklch(0.269 0 0)",
    "--secondary-foreground": "oklch(0.985 0 0)",
    "--muted": "oklch(0.269 0 0)",
    "--muted-foreground": "oklch(0.708 0 0)",
    "--accent": "oklch(0.371 0 0)",
    "--accent-foreground": "oklch(0.985 0 0)",
    "--destructive": "oklch(0.704 0.191 22.216)",
    "--border": "oklch(1 0 0 / 10%)",
    "--input": "oklch(1 0 0 / 15%)",
    "--ring": "oklch(0.556 0 0)",
    "--sidebar": "oklch(0.205 0 0)",
    "--sidebar-foreground": "oklch(0.985 0 0)",
    "--sidebar-primary": "oklch(0.488 0.243 264.376)",
    "--sidebar-primary-foreground": "oklch(0.985 0 0)",
    "--sidebar-accent": "oklch(0.269 0 0)",
    "--sidebar-accent-foreground": "oklch(0.985 0 0)",
    "--sidebar-border": "oklch(1 0 0 / 10%)",
    "--sidebar-ring": "oklch(0.556 0 0)",
  },
  "ocean-light": {
    "--background": "oklch(0.97 0.015 240)",
    "--foreground": "oklch(0.15 0.04 260)",
    "--card": "oklch(0.985 0.01 240)",
    "--card-foreground": "oklch(0.15 0.04 260)",
    "--popover": "oklch(0.985 0.01 240)",
    "--popover-foreground": "oklch(0.15 0.04 260)",
    "--primary": "oklch(0.55 0.22 260)",
    "--primary-foreground": "oklch(0.98 0 0)",
    "--secondary": "oklch(0.92 0.04 250)",
    "--secondary-foreground": "oklch(0.35 0.12 260)",
    "--muted": "oklch(0.93 0.03 250)",
    "--muted-foreground": "oklch(0.55 0.06 260)",
    "--accent": "oklch(0.88 0.06 240)",
    "--accent-foreground": "oklch(0.25 0.1 260)",
    "--destructive": "oklch(0.58 0.22 27)",
    "--border": "oklch(0.86 0.04 250)",
    "--input": "oklch(0.86 0.04 250)",
    "--ring": "oklch(0.55 0.22 260)",
    "--sidebar": "oklch(0.97 0.015 240)",
    "--sidebar-foreground": "oklch(0.15 0.04 260)",
    "--sidebar-primary": "oklch(0.55 0.22 260)",
    "--sidebar-primary-foreground": "oklch(0.98 0 0)",
    "--sidebar-accent": "oklch(0.9 0.04 250)",
    "--sidebar-accent-foreground": "oklch(0.25 0.1 260)",
    "--sidebar-border": "oklch(0.86 0.04 250)",
    "--sidebar-ring": "oklch(0.55 0.22 260)",
  },
  "ocean-dark": {
    "--background": "oklch(0.12 0.03 260)",
    "--foreground": "oklch(0.92 0.02 240)",
    "--card": "oklch(0.16 0.04 260)",
    "--card-foreground": "oklch(0.92 0.02 240)",
    "--popover": "oklch(0.16 0.04 260)",
    "--popover-foreground": "oklch(0.92 0.02 240)",
    "--primary": "oklch(0.65 0.2 260)",
    "--primary-foreground": "oklch(0.12 0.03 260)",
    "--secondary": "oklch(0.22 0.06 260)",
    "--secondary-foreground": "oklch(0.92 0.02 240)",
    "--muted": "oklch(0.2 0.04 260)",
    "--muted-foreground": "oklch(0.6 0.06 260)",
    "--accent": "oklch(0.25 0.08 260)",
    "--accent-foreground": "oklch(0.92 0.02 240)",
    "--destructive": "oklch(0.7 0.19 22)",
    "--border": "oklch(0.25 0.06 260 / 50%)",
    "--input": "oklch(0.25 0.06 260 / 60%)",
    "--ring": "oklch(0.55 0.2 260)",
    "--sidebar": "oklch(0.14 0.03 260)",
    "--sidebar-foreground": "oklch(0.92 0.02 240)",
    "--sidebar-primary": "oklch(0.65 0.2 260)",
    "--sidebar-primary-foreground": "oklch(0.12 0.03 260)",
    "--sidebar-accent": "oklch(0.2 0.06 260)",
    "--sidebar-accent-foreground": "oklch(0.92 0.02 240)",
    "--sidebar-border": "oklch(0.25 0.06 260 / 50%)",
    "--sidebar-ring": "oklch(0.55 0.2 260)",
  },
  "forest-light": {
    "--background": "oklch(0.97 0.02 150)",
    "--foreground": "oklch(0.15 0.04 160)",
    "--card": "oklch(0.985 0.01 150)",
    "--card-foreground": "oklch(0.15 0.04 160)",
    "--popover": "oklch(0.985 0.01 150)",
    "--popover-foreground": "oklch(0.15 0.04 160)",
    "--primary": "oklch(0.45 0.25 160)",
    "--primary-foreground": "oklch(0.98 0 0)",
    "--secondary": "oklch(0.92 0.05 150)",
    "--secondary-foreground": "oklch(0.3 0.12 160)",
    "--muted": "oklch(0.93 0.03 150)",
    "--muted-foreground": "oklch(0.5 0.08 160)",
    "--accent": "oklch(0.88 0.08 140)",
    "--accent-foreground": "oklch(0.2 0.1 160)",
    "--destructive": "oklch(0.58 0.22 27)",
    "--border": "oklch(0.86 0.05 150)",
    "--input": "oklch(0.86 0.05 150)",
    "--ring": "oklch(0.45 0.25 160)",
    "--sidebar": "oklch(0.97 0.02 150)",
    "--sidebar-foreground": "oklch(0.15 0.04 160)",
    "--sidebar-primary": "oklch(0.45 0.25 160)",
    "--sidebar-primary-foreground": "oklch(0.98 0 0)",
    "--sidebar-accent": "oklch(0.9 0.05 150)",
    "--sidebar-accent-foreground": "oklch(0.2 0.1 160)",
    "--sidebar-border": "oklch(0.86 0.05 150)",
    "--sidebar-ring": "oklch(0.45 0.25 160)",
  },
  "forest-dark": {
    "--background": "oklch(0.1 0.03 160)",
    "--foreground": "oklch(0.92 0.02 150)",
    "--card": "oklch(0.14 0.04 160)",
    "--card-foreground": "oklch(0.92 0.02 150)",
    "--popover": "oklch(0.14 0.04 160)",
    "--popover-foreground": "oklch(0.92 0.02 150)",
    "--primary": "oklch(0.55 0.22 160)",
    "--primary-foreground": "oklch(0.1 0.03 160)",
    "--secondary": "oklch(0.2 0.06 160)",
    "--secondary-foreground": "oklch(0.92 0.02 150)",
    "--muted": "oklch(0.18 0.04 160)",
    "--muted-foreground": "oklch(0.55 0.08 160)",
    "--accent": "oklch(0.23 0.08 150)",
    "--accent-foreground": "oklch(0.92 0.02 150)",
    "--destructive": "oklch(0.7 0.19 22)",
    "--border": "oklch(0.23 0.06 160 / 50%)",
    "--input": "oklch(0.23 0.06 160 / 60%)",
    "--ring": "oklch(0.45 0.22 160)",
    "--sidebar": "oklch(0.12 0.03 160)",
    "--sidebar-foreground": "oklch(0.92 0.02 150)",
    "--sidebar-primary": "oklch(0.55 0.22 160)",
    "--sidebar-primary-foreground": "oklch(0.1 0.03 160)",
    "--sidebar-accent": "oklch(0.18 0.06 160)",
    "--sidebar-accent-foreground": "oklch(0.92 0.02 150)",
    "--sidebar-border": "oklch(0.23 0.06 160 / 50%)",
    "--sidebar-ring": "oklch(0.45 0.22 160)",
  },
  "sunset-light": {
    "--background": "oklch(0.97 0.02 70)",
    "--foreground": "oklch(0.15 0.04 60)",
    "--card": "oklch(0.985 0.01 70)",
    "--card-foreground": "oklch(0.15 0.04 60)",
    "--popover": "oklch(0.985 0.01 70)",
    "--popover-foreground": "oklch(0.15 0.04 60)",
    "--primary": "oklch(0.6 0.22 50)",
    "--primary-foreground": "oklch(0.98 0 0)",
    "--secondary": "oklch(0.92 0.04 60)",
    "--secondary-foreground": "oklch(0.35 0.12 50)",
    "--muted": "oklch(0.93 0.03 60)",
    "--muted-foreground": "oklch(0.55 0.06 50)",
    "--accent": "oklch(0.88 0.08 40)",
    "--accent-foreground": "oklch(0.25 0.1 50)",
    "--destructive": "oklch(0.58 0.22 27)",
    "--border": "oklch(0.86 0.04 60)",
    "--input": "oklch(0.86 0.04 60)",
    "--ring": "oklch(0.6 0.22 50)",
    "--sidebar": "oklch(0.97 0.02 70)",
    "--sidebar-foreground": "oklch(0.15 0.04 60)",
    "--sidebar-primary": "oklch(0.6 0.22 50)",
    "--sidebar-primary-foreground": "oklch(0.98 0 0)",
    "--sidebar-accent": "oklch(0.9 0.04 60)",
    "--sidebar-accent-foreground": "oklch(0.25 0.1 50)",
    "--sidebar-border": "oklch(0.86 0.04 60)",
    "--sidebar-ring": "oklch(0.6 0.22 50)",
  },
  "sunset-dark": {
    "--background": "oklch(0.12 0.03 50)",
    "--foreground": "oklch(0.92 0.02 60)",
    "--card": "oklch(0.16 0.04 50)",
    "--card-foreground": "oklch(0.92 0.02 60)",
    "--popover": "oklch(0.16 0.04 50)",
    "--popover-foreground": "oklch(0.92 0.02 60)",
    "--primary": "oklch(0.65 0.2 50)",
    "--primary-foreground": "oklch(0.12 0.03 50)",
    "--secondary": "oklch(0.22 0.06 50)",
    "--secondary-foreground": "oklch(0.92 0.02 60)",
    "--muted": "oklch(0.2 0.04 50)",
    "--muted-foreground": "oklch(0.6 0.06 50)",
    "--accent": "oklch(0.25 0.08 40)",
    "--accent-foreground": "oklch(0.92 0.02 60)",
    "--destructive": "oklch(0.7 0.19 22)",
    "--border": "oklch(0.25 0.06 50 / 50%)",
    "--input": "oklch(0.25 0.06 50 / 60%)",
    "--ring": "oklch(0.6 0.2 50)",
    "--sidebar": "oklch(0.14 0.03 50)",
    "--sidebar-foreground": "oklch(0.92 0.02 60)",
    "--sidebar-primary": "oklch(0.65 0.2 50)",
    "--sidebar-primary-foreground": "oklch(0.12 0.03 50)",
    "--sidebar-accent": "oklch(0.2 0.06 50)",
    "--sidebar-accent-foreground": "oklch(0.92 0.02 60)",
    "--sidebar-border": "oklch(0.25 0.06 50 / 50%)",
    "--sidebar-ring": "oklch(0.6 0.2 50)",
  },
  "mono-light": {
    "--background": "oklch(0.97 0 0)",
    "--foreground": "oklch(0.15 0 0)",
    "--card": "oklch(0.985 0 0)",
    "--card-foreground": "oklch(0.15 0 0)",
    "--popover": "oklch(0.985 0 0)",
    "--popover-foreground": "oklch(0.15 0 0)",
    "--primary": "oklch(0.3 0 0)",
    "--primary-foreground": "oklch(0.985 0 0)",
    "--secondary": "oklch(0.92 0 0)",
    "--secondary-foreground": "oklch(0.3 0 0)",
    "--muted": "oklch(0.93 0 0)",
    "--muted-foreground": "oklch(0.55 0 0)",
    "--accent": "oklch(0.88 0 0)",
    "--accent-foreground": "oklch(0.2 0 0)",
    "--destructive": "oklch(0.5 0 0)",
    "--border": "oklch(0.86 0 0)",
    "--input": "oklch(0.86 0 0)",
    "--ring": "oklch(0.6 0 0)",
    "--sidebar": "oklch(0.97 0 0)",
    "--sidebar-foreground": "oklch(0.15 0 0)",
    "--sidebar-primary": "oklch(0.3 0 0)",
    "--sidebar-primary-foreground": "oklch(0.985 0 0)",
    "--sidebar-accent": "oklch(0.9 0 0)",
    "--sidebar-accent-foreground": "oklch(0.2 0 0)",
    "--sidebar-border": "oklch(0.86 0 0)",
    "--sidebar-ring": "oklch(0.6 0 0)",
  },
  "mono-dark": {
    "--background": "oklch(0.12 0 0)",
    "--foreground": "oklch(0.92 0 0)",
    "--card": "oklch(0.16 0 0)",
    "--card-foreground": "oklch(0.92 0 0)",
    "--popover": "oklch(0.16 0 0)",
    "--popover-foreground": "oklch(0.92 0 0)",
    "--primary": "oklch(0.75 0 0)",
    "--primary-foreground": "oklch(0.12 0 0)",
    "--secondary": "oklch(0.22 0 0)",
    "--secondary-foreground": "oklch(0.92 0 0)",
    "--muted": "oklch(0.2 0 0)",
    "--muted-foreground": "oklch(0.6 0 0)",
    "--accent": "oklch(0.25 0 0)",
    "--accent-foreground": "oklch(0.92 0 0)",
    "--destructive": "oklch(0.6 0 0)",
    "--border": "oklch(0.25 0 0 / 50%)",
    "--input": "oklch(0.25 0 0 / 60%)",
    "--ring": "oklch(0.6 0 0)",
    "--sidebar": "oklch(0.14 0 0)",
    "--sidebar-foreground": "oklch(0.92 0 0)",
    "--sidebar-primary": "oklch(0.75 0 0)",
    "--sidebar-primary-foreground": "oklch(0.12 0 0)",
    "--sidebar-accent": "oklch(0.2 0 0)",
    "--sidebar-accent-foreground": "oklch(0.92 0 0)",
    "--sidebar-border": "oklch(0.25 0 0 / 50%)",
    "--sidebar-ring": "oklch(0.6 0 0)",
  },
};

const THEMES: { key: ThemeKey; label: string; colors: string[] }[] = [
  {
    key: "default",
    label: "Default",
    colors: ["#ffffff", "#e5e5e5", "#333333", "#000000"],
  },
  {
    key: "ocean",
    label: "Ocean",
    colors: ["#e8f0fe", "#b3d4fc", "#1a73e8", "#0d47a1"],
  },
  {
    key: "forest",
    label: "Forest",
    colors: ["#e8f5e9", "#a5d6a7", "#2e7d32", "#1b5e20"],
  },
  {
    key: "sunset",
    label: "Sunset",
    colors: ["#fef3e8", "#fddcb3", "#e65100", "#bf360c"],
  },
  {
    key: "mono",
    label: "Monochrome",
    colors: ["#f5f5f5", "#d4d4d4", "#555555", "#1a1a1a"],
  },
];

function parseTheme(theme: string | undefined): { base: ThemeKey; mode: ModeKey } {
  if (!theme) return { base: "default", mode: "light" };
  if (theme === "light" || theme === "dark") {
    return { base: "default", mode: theme };
  }
  const [base, mode] = theme.split("-") as [ThemeKey, ModeKey];
  return { base: base || "default", mode: mode || "light" };
}

function buildTheme(base: ThemeKey, mode: ModeKey): string {
  if (base === "default") return mode;
  return `${base}-${mode}`;
}

/** Apply a theme's CSS variables to document.documentElement */
function applyThemeVars(themeName: string) {
  const vars = THEME_VARS[themeName];
  if (!vars) return;
  const root = document.documentElement;
  for (const [key, value] of Object.entries(vars)) {
    root.style.setProperty(key, value);
  }
}

export function ThemeSelector() {
  const { theme, setTheme } = useTheme();

  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

  const current = parseTheme(theme);

  // Apply CSS variables on mount and whenever theme changes
  useEffect(() => {
    if (theme) {
      applyThemeVars(theme);
    }
  }, [theme]);

  const selectTheme = useCallback((base: ThemeKey) => {
    const newTheme = buildTheme(base, current.mode);
    setTheme(newTheme);
  }, [current.mode, setTheme]);

  const toggleMode = useCallback(() => {
    const newMode = current.mode === "light" ? "dark" : "light";
    const newTheme = buildTheme(current.base, newMode);
    setTheme(newTheme);
  }, [current.base, current.mode, setTheme]);

  if (!mounted) {
    return (
      <div className="space-y-3" aria-hidden="true">
        <div className="grid grid-cols-5 gap-1.5">
          {THEMES.map((t) => (
            <div
              key={t.key}
              className="h-12 animate-pulse rounded-md border border-border bg-muted"
            />
          ))}
        </div>
        <div className="h-9 animate-pulse rounded-md border bg-muted" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div>
        <p id="color-theme-label" className="mb-1.5 text-xs font-medium">
          Color theme
        </p>
        <div
          role="group"
          aria-labelledby="color-theme-label"
          className="grid grid-cols-5 gap-1.5"
        >
          {THEMES.map((themeOption) => {
            const isActive = current.base === themeOption.key;
            return (
              <button
                key={themeOption.key}
                type="button"
                aria-pressed={isActive}
                aria-label={`${themeOption.label} color theme`}
                onClick={() => selectTheme(themeOption.key)}
                className={cn(
                  "relative min-h-12 cursor-pointer rounded-md border p-1.5 text-left outline-none transition-colors hover:border-primary/40 hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring/30",
                  isActive &&
                    "border-primary bg-primary/[0.04] ring-1 ring-primary/25"
                )}
              >
                <span className="flex gap-0.5" aria-hidden="true">
                  {themeOption.colors.map((color) => (
                    <span
                      key={color}
                      className="h-3.5 flex-1 rounded-[0.1875rem]"
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </span>
                <span className="mt-1 block truncate text-center text-[0.625rem] font-medium text-muted-foreground">
                  {themeOption.label}
                </span>
                {isActive && (
                  <span className="absolute -right-1 -top-1 flex size-4 items-center justify-center rounded-full bg-primary text-primary-foreground">
                    <IconCheck
                      aria-hidden="true"
                      className="size-2.5 stroke-[2.5]"
                    />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <p id="theme-mode-label" className="mb-1.5 text-xs font-medium">
          Mode
        </p>
        <div
          role="group"
          aria-labelledby="theme-mode-label"
          className="grid grid-cols-2 rounded-md border p-0.5"
        >
          {(["light", "dark"] as const).map((mode) => {
            const isActive = current.mode === mode;
            const ModeIcon = mode === "light" ? IconSun : IconMoon;
            return (
              <button
                key={mode}
                type="button"
                aria-pressed={isActive}
                onClick={() => {
                  if (!isActive) toggleMode();
                }}
                className={cn(
                  "flex h-8 cursor-pointer items-center justify-center gap-1.5 rounded-sm text-xs font-medium capitalize text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/30",
                  isActive && "bg-muted text-foreground shadow-xs"
                )}
              >
                <ModeIcon aria-hidden="true" className="size-3.5" />
                {mode}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
