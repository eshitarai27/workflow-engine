import type {
  AIProviderInfo,
  ConfigField,
  Execution,
  GeneratedWorkflow,
  PlatformEvent,
  PluginMetadata,
  SimulationResult,
  VersionDiff,
  Workflow,
  WorkflowVersionSummary,
} from "./types";

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!response.ok) {
    let detail = response.statusText;
    try {
      const body = await response.json();
      detail = typeof body.detail === "string" ? body.detail : JSON.stringify(body.detail ?? body);
    } catch {
      // response body wasn't JSON; fall back to statusText
    }
    throw new ApiError(response.status, detail);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export interface WorkflowDefinitionInput {
  id?: string;
  name: string;
  description?: string;
  nodes: unknown[];
  edges?: unknown[];
  triggers?: unknown[];
  metadata?: Record<string, unknown>;
}

export const api = {
  baseUrl: BASE_URL,

  health: () => request<{ service: string; status: string }>("/"),

  // Workflows
  listWorkflows: () => request<Workflow[]>("/workflows"),
  getWorkflow: (id: string, version?: number) =>
    request<Workflow>(`/workflows/${id}${version ? `?version=${version}` : ""}`),
  createWorkflow: (definition: WorkflowDefinitionInput) =>
    request<Workflow>("/workflows", { method: "POST", body: JSON.stringify(definition) }),
  updateWorkflow: (id: string, definition: WorkflowDefinitionInput) =>
    request<Workflow>(`/workflows/${id}`, { method: "PUT", body: JSON.stringify(definition) }),
  deleteWorkflow: (id: string) => request<{ deleted: boolean }>(`/workflows/${id}`, { method: "DELETE" }),
  validateWorkflow: (definition: WorkflowDefinitionInput) =>
    request<{ valid: boolean; errors: string[] }>("/workflows/validate", {
      method: "POST",
      body: JSON.stringify(definition),
    }),
  listVersions: (id: string) => request<WorkflowVersionSummary[]>(`/workflows/${id}/versions`),
  compareVersions: (id: string, from: number, to: number) =>
    request<VersionDiff>(`/workflows/${id}/versions/compare?from_version=${from}&to_version=${to}`),

  // Executions
  executeWorkflow: (id: string, body: { version?: number; initial_context?: Record<string, unknown>; triggered_by?: string } = {}) =>
    request<Execution>(`/workflows/${id}/execute`, { method: "POST", body: JSON.stringify(body) }),
  getExecution: (id: string) => request<Execution>(`/executions/${id}`),
  listExecutions: (workflowId?: string, limit = 50) =>
    request<Execution[]>(`/executions?limit=${limit}${workflowId ? `&workflow_id=${workflowId}` : ""}`),
  pauseExecution: (id: string) => request<{ paused: boolean }>(`/executions/${id}/pause`, { method: "POST" }),
  resumeExecution: (id: string) => request<Execution>(`/executions/${id}/resume`, { method: "POST" }),
  cancelExecution: (id: string) => request<{ cancelled: boolean }>(`/executions/${id}/cancel`, { method: "POST" }),

  // Simulation
  simulateWorkflow: (id: string, version?: number) =>
    request<SimulationResult>(`/workflows/${id}/simulate${version ? `?version=${version}` : ""}`, { method: "POST" }),
  simulateDraft: (definition: WorkflowDefinitionInput) =>
    request<SimulationResult>("/simulate", { method: "POST", body: JSON.stringify(definition) }),

  // Plugins
  listPlugins: () => request<PluginMetadata[]>("/plugins"),
  validatePluginConfig: (pluginId: string, config: Record<string, unknown>) =>
    request<{ valid: boolean; errors: string[] }>(`/plugins/${pluginId}/validate`, {
      method: "POST",
      body: JSON.stringify({ config }),
    }),

  // AI
  aiProviders: () => request<AIProviderInfo[]>("/ai/providers"),
  aiGenerate: (prompt: string, provider?: string) =>
    request<GeneratedWorkflow>("/ai/generate", { method: "POST", body: JSON.stringify({ prompt, provider }) }),

  // Events
  listEvents: (limit = 200) => request<PlatformEvent[]>(`/events?limit=${limit}`),
};

export type { ConfigField };
