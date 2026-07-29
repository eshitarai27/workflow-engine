import { Handle, Position, type NodeProps } from "reactflow";
import { Blocks, GitBranch, RotateCw } from "lucide-react";

export interface CanvasNodeData {
  label: string;
  pluginId: string;
  color: string;
  hasCondition?: boolean;
  hasLoop?: boolean;
}

export default function CanvasNode({ data, selected }: NodeProps<CanvasNodeData>) {
  return (
    <div
      className={`group flex w-[168px] items-center gap-2 rounded-md border bg-surface px-2.5 py-2 shadow-sm transition-shadow dark:bg-surface-dark ${
        selected
          ? "border-accent ring-2 ring-accent/25 dark:border-accent-dark dark:ring-accent-dark/25"
          : "border-hairline hover:border-baseline dark:border-hairline-dark dark:hover:border-baseline-dark"
      }`}
    >
      <Handle type="target" position={Position.Left} className="!h-2 !w-2 !border-2 !border-surface !bg-baseline dark:!border-surface-dark dark:!bg-baseline-dark" />
      <span className="h-6 w-6 shrink-0 rounded flex items-center justify-center" style={{ backgroundColor: `${data.color}1f` }}>
        <Blocks size={13} style={{ color: data.color }} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="truncate text-xs font-medium text-ink dark:text-ink-dark">{data.label}</div>
        <div className="truncate text-[10px] text-ink-faint dark:text-ink-faint-dark">{data.pluginId}</div>
      </div>
      {(data.hasCondition || data.hasLoop) && (
        <div className="flex shrink-0 flex-col items-center gap-0.5 text-ink-faint dark:text-ink-faint-dark">
          {data.hasCondition && <GitBranch size={11} />}
          {data.hasLoop && <RotateCw size={11} />}
        </div>
      )}
      <Handle type="source" position={Position.Right} className="!h-2 !w-2 !border-2 !border-surface !bg-baseline dark:!border-surface-dark dark:!bg-baseline-dark" />
    </div>
  );
}
