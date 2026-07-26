"""Calls the OpenAI Chat Completions API directly over HTTPS.

Uses ``requests`` against the REST endpoint rather than the ``openai``
SDK, to keep the platform's dependency footprint small -- the whole point
of AI being optional is that nothing about installing/running FlowForge
should require it.
"""
from __future__ import annotations

from typing import Any, ClassVar, Dict

import requests

from src.config.settings import settings
from src.models.execution import ExecutionContext
from src.models.plugin import ConfigField, PluginMetadata

from .base import Plugin, PluginConfigError, PluginExecutionError

_CHAT_COMPLETIONS_URL = "https://api.openai.com/v1/chat/completions"


class OpenAIPlugin(Plugin):
    metadata: ClassVar[PluginMetadata] = PluginMetadata(
        id="openai",
        name="OpenAI",
        description="Sends a prompt to an OpenAI chat model and returns the completion.",
        category="ai",
        config_schema=[
            ConfigField("prompt", "string", required=True, description="User prompt"),
            ConfigField("system_prompt", "string", required=False, default="", description="Optional system prompt"),
            ConfigField("model", "string", required=False, default=None, description="Overrides OPENAI_MODEL"),
        ],
    )

    def execute(self, config: Dict[str, Any], context: ExecutionContext) -> Any:
        if not settings.openai_api_key:
            raise PluginConfigError("OpenAI plugin requires OPENAI_API_KEY to be set")

        messages = []
        if config.get("system_prompt"):
            messages.append({"role": "system", "content": config["system_prompt"]})
        messages.append({"role": "user", "content": config["prompt"]})

        try:
            response = requests.post(
                _CHAT_COMPLETIONS_URL,
                headers={"Authorization": f"Bearer {settings.openai_api_key}"},
                json={"model": config.get("model") or settings.openai_model, "messages": messages},
                timeout=60,
            )
            response.raise_for_status()
        except requests.RequestException as exc:
            raise PluginExecutionError(f"OpenAI request failed: {exc}") from exc

        data = response.json()
        text = data["choices"][0]["message"]["content"]
        self._log("openai completion received", model=config.get("model") or settings.openai_model)
        return {"text": text, "raw": data}
