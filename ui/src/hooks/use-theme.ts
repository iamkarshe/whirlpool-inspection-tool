import { useLayoutEffect, useState } from "react";

import {
  APP_THEME_STORAGE_KEY,
  applyAppTheme,
  getAppTheme,
  type AppTheme,
} from "@/lib/app-theme";

export function useTheme() {
  const [theme, setTheme] = useState<AppTheme>(() => getAppTheme());

  useLayoutEffect(() => {
    applyAppTheme(theme);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(APP_THEME_STORAGE_KEY, theme);
    }
  }, [theme]);

  return { theme, setTheme };
}
