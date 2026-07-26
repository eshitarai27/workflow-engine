import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import ReactFlow, {
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  Background,
  Controls,
  type Connection,
  type Edge as RFEdge,
  type EdgeChange,
  type Node as RFNode,
  type NodeChange,
} from "reactflow";
import "reactflow/dist/style.css";
import { api, ApiError, type WorkflowDefinitionInput } from "../lib/api";
import type { PluginMetadata, Workflow, WorkflowNode } from "../lib/types";
import { colorForCategory } from "../lib/colors";

let idCounter = 0;
function nextNodeId(): string {
  idCounter += 1;
  return `node_${Date.now().toString(36)}_${idCounter}`;
}

function nodeToRF(node: WorkflowNode, plugins: PluginMetadata[], position: { x: number; y: number }): RFNode {
  const plugin = plugins.find((p) => p.id === node.action.plugin_id);
  const color = plugin ? colorForCategory(plugin.category) : "#8f8270";
  return {
    id: node.id,
    position,
    data: { label: node.name },
    style: {
      background: color,
      color: "white",
      border: "1px solid rgba(0,0,0,0.1)",
      borderRadius: 10,
      padding: 4,
      width: 160,
      fontSize: 13,
    },
  };
}

function defaultPosition(index: number): { x: number; y: number } {
  return { x: (index % 4) * 220, y: Math.floor(index / 4) * 120 };
}

