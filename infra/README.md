## AWS Setup

- Configure AWS User

```bash
aws configure --profile whirlpool-pdi-infra
```

- Verify AWS User for AWS CLI

```bash
aws sts get-caller-identity --profile whirlpool-pdi-infra
```
