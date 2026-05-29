from fastapi import APIRouter

from app.api.v1 import (
    auth,
    disponibilites,
    dossiers,
    medecins,
    notifications,
    patients,
    rendezvous,
)

api_router = APIRouter(prefix="/api/v1")

api_router.include_router(auth.router)
api_router.include_router(patients.router)
api_router.include_router(medecins.router)
api_router.include_router(disponibilites.router)
api_router.include_router(rendezvous.router)
api_router.include_router(dossiers.router)
api_router.include_router(notifications.router)
