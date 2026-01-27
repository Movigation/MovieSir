"""
Rate Limiting 모듈 (Redis 기반)
- 일일 API 호출 제한
- API Key별 사용량 추적
"""
import redis.asyncio as aioredis
from datetime import date
import os

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379")
redis_client = None


async def get_redis():
    """Redis 클라이언트 반환 (싱글톤)"""
    global redis_client
    if redis_client is None:
        redis_client = await aioredis.from_url(REDIS_URL, decode_responses=True)
    return redis_client


async def check_rate_limit(api_key_id: str, daily_limit: int) -> bool:
    """
    일일 Rate Limit 체크

    Args:
        api_key_id: API 키 ID
        daily_limit: 일일 허용 호출 수

    Returns:
        True: 호출 가능
        False: 한도 초과
    """
    redis = await get_redis()
    key = f"rate_limit:{api_key_id}:{date.today()}"

    count = await redis.incr(key)
    if count == 1:
        # 첫 호출 시 24시간 만료 설정
        await redis.expire(key, 86400)

    return count <= daily_limit


async def get_current_usage(api_key_id: str) -> int:
    """현재 일일 사용량 조회"""
    redis = await get_redis()
    key = f"rate_limit:{api_key_id}:{date.today()}"
    count = await redis.get(key)
    return int(count) if count else 0


async def get_remaining_quota(api_key_id: str, daily_limit: int) -> int:
    """남은 호출 횟수 조회"""
    current = await get_current_usage(api_key_id)
    return max(0, daily_limit - current)
