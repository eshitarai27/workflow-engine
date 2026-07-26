"""SQLite connection management and schema.

SQLite specifically, not Postgres, so the platform runs with zero external
services: `pip install -r requirements.txt && uvicorn src.api.app:app` just
works. The repository layer below is the seam that would let a real
deployment swap in Postgres without touching the engine or API.
"""
from __future__ import annotations

import sqlite3
import threading
from pathlib import Path
from typing import Optional

from src.config.settings import settings

SCHEMA = """
CREATE TABLE IF NOT EXISTS workflows (
    id TEXT NOT NULL,
    version INTEGER NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    definition_json TEXT NOT NULL,
    is_latest INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    PRIMARY KEY (id, version)
);

CREATE TABLE IF NOT EXISTS executions (
    id TEXT PRIMARY KEY,
    workflow_id TEXT NOT NULL,
    workflow_version INTEGER NOT NULL,
    status TEXT NOT NULL,
    triggered_by TEXT,
    started_at TEXT,
    ended_at TEXT,
    error TEXT,
    context_json TEXT,
    node_states_json TEXT,
    history_json TEXT,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS artifacts (
    id TEXT PRIMARY KEY,
    execution_id TEXT NOT NULL,
    node_id TEXT NOT NULL,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    content TEXT,
    path TEXT,
    created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_executions_workflow ON executions(workflow_id);
CREATE INDEX IF NOT EXISTS idx_executions_created ON executions(created_at);
CREATE INDEX IF NOT EXISTS idx_artifacts_execution ON artifacts(execution_id);
"""


class Database:
    """A SQLite database, with one connection per thread (sqlite3
    connections cannot safely be shared across threads by default, and the
    engine dispatches node execution across a worker pool).

    ``:memory:`` is a special case: every ``sqlite3.connect(":memory:")``
    call opens a *distinct*, empty in-memory database, so one connection
    per thread would silently give each thread its own disconnected copy.
    For that path only, every thread shares one connection guarded by a
    lock instead.
    """

    def __init__(self, db_path: Optional[str] = None) -> None:
        self.db_path = db_path or settings.database_path
        self._is_memory = self.db_path == ":memory:"
        if not self._is_memory:
            Path(self.db_path).parent.mkdir(parents=True, exist_ok=True)
        self._local = threading.local()
        self._memory_conn: Optional[sqlite3.Connection] = None
        self._memory_lock = threading.Lock()
        self.init_schema()

    def _connect(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self.db_path, check_same_thread=False)
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA foreign_keys = ON")
        return conn

    def connection(self) -> sqlite3.Connection:
        if self._is_memory:
            with self._memory_lock:
                if self._memory_conn is None:
                    self._memory_conn = self._connect()
                return self._memory_conn
        if not hasattr(self._local, "conn"):
            self._local.conn = self._connect()
        return self._local.conn

    def init_schema(self) -> None:
        conn = self.connection()
        conn.executescript(SCHEMA)
        conn.commit()


_default_db: Optional[Database] = None


def get_database() -> Database:
    """The process-wide default database, lazily created on first use."""
    global _default_db
    if _default_db is None:
        _default_db = Database()
    return _default_db
