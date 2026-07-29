import type { Workflow } from "../lib/types";

function layoutPositions(workflow: Workflow): Record<string, { x: number; y: number }> {
  const stored = (workflow.metadata?.positions as Record<string, { x: number; y: number }>) || {};
  const positions: Record<string, { x: number; y: number }> = {};
  workflow.nodes.forEach((n, i) => {
    positions[n.id] = stored[n.id] ?? { x: (i % 4) * 90, y: Math.floor(i / 4) * 70 };
  });
  return positions;
}

export default function WorkflowThumbnail({ workflow, className }: { workflow: Workflow; className?: string }) {
  const positions = layoutPositions(workflow);
  const values = Object.values(positions);
  const xs = values.map((p) => p.x);
  const ys = values.map((p) => p.y);
  const minX = xs.length ? Math.min(...xs) : 0;
  const minY = ys.length ? Math.min(...ys) : 0;
  const maxX = xs.length ? Math.max(...xs) : 100;
  const maxY = ys.length ? Math.max(...ys) : 60;
  const pad = 18;
  const w = Math.max(maxX - minX, 1) + pad * 2;
  const h = Math.max(maxY - minY, 1) + pad * 2;
  const norm = (p: { x: number; y: number }) => ({ x: p.x - minX + pad, y: p.y - minY + pad });

  if (workflow.nodes.length === 0) {
    return (
      <div className={className}>
        <svg viewBox="0 0 120 60" className="h-full w-full">
          <text x="60" y="33" textAnchor="middle" className="fill-ink-faint text-[9px] dark:fill-ink-faint-dark">
            empty
          </text>
        </svg>
      </div>
    );
  }

  return (
    <div className={className}>
      <svg viewBox={`0 0 ${w} ${h}`} className="h-full w-full overflow-visible">
        {workflow.edges.map((e, i) => {
          const a = norm(positions[e.source] ?? { x: 0, y: 0 });
          const b = norm(positions[e.target] ?? { x: 0, y: 0 });
          return (
            <line
              key={i}
              x1={a.x}
              y1={a.y}
              x2={b.x}
              y2={b.y}
              className="stroke-baseline dark:stroke-baseline-dark"
              strokeWidth={1.5}
            />
          );
        })}
        {workflow.nodes.map((n) => {
          const p = norm(positions[n.id]);
          return <circle key={n.id} cx={p.x} cy={p.y} r={5} className="fill-ink-muted dark:fill-ink-muted-dark" />;
        })}
      </svg>
    </div>
  );
}
