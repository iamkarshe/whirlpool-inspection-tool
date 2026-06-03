from functools import lru_cache

from utils.env import get_celery_result_backend_url, get_redis_url


@lru_cache
def get_celery_app():
    from celery import Celery

    app = Celery(
        "whirlpool_inspection_worker",
        broker=get_redis_url(),
        backend=get_celery_result_backend_url(),
        include=["mod.tasks.worker"],
    )
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
    )
    return app
