from __future__ import annotations

import base64
import hashlib
import hmac
import json
from typing import Optional

import pulumi
import pulumi_aws as aws


def _sign(key: bytes, message: str) -> bytes:
    return hmac.new(key, message.encode("utf-8"), hashlib.sha256).digest()


def derive_ses_smtp_password(secret_access_key: str, region: str) -> str:
    """
    Convert an AWS IAM secret access key into an Amazon SES SMTP password.

    This follows the AWS SES SMTP credential derivation algorithm.

    Important:
    - SMTP username = IAM access key ID
    - SMTP password = derived value from IAM secret access key
    - SMTP password is Region-specific
    """

    version = b"\x04"
    date = "11111111"
    service = "ses"
    terminal = "aws4_request"
    message = "SendRawEmail"

    k_date = _sign(("AWS4" + secret_access_key).encode("utf-8"), date)
    k_region = _sign(k_date, region)
    k_service = _sign(k_region, service)
    k_terminal = _sign(k_service, terminal)
    k_message = _sign(k_terminal, message)

    return base64.b64encode(version + k_message).decode("utf-8")


class SmtpEmail:
    def __init__(
        self,
        project_name: str,
        environment: str,
        ses_identity_arn: str,
        from_address: str,
        tags: dict[str, str],
        region: str = "ap-south-1",
        create_secrets_manager_secret: bool = True,
    ) -> None:
        name_prefix = f"{project_name}-{environment}"
        smtp_host = f"email-smtp.{region}.amazonaws.com"

        self.user = aws.iam.User(
            f"{name_prefix}-ses-smtp-user",
            name=f"{name_prefix}-ses-smtp-user",
            force_destroy=True,
            tags={
                **tags,
                "Name": f"{name_prefix}-ses-smtp-user",
                "Tier": "email",
                "Purpose": "ses-smtp",
            },
        )

        self.policy = aws.iam.Policy(
            f"{name_prefix}-ses-smtp-policy",
            name=f"{name_prefix}-ses-smtp-policy",
            description=f"Allow {name_prefix} to send outbound notification emails via Amazon SES SMTP",
            policy=json.dumps(
                {
                    "Version": "2012-10-17",
                    "Statement": [
                        {
                            "Sid": "AllowSesSmtpSendFromSpecificIdentity",
                            "Effect": "Allow",
                            "Action": [
                                "ses:SendRawEmail",
                                "ses:SendEmail",
                            ],
                            "Resource": ses_identity_arn,
                            "Condition": {
                                "StringEquals": {
                                    "ses:FromAddress": from_address,
                                }
                            },
                        }
                    ],
                }
            ),
            tags={
                **tags,
                "Name": f"{name_prefix}-ses-smtp-policy",
                "Tier": "email",
                "Purpose": "ses-smtp",
            },
        )

        self.policy_attachment = aws.iam.UserPolicyAttachment(
            f"{name_prefix}-ses-smtp-policy-attachment",
            user=self.user.name,
            policy_arn=self.policy.arn,
        )

        self.access_key = aws.iam.AccessKey(
            f"{name_prefix}-ses-smtp-access-key",
            user=self.user.name,
            status="Active",
        )

        self.smtp_username = self.access_key.id

        self.smtp_password = pulumi.Output.secret(self.access_key.secret).apply(
            lambda secret: derive_ses_smtp_password(secret, region)
        )

        self.smtp_host = smtp_host
        self.smtp_port = 587
        self.smtp_region = region
        self.from_address = from_address
        self.ses_identity_arn = ses_identity_arn

        self.secret: Optional[aws.secretsmanager.Secret] = None
        self.secret_version: Optional[aws.secretsmanager.SecretVersion] = None

        if create_secrets_manager_secret:
            self.secret = aws.secretsmanager.Secret(
                f"{name_prefix}-ses-smtp-secret",
                name=f"{name_prefix}/ses/smtp",
                description=f"SES SMTP credentials for {name_prefix}",
                tags={
                    **tags,
                    "Name": f"{name_prefix}-ses-smtp-secret",
                    "Tier": "email",
                    "Purpose": "ses-smtp",
                },
            )

            secret_string = pulumi.Output.all(
                smtp_username=self.smtp_username,
                smtp_password=self.smtp_password,
            ).apply(
                lambda args: json.dumps(
                    {
                        "SMTP_HOST": smtp_host,
                        "SMTP_PORT": 587,
                        "SMTP_USERNAME": args["smtp_username"],
                        "SMTP_PASSWORD": args["smtp_password"],
                        "SMTP_FROM": from_address,
                        "SMTP_USE_TLS": True,
                        "SMTP_REGION": region,
                        "SES_IDENTITY_ARN": ses_identity_arn,
                    }
                )
            )

            self.secret_version = aws.secretsmanager.SecretVersion(
                f"{name_prefix}-ses-smtp-secret-version",
                secret_id=self.secret.id,
                secret_string=pulumi.Output.secret(secret_string),
            )

    def export_outputs(self) -> None:
        pulumi.export("ses_smtp_user_name", self.user.name)
        pulumi.export("ses_smtp_access_key_id", self.smtp_username)
        pulumi.export("ses_smtp_host", self.smtp_host)
        pulumi.export("ses_smtp_port", self.smtp_port)
        pulumi.export("ses_smtp_region", self.smtp_region)
        pulumi.export("ses_smtp_from_address", self.from_address)
        pulumi.export("ses_identity_arn", self.ses_identity_arn)

        # Secret output. Pulumi will encrypt this in state.
        # Only reveal with: pulumi stack output ses_smtp_password --show-secrets
        pulumi.export("ses_smtp_password", self.smtp_password)

        if self.secret is not None:
            pulumi.export("ses_smtp_secret_arn", self.secret.arn)