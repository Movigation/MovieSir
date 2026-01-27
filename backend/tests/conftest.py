import pytest
from fastapi.testclient import TestClient
from backend.main import app


@pytest.fixture
def client():
    """테스트용 클라이언트"""
    return TestClient(app)