"""
Celery application configuration.
Queues: default · ai · ingest · analytics  (PRD v4 §3, SAD §3)
"""
import os

from celery import Celery

# RC-03 (P1-7/blocker): default to PROD like wsgi.py/asgi.py. A dev/CI run sets
# DJANGO_SETTINGS_MODULE explicitly; defaulting to dev here meant any Celery
# invocation without that env silently ran eager on SQLite (async → sync).
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.prod")

app = Celery("prepgenius")

app.config_from_object("django.conf:settings", namespace="CELERY")

app.autodiscover_tasks()

app.conf.task_queues = {
    "default": {"exchange": "default", "routing_key": "default"},
    "ai": {"exchange": "ai", "routing_key": "ai"},
    "ingest": {"exchange": "ingest", "routing_key": "ingest"},
    "analytics": {"exchange": "analytics", "routing_key": "analytics"},
}

app.conf.task_default_queue = "default"
app.conf.task_default_exchange = "default"
app.conf.task_default_routing_key = "default"
