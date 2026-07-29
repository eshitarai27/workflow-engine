import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Search, Workflow as WorkflowIcon } from "lucide-react";
import { api } from "../lib/api";
import type { Workflow } from "../lib/types";
import { Table, THead, Th, Tr, Td } from "../components/ui/Table";
import { Input } from "../components/ui/Input";
import Button from "../components/ui/Button";
import EmptyState from "../components/ui/EmptyState";
import { SkeletonRows } from "../components/ui/Skeleton";
import HoverCard from "../components/ui/HoverCard";
import WorkflowThumbnail from "../components/WorkflowThumbnail";
import WorkflowStatsPreview from "../components/WorkflowStatsPreview";
import { useNewWorkflowDialog } from "../lib/newWorkflowContext";

export default function Workflows() {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const openNewWorkflow = useNewWorkflowDialog();

  useEffect(() => {
    api
      .listWorkflows()
      .then(setWorkflows)
      .catch(() => setError("Could not reach the FlowForge API."))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return workflows;
    return workflows.filter((w) => w.name.toLowerCase().includes(q) || w.description?.toLowerCase().includes(q));
  }, [workflows, query]);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-ink dark:text-ink-dark">Workflows</h1>
          <p className="mt-1 text-sm text-ink-muted dark:text-ink-muted-dark">Every workflow shown here is the latest saved version.</p>
        </div>
        <Button variant="primary" onClick={openNewWorkflow}>
          + New workflow
        </Button>
      </div>

      <div className="relative max-w-xs">
        <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-faint dark:text-ink-faint-dark" />
        <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search workflows…" className="pl-8" />
      </div>

      {error && (
        <div className="rounded-md border border-status-danger/30 bg-status-danger/10 px-4 py-3 text-sm text-status-danger dark:border-status-danger-dark/30 dark:bg-status-danger-dark/10 dark:text-status-danger-dark">
          {error}
        </div>
      )}

      <div className="rounded-lg border border-hairline dark:border-hairline-dark">
        {loading ? (
          <SkeletonRows rows={5} />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={WorkflowIcon}
            title={workflows.length === 0 ? "No workflows yet" : "No workflows match your search"}
            description={workflows.length === 0 ? "Create your first workflow to get started." : undefined}
            action={
              workflows.length === 0 ? (
                <Button variant="primary" size="sm" onClick={openNewWorkflow}>
                  + New workflow
                </Button>
              ) : undefined
            }
          />
        ) : (
          <Table>
            <THead>
              <tr>
                <Th className="w-[46%]">Name</Th>
                <Th className="w-[10%]">Nodes</Th>
                <Th className="w-[10%]">Edges</Th>
                <Th className="w-[10%]">Version</Th>
                <Th className="w-[24%]">ID</Th>
              </tr>
            </THead>
            <tbody>
              {filtered.map((wf) => (
                <Tr key={wf.id} clickable>
                  <Td>
                    <HoverCard
                      width="260px"
                      trigger={
                        <Link to={`/workflows/${wf.id}`} className="flex min-w-0 items-center gap-3">
                          <div className="hidden h-9 w-14 shrink-0 items-center justify-center rounded border border-hairline bg-plane sm:flex dark:border-hairline-dark dark:bg-plane-dark">
                            <WorkflowThumbnail workflow={wf} className="h-full w-full p-1" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="truncate font-medium text-ink dark:text-ink-dark">{wf.name}</div>
                            <div className="truncate text-xs text-ink-muted dark:text-ink-muted-dark">{wf.description || "No description"}</div>
                          </div>
                        </Link>
                      }
                    >
                      <WorkflowStatsPreview workflow={wf} />
                    </HoverCard>
                  </Td>
                  <Td className="tabular text-ink-muted dark:text-ink-muted-dark">{wf.nodes.length}</Td>
                  <Td className="tabular text-ink-muted dark:text-ink-muted-dark">{wf.edges.length}</Td>
                  <Td className="tabular text-ink-muted dark:text-ink-muted-dark">v{wf.version}</Td>
                  <Td className="tabular text-xs text-ink-faint dark:text-ink-faint-dark">{wf.id}</Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        )}
      </div>
    </div>
  );
}