export default function WorkflowBuilder() {
  const { workflowId } = useParams<{ workflowId?: string }>();
  const navigate = useNavigate();
  const isEditing = Boolean(workflowId);

  const [plugins, setPlugins] = useState<PluginMetadata[]>([]);
  const [name, setName] = useState("Untitled Workflow");
  const [description, setDescription] = useState("");
  const [nodes, setNodes] = useState<RFNode[]>([]);
  const [edges, setEdges] = useState<RFEdge[]>([]);
  const [nodeDefs, setNodeDefs] = useState<Record<string, WorkflowNode>>({});
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.listPlugins().then(setPlugins).catch(() => setPlugins([]));
  }, []);

  useEffect(() => {
    if (!workflowId) return;
    api.getWorkflow(workflowId).then((wf: Workflow) => {
      setName(wf.name);
      setDescription(wf.description);
      const positions = (wf.metadata?.positions as Record<string, { x: number; y: number }>) || {};
      const defs: Record<string, WorkflowNode> = {};
      wf.nodes.forEach((n) => (defs[n.id] = n));
      setNodeDefs(defs);
      setNodes(wf.nodes.map((n, i) => nodeToRF(n, plugins, positions[n.id] || defaultPosition(i))));
      setEdges(wf.edges.map((e) => ({ id: `${e.source}-${e.target}`, source: e.source, target: e.target, animated: false })));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workflowId, plugins.length]);

  const onNodesChange = useCallback((changes: NodeChange[]) => setNodes((nds) => applyNodeChanges(changes, nds)), []);
  const onEdgesChange = useCallback((changes: EdgeChange[]) => setEdges((eds) => applyEdgeChanges(changes, eds)), []);
  const onConnect = useCallback(
    (connection: Connection) => setEdges((eds) => addEdge({ ...connection, animated: false }, eds)),
    []
  );

  const addNode = (pluginId: string) => {
    const plugin = plugins.find((p) => p.id === pluginId);
    if (!plugin) return;
    const id = nextNodeId();
    const definition: WorkflowNode = {
      id,
      name: plugin.name,
      action: { plugin_id: pluginId, config: {} },
      condition: null,
      retry_policy: { max_retries: 0, backoff_seconds: 1, backoff_multiplier: 2 },
      timeout_seconds: null,
      loop: null,
    };
    setNodeDefs((prev) => ({ ...prev, [id]: definition }));
    setNodes((prev) => [...prev, nodeToRF(definition, plugins, defaultPosition(prev.length))]);
  };

  const deleteSelectedNode = () => {
    if (!selectedNodeId) return;
    setNodes((prev) => prev.filter((n) => n.id !== selectedNodeId));
    setEdges((prev) => prev.filter((e) => e.source !== selectedNodeId && e.target !== selectedNodeId));
    setNodeDefs((prev) => {
      const next = { ...prev };
      delete next[selectedNodeId];
      return next;
    });
    setSelectedNodeId(null);
  };

  const updateSelectedNode = (patch: Partial<WorkflowNode>) => {
    if (!selectedNodeId) return;
    setNodeDefs((prev) => ({ ...prev, [selectedNodeId]: { ...prev[selectedNodeId], ...patch } }));
    if (patch.name) {
      setNodes((prev) => prev.map((n) => (n.id === selectedNodeId ? { ...n, data: { label: patch.name } } : n)));
    }
  };

  const buildDefinition = (): WorkflowDefinitionInput => ({
    id: workflowId,
    name,
    description,
    nodes: nodes.map((n) => nodeDefs[n.id]),
    edges: edges.map((e) => ({ source: e.source, target: e.target })),
    metadata: { positions: Object.fromEntries(nodes.map((n) => [n.id, n.position])) },
  });

  const validate = () => {
    api
      .validateWorkflow(buildDefinition())
      .then((res) => setValidationErrors(res.errors))
      .catch((err) => setValidationErrors([err instanceof ApiError ? err.message : "Validation failed"]));
  };

  const save = () => {
    setSaving(true);
    setSaveError(null);
    const definition = buildDefinition();
    const request = isEditing && workflowId ? api.updateWorkflow(workflowId, definition) : api.createWorkflow(definition);
    request
      .then((wf) => navigate(`/workflows/${wf.id}`))
      .catch((err) => setSaveError(err instanceof ApiError ? err.message : "Failed to save"))
      .finally(() => setSaving(false));
  };

  const selectedDef = selectedNodeId ? nodeDefs[selectedNodeId] : null;
  const rfNodes = useMemo(
    () =>
      nodes.map((n) => ({
        ...n,
        style: {
          ...n.style,
          outline: n.id === selectedNodeId ? "2px solid #e8722c" : "none",
          outlineOffset: 2,
        },
      })),
    [nodes, selectedNodeId]
  );

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col gap-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full bg-transparent text-xl font-semibold tracking-tight outline-none"
            placeholder="Workflow name"
          />
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="mt-1 w-full bg-transparent text-sm text-ink-muted dark:text-ink-muted-dark outline-none"
            placeholder="Description"
          />
        </div>
        <div className="flex gap-2">
          <select
            onChange={(e) => e.target.value && addNode(e.target.value)}
            value=""
            className="rounded-md border border-hairline dark:border-hairline-dark bg-surface dark:bg-surface-dark px-2 py-1.5 text-xs"
          >
            <option value="">+ Add node…</option>
            {plugins.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <button
            onClick={validate}
            className="rounded-md border border-hairline dark:border-hairline-dark px-3 py-1.5 text-xs hover:border-baseline dark:hover:border-baseline-dark"
          >
            Validate
          </button>
          <button
            onClick={save}
            disabled={saving}
            className="rounded-md bg-forge-1 px-3 py-1.5 text-xs font-medium text-white hover:opacity-90 disabled:opacity-50"
          >
            {saving ? "Saving…" : isEditing ? "Save new version" : "Create workflow"}
          </button>
        </div>
      </div>

      {(validationErrors.length > 0 || saveError) && (
        <div className="rounded-md border border-status-critical/30 bg-status-critical/10 px-4 py-2 text-xs text-status-critical">
          {saveError || validationErrors.join("; ")}
        </div>
      )}

      <div className="flex flex-1 gap-4 overflow-hidden">
        <div className="flex-1 overflow-hidden rounded-lg border border-hairline dark:border-hairline-dark bg-surface dark:bg-surface-dark">
          <ReactFlow
            nodes={rfNodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={(_, node) => setSelectedNodeId(node.id)}
            onPaneClick={() => setSelectedNodeId(null)}
            fitView
            proOptions={{ hideAttribution: true }}
          >
            <Background gap={24} color="#8f827033" />
            <Controls showInteractive={false} />
          </ReactFlow>
        </div>

        <div className="w-80 shrink-0 overflow-y-auto rounded-lg border border-hairline dark:border-hairline-dark bg-surface dark:bg-surface-dark p-4">
          {!selectedDef ? (
            <div className="text-xs text-ink-faint">
              Select a node to configure it, or add one from the toolbar above. Drag from a node's edge to another
              node to connect them.
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <div className="text-xs font-medium text-ink-muted dark:text-ink-muted-dark">
                Node: {selectedDef.action.plugin_id}
              </div>
              <label className="text-xs">
                Name
                <input
                  value={selectedDef.name}
                  onChange={(e) => updateSelectedNode({ name: e.target.value })}
                  className="mt-1 w-full rounded border border-hairline dark:border-hairline-dark bg-plane dark:bg-plane-dark px-2 py-1 text-sm"
                />
              </label>
              <label className="text-xs">
                Config (JSON)
                <textarea
                  defaultValue={JSON.stringify(selectedDef.action.config, null, 2)}
                  onBlur={(e) => {
                    try {
                      const config = JSON.parse(e.target.value || "{}");
                      updateSelectedNode({ action: { ...selectedDef.action, config } });
                    } catch {
                      // leave the field as-is; Validate will surface the problem
                    }
                  }}
                  rows={6}
                  className="mt-1 w-full rounded border border-hairline dark:border-hairline-dark bg-plane dark:bg-plane-dark px-2 py-1 font-mono text-xs"
                />
              </label>
              <label className="text-xs">
                Condition expression (optional)
                <input
                  defaultValue={selectedDef.condition?.expression ?? ""}
                  onBlur={(e) =>
                    updateSelectedNode({ condition: e.target.value ? { expression: e.target.value } : null })
                  }
                  className="mt-1 w-full rounded border border-hairline dark:border-hairline-dark bg-plane dark:bg-plane-dark px-2 py-1 text-sm"
                  placeholder="e.g. status == 'ok'"
                />
              </label>
              <div className="grid grid-cols-2 gap-2">
                <label className="text-xs">
                  Max retries
                  <input
                    type="number"
                    defaultValue={selectedDef.retry_policy.max_retries}
                    onBlur={(e) =>
                      updateSelectedNode({
                        retry_policy: { ...selectedDef.retry_policy, max_retries: Number(e.target.value) },
                      })
                    }
                    className="mt-1 w-full rounded border border-hairline dark:border-hairline-dark bg-plane dark:bg-plane-dark px-2 py-1 text-sm"
                  />
                </label>
                <label className="text-xs">
                  Timeout (s)
                  <input
                    type="number"
                    defaultValue={selectedDef.timeout_seconds ?? ""}
                    onBlur={(e) =>
                      updateSelectedNode({ timeout_seconds: e.target.value ? Number(e.target.value) : null })
                    }
                    className="mt-1 w-full rounded border border-hairline dark:border-hairline-dark bg-plane dark:bg-plane-dark px-2 py-1 text-sm"
                  />
                </label>
              </div>
              <label className="text-xs">
                Loop until (optional)
                <input
                  defaultValue={selectedDef.loop?.until_condition ?? ""}
                  onBlur={(e) =>
                    updateSelectedNode({
                      loop: e.target.value
                        ? { until_condition: e.target.value, max_iterations: selectedDef.loop?.max_iterations ?? 20 }
                        : null,
                    })
                  }
                  className="mt-1 w-full rounded border border-hairline dark:border-hairline-dark bg-plane dark:bg-plane-dark px-2 py-1 text-sm"
                  placeholder="e.g. quality_score >= 7"
                />
              </label>
              <button
                onClick={deleteSelectedNode}
                className="mt-2 rounded-md border border-status-critical/30 px-3 py-1.5 text-xs text-status-critical hover:bg-status-critical/10"
              >
                Delete node
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
