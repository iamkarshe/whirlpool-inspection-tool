export type AppTheme = "light" | "dark";

export const APP_THEME_STORAGE_KEY = "whirlpool.theme";

const PWA_THEME_META = {
  light: {
    themeColor: "#ffffff",
    appleStatusBarStyle: "default",
  },
  dark: {
    themeColor: "#0a0a0a",
    appleStatusBarStyle: "black",
  },
} as const;

/** User-selected theme from storage, or null if they never chose. */
export function readStoredAppTheme(): AppTheme | null {
  if (typeof window === "undefined") return null;
  const stored = window.localStorage.getItem(APP_THEME_STORAGE_KEY);
  if (stored === "light" || stored === "dark") return stored;
  return null;
}

/** App theme: stored preference, otherwise light (not system). */
export function getAppTheme(): AppTheme {
  return readStoredAppTheme() ?? "light";
}

/** Applies Tailwind `.dark`, `color-scheme`, and mobile PWA chrome meta tags. */
export function applyAppTheme(theme: AppTheme): void {
  if (typeof document === "undefined") return;

  const root = document.documentElement;
  root.classList.toggle("dark", theme === "dark");
  root.style.colorScheme = theme;

  const meta = PWA_THEME_META[theme];

  let themeColorMeta = document.querySelector<HTMLMetaElement>(
    'meta[name="theme-color"]',
  );
  if (!themeColorMeta) {
    themeColorMeta = document.createElement("meta");
    themeColorMeta.name = "theme-color";
    document.head.appendChild(themeColorMeta);
  }
  themeColorMeta.content = meta.themeColor;

  const appleStatusMeta = document.querySelector<HTMLMetaElement>(
    'meta[name="apple-mobile-web-app-status-bar-style"]',
  );
  if (appleStatusMeta) {
    appleStatusMeta.content = meta.appleStatusBarStyle;
  }
}

export function persistAppTheme(theme: AppTheme): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(APP_THEME_STORAGE_KEY, theme);
  applyAppTheme(theme);
}
