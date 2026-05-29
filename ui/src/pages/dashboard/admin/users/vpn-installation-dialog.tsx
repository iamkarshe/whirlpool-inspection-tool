import { Download, ExternalLink, Loader2, QrCode, Smartphone } from "lucide-react";
import type { ReactNode } from "react";

import type { UserResponse } from "@/api/generated/model/userResponse";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const WIREGUARD_INSTALL_URL = "https://www.wireguard.com/install/";
const WIREGUARD_ANDROID_URL =
  "https://play.google.com/store/apps/details?id=com.wireguard.android";
const WIREGUARD_IOS_URL =
  "https://apps.apple.com/app/wireguard/id1441195209";

function ExternalAppLink({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-primary inline-flex items-center gap-1 font-medium hover:underline"
    >
      {children}
      <ExternalLink className="h-3.5 w-3.5" />
    </a>
  );
}

function StepList({ children }: { children: ReactNode }) {
  return (
    <ol className="text-muted-foreground list-decimal space-y-2 pl-5 text-sm leading-relaxed">
      {children}
    </ol>
  );
}

export type VpnInstallationDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: UserResponse | null;
  downloading?: "config" | "qr" | null;
  onDownloadConfig: () => void | Promise<void>;
  onDownloadQr: () => void | Promise<void>;
};

export function VpnInstallationDialog({
  open,
  onOpenChange,
  user,
  downloading = null,
  onDownloadConfig,
  onDownloadQr,
}: VpnInstallationDialogProps) {
  const configFilename =
    user ? `${user.email}-wireguard-vpn.conf` : "wireguard-vpn.conf";
  const qrFilename =
    user ? `${user.email}-wireguard-vpn-qr.png` : "wireguard-vpn-qr.png";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Install WireGuard VPN</DialogTitle>
          <DialogDescription>
            {user ?
              <>
                Share these steps with{" "}
                <span className="text-foreground font-medium">{user.name}</span>{" "}
                to connect using their new VPN profile.
              </>
            : "Follow these steps to install and import the VPN profile."}
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="mobile" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="mobile" className="gap-1.5">
              <Smartphone className="h-4 w-4" />
              Mobile
            </TabsTrigger>
            <TabsTrigger value="desktop">Desktop</TabsTrigger>
          </TabsList>

          <TabsContent value="mobile" className="mt-4 space-y-4">
            <StepList>
              <li>
                Install WireGuard from the{" "}
                <ExternalAppLink href={WIREGUARD_ANDROID_URL}>
                  Google Play Store
                </ExternalAppLink>{" "}
                or{" "}
                <ExternalAppLink href={WIREGUARD_IOS_URL}>App Store</ExternalAppLink>
                .
              </li>
              <li>
                Open WireGuard and add a tunnel using one of these options:
                <ul className="mt-2 list-disc space-y-1 pl-5">
                  <li>
                    Download the config file (
                    <span className="font-mono text-xs">{configFilename}</span>
                    ) and choose <strong>Import from file or archive</strong>.
                  </li>
                  <li>
                    Download the QR image (
                    <span className="font-mono text-xs">{qrFilename}</span>
                    ) and choose <strong>Create from QR code</strong>.
                  </li>
                </ul>
              </li>
              <li>Enable the tunnel to connect to the warehouse VPN.</li>
            </StepList>
          </TabsContent>

          <TabsContent value="desktop" className="mt-4 space-y-4">
            <StepList>
              <li>
                Download and install WireGuard from{" "}
                <ExternalAppLink href={WIREGUARD_INSTALL_URL}>
                  wireguard.com/install
                </ExternalAppLink>
                .
              </li>
              <li>
                Download the config file (
                <span className="font-mono text-xs">{configFilename}</span>
                ).
              </li>
              <li>
                In the WireGuard app, choose{" "}
                <strong>Import tunnel(s) from file</strong> and select the
                downloaded <span className="font-mono text-xs">.conf</span> file.
              </li>
              <li>Activate the tunnel to connect.</li>
            </StepList>
          </TabsContent>
        </Tabs>

        <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-start">
          <Button
            type="button"
            variant="outline"
            disabled={downloading !== null}
            onClick={() => void onDownloadConfig()}
          >
            {downloading === "config" ?
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Downloading…
              </>
            : <>
                <Download className="mr-2 h-4 w-4" />
                Download config
              </>
            }
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={downloading !== null}
            onClick={() => void onDownloadQr()}
          >
            {downloading === "qr" ?
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Downloading…
              </>
            : <>
                <QrCode className="mr-2 h-4 w-4" />
                Download QR
              </>
            }
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
