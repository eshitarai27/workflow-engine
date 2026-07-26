import { useEffect, useState } from "react";
import { api } from "../lib/api";
import type { PluginMetadata } from "../lib/types";
import { colorForCategory } from "../lib/colors";

export default function Plugins() {
  const [plugins, setPlugins] = useState<PluginMetadata[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .listPlugins()
      .then(setPlugins)
      .catch(() => setError("Could not reach the FlowForge API."));
  }, []);

  if (error) {
    return (
      <div className="rounded-md border border-status-critical/30 bg-status-critical/10 px-4 py-3 text-sm text-status-critical">
        {error}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Plugins</h1>
        <p className="mt-1 text-sm text-ink-muted dark:text-ink-muted-dark">
          Every action a node can take. Adding a new one is a new plugin file, not an engine change.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {plugins.map((plugin) => {
          const color = colorForCategory(plugin.category);
          return (
            <div key={plugin.id} className="rounded-lg border border-hairline dark:border-hairline-dark bg-surface dark:bg-surface-dark p-5">
              <div className="flex items-center justify-between">
                <div className="font-medium">{plugin.name}</div>
                <span
                  className="rounded-full px-2 py-0.5 text-xs font-medium"
                  style={{ color, backgroundColor: `${color}1a` }}
                >
                  {plugin.category}
                </span>
              </div>
              <p className="mt-1 text-xs text-ink-muted dark:text-ink-muted-dark">{plugin.description}</p>
              <div className="mt-3 flex flex-col gap-1">
                {plugin.config_schema.map((field) => (
                  <div key={field.name} className="flex items-center justify-between text-xs">
                    <span className="tabular">
                      {field.name}
                      {field.required && <span className="text-status-critical">*</span>}
                    </span>
                    <span className="text-ink-faint">{field.type}</span>
                  </div>
                ))}
                {plugin.config_schema.length === 0 && (
                  <span className="text-xs text-ink-faint">No configuration required</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
