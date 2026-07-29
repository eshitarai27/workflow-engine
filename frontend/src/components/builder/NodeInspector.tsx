import { useState } from "react";
import { Code2, History, SlidersHorizontal, Trash2 } from "lucide-react";
import type { NodeExecutionRecord, PluginMetadata, WorkflowNode } from "../../lib/types";
import { Input, Label, Textarea } from "../ui/Input";
import { Tabs, TabPanel } from "../ui/Tabs";
import Button from "../ui/Button";
import EmptyState from "../ui/EmptyState";
import { NodeStateBadge } from "../ui/Badge";
import ConfigFieldInput from "./ConfigFieldInput";

export default function NodeInspector({
  node,
  plugin,
  onUpdate,
  onDelete,
  lastExecutionRecord,
}: {
  node: WorkflowNode;
  plugin?: PluginMetadata;
  onUpdate: (patch: Partial<WorkflowNode>) => void;
  onDelete: () => void;
  lastExecutionRecord?: NodeExecutionRecord | null;
}) {
  const [tab, setTab] = useState("config");
  const [rawMode, setRawMode] = useState(false);

  const setConfigField = (name: string, value: unknown) => {
    onUpdate({ action: { ...node.action, config: { ...node.action.config, [name]: value } } });
  };

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-hairline p-3 dark:border-hairline-dark">
        <Label>Node name</Label>
        <Input value={node.name} onChange={(e) => onUpdate({ name: e.target.value })} />
        <div className="mt-1.5 text-[11px] text-ink-faint dark:text-ink-faint-dark">{node.action.plugin_id}</div>
      </div>

      <Tabs
        value={tab}
        onValueChange={setTab}
        tabs={[
          { value: "config", label: "Config", icon: <SlidersHorizontal size={12} /> },
          { value: "behavior", label: "Behavior" },
          { value: "preview", label: "Preview", icon: <History size={12} /> },
        ]}
      >
        <div className="flex-1 overflow-y-auto p-3">
          <TabPanel value="config">
            {!plugin ? (
              <div className="text-xs text-ink-faint dark:text-ink-faint-dark">Unknown plugin — edit raw config below.</div>
            ) : (
              <div className="flex items-center justify-between pb-2">
                <span className="text-[11px] text-ink-faint dark:text-ink-faint-dark">{plugin.description}</span>
              </div>
            )}

            {!rawMode && plugin && plugin.config_schema.length > 0 ? (
              <div className="flex flex-col gap-3">
                {plugin.config_schema.map((field) => (
                  <ConfigFieldInput
                    key={field.name}
                    field={field}
                    value={node.action.config[field.name] ?? field.default}
                    onChange={(value) => setConfigField(field.name, value)}
                  />
                ))}
              </div>
            ) : (
              <div>
                <Label>Config (JSON)</Label>
                <Textarea
                  defaultValue={JSON.stringify(node.action.config, null, 2)}
                  rows={10}
                  className="font-mono text-xs"
                  onBlur={(e) => {
                    try {
                      onUpdate({ action: { ...node.action, config: JSON.parse(e.target.value || "{}") } });
                    } catch {
                      // left as-is; Validate surfaces the problem
                    }
                  }}
                />
              </div>
            )}

            {plugin && plugin.config_schema.length > 0 && (
              <button
                onClick={() => setRawMode((r) => !r)}
                className="mt-3 flex items-center gap-1.5 text-[11px] text-ink-faint hover:text-ink-muted dark:text-ink-faint-dark dark:hover:text-ink-muted-dark"
              >
                <Code2 size={11} />
                {rawMode ? "Use form fields" : "Edit as raw JSON"}
              </button>
            )}
          </TabPanel>

          <TabPanel value="behavior">
            <div className="flex flex-col gap-3">
              <div>
                <Label>Condition expression (optional)</Label>
                <Input
                  defaultValue={node.condition?.expression ?? ""}
                  placeholder="e.g. status == 'ok'"
                  onBlur={(e) => onUpdate({ condition: e.target.value ? { expression: e.target.value } : null })}
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>Max retries</Label>
                  <Input
                    type="number"
                    defaultValue={node.retry_policy.max_retries}
                    onBlur={(e) => onUpdate({ retry_policy: { ...node.retry_policy, max_retries: Number(e.target.value) } })}
                  />
                </div>
                <div>
                  <Label>Timeout (s)</Label>
                  <Input
                    type="number"
                    defaultValue={node.timeout_seconds ?? ""}
                    onBlur={(e) => onUpdate({ timeout_seconds: e.target.value ? Number(e.target.value) : null })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>Backoff (s)</Label>
                  <Input
                    type="number"
                    defaultValue={node.retry_policy.backoff_seconds}
                    onBlur={(e) => onUpdate({ retry_policy: { ...node.retry_policy, backoff_seconds: Number(e.target.value) } })}
                  />
                </div>
                <div>
                  <Label>Backoff ×</Label>
                  <Input
                    type="number"
                    defaultValue={node.retry_policy.backoff_multiplier}
                    onBlur={(e) => onUpdate({ retry_policy: { ...node.retry_policy, backoff_multiplier: Number(e.target.value) } })}
                  />
                </div>
              </div>
              <div>
                <Label>Loop until (optional)</Label>
                <Input
                  defaultValue={node.loop?.until_condition ?? ""}
                  placeholder="e.g. quality_score >= 7"
                  onBlur={(e) =>
                    onUpdate({
                      loop: e.target.value ? { until_condition: e.target.value, max_iterations: node.loop?.max_iterations ?? 20 } : null,
                    })
                  }
                />
              </div>
            </div>
          </TabPanel>

          <TabPanel value="preview">
            {!lastExecutionRecord ? (
              <EmptyState icon={History} title="No runs yet" description="This node's most recent execution will preview here once the workflow has run." />
            ) : (
              <div className="flex flex-col gap-3 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-ink-muted dark:text-ink-muted-dark">
                    attempt {lastExecutionRecord.attempt} · iteration {lastExecutionRecord.iteration}
                  </span>
                  <NodeStateBadge state={lastExecutionRecord.state} />
                </div>
                {lastExecutionRecord.duration_ms !== null && (
                  <div className="tabular text-ink-muted dark:text-ink-muted-dark">Duration: {lastExecutionRecord.duration_ms.toFixed(1)} ms</div>
                )}
                {lastExecutionRecord.failure_reason && (
                  <div className="text-status-danger dark:text-status-danger-dark">{lastExecutionRecord.failure_reason}</div>
                )}
                {lastExecutionRecord.output_snapshot !== null && lastExecutionRecord.output_snapshot !== undefined && (
                  <div>
                    <div className="mb-1 text-ink-muted dark:text-ink-muted-dark">Output</div>
                    <pre className="tabular overflow-x-auto rounded bg-plane p-2 dark:bg-plane-dark">{JSON.stringify(lastExecutionRecord.output_snapshot, null, 2)}</pre>
                  </div>
                )}
              </div>
            )}
          </TabPanel>
        </div>
      </Tabs>

      <div className="border-t border-hairline p-3 dark:border-hairline-dark">
        <Button variant="danger" size="sm" onClick={onDelete} className="w-full">
          <Trash2 size={12} /> Delete node
        </Button>
      </div>
    </div>
  );
}
