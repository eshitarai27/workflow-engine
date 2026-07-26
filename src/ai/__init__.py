"""Optional AI-assisted natural-language-to-workflow generation.

Nothing else in FlowForge imports this package -- the engine, API, and
frontend all work with zero AI providers configured. This package is only
ever reached through the ``/ai`` API routes.
"""
from .generator import AIGenerationError, AIWorkflowGenerator, GeneratedWorkflow, NoProviderConfiguredError

__all__ = ["AIGenerationError", "AIWorkflowGenerator", "GeneratedWorkflow", "NoProviderConfiguredError"]
