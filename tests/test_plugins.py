"""Tests for the plugin system: config validation and real plugin behavior."""
from __future__ import annotations

import pytest

from src.models.execution import ExecutionContext
from src.plugins.base import PluginExecutionError


def test_registry_has_all_ten_builtin_plugins(plugin_registry):
    assert set(plugin_registry.all_ids()) == {
        "http", "webhook", "python", "sql", "javascript",
        "filesystem", "email", "slack", "openai", "docker",
    }


def test_validate_reports_missing_required_fields(plugin_registry):
    http_plugin = plugin_registry.get("http")
    errors = http_plugin.validate({})
    assert any("url" in e for e in errors)


def test_python_plugin_executes_and_returns_dict(plugin_registry):
    plugin = plugin_registry.get("python")
    context = ExecutionContext({"value": 10})
    result = plugin.execute({"code": "def run(state):\n    return {'doubled': state['value'] * 2}"}, context)
    assert result == {"doubled": 20}


def test_python_plugin_sandboxes_imports(plugin_registry):
    plugin = plugin_registry.get("python")
    context = ExecutionContext({})
    with pytest.raises(PluginExecutionError):
        plugin.execute({"code": "import os\ndef run(state):\n    return {}"}, context)


def test_python_plugin_requires_run_function(plugin_registry):
    plugin = plugin_registry.get("python")
    context = ExecutionContext({})
    with pytest.raises(PluginExecutionError):
        plugin.execute({"code": "x = 1"}, context)


def test_sql_plugin_runs_query_against_in_memory_db(plugin_registry):
    plugin = plugin_registry.get("sql")
    context = ExecutionContext({})
    result = plugin.execute({"db_path": ":memory:", "query": "SELECT 1 AS a, 2 AS b"}, context)
    assert result["rows"] == [{"a": 1, "b": 2}]


def test_filesystem_plugin_writes_and_reads_a_file(plugin_registry, monkeypatch, tmp_path):
    import src.plugins.filesystem_plugin as fs_module

    monkeypatch.setattr(fs_module, "_FS_ROOT", tmp_path)
    plugin = plugin_registry.get("filesystem")
    context = ExecutionContext({})

    write_result = plugin.execute({"operation": "write", "path": "note.txt", "content": "hello"}, context)
    assert write_result["bytes_written"] == 5

    read_result = plugin.execute({"operation": "read", "path": "note.txt"}, context)
    assert read_result["content"] == "hello"


def test_filesystem_plugin_blocks_path_traversal(plugin_registry, monkeypatch, tmp_path):
    import src.plugins.filesystem_plugin as fs_module

    monkeypatch.setattr(fs_module, "_FS_ROOT", tmp_path)
    plugin = plugin_registry.get("filesystem")
    context = ExecutionContext({})
    with pytest.raises(PluginExecutionError):
        plugin.execute({"operation": "read", "path": "../../etc/passwd"}, context)


def test_email_plugin_reports_not_sent_when_smtp_unconfigured(plugin_registry):
    plugin = plugin_registry.get("email")
    context = ExecutionContext({})
    result = plugin.execute({"to": "a@example.com", "subject": "hi", "body": "hello"}, context)
    assert result["sent"] is False


def test_slack_plugin_requires_webhook_url(plugin_registry):
    from src.plugins.base import PluginConfigError

    plugin = plugin_registry.get("slack")
    context = ExecutionContext({})
    with pytest.raises(PluginConfigError):
        plugin.execute({"message": "hi"}, context)


def test_openai_plugin_requires_api_key(plugin_registry):
    from src.plugins.base import PluginConfigError

    plugin = plugin_registry.get("openai")
    context = ExecutionContext({})
    with pytest.raises(PluginConfigError):
        plugin.execute({"prompt": "hi"}, context)
