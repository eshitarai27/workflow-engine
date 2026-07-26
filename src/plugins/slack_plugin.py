"""Posts a message to a Slack Incoming Webhook."""
from __future__ import annotations

from typing import Any, ClassVar, Dict

import requests

from src.config.settings import settings
from src.models.execution import ExecutionContext
from src.models.plugin import ConfigField, PluginMetadata

from .base import Plugin, PluginConfigError, PluginExecutionError


class SlackPlugin(Plugin):
    metadata: ClassVar[PluginMetadata] = PluginMetadata(
        id="slack",
        name="Slack",
        description="Posts a message to a Slack channel via an Incoming Webhook.",
        category="notification",
        config_schema=[
            ConfigField("message", "string", required=True, description="Message text"),
            ConfigField(
                "webhook_url", "string", required=False, default=None,
                description="Overrides SLACK_WEBHOOK_URL if set", secret=True,
            ),
        ],
    )

    def execute(self, config: Dict[str, Any], context: ExecutionContext) -> Any:
        webhook_url = config.get("webhook_url") or settings.slack_webhook_url
        if not webhook_url:
            raise PluginConfigError(
                "Slack plugin requires a webhook URL: set SLACK_WEBHOOK_URL or pass config.webhook_url"
            )

        try:
            response = requests.post(webhook_url, json={"text": config["message"]}, timeout=10)
        except requests.RequestException as exc:
            raise PluginExecutionError(f"Slack post failed: {exc}") from exc

        self._log("slack message posted", status_code=response.status_code)
        return {"delivered": response.ok, "status_code": response.status_code}
