import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Blocks, GitBranch, Pencil, Play, Trash2 } from "lucide-react";
import { api, ApiError } from "../lib/api";
import type { Execution, Workflow, WorkflowVersionSummary } from "../lib/types";
import { ExecutionStatusBadge } from "../components/ui/Badge";
import Button from "../components/ui/Button";
import IconButton from "../components/ui/IconButton";
import { Panel } from "../components/ui/Panel";
import EmptyState from "../components/ui/EmptyState";
import { Table, THead, Th, Tr, Td } from "../components/ui/Table";
import { Tabs, TabPanel } from "../components/ui/Tabs";
import Dialog from "../components/ui/Dialog";
import { toast } from "../components/ui/Toaster";

export default function WorkflowDetail() {
  const { workflowId } = useParams<{ workflowId: string }>();
  const navigate = useNavigate();
  const [workflow, setWorkflow] = useState<Workflow | null>(null);
  const [versions, setVersions] = useState<WorkflowVersionSummary[]>([]);
  const [executions, setExecutions] = useState<Execution[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [executing, setExecuting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [tab, setTab] = useState("overview");

  const load = () => {
    if (!workflowId) return;
    Promise.all([api.getWorkflow(workflowId), api.listVersions(workflowId), api.listExecutions(workflowId, 30)])
      .then(([w, v, e]) => {
        setWorkflow(w);
        setVersions(v);
        setExecutions(e);
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : "Failed to load workflow"));
  };

  useEffect(load, [workflowId]);

  const runNow = () => {
    if (!workflowId) return;
    setExecuting(true);
    api
      .executeWorkflow(workflowId)
      .then((execution) => {
        toast.success("Execution started");
        navigate(`/executions/${execution.id}`);
      })
      .catch((err) => toast.error(err instanceof ApiError ? err.message : "Failed to start execution"))
      .finally(() => setExecuting(false));
  };

  const deleteWorkflow = () => {
    if (!workflowId) return;
    api
      .deleteWorkflow(workflowId)
      .then(() => {
        toast.success("Workflow deleted");
        navigate("/workflows");
      })
      .catch((err) => toast.error(err instanceof ApiError ? err.message : "Failed to delete"));
  };

  if (error) {
    return (
      <div className="rounded-md border border-status-danger/30 bg-status-danger/10 px-4 py-3 text-sm text-status-danger dark:border-status-danger-dark/30 dark:bg-status-danger-dark/10 dark:text-status-danger-dark">
        {error}
      </div>
    );
  }
  if (!workflow) {
    return <div className="text-sm text-ink-muted dark:text-ink-muted-dark">Loading…</div>;
  }

  return (
    <div className="flex flex-col gap-5">
      <Link to="/workflows" className="flex w-fit items-center gap-1 text-xs text-ink-faint hover:text-ink-muted dark:text-ink-faint-dark dark:hover:text-ink-muted-dark">
        <ArrowLeft size={12} /> Workflows
      </Link>

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-ink dark:text-ink-dark">{workflow.name}</h1>
          <p className="mt-1 text-sm text-ink-muted dark:text-ink-muted-dark">
            {workflow.description || "No description"} <span className="text-ink-faint dark:text-ink-faint-dark">· v{workflow.version} · {workflow.id}</span>
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button variant="primary" onClick={runNow} disabled={executing}>
            <Play size={13} /> {executing ? "Starting…" : "Run now"}
          </Button>
          <Link to={`/workflows/${workflow.id}/simulate`}>
            <Button variant="secondary">
              <GitBranch size={13} /> Simulate
            </Button>
          </Link>
          <Link to={`/builder/${workflow.id}`}>
            <Button variant="secondary">
              <Pencil size={13} /> Edit
            </Button>
          </Link>
          <IconButton label="Delete workflow" variant="danger" onClick={() => setConfirmDelete(true)}>
            <Trash2 size={15} />
          </IconButton>
        </div>
      </div>

      <Tabs
        value={tab}
        onValueChange={setTab}
        tabs={[
          { value: "overview", label: "Overview" },
          { value: "executions", label: "Executions", count: executions.length },
          { value: "versions", label: "Versions", count: versions.length },
        ]}
      >
        <div className="pt-4">
          <TabPanel value="overview">
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <Panel>
                <div className="border-b border-hairline px-4 py-3 text-sm font-medium text-ink dark:border-hairline-dark dark:text-ink-dark">
                  Nodes ({workflow.nodes.length})
                </div>
                <div className="flex flex-col">
                  {workflow.nodes.length === 0 ? (
                    <EmptyState icon={Blocks} title="No nodes yet" description="Open the builder to add nodes to this workflow." />
                  ) : (
                    workflow.nodes.map((node) => (
                      <div key={node.id} className="flex items-center justify-between border-b border-hairline px-4 py-2.5 text-sm last:border-0 dark:border-hairline-dark">
                        <span className="text-ink dark:text-ink-dark">{node.name}</span>
                        <span className="tabular text-xs text-ink-faint dark:text-ink-faint-dark">{node.action.plugin_id}</span>
                      </div>
                    ))
                  )}
                </div>
              </Panel>

              <Panel>
                <div className="border-b border-hairline px-4 py-3 text-sm font-medium text-ink dark:border-hairline-dark dark:text-ink-dark">Triggers</div>
                <div className="flex flex-col">
                  {workflow.triggers.length === 0 ? (
                    <div className="px-4 py-6 text-center text-xs text-ink-faint dark:text-ink-faint-dark">Manual only — no triggers configured.</div>
                  ) : (
                    workflow.triggers.map((t, i) => (
                      <div key={i} className="flex items-center justify-between border-b border-hairline px-4 py-2.5 text-sm last:border-0 dark:border-hairline-dark">
                        <span className="text-ink dark:text-ink-dark">{t.type}</span>
                        <span className="tabular text-xs text-ink-faint dark:text-ink-faint-dark">{JSON.stringify(t.config)}</span>
                      </div>
                    ))
                  )}
                </div>
              </Panel>
            </div>
          </TabPanel>

          <TabPanel value="executions">
            <Panel className="overflow-hidden">
              {executions.length === 0 ? (
                <EmptyState icon={Play} title="No executions yet" description="Run this workflow to see it appear here." />
              ) : (
                <Table>
                  <THead>
                    <tr>
                      <Th>Status</Th>
                      <Th>Triggered by</Th>
                      <Th>Started</Th>
                      <Th>Execution</Th>
                    </tr>
                  </THead>
                  <tbody>
                    {executions.map((e) => (
                      <Tr key={e.id}>
                        <Td>
                          <ExecutionStatusBadge status={e.status} />
                        </Td>
                        <Td className="text-ink-faint dark:text-ink-faint-dark">{e.triggered_by}</Td>
                        <Td className="text-xs text-ink-faint dark:text-ink-faint-dark">{e.started_at ? new Date(e.started_at).toLocaleString() : "—"}</Td>
                        <Td>
                          <Link to={`/executions/${e.id}`} className="tabular text-xs text-accent hover:underline dark:text-accent-dark">
                            {e.id.slice(0, 14)}…
                          </Link>
                        </Td>
                      </Tr>
                    ))}
                  </tbody>
                </Table>
              )}
            </Panel>
          </TabPanel>

          <TabPanel value="versions">
            <Panel className="overflow-hidden">
              <Table>
                <THead>
                  <tr>
                    <Th>Version</Th>
                    <Th>Created</Th>
                    <Th />
                  </tr>
                </THead>
                <tbody>
                  {versions.map((v) => (
                    <Tr key={v.version}>
                      <Td className="tabular text-ink dark:text-ink-dark">v{v.version}</Td>
                      <Td className="text-xs text-ink-faint dark:text-ink-faint-dark">{new Date(v.created_at).toLocaleString()}</Td>
                      <Td>{v.is_latest ? <span className="text-xs text-status-success dark:text-status-success-dark">latest</span> : null}</Td>
                    </Tr>
                  ))}
                </tbody>
              </Table>
            </Panel>
          </TabPanel>
        </div>
      </Tabs>

      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete} title="Delete workflow" description={`This removes "${workflow.name}" and every saved version. This can't be undone.`} width="420px">
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setConfirmDelete(false)}>
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={() => {
              setConfirmDelete(false);
              deleteWorkflow();
            }}
          >
            Delete
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
