import { NavLink, Outlet } from "react-router-dom";
import { useEffect, useState } from "react";
import { api } from "../lib/api";

const NAV_ITEMS = [
  { to: "/", label: "Dashboard" },
  { to: "/workflows", label: "Workflows" },
  { to: "/builder", label: "Builder" },
  { to: "/metrics", label: "Metrics" },
  { to: "/plugins", label: "Plugins" },
  { to: "/events", label: "Events" },
];

function Mark() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect width="24" height="24" rx="6" fill="#e8722c" />
      <path d="M6 12h5l-1.5 5L18 10h-5l1.5-5L6 12z" fill="#15130f" />
    </svg>
  );
}

function ThemeToggle() {
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    if (typeof window === "undefined") return "dark";
    const stored = window.localStorage.getItem("theme");
    if (stored === "light" || stored === "dark") return stored;
    // FlowForge defaults to dark, the way most operator-facing consoles
    // (Temporal, Airflow, Grafana) do, unless the OS says otherwise.
    return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
  });

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    window.localStorage.setItem("theme", theme);
  }, [theme]);

  return (
    <button
      onClick={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
      className="rounded border border-hairline dark:border-hairline-dark px-2.5 py-1 text-xs text-ink-muted dark:text-ink-muted-dark hover:text-ink dark:hover:text-ink-dark hover:border-baseline dark:hover:border-baseline-dark transition-colors"
      aria-label="Toggle theme"
    >
      {theme === "dark" ? "☀ Light" : "☾ Dark"}
    </button>
  );
}

function ServerStatus() {
  const [online, setOnline] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    const check = () => {
      api
        .listPlugins()
        .then(() => !cancelled && setOnline(true))
        .catch(() => !cancelled && setOnline(false));
    };
    check();
    const interval = setInterval(check, 10000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="flex items-center gap-1.5 text-xs text-ink-muted dark:text-ink-muted-dark">
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          online === null ? "bg-ink-faint" : online ? "bg-status-good" : "bg-status-critical"
        }`}
      />
      {online === null ? "checking" : online ? "API online" : "API unreachable"}
    </div>
  );
}

export default function Layout() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-hairline dark:border-hairline-dark bg-surface dark:bg-surface-dark">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-6 px-8 py-3">
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-2">
              <Mark />
              <span className="text-sm font-semibold tracking-tight">FlowForge</span>
            </div>
            <nav className="flex items-center gap-5">
              {NAV_ITEMS.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === "/"}
                  className={({ isActive }) =>
                    `border-b-2 py-1 text-sm transition-colors ${
                      isActive
                        ? "border-forge-1 text-ink dark:text-ink-dark font-medium"
                        : "border-transparent text-ink-muted dark:text-ink-muted-dark hover:text-ink dark:hover:text-ink-dark"
                    }`
                  }
                >
                  {item.label}
                </NavLink>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <ServerStatus />
            <ThemeToggle />
          </div>
        </div>
      </header>
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-6xl px-8 py-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
