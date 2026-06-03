SUPPORTED_TASK_TYPES = frozenset(
    {
        "send_email",
        "generate_report",
        "process_file",
        "send_webhook",
    }
)

DEFAULT_TASK_QUEUE = "default"
DEFAULT_MAX_ATTEMPTS = 3
MIN_MAX_ATTEMPTS = 1
MAX_MAX_ATTEMPTS = 5

CREDENTIAL_KEY_DEFAULT_SMTP = "default_smtp"
