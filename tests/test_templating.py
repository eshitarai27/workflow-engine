"""Tests for {{variable}} substitution in node configs."""
from __future__ import annotations

from src.utils.templating import render_config


def test_full_string_placeholder_resolves_to_the_real_type():
    assert render_config("{{count}}", {"count": 5}) == 5
    assert render_config("{{data}}", {"data": {"a": 1}}) == {"a": 1}


def test_partial_placeholder_is_stringified_in_place():
    assert render_config("Summary: {{summary}}!", {"summary": "hello"}) == "Summary: hello!"


def test_dotted_path_resolves_nested_values():
    assert render_config("{{user.name}}", {"user": {"name": "eshita"}}) == "eshita"


def test_unknown_variable_resolves_to_empty_string_when_partial():
    assert render_config("value: {{missing}}", {}) == "value: "


def test_unknown_variable_resolves_to_none_when_whole_string():
    assert render_config("{{missing}}", {}) is None


def test_recurses_through_dicts_and_lists():
    config = {"to": "{{email}}", "tags": ["{{tag}}", "static"]}
    result = render_config(config, {"email": "a@example.com", "tag": "urgent"})
    assert result == {"to": "a@example.com", "tags": ["urgent", "static"]}


def test_strings_without_placeholders_are_untouched():
    assert render_config("plain text", {}) == "plain text"
