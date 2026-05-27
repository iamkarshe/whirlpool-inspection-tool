from __future__ import annotations

import pulumi
import pulumi_aws as aws


class Network:
    def __init__(
        self,
        project_name: str,
        environment: str,
        tags: dict[str, str],
    ) -> None:
        name_prefix = f"{project_name}-{environment}"

        self.vpc = aws.ec2.Vpc(
            f"{name_prefix}-vpc",
            cidr_block="10.20.0.0/16",
            enable_dns_hostnames=True,
            enable_dns_support=True,
            tags={
                **tags,
                "Name": f"{name_prefix}-vpc",
                "Tier": "network",
            },
        )

        self.internet_gateway = aws.ec2.InternetGateway(
            f"{name_prefix}-igw",
            vpc_id=self.vpc.id,
            tags={
                **tags,
                "Name": f"{name_prefix}-igw",
                "Tier": "network",
            },
        )

        self.public_subnet_a = aws.ec2.Subnet(
            f"{name_prefix}-public-a",
            vpc_id=self.vpc.id,
            cidr_block="10.20.1.0/24",
            availability_zone="ap-south-1a",
            map_public_ip_on_launch=True,
            tags={
                **tags,
                "Name": f"{name_prefix}-public-a",
                "Tier": "public",
            },
        )

        self.public_subnet_b = aws.ec2.Subnet(
            f"{name_prefix}-public-b",
            vpc_id=self.vpc.id,
            cidr_block="10.20.2.0/24",
            availability_zone="ap-south-1b",
            map_public_ip_on_launch=True,
            tags={
                **tags,
                "Name": f"{name_prefix}-public-b",
                "Tier": "public",
            },
        )

        self.private_db_subnet_a = aws.ec2.Subnet(
            f"{name_prefix}-private-db-a",
            vpc_id=self.vpc.id,
            cidr_block="10.20.21.0/24",
            availability_zone="ap-south-1a",
            map_public_ip_on_launch=False,
            tags={
                **tags,
                "Name": f"{name_prefix}-private-db-a",
                "Tier": "database",
            },
        )

        self.private_db_subnet_b = aws.ec2.Subnet(
            f"{name_prefix}-private-db-b",
            vpc_id=self.vpc.id,
            cidr_block="10.20.22.0/24",
            availability_zone="ap-south-1b",
            map_public_ip_on_launch=False,
            tags={
                **tags,
                "Name": f"{name_prefix}-private-db-b",
                "Tier": "database",
            },
        )

        self.public_route_table = aws.ec2.RouteTable(
            f"{name_prefix}-public-rt",
            vpc_id=self.vpc.id,
            routes=[
                aws.ec2.RouteTableRouteArgs(
                    cidr_block="0.0.0.0/0",
                    gateway_id=self.internet_gateway.id,
                )
            ],
            tags={
                **tags,
                "Name": f"{name_prefix}-public-rt",
                "Tier": "network",
            },
        )

        aws.ec2.RouteTableAssociation(
            f"{name_prefix}-public-a-rta",
            subnet_id=self.public_subnet_a.id,
            route_table_id=self.public_route_table.id,
        )

        aws.ec2.RouteTableAssociation(
            f"{name_prefix}-public-b-rta",
            subnet_id=self.public_subnet_b.id,
            route_table_id=self.public_route_table.id,
        )

        self.private_db_route_table = aws.ec2.RouteTable(
            f"{name_prefix}-private-db-rt",
            vpc_id=self.vpc.id,
            tags={
                **tags,
                "Name": f"{name_prefix}-private-db-rt",
                "Tier": "database",
            },
        )

        aws.ec2.RouteTableAssociation(
            f"{name_prefix}-private-db-a-rta",
            subnet_id=self.private_db_subnet_a.id,
            route_table_id=self.private_db_route_table.id,
        )

        aws.ec2.RouteTableAssociation(
            f"{name_prefix}-private-db-b-rta",
            subnet_id=self.private_db_subnet_b.id,
            route_table_id=self.private_db_route_table.id,
        )

        self.public_subnet_ids = [
            self.public_subnet_a.id,
            self.public_subnet_b.id,
        ]

        self.private_db_subnet_ids = [
            self.private_db_subnet_a.id,
            self.private_db_subnet_b.id,
        ]

    def export_outputs(self) -> None:
        pulumi.export("vpc_id", self.vpc.id)
        pulumi.export("public_subnet_a_id", self.public_subnet_a.id)
        pulumi.export("public_subnet_b_id", self.public_subnet_b.id)
        pulumi.export("private_db_subnet_a_id", self.private_db_subnet_a.id)
        pulumi.export("private_db_subnet_b_id", self.private_db_subnet_b.id)