"""Plugin discovery and config validation for the Plugin Manager UI."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException

from src.api.deps import get_plugin_service
from src.api.schemas import PluginValidateRequest
from src.plugins.registry import PluginNotFoundError
from src.services.plugin_service import PluginService

router = APIRouter(prefix="/plugins", tags=["plugins"])


@router.get("")
def list_plugins(service: PluginService = Depends(get_plugin_service)):
    return service.list_plugins()


@router.post("/{plugin_id}/validate")
def validate_plugin_config(
    plugin_id: str, body: PluginValidateRequest, service: PluginService = Depends(get_plugin_service)
):
    try:
        errors = service.validate_config(plugin_id, body.config)
    except PluginNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return {"valid": not errors, "errors": errors}
