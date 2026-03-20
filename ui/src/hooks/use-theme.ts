import { useLayoutEffect, useState } from "react";

type AppTheme = "light" | "dark";

const STORAGE_KEY = "whirlpool.theme";

function readInitialTheme(): AppTheme {
  if (typeof window === "undefined") return "light";

  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored === "light" || stored === "dark") return stored;

  // If user never picked, default to system preference.
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

export function useTheme() {
  const [theme, setTheme] = useState<AppTheme>(() => readInitialTheme());

  useLayoutEffect(() => {
    // Keep Tailwind/ShadCN theme styles in sync via the `dark` class on <html>.
    document.documentElement.classList.toggle("dark", theme === "dark");
    window.localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  return { theme, setTheme };
}

