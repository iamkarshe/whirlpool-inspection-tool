## Git commits

Changes under `infra/` use **`[infra]`** as the module prefix in commit messages (same style as `[feature]`, `[cleanup]` elsewhere in the repo).

Examples:

- `[infra] Add Pulumi state bucket bootstrap scripts`
- `[infra] Load config from .env in setup scripts`

## AWS Setup

- Configure AWS User

```bash
aws configure --profile whirlpool-pdi-infra
```

- Verify AWS User for AWS CLI

```bash
aws sts get-caller-identity --profile whirlpool-pdi-infra
```

## EC2 Private keys for access

```bash
test -f ~/.ssh/whirlpool_pdi_infra_ed25519 || ssh-keygen -t ed25519 -f ~/.ssh/whirlpool_pdi_infra_ed25519 -C "whirlpool-pdi-infra"
pulumi config set ssh_public_key_path ~/.ssh/whirlpool_pdi_infra_ed25519.pub
```

- Get private IP for accessing the instance via jump-proxy

```bash
aws ec2 describe-instances \
  --filters "Name=tag:Name,Values=whirlpool-pdi-prod-app-server" "Name=instance-state-name,Values=running" \
  --query "Reservations[0].Instances[0].PrivateIpAddress" \
  --output text
```
