import * as React from "react";
import { AnimatedIntroText } from "@/components/animated-intro-text";

interface PageActionBarProps {
  title: string;
  description?: string;
  children?: React.ReactNode;
}

export default function PageActionBar({
  title,
  description,
  children,
}: PageActionBarProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <AnimatedIntroText
        title={title}
        description={description}
        titleClassName="text-2xl font-bold tracking-tight"
        descriptionClassName="text-muted-foreground text-sm"
      />

      <div className="flex flex-wrap items-center gap-2">{children}</div>
    </div>
  );
}
