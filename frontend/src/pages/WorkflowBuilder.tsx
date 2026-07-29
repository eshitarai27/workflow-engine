import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import ReactFlow, {
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  Background,
  Controls,
  MiniMap,
  ReactFlowProvider,
  useReactFlow,
  type Connection,
  type Edge as RFEdge,
  type EdgeChange,
  type Node as RFNode,
  type NodeChange,
} from "reactflow";
import "reactflow/dist/style.css";
import { ArrowLeft, Blocks, CheckCircle2, MousePointerClick, Save } from "lucide-react";
import { api, ApiError, type WorkflowDefinitionInput } from "../lib/api";
import type { Execution, NodeExecutionRecord, PluginMetadata, Workflow, WorkflowNode } from "../lib/types";
import { colorForCategory } from "../lib/colors";
import Button from "../components/ui/Button";
import NodePalette from "../components/builder/NodePalette";
import NodeInspector from "../components/builder/NodeInspector";
import CanvasNode, { type CanvasNodeData } from "../components/builder/CanvasNode";
import EmptyState from "../components/ui/EmptyState";
import { toast } from "../components/ui/Toaster";

const nodeTypes = { action: CanvasNode };

let idCounter = 0;
function nextNodeId(): string {
  idCounter += 1;
  return `node_${Date.now().toString(36)}_${idCounter}`;
}

function nodeToRF(node: WorkflowNode, plugins: PluginMetadata[], position: { x: number; y: number }): RFNode<CanvasNodeData> {
  const plugin = plugins.find((p) => p.id === node.action.plugin_id);
  return {
    id: node.id,
    type: "action",
    position,
    data: {
      label: node.name,
      pluginId: node.action.plugin_id,
      color: plugin ? colorForCategory(plugin.category) : "#a1a1aa",
      hasCondition: Boolean(node.condition),
      hasLoop: Boolean(node.loop),
    },
  };
}

function defaultPosition(index: number): { x: number; y: number } {
  return { x: (index % 4) * 220, y: Math.floor(index / 4) * 110 };
}

