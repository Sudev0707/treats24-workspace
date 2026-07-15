import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { statusColor, statusLabel, statusMeaning, priorityDot, type Priority, type TaskStatus } from "@/lib/data";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export const statusDot: Record<TaskStatus, string> = {
  Backlog: "bg-[#626f86]",
  "To Do": "bg-[#626f86]",
  "Selected for Development": "bg-primary",
  "In Progress": "bg-primary",
  Blocked: "bg-[#e34935]",
  "In Review": "bg-[#6554c0]",
  "Changes Requested": "bg-[#cf9f02]",
  "Ready for QA": "bg-[#22a06b]",
  "QA Testing": "bg-[#22a06b]",
  "Failed QA": "bg-[#e34935]",
  "Ready for Release": "bg-[#22a06b]",
  Released: "bg-[#22a06b]",
  Done: "bg-[#22a06b]",
};

export function JiraPage({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className="min-h-full bg-background">
      <div className={cn("mx-auto max-w-[1600px] px-4 py-5 sm:px-6 lg:px-8", className)}>{children}</div>
    </div>
  );
}

export function JiraPageHeader({
  title,
  subtitle,
  breadcrumbs,
  actions,
}: {
  title: string;
  subtitle?: string;
  breadcrumbs?: { label: string; to?: string }[];
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-5">
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav className="mb-1 flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
          {breadcrumbs.map((b, i) => (
            <span key={b.label} className="flex items-center gap-1">
              {i > 0 && <span>/</span>}
              {b.to ? (
                <Link to={b.to} className="text-primary hover:underline">
                  {b.label}
                </Link>
              ) : (
                <span>{b.label}</span>
              )}
            </span>
          ))}
        </nav>
      )}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
          {subtitle && <p className="mt-0.5 text-sm text-muted-foreground">{subtitle}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
}

export function JiraPanel({
  title,
  action,
  children,
  className,
  noPadding,
}: {
  title?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  noPadding?: boolean;
}) {
  return (
    <section className={cn("overflow-hidden rounded-md border border-border bg-card shadow-soft", className)}>
      {title && (
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="text-sm font-semibold text-foreground">{title}</h2>
          {action}
        </div>
      )}
      <div className={noPadding ? undefined : "p-0"}>{children}</div>
    </section>
  );
}

export function JiraBtn({
  children,
  variant = "default",
  size = "default",
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "default" | "subtle" | "danger";
  size?: "default" | "sm" | "icon";
}) {
  return (
    <button
      type="button"
      className={cn(
        "inline-flex items-center justify-center gap-1.5 font-medium transition-colors disabled:opacity-50",
        size === "sm" && "h-8 rounded-md px-3 text-xs",
        size === "default" && "h-8 rounded-md px-3 text-sm",
        size === "icon" && "h-8 w-8 rounded-md",
        variant === "primary" && "bg-primary text-primary-foreground shadow-soft hover:bg-primary-glow",
        variant === "default" && "border border-border bg-card text-foreground hover:bg-secondary",
        variant === "subtle" && "text-muted-foreground hover:bg-secondary",
        variant === "danger" && "text-destructive hover:bg-destructive/10",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function JiraLinkBtn({ to, children, className }: { to: string; children: React.ReactNode; className?: string }) {
  return (
    <Link
      to={to}
      className={cn(
        "inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-card px-3 text-sm font-medium text-foreground shadow-soft hover:bg-secondary",
        className,
      )}
    >
      {children}
    </Link>
  );
}

export function JiraTabsList({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("flex border-b border-border", className)}>{children}</div>;
}

export function JiraTab({
  active,
  onClick,
  children,
  count,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  count?: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "relative px-3 py-2.5 text-xs font-medium transition-colors",
        active
          ? "text-primary after:absolute after:inset-x-0 after:bottom-0 after:h-[3px] after:rounded-t after:bg-primary"
          : "text-muted-foreground hover:text-foreground hover:bg-secondary/80",
      )}
    >
      {children}
      {count !== undefined && (
        <span className="ml-1.5 rounded-full bg-secondary px-1.5 py-0.5 text-[10px] tabular-nums">{count}</span>
      )}
    </button>
  );
}

export function StatusLozenge({
  status,
  size = "md",
  showTooltip = true,
}: {
  status: TaskStatus | string;
  size?: "sm" | "md";
  showTooltip?: boolean;
}) {
  const key = status as TaskStatus;
  const colors = statusColor[key];
  const label = statusLabel[key] ?? String(status).toUpperCase();
  const meaning = statusMeaning[key];

  const lozenge = (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-sm font-bold uppercase tracking-wide whitespace-nowrap",
        size === "sm" ? "min-w-[72px] px-2 py-0.5 text-[10px] leading-tight" : "min-w-[84px] px-2.5 py-1 text-[11px] leading-tight",
        colors ?? "bg-muted text-muted-foreground",
      )}
    >
      {label}
    </span>
  );

  if (!showTooltip || !meaning) return lozenge;

  return (
    <Tooltip delayDuration={300}>
      <TooltipTrigger asChild>{lozenge}</TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs text-xs leading-snug">
        {meaning}
      </TooltipContent>
    </Tooltip>
  );
}

