"""The plugin interface every action type implements.

A plugin is the unit of extensibility: instead of the engine knowing how to
make an HTTP call or run a SQL query, it knows only how to call
``plugin.execute(config, context)``. Adding a new capability to the
platform means adding a new plugin, never touching the engine.
"""
from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Any, ClassVar, Dict, List

from src.models.execution import ExecutionContext
from src.models.plugin import PluginMetadata
from src.utils.logging import get_logger

logger = get_logger("flowforge.plugins")


class PluginConfigError(ValueError):
    """Raised when a node's configuration doesn't satisfy a plugin's schema."""


class PluginExecutionError(RuntimeError):
    """Raised when a plugin's action fails at runtime.

    Wrapping failures in this type (rather than letting arbitrary
    exceptions propagate) gives the executor one consistent failure shape
    to catch, log, and retry around, while ``__cause__`` still preserves
    the original traceback for debugging.
    """


class Plugin(ABC):
    """Base class for every action plugin."""

    metadata: ClassVar[PluginMetadata]

    def validate(self, config: Dict[str, Any]) -> List[str]:
        """Check ``config`` against this plugin's declared schema. Returns a
        list of error strings; empty means valid. Subclasses can override
        for checks beyond simple required/type checking."""
        errors: List[str] = []
        for field in self.metadata.config_schema:
            if field.required and field.name not in config:
                errors.append(f"{self.metadata.id}: missing required config field '{field.name}'")
        return errors

    @abstractmethod
    def execute(self, config: Dict[str, Any], context: ExecutionContext) -> Any:
        """Run this plugin's action. Returns a JSON-serializable value (or a
        dict, which gets merged into the execution context automatically).
        Raise :class:`PluginExecutionError` on failure."""

    def _log(self, message: str, **fields: Any) -> None:
        logger.info(message, extra={"fields": {"plugin_id": self.metadata.id, **fields}})
