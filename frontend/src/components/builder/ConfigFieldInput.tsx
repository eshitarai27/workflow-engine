import { useState } from "react";
import type { ConfigField } from "../../lib/types";
import { Input, Textarea, Select, Label, Switch } from "../ui/Input";

const MULTILINE_NAMES = new Set(["code", "query", "body", "message", "content"]);

function parseEnumOptions(description: string): string[] | null {
  if (!description.includes("|")) return null;
  const parts = description
    .split("|")
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length < 2 || parts.length > 8) return null;
  if (parts.some((p) => p.includes(" ") || p.length > 24)) return null;
  return parts;
}

export default function ConfigFieldInput({
  field,
  value,
  onChange,
}: {
  field: ConfigField;
  value: unknown;
  onChange: (value: unknown) => void;
}) {
  const [jsonError, setJsonError] = useState(false);
  const enumOptions = field.type === "string" ? parseEnumOptions(field.description) : null;

  if (field.type === "boolean") {
    return (
      <div className="flex items-center justify-between py-1">
        <FieldLabel field={field} />
        <Switch checked={Boolean(value)} onChange={onChange} />
      </div>
    );
  }

  if (enumOptions) {
    return (
      <div>
        <FieldLabel field={field} />
        <Select value={String(value ?? "")} onChange={(e) => onChange(e.target.value)}>
          <option value="" disabled>
            Select…
          </option>
          {enumOptions.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </Select>
      </div>
    );
  }

  if (field.type === "number") {
    return (
      <div>
        <FieldLabel field={field} />
        <Input
          type="number"
          value={value === undefined || value === null ? "" : String(value)}
          onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}
        />
      </div>
    );
  }

  if (field.type === "object" || field.type === "array") {
    return (
      <div>
        <FieldLabel field={field} />
        <Textarea
          defaultValue={JSON.stringify(value ?? (field.type === "array" ? [] : {}), null, 2)}
          rows={4}
          className={jsonError ? "border-status-danger dark:border-status-danger-dark font-mono text-xs" : "font-mono text-xs"}
          onChange={() => jsonError && setJsonError(false)}
          onBlur={(e) => {
            try {
              onChange(e.target.value.trim() === "" ? (field.type === "array" ? [] : {}) : JSON.parse(e.target.value));
              setJsonError(false);
            } catch {
              setJsonError(true);
            }
          }}
        />
        {jsonError && <div className="mt-1 text-xs text-status-danger dark:text-status-danger-dark">Invalid JSON — not saved</div>}
      </div>
    );
  }

  if (MULTILINE_NAMES.has(field.name)) {
    return (
      <div>
        <FieldLabel field={field} />
        <Textarea
          defaultValue={value === undefined || value === null ? "" : String(value)}
          rows={field.name === "code" ? 8 : 3}
          className="font-mono text-xs"
          onBlur={(e) => onChange(e.target.value)}
        />
      </div>
    );
  }

  return (
    <div>
      <FieldLabel field={field} />
      <Input
        type={field.secret ? "password" : "text"}
        defaultValue={value === undefined || value === null ? "" : String(value)}
        placeholder={field.secret ? "••••••••" : undefined}
        onBlur={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

function FieldLabel({ field }: { field: ConfigField }) {
  return (
    <Label className="flex items-center gap-1" title={field.description}>
      {field.name}
      {field.required && <span className="text-status-danger dark:text-status-danger-dark">*</span>}
      {field.secret && <span className="text-[10px] text-ink-faint dark:text-ink-faint-dark">secret</span>}
    </Label>
  );
}
