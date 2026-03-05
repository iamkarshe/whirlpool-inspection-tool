import logging

from rich.console import Console

from utils.env import get_env


def setup_logging() -> None:
    level_name = get_env("LOG_LEVEL", "INFO").upper()
    level = getattr(logging, level_name, logging.INFO)

    logging.basicConfig(
        level=level,
        format="%(asctime)s %(levelname)s %(name)s %(message)s",
    )


rich_console = Console()


def debug_rich_console():
    if True:
        rich_console.print_exception(show_locals=True)
    pass
