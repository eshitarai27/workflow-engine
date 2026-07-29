import { Command } from "cmdk";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Activity,
  BarChart3,
  Blocks,
  Compass,
  LayoutGrid,
  ListTree,
  Moon,
  Plus,
  Settings,
  Sun,
  Workflow as WorkflowIcon,
} from "lucide-react";
import { api } from "../../lib/api";
import type { Workflow } from "../../lib/types";

interface CommandPaletteProps {
  theme: "light" | "dark";
  onToggleTheme: () => void;
  onCreateWorkflow: () => void;
}

export default function CommandPalette({ theme, onToggleTheme, onCreateWorkflow }: CommandPaletteProps) {
  const [open, setOpen] = useState(false);
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  useEffect(() => {
    if (open) api.listWorkflows().then(setWorkflows).catch(() => setWorkflows([]));
  }, [open]);

  const go = (path: string) => {
    navigate(path);
    setOpen(false);
  };

  return (
    <Command.Dialog
      open={open}
      onOpenChange={setOpen}
      label="Command palette"
      className="fixed left-1/2 top-[16%] z-[60] w-[92vw] max-w-lg -translate-x-1/2 overflow-hidden rounded-lg border border-hairline bg-surface-raised shadow-panel animate-scale-in dark:border-hairline-dark dark:bg-surface-raised-dark dark:shadow-panel-dark"
    >
      {open && <div className="fixed inset-0 -z-10 bg-black/40 backdrop-blur-[1px] dark:bg-black/60" onClick={() => setOpen(false)} />}
      <Command.Input
        placeholder="Search actions, workflows, pages…"
        className="w-full border-b border-hairline bg-transparent px-4 py-3 text-sm text-ink outline-none placeholder:text-ink-faint dark:border-hairline-dark dark:text-ink-dark dark:placeholder:text-ink-faint-dark"
      />
      <Command.List className="max-h-[360px] overflow-y-auto p-1.5">
        <Command.Empty className="px-3 py-6 text-center text-xs text-ink-faint dark:text-ink-faint-dark">
          No results found.
        </Command.Empty>

        <Command.Group heading="Actions" className="px-2 py-1 text-xs font-medium text-ink-faint dark:text-ink-faint-dark [&_[cmdk-group-items]]:mt-1">
          <Item onSelect={() => { onCreateWorkflow(); setOpen(false); }} icon={<Plus size={14} />}>
            Create new workflow
          </Item>
          <Item onSelect={() => { onToggleTheme(); setOpen(false); }} icon={theme === "dark" ? <Sun size={14} /> : <Moon size={14} />}>
            Switch to {theme === "dark" ? "light" : "dark"} theme
          </Item>
        </Command.Group>

        <Command.Group heading="Go to" className="px-2 py-1 text-xs font-medium text-ink-faint dark:text-ink-faint-dark [&_[cmdk-group-items]]:mt-1">
          <Item onSelect={() => go("/")} icon={<Compass size={14} />}>Project Overview</Item>
          <Item onSelect={() => go("/dashboard")} icon={<LayoutGrid size={14} />}>Dashboard</Item>
          <Item onSelect={() => go("/workflows")} icon={<WorkflowIcon size={14} />}>Workflows</Item>
          <Item onSelect={() => go("/executions")} icon={<ListTree size={14} />}>Executions</Item>
          <Item onSelect={() => go("/metrics")} icon={<BarChart3 size={14} />}>Insights</Item>
          <Item onSelect={() => go("/plugins")} icon={<Blocks size={14} />}>Plugins</Item>
          <Item onSelect={() => go("/events")} icon={<Activity size={14} />}>Activity</Item>
          <Item onSelect={() => go("/settings")} icon={<Settings size={14} />}>Settings</Item>
        </Command.Group>

        {workflows.length > 0 && (
          <Command.Group heading="Workflows" className="px-2 py-1 text-xs font-medium text-ink-faint dark:text-ink-faint-dark [&_[cmdk-group-items]]:mt-1">
            {workflows.slice(0, 8).map((wf) => (
              <Item key={wf.id} onSelect={() => go(`/workflows/${wf.id}`)} icon={<WorkflowIcon size={14} />}>
                {wf.name}
              </Item>
            ))}
          </Command.Group>
        )}
      </Command.List>
    </Command.Dialog>
  );
}

function Item({ children, onSelect, icon }: { children: React.ReactNode; onSelect: () => void; icon?: React.ReactNode }) {
  return (
    <Command.Item
      onSelect={onSelect}
      className="flex cursor-pointer items-center gap-2 rounded-md px-2.5 py-2 text-sm text-ink data-[selected=true]:bg-plane dark:text-ink-dark dark:data-[selected=true]:bg-plane-dark"
    >
      <span className="text-ink-faint dark:text-ink-faint-dark">{icon}</span>
      {children}
    </Command.Item>
  );
}
