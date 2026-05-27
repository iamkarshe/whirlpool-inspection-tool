from __future__ import annotations

from pathlib import Path

import pulumi
import pulumi_aws as aws

from modules.compute import get_ubuntu_ami


class VpnServer:
    def __init__(
        self,
        project_name: str,
        environment: str,
        instance_type: str,
        public_subnet_id: pulumi.Input[str],
        vpn_security_group_id: pulumi.Input[str],
        ssh_public_key_path: str,
        tags: dict[str, str],
    ) -> None:
        name_prefix = f"{project_name}-{environment}"
        public_key = Path(ssh_public_key_path).expanduser().read_text(encoding="utf-8").strip()

        self.key_pair = aws.ec2.KeyPair(
            f"{name_prefix}-vpn-key",
            public_key=public_key,
            tags={
                **tags,
                "Name": f"{name_prefix}-vpn-key",
                "Tier": "vpn",
            },
        )

        user_data = """#!/bin/bash
set -e

apt-get update
apt-get install -y wireguard qrencode iptables-persistent

echo 'net.ipv4.ip_forward=1' > /etc/sysctl.d/99-wireguard.conf
sysctl --system

mkdir -p /etc/wireguard
chmod 700 /etc/wireguard

if [ ! -f /etc/wireguard/server_private.key ]; then
    wg genkey | tee /etc/wireguard/server_private.key | wg pubkey > /etc/wireguard/server_public.key
fi

chmod 600 /etc/wireguard/server_private.key

cat > /usr/local/sbin/wg-setup-nat <<'SCRIPT'
#!/bin/bash
set -e

VPN_CIDR="10.44.0.0/24"
VPC_TEST_IP="10.20.1.206"
OUT_IF="$(ip route get "$VPC_TEST_IP" | awk '{for(i=1;i<=NF;i++) if($i=="dev") print $(i+1); exit}')"

if [ -z "$OUT_IF" ]; then
    OUT_IF="$(ip route show default | awk '{print $5; exit}')"
fi

iptables -C FORWARD -i wg0 -j ACCEPT 2>/dev/null || iptables -A FORWARD -i wg0 -j ACCEPT
iptables -C FORWARD -o wg0 -j ACCEPT 2>/dev/null || iptables -A FORWARD -o wg0 -j ACCEPT
iptables -t nat -C POSTROUTING -s "$VPN_CIDR" -o "$OUT_IF" -j MASQUERADE 2>/dev/null || iptables -t nat -A POSTROUTING -s "$VPN_CIDR" -o "$OUT_IF" -j MASQUERADE

netfilter-persistent save || true
SCRIPT

cat > /usr/local/sbin/wg-cleanup-nat <<'SCRIPT'
#!/bin/bash
set -e

VPN_CIDR="10.44.0.0/24"
VPC_TEST_IP="10.20.1.206"
OUT_IF="$(ip route get "$VPC_TEST_IP" | awk '{for(i=1;i<=NF;i++) if($i=="dev") print $(i+1); exit}')"

if [ -z "$OUT_IF" ]; then
    OUT_IF="$(ip route show default | awk '{print $5; exit}')"
fi

iptables -D FORWARD -i wg0 -j ACCEPT 2>/dev/null || true
iptables -D FORWARD -o wg0 -j ACCEPT 2>/dev/null || true
iptables -t nat -D POSTROUTING -s "$VPN_CIDR" -o "$OUT_IF" -j MASQUERADE 2>/dev/null || true

netfilter-persistent save || true
SCRIPT

chmod +x /usr/local/sbin/wg-setup-nat
chmod +x /usr/local/sbin/wg-cleanup-nat

SERVER_PRIVATE_KEY=$(cat /etc/wireguard/server_private.key)

cat > /etc/wireguard/wg0.conf <<WG
[Interface]
Address = 10.44.0.1/24
ListenPort = 51820
PrivateKey = $SERVER_PRIVATE_KEY
SaveConfig = false
PostUp = /usr/local/sbin/wg-setup-nat
PostDown = /usr/local/sbin/wg-cleanup-nat
WG

systemctl enable wg-quick@wg0
systemctl restart wg-quick@wg0
"""

        self.instance = aws.ec2.Instance(
            f"{name_prefix}-vpn-server",
            ami=get_ubuntu_ami(instance_type),
            instance_type=instance_type,
            subnet_id=public_subnet_id,
            vpc_security_group_ids=[vpn_security_group_id],
            key_name=self.key_pair.key_name,
            associate_public_ip_address=True,
            source_dest_check=False,
            user_data=user_data,
            root_block_device=aws.ec2.InstanceRootBlockDeviceArgs(
                volume_size=12,
                volume_type="gp3",
                encrypted=True,
            ),
            tags={
                **tags,
                "Name": f"{name_prefix}-vpn-server",
                "Tier": "vpn",
            },
        )

        self.elastic_ip = aws.ec2.Eip(
            f"{name_prefix}-vpn-eip",
            domain="vpc",
            tags={
                **tags,
                "Name": f"{name_prefix}-vpn-eip",
                "Tier": "vpn",
            },
        )

        self.eip_association = aws.ec2.EipAssociation(
            f"{name_prefix}-vpn-eip-association",
            instance_id=self.instance.id,
            allocation_id=self.elastic_ip.id,
        )

    def export_outputs(self) -> None:
        pulumi.export("vpn_instance_id", self.instance.id)
        pulumi.export("vpn_public_ip", self.elastic_ip.public_ip)