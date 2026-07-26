"""Simple ``{{variable}}`` substitution for node configs, resolved against
the execution context before a plugin ever sees its config.

Deliberately not a full template language: no loops, no conditionals, no
arbitrary expressions (that's what condition/loop expressions are for, via
``safe_eval``). Just enough for one node's config to reference an earlier
node's output by name, e.g. ``{"body": "Summary: {{summary}}"}``.
"""
from __future__ import annotations

import re
from typing import Any, Mapping

_PLACEHOLDER = re.compile(r"\{\{\s*([a-zA-Z_][a-zA-Z0-9_.]*)\s*\}\}")


def render_config(value: Any, variables: Mapping[str, Any]) -> Any:
    """Recursively substitutes ``{{name}}`` / ``{{name.nested}}`` placeholders
    found in any string within ``value`` (a config dict, list, or scalar)."""
    if isinstance(value, str):
        return _render_string(value, variables)
    if isinstance(value, dict):
        return {k: render_config(v, variables) for k, v in value.items()}
    if isinstance(value, list):
        return [render_config(v, variables) for v in value]
    return value


def _render_string(text: str, variables: Mapping[str, Any]) -> Any:
    matches = list(_PLACEHOLDER.finditer(text))
    if not matches:
        return text

    # A string that is *entirely* one placeholder resolves to the
    # referenced value's real type (a number, dict, list, ...), not a
    # stringified version of it -- so {"count": "{{n}}"} stays a number.
    if len(matches) == 1 and matches[0].span() == (0, len(text)):
        return _resolve(matches[0].group(1), variables)

    def replace(match: "re.Match[str]") -> str:
        resolved = _resolve(match.group(1), variables)
        return "" if resolved is None else str(resolved)

    return _PLACEHOLDER.sub(replace, text)


def _resolve(path: str, variables: Mapping[str, Any]) -> Any:
    current: Any = variables
    for part in path.split("."):
        if isinstance(current, Mapping) and part in current:
            current = current[part]
        else:
            return None
    return current
