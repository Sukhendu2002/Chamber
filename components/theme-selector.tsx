"use client";

import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";
import { cn } from "@/lib/utils";
import { IconSun, IconMoon } from "@tabler/icons-react";

type ThemeKey = "default" | "ocean" | "forest" | "sunset" | "mono";
type ModeKey = "light" | "dark";

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

export function ThemeSelector() {
  const { theme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

  const current = parseTheme(theme);

  const selectTheme = (base: ThemeKey) => {
    setTheme(buildTheme(base, current.mode));
  };

  const toggleMode = () => {
    const newMode = current.mode === "light" ? "dark" : "light";
    setTheme(buildTheme(current.base, newMode));
  };

  if (!mounted) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-5 gap-3">
          {THEMES.map((t) => (
            <div
              key={t.key}
              className="h-20 rounded border border-border bg-muted animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Theme cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {THEMES.map((t) => {
          const isActive = current.base === t.key;
          return (
            <button
              key={t.key}
              onClick={() => selectTheme(t.key)}
              className={cn(
                "group relative rounded-lg border-2 p-3 transition-all text-left",
                isActive
                  ? "border-primary ring-1 ring-primary"
                  : "border-border hover:border-primary/40 hover:shadow-sm"
              )}
            >
              {/* Color swatches */}
              <div className="flex gap-1 mb-2">
                {t.colors.map((c, i) => (
                  <div
                    key={i}
                    className="h-5 flex-1 rounded"
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
              <span
                className={cn(
                  "text-xs font-medium",
                  isActive ? "text-primary" : "text-muted-foreground"
                )}
              >
                {t.label}
              </span>
              {isActive && (
                <div className="absolute top-1.5 right-1.5 h-4 w-4 rounded-full bg-primary flex items-center justify-center">
                  <svg
                    width="10"
                    height="10"
                    viewBox="0 0 10 10"
                    fill="none"
                    className="text-primary-foreground"
                  >
                    <path
                      d="M2 5L4 7L8 3"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Light/Dark toggle */}
      <div className="flex items-center justify-between rounded-lg border border-border p-3">
        <div>
          <p className="text-sm font-medium">Mode</p>
          <p className="text-xs text-muted-foreground">
            {current.mode === "light" ? "Light" : "Dark"} mode
          </p>
        </div>
        <button
          onClick={toggleMode}
          className={cn(
            "relative h-7 w-12 rounded-full transition-colors",
            current.mode === "dark" ? "bg-primary" : "bg-muted"
          )}
        >
          <div
            className={cn(
              "absolute top-0.5 h-6 w-6 rounded-full bg-white shadow-sm flex items-center justify-center transition-transform",
              current.mode === "dark" ? "translate-x-5.5" : "translate-x-0.5"
            )}
          >
            {current.mode === "dark" ? (
              <IconMoon className="h-3 w-3 text-foreground" />
            ) : (
              <IconSun className="h-3 w-3 text-amber-500" />
            )}
          </div>
        </button>
      </div>
    </div>
  );
}
