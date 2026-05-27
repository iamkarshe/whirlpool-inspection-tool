from __future__ import annotations

import pulumi

from modules.compute import AppServer
from modules.config import load_config
from modules.database import Database
from modules.network import Network
from modules.security import SecurityGroups
from modules.storage import Storage
from modules.tags import build_tags
from modules.vpn import VpnServer

infra_config = load_config()

common_tags = build_tags(
    project_name=infra_config.project_name,
    environment=infra_config.environment,
    customer=infra_config.customer,
    owner=infra_config.owner,
)

network = Network(
    project_name=infra_config.project_name,
    environment=infra_config.environment,
    tags=common_tags,
)

security_groups = SecurityGroups(
    project_name=infra_config.project_name,
    environment=infra_config.environment,
    vpc_id=network.vpc.id,
    tags=common_tags,
)

storage = Storage(
    project_name=infra_config.project_name,
    environment=infra_config.environment,
    tags=common_tags,
)

database = Database(
    project_name=infra_config.project_name,
    environment=infra_config.environment,
    db_name=infra_config.db_name,
    db_username=infra_config.db_username,
    db_password=infra_config.db_password,
    rds_instance_class=infra_config.rds_instance_class,
    private_db_subnet_ids=network.private_db_subnet_ids,
    rds_security_group_id=security_groups.rds.id,
    tags=common_tags,
)

app_server = AppServer(
    project_name=infra_config.project_name,
    environment=infra_config.environment,
    instance_type=infra_config.app_instance_type,
    public_subnet_id=network.public_subnet_a.id,
    app_security_group_id=security_groups.app.id,
    ssh_public_key_path=infra_config.ssh_public_key_path,
    media_bucket_name=storage.media_bucket.bucket,
    tags=common_tags,
)

vpn_server = VpnServer(
    project_name=infra_config.project_name,
    environment=infra_config.environment,
    instance_type=infra_config.vpn_instance_type,
    public_subnet_id=network.public_subnet_a.id,
    vpn_security_group_id=security_groups.vpn.id,
    ssh_public_key_path=infra_config.ssh_public_key_path,
    tags=common_tags,
)

network.export_outputs()
storage.export_outputs()
database.export_outputs()
app_server.export_outputs()
vpn_server.export_outputs()

pulumi.export("project_name", infra_config.project_name)
pulumi.export("environment", infra_config.environment)
pulumi.export("customer", infra_config.customer)
pulumi.export("domain_name", infra_config.domain_name)
pulumi.export("app_instance_type", infra_config.app_instance_type)
pulumi.export("vpn_instance_type", infra_config.vpn_instance_type)
pulumi.export("rds_instance_class", infra_config.rds_instance_class)