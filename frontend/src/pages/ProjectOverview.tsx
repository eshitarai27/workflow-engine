import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Blocks,
  Boxes,
  Code2,
  Cpu,
  Database,
  GitFork,
  Globe,
  Layers,
  Map,
  Puzzle,
  Radar,
  ShieldAlert,
  Sparkles,
  SquareStack,
  Workflow as WorkflowIcon,
  Wrench,
} from "lucide-react";
import Reveal from "../components/overview/Reveal";
import ExecutionLifecycleDiagram from "../components/overview/ExecutionLifecycleDiagram";
import ModuleInteractions from "../components/overview/ModuleInteractions";
import CodeExcerpt from "../components/overview/CodeExcerpt";
import Disclosure from "../components/ui/Disclosure";
import { Panel } from "../components/ui/Panel";

const REPO_URL = "https://github.com/eshitarai27/workflow-engine";
const LIVE_API = "https://flowforge-backend-production-ad69.up.railway.app";
const LIVE_DASHBOARD_NOTE = "/dashboard";

const TOC = [
  { id: "why", label: "Why it exists" },
  { id: "lifecycle", label: "Workflow lifecycle" },
  { id: "architecture", label: "Architecture" },
  { id: "frontend", label: "Frontend" },
  { id: "model", label: "Execution model" },
  { id: "interactions", label: "Module interactions" },
  { id: "stack", label: "Tech & rationale" },
  { id: "tradeoffs", label: "Decisions & trade-offs" },
  { id: "challenges", label: "Challenges" },
  { id: "limits", label: "Limitations & roadmap" },
];

function Kicker({ icon: Icon, children }: { icon: typeof Sparkles; children: ReactNode }) {
  return (
    <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-wide text-accent dark:text-accent-dark">
      <Icon size={13} strokeWidth={2} />
      {children}
    </div>
  );
}

