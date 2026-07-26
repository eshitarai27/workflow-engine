"""OpenAI chat completions, called directly over HTTPS."""
from __future__ import annotations

import requests

from src.config.settings import settings

from .base import AIProvider, AIProviderError

_URL = "https://api.openai.com/v1/chat/completions"


class OpenAIProvider(AIProvider):
    id = "openai"
    name = "OpenAI"

    def is_configured(self) -> bool:
        return bool(settings.openai_api_key)

    def complete(self, system_prompt: str, user_prompt: str) -> str:
        try:
            response = requests.post(
                _URL,
                headers={"Authorization": f"Bearer {settings.openai_api_key}"},
                json={
                    "model": settings.openai_model,
                    "messages": [
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_prompt},
                    ],
                    "temperature": 0.2,
                },
                timeout=60,
            )
            response.raise_for_status()
        except requests.RequestException as exc:
            raise AIProviderError(f"OpenAI request failed: {exc}") from exc
        return response.json()["choices"][0]["message"]["content"]
