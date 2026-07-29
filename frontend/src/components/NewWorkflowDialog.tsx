import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Sparkles, PenLine, CheckCircle2, XCircle } from "lucide-react";
import { api, ApiError } from "../lib/api";
import type { AIProviderInfo, GeneratedWorkflow } from "../lib/types";
import Dialog from "./ui/Dialog";
import { Tabs, TabPanel } from "./ui/Tabs";
import Button from "./ui/Button";
import { Textarea, Select, Label } from "./ui/Input";
import { toast } from "./ui/Toaster";

export default function NewWorkflowDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [mode, setMode] = useState("blank");
  const [prompt, setPrompt] = useState("");
  const [providers, setProviders] = useState<AIProviderInfo[]>([]);
  const [provider, setProvider] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<GeneratedWorkflow | null>(null);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (open) api.aiProviders().then(setProviders).catch(() => setProviders([]));
  }, [open]);

  useEffect(() => {
    if (!open) {
      setPrompt("");
      setResult(null);
      setError(null);
      setMode("blank");
    }
  }, [open]);

  const anyConfigured = providers.some((p) => p.configured);

  const generate = () => {
    setLoading(true);
    setError(null);
    setResult(null);
    api
      .aiGenerate(prompt, provider || undefined)
      .then(setResult)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Generation failed"))
      .finally(() => setLoading(false));
  };

  const useResult = () => {
    if (!result) return;
    api
      .createWorkflow(result.definition)
      .then((wf) => {
        onOpenChange(false);
        toast.success("Workflow created from description");
        navigate(`/workflows/${wf.id}`);
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : "Failed to save"));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange} title="New workflow" description="Start blank, or describe what you want and let AI draft it." width="560px">
      <Tabs
        value={mode}
        onValueChange={setMode}
        tabs={[
          { value: "blank", label: "Start from scratch", icon: <PenLine size={14} /> },
          { value: "ai", label: "Describe it", icon: <Sparkles size={14} /> },
        ]}
      >
        <TabPanel value="blank">
          <div className="flex flex-col gap-3 pt-4">
            <p className="text-sm text-ink-muted dark:text-ink-muted-dark">
              Opens an empty canvas in the builder. Add nodes from the palette, wire them together, and save when
              you're ready — nothing is created until you do.
            </p>
            <div className="flex justify-end">
              <Button
                variant="primary"
                onClick={() => {
                  onOpenChange(false);
                  navigate("/builder");
                }}
              >
                Open builder →
              </Button>
            </div>
          </div>
        </TabPanel>

        <TabPanel value="ai">
          <div className="flex flex-col gap-3 pt-4">
            {!anyConfigured && providers.length > 0 && (
              <div className="rounded-md border border-status-warning/30 bg-status-warning/10 px-3 py-2 text-xs text-status-warning dark:border-status-warning-dark/30 dark:bg-status-warning-dark/10 dark:text-status-warning-dark">
                No AI provider is configured on the backend. Set an API key (see .env.example) to enable this.
              </div>
            )}
            <div>
              <Label>What should this workflow do?</Label>
              <Textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="e.g. When a file is uploaded, summarize it and send the summary by email."
                rows={3}
              />
            </div>
            <div className="flex items-center gap-2">
              <Select value={provider} onChange={(e) => setProvider(e.target.value)} className="flex-1">
                <option value="">Auto-select provider</option>
                {providers.map((p) => (
                  <option key={p.id} value={p.id} disabled={!p.configured}>
                    {p.name} {p.configured ? "" : "(not configured)"}
                  </option>
                ))}
              </Select>
              <Button variant="primary" onClick={generate} disabled={loading || !prompt.trim()}>
                {loading ? "Generating…" : "Generate"}
              </Button>
            </div>

            {error && <div className="text-xs text-status-danger dark:text-status-danger-dark">{error}</div>}

            {result && (
              <div className="rounded-md border border-hairline bg-plane p-3 dark:border-hairline-dark dark:bg-plane-dark">
                <div className="text-xs text-ink-muted dark:text-ink-muted-dark">{result.explanation}</div>
                <div className="mt-2 flex items-center gap-1.5 text-xs">
                  {result.validation_errors.length === 0 ? (
                    <>
                      <CheckCircle2 size={13} className="text-status-success dark:text-status-success-dark" />
                      <span className="text-status-success dark:text-status-success-dark">Generated workflow is valid</span>
                    </>
                  ) : (
                    <>
                      <XCircle size={13} className="text-status-danger dark:text-status-danger-dark" />
                      <span className="text-status-danger dark:text-status-danger-dark">{result.validation_errors.join("; ")}</span>
                    </>
                  )}
                </div>
                <div className="mt-3 flex justify-end">
                  <Button variant="primary" size="sm" onClick={useResult} disabled={result.validation_errors.length > 0}>
                    Use this workflow →
                  </Button>
                </div>
              </div>
            )}
          </div>
        </TabPanel>
      </Tabs>
    </Dialog>
  );
}