function Section({
  id,
  icon,
  kicker,
  title,
  description,
  children,
}: {
  id: string;
  icon: typeof Sparkles;
  kicker: string;
  title: string;
  description?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-8 border-t border-hairline pt-10 dark:border-hairline-dark">
      <Reveal>
        <Kicker icon={icon}>{kicker}</Kicker>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight text-ink dark:text-ink-dark">{title}</h2>
        {description && <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-muted dark:text-ink-muted-dark">{description}</p>}
      </Reveal>
      <Reveal delayMs={80} className="mt-6">
        {children}
      </Reveal>
    </section>
  );
}

const MODULES: { name: string; path: string; summary: string; facts: string[] }[] = [
  {
    name: "Validator",
    path: "compiler/validator.py",
    summary: "Structural validation of a raw definition, before it's even turned into a Workflow object.",
    facts: [
      "Kept separate from cycle detection on purpose: this layer catches authoring mistakes (missing fields, dangling edges, duplicate ids) that are independent of graph shape.",
      "Returns every problem it finds, not just the first — WorkflowValidationError carries the full list back to the API caller.",
    ],
  },
  {
    name: "Compiler & IR",
    path: "compiler/compiler.py, ir.py",
    summary: "Turns a validated definition into IRGraph, then rejects it if it isn't acyclic.",
    facts: [
      "IRGraph is a plain dependency graph decoupled from the JSON wire format — the planner and engine both consume it, never the raw definition.",
      "Cycle detection is a three-color DFS (white/gray/black) that returns the actual node ids forming the cycle, not just \"there is a cycle somewhere.\"",
      "Also flags isolated nodes — no dependencies and no dependents — as a warning, since that's almost always a forgotten edge rather than intentional design.",
    ],
  },
  {
    name: "Planner",
    path: "planner/planner.py",
    summary: "Turns an IR graph into layers of nodes that can run in parallel, plus critical-path analysis.",
    facts: [
      "Kahn's algorithm grouped by level rather than flattened, so the engine can dispatch an entire layer concurrently instead of one node at a time.",
      "Planning is pure and deterministic — same graph in, same plan out — which is exactly what makes \"simulate this workflow\" possible without ever running a node's action.",
      "critical_path() finds the longest path by estimated duration: the real floor on how fast a workflow can finish, and the nodes that gate that time.",
    ],
  },
  {
    name: "Engine",
    path: "engine/engine.py",
    summary: "Dispatches one layer at a time to the worker pool and checkpoints between layers.",
    facts: [
      "Cooperative pause/cancel: a threading.Event is checked between layers, so a pause takes effect at a clean layer boundary rather than killing work mid-flight.",
      "Resume replays from the last checkpoint's completed_layers count — finished layers are never re-run.",
    ],
  },
  {
    name: "Executor",
    path: "executor/executor.py",
    summary: "Runs a single node to completion: retries, timeout, and bounded looping.",
    facts: [
      "Deliberately separate from the engine — the engine decides which nodes are ready; this module only knows how to run one node correctly once told to.",
      "A loop node re-evaluates its until_condition after every iteration and stops at max_iterations regardless — the graph itself never needs a cycle to express iteration.",
      "Every attempt produces its own NodeExecutionRecord with a reason, a worker id, and an input/output snapshot, whether it succeeded, failed, or was cancelled.",
    ],
  },
  {
    name: "Worker pool",
    path: "workers/worker_pool.py",
    summary: "A thin wrapper around ThreadPoolExecutor, not a bespoke scheduler.",
    facts: [
      "Node actions are I/O-bound (HTTP calls, subprocesses, file access) far more often than CPU-bound, so a thread pool is the right tool for the job.",
      "Wrapping it keeps \"which worker ran this node\" visible to the execution history via a thread-local, without leaking thread-pool internals into the engine.",
    ],
  },
  {
    name: "Plugin registry",
    path: "plugins/registry.py",
    summary: "Holds every available plugin instance, keyed by id.",
    facts: [
      "10 built-ins ship by default — http, webhook, python, sql, javascript, filesystem, email, slack, openai, docker — each with its own config_schema.",
      "Registering a plugin publishes a PluginLoaded event, so \"what can this deployment actually do\" is itself observable at startup.",
    ],
  },
  {
    name: "Event bus",
    path: "events/event_bus.py",
    summary: "A minimal, thread-safe, synchronous pub/sub bus with a bounded history.",
    facts: [
      "Every lifecycle transition — a node starting, a retry, a checkpoint, a workflow finishing — publishes here; subscribers never need to know engine internals.",
      "A subscriber that raises is caught and logged, never allowed to break publishing for every other subscriber.",
      "Backed by a deque(maxlen=2000) — the Activity feed's history is bounded in memory, not persisted.",
    ],
  },
  {
    name: "Checkpoint store",
    path: "engine/checkpoint.py",
    summary: "Persists enough state after each completed layer to resume a run without redoing finished work.",
    facts: [
      "One JSON file per execution id — node states and context are enough to resume from the last completed layer, nothing more.",
      "Checkpoint granularity is per-layer, not per-node: the trade-off section below covers what that costs.",
    ],
  },
  {
    name: "Scheduler",
    path: "scheduler/scheduler.py",
    summary: "Fires SCHEDULE triggers and drains an execution queue on two background threads.",
    facts: [
      "One thread polls every workflow's triggers for a due interval; a second drains the resulting queue and starts executions — deliberately decoupled from ExecutionService.",
      "\"What starts an execution\" (API call, schedule, webhook) stays independent from \"how an execution runs.\"",
    ],
  },
  {
    name: "Storage",
    path: "storage/workflow_repository.py, database.py",
    summary: "SQLite-backed persistence with full version history.",
    facts: [
      "Saving a workflow always inserts a new version row and demotes the previous is_latest flag — nothing is ever overwritten in place.",
      "compare_versions() diffs two versions structurally (nodes added/removed/changed, edges added/removed) by comparing a per-node JSON signature, not a text diff.",
    ],
  },
];

const STACK: { title: string; icon: typeof Cpu; body: string }[] = [
  {
    title: "Compiler, planner, and engine kept strictly separate",
    icon: SquareStack,
    body: "Validation, IR/cycle-detection, layering, and execution are four different modules with one job each. That split is what lets a workflow be validated and simulated — critical path, bottlenecks, execution order — without a single node's action ever running.",
  },
  {
    title: "Bounded loops instead of graph cycles",
    icon: WorkflowIcon,
    body: "An iterative workflow (review → refine → re-check) stays a DAG: one node loops internally against an until_condition and a max_iterations cap, so the planner's topological-layer model never has to reason about cycles at all.",
  },
  {
    title: "A restricted AST walker for conditions, not eval()",
    icon: ShieldAlert,
    body: "Condition and loop expressions come from user-authored JSON. safe_eval.py parses them with Python's ast module and allow-lists only comparisons, boolean logic, arithmetic, and variable lookups — calls, attribute access, and imports are rejected outright.",
  },
  {
    title: "Plugin architecture over hardcoded actions",
    icon: Blocks,
    body: "Every action a node can take — HTTP, SQL, a Python function, a Slack message — implements one Plugin interface with its own config_schema. Adding a new capability is a new plugin file, never an engine change.",
  },
  {
    title: "SQLite for versioned, queryable persistence",
    icon: Database,
    body: "Workflow and execution history need to be queried and diffed, not just streamed — a real (if lightweight) database fits that better than files or an in-memory store, while staying zero-configuration to run locally.",
  },
  {
    title: "React Flow for both the builder and the live graph",
    icon: GitFork,
    body: "The same node/edge shape backs three different views — the builder canvas, the live execution graph, and this page's module diagrams — so a workflow's visual layout (saved in metadata.positions) is reused everywhere it's drawn.",
  },
];

const TRADEOFFS: { title: string; body: string }[] = [
  {
    title: "Checkpoints are per-layer, not per-node",
    body: "The engine checkpoints after every completed layer, not after every node. The trade-off: if the process dies mid-layer, the whole layer re-runs on resume, even nodes that had already finished. Simpler and correct for idempotent plugins; not free for ones that aren't.",
  },
  {
    title: "A soft timeout, not a hard kill",
    body: "node.timeout_seconds bounds a node from the caller's point of view via a future's result(timeout=...), but CPython can't safely force-kill a running thread. A plugin that ignores its input and blocks forever still occupies a background thread after the timeout raises — the same limitation nearly every pure-Python task runner has.",
  },
  {
    title: "Event history is in-memory and bounded",
    body: "EventBus keeps the last 2000 events in a deque — enough for a live Activity feed, not enough to be an audit log. Restart the process and the history is gone; there's no persistence layer for events (executions themselves are persisted separately, in SQLite).",
  },
  {
    title: "Templating is deliberately not a full expression language",
    body: "render_config only does {{name}} substitution — no loops, no conditionals, no arithmetic. A config value that's entirely one placeholder resolves to the referenced value's real type (a number stays a number); anything more expressive belongs in a condition or loop expression via safe_eval instead, which is a much narrower, auditable surface.",
  },
  {
    title: "Thread-per-node over an async event loop",
    body: "Nodes run on a bounded ThreadPoolExecutor rather than as async tasks. Most plugin work (HTTP calls, subprocesses, file I/O) is I/O-bound, so this is the simplest model that's still genuinely concurrent — at the cost of an OS thread per in-flight node rather than a lighter-weight coroutine.",
  },
];

const CHALLENGES: { title: string; body: string }[] = [
  {
    title: "Making simulation possible without executing anything",
    body: "Getting an accurate execution order, critical path, and bottleneck estimate out of a workflow required keeping WorkflowPlanner completely free of side effects and wall-clock time — every planning method takes a graph and returns an answer, nothing else.",
  },
  {
    title: "Every plugin needing its own explainable failure mode",
    body: "PluginConfigError, PluginExecutionError, and NodeTimeoutError are caught in one place in NodeExecutor, so a failing HTTP call and a failing Python function both produce the same shape of NodeExecutionRecord — a reason a user can actually read, not a raw traceback.",
  },
  {
    title: "Preserving real types through config templating",
    body: "{\"count\": \"{{n}}\"} needs to stay a number, not become the string \"3\". render_config special-cases a string that is entirely one placeholder so it resolves to the referenced value's real type, and only falls back to string interpolation when a placeholder is embedded in surrounding text.",
  },
  {
    title: "Redesigning the dashboard so a run feels alive",
    body: "The original builder made users hand-edit a plugin's config as raw JSON, and a live execution was a static graph you had to refresh. The current dashboard drives the builder's inspector from each plugin's own config_schema, and animates node state and edge flow directly off execution.node_states — no backend change required for either.",
  },
];

export default function ProjectOverview() {
  return (
    <div className="flex flex-col gap-14 pb-16">
      <Reveal>
        <div className="flex flex-col gap-6 pt-2">
          <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-wide text-ink-faint dark:text-ink-faint-dark">
            <Sparkles size={13} strokeWidth={2} className="text-accent dark:text-accent-dark" />
            Project overview
          </div>
          <div>
            <h1 className="text-4xl font-semibold tracking-tight text-ink sm:text-5xl dark:text-ink-dark">
              A workflow engine, built to show its own reasoning.
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-ink-muted dark:text-ink-muted-dark">
              FlowForge is a DAG-based workflow orchestration platform — a real compiler, planner, and execution
              engine with retries, checkpoints, and concurrency, paired with a dashboard that explains exactly why
              every node ran, waited, or failed. Nothing on a trace is guessed after the fact: every stage is
              recorded as it actually executes.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {["real concurrency", "compiler + planner, kept pure", "10 plugins", "AI-assisted, not AI-dependent"].map((b) => (
              <span key={b} className="rounded-full border border-hairline px-2.5 py-1 font-mono text-[11px] text-ink-muted dark:border-hairline-dark dark:text-ink-muted-dark">
                {b}
              </span>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-3 pt-1">
            <Link to={LIVE_DASHBOARD_NOTE} className="flex items-center gap-1.5 rounded-md bg-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90 dark:bg-accent-dark dark:text-[#1a1206]">
              Open the live dashboard
              <ArrowRight size={14} strokeWidth={2} />
            </Link>
            <a
              href={REPO_URL}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 rounded-md border border-hairline px-4 py-2 text-sm text-ink-muted hover:border-baseline hover:text-ink dark:border-hairline-dark dark:text-ink-muted-dark dark:hover:border-baseline-dark dark:hover:text-ink-dark"
            >
              <Code2 size={14} strokeWidth={1.75} />
              View source
            </a>
            <a
              href={LIVE_API}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 rounded-md border border-hairline px-4 py-2 text-sm text-ink-muted hover:border-baseline hover:text-ink dark:border-hairline-dark dark:text-ink-muted-dark dark:hover:border-baseline-dark dark:hover:text-ink-dark"
            >
              <Globe size={14} strokeWidth={1.75} />
              Live API
            </a>
          </div>
        </div>
      </Reveal>

      <Reveal delayMs={100}>
        <Panel className="flex flex-wrap gap-x-5 gap-y-2 px-5 py-3 text-xs text-ink-muted dark:text-ink-muted-dark">
          {TOC.map((item) => (
            <a key={item.id} href={`#${item.id}`} className="hover:text-accent hover:underline dark:hover:text-accent-dark">
              {item.label}
            </a>
          ))}
        </Panel>
      </Reveal>

      <Section id="why" icon={Puzzle} kicker="The problem" title="Explainable by construction, not by logging more">
        <div className="grid gap-4 sm:grid-cols-3">
          <Panel className="p-5">
            <div className="text-sm font-medium text-ink dark:text-ink-dark">What it is</div>
            <p className="mt-2 text-sm leading-relaxed text-ink-muted dark:text-ink-muted-dark">
              A DAG execution engine with a real compiler and planner in front of it, a plugin system instead of
              hardcoded actions, and a dashboard built to show exactly what a run did — in the spirit of Temporal,
              Prefect, Airflow, or n8n, kept small enough to read end to end.
            </p>
          </Panel>
          <Panel className="p-5">
            <div className="text-sm font-medium text-ink dark:text-ink-dark">Why it was built</div>
            <p className="mt-2 text-sm leading-relaxed text-ink-muted dark:text-ink-muted-dark">
              Started as a small assignment — a graph engine with a handful of nodes — and was rebuilt into
              something honest about the hard parts: real concurrency, real retries, a real SQL write, all covered
              by tests that exercise actual behavior, not mocks standing in for it.
            </p>
          </Panel>
          <Panel className="p-5">
            <div className="text-sm font-medium text-ink dark:text-ink-dark">What you get back</div>
            <p className="mt-2 text-sm leading-relaxed text-ink-muted dark:text-ink-muted-dark">
              Every node's execution recorded with why it ran, why it waited, its timing, and its inputs and
              outputs — plus a Simulation mode that reports execution order, critical path, and likely bottlenecks
              without running a single node's action.
            </p>
          </Panel>
        </div>
      </Section>

      <Section
        id="lifecycle"
        icon={Radar}
        kicker="From definition to dashboard"
        title="The workflow lifecycle"
        description="A workflow is data, not code. Each stage below is a real module with one job, run in this exact order for every execution — the same sequence the live Execution view renders while a run is in progress."
      >
        <Panel className="p-5 sm:p-6">
          <ExecutionLifecycleDiagram />
        </Panel>
      </Section>

      <Section
        id="architecture"
        icon={SquareStack}
        kicker="System design"
        title="Backend architecture, module by module"
        description="Every box in the pipeline is a real module with a single job — open one to see what it's actually responsible for."
      >
        <Panel className="divide-y divide-hairline px-5 dark:divide-hairline-dark">
          {MODULES.map((m) => (
            <Disclosure
              key={m.name}
              summary={
                <div>
                  <div className="text-sm font-medium text-ink dark:text-ink-dark">{m.name}</div>
                  <div className="font-mono text-[11px] text-ink-faint dark:text-ink-faint-dark">{m.path}</div>
                </div>
              }
            >
              <div className="pb-4">
                <p className="text-sm text-ink-muted dark:text-ink-muted-dark">{m.summary}</p>
                <ul className="mt-2 flex flex-col gap-1.5">
                  {m.facts.map((f, i) => (
                    <li key={i} className="flex gap-2 text-sm text-ink-muted dark:text-ink-muted-dark">
                      <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-ink-faint dark:bg-ink-faint-dark" />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            </Disclosure>
          ))}
        </Panel>
        <p className="mt-3 text-xs text-ink-faint dark:text-ink-faint-dark">
          Concurrency model: the <span className="font-mono">Engine</span> dispatches a whole layer to the{" "}
          <span className="font-mono">WorkerPool</span> at once; <span className="font-mono">EventBus</span> and{" "}
          <span className="font-mono">CheckpointStore</span> are the state shared across those worker threads, each
          guarded by its own lock.
        </p>
      </Section>

      <Section
        id="frontend"
        icon={Boxes}
        kicker="The dashboard"
        title="Frontend architecture"
        description="A typed React SPA with no state-management library — the API is the only source of truth, and this redesign's job was to make what it already returns legible at a glance."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Panel className="p-5">
            <div className="text-sm font-medium text-ink dark:text-ink-dark">A schema-driven builder inspector</div>
            <p className="mt-2 text-sm leading-relaxed text-ink-muted dark:text-ink-muted-dark">
              Every plugin already exposes a typed <span className="font-mono">config_schema</span> over the API.
              The builder's inspector renders one real input per field — text, number, JSON, a masked secret, an
              enum parsed straight out of a field's description — instead of a raw JSON textarea.
            </p>
          </Panel>
          <Panel className="p-5">
            <div className="text-sm font-medium text-ink dark:text-ink-dark">Execution state drives the canvas directly</div>
            <p className="mt-2 text-sm leading-relaxed text-ink-muted dark:text-ink-muted-dark">
              The live execution graph has no animation logic of its own — a node's pulse, checkmark, and an
              edge's flowing dashes are pure functions of{" "}
              <span className="font-mono">execution.node_states</span>, polled from the same endpoint the static
              table view uses.
            </p>
          </Panel>
          <Panel className="p-5">
            <div className="text-sm font-medium text-ink dark:text-ink-dark">A sidebar + command palette, not a top nav</div>
            <p className="mt-2 text-sm leading-relaxed text-ink-muted dark:text-ink-muted-dark">
              Workflows, Executions, Insights, Plugins, and Activity are grouped in a collapsible sidebar; ⌘K opens
              a palette that can jump to any page or workflow, or open the new-workflow dialog, without a mouse.
            </p>
          </Panel>
          <Panel className="p-5">
            <div className="text-sm font-medium text-ink dark:text-ink-dark">Hover previews instead of a click-through</div>
            <p className="mt-2 text-sm leading-relaxed text-ink-muted dark:text-ink-muted-dark">
              Hovering a workflow row renders a mini DAG thumbnail and its recent run stats from{" "}
              <span className="font-mono">GET /executions</span> — the same data the full detail page shows, just
              surfaced a layer earlier.
            </p>
          </Panel>
        </div>
      </Section>

      <Section
        id="model"
        icon={ShieldAlert}
        kicker="Retries, loops, and safe conditions"
        title="The execution model"
        description="A node's condition and loop-until expressions come from user-authored JSON, so they're parsed and walked by hand — never handed to eval()."
      >
        <div className="grid gap-6 lg:grid-cols-[1.05fr,0.95fr]">
          <CodeExcerpt
            title="utils/safe_eval.py — the allow-listed evaluator"
            code={`def evaluate_condition(expression: str, variables: Mapping[str, Any]) -> bool:
    """Evaluate a boolean condition expression against \`variables\`.

    Supports dotted/bracket lookups into the execution context, e.g.
    "quality_score >= threshold" or "status['code'] == 200".
    """
    if not expression or not expression.strip():
        return True
    tree = ast.parse(expression, mode="eval")
    return bool(_eval_node(tree.body, variables))

def _eval_node(node: ast.AST, variables: Mapping[str, Any]) -> Any:
    if isinstance(node, ast.Attribute):
        raise UnsafeExpressionError("Attribute access is not permitted in conditions")
    if isinstance(node, ast.Compare):
        left = _eval_node(node.left, variables)
        result = True
        for op, comparator in zip(node.ops, node.comparators):
            right = _eval_node(comparator, variables)
            result = result and _COMPARISONS[type(op)](left, right)
            left = right
        return result
    # ...BoolOp, BinOp, UnaryOp, Name, Constant, Subscript all allow-listed;
    # anything else raises UnsafeExpressionError.`}
          />
          <div className="flex flex-col gap-4">
            <Panel className="p-5">
              <div className="text-sm font-medium text-ink dark:text-ink-dark">Retries, timeouts, and loops share one path</div>
              <p className="mt-2 text-sm leading-relaxed text-ink-muted dark:text-ink-muted-dark">
                <span className="font-mono">NodeExecutor</span> enforces a node's retry policy and timeout on every
                attempt, then re-evaluates its <span className="font-mono">until_condition</span> after a
                successful run if it's a loop node — producing one <span className="font-mono">NodeExecutionRecord</span>{" "}
                per attempt and iteration, all visible in the Execution view's Attempts tab.
              </p>
            </Panel>
            <Panel className="p-5">
              <div className="text-sm font-medium text-ink dark:text-ink-dark">Config templating, kept deliberately narrow</div>
              <p className="mt-2 text-sm leading-relaxed text-ink-muted dark:text-ink-muted-dark">
                A node's config can reference an earlier node's output with <span className="font-mono">{"{{name}}"}</span>,
                resolved by <span className="font-mono">templating.py</span> right before a plugin sees its config.
                No loops or expressions live there — that's what the AST-walked conditions above are for.
              </p>
            </Panel>
          </div>
        </div>
      </Section>

      <Section
        id="interactions"
        icon={GitFork}
        kicker="Wiring"
        title="How the modules interact"
        description="Not the per-run pipeline above — this is how the objects are actually wired together at startup and on every call into ExecutionService."
      >
        <ModuleInteractions />
      </Section>

      <Section id="stack" icon={Wrench} kicker="Technology choices" title="What was used, and why">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {STACK.map((s) => (
            <Panel key={s.title} className="p-5">
              <s.icon size={16} strokeWidth={1.75} className="text-accent dark:text-accent-dark" />
              <div className="mt-3 text-sm font-medium text-ink dark:text-ink-dark">{s.title}</div>
              <p className="mt-2 text-sm leading-relaxed text-ink-muted dark:text-ink-muted-dark">{s.body}</p>
            </Panel>
          ))}
        </div>
      </Section>

      <Section id="tradeoffs" icon={ShieldAlert} kicker="Engineering judgment" title="Decisions and the trade-offs they accepted">
        <Panel className="divide-y divide-hairline px-5 dark:divide-hairline-dark">
          {TRADEOFFS.map((t) => (
            <Disclosure key={t.title} summary={<div className="text-sm font-medium text-ink dark:text-ink-dark">{t.title}</div>}>
              <p className="pb-4 text-sm leading-relaxed text-ink-muted dark:text-ink-muted-dark">{t.body}</p>
            </Disclosure>
          ))}
        </Panel>
      </Section>

      <Section id="challenges" icon={Puzzle} kicker="What was hard" title="Challenges along the way">
        <div className="grid gap-4 sm:grid-cols-2">
          {CHALLENGES.map((c) => (
            <Panel key={c.title} className="p-5">
              <div className="text-sm font-medium text-ink dark:text-ink-dark">{c.title}</div>
              <p className="mt-2 text-sm leading-relaxed text-ink-muted dark:text-ink-muted-dark">{c.body}</p>
            </Panel>
          ))}
        </div>
      </Section>

      <Section id="limits" icon={Map} kicker="Honest accounting" title="Limitations and what's next">
        <div className="grid gap-6 sm:grid-cols-2">
          <div>
            <div className="mb-3 text-sm font-medium text-ink-muted dark:text-ink-muted-dark">Current limitations</div>
            <ul className="flex flex-col gap-3">
              {[
                "A node timeout is soft: the call is bounded from the caller's side, but a plugin that blocks forever still occupies a background thread afterward — CPython can't safely force-kill it.",
                "Checkpoints are per-layer, not per-node, so a crash mid-layer re-runs the whole layer on resume.",
                "The event history behind the Activity feed is in-memory and capped at 2000 events — it doesn't survive a restart and isn't an audit log.",
                "SQLite is a single file — fine for one deployment's workflow and execution history, not built for multiple writers at real scale.",
                "The dashboard polls every few seconds rather than subscribing over a WebSocket, so 'live' execution updates have a small, deliberate lag.",
              ].map((l, i) => (
                <li key={i} className="flex gap-2.5 text-sm text-ink-muted dark:text-ink-muted-dark">
                  <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-status-warning dark:bg-status-warning-dark" />
                  {l}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <div className="mb-3 text-sm font-medium text-ink-muted dark:text-ink-muted-dark">Roadmap</div>
            <ul className="flex flex-col gap-3">
              {[
                "Push execution updates to the dashboard over a WebSocket instead of polling.",
                "Per-node checkpointing, so a crash mid-layer doesn't re-run work that already finished.",
                "Persist the event stream (or export it) so Activity history survives a restart.",
                "Authentication and rate limiting on the API, for safe exposure beyond a local or demo deployment.",
                "A sandboxed execution mode for the Python and JavaScript plugins, for untrusted workflow authors.",
              ].map((l, i) => (
                <li key={i} className="flex gap-2.5 text-sm text-ink-muted dark:text-ink-muted-dark">
                  <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-accent dark:bg-accent-dark" />
                  {l}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Section>

      <Reveal className="border-t border-hairline pt-8 dark:border-hairline-dark">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <p className="text-sm text-ink-muted dark:text-ink-muted-dark">That's the whole system — from a JSON definition to a rendered graph.</p>
          <div className="flex items-center gap-3">
            <Link to={LIVE_DASHBOARD_NOTE} className="flex items-center gap-1.5 text-sm text-accent hover:underline dark:text-accent-dark">
              Explore the live dashboard <ArrowRight size={13} strokeWidth={2} />
            </Link>
            <a href={REPO_URL} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-sm text-accent hover:underline dark:text-accent-dark">
              <Code2 size={13} strokeWidth={1.75} /> Read the source
            </a>
          </div>
        </div>
      </Reveal>
    </div>
  );
}
