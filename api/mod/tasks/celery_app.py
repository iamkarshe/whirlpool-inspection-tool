from functools import lru_cache
from pathlib import Path

from dotenv import load_dotenv
from kombu import Exchange, Queue

from mod.tasks.constants import DEFAULT_TASK_QUEUE
from utils.env import get_celery_result_backend_url, get_redis_url

api_root = Path(__file__).resolve().parents[2]
load_dotenv(api_root / ".env")

default_exchange = Exchange(DEFAULT_TASK_QUEUE, type="direct")


@lru_cache
def get_celery_app():
    from celery import Celery

    app = Celery(
        "whirlpool_inspection_worker",
        broker=get_redis_url(),
        backend=get_celery_result_backend_url(),
        include=["mod.tasks.worker", "mod.jobs.celery_tasks"],
    )
    from mod.jobs.helper import AUTO_APPROVE_BEAT_INTERVAL_SECONDS

    app.conf.update(
        task_track_started=True,
        task_time_limit=300,
        task_soft_time_limit=240,
        result_expires=3600,
        worker_prefetch_multiplier=1,
        task_acks_late=True,
        task_reject_on_worker_lost=True,
        timezone="Asia/Kolkata",
        enable_utc=False,
        task_default_queue=DEFAULT_TASK_QUEUE,
        task_default_exchange=DEFAULT_TASK_QUEUE,
        task_default_routing_key=DEFAULT_TASK_QUEUE,
        task_queues=(
            Queue(
                DEFAULT_TASK_QUEUE,
                default_exchange,
                routing_key=DEFAULT_TASK_QUEUE,
            ),
            Queue("celery", Exchange("celery", type="direct"), routing_key="celery"),
        ),
        task_create_missing_queues=True,
        beat_schedule={
            "auto_approve_inspections_every_15_minutes": {
                "task": "mod.jobs.celery_tasks.auto_approve_inspections",
                "schedule": AUTO_APPROVE_BEAT_INTERVAL_SECONDS,
                "options": {"queue": DEFAULT_TASK_QUEUE},
            },
        },
    )
    return app
