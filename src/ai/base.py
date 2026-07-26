"""The provider interface AI-assisted workflow generation is built on.

Every provider is a thin, direct REST client (no vendor SDKs), so the
platform's dependency footprint doesn't grow just because AI generation
exists. Every provider also reports whether it's actually usable right
now (an API key configured, or a reachable Ollama server) -- the AI
service checks that before ever trying to call one, so a misconfigured or
absent provider degrades to a clear error, never a crash.
"""
from __future__ import annotations

from abc import ABC, abstractmethod


class AIProviderError(RuntimeError):
    """Raised when a configured provider's API call itself fails."""


class AIProvider(ABC):
    id: str
    name: str

    @abstractmethod
    def is_configured(self) -> bool:
        """Whether this provider has what it needs (API key, reachable
        endpoint) to actually be called."""

    @abstractmethod
    def complete(self, system_prompt: str, user_prompt: str) -> str:
        """Sends a single system+user prompt pair, returns the raw text
        response. Raises :class:`AIProviderError` on failure."""
