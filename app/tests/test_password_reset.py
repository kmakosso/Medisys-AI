"""Tests: flow de réinitialisation de mot de passe."""

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.services import auth_service

REGISTER_URL = "/api/v1/auth/register"
LOGIN_URL = "/api/v1/auth/login"
FORGOT_URL = "/api/v1/auth/forgot-password"
RESET_URL = "/api/v1/auth/reset-password"


async def _register(client: AsyncClient, email: str) -> None:
    await client.post(
        REGISTER_URL,
        json={"email": email, "password": "Patient1234!", "nom": "P", "prenom": "P"},
    )


@pytest.mark.asyncio
async def test_forgot_password_always_202_even_unknown_email(client: AsyncClient):
    resp = await client.post(FORGOT_URL, json={"email": "inconnu@test.sn"})
    assert resp.status_code == 202


@pytest.mark.asyncio
async def test_reset_password_full_flow(client: AsyncClient, db_session: AsyncSession):
    await _register(client, "reset.me@test.sn")
    user = await auth_service.get_user_by_email(db_session, "reset.me@test.sn")
    assert user is not None

    token = await auth_service.create_password_reset_token(db_session, user)
    await db_session.commit()

    resp = await client.post(RESET_URL, json={"token": token, "password": "NewPass2026!"})
    assert resp.status_code == 200

    old = await client.post(LOGIN_URL, json={"email": "reset.me@test.sn", "password": "Patient1234!"})
    assert old.status_code == 401
    new = await client.post(LOGIN_URL, json={"email": "reset.me@test.sn", "password": "NewPass2026!"})
    assert new.status_code == 200


@pytest.mark.asyncio
async def test_reset_password_token_single_use(client: AsyncClient, db_session: AsyncSession):
    await _register(client, "single.use@test.sn")
    user = await auth_service.get_user_by_email(db_session, "single.use@test.sn")
    assert user is not None
    token = await auth_service.create_password_reset_token(db_session, user)
    await db_session.commit()

    first = await client.post(RESET_URL, json={"token": token, "password": "FirstPass2026!"})
    assert first.status_code == 200
    second = await client.post(RESET_URL, json={"token": token, "password": "SecondPass2026!"})
    assert second.status_code == 400


@pytest.mark.asyncio
async def test_reset_password_invalid_token(client: AsyncClient):
    resp = await client.post(
        RESET_URL, json={"token": "n-importe-quoi-xxxxxxxx", "password": "Whatever2026!"}
    )
    assert resp.status_code == 400
