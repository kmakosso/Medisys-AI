from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    pass


# Import all models here so Alembic can discover them via metadata
from app.models import audit, disponibilite, dossier, medecin, patient, rendezvous, user  # noqa: E402, F401
