"""Makes an outbound HTTP request."""
from __future__ import annotations

from typing import Any, ClassVar, Dict

import requests

from src.models.execution import ExecutionContext
from src.models.plugin import ConfigField, PluginMetadata

from .base import Plugin, PluginExecutionError


class HttpPlugin(Plugin):
    metadata: ClassVar[PluginMetadata] = PluginMetadata(
        id="http",
        name="HTTP Request",
        description="Makes an HTTP request and returns the response.",
        category="network",
        config_schema=[
            ConfigField("url", "string", required=True, description="Request URL"),
            ConfigField("method", "string", required=False, default="GET", description="HTTP method"),
            ConfigField("headers", "object", required=False, default={}, description="Request headers"),
            ConfigField("json_body", "object", required=False, default=None, description="JSON request body"),
            ConfigField("timeout_seconds", "number", required=False, default=10, description="Request timeout"),
        ],
    )

    def execute(self, config: Dict[str, Any], context: ExecutionContext) -> Any:
        method = str(config.get("method", "GET")).upper()
        url = config["url"]
        try:
            response = requests.request(
                method,
                url,
                headers=config.get("headers") or {},
                json=config.get("json_body"),
                timeout=float(config.get("timeout_seconds", 10)),
            )
        except requests.RequestException as exc:
            raise PluginExecutionError(f"HTTP request to {url} failed: {exc}") from exc

        try:
            body: Any = response.json()
        except ValueError:
            body = response.text

        self._log("http request completed", url=url, method=method, status_code=response.status_code)
        return {
            "status_code": response.status_code,
            "body": body,
            "headers": dict(response.headers),
        }
