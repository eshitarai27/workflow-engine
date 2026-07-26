"""Fires an event to an external webhook URL as a JSON POST."""
from __future__ import annotations

from typing import Any, ClassVar, Dict

import requests

from src.models.execution import ExecutionContext
from src.models.plugin import ConfigField, PluginMetadata

from .base import Plugin, PluginExecutionError


class WebhookPlugin(Plugin):
    metadata: ClassVar[PluginMetadata] = PluginMetadata(
        id="webhook",
        name="Webhook",
        description="Posts a JSON payload to an external webhook URL.",
        category="network",
        config_schema=[
            ConfigField("url", "string", required=True, description="Webhook URL"),
            ConfigField("payload", "object", required=False, default={}, description="JSON payload to send"),
            ConfigField("timeout_seconds", "number", required=False, default=10, description="Request timeout"),
        ],
    )

    def execute(self, config: Dict[str, Any], context: ExecutionContext) -> Any:
        url = config["url"]
        payload = config.get("payload") or {}
        try:
            response = requests.post(url, json=payload, timeout=float(config.get("timeout_seconds", 10)))
        except requests.RequestException as exc:
            raise PluginExecutionError(f"Webhook POST to {url} failed: {exc}") from exc

        self._log("webhook delivered", url=url, status_code=response.status_code)
        return {"status_code": response.status_code, "delivered": response.ok}
