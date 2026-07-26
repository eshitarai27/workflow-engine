"""Turns a natural-language description into a workflow definition.

This is the one genuinely optional feature in the whole platform: every
other module works with zero configuration, but this one needs a
configured AI provider to do anything. When none is configured, callers
get a clear, typed error rather than a crash -- see
``AIWorkflowGenerator.available_providers``.
"""
from __future__ import annotations

import json
import re
from dataclasses import dataclass
from typing import Any, Dict, List, Optional

from src.compiler.compiler import CycleDetectedError, WorkflowCompiler
from src.compiler.validator import WorkflowValidationError
from src.plugins.registry import PluginRegistry
from src.utils.ids import new_id

from .anthropic_provider import AnthropicProvider
from .base import AIProvider, AIProviderError
from .google_provider import GoogleProvider
from .ollama_provider import OllamaProvider
from .openai_provider import OpenAIProvider

_SYSTEM_PROMPT_TEMPLATE = """You are a workflow compiler assistant for FlowForge, a DAG-based workflow \
orchestration platform. Convert the user's natural-language description into a JSON workflow definition.

Output ONLY a single JSON object (no markdown fences, no commentary outside the JSON) with this exact shape:
{{
  "name": "short descriptive name",
  "description": "one sentence description",
  "nodes": [
    {{"id": "snake_case_id", "name": "Human readable name", "action": {{"plugin_id": "<one of: {plugin_ids}>", "config": {{...plugin-specific config...}}}}}}
  ],
  "edges": [{{"source": "node_id", "target": "node_id"}}],
  "explanation": "2-4 sentences explaining the workflow you generated and why"
}}

Rules:
- The graph MUST be acyclic (no node may (directly or indirectly) depend on itself).
- Every edge's source and target must reference a node id that exists in "nodes".
- Only use plugin_id values from this list: {plugin_ids}.
- Prefer the smallest graph that fulfills the request.
- config must be valid for the chosen plugin (e.g. "http" needs a "url"; "python" needs a "code" string \
defining `def run(state): ...`; "sql" needs "db_path" and "query"; "email" needs "to", "subject", "body").
"""


@dataclass
class GeneratedWorkflow:
    definition: Dict[str, Any]
    explanation: str
    provider: str
    validation_errors: List[str]

    def to_dict(self) -> Dict[str, Any]:
        return {
            "definition": self.definition,
            "explanation": self.explanation,
            "provider": self.provider,
            "validation_errors": self.validation_errors,
        }


class NoProviderConfiguredError(RuntimeError):
    pass


class AIGenerationError(RuntimeError):
    pass


class AIWorkflowGenerator:
    def __init__(self, plugin_registry: PluginRegistry) -> None:
        self.plugin_registry = plugin_registry
        self.compiler = WorkflowCompiler(known_plugin_ids=set(plugin_registry.all_ids()))
        self._providers: Dict[str, AIProvider] = {
            p.id: p for p in (OpenAIProvider(), AnthropicProvider(), GoogleProvider(), OllamaProvider())
        }

    def available_providers(self) -> List[Dict[str, Any]]:
        return [{"id": p.id, "name": p.name, "configured": p.is_configured()} for p in self._providers.values()]

    def generate(self, prompt: str, provider_id: Optional[str] = None) -> GeneratedWorkflow:
        provider = self._resolve_provider(provider_id)

        system_prompt = _SYSTEM_PROMPT_TEMPLATE.format(plugin_ids=", ".join(self.plugin_registry.all_ids()))
        try:
            raw_response = provider.complete(system_prompt, prompt)
        except AIProviderError as exc:
            raise AIGenerationError(str(exc)) from exc

        parsed = self._parse_json(raw_response)

        definition = {
            "id": new_id("wf"),
            "name": parsed.get("name", "Generated Workflow"),
            "description": parsed.get("description", prompt),
            "version": 1,
            "nodes": parsed.get("nodes", []),
            "edges": parsed.get("edges", []),
            "metadata": {"generated_from_prompt": prompt, "generated_by": provider.id},
        }

        validation_errors = self._validate(definition)

        return GeneratedWorkflow(
            definition=definition,
            explanation=parsed.get("explanation", ""),
            provider=provider.id,
            validation_errors=validation_errors,
        )

    def _resolve_provider(self, provider_id: Optional[str]) -> AIProvider:
        if provider_id:
            provider = self._providers.get(provider_id)
            if provider is None:
                raise NoProviderConfiguredError(f"Unknown AI provider '{provider_id}'")
            if not provider.is_configured():
                raise NoProviderConfiguredError(f"AI provider '{provider_id}' is not configured")
            return provider

        for provider in self._providers.values():
            if provider.is_configured():
                return provider

        raise NoProviderConfiguredError(
            "No AI provider is configured. Set one of OPENAI_API_KEY, ANTHROPIC_API_KEY, "
            "GOOGLE_API_KEY, or OLLAMA_BASE_URL to enable AI-assisted workflow generation."
        )

    @staticmethod
    def _parse_json(raw_response: str) -> Dict[str, Any]:
        text = raw_response.strip()
        fence_match = re.search(r"```(?:json)?\s*(\{.*\})\s*```", text, re.DOTALL)
        if fence_match:
            text = fence_match.group(1)
        else:
            brace_start, brace_end = text.find("{"), text.rfind("}")
            if brace_start != -1 and brace_end != -1:
                text = text[brace_start : brace_end + 1]

        try:
            return json.loads(text)
        except json.JSONDecodeError as exc:
            raise AIGenerationError(f"AI provider did not return valid JSON: {exc}") from exc

    def _validate(self, definition: Dict[str, Any]) -> List[str]:
        try:
            self.compiler.compile(definition)
            return []
        except WorkflowValidationError as exc:
            return exc.errors
        except CycleDetectedError as exc:
            return [str(exc)]