function BuilderInner() {
  const { workflowId } = useParams<{ workflowId?: string }>();
  const navigate = useNavigate();
  const isEditing = Boolean(workflowId);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const { project } = useReactFlow();

  const [plugins, setPlugins] = useState<PluginMetadata[]>([]);
  const [name, setName] = useState("Untitled Workflow");
  const [description, setDescription] = useState("");
  const [nodes, setNodes] = useState<RFNode<CanvasNodeData>[]>([]);
  const [edges, setEdges] = useState<RFEdge[]>([]);
  const [nodeDefs, setNodeDefs] = useState<Record<string, WorkflowNode>>({});
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [lastRecords, setLastRecords] = useState<Record<string, NodeExecutionRecord>>({});

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
      setEdges(wf.edges.map((e) => ({ id: `${e.source}-${e.target}`, source: e.source, target: e.target })));
      setDirty(false);
    });
    api
      .listExecutions(workflowId, 1)
      .then((execs) => (execs.length ? api.getExecution(execs[0].id) : null))
      .then((exec: Execution | null) => {
        if (!exec) return;
        const map: Record<string, NodeExecutionRecord> = {};
        for (const record of exec.history) map[record.node_id] = record;
        setLastRecords(map);
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workflowId, plugins.length]);

  const markDirty = () => setDirty(true);

  const onNodesChange = useCallback((changes: NodeChange[]) => {
    setNodes((nds) => applyNodeChanges(changes, nds));
    if (changes.some((c) => c.type === "add" || c.type === "remove" || (c.type === "position" && c.dragging === false))) markDirty();
    const removed = changes.filter((c) => c.type === "remove").map((c) => c.id);
    if (removed.length) {
      setNodeDefs((prev) => {
        const next = { ...prev };
        removed.forEach((id) => delete next[id]);
        return next;
      });
      setSelectedNodeId((sel) => (sel && removed.includes(sel) ? null : sel));
    }
  }, []);

  const onEdgesChange = useCallback((changes: EdgeChange[]) => {
    setEdges((eds) => applyEdgeChanges(changes, eds));
    if (changes.some((c) => c.type !== "select")) markDirty();
  }, []);

  const onConnect = useCallback((connection: Connection) => {
    setEdges((eds) => addEdge({ ...connection, type: "smoothstep" }, eds));
    markDirty();
  }, []);

  const addNode = useCallback(
    (pluginId: string, position?: { x: number; y: number }) => {
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
      setNodes((prev) => [...prev, nodeToRF(definition, plugins, position ?? defaultPosition(prev.length))]);
      setSelectedNodeId(id);
      markDirty();
    },
    [plugins]
  );

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      const pluginId = event.dataTransfer.getData("application/flowforge-plugin");
      if (!pluginId) return;
      const bounds = wrapperRef.current?.getBoundingClientRect();
      const position = project({
        x: event.clientX - (bounds?.left ?? 0),
        y: event.clientY - (bounds?.top ?? 0),
      });
      addNode(pluginId, position);
    },
    [addNode, project]
  );

  const updateSelectedNode = (patch: Partial<WorkflowNode>) => {
    if (!selectedNodeId) return;
    setNodeDefs((prev) => ({ ...prev, [selectedNodeId]: { ...prev[selectedNodeId], ...patch } }));
    markDirty();
    if (patch.name || patch.condition !== undefined || patch.loop !== undefined) {
      setNodes((prev) =>
        prev.map((n) =>
          n.id === selectedNodeId
            ? {
                ...n,
                data: {
                  ...n.data,
                  ...(patch.name ? { label: patch.name } : {}),
                  ...(patch.condition !== undefined ? { hasCondition: Boolean(patch.condition) } : {}),
                  ...(patch.loop !== undefined ? { hasLoop: Boolean(patch.loop) } : {}),
                },
              }
            : n
        )
      );
    }
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
    markDirty();
  };

  const buildDefinition = useCallback(
    (): WorkflowDefinitionInput => ({
      id: workflowId,
      name,
      description,
      nodes: nodes.map((n) => nodeDefs[n.id]),
      edges: edges.map((e) => ({ source: e.source, target: e.target })),
      metadata: { positions: Object.fromEntries(nodes.map((n) => [n.id, n.position])) },
    }),
    [workflowId, name, description, nodes, edges, nodeDefs]
  );

  const validate = useCallback(() => {
    api
      .validateWorkflow(buildDefinition())
      .then((res) => {
        setValidationErrors(res.errors);
        if (res.errors.length === 0) toast.success("Workflow is valid");
      })
      .catch((err) => setValidationErrors([err instanceof ApiError ? err.message : "Validation failed"]));
  }, [buildDefinition]);

  const save = useCallback(() => {
    setSaving(true);
    const definition = buildDefinition();
    const request = isEditing && workflowId ? api.updateWorkflow(workflowId, definition) : api.createWorkflow(definition);
    request
      .then((wf) => {
        toast.success(isEditing ? "New version saved" : "Workflow created");
        setDirty(false);
        navigate(`/workflows/${wf.id}`);
      })
      .catch((err) => toast.error(err instanceof ApiError ? err.message : "Failed to save"))
      .finally(() => setSaving(false));
  }, [buildDefinition, isEditing, workflowId, navigate]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        save();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        validate();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [save, validate]);

  const selectedDef = selectedNodeId ? nodeDefs[selectedNodeId] : null;
  const selectedPlugin = selectedDef ? plugins.find((p) => p.id === selectedDef.action.plugin_id) : undefined;

  const rfNodes = useMemo(
    () => nodes.map((n) => ({ ...n, selected: n.id === selectedNodeId })),
    [nodes, selectedNodeId]
  );

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between gap-4 border-b border-hairline px-4 py-2.5 dark:border-hairline-dark">
        <div className="flex min-w-0 items-center gap-3">
          <Link to="/workflows" className="flex shrink-0 items-center gap-1 text-xs text-ink-faint hover:text-ink-muted dark:text-ink-faint-dark dark:hover:text-ink-muted-dark">
            <ArrowLeft size={12} />
          </Link>
          <div className="min-w-0">
            <input
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                markDirty();
              }}
              className="w-full bg-transparent text-sm font-semibold tracking-tight text-ink outline-none dark:text-ink-dark"
              placeholder="Workflow name"
            />
            <input
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
                markDirty();
              }}
              className="w-full bg-transparent text-xs text-ink-muted outline-none dark:text-ink-muted-dark"
              placeholder="Add a description…"
            />
          </div>
          {dirty && <span className="shrink-0 rounded bg-accent-muted px-1.5 py-0.5 text-[10px] font-medium text-accent dark:bg-accent-muted-dark dark:text-accent-dark">Unsaved</span>}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button variant="secondary" size="sm" onClick={validate}>
            <CheckCircle2 size={13} /> Validate
          </Button>
          <Button variant="primary" size="sm" onClick={save} disabled={saving}>
            <Save size={13} /> {saving ? "Saving…" : isEditing ? "Save new version" : "Create workflow"}
          </Button>
        </div>
      </div>

      {validationErrors.length > 0 && (
        <div className="border-b border-status-danger/30 bg-status-danger/10 px-4 py-2 text-xs text-status-danger dark:border-status-danger-dark/30 dark:bg-status-danger-dark/10 dark:text-status-danger-dark">
          {validationErrors.join("; ")}
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        <NodePalette plugins={plugins} onAdd={(id) => addNode(id)} />

        <div ref={wrapperRef} className="relative flex-1 bg-plane dark:bg-plane-dark" onDrop={onDrop} onDragOver={(e) => e.preventDefault()}>
          {nodes.length === 0 && (
            <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
              <EmptyState icon={MousePointerClick} title="Empty canvas" description="Drag a node from the left panel onto the canvas to get started." />
            </div>
          )}
          <ReactFlow
            nodes={rfNodes}
            edges={edges}
            nodeTypes={nodeTypes}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={(_, node) => setSelectedNodeId(node.id)}
            onPaneClick={() => setSelectedNodeId(null)}
            deleteKeyCode={["Backspace", "Delete"]}
            defaultEdgeOptions={{ type: "smoothstep" }}
            fitView
            proOptions={{ hideAttribution: true }}
          >
            <Background gap={20} size={1} className="dark:opacity-40" />
            <Controls showInteractive={false} />
            <MiniMap
              pannable
              zoomable
              nodeColor={(n) => (n.data as CanvasNodeData)?.color ?? "#a1a1aa"}
              maskColor="rgba(0,0,0,0.06)"
              className="!bg-surface dark:!bg-surface-dark"
            />
          </ReactFlow>
        </div>

        <div className="w-72 shrink-0 border-l border-hairline dark:border-hairline-dark">
          {!selectedDef ? (
            <div className="p-4">
              <EmptyState icon={Blocks} title="No node selected" description="Select a node to configure it, or drag one in from the palette." />
            </div>
          ) : (
            <NodeInspector
              node={selectedDef}
              plugin={selectedPlugin}
              onUpdate={updateSelectedNode}
              onDelete={deleteSelectedNode}
              lastExecutionRecord={lastRecords[selectedDef.id] ?? null}
            />
          )}
        </div>
      </div>
    </div>
  );
}

export default function WorkflowBuilder() {
  return (
    <ReactFlowProvider>
      <BuilderInner />
    </ReactFlowProvider>
  );
}
