"""Metadata and configuration-schema models for the plugin system."""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional


@dataclass
class ConfigField:
    """One field in a plugin's configuration schema, for validation and for
    the frontend's Plugin Manager to render a form from."""

    name: str
    type: str  # "string" | "number" | "boolean" | "object" | "array"
    required: bool = True
    default: Any = None
    description: str = ""
    secret: bool = False

    def to_dict(self) -> Dict[str, Any]:
        return {
            "name": self.name,
            "type": self.type,
            "required": self.required,
            "default": self.default,
            "description": self.description,
            "secret": self.secret,
        }


@dataclass
class PluginMetadata:
    """Descriptive information a plugin exposes about itself."""

    id: str
    name: str
    description: str
    version: str = "1.0.0"
    category: str = "general"
    config_schema: List[ConfigField] = field(default_factory=list)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "name": self.name,
            "description": self.description,
            "version": self.version,
            "category": self.category,
            "config_schema": [f.to_dict() for f in self.config_schema],
        }
