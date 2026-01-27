class TestHealthCheck:
    """헬스체크 테스트"""

    def test_health_check(self, client):
        response = client.get("/")
        assert response.status_code == 200


class TestB2BAuth:
    """B2B 인증 테스트"""

    def test_login_success(self, client):
        """로그인 성공"""
        response = client.post("/b2b/auth/login", json={
            "email": "test@moviesir.cloud",
            "password": "test1234"
        })
        assert response.status_code == 200
        assert "access_token" in response.json()

    def test_login_wrong_password(self, client):
        """비밀번호 틀림"""
        response = client.post("/b2b/auth/login", json={
            "email": "test@moviesir.cloud",
            "password": "wrongpassword"
        })
        assert response.status_code == 401

    def test_login_invalid_email(self, client):
        """존재하지 않는 이메일"""
        response = client.post("/b2b/auth/login", json={
            "email": "notexist@test.com",
            "password": "test1234"
        })
        assert response.status_code == 401


class TestB2BApiKeys:
    """API 키 테스트"""

    def test_get_api_keys_unauthorized(self, client):
        """인증 없이 API 키 조회 시 401"""
        response = client.get("/b2b/api-keys")
        assert response.status_code in [401, 403]