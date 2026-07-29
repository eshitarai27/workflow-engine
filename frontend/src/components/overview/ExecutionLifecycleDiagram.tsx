import { useEffect } from "react";
import { Play } from "lucide-react";
import { useStepReplay } from "../../lib/useStepReplay";
import { useInView } from "../../lib/useInView";

const STAGES: { name: string; module: string; detail: string; color: string }[] = [
  {
    name: "Definition",
    module: "nodes + edges + triggers (JSON)",
    detail: "A workflow is authored as data — plugin ids, per-node config, and edges — never as code. The builder and the AI-generate path both just produce this same shape.",
    color: "#71717a",
  },
  {
    name: "Validate",
    module: "compiler/validator.py",
    detail: "Structural checks run first and independently of graph shape: missing fields, duplicate ids, dangling edges, unknown plugins. Every problem found is returned at once, not just the first.",
    color: "#f59e0b",
  },
  {
    name: "Compile",
    module: "compiler/compiler.py + ir.py",
    detail: "The definition becomes an IRGraph — a plain dependency graph decoupled from the JSON — then a three-color DFS checks for cycles before anything is scheduled.",
    color: "#3b82f6",
  },
  {
    name: "Plan",
    module: "planner/planner.py",
    detail: "Kahn's algorithm groups the IR into topological layers of independent nodes. Planning is pure and deterministic, which is what makes Simulation possible without running anything.",
    color: "#8b5cf6",
  },
  {
    name: "Execute",
    module: "engine/engine.py",
    detail: "The engine dispatches one full layer to the worker pool at a time and waits for it to finish before moving on — nodes within a layer run concurrently, layers run in order.",
    color: "#f0a020",
  },
  {
    name: "Run node",
    module: "executor/executor.py + plugins/*",
    detail: "Each node gets its retry policy, timeout, and bounded loop enforced here, against a plugin's execute(config, context) — producing one explainable record per attempt.",
    color: "#10b981",
  },
  {
    name: "Checkpoint & publish",
    module: "engine/checkpoint.py + events/event_bus.py",
    detail: "After every completed layer, state is written to disk and a lifecycle event is published — this pair is what makes pause/resume and the live Activity feed possible.",
    color: "#ec4899",
  },
  {
    name: "Serve",
    module: "api/app.py → dashboard",
    detail: "The REST API exposes the resulting execution history, node by node, to the dashboard you're using right now.",
    color: "#06b6d4",
  },
];

export default function ExecutionLifecycleDiagram() {
  const { ref, inView } = useInView<HTMLDivElement>(0.4);
  const { step, playing, play } = useStepReplay(STAGES.length, 450);

  useEffect(() => {
    if (inView) play();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inView]);

  const activeIndex = Math.max(step, 0);

  return (
    <div ref={ref}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <span className="text-xs text-ink-faint dark:text-ink-faint-dark">
          Every run passes through all eight stages, in order, before a byte reaches the dashboard.
        </span>
        <button
          onClick={play}
          className="flex shrink-0 items-center gap-1.5 rounded-md border border-hairline px-2.5 py-1 text-xs text-ink-muted transition-colors hover:border-baseline hover:text-ink dark:border-hairline-dark dark:text-ink-muted-dark dark:hover:border-baseline-dark dark:hover:text-ink-dark"
        >
          <Play size={12} strokeWidth={1.75} />
          {playing ? "Replaying…" : "Replay"}
        </button>
      </div>

      <div className="flex flex-wrap items-stretch gap-1.5 sm:flex-nowrap">
        {STAGES.map((stage, i) => {
          const active = i <= step;
          const current = i === Math.max(step, 0);
          return (
            <button
              key={stage.name}
              onClick={() => play()}
              className="group flex flex-1 flex-col items-center gap-1.5 rounded-md border px-1.5 py-2.5 text-center transition-all duration-300"
              style={{ borderColor: current ? stage.color : "transparent", backgroundColor: active ? `${stage.color}1f` : "transparent" }}
            >
              <span className="h-2 w-2 rounded-full transition-transform duration-300" style={{ backgroundColor: stage.color, transform: current ? "scale(1.4)" : "scale(1)" }} />
              <span className="text-[11px] font-medium transition-colors" style={{ color: active ? stage.color : undefined }}>
                {stage.name}
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-4 rounded-md border border-hairline bg-plane px-4 py-3 text-sm transition-all duration-300 dark:border-hairline-dark dark:bg-plane-dark">
        <div className="mb-1 font-mono text-[11px] text-ink-faint dark:text-ink-faint-dark">{STAGES[activeIndex].module}</div>
        <div className="text-ink-muted dark:text-ink-muted-dark">{STAGES[activeIndex].detail}</div>
      </div>
    </div>
  );
}
