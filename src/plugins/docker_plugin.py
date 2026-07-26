"""Runs a container via the local Docker CLI.

Requires ``docker`` on PATH and a running daemon. If either is missing,
raises a clear :class:`PluginExecutionError` explaining what's absent,
rather than pretending the run happened.
"""
from __future__ import annotations

import shutil
import subprocess
from typing import Any, ClassVar, Dict, List

from src.models.execution import ExecutionContext
from src.models.plugin import ConfigField, PluginMetadata

from .base import Plugin, PluginExecutionError


class DockerPlugin(Plugin):
    metadata: ClassVar[PluginMetadata] = PluginMetadata(
        id="docker",
        name="Docker",
        description="Runs a command in a Docker container via `docker run --rm`.",
        category="compute",
        config_schema=[
            ConfigField("image", "string", required=True, description="Docker image to run"),
            ConfigField("command", "array", required=False, default=[], description="Command and arguments"),
            ConfigField("timeout_seconds", "number", required=False, default=120, description="Execution timeout"),
        ],
    )

    def execute(self, config: Dict[str, Any], context: ExecutionContext) -> Any:
        docker_path = shutil.which("docker")
        if not docker_path:
            raise PluginExecutionError("Docker plugin requires 'docker' on PATH, but it was not found")

        command: List[str] = [docker_path, "run", "--rm", config["image"], *config.get("command", [])]
        try:
            completed = subprocess.run(
                command,
                capture_output=True,
                text=True,
                timeout=float(config.get("timeout_seconds", 120)),
            )
        except subprocess.TimeoutExpired as exc:
            raise PluginExecutionError("Docker run timed out") from exc
        except OSError as exc:
            raise PluginExecutionError(f"Failed to invoke Docker: {exc}") from exc

        if completed.returncode != 0:
            raise PluginExecutionError(f"Docker run exited {completed.returncode}: {completed.stderr.strip()}")

        self._log("docker run completed", image=config["image"])
        return {"stdout": completed.stdout, "stderr": completed.stderr, "exit_code": completed.returncode}
