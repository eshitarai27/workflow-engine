"""Runs a user-supplied JavaScript function against the execution context,
via a Node.js subprocess.

Requires ``node`` on PATH. If it isn't available, this raises a clear
:class:`PluginExecutionError` rather than silently no-op'ing -- the plugin
itself is fully real, it just depends on an external runtime the same way
the Docker plugin depends on the Docker daemon.
"""
from __future__ import annotations

import json
import shutil
import subprocess
import tempfile
from pathlib import Path
from typing import Any, ClassVar, Dict

from src.models.execution import ExecutionContext
from src.models.plugin import ConfigField, PluginMetadata

from .base import Plugin, PluginExecutionError

_RUNNER_TEMPLATE = """
const fs = require("fs");
const state = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));

{code}

const result = run(state);
process.stdout.write(JSON.stringify(result === undefined ? {{}} : result));
"""


class JavaScriptPlugin(Plugin):
    metadata: ClassVar[PluginMetadata] = PluginMetadata(
        id="javascript",
        name="JavaScript Function",
        description="Executes a user-defined JavaScript function `run(state)` via Node.js.",
        category="compute",
        config_schema=[
            ConfigField(
                "code", "string", required=True,
                description="JavaScript source defining `function run(state) { ... return {...}; }`",
            ),
            ConfigField("timeout_seconds", "number", required=False, default=30, description="Execution timeout"),
        ],
    )

    def execute(self, config: Dict[str, Any], context: ExecutionContext) -> Any:
        node_path = shutil.which("node")
        if not node_path:
            raise PluginExecutionError(
                "JavaScript plugin requires Node.js ('node') on PATH, but it was not found"
            )

        script = _RUNNER_TEMPLATE.format(code=config["code"])
        with tempfile.TemporaryDirectory() as tmp_dir:
            script_path = Path(tmp_dir) / "runner.js"
            state_path = Path(tmp_dir) / "state.json"
            script_path.write_text(script, encoding="utf-8")
            state_path.write_text(json.dumps(context.snapshot(), default=str), encoding="utf-8")

            try:
                completed = subprocess.run(
                    [node_path, str(script_path), str(state_path)],
                    capture_output=True,
                    text=True,
                    timeout=float(config.get("timeout_seconds", 30)),
                )
            except subprocess.TimeoutExpired as exc:
                raise PluginExecutionError("JavaScript execution timed out") from exc

        if completed.returncode != 0:
            raise PluginExecutionError(f"JavaScript execution failed: {completed.stderr.strip()}")

        try:
            result = json.loads(completed.stdout)
        except json.JSONDecodeError as exc:
            raise PluginExecutionError(f"JavaScript function did not return valid JSON: {exc}") from exc

        self._log("javascript executed")
        return result
