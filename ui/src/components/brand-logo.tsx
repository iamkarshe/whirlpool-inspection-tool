import { useTheme } from "@/hooks/use-theme";

export function BrandLogo() {
  const { theme } = useTheme();
  const src = theme === "dark" ? "/logo-dark.svg" : "/logo.svg";

  return <img src={src} alt="Whirlpool" />;
}

