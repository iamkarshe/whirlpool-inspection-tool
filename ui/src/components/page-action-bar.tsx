import * as React from "react";

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
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        {description ? (
          <p className="text-muted-foreground text-sm">{description}</p>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-2">{children}</div>
    </div>
  );
}