export function IssueTypeIcon({ type, className }: { type: string; className?: string }) {
  const colors: Record<string, string> = {
    Bug: "text-destructive",
    Feature: "text-primary",
    Improvement: "text-cta",
    Hotfix: "text-destructive",
    Documentation: "text-muted-foreground",
  };
  return (
    <span className={cn("text-[10px] font-semibold uppercase", colors[type] ?? "text-muted-foreground", className)}>
      {type.slice(0, 3)}
    </span>
  );
}

export function AssigneeAvatar({ initials, size = "md" }: { initials: string; size?: "sm" | "md" }) {
  return (
    <span
      className={cn(
        "inline-grid shrink-0 place-items-center rounded-full bg-secondary font-semibold text-secondary-foreground",
        size === "sm" ? "h-6 w-6 text-[9px]" : "h-7 w-7 text-[10px]",
      )}
    >
      {initials}
    </span>
  );
}

export function JiraEmpty({ message, action }: { message: string; action?: React.ReactNode }) {
  return (
    <div className="px-4 py-12 text-center">
      <p className="text-sm text-muted-foreground">{message}</p>
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}

export function JiraKanbanBoard({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto pb-4">
      <div className="flex min-w-max gap-3">{children}</div>
    </div>
  );
}

export function JiraKanbanColumn({
  title,
  count,
  dotColor,
  onAdd,
  children,
}: {
  title: string;
  count: number;
  dotColor: string;
  onAdd?: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="flex w-[272px] shrink-0 flex-col rounded-md bg-[#f4f5f7]">
      <div className="flex items-center justify-between px-2 py-2">
        <div className="flex items-center gap-2">
          <span className={cn("h-2 w-2 rounded-full", dotColor)} />
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</span>
          <span className="rounded-full bg-card px-1.5 py-0.5 text-[10px] font-medium tabular-nums text-muted-foreground">
            {count}
          </span>
        </div>
        {onAdd && (
          <button type="button" onClick={onAdd} className="rounded-lg p-1 text-muted-foreground hover:bg-card hover:text-primary">
            +
          </button>
        )}
      </div>
      <div className="space-y-2 px-2 pb-2">{children}</div>
    </div>
  );
}

export function JiraKanbanCard({
  id,
  title,
  projectName,
  priority,
  assignee,
  workType,
  to,
  params,
  typeIcon,
}: {
  id: string;
  title: string;
  projectName?: string;
  priority?: string;
  assignee: string;
  workType?: "task" | "Bug" | "Feature" | "Improvement" | "Hotfix" | "Documentation";
  to: string;
  params?: Record<string, string>;
  typeIcon?: React.ReactNode;
}) {
  const dot = priority && priorityDot[priority as Priority];
  const priorityDotClass = dot ?? "bg-muted-foreground/40";

  return (
    <Link
      to={to}
      params={params}
      className="group block rounded-md border border-border bg-card p-2.5 shadow-soft transition-colors hover:bg-[#f4f5f7]"
    >
      <div className="flex items-start gap-1.5">
        {typeIcon && <span className="mt-0.5 shrink-0">{typeIcon}</span>}
        <p className="line-clamp-2 min-w-0 flex-1 text-sm font-medium leading-snug text-foreground">{title}</p>
      </div>
      <div className="mt-2.5 flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-1.5">
          {priority && <span className={cn("h-2 w-2 shrink-0 rounded-full", priorityDotClass)} title={priority} />}
          <span className="font-mono text-[11px] font-medium text-primary underline-offset-2 group-hover:underline">{id}</span>
        </div>
        <AssigneeAvatar initials={assignee} size="sm" />
      </div>
      {projectName && (
        <p className="mt-1 truncate text-[10px] text-muted-foreground">{projectName}</p>
      )}
    </Link>
  );
}
