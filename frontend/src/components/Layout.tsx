import { Outlet, useLocation } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { ChevronRight, Search } from "lucide-react";
import Sidebar from "./Sidebar";
import CommandPalette from "./ui/CommandPalette";
import { TooltipProvider } from "./ui/Tooltip";
import Toaster from "./ui/Toaster";
import NewWorkflowDialog from "./NewWorkflowDialog";
import { NewWorkflowDialogContext } from "../lib/newWorkflowContext";
import { api } from "../lib/api";

const SEGMENT_LABELS: Record<string, string> = {
  dashboard: "Dashboard",
  workflows: "Workflows",
  builder: "Builder",
  executions: "Executions",
  metrics: "Insights",
  plugins: "Plugins",
  events: "Activity",
  settings: "Settings",
  simulate: "Simulate",
};

function isCanvasRoute(pathname: string) {
  return pathname.startsWith("/builder") || /^\/executions\/[^/]+$/.test(pathname);
}

function useBreadcrumb() {
  const { pathname } = useLocation();
  return useMemo(() => {
    if (pathname === "/") return ["Project Overview"];
    const segments = pathname.split("/").filter(Boolean);
    return segments.map((seg) => SEGMENT_LABELS[seg] ?? (seg.length > 16 ? `${seg.slice(0, 14)}…` : seg));
  }, [pathname]);
}

function useTheme() {
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    if (typeof window === "undefined") return "dark";
    const stored = window.localStorage.getItem("theme");
    if (stored === "light" || stored === "dark") return stored;
    return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
  });
  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    window.localStorage.setItem("theme", theme);
  }, [theme]);
  return [theme, () => setTheme((t) => (t === "dark" ? "light" : "dark"))] as const;
}

export default function Layout() {
  const [theme, toggleTheme] = useTheme();
  const [collapsed, setCollapsed] = useState(() => window.localStorage.getItem("sidebar-collapsed") === "1");
  const [apiOnline, setApiOnline] = useState<boolean | null>(null);
  const [newWorkflowOpen, setNewWorkflowOpen] = useState(false);
  const breadcrumb = useBreadcrumb();
  const { pathname } = useLocation();
  const fullBleed = isCanvasRoute(pathname);

  useEffect(() => {
    window.localStorage.setItem("sidebar-collapsed", collapsed ? "1" : "0");
  }, [collapsed]);

  useEffect(() => {
    let cancelled = false;
    const check = () => {
      api
        .health()
        .then(() => !cancelled && setApiOnline(true))
        .catch(() => !cancelled && setApiOnline(false));
    };
    check();
    const interval = setInterval(check, 10000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  return (
    <NewWorkflowDialogContext.Provider value={() => setNewWorkflowOpen(true)}>
      <TooltipProvider>
        <div className="flex h-screen overflow-hidden bg-plane dark:bg-plane-dark">
          <Sidebar
            collapsed={collapsed}
            onToggleCollapsed={() => setCollapsed((c) => !c)}
            theme={theme}
            onToggleTheme={toggleTheme}
            apiOnline={apiOnline}
          />
          <div className="flex min-w-0 flex-1 flex-col">
            <header className="flex h-12 shrink-0 items-center justify-between gap-4 border-b border-hairline px-5 dark:border-hairline-dark">
              <div className="flex items-center gap-1.5 text-sm text-ink-muted dark:text-ink-muted-dark">
                {breadcrumb.map((crumb, i) => (
                  <span key={i} className="flex items-center gap-1.5">
                    {i > 0 && <ChevronRight size={13} className="text-ink-faint dark:text-ink-faint-dark" />}
                    <span className={i === breadcrumb.length - 1 ? "font-medium text-ink dark:text-ink-dark" : ""}>{crumb}</span>
                  </span>
                ))}
              </div>
              <button
                onClick={() => window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true }))}
                className="flex items-center gap-2 rounded-md border border-hairline bg-plane px-2.5 py-1 text-xs text-ink-faint transition-colors hover:border-baseline hover:text-ink-muted dark:border-hairline-dark dark:bg-plane-dark dark:text-ink-faint-dark dark:hover:border-baseline-dark dark:hover:text-ink-muted-dark"
              >
                <Search size={13} />
                Search
                <kbd>⌘K</kbd>
              </button>
            </header>
            <main className={fullBleed ? "flex-1 overflow-hidden" : "flex-1 overflow-y-auto"}>
              <div className={fullBleed ? "h-full" : "mx-auto max-w-[1200px] px-6 py-6"}>
                <Outlet />
              </div>
            </main>
          </div>
        </div>

        <CommandPalette theme={theme} onToggleTheme={toggleTheme} onCreateWorkflow={() => setNewWorkflowOpen(true)} />
        <NewWorkflowDialog open={newWorkflowOpen} onOpenChange={setNewWorkflowOpen} />
        <Toaster />
      </TooltipProvider>
    </NewWorkflowDialogContext.Provider>
  );
}
