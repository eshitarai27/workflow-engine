"""Pydantic request/response models for the API layer.

Deliberately loose on node/edge internals (``Dict[str, Any]``): the
compiler is the real source of truth for whether a workflow definition is
valid, and it produces far more specific error messages than pydantic
field validation would. These schemas exist to document the API surface
and validate the outermost shape.
"""
from __future__ import annotations

from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


class WorkflowDefinitionRequest(BaseModel):
    id: Optional[str] = None
    name: str
    description: str = ""
    nodes: List[Dict[str, Any]]
    edges: List[Dict[str, Any]] = Field(default_factory=list)
    triggers: List[Dict[str, Any]] = Field(default_factory=list)
    metadata: Dict[str, Any] = Field(default_factory=dict)


class ExecutionStartRequest(BaseModel):
    version: Optional[int] = None
    initial_context: Dict[str, Any] = Field(default_factory=dict)
    triggered_by: str = "manual"


class PluginValidateRequest(BaseModel):
    config: Dict[str, Any] = Field(default_factory=dict)


class AIGenerateRequest(BaseModel):
    prompt: str
    provider: Optional[str] = None
