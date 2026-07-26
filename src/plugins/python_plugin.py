"""Runs a user-supplied Python function against the execution context.

This is intentionally powerful, the same way Airflow's PythonOperator or
n8n's Function node are: workflow authors write real code here, not a
restricted mini-language. That means it must only be used with trusted
workflow definitions -- ``config['code']`` is executed with Python's own
``exec``, scoped to a small set of safe builtins, but no sandbox makes
arbitrary code execution truly safe. Untrusted workflow authors should be
restricted to the other, non-code plugins instead.
"""
from __future__ import annotations

import builtins
from typing import Any, ClassVar, Dict

from src.models.execution import ExecutionContext
from src.models.plugin import ConfigField, PluginMetadata

from .base import Plugin, PluginExecutionError

_SAFE_BUILTIN_NAMES = (
    "len", "range", "str", "int", "float", "bool", "dict", "list", "tuple", "set",
    "min", "max", "sum", "sorted", "enumerate", "zip", "map", "filter", "abs", "round",
    "isinstance", "print",
)
_SAFE_BUILTINS = {name: getattr(builtins, name) for name in _SAFE_BUILTIN_NAMES}


class PythonPlugin(Plugin):
    metadata: ClassVar[PluginMetadata] = PluginMetadata(
        id="python",
        name="Python Function",
        description="Executes a user-defined Python function `run(state)` against the execution context.",
        category="compute",
        config_schema=[
            ConfigField(
                "code", "string", required=True,
                description="Python source defining `def run(state: dict) -> dict:`",
            ),
        ],
    )

    def execute(self, config: Dict[str, Any], context: ExecutionContext) -> Any:
        code = config["code"]
        namespace: Dict[str, Any] = {"__builtins__": _SAFE_BUILTINS}
        try:
            exec(compile(code, "<python_plugin>", "exec"), namespace)  # noqa: S102 - documented, opt-in trust
        except SyntaxError as exc:
            raise PluginExecutionError(f"Python plugin code has a syntax error: {exc}") from exc
        except Exception as exc:  # noqa: BLE001 - e.g. a blocked import; must not escape as a raw exception
            raise PluginExecutionError(f"Python plugin code raised while defining `run`: {exc}") from exc

        run_fn = namespace.get("run")
        if not callable(run_fn):
            raise PluginExecutionError("Python plugin code must define a `run(state)` function")

        try:
            result = run_fn(context.snapshot())
        except Exception as exc:  # noqa: BLE001 - user code, any exception is a legitimate node failure
            raise PluginExecutionError(f"Python plugin function raised: {exc}") from exc

        if result is None:
            return {}
        if not isinstance(result, dict):
            raise PluginExecutionError("Python plugin's `run(state)` must return a dict")
        return result
