"""Wires every layer (storage, plugins, engine, services) into a single
process-wide container, and exposes FastAPI dependency functions for it.

One container per process is a deliberate simplification: FlowForge is
designed to run as a single instance with in-process concurrency (the
worker pool), not as a distributed fleet -- see docs/architecture.md's
roadmap section for what horizontal scaling would need.
"""
from __future__ import annotations

from functools import lru_cache

from src.ai.generator import AIWorkflowGenerator
from src.config.settings import settings
from src.engine.checkpoint import CheckpointStore
from src.engine.engine import ExecutionEngine
from src.events.event_bus import EventBus, install_logging_subscriber
from src.plugins.registry import PluginRegistry, build_default_registry
from src.scheduler.scheduler import Scheduler
from src.services.execution_service import ExecutionService
from src.services.plugin_service import PluginService
from src.services.simulation_service import SimulationService
from src.services.workflow_service import WorkflowService
from src.storage.artifact_repository import ArtifactRepository
from src.storage.database import Database
from src.storage.execution_repository import ExecutionRepository
from src.storage.workflow_repository import WorkflowRepository
from src.workers.worker_pool import WorkerPool


class Container:
    """Owns every long-lived object in the process. Constructed once,
    reused for the life of the app (or the life of a test)."""

    def __init__(self, database: Database | None = None, checkpoint_dir: str | None = None) -> None:
        self.database = database or Database()
        self.event_bus = EventBus()
        install_logging_subscriber(self.event_bus)

        self.plugin_registry: PluginRegistry = build_default_registry(event_bus=self.event_bus)
        self.worker_pool = WorkerPool(max_workers=settings.max_parallel_nodes)
        self.checkpoint_store = CheckpointStore(checkpoint_dir=checkpoint_dir)
        self.engine = ExecutionEngine(self.plugin_registry, self.event_bus, self.worker_pool, self.checkpoint_store)

        self.workflow_repository = WorkflowRepository(self.database)
        self.execution_repository = ExecutionRepository(self.database)
        self.artifact_repository = ArtifactRepository(self.database)

        self.workflow_service = WorkflowService(self.workflow_repository, self.plugin_registry)
        self.execution_service = ExecutionService(
            self.workflow_repository, self.execution_repository, self.engine, self.event_bus
        )
        self.simulation_service = SimulationService(self.execution_repository)
        self.plugin_service = PluginService(self.plugin_registry)
        self.ai_generator = AIWorkflowGenerator(self.plugin_registry)

        self.scheduler = Scheduler(self.workflow_repository, self.execution_service)
        self.scheduler.start()

    def shutdown(self) -> None:
        self.scheduler.stop()
        self.worker_pool.shutdown()


@lru_cache(maxsize=1)
def get_container() -> Container:
    return Container()


def get_workflow_service() -> WorkflowService:
    return get_container().workflow_service


def get_execution_service() -> ExecutionService:
    return get_container().execution_service


def get_simulation_service() -> SimulationService:
    return get_container().simulation_service


def get_plugin_service() -> PluginService:
    return get_container().plugin_service


def get_ai_generator() -> AIWorkflowGenerator:
    return get_container().ai_generator


def get_event_bus() -> EventBus:
    return get_container().event_bus


def get_scheduler() -> Scheduler:
    return get_container().scheduler
