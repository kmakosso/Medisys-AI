"""Tests: register, login, refresh, /me."""

import pytest
from httpx import AsyncClient


REGISTER_URL = "/api/v1/auth/register"
LOGIN_URL = "/api/v1/auth/login"
REFRESH_URL = "/api/v1/auth/refresh"
ME_URL = "/api/v1/auth/me"

VALID_PATIENT = {
    "email": "alice@test.sn",
    "password": "Alice1234!",
    "nom": "Alice",
    "prenom": "Diallo",
}


@pytest.mark.asyncio
async def test_register_patient_success(client: AsyncClient):
    resp = await client.post(REGISTER_URL, json=VALID_PATIENT)
    assert resp.status_code == 201
    data = resp.json()
    assert "access_token" in data
    assert "refresh_token" in data


@pytest.mark.asyncio
async def test_register_duplicate_email(client: AsyncClient):
    await client.post(REGISTER_URL, json=VALID_PATIENT)
    resp = await client.post(REGISTER_URL, json=VALID_PATIENT)
    assert resp.status_code == 409


@pytest.mark.asyncio
async def test_register_weak_password(client: AsyncClient):
    body = {**VALID_PATIENT, "password": "short"}
    resp = await client.post(REGISTER_URL, json=body)
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_register_invalid_email(client: AsyncClient):
    body = {**VALID_PATIENT, "email": "not-an-email"}
    resp = await client.post(REGISTER_URL, json=body)
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_login_success(client: AsyncClient):
    await client.post(REGISTER_URL, json=VALID_PATIENT)
    resp = await client.post(LOGIN_URL, json={"email": VALID_PATIENT["email"], "password": VALID_PATIENT["password"]})
    assert resp.status_code == 200
    assert "access_token" in resp.json()


@pytest.mark.asyncio
async def test_login_wrong_password(client: AsyncClient):
    await client.post(REGISTER_URL, json=VALID_PATIENT)
    resp = await client.post(LOGIN_URL, json={"email": VALID_PATIENT["email"], "password": "WrongPass9"})
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_login_unknown_email(client: AsyncClient):
    resp = await client.post(LOGIN_URL, json={"email": "nobody@test.sn", "password": "Whatever1"})
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_refresh_token_rotation(client: AsyncClient):
    reg = await client.post(REGISTER_URL, json=VALID_PATIENT)
    refresh_token = reg.json()["refresh_token"]

    resp = await client.post(REFRESH_URL, json={"refresh_token": refresh_token})
    assert resp.status_code == 200
    new_tokens = resp.json()
    assert new_tokens["refresh_token"] != refresh_token  # new token issued

    # Old refresh token must be revoked
    resp2 = await client.post(REFRESH_URL, json={"refresh_token": refresh_token})
    assert resp2.status_code == 401


@pytest.mark.asyncio
async def test_me_authenticated(client: AsyncClient):
    reg = await client.post(REGISTER_URL, json=VALID_PATIENT)
    token = reg.json()["access_token"]
    resp = await client.get(ME_URL, headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 200
    assert resp.json()["email"] == VALID_PATIENT["email"]
    assert resp.json()["role"] == "patient"


@pytest.mark.asyncio
async def test_me_unauthenticated(client: AsyncClient):
    resp = await client.get(ME_URL)
    assert resp.status_code in (401, 403)  # no credentials provided


@pytest.mark.asyncio
async def test_me_invalid_token(client: AsyncClient):
    resp = await client.get(ME_URL, headers={"Authorization": "Bearer invalid.token.here"})
    assert resp.status_code == 401
