import DOMPurify from "dompurify";
import { useMemo } from "react";

import { cn } from "@/lib/utils";

type SanitizedHtmlPreviewProps = {
  html: string;
  title?: string;
  className?: string;
};

/**
 * Renders untrusted HTML (e.g. logged email bodies) inside a sandboxed iframe
 * after DOMPurify sanitization. Avoids dangerouslySetInnerHTML for SAST compliance.
 */
export function SanitizedHtmlPreview({
  html,
  title = "HTML preview",
  className,
}: SanitizedHtmlPreviewProps) {
  const srcDoc = useMemo(() => {
    const sanitized = DOMPurify.sanitize(html);
    if (!sanitized) return "";

    return `<!DOCTYPE html><html><head><meta charset="utf-8"><base target="_blank" rel="noopener noreferrer"><style>body{font-family:system-ui,sans-serif;font-size:14px;line-height:1.5;margin:12px;word-wrap:break-word;}</style></head><body>${sanitized}</body></html>`;
  }, [html]);

  if (!srcDoc) return null;

  return (
    <iframe
      title={title}
      sandbox=""
      srcDoc={srcDoc}
      className={cn(
        "h-64 w-full rounded-md border bg-background",
        className,
      )}
    />
  );
}
