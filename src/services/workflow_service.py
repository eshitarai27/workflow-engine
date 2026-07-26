"""Business logic for creating, updating, and inspecting workflows.

Kept thin on purpose: this is the seam the API layer calls into, so the
API's routers never touch the compiler or storage directly.
"""
from __future__ import annotations

from typing import Any, Dict, List, Optional

from src.compiler.compiler import CycleDetectedError, WorkflowCompiler
from src.compiler.validator import WorkflowValidationError
from src.models.workflow import Workflow
from src.plugins.registry import PluginRegistry
from src.storage.workflow_repository import VersionDiff, WorkflowRepository
from src.utils.ids import new_id


class WorkflowNotFoundError(KeyError):
    pass


class WorkflowService:
    def __init__(self, repository: WorkflowRepository, plugin_registry: PluginRegistry) -> None:
        self.repository = repository
        self.plugin_registry = plugin_registry
        self.compiler = WorkflowCompiler(known_plugin_ids=set(plugin_registry.all_ids()))

    def create_workflow(self, definition: Dict[str, Any]) -> Workflow:
        definition = dict(definition)
        definition.setdefault("id", new_id("wf"))
        definition["version"] = 1
        self.compiler.compile(definition)  # raises WorkflowValidationError / CycleDetectedError
        workflow = Workflow.from_dict(definition)
        return self.repository.save_new_version(workflow)

    def update_workflow(self, workflow_id: str, definition: Dict[str, Any]) -> Workflow:
        if self.repository.get_latest(workflow_id) is None:
            raise WorkflowNotFoundError(workflow_id)
        definition = dict(definition)
        definition["id"] = workflow_id
        self.compiler.compile(definition)
        workflow = Workflow.from_dict(definition)
        return self.repository.save_new_version(workflow)

    def get_workflow(self, workflow_id: str, version: Optional[int] = None) -> Workflow:
        workflow = (
            self.repository.get_version(workflow_id, version) if version else self.repository.get_latest(workflow_id)
        )
        if workflow is None:
            raise WorkflowNotFoundError(workflow_id)
        return workflow

    def list_workflows(self) -> List[Workflow]:
        return self.repository.list_latest()

    def list_versions(self, workflow_id: str) -> List[Dict[str, Any]]:
        return self.repository.list_versions(workflow_id)

    def compare_versions(self, workflow_id: str, from_version: int, to_version: int) -> VersionDiff:
        return self.repository.compare_versions(workflow_id, from_version, to_version)

    def delete_workflow(self, workflow_id: str) -> None:
        if self.repository.get_latest(workflow_id) is None:
            raise WorkflowNotFoundError(workflow_id)
        self.repository.delete(workflow_id)

    def validate_definition(self, definition: Dict[str, Any]) -> List[str]:
        """Validate without saving -- used by the frontend builder for
        live feedback and by the AI generator to check its own output."""
        try:
            self.compiler.compile(definition)
            return []
        except WorkflowValidationError as exc:
            return exc.errors
        except CycleDetectedError as exc:
            return [str(exc)]
