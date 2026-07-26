"""Google Gemini's generateContent API, called directly over HTTPS."""
from __future__ import annotations

import requests

from src.config.settings import settings

from .base import AIProvider, AIProviderError


class GoogleProvider(AIProvider):
    id = "google"
    name = "Google Gemini"

    def is_configured(self) -> bool:
        return bool(settings.google_api_key)

    def complete(self, system_prompt: str, user_prompt: str) -> str:
        url = (
            f"https://generativelanguage.googleapis.com/v1beta/models/"
            f"{settings.google_model}:generateContent?key={settings.google_api_key}"
        )
        try:
            response = requests.post(
                url,
                json={
                    "system_instruction": {"parts": [{"text": system_prompt}]},
                    "contents": [{"role": "user", "parts": [{"text": user_prompt}]}],
                },
                timeout=60,
            )
            response.raise_for_status()
        except requests.RequestException as exc:
            raise AIProviderError(f"Google Gemini request failed: {exc}") from exc
        data = response.json()
        return data["candidates"][0]["content"]["parts"][0]["text"]
