"""Runs a SQL statement against a SQLite database file.

SQLite specifically (rather than requiring Postgres/MySQL) so a workflow
using this plugin still runs with zero external services -- point
``db_path`` at any file (or ``:memory:``) and it works.
"""
from __future__ import annotations

import sqlite3
from typing import Any, ClassVar, Dict, List

from src.models.execution import ExecutionContext
from src.models.plugin import ConfigField, PluginMetadata

from .base import Plugin, PluginExecutionError


class SqlPlugin(Plugin):
    metadata: ClassVar[PluginMetadata] = PluginMetadata(
        id="sql",
        name="SQL Query",
        description="Runs a SQL statement against a SQLite database file.",
        category="data",
        config_schema=[
            ConfigField("db_path", "string", required=True, description="Path to a SQLite database file, or ':memory:'"),
            ConfigField("query", "string", required=True, description="SQL statement to execute"),
            ConfigField("params", "array", required=False, default=[], description="Positional query parameters"),
        ],
    )

    def execute(self, config: Dict[str, Any], context: ExecutionContext) -> Any:
        db_path = config["db_path"]
        query = config["query"]
        params = config.get("params") or []

        try:
            connection = sqlite3.connect(db_path)
            connection.row_factory = sqlite3.Row
            cursor = connection.execute(query, params)

            if cursor.description is not None:
                rows: List[Dict[str, Any]] = [dict(row) for row in cursor.fetchall()]
                result = {"rows": rows, "row_count": len(rows)}
            else:
                connection.commit()
                result = {"rows": [], "row_count": cursor.rowcount}
        except sqlite3.Error as exc:
            raise PluginExecutionError(f"SQL execution failed: {exc}") from exc
        finally:
            connection.close()

        self._log("sql query executed", db_path=db_path, row_count=result["row_count"])
        return result
