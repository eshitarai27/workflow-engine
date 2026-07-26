export interface RetryPolicy {
  max_retries: number;
  backoff_seconds: number;
  backoff_multiplier: number;
}

export interface LoopSpec {
  until_condition: string;
  max_iterations: number;
}

export interface WorkflowAction {
  plugin_id: string;
  config: Record<string, unknown>;
}

export interface WorkflowCondition {
  expression: string;
}

export interface WorkflowNode {
  id: string;
  name: string;
  action: WorkflowAction;
  condition: WorkflowCondition | null;
  retry_policy: RetryPolicy;
  timeout_seconds: number | null;
  loop: LoopSpec | null;
}

export interface WorkflowEdge {
  source: string;
  target: string;
}

export interface WorkflowTrigger {
  type: "MANUAL" | "SCHEDULE" | "WEBHOOK" | "EVENT";
  config: Record<string, unknown>;
}

export interface Workflow {
  id: string;
  name: string;
  version: number;
  description: string;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  triggers: WorkflowTrigger[];
  metadata: Record<string, unknown>;
  created_at: string;
}

export type NodeState =
  | "WAITING"
  | "READY"
  | "RUNNING"
  | "SUCCESS"
  | "FAILED"
  | "SKIPPED"
  | "CANCELLED";

export type ExecutionStatus = "PENDING" | "RUNNING" | "PAUSED" | "SUCCESS" | "FAILED" | "CANCELLED";

export interface NodeExecutionRecord {
  node_id: string;
  node_name: string;
  state: NodeState;
  dependencies: string[];
  reason: string;
  condition_expression: string | null;
  condition_result: boolean | null;
  attempt: number;
  retry_count: number;
  iteration: number;
  worker_id: string | null;
  started_at: string | null;
  ended_at: string | null;
  duration_ms: number | null;
  input_snapshot: Record<string, unknown>;
  output_snapshot: unknown;
  failure_reason: string | null;
}

export interface Execution {
  id: string;
  workflow_id: string;
  workflow_version: number;
  status: ExecutionStatus;
  node_states: Record<string, NodeState>;
  started_at: string | null;
  ended_at: string | null;
  duration_ms: number | null;
  error: string | null;
  triggered_by: string;
  context: Record<string, unknown>;
  history: NodeExecutionRecord[];
}

export interface ConfigField {
  name: string;
  type: string;
  required: boolean;
  default: unknown;
  description: string;
  secret: boolean;
}

export interface PluginMetadata {
  id: string;
  name: string;
  description: string;
  version: string;
  category: string;
  config_schema: ConfigField[];
}

export interface Bottleneck {
  node_id: string;
  estimated_duration_seconds: number;
  reason: string;
}

export interface SimulationResult {
  workflow_id: string;
  workflow_version: number;
  execution_order: string[];
  layers: string[][];
  estimated_runtime_seconds: number;
  critical_path: string[];
  parallel_branches: string[][];
  bottlenecks: Bottleneck[];
  warnings: string[];
}

export interface WorkflowVersionSummary {
  version: number;
  name: string;
  is_latest: number;
  created_at: string;
}

export interface VersionDiff {
  workflow_id: string;
  from_version: number;
  to_version: number;
  nodes_added: string[];
  nodes_removed: string[];
  nodes_changed: string[];
  edges_added: WorkflowEdge[];
  edges_removed: WorkflowEdge[];
}

export interface AIProviderInfo {
  id: string;
  name: string;
  configured: boolean;
}

export interface GeneratedWorkflow {
  definition: {
    id: string;
    name: string;
    description: string;
    version: number;
    nodes: unknown[];
    edges: unknown[];
    metadata: Record<string, unknown>;
  };
  explanation: string;
  provider: string;
  validation_errors: string[];
}

export interface PlatformEvent {
  type: string;
  payload: Record<string, unknown>;
  timestamp: string;
}
