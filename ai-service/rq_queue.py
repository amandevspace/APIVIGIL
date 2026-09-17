import os

from redis import Redis
from rq import Queue
from rq.serializers import JSONSerializer


REDIS_URL = os.getenv("REDIS_URL", "redis://redis:6379")
redis_connection = Redis.from_url(REDIS_URL)
metrics_queue = Queue("metrics", connection=redis_connection, serializer=JSONSerializer)