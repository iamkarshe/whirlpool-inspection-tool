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

sysctl -w net.ipv4.ip_forward=1
sed -i 's/^#\\?net.ipv4.ip_forward=.*/net.ipv4.ip_forward=1/' /etc/sysctl.conf

mkdir -p /etc/wireguard
chmod 700 /etc/wireguard

if [ ! -f /etc/wireguard/server_private.key ]; then
    wg genkey | tee /etc/wireguard/server_private.key | wg pubkey > /etc/wireguard/server_public.key
fi

chmod 600 /etc/wireguard/server_private.key

SERVER_PRIVATE_KEY=$(cat /etc/wireguard/server_private.key)

cat > /etc/wireguard/wg0.conf <<WG
[Interface]
Address = 10.44.0.1/24
ListenPort = 51820
PrivateKey = $SERVER_PRIVATE_KEY
SaveConfig = false
PostUp = iptables -A FORWARD -i wg0 -j ACCEPT; iptables -A FORWARD -o wg0 -j ACCEPT; iptables -t nat -A POSTROUTING -s 10.44.0.0/24 -o eth0 -j MASQUERADE
PostDown = iptables -D FORWARD -i wg0 -j ACCEPT; iptables -D FORWARD -o wg0 -j ACCEPT; iptables -t nat -D POSTROUTING -s 10.44.0.0/24 -o eth0 -j MASQUERADE
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