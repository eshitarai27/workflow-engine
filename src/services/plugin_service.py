"""Read-only access to the plugin registry for the API's Plugin Manager."""
from __future__ import annotations

from typing import Any, Dict, List

from src.plugins.registry import PluginRegistry


class PluginService:
    def __init__(self, registry: PluginRegistry) -> None:
        self.registry = registry

    def list_plugins(self) -> List[Dict[str, Any]]:
        return self.registry.all_metadata()

    def validate_config(self, plugin_id: str, config: Dict[str, Any]) -> List[str]:
        return self.registry.get(plugin_id).validate(config)
