import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export type AppLoaderVariant = "page" | "section" | "overlay" | "inline";

export type AppLoaderSize = "sm" | "md" | "lg";

export type AppLoaderProps = {
  variant?: AppLoaderVariant;
  size?: AppLoaderSize;
  label?: string;
  description?: string;
  className?: string;
};

const defaultLabels: Record<AppLoaderVariant, string> = {
  page: "Loading page",
  section: "Loading data",
  overlay: "Loading data",
  inline: "Loading",
};

const shellClassNames: Record<AppLoaderVariant, string> = {
  page: "min-h-screen w-full bg-background",
  section: "min-h-[min(420px,60vh)] w-full",
  overlay: "absolute inset-0 z-10 bg-background/80 backdrop-blur-[2px]",
  inline: "",
};

const indicatorSizes: Record<AppLoaderSize, string> = {
  sm: "h-8 w-8",
  md: "h-11 w-11",
  lg: "h-14 w-14",
};

const defaultSizes: Record<AppLoaderVariant, AppLoaderSize> = {
  page: "lg",
  section: "md",
  overlay: "md",
  inline: "sm",
};

function LoaderIndicator({
  size,
  className,
}: {
  size: AppLoaderSize;
  className?: string;
}) {
  const borderWidth = size === "sm" ? "border-2" : "border-[3px]";

  return (
    <div
      className={cn("relative shrink-0", indicatorSizes[size], className)}
      aria-hidden
    >
      <div
        className={cn(
          "absolute inset-0 rounded-full border-muted/80",
          borderWidth,
        )}
      />
      <div
        className={cn(
          "absolute inset-0 animate-spin rounded-full border-primary border-t-transparent",
          borderWidth,
        )}
      />
      <div className="absolute inset-[22%] animate-pulse rounded-full bg-primary/10" />
    </div>
  );
}

function LoaderCopy({
  label,
  description,
  compact,
}: {
  label: string;
  description?: string;
  compact?: boolean;
}) {
  return (
    <div className={cn("space-y-1 text-center", compact && "text-left")}>
      <p
        className={cn(
          "font-medium text-foreground",
          compact ? "text-sm" : "text-base",
        )}
      >
        {label}
        <span className="inline-flex w-[1.25em] animate-pulse">…</span>
      </p>
      {description ? (
        <p className="text-muted-foreground text-sm leading-snug">{description}</p>
      ) : null}
    </div>
  );
}

export function AppLoader({
  variant = "section",
  size,
  label,
  description,
  className,
}: AppLoaderProps) {
  const resolvedSize = size ?? defaultSizes[variant];
  const resolvedLabel = label ?? defaultLabels[variant];

  if (variant === "inline") {
    return (
      <div
        role="status"
        aria-live="polite"
        aria-busy="true"
        className={cn("inline-flex items-center gap-2.5", className)}
      >
        <LoaderIndicator size={resolvedSize} />
        <LoaderCopy label={resolvedLabel} description={description} compact />
      </div>
    );
  }

  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className={cn(
        "flex items-center justify-center p-6",
        shellClassNames[variant],
        className,
      )}
    >
      <div className="flex max-w-sm flex-col items-center gap-4 text-center">
        <LoaderIndicator size={resolvedSize} />
        <LoaderCopy label={resolvedLabel} description={description} />
      </div>
    </div>
  );
}

export type LoadingOverlayProps = {
  active: boolean;
  label?: string;
  description?: string;
  className?: string;
  children: ReactNode;
};

/** Covers children with a loader while `active` is true. Parent must be `position: relative`. */
export function LoadingOverlay({
  active,
  label,
  description,
  className,
  children,
}: LoadingOverlayProps) {
  return (
    <div className={cn("relative", className)}>
      {children}
      {active ? (
        <AppLoader
          variant="overlay"
          label={label}
          description={description}
        />
      ) : null}
    </div>
  );
}
