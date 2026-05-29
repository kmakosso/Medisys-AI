from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


class NotificationResponse(BaseModel):
    model_config = {"from_attributes": True}

    id: UUID
    type: str
    message: str
    lu: bool
    created_at: datetime
