from __future__ import annotations

import pulumi
import pulumi_aws as aws


class Storage:
    def __init__(
        self,
        project_name: str,
        environment: str,
        tags: dict[str, str],
    ) -> None:
        name_prefix = f"{project_name}-{environment}"
        bucket_name = f"{project_name}-{environment}-media"

        self.media_bucket = aws.s3.Bucket(
            f"{name_prefix}-media-bucket",
            bucket=bucket_name,
            force_destroy=False,
            tags={
                **tags,
                "Name": bucket_name,
                "Tier": "storage",
                "Purpose": "media-upload",
            },
        )

        aws.s3.BucketPublicAccessBlock(
            f"{name_prefix}-media-public-access-block",
            bucket=self.media_bucket.id,
            block_public_acls=True,
            block_public_policy=True,
            ignore_public_acls=True,
            restrict_public_buckets=True,
        )

        aws.s3.BucketServerSideEncryptionConfiguration(
            f"{name_prefix}-media-encryption",
            bucket=self.media_bucket.id,
            rules=[
                aws.s3.BucketServerSideEncryptionConfigurationRuleArgs(
                    apply_server_side_encryption_by_default=aws.s3.BucketServerSideEncryptionConfigurationRuleApplyServerSideEncryptionByDefaultArgs(
                        sse_algorithm="AES256",
                    )
                )
            ],
        )

        aws.s3.BucketVersioning(
            f"{name_prefix}-media-versioning",
            bucket=self.media_bucket.id,
            versioning_configuration=aws.s3.BucketVersioningVersioningConfigurationArgs(
                status="Enabled",
            ),
        )

        aws.s3.BucketLifecycleConfiguration(
            f"{name_prefix}-media-lifecycle",
            bucket=self.media_bucket.id,
            rules=[
                aws.s3.BucketLifecycleConfigurationRuleArgs(
                    id="archive-media-after-90-days",
                    status="Enabled",
                    filter=aws.s3.BucketLifecycleConfigurationRuleFilterArgs(
                        prefix="",
                    ),
                    transitions=[
                        aws.s3.BucketLifecycleConfigurationRuleTransitionArgs(
                            days=90,
                            storage_class="GLACIER",
                        )
                    ],
                    noncurrent_version_transitions=[
                        aws.s3.BucketLifecycleConfigurationRuleNoncurrentVersionTransitionArgs(
                            noncurrent_days=90,
                            storage_class="GLACIER",
                        )
                    ],
                )
            ],
        )

    def export_outputs(self) -> None:
        pulumi.export("media_bucket_name", self.media_bucket.bucket)