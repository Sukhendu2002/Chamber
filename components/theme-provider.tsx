"use client";

import * as React from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";

const THEMES = [
  "light",
  "dark",
  "ocean-light",
  "ocean-dark",
  "forest-light",
  "forest-dark",
  "sunset-light",
  "sunset-dark",
  "mono-light",
  "mono-dark",
] as const;

export type ThemeName = (typeof THEMES)[number];

export function ThemeProvider({
  children,
  ...props
}: React.ComponentProps<typeof NextThemesProvider>) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="light"
      themes={[...THEMES]}
      enableSystem={false}
      disableTransitionOnChange
      {...props}
    >
      {children}
    </NextThemesProvider>
  );
}

export { THEMES };
