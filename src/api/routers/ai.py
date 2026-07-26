"""AI-assisted natural-language-to-workflow generation. Entirely optional --
returns a clear 503 if no provider is configured, never a crash."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException

from src.ai.generator import AIGenerationError, AIWorkflowGenerator, NoProviderConfiguredError
from src.api.deps import get_ai_generator
from src.api.schemas import AIGenerateRequest

router = APIRouter(prefix="/ai", tags=["ai"])


@router.get("/providers")
def list_providers(generator: AIWorkflowGenerator = Depends(get_ai_generator)):
    return generator.available_providers()


@router.post("/generate")
def generate_workflow(body: AIGenerateRequest, generator: AIWorkflowGenerator = Depends(get_ai_generator)):
    try:
        result = generator.generate(body.prompt, body.provider)
    except NoProviderConfiguredError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except AIGenerationError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    return result.to_dict()
