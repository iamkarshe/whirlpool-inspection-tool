import pulumi
import pulumi_aws as aws

backup_bucket = aws.s3.BucketV2(
    "app-backup-bucket",
    bucket="your-project-uat-backups",
)

lifecycle = aws.s3.BucketLifecycleConfigurationV2(
    "app-backup-lifecycle",
    bucket=backup_bucket.id,
    rules=[
        aws.s3.BucketLifecycleConfigurationV2RuleArgs(
            id="archive-logs-and-backups",
            status="Enabled",
            filter=aws.s3.BucketLifecycleConfigurationV2RuleFilterArgs(
                prefix="backups/",
            ),
            transitions=[
                aws.s3.BucketLifecycleConfigurationV2RuleTransitionArgs(
                    days=30,
                    storage_class="STANDARD_IA",
                ),
                aws.s3.BucketLifecycleConfigurationV2RuleTransitionArgs(
                    days=90,
                    storage_class="GLACIER",
                ),
                aws.s3.BucketLifecycleConfigurationV2RuleTransitionArgs(
                    days=365,
                    storage_class="DEEP_ARCHIVE",
                ),
            ],
            expiration=aws.s3.BucketLifecycleConfigurationV2RuleExpirationArgs(
                days=2555,  # approx 7 years
            ),
        )
    ],
)