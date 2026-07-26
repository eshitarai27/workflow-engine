"""Reads, writes, appends to, lists, or deletes files.

Paths are resolved relative to a configured root directory
(``FLOWFORGE_FS_ROOT``, defaulting to ``data/files`` under the project
root) rather than the raw filesystem root, so a workflow definition can't
accidentally (or maliciously) touch arbitrary paths on the host.
"""
from __future__ import annotations

import os
from pathlib import Path
from typing import Any, ClassVar, Dict

from src.config.settings import settings
from src.models.execution import ExecutionContext
from src.models.plugin import ConfigField, PluginMetadata

from .base import Plugin, PluginExecutionError

_FS_ROOT = Path(os.environ.get("FLOWFORGE_FS_ROOT", str(Path(settings.database_path).parent / "files"))).resolve()


def _resolve(relative_path: str) -> Path:
    _FS_ROOT.mkdir(parents=True, exist_ok=True)
    resolved = (_FS_ROOT / relative_path).resolve()
    if _FS_ROOT not in resolved.parents and resolved != _FS_ROOT:
        raise PluginExecutionError(f"Path '{relative_path}' escapes the filesystem plugin's root directory")
    return resolved


class FilesystemPlugin(Plugin):
    metadata: ClassVar[PluginMetadata] = PluginMetadata(
        id="filesystem",
        name="Filesystem",
        description="Reads, writes, appends, lists, or deletes files under a sandboxed root directory.",
        category="storage",
        config_schema=[
            ConfigField("operation", "string", required=True, description="read | write | append | list | delete"),
            ConfigField("path", "string", required=True, description="Path relative to the filesystem plugin root"),
            ConfigField("content", "string", required=False, default="", description="Content for write/append"),
        ],
    )

    def execute(self, config: Dict[str, Any], context: ExecutionContext) -> Any:
        operation = config["operation"]
        path = _resolve(config["path"])

        if operation == "write":
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text(config.get("content", ""), encoding="utf-8")
            return {"path": str(path.relative_to(_FS_ROOT)), "bytes_written": len(config.get("content", ""))}

        if operation == "append":
            path.parent.mkdir(parents=True, exist_ok=True)
            with path.open("a", encoding="utf-8") as fh:
                fh.write(config.get("content", ""))
            return {"path": str(path.relative_to(_FS_ROOT)), "bytes_written": len(config.get("content", ""))}

        if operation == "read":
            if not path.is_file():
                raise PluginExecutionError(f"File not found: {config['path']}")
            return {"path": str(path.relative_to(_FS_ROOT)), "content": path.read_text(encoding="utf-8")}

        if operation == "list":
            if not path.is_dir():
                raise PluginExecutionError(f"Directory not found: {config['path']}")
            return {"entries": sorted(p.name for p in path.iterdir())}

        if operation == "delete":
            if path.is_file():
                path.unlink()
                return {"deleted": True}
            return {"deleted": False}

        raise PluginExecutionError(f"Unknown filesystem operation: '{operation}'")
