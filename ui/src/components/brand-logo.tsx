import { useEffect, useState } from "react";

export function BrandLogo() {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    if (typeof document === "undefined") return;
    setIsDark(document.documentElement.classList.contains("dark"));
  }, []);

  const src = isDark ? "/logo-dark.svg" : "/logo.svg";

  return <img src={src} alt="Whirlpool" />;
}

