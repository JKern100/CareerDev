"""Tests for auth utility functions."""

from app.services.auth import (
    create_access_token,
    create_reset_token,
    create_verification_token,
    create_oauth_state_token,
    verify_oauth_state_token,
    hash_password,
    verify_password,
)


def test_hash_and_verify_password():
    hashed = hash_password("testpassword123")
    assert verify_password("testpassword123", hashed) is True
    assert verify_password("wrongpassword", hashed) is False


def test_create_access_token():
    token = create_access_token(data={"sub": "test-user-id"})
    assert isinstance(token, str)
    assert len(token) > 0


def test_create_reset_token():
    token = create_reset_token(email="test@example.com")
    assert isinstance(token, str)
    assert len(token) > 0


def test_create_verification_token():
    token = create_verification_token(email="test@example.com")
    assert isinstance(token, str)
    assert len(token) > 0


def test_oauth_state_token_roundtrip():
    token = create_oauth_state_token()
    assert verify_oauth_state_token(token) is True


def test_oauth_state_token_rejects_bad_token():
    assert verify_oauth_state_token("invalid-token") is False
