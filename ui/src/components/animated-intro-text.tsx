import * as React from "react";

import { cn } from "@/lib/utils";

type AnimatedIntroTextProps = {
  title: React.ReactNode;
  description?: React.ReactNode;
  titleClassName?: string;
  descriptionClassName?: string;
  className?: string;
};

export function AnimatedIntroText({
  title,
  description,
  titleClassName,
  descriptionClassName,
  className,
}: AnimatedIntroTextProps) {
  return (
    <div className={cn("min-w-0", className)}>
      <h1
        className={cn(
          "animate-in fade-in-0 slide-in-from-bottom-2 duration-300",
          titleClassName,
        )}
        style={{ animationFillMode: "backwards" }}
      >
        {title}
      </h1>
      {description ? (
        <p
          className={cn(
            "animate-in fade-in-0 slide-in-from-bottom-2 delay-150 duration-300",
            descriptionClassName,
          )}
          style={{ animationFillMode: "backwards" }}
        >
          {description}
        </p>
      ) : null}
    </div>
  );
}
