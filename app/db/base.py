from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    pass


# Import all models here so SQLAlchemy registers them and Alembic can discover
# them via metadata. This is the single place where every model is imported,
# which avoids circular imports between model modules (relationships use string
# references resolved from SQLAlchemy's registry, not module-level imports).
from app.models import (  # noqa: E402, F401
    audit,
    disponibilite,
    document,
    dossier,
    medecin,
    messaging,
    motif,
    notification,
    password_reset,
    patient,
    refresh_token,
    rendezvous,
    user,
)
