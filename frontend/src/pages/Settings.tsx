import { useEffect, useState } from "react";
import { CheckCircle2, CircleDashed, Server, Sparkles } from "lucide-react";
import { api } from "../lib/api";
import type { AIProviderInfo } from "../lib/types";
import { Panel, PanelHeader, SectionLabel } from "../components/ui/Panel";
import { SkeletonRows } from "../components/ui/Skeleton";

export default function Settings() {
  const [providers, setProviders] = useState<AIProviderInfo[] | null>(null);
  const [health, setHealth] = useState<{ service: string; status: string } | null>(null);
  const [healthError, setHealthError] = useState(false);

  useEffect(() => {
    api.aiProviders().then(setProviders).catch(() => setProviders([]));
    api
      .health()
      .then(setHealth)
      .catch(() => setHealthError(true));
  }, []);

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-ink dark:text-ink-dark">Settings</h1>
        <p className="mt-1 text-sm text-ink-muted dark:text-ink-muted-dark">Connection and AI-provider configuration for this workspace.</p>
      </div>

      <div>
        <SectionLabel className="mb-2">Connection</SectionLabel>
        <Panel>
          <div className="flex items-center gap-3 px-4 py-3.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-hairline text-ink-muted dark:border-hairline-dark dark:text-ink-muted-dark">
              <Server size={15} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="tabular truncate text-sm text-ink dark:text-ink-dark">{api.baseUrl}</div>
              <div className="text-xs text-ink-faint dark:text-ink-faint-dark">
                {healthError ? "Unreachable" : health ? `${health.service} · ${health.status}` : "Checking…"}
              </div>
            </div>
            <span
              className={`h-1.5 w-1.5 shrink-0 rounded-full ${healthError ? "bg-status-danger dark:bg-status-danger-dark" : health ? "bg-status-success dark:bg-status-success-dark" : "bg-ink-faint dark:bg-ink-faint-dark"}`}
            />
          </div>
        </Panel>
      </div>

      <div>
        <SectionLabel className="mb-2">AI providers</SectionLabel>
        <Panel>
          <PanelHeader>
            <div className="flex items-center gap-2 text-sm text-ink dark:text-ink-dark">
              <Sparkles size={14} className="text-ink-faint dark:text-ink-faint-dark" />
              Workflow generation
            </div>
            <span className="text-xs text-ink-faint dark:text-ink-faint-dark">Set an API key in .env to enable a provider</span>
          </PanelHeader>
          {providers === null ? (
            <SkeletonRows rows={3} />
          ) : (
            <div className="flex flex-col">
              {providers.map((p) => (
                <div key={p.id} className="flex items-center justify-between border-b border-hairline px-4 py-3 text-sm last:border-0 dark:border-hairline-dark">
                  <span className="text-ink dark:text-ink-dark">{p.name}</span>
                  {p.configured ? (
                    <span className="flex items-center gap-1.5 text-xs text-status-success dark:text-status-success-dark">
                      <CheckCircle2 size={13} /> Configured
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5 text-xs text-ink-faint dark:text-ink-faint-dark">
                      <CircleDashed size={13} /> Not configured
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}
