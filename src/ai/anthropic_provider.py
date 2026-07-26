"""Anthropic Messages API, called directly over HTTPS."""
from __future__ import annotations

import requests

from src.config.settings import settings

from .base import AIProvider, AIProviderError

_URL = "https://api.anthropic.com/v1/messages"
_API_VERSION = "2023-06-01"


class AnthropicProvider(AIProvider):
    id = "anthropic"
    name = "Anthropic"

    def is_configured(self) -> bool:
        return bool(settings.anthropic_api_key)

    def complete(self, system_prompt: str, user_prompt: str) -> str:
        try:
            response = requests.post(
                _URL,
                headers={
                    "x-api-key": settings.anthropic_api_key,
                    "anthropic-version": _API_VERSION,
                    "content-type": "application/json",
                },
                json={
                    "model": settings.anthropic_model,
                    "max_tokens": 4096,
                    "system": system_prompt,
                    "messages": [{"role": "user", "content": user_prompt}],
                },
                timeout=60,
            )
            response.raise_for_status()
        except requests.RequestException as exc:
            raise AIProviderError(f"Anthropic request failed: {exc}") from exc
        return response.json()["content"][0]["text"]
