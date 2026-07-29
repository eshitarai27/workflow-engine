import { NavLink } from "react-router-dom";
import {
  Activity,
  BarChart3,
  Blocks,
  ChevronsLeft,
  ChevronsRight,
  Compass,
  LayoutGrid,
  ListTree,
  Moon,
  Plus,
  Settings,
  Sun,
  Workflow as WorkflowIcon,
} from "lucide-react";
import { cn } from "../lib/cn";
import Tooltip from "./ui/Tooltip";
import { useNewWorkflowDialog } from "../lib/newWorkflowContext";

const HOME_ITEM = { to: "/", label: "Project Overview", icon: Compass, end: true };

const NAV_ITEMS: { to: string; label: string; icon: typeof LayoutGrid; end?: boolean }[] = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutGrid },
  { to: "/workflows", label: "Workflows", icon: WorkflowIcon },
  { to: "/executions", label: "Executions", icon: ListTree },
  { to: "/metrics", label: "Insights", icon: BarChart3 },
  { to: "/plugins", label: "Plugins", icon: Blocks },
  { to: "/events", label: "Activity", icon: Activity },
];

interface SidebarProps {
  collapsed: boolean;
  onToggleCollapsed: () => void;
  theme: "light" | "dark";
  onToggleTheme: () => void;
  apiOnline: boolean | null;
}

export default function Sidebar({ collapsed, onToggleCollapsed, theme, onToggleTheme, apiOnline }: SidebarProps) {
  const openNewWorkflow = useNewWorkflowDialog();

  return (
    <aside
      className={cn(
        "flex h-screen shrink-0 flex-col border-r border-hairline bg-surface transition-[width] duration-150 dark:border-hairline-dark dark:bg-surface-dark",
        collapsed ? "w-14" : "w-[212px]"
      )}
    >
      <div className={cn("flex h-12 items-center gap-2 border-b border-hairline px-3 dark:border-hairline-dark", collapsed && "justify-center px-0")}>
        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-accent text-white dark:bg-accent-dark dark:text-[#1a1206]">
          <WorkflowIcon size={14} strokeWidth={2.25} />
        </div>
        {!collapsed && <span className="text-sm font-semibold tracking-tight text-ink dark:text-ink-dark">FlowForge</span>}
      </div>

      <div className={cn("px-2 pt-3", collapsed && "px-1.5")}>
        <Tooltip content={collapsed ? "New workflow" : ""} side="right">
          <button
            onClick={openNewWorkflow}
            className={cn(
              "flex w-full items-center gap-2 rounded-md bg-accent px-2.5 py-1.5 text-sm font-medium text-white transition-colors hover:bg-accent/90 dark:bg-accent-dark dark:text-[#1a1206] dark:hover:bg-accent-dark/90",
              collapsed && "justify-center px-0 py-2"
            )}
          >
            <Plus size={15} />
            {!collapsed && "New workflow"}
          </button>
        </Tooltip>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 py-3">
        <ul className="flex flex-col gap-0.5">
          <li>
            <Tooltip content={collapsed ? HOME_ITEM.label : ""} side="right">
              <NavLink
                to={HOME_ITEM.to}
                end={HOME_ITEM.end}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm transition-colors",
                    collapsed && "justify-center px-0 py-2",
                    isActive
                      ? "bg-accent-muted font-medium text-accent dark:bg-accent-muted-dark dark:text-accent-dark"
                      : "text-ink-muted hover:bg-plane hover:text-ink dark:text-ink-muted-dark dark:hover:bg-plane-dark dark:hover:text-ink-dark"
                  )
                }
              >
                <HOME_ITEM.icon size={16} strokeWidth={1.9} />
                {!collapsed && HOME_ITEM.label}
              </NavLink>
            </Tooltip>
          </li>
        </ul>

        {!collapsed && <div className="mb-1 mt-4 px-2.5 text-[11px] font-medium uppercase tracking-wide text-ink-faint dark:text-ink-faint-dark">Operate</div>}
        {collapsed && <div className="my-3 h-px bg-hairline dark:bg-hairline-dark" />}

        <ul className="flex flex-col gap-0.5">
          {NAV_ITEMS.map((item) => (
            <li key={item.to}>
              <Tooltip content={collapsed ? item.label : ""} side="right">
                <NavLink
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm transition-colors",
                      collapsed && "justify-center px-0 py-2",
                      isActive
                        ? "bg-accent-muted font-medium text-accent dark:bg-accent-muted-dark dark:text-accent-dark"
                        : "text-ink-muted hover:bg-plane hover:text-ink dark:text-ink-muted-dark dark:hover:bg-plane-dark dark:hover:text-ink-dark"
                    )
                  }
                >
                  <item.icon size={16} strokeWidth={1.9} />
                  {!collapsed && item.label}
                </NavLink>
              </Tooltip>
            </li>
          ))}
        </ul>
      </nav>

      <div className="border-t border-hairline px-2 py-2 dark:border-hairline-dark">
        <Tooltip content={collapsed ? "Settings" : ""} side="right">
          <NavLink
            to="/settings"
            className={({ isActive }) =>
              cn(
                "flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm transition-colors",
                collapsed && "justify-center px-0 py-2",
                isActive
                  ? "bg-accent-muted font-medium text-accent dark:bg-accent-muted-dark dark:text-accent-dark"
                  : "text-ink-muted hover:bg-plane hover:text-ink dark:text-ink-muted-dark dark:hover:bg-plane-dark dark:hover:text-ink-dark"
              )
            }
          >
            <Settings size={16} strokeWidth={1.9} />
            {!collapsed && "Settings"}
          </NavLink>
        </Tooltip>

        <div className={cn("mt-2 flex items-center gap-1 px-1", collapsed && "flex-col")}>
          <Tooltip content={apiOnline === null ? "Checking API…" : apiOnline ? "API online" : "API unreachable"} side="right">
            <span
              className={cn(
                "h-1.5 w-1.5 shrink-0 rounded-full",
                apiOnline === null ? "bg-ink-faint dark:bg-ink-faint-dark" : apiOnline ? "bg-status-success dark:bg-status-success-dark" : "bg-status-danger dark:bg-status-danger-dark"
              )}
            />
          </Tooltip>
          {!collapsed && (
            <span className="flex-1 truncate text-xs text-ink-faint dark:text-ink-faint-dark">
              {apiOnline === null ? "Checking…" : apiOnline ? "API online" : "API unreachable"}
            </span>
          )}
          <Tooltip content={`${theme === "dark" ? "Light" : "Dark"} theme`} side="right">
            <button
              onClick={onToggleTheme}
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-ink-faint transition-colors hover:bg-plane hover:text-ink dark:text-ink-faint-dark dark:hover:bg-plane-dark dark:hover:text-ink-dark"
            >
              {theme === "dark" ? <Sun size={14} /> : <Moon size={14} />}
            </button>
          </Tooltip>
          <Tooltip content={collapsed ? "Expand" : "Collapse"} side="right">
            <button
              onClick={onToggleCollapsed}
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-ink-faint transition-colors hover:bg-plane hover:text-ink dark:text-ink-faint-dark dark:hover:bg-plane-dark dark:hover:text-ink-dark"
            >
              {collapsed ? <ChevronsRight size={14} /> : <ChevronsLeft size={14} />}
            </button>
          </Tooltip>
        </div>
      </div>
    </aside>
  );
}
