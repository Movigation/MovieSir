# backend/domains/__init__.py
# 모든 모델을 여기서 import하여 SQLAlchemy relationship이 올바르게 동작하도록 함

from backend.domains.user.models import User, UserOttMap, UserOnboardingAnswer
from backend.domains.movie.models import Movie, MovieVector, OttProvider, MovieOttMap
from backend.domains.recommendation.models import MovieLog, MovieClick, RecommendationSession
from backend.domains.onboarding.models import OnboardingCandidate
from backend.domains.b2b.models import Company, ApiKey, ApiUsage, ApiLog, ContentRule, GuestSession

__all__ = [
    "User",
    "UserOttMap",
    "UserOnboardingAnswer",
    "Movie",
    "MovieVector",
    "OttProvider",
    "MovieOttMap",
    "MovieLog",
    "MovieClick",
    "RecommendationSession",
    "OnboardingCandidate",
    # B2B Models
    "Company",
    "ApiKey",
    "ApiUsage",
    "ApiLog",
    "ContentRule",
    "GuestSession",
]
