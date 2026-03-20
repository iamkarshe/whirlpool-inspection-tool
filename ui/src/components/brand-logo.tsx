import { useTheme } from "next-themes";

export function BrandLogo() {
  const { resolvedTheme } = useTheme();
  const src = resolvedTheme === "dark" ? "/logo-dark.svg" : "/logo.svg";

  return <img src={src} alt="Whirlpool" />;
}

