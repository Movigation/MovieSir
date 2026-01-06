import os
import redis

_redis_client = None

def get_redis_client():
    global _redis_client

    if _redis_client is None:
        redis_url = os.getenv("REDIS_URL")
        if not redis_url:
            raise RuntimeError("REDIS_URL 환경변수가 설정되지 않았습니다.")

        _redis_client = redis.from_url(redis_url, decode_responses=True)

    return _redis_client
