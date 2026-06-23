import { QRCodeSVG } from "qrcode.react";

import { cn } from "@/lib/utils";

export type TotpQrCodeProps = {
  provisioningUri: string;
  size?: number;
  className?: string;
};

export function TotpQrCode({
  provisioningUri,
  size = 200,
  className,
}: TotpQrCodeProps) {
  return (
    <div
      className={cn(
        "inline-flex rounded-lg border bg-white p-3 shadow-sm dark:bg-white",
        className,
      )}
    >
      <QRCodeSVG value={provisioningUri} size={size} level="M" />
    </div>
  );
}
