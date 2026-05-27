from __future__ import annotations

from pathlib import Path

import pulumi
import pulumi_aws as aws


def get_ubuntu_ami(instance_type: str) -> str:
    architecture = "arm64" if instance_type.startswith("t4g.") else "amd64"

    ami = aws.ec2.get_ami(
        most_recent=True,
        owners=["099720109477"],
        filters=[
            aws.ec2.GetAmiFilterArgs(
                name="name",
                values=[f"ubuntu/images/hvm-ssd-gp3/ubuntu-noble-24.04-{architecture}-server-*"],
            ),
            aws.ec2.GetAmiFilterArgs(
                name="virtualization-type",
                values=["hvm"],
            ),
        ],
    )

    return ami.id


class AppServer:
    def __init__(
        self,
        project_name: str,
        environment: str,
        instance_type: str,
        public_subnet_id: pulumi.Input[str],
        app_security_group_id: pulumi.Input[str],
        ssh_public_key_path: str,
        media_bucket_name: pulumi.Input[str],
        tags: dict[str, str],
    ) -> None:
        name_prefix = f"{project_name}-{environment}"
        public_key = Path(ssh_public_key_path).expanduser().read_text(encoding="utf-8").strip()

        self.key_pair = aws.ec2.KeyPair(
            f"{name_prefix}-app-key",
            public_key=public_key,
            tags={
                **tags,
                "Name": f"{name_prefix}-app-key",
                "Tier": "compute",
            },
        )

        self.role = aws.iam.Role(
            f"{name_prefix}-app-role",
            assume_role_policy="""{
                "Version": "2012-10-17",
                "Statement": [
                    {
                        "Effect": "Allow",
                        "Principal": {
                            "Service": "ec2.amazonaws.com"
                        },
                        "Action": "sts:AssumeRole"
                    }
                ]
            }""",
            tags={
                **tags,
                "Name": f"{name_prefix}-app-role",
                "Tier": "compute",
            },
        )

        self.bucket_policy = aws.iam.RolePolicy(
            f"{name_prefix}-app-s3-policy",
            role=self.role.id,
            policy=media_bucket_name.apply(
                lambda bucket_name: f"""{{
                    "Version": "2012-10-17",
                    "Statement": [
                        {{
                            "Effect": "Allow",
                            "Action": [
                                "s3:GetObject",
                                "s3:PutObject",
                                "s3:DeleteObject"
                            ],
                            "Resource": "arn:aws:s3:::{bucket_name}/*"
                        }},
                        {{
                            "Effect": "Allow",
                            "Action": [
                                "s3:ListBucket"
                            ],
                            "Resource": "arn:aws:s3:::{bucket_name}"
                        }}
                    ]
                }}"""
            ),
        )

        self.instance_profile = aws.iam.InstanceProfile(
            f"{name_prefix}-app-profile",
            role=self.role.name,
            tags={
                **tags,
                "Name": f"{name_prefix}-app-profile",
                "Tier": "compute",
            },
        )

        user_data = """#!/bin/bash
set -e

apt-get update
apt-get install -y nginx python3 python3-venv python3-pip git unzip curl
apt-get install -y certbot python3-certbot-nginx

systemctl enable nginx
systemctl start nginx

mkdir -p /opt/whirlpool-pdi/backend
mkdir -p /opt/whirlpool-pdi/frontend/dist

cat > /opt/whirlpool-pdi/frontend/dist/index.html <<'HTML'
<!doctype html>
<html>
  <head>
    <title>Whirlpool PDI</title>
  </head>
  <body>
    <h1>Whirlpool PDI server is ready</h1>
  </body>
</html>
HTML

cat > /etc/nginx/sites-available/whirlpool-pdi <<'NGINX'
server {
    listen 80 default_server;
    server_name _;

    root /opt/whirlpool-pdi/frontend/dist;
    index index.html;

    location /api/ {
        proxy_pass http://127.0.0.1:8000/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location / {
        try_files $uri $uri/ /index.html;
    }
}
NGINX

rm -f /etc/nginx/sites-enabled/default
ln -sf /etc/nginx/sites-available/whirlpool-pdi /etc/nginx/sites-enabled/whirlpool-pdi
nginx -t
systemctl reload nginx
"""

        self.instance = aws.ec2.Instance(
            f"{name_prefix}-app-server",
            ami=get_ubuntu_ami(instance_type),
            instance_type=instance_type,
            subnet_id=public_subnet_id,
            vpc_security_group_ids=[app_security_group_id],
            key_name=self.key_pair.key_name,
            iam_instance_profile=self.instance_profile.name,
            associate_public_ip_address=True,
            user_data=user_data,
            root_block_device=aws.ec2.InstanceRootBlockDeviceArgs(
                volume_size=30,
                volume_type="gp3",
                encrypted=True,
            ),
            tags={
                **tags,
                "Name": f"{name_prefix}-app-server",
                "Tier": "application",
            },
        )

        self.elastic_ip = aws.ec2.Eip(
            f"{name_prefix}-app-eip",
            domain="vpc",
            tags={
                **tags,
                "Name": f"{name_prefix}-app-eip",
                "Tier": "network",
            },
        )

        self.eip_association = aws.ec2.EipAssociation(
            f"{name_prefix}-app-eip-association",
            instance_id=self.instance.id,
            allocation_id=self.elastic_ip.id,
        )

    def export_outputs(self) -> None:
        pulumi.export("app_instance_id", self.instance.id)
        pulumi.export("app_public_ip", self.elastic_ip.public_ip)