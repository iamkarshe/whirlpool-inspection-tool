from __future__ import annotations

import pulumi
import pulumi_aws as aws


class Database:
    def __init__(
        self,
        project_name: str,
        environment: str,
        db_name: str,
        db_username: str,
        db_password: pulumi.Output[str],
        rds_instance_class: str,
        private_db_subnet_ids: list[pulumi.Input[str]],
        rds_security_group_id: pulumi.Input[str],
        tags: dict[str, str],
    ) -> None:
        name_prefix = f"{project_name}-{environment}"

        self.subnet_group = aws.rds.SubnetGroup(
            f"{name_prefix}-rds-subnet-group",
            subnet_ids=private_db_subnet_ids,
            tags={
                **tags,
                "Name": f"{name_prefix}-rds-subnet-group",
                "Tier": "database",
            },
        )

        self.instance = aws.rds.Instance(
            f"{name_prefix}-postgres",
            identifier=f"{name_prefix}-postgres",
            engine="postgres",
            engine_version="16",
            instance_class=rds_instance_class,
            allocated_storage=20,
            max_allocated_storage=100,
            storage_type="gp3",
            db_name=db_name,
            username=db_username,
            password=db_password,
            port=5432,
            db_subnet_group_name=self.subnet_group.name,
            vpc_security_group_ids=[rds_security_group_id],
            publicly_accessible=False,
            multi_az=False,
            storage_encrypted=True,
            backup_retention_period=7,
            backup_window="20:00-21:00",
            maintenance_window="sun:21:30-sun:22:30",
            deletion_protection=True,
            skip_final_snapshot=False,
            final_snapshot_identifier=f"{name_prefix}-postgres-final-snapshot",
            apply_immediately=True,
            tags={
                **tags,
                "Name": f"{name_prefix}-postgres",
                "Tier": "database",
            },
        )

    def export_outputs(self) -> None:
        pulumi.export("rds_endpoint", self.instance.endpoint)
        pulumi.export("rds_address", self.instance.address)
        pulumi.export("rds_port", self.instance.port)