"""A local Ollama server's chat API.

Considered "configured" whenever a base URL is set (it defaults to
localhost:11434) -- unlike the hosted providers, there's no API key to
check, so being reachable is verified at call time instead.
"""
from __future__ import annotations

import requests

from src.config.settings import settings

from .base import AIProvider, AIProviderError


class OllamaProvider(AIProvider):
    id = "ollama"
    name = "Ollama"

    def is_configured(self) -> bool:
        return bool(settings.ollama_base_url)

    def complete(self, system_prompt: str, user_prompt: str) -> str:
        try:
            response = requests.post(
                f"{settings.ollama_base_url.rstrip('/')}/api/chat",
                json={
                    "model": settings.ollama_model,
                    "messages": [
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_prompt},
                    ],
                    "stream": False,
                },
                timeout=120,
            )
            response.raise_for_status()
        except requests.RequestException as exc:
            raise AIProviderError(
                f"Ollama request failed (is a server running at {settings.ollama_base_url}?): {exc}"
            ) from exc
        return response.json()["message"]["content"]
