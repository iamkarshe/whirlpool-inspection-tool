import { useMemo } from "react";

import { cn } from "@/lib/utils";

type ScrollingMarqueeProps = {
  text: string;
  className?: string;
  durationMs?: number;
};

export function ScrollingMarquee({
  text,
  className,
  durationMs = 9000,
}: ScrollingMarqueeProps) {
  const safeText = useMemo(() => text ?? "", [text]);

  return (
    <span
      className={cn("inline-flex min-w-0 overflow-hidden align-middle", className)}
    >
      <span
        className="inline-flex whitespace-nowrap"
        style={{
          animation: `scroll-marquee ${durationMs}ms linear infinite`,
        }}
      >
        <span className="pr-6">{safeText}</span>
        <span className="pr-6">{safeText}</span>
      </span>
      <style>
        {`@keyframes scroll-marquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }`}
      </style>
    </span>
  );
}

