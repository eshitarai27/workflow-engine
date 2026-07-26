"""Holds every available plugin instance, keyed by id."""
from __future__ import annotations

from typing import Dict, List, Optional

from .base import Plugin


class PluginNotFoundError(KeyError):
    pass


class PluginRegistry:
    def __init__(self, event_bus: Optional[object] = None) -> None:
        self._plugins: Dict[str, Plugin] = {}
        self._event_bus = event_bus

    def register(self, plugin: Plugin) -> None:
        self._plugins[plugin.metadata.id] = plugin
        if self._event_bus is not None:
            from src.models.enums import EventType

            self._event_bus.publish(EventType.PLUGIN_LOADED, {"plugin_id": plugin.metadata.id})

    def get(self, plugin_id: str) -> Plugin:
        try:
            return self._plugins[plugin_id]
        except KeyError as exc:
            raise PluginNotFoundError(f"No plugin registered with id '{plugin_id}'") from exc

    def has(self, plugin_id: str) -> bool:
        return plugin_id in self._plugins

    def all_ids(self) -> List[str]:
        return list(self._plugins.keys())

    def all_metadata(self) -> List[dict]:
        return [p.metadata.to_dict() for p in self._plugins.values()]


def build_default_registry(event_bus: Optional[object] = None) -> PluginRegistry:
    """Constructs a registry with every built-in plugin registered."""
    from .docker_plugin import DockerPlugin
    from .email_plugin import EmailPlugin
    from .filesystem_plugin import FilesystemPlugin
    from .http_plugin import HttpPlugin
    from .javascript_plugin import JavaScriptPlugin
    from .openai_plugin import OpenAIPlugin
    from .python_plugin import PythonPlugin
    from .slack_plugin import SlackPlugin
    from .sql_plugin import SqlPlugin
    from .webhook_plugin import WebhookPlugin

    registry = PluginRegistry(event_bus=event_bus)
    for plugin_cls in (
        HttpPlugin,
        WebhookPlugin,
        PythonPlugin,
        SqlPlugin,
        JavaScriptPlugin,
        FilesystemPlugin,
        EmailPlugin,
        SlackPlugin,
        OpenAIPlugin,
        DockerPlugin,
    ):
        registry.register(plugin_cls())
    return registry
