"""
Tests for authentication and authorization functionality.
"""
import pytest
from fastapi import status
from fastapi.testclient import TestClient

from backend.main import app

client = TestClient(app)


def test_login_success():
    """Test successful login with correct credentials."""
    response = client.post(
        "/api/auth/token",
        data={"username": "testuser", "password": "testpassword"},
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )
    assert response.status_code == status.HTTP_200_OK
    assert "access_token" in response.json()
    assert response.json()["token_type"] == "bearer"


def test_login_invalid_credentials():
    """Test login with invalid credentials."""
    response = client.post(
        "/api/auth/token",
        data={"username": "wronguser", "password": "wrongpassword"},
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )
    assert response.status_code == status.HTTP_401_UNAUTHORIZED
    assert response.json()["detail"] == "Incorrect username or password"


def test_protected_endpoint_without_token():
    """Test accessing a protected endpoint without a token."""
    response = client.get("/api/auth/users/me/")
    assert response.status_code == status.HTTP_401_UNAUTHORIZED
    assert "Not authenticated" in response.json()["detail"]


def test_protected_endpoint_with_token():
    """Test accessing a protected endpoint with a valid token."""
    # First get a token
    login_response = client.post(
        "/api/auth/token",
        data={"username": "testuser", "password": "testpassword"},
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )
    token = login_response.json()["access_token"]

    # Use the token to access a protected endpoint
    response = client.get(
        "/api/auth/users/me/", headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == status.HTTP_200_OK
    assert response.json()["username"] == "testuser"


@pytest.mark.parametrize(
    "endpoint", ["/api/health", "/metrics", "/api/readiness", "/api/liveness"]
)
def test_public_endpoints(endpoint):
    """Test that public endpoints are accessible without authentication."""
    response = client.get(endpoint)
    assert response.status_code == status.HTTP_200_OK
