import type { UserResponse } from "@/api/generated/model/userResponse";
import {
  vpnConfigDownloadFilename,
  vpnQrDownloadFilename,
} from "@/services/users-api";

const WIREGUARD_INSTALL_URL = "https://www.wireguard.com/install/";
const WIREGUARD_ANDROID_URL =
  "https://play.google.com/store/apps/details?id=com.wireguard.android";
const WIREGUARD_IOS_URL =
  "https://apps.apple.com/app/wireguard/id1441195209";

export function vpnConfigFilenameForUser(user: UserResponse): string {
  return vpnConfigDownloadFilename(user.email);
}

export function vpnQrFilenameForUser(user: UserResponse): string {
  return vpnQrDownloadFilename(user.email);
}

export function buildVpnEmailSubject(user: UserResponse): string {
  return `WireGuard VPN setup — ${user.name}`;
}

export function buildVpnEmailBody(user: UserResponse): string {
  const configFile = vpnConfigFilenameForUser(user);
  const qrFile = vpnQrFilenameForUser(user);

  return [
    `Hi ${user.name.split(/\s+/)[0] ?? user.name},`,
    "",
    "Your warehouse VPN profile is ready. Follow the steps below to connect with WireGuard.",
    "",
    "MOBILE",
    "1. Install WireGuard from the App Store or Google Play:",
    `   iOS: ${WIREGUARD_IOS_URL}`,
    `   Android: ${WIREGUARD_ANDROID_URL}`,
    "2. Open WireGuard and add a tunnel:",
    `   • Import the attached config file (${configFile}), or`,
    `   • Scan the attached QR image (${qrFile}).`,
    "3. Enable the tunnel to connect.",
    "",
    "DESKTOP / LAPTOP",
    `1. Install WireGuard: ${WIREGUARD_INSTALL_URL}`,
    `2. Import the attached config file (${configFile}) using “Import tunnel(s) from file”.`,
    "3. Activate the tunnel to connect.",
    "",
    "If you need help, contact your administrator.",
    "",
    "Thanks,",
  ].join("\n");
}

export function openVpnSetupMailto(user: UserResponse): void {
  const params = new URLSearchParams({
    subject: buildVpnEmailSubject(user),
    body: buildVpnEmailBody(user),
  });
  const href = `mailto:${encodeURIComponent(user.email)}?${params.toString()}`;
  window.location.assign(href);
}
