"""ID generation helpers."""
from __future__ import annotations

import uuid


def new_id(prefix: str) -> str:
    """A short, prefixed unique identifier, e.g. ``wf_3f9a1b2c``."""
    return f"{prefix}_{uuid.uuid4().hex[:12]}"
