#!/usr/bin/env bash
set -euo pipefail

mkdir -p /etc/wireguard

if [ ! -f /etc/wireguard/server_private.key ]; then
  wg genkey | tee /etc/wireguard/server_private.key | wg pubkey > /etc/wireguard/server_public.key
  chmod 600 /etc/wireguard/server_private.key
fi

if ! ip link show "$WG_INTERFACE" >/dev/null 2>&1; then
  ip link add "$WG_INTERFACE" type wireguard
  ip address add "$WG_SERVER_IP/24" dev "$WG_INTERFACE"
  wg set "$WG_INTERFACE" private-key /etc/wireguard/server_private.key listen-port "$WG_LISTEN_PORT"
  ip link set "$WG_INTERFACE" up
fi

echo "WireGuard mock is running."
echo "Interface: $WG_INTERFACE"
echo "Server IP: $WG_SERVER_IP"
echo "Server public key:"
cat /etc/wireguard/server_public.key

tail -f /dev/null

