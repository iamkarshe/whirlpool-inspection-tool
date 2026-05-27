from __future__ import annotations

from dataclasses import dataclass

import pulumi


@dataclass(frozen=True)
class InfraConfig:
    project_name: str
    environment: str
    customer: str
    owner: str
    domain_name: str
    db_name: str
    db_username: str
    db_password: pulumi.Output[str]
    app_instance_type: str
    vpn_instance_type: str
    rds_instance_class: str
    ssh_public_key_path: str


def load_config() -> InfraConfig:
    config = pulumi.Config()

    return InfraConfig(
        project_name=config.require("project_name"),
        environment=config.require("environment"),
        customer=config.require("customer"),
        owner=config.require("owner"),
        domain_name=config.require("domain_name"),
        db_name=config.require("db_name"),
        db_username=config.require("db_username"),
        db_password=config.require_secret("db_password"),
        app_instance_type=config.require("app_instance_type"),
        vpn_instance_type=config.require("vpn_instance_type"),
        rds_instance_class=config.require("rds_instance_class"),
        ssh_public_key_path=config.require("ssh_public_key_path"),
    )