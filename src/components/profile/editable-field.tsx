import { useEffect, useRef, useState } from "react";
import { Pencil } from "lucide-react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type EditableFieldProps = {
  value: string;
  onSave: (value: string) => void;
  label?: string;
  placeholder?: string;
  emptyText?: string;
  variant?: "title" | "subtitle" | "row";
  className?: string;
  required?: boolean;
};

export function EditableField({
  value,
  onSave,
  label,
  placeholder,
  emptyText = "Click to add",
  variant = "row",
  className,
  required = false,
}: EditableFieldProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  function save() {
    const trimmed = draft.trim();
    if (required && !trimmed) {
      setDraft(value);
      setEditing(false);
      return;
    }
    if (trimmed !== value) onSave(trimmed);
    else setDraft(value);
    setEditing(false);
  }

  function cancel() {
    setDraft(value);
    setEditing(false);
  }

  if (editing) {
    const input = (
      <Input
        ref={inputRef}
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={save}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            save();
          }
          if (event.key === "Escape") cancel();
        }}
        placeholder={placeholder}
        className={cn(
          variant === "title" && "h-9 border-primary/30 font-display text-xl font-semibold",
          variant === "subtitle" && "h-8 border-primary/30 text-sm",
          variant === "row" && "h-8 rounded border-border",
          className,
        )}
      />
    );

    if (variant === "row" && label) {
      return (
        <div className="space-y-1.5">
          <span className="text-xs font-medium text-muted-foreground">{label}</span>
          {input}
        </div>
      );
    }

    return input;
  }

  const displayValue = value.trim() || emptyText;
  const isEmpty = !value.trim();

  if (variant === "title") {
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        className={cn(
          "group inline-flex max-w-full items-center gap-2 text-left font-display text-xl font-semibold text-foreground transition-colors hover:text-primary/90",
          isEmpty && "text-muted-foreground",
          className,
        )}
        title="Click to edit username"
      >
        <span className="truncate">{displayValue}</span>
        <Pencil className="h-3.5 w-3.5 shrink-0 opacity-0 transition-opacity group-hover:opacity-60" />
      </button>
    );
  }

  if (variant === "subtitle") {
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        className={cn(
          "group inline-flex max-w-full items-center gap-2 text-left text-sm transition-colors hover:text-foreground",
          isEmpty ? "text-muted-foreground/70" : "text-muted-foreground",
          className,
        )}
        title="Click to edit job title"
      >
        <span className="truncate">{displayValue}</span>
        <Pencil className="h-3 w-3 shrink-0 opacity-0 transition-opacity group-hover:opacity-60" />
      </button>
    );
  }

  return (
    <div className="space-y-1.5">
      {label ? <span className="text-xs font-medium text-muted-foreground">{label}</span> : null}
      <button
        type="button"
        onClick={() => setEditing(true)}
        className={cn(
          "group flex h-8 w-full items-center justify-between rounded border border-transparent bg-secondary/40 px-3 text-left text-sm transition-colors hover:border-border hover:bg-secondary/70",
          isEmpty && "text-muted-foreground",
          className,
        )}
      >
        <span className="truncate">{displayValue}</span>
        <Pencil className="ml-2 h-3 w-3 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
      </button>
    </div>
  );
}

type ReadOnlyFieldProps = {
  label: string;
  value: string;
  hint?: string;
  emptyText?: string;
};

export function ReadOnlyField({ label, value, hint, emptyText = "—" }: ReadOnlyFieldProps) {
  const displayValue = value.trim() || emptyText;

  return (
    <div className="space-y-1.5">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <div
        className={cn(
          "flex h-8 items-center rounded border border-border bg-secondary/30 px-3 text-sm",
          value.trim() ? "text-foreground" : "text-muted-foreground",
        )}
        aria-readonly="true"
      >
        <span className="truncate">{displayValue}</span>
      </div>
      {hint ? <p className="text-[11px] text-muted-foreground">{hint}</p> : null}
    </div>
  );
}
