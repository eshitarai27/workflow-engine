import { useEffect, useMemo, useState } from "react";
import { Blocks, Search } from "lucide-react";
import { api } from "../lib/api";
import type { PluginMetadata, Workflow } from "../lib/types";
import { colorForCategory } from "../lib/colors";
import { Input } from "../components/ui/Input";
import { Panel } from "../components/ui/Panel";
import EmptyState from "../components/ui/EmptyState";
import { SkeletonRows } from "../components/ui/Skeleton";
import { cn } from "../lib/cn";

export default function Plugins() {
  const [plugins, setPlugins] = useState<PluginMetadata[]>([]);
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string>("ALL");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([api.listPlugins(), api.listWorkflows()])
      .then(([p, w]) => {
        setPlugins(p);
        setWorkflows(w);
      })
      .catch(() => setError("Could not reach the FlowForge API."))
      .finally(() => setLoading(false));
  }, []);

  const usageFor = useMemo(() => {
    const counts = new Map<string, number>();
    for (const wf of workflows) {
      for (const node of wf.nodes) {
        counts.set(node.action.plugin_id, (counts.get(node.action.plugin_id) ?? 0) + 1);
      }
    }
    return (id: string) => counts.get(id) ?? 0;
  }, [workflows]);

  const categories = useMemo(() => ["ALL", ...Array.from(new Set(plugins.map((p) => p.category))).sort()], [plugins]);

  const filtered = plugins.filter((p) => {
    const matchesCategory = category === "ALL" || p.category === category;
    const matchesQuery = !query.trim() || p.name.toLowerCase().includes(query.trim().toLowerCase());
    return matchesCategory && matchesQuery;
  });

  if (error) {
    return (
      <div className="rounded-md border border-status-danger/30 bg-status-danger/10 px-4 py-3 text-sm text-status-danger dark:border-status-danger-dark/30 dark:bg-status-danger-dark/10 dark:text-status-danger-dark">
        {error}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-ink dark:text-ink-dark">Plugins</h1>
        <p className="mt-1 text-sm text-ink-muted dark:text-ink-muted-dark">Every action a node can take. Adding a new one is a new plugin file, not an engine change.</p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-56">
          <Search size={13} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-faint dark:text-ink-faint-dark" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search plugins…" className="pl-7" />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={cn(
                "rounded-full border px-2.5 py-1 text-xs capitalize transition-colors",
                category === c
                  ? "border-accent bg-accent-muted text-accent dark:border-accent-dark dark:bg-accent-muted-dark dark:text-accent-dark"
                  : "border-hairline text-ink-muted hover:border-baseline dark:border-hairline-dark dark:text-ink-muted-dark dark:hover:border-baseline-dark"
              )}
            >
              {c === "ALL" ? "All" : c}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <Panel>
          <SkeletonRows rows={5} />
        </Panel>
      ) : filtered.length === 0 ? (
        <Panel>
          <EmptyState icon={Blocks} title="No plugins match" />
        </Panel>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {filtered.map((plugin) => {
            const color = colorForCategory(plugin.category);
            const usage = usageFor(plugin.id);
            return (
              <Panel key={plugin.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded" style={{ backgroundColor: `${color}1a` }}>
                      <Blocks size={13} style={{ color }} />
                    </span>
                    <span className="font-medium text-ink dark:text-ink-dark">{plugin.name}</span>
                  </div>
                  <span className="rounded-full px-2 py-0.5 text-xs font-medium capitalize" style={{ color, backgroundColor: `${color}1a` }}>
                    {plugin.category}
                  </span>
                </div>
                <p className="mt-2 text-xs text-ink-muted dark:text-ink-muted-dark">{plugin.description}</p>
                <div className="mt-3 flex items-center justify-between text-xs text-ink-faint dark:text-ink-faint-dark">
                  <span>{usage === 0 ? "Not used yet" : `Used in ${usage} workflow${usage === 1 ? "" : "s"}`}</span>
                  <span>v{plugin.version}</span>
                </div>
                {plugin.config_schema.length > 0 && (
                  <details className="mt-3 border-t border-hairline pt-2 dark:border-hairline-dark">
                    <summary className="cursor-pointer text-xs text-ink-muted hover:text-ink dark:text-ink-muted-dark dark:hover:text-ink-dark">
                      {plugin.config_schema.length} config field{plugin.config_schema.length === 1 ? "" : "s"}
                    </summary>
                    <div className="mt-2 flex flex-col gap-1">
                      {plugin.config_schema.map((field) => (
                        <div key={field.name} className="flex items-center justify-between text-xs">
                          <span className="tabular text-ink dark:text-ink-dark">
                            {field.name}
                            {field.required && <span className="text-status-danger dark:text-status-danger-dark">*</span>}
                          </span>
                          <span className="text-ink-faint dark:text-ink-faint-dark">{field.type}</span>
                        </div>
                      ))}
                    </div>
                  </details>
                )}
              </Panel>
            );
          })}
        </div>
      )}
    </div>
  );
}
