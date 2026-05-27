from __future__ import annotations

import pulumi_aws as aws


class SecurityGroups:
    def __init__(
        self,
        project_name: str,
        environment: str,
        vpc_id: str,
        tags: dict[str, str],
    ) -> None:
        name_prefix = f"{project_name}-{environment}"

        self.vpn = aws.ec2.SecurityGroup(
            f"{name_prefix}-vpn-sg",
            name=f"{name_prefix}-vpn-sg",
            description="Security group for WireGuard VPN server",
            vpc_id=vpc_id,
            ingress=[
                aws.ec2.SecurityGroupIngressArgs(
                    protocol="udp",
                    from_port=51820,
                    to_port=51820,
                    cidr_blocks=["0.0.0.0/0"],
                    description="WireGuard VPN",
                ),
                aws.ec2.SecurityGroupIngressArgs(
                    protocol="tcp",
                    from_port=22,
                    to_port=22,
                    cidr_blocks=["0.0.0.0/0"],
                    description="Temporary SSH bootstrap access",
                ),
            ],
            egress=[
                aws.ec2.SecurityGroupEgressArgs(
                    protocol="-1",
                    from_port=0,
                    to_port=0,
                    cidr_blocks=["0.0.0.0/0"],
                    description="Allow outbound traffic",
                )
            ],
            tags={
                **tags,
                "Name": f"{name_prefix}-vpn-sg",
                "Tier": "security",
            },
        )

        self.app = aws.ec2.SecurityGroup(
            f"{name_prefix}-app-sg",
            name=f"{name_prefix}-app-sg",
            description="Security group for application server",
            vpc_id=vpc_id,
            ingress=[
                aws.ec2.SecurityGroupIngressArgs(
                    protocol="tcp",
                    from_port=80,
                    to_port=80,
                    cidr_blocks=["0.0.0.0/0"],
                    description="HTTP public access",
                ),
                aws.ec2.SecurityGroupIngressArgs(
                    protocol="tcp",
                    from_port=443,
                    to_port=443,
                    cidr_blocks=["0.0.0.0/0"],
                    description="HTTPS public access",
                ),
                aws.ec2.SecurityGroupIngressArgs(
                    protocol="tcp",
                    from_port=22,
                    to_port=22,
                    security_groups=[self.vpn.id],
                    description="SSH access through VPN server only",
                ),
            ],
            egress=[
                aws.ec2.SecurityGroupEgressArgs(
                    protocol="-1",
                    from_port=0,
                    to_port=0,
                    cidr_blocks=["0.0.0.0/0"],
                    description="Allow outbound traffic",
                )
            ],
            tags={
                **tags,
                "Name": f"{name_prefix}-app-sg",
                "Tier": "security",
            },
        )

        self.rds = aws.ec2.SecurityGroup(
            f"{name_prefix}-rds-sg",
            name=f"{name_prefix}-rds-sg",
            description="Security group for PostgreSQL RDS",
            vpc_id=vpc_id,
            ingress=[
                aws.ec2.SecurityGroupIngressArgs(
                    protocol="tcp",
                    from_port=5432,
                    to_port=5432,
                    security_groups=[self.app.id],
                    description="PostgreSQL from app server",
                ),
                aws.ec2.SecurityGroupIngressArgs(
                    protocol="tcp",
                    from_port=5432,
                    to_port=5432,
                    security_groups=[self.vpn.id],
                    description="PostgreSQL admin access through VPN server",
                ),
            ],
            egress=[
                aws.ec2.SecurityGroupEgressArgs(
                    protocol="-1",
                    from_port=0,
                    to_port=0,
                    cidr_blocks=["0.0.0.0/0"],
                    description="Allow outbound traffic",
                )
            ],
            tags={
                **tags,
                "Name": f"{name_prefix}-rds-sg",
                "Tier": "security",
            },
        )