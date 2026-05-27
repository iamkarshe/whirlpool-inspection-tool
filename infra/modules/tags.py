from __future__ import annotations


def build_tags(
    project_name: str,
    environment: str,
    customer: str,
    owner: str,
    extra_tags: dict[str, str] | None = None,
) -> dict[str, str]:
    tags = {
        "Project": project_name,
        "Environment": environment,
        "Customer": customer,
        "Owner": owner,
        "ManagedBy": "pulumi",
        "Application": "warehouse-pdi",
    }

    if extra_tags:
        tags.update(extra_tags)

    return tags