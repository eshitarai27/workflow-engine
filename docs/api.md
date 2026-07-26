# API Reference

Base URL defaults to `http://localhost:8000`.

## Workflows

| Method | Path | Purpose |
|---|---|---|
| POST | `/workflows` | Create a workflow (version 1) |
| GET | `/workflows` | List the latest version of every workflow |
| GET | `/workflows/{id}` | Get the latest version (or `?version=N`) |
| PUT | `/workflows/{id}` | Save a new version |
| DELETE | `/workflows/{id}` | Delete a workflow and all its versions |
| POST | `/workflows/validate` | Validate a definition without saving it |
| GET | `/workflows/{id}/versions` | List every saved version |
| GET | `/workflows/{id}/versions/compare?from_version=&to_version=` | Diff two versions |

A workflow definition:

```json
{
  "name": "Summarize and Notify",
  "description": "optional",
  "nodes": [
    {
      "id": "step1",
      "name": "Step 1",
      "action": { "plugin_id": "python", "config": { "code": "def run(state):\n    return {'x': 1}" } },
      "condition": null,
      "retry_policy": { "max_retries": 0, "backoff_seconds": 1, "backoff_multiplier": 2 },
      "timeout_seconds": null,
      "loop": null
    }
  ],
  "edges": [{ "source": "step1", "target": "step2" }],
  "triggers": [{ "type": "MANUAL", "config": {} }]
}
```

## Executions

| Method | Path | Purpose |
|---|---|---|
| POST | `/workflows/{id}/execute` | Start a run. Body: `{version?, initial_context?, triggered_by?}` |
| GET | `/executions/{id}` | Full execution: status, context, node states, history |
| GET | `/executions?workflow_id=&limit=` | Recent executions |
| POST | `/executions/{id}/pause` | Stop after the current layer finishes |
| POST | `/executions/{id}/resume` | Continue from the last checkpoint |
| POST | `/executions/{id}/cancel` | Same as pause, but ends as CANCELLED |

`POST /workflows/{id}/execute` returns immediately with a PENDING/RUNNING execution. Poll `GET /executions/{id}` for progress, or watch `GET /events` for the underlying lifecycle events.

## Simulation

| Method | Path | Purpose |
|---|---|---|
| POST | `/workflows/{id}/simulate` | Simulate a saved workflow |
| POST | `/simulate` | Simulate a draft definition (body: same shape as create) |

Returns execution order, layer-by-layer parallelism, estimated runtime, critical path, and bottlenecks, without running anything.

## Plugins

| Method | Path | Purpose |
|---|---|---|
| GET | `/plugins` | List every plugin's metadata and config schema |
| POST | `/plugins/{id}/validate` | Validate a config against one plugin's schema |

## AI-assisted generation (optional)

| Method | Path | Purpose |
|---|---|---|
| GET | `/ai/providers` | List providers and whether each is configured |
| POST | `/ai/generate` | Body: `{prompt, provider?}` → a workflow definition |

Returns `503` if no provider is configured. This is the only part of the API that requires any external configuration; everything else works with zero setup.

## Webhooks and events

| Method | Path | Purpose |
|---|---|---|
| POST | `/webhooks/{workflow_id}` | Enqueue an execution, with the request body as initial context |
| GET | `/events?limit=` | Recent platform-wide lifecycle events |

## Errors

Validation and cycle-detection failures return `400` with the specific errors. Unknown workflows, executions, or plugins return `404`. An unconfigured AI provider returns `503`. Nothing in normal use should return `500`; if it does, that's a bug.
