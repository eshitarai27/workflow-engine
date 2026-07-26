"""Shared pytest fixtures for the FlowForge backend test suite."""
from __future__ import annotations

import pytest

from src.compiler.compiler import WorkflowCompiler
from src.engine.checkpoint import CheckpointStore
from src.engine.engine import ExecutionEngine
from src.events.event_bus import EventBus
from src.planner.planner import WorkflowPlanner
from src.plugins.registry import build_default_registry
from src.storage.database import Database
from src.storage.execution_repository import ExecutionRepository
from src.storage.workflow_repository import WorkflowRepository
from src.workers.worker_pool import WorkerPool


@pytest.fixture()
def event_bus() -> EventBus:
    return EventBus()


@pytest.fixture()
def plugin_registry(event_bus):
    return build_default_registry(event_bus=event_bus)


@pytest.fixture()
def worker_pool():
    pool = WorkerPool(max_workers=4)
    yield pool
    pool.shutdown()


@pytest.fixture()
def checkpoint_store(tmp_path):
    return CheckpointStore(checkpoint_dir=str(tmp_path / "checkpoints"))


@pytest.fixture()
def engine(plugin_registry, event_bus, worker_pool, checkpoint_store):
    return ExecutionEngine(plugin_registry, event_bus, worker_pool, checkpoint_store)


@pytest.fixture()
def compiler():
    return WorkflowCompiler()


@pytest.fixture()
def planner():
    return WorkflowPlanner()


@pytest.fixture()
def database():
    return Database(db_path=":memory:")


@pytest.fixture()
def workflow_repository(database):
    return WorkflowRepository(database)


@pytest.fixture()
def execution_repository(database):
    return ExecutionRepository(database)
