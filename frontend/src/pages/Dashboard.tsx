import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, ApiError } from "../lib/api";
import type { AIProviderInfo, Execution, GeneratedWorkflow, Workflow } from "../lib/types";
import StatTile from "../components/StatTile";
import { ExecutionStatusBadge } from "../components/StatusBadge";

function formatDuration(ms: number | null): string {
  if (ms === null) return "—";
  if (ms < 1000) return `${ms.toFixed(0)} ms`;
  return `${(ms / 1000).toFixed(2)} s`;
}

function AIGenerateCard() {
  const [prompt, setPrompt] = useState("");
  const [providers, setProviders] = useState<AIProviderInfo[]>([]);
  const [provider, setProvider] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<GeneratedWorkflow | null>(null);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    api.aiProviders().then(setProviders).catch(() => setProviders([]));
  }, []);

  const anyConfigured = providers.some((p) => p.configured);

  const generate = () => {
    setLoading(true);
    setError(null);
    setResult(null);
    api
      .aiGenerate(prompt, provider || undefined)
      .then(setResult)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Generation failed"))
      .finally(() => setLoading(false));
  };

  const createFromResult = () => {
    if (!result) return;
    api.createWorkflow(result.definition).then((wf) => navigate(`/workflows/${wf.id}`));
  };

  return (
    <div className="rounded-lg border border-hairline dark:border-hairline-dark bg-surface dark:bg-surface-dark p-5">
      <div className="mb-1 text-sm font-medium">Generate a workflow from a description</div>
      <p className="mb-3 text-xs text-ink-muted dark:text-ink-muted-dark">
        Optional -- requires a configured AI provider (OpenAI, Anthropic, Google, or Ollama).
      </p>
      {!anyConfigured && providers.length > 0 && (
        <div className="mb-3 rounded-md border border-status-warning/30 bg-status-warning/10 px-3 py-2 text-xs text-status-warning">
          No AI provider is configured on the backend. Set an API key (see .env.example) to enable this.
        </div>
      )}
      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="e.g. When a file is uploaded, summarize it and send the summary by email."
        rows={3}
        className="w-full resize-none rounded-md border border-hairline dark:border-hairline-dark bg-plane dark:bg-plane-dark px-3 py-2 text-sm outline-none focus:border-forge-1"
      />
      <div className="mt-3 flex items-center gap-2">
        <select
          value={provider}
          onChange={(e) => setProvider(e.target.value)}
          className="rounded-md border border-hairline dark:border-hairline-dark bg-plane dark:bg-plane-dark px-2 py-1.5 text-xs"
        >
          <option value="">Auto-select provider</option>
          {providers.map((p) => (
            <option key={p.id} value={p.id} disabled={!p.configured}>
              {p.name} {p.configured ? "" : "(not configured)"}
            </option>
          ))}
        </select>
        <button
          onClick={generate}
          disabled={loading || !prompt.trim()}
          className="rounded-md bg-forge-1 px-3 py-1.5 text-xs font-medium text-white hover:opacity-90 disabled:opacity-50"
        >
          {loading ? "Generating…" : "Generate"}
        </button>
      </div>

      {error && <div className="mt-3 text-xs text-status-critical">{error}</div>}

      {result && (
        <div className="mt-4 rounded-md border border-hairline dark:border-hairline-dark bg-plane dark:bg-plane-dark p-3">
          <div className="text-xs text-ink-muted dark:text-ink-muted-dark">{result.explanation}</div>
          <div className="mt-2 text-xs">
            {result.validation_errors.length === 0 ? (
              <span className="text-status-good">✓ Generated workflow is valid</span>
            ) : (
              <span className="text-status-critical">{result.validation_errors.join("; ")}</span>
            )}
          </div>
          <button
            onClick={createFromResult}
            disabled={result.validation_errors.length > 0}
            className="mt-2 rounded-md border border-hairline dark:border-hairline-dark px-2.5 py-1 text-xs hover:border-baseline dark:hover:border-baseline-dark disabled:opacity-50"
          >
            Save this workflow →
          </button>
        </div>
      )}
    </div>
  );
}

export default function Dashboard() {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [executions, setExecutions] = useState<Execution[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = () => {
      Promise.all([api.listWorkflows(), api.listExecutions(undefined, 8)])
        .then(([w, e]) => {
          if (cancelled) return;
          setWorkflows(w);
          setExecutions(e);
          setError(null);
        })
        .catch(() => !cancelled && setError("Could not reach the FlowForge API."));
    };
    load();
    const interval = setInterval(load, 4000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  const running = executions.filter((e) => e.status === "RUNNING").length;
  const failed = executions.filter((e) => e.status === "FAILED").length;

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Dashboard</h1>
        <p className="mt-1 text-sm text-ink-muted dark:text-ink-muted-dark">
          FlowForge API at <span className="tabular">{api.baseUrl}</span>
        </p>
      </div>

      {error && (
        <div className="rounded-md border border-status-critical/30 bg-status-critical/10 px-4 py-3 text-sm text-status-critical">
          {error} Start it with <code className="tabular">python main.py</code>.
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatTile label="Workflows" value={String(workflows.length)} />
        <StatTile label="Recent executions" value={String(executions.length)} />
        <StatTile label="Running now" value={String(running)} accent={running > 0 ? "#e8722c" : undefined} />
        <StatTile label="Failed (recent)" value={String(failed)} accent={failed > 0 ? "#c1443a" : undefined} />
      </div>

      <AIGenerateCard />

      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-medium text-ink-muted dark:text-ink-muted-dark">Recent executions</h2>
          <Link to="/workflows" className="text-xs text-forge-1 hover:underline">
            View all workflows →
          </Link>
        </div>
        <div className="overflow-hidden rounded-lg border border-hairline dark:border-hairline-dark bg-surface dark:bg-surface-dark">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-hairline dark:border-hairline-dark text-left text-xs text-ink-muted dark:text-ink-muted-dark">
                <th className="px-4 py-2.5 font-normal">Workflow</th>
                <th className="px-4 py-2.5 font-normal">Status</th>
                <th className="px-4 py-2.5 font-normal">Duration</th>
                <th className="px-4 py-2.5 font-normal">Triggered by</th>
                <th className="px-4 py-2.5 font-normal">Execution</th>
              </tr>
            </thead>
            <tbody>
              {executions.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-ink-faint">
                    No executions yet. Create a workflow and run it.
                  </td>
                </tr>
              )}
              {executions.map((e) => (
                <tr
                  key={e.id}
                  className="border-b border-hairline dark:border-hairline-dark last:border-0 hover:bg-plane dark:hover:bg-plane-dark"
                >
                  <td className="px-4 py-2.5">
                    <Link to={`/workflows/${e.workflow_id}`} className="text-forge-1 hover:underline">
                      {e.workflow_id}
                    </Link>
                  </td>
                  <td className="px-4 py-2.5">
                    <ExecutionStatusBadge status={e.status} />
                  </td>
                  <td className="px-4 py-2.5 tabular text-ink-muted dark:text-ink-muted-dark">
                    {formatDuration(e.duration_ms)}
                  </td>
                  <td className="px-4 py-2.5 text-ink-faint">{e.triggered_by}</td>
                  <td className="px-4 py-2.5">
                    <Link to={`/executions/${e.id}`} className="tabular text-xs text-forge-1 hover:underline">
                      {e.id.slice(0, 14)}…
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
