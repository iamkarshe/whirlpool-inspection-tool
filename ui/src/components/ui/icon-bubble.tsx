import type { LucideIcon } from "lucide-react";

type IconBubbleProps = {
  icon: LucideIcon;
  className?: string;
};

export function IconBubble({ icon: Icon, className }: IconBubbleProps) {
  return (
    <div
      className={`flex h-16 w-16 items-center justify-center rounded-full ${className ?? ""}`}
    >
      <Icon className="h-6 w-6" />
    </div>
  );
}

