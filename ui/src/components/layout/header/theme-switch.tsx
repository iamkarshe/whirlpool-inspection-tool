import { Button } from "@/components/ui/button";
import { MoonIcon, SunIcon } from "lucide-react";
import { useEffect, useState } from "react";

export default function ThemeSwitch() {
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  return (
    <Button
      size="icon-sm"
      variant="ghost"
      className="relative"
      onClick={() => setTheme(theme === "light" ? "dark" : "light")}
    >
      {theme === "light" ? <MoonIcon /> : <SunIcon />}
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
}
