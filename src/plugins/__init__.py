"""Plugin system: the extensibility seam for what a node's action can do.

Every plugin implements :class:`Plugin` (metadata, config validation,
execute). ``build_default_registry`` wires up all ten built-in plugins;
adding an eleventh means writing one file here and adding it to that list,
never touching the engine.
"""
from .base import Plugin, PluginConfigError, PluginExecutionError
from .registry import PluginNotFoundError, PluginRegistry, build_default_registry

__all__ = [
    "Plugin",
    "PluginConfigError",
    "PluginExecutionError",
    "PluginRegistry",
    "PluginNotFoundError",
    "build_default_registry",
]
