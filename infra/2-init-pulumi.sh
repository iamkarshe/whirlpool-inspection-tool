#!/usr/bin/env bash
set -euo pipefail

source "$(dirname "$0")/0-load-env.sh"

# These must come from .env via 0-load-env.sh
: "${PULUMI_STACK:?PULUMI_STACK must be set in .env}"

pulumi login "s3://$STATE_BUCKET"

pulumi stack init "$PULUMI_STACK"

pulumi stack select "$PULUMI_STACK"

pulumi config set aws:profile "$AWS_PROFILE"
pulumi config set aws:region "$AWS_REGION"

pulumi config set project_name "$PROJECT_NAME"
pulumi config set environment "$ENVIRONMENT"
pulumi config set customer "$CUSTOMER"
pulumi config set owner "$OWNER"
pulumi config set domain_name "$DOMAIN_NAME"

pulumi config set db_name "$DB_NAME"
pulumi config set db_username "$DB_USERNAME"
pulumi config set --secret db_password "$DB_PASSWORD"

pulumi config set app_instance_type "$APP_INSTANCE_TYPE"
pulumi config set vpn_instance_type "$VPN_INSTANCE_TYPE"
pulumi config set rds_instance_class "$RDS_INSTANCE_CLASS"