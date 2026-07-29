import { useMemo, useState } from "react";
import { Blocks, Search } from "lucide-react";
import type { PluginMetadata } from "../../lib/types";
import { colorForCategory } from "../../lib/colors";
import { Input } from "../ui/Input";
import EmptyState from "../ui/EmptyState";

export default function NodePalette({ plugins, onAdd }: { plugins: PluginMetadata[]; onAdd: (pluginId: string) => void }) {
  const [query, setQuery] = useState("");

  const grouped = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = q ? plugins.filter((p) => p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q)) : plugins;
    const groups = new Map<string, PluginMetadata[]>();
    for (const p of filtered) {
      const list = groups.get(p.category) ?? [];
      list.push(p);
      groups.set(p.category, list);
    }
    return Array.from(groups.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [plugins, query]);

  return (
    <div className="flex h-full w-56 shrink-0 flex-col border-r border-hairline dark:border-hairline-dark">
      <div className="border-b border-hairline p-2.5 dark:border-hairline-dark">
        <div className="relative">
          <Search size={13} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-faint dark:text-ink-faint-dark" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search nodes…" className="pl-7 text-xs" />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-2">
        {grouped.length === 0 ? (
          <EmptyState icon={Blocks} title="No matching nodes" />
        ) : (
          grouped.map(([category, items]) => (
            <div key={category} className="mb-3">
              <div className="mb-1 px-1.5 text-[11px] font-medium uppercase tracking-wide text-ink-faint dark:text-ink-faint-dark">{category}</div>
              <div className="flex flex-col gap-1">
                {items.map((p) => {
                  const color = colorForCategory(p.category);
                  return (
                    <div
                      key={p.id}
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData("application/flowforge-plugin", p.id);
                        e.dataTransfer.effectAllowed = "move";
                      }}
                      onClick={() => onAdd(p.id)}
                      title={p.description}
                      className="flex cursor-grab items-center gap-2 rounded-md px-2 py-1.5 text-xs text-ink transition-colors hover:bg-plane active:cursor-grabbing dark:text-ink-dark dark:hover:bg-plane-dark"
                    >
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded" style={{ backgroundColor: `${color}1f` }}>
                        <Blocks size={11} style={{ color }} />
                      </span>
                      <span className="truncate">{p.name}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>
      <div className="border-t border-hairline px-3 py-2 text-[11px] text-ink-faint dark:border-hairline-dark dark:text-ink-faint-dark">
        Drag a node onto the canvas, or click to add.
      </div>
    </div>
  );
}
