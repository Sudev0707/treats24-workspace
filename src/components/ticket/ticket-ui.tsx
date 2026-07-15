import { useMemo, useState, useEffect, useRef } from "react";
import { Link } from "@tanstack/react-router";
import {
  Bug,
  CheckSquare,
  Sparkles,
  Zap,
  FileText,
  Wrench,
  MessageSquare,
  Paperclip,
  Clock,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Share2,
  MoreHorizontal,
  Eye,
  LayoutGrid,
  List,
  Search,
  Plus,
  ArrowLeft,
  Settings2,
  Zap as AutomationIcon,
  GitBranch,
  Link2,
  X,
} from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  AssigneeAvatar,
  JiraBtn,
  JiraEmpty,
  JiraPage,
  JiraPanel,
  JiraTab,
  JiraTabsList,
  StatusLozenge,
} from "@/components/jira/ui";
import {
  priorityColor,
  priorities,
  statusLabel,
  taskStatuses,
  formatWorkItemDate,
  formatRelativeTime,
  type IssueType,
  type Priority,
  type TaskStatus,
  type TicketNavLink,
  type WorkItemRef,
} from "@/lib/data";
import { cn } from "@/lib/utils";

export type WorkType = "task" | "subtask" | IssueType;

const workTypeConfig: Record<
  WorkType,
  { label: string; icon: React.ComponentType<{ className?: string }>; badge: string }
> = {
  task: { label: "Task", icon: CheckSquare, badge: "bg-[#f3e8ff] text-[#6e38b8] border-[#ddd6fe]" },
  subtask: { label: "Sub-task", icon: CheckSquare, badge: "bg-[#f4f5f7] text-[#626f86] border-[#dfe1e6]" },
  Bug: { label: "Bug", icon: Bug, badge: "bg-[#ffebe6] text-[#ae2a19] border-[#ffbdad]" },
  Feature: { label: "Story", icon: Sparkles, badge: "bg-[#ede6ff] text-[#6554c0] border-[#dcd1ff]" },
  Improvement: { label: "Improvement", icon: Zap, badge: "bg-[#e6fcff] text-[#008da6] border-[#b3f5ff]" },
  Hotfix: { label: "Hotfix", icon: Wrench, badge: "bg-[#ffebe6] text-[#ae2a19] border-[#ffbdad]" },
  Documentation: { label: "Docs", icon: FileText, badge: "bg-[#f4f5f7] text-[#626f86] border-[#dfe1e6]" },
};

export function WorkTypeBadge({ type, size = "md" }: { type: WorkType; size?: "sm" | "md" }) {
  const config = workTypeConfig[type];
  const Icon = config.icon;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded border font-medium",
        config.badge,
        size === "sm" ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-0.5 text-xs",
      )}
    >
      <Icon className={size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5"} />
      {config.label}
    </span>
  );
}

export function WorkTypeIcon({ type, className }: { type: WorkType; className?: string }) {
  const Icon = workTypeConfig[type].icon;
  const color =
    type === "subtask"
      ? "text-[#626f86]"
      : type === "Bug" || type === "Hotfix"
        ? "text-[#e34935]"
        : type === "Improvement"
          ? "text-[#008da6]"
          : type === "Feature"
            ? "text-[#6554c0]"
          : type === "Documentation"
            ? "text-[#626f86]"
            : "text-primary";
  return <Icon className={cn("h-4 w-4 shrink-0", color, className)} />;
}

const workTypeSquareBg: Record<WorkType, string> = {
  task: "bg-[#f3e8ff] text-[#6e38b8]",
  subtask: "bg-[#f4f5f7] text-[#626f86]",
  Bug: "bg-[#ffebe6] text-[#e34935]",
  Feature: "bg-[#ede6ff] text-[#6554c0]",
  Improvement: "bg-[#e6fcff] text-[#008da6]",
  Hotfix: "bg-[#ffebe6] text-[#e34935]",
  Documentation: "bg-[#f4f5f7] text-[#626f86]",
};

export function WorkTypeIconSquare({
  type,
  size = "md",
  className,
}: {
  type: WorkType;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const Icon = workTypeConfig[type].icon;
  const dim = size === "lg" ? "h-8 w-8" : size === "sm" ? "h-5 w-5" : "h-7 w-7";
  const iconDim = size === "lg" ? "h-4 w-4" : size === "sm" ? "h-3 w-3" : "h-4 w-4";
  return (
    <span
      className={cn(
        "grid shrink-0 place-items-center rounded",
        dim,
        workTypeSquareBg[type],
        className,
      )}
    >
      <Icon className={iconDim} />
    </span>
  );
}

export function PriorityLozenge({ priority }: { priority: Priority | string }) {
  const p = priority as Priority;
  const isHigh = p === "Critical" || p === "High";
  return (
    <span
      className={cn(
        "inline-flex items-center rounded px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide",
        priorityColor[p]?.includes("destructive")
          ? "bg-destructive/10 text-destructive"
          : priorityColor[p]?.includes("cta")
            ? "bg-cta/10 text-cta"
            : priorityColor[p]?.includes("primary")
              ? "bg-primary/10 text-primary"
              : "bg-secondary text-muted-foreground",
      )}
    >
      {isHigh && <span className="mr-1">↑</span>}
      {priority}
    </span>
  );
}

const fieldSelectTriggerClass =
  "h-auto min-h-9 w-full justify-between gap-2 border-border bg-card px-2 py-1.5 shadow-sm [&>span]:line-clamp-none";

export function PrioritySelect({
  priority,
  onPriorityChange,
  variant = "field",
  className,
}: {
  priority: Priority;
  onPriorityChange: (priority: Priority) => void;
  variant?: "pill" | "field";
  className?: string;
}) {
  const isPill = variant === "pill";

  return (
    <Select value={priority} onValueChange={(v) => onPriorityChange(v as Priority)}>
      <SelectTrigger
        className={cn(
          isPill
            ? "h-auto w-fit min-w-0 gap-1 border-0 bg-transparent p-0 shadow-none hover:opacity-90 focus:ring-0 focus-visible:ring-0 [&>svg:last-child]:hidden"
            : fieldSelectTriggerClass,
          className,
        )}
      >
        <PriorityLozenge priority={priority} />
        {isPill && <ChevronDown className="h-3 w-3 shrink-0 text-muted-foreground/80" />}
      </SelectTrigger>
      <SelectContent className="min-w-[200px] p-1" position="popper" sideOffset={4}>
        {priorities.map((p) => (
          <SelectItem
            key={p}
            value={p}
            textValue={p}
            className="cursor-pointer rounded-md py-2 pl-3 pr-3 focus:bg-secondary/80 [&>span:first-child]:hidden"
          >
            <PriorityLozenge priority={p} />
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function TicketBreadcrumb({
  items,
}: {
  items: { label: string; to?: string; params?: Record<string, string> }[];
}) {
  return (
    <nav className="mb-3 flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
      {items.map((item, i) => (
        <span key={`${item.label}-${i}`} className="flex items-center gap-1">
          {i > 0 && <ChevronRight className="h-3 w-3 opacity-50" />}
          {item.to ? (
            <Link to={item.to} params={item.params} className="text-primary hover:underline">
              {item.label}
            </Link>
          ) : (
            <span className="font-medium text-foreground">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}

export function TicketSidebarField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-[88px_1fr] items-start gap-2 py-2">
      <span className="text-xs text-muted-foreground">{label}</span>
      <div className="min-w-0 text-sm text-foreground">{children}</div>
    </div>
  );
}

function TicketCollapsibleSection({
  title,
  count,
  defaultOpen = true,
  action,
  children,
}: {
  title: string;
  count?: number;
  defaultOpen?: boolean;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="border-t border-border">
      <div className="flex items-center justify-between gap-2 py-3">
        <CollapsibleTrigger className="flex min-w-0 flex-1 items-center gap-2 text-left text-sm font-semibold text-foreground hover:text-primary">
          <ChevronRight
            className={cn("h-4 w-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-90")}
          />
          <span>{title}</span>
          {count !== undefined && count > 0 && (
            <span className="text-xs font-normal tabular-nums text-muted-foreground">{count}</span>
          )}
        </CollapsibleTrigger>
        {action}
      </div>
      <CollapsibleContent className="pb-4">{children}</CollapsibleContent>
    </Collapsible>
  );
}

function TicketDetailNav({
  backTo,
  ticketKey,
  workType,
  prevTicket,
  nextTicket,
}: {
  backTo: TicketNavLink;
  ticketKey: string;
  workType: WorkType;
  prevTicket?: TicketNavLink;
  nextTicket?: TicketNavLink;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      <Link
        to={backTo.to}
        params={backTo.params}
        className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back
      </Link>
      <span className="text-border">|</span>
      <div className="flex items-center gap-1.5">
        <WorkTypeIconSquare type={workType} size="sm" />
        <span className="font-mono text-xs font-semibold text-primary">{ticketKey}</span>
      </div>
      <div className="ml-auto flex items-center gap-0.5">
        {prevTicket ? (
          <Link
            to={prevTicket.to}
            params={prevTicket.params}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground"
            aria-label="Previous ticket"
          >
            <ChevronUp className="h-4 w-4" />
          </Link>
        ) : (
          <span className="rounded-md p-1.5 text-muted-foreground/30">
            <ChevronUp className="h-4 w-4" />
          </span>
        )}
        {nextTicket ? (
          <Link
            to={nextTicket.to}
            params={nextTicket.params}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground"
            aria-label="Next ticket"
          >
            <ChevronDown className="h-4 w-4" />
          </Link>
        ) : (
          <span className="rounded-md p-1.5 text-muted-foreground/30">
            <ChevronDown className="h-4 w-4" />
          </span>
        )}
      </div>
    </div>
  );
}

function TicketAttachmentsSection({ count = 0 }: { count?: number }) {
  return (
    <section className="border-t border-border pt-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground">
          Attachments
          {count > 0 && (
            <span className="ml-2 text-xs font-normal tabular-nums text-muted-foreground">{count}</span>
          )}
        </h2>
        <button
          type="button"
          className="rounded-md p-1 text-muted-foreground hover:bg-secondary hover:text-foreground"
          aria-label="Add attachment"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
      <div className="rounded-lg border border-dashed border-border bg-secondary/20 px-4 py-8 text-center">
        <Paperclip className="mx-auto mb-2 h-5 w-5 text-muted-foreground/60" />
        <p className="text-sm text-muted-foreground">Drop files to attach, or</p>
        <button type="button" className="mt-1 text-sm font-medium text-primary hover:underline">
          browse
        </button>
      </div>
    </section>
  );
}

function LinkedWorkItemsSection({
  items,
  linkCandidates,
  onLink,
  onUnlink,
}: {
  items: NestedTicketItem[];
  linkCandidates: WorkItemRef[];
  onLink: (targetId: string) => void;
  onUnlink: (targetId: string) => void;
}) {
  const [adding, setAdding] = useState(false);
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return linkCandidates.slice(0, 8);
    return linkCandidates
      .filter((ref) => `${ref.item.id} ${ref.item.title}`.toLowerCase().includes(needle))
      .slice(0, 8);
  }, [linkCandidates, query]);

  const gridClass = "sm:grid-cols-[28px_88px_minmax(0,1fr)_minmax(96px,auto)_32px]";

  const handleLink = (targetId: string) => {
    onLink(targetId);
    setQuery("");
    setAdding(false);
  };

  return (
    <TicketCollapsibleSection
      title="Linked work items"
      count={items.length}
      defaultOpen={items.length > 0}
    >
      {items.length > 0 && (
        <div className="mb-3 overflow-hidden rounded-lg border border-border/60">
          <div
            className={cn(
              "hidden gap-3 border-b border-border bg-secondary/40 px-4 py-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground sm:grid",
              gridClass,
            )}
          >
            <span />
            <span>Key</span>
            <span>Summary</span>
            <span>Status</span>
            <span />
          </div>
          {items.map((item) => (
            <div
              key={item.id}
              className={cn(
                "group/row relative grid grid-cols-1 gap-2 border-b border-border px-4 py-3 transition-colors last:border-0 hover:bg-secondary/50 sm:items-center sm:gap-3 sm:py-2.5",
                gridClass,
              )}
            >
              <WorkTypeIcon type={item.workType} className="relative z-10 hidden sm:block" />
              <TicketKeyLink ticketKey={item.id} to={item.to} params={item.params} />
              <Link
                to={item.to}
                params={item.params}
                className="relative z-10 min-w-0 hover:underline"
                onClick={(e) => e.stopPropagation()}
              >
                <p className="truncate text-sm font-medium text-foreground">{item.summary}</p>
              </Link>
              <div className="relative z-10">
                <StatusLozenge status={item.status} size="sm" />
              </div>
              <button
                type="button"
                onClick={() => onUnlink(item.id)}
                className="relative z-10 rounded p-1 text-muted-foreground opacity-0 transition-opacity hover:bg-secondary hover:text-foreground group-hover/row:opacity-100 sm:opacity-100"
                aria-label={`Remove link to ${item.id}`}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {adding ? (
        <div className="space-y-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by key or summary…"
              className="h-9 pl-8 text-sm"
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  setAdding(false);
                  setQuery("");
                }
              }}
            />
          </div>
          {filtered.length > 0 ? (
            <ul className="overflow-hidden rounded-md border border-border">
              {filtered.map((ref) => {
                const isTask = ref.kind === "task";
                const workType: WorkType = isTask
                  ? ref.item.parentId
                    ? "subtask"
                    : "task"
                  : ref.item.type;
                return (
                  <li key={ref.item.id}>
                    <button
                      type="button"
                      onClick={() => handleLink(ref.item.id)}
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-secondary/80"
                    >
                      <WorkTypeIcon type={workType} className="shrink-0" />
                      <span className="shrink-0 font-mono text-xs text-primary">{ref.item.id}</span>
                      <span className="min-w-0 truncate text-foreground">{ref.item.title}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">
              {query.trim() ? "No matching work items." : "No linkable work items found."}
            </p>
          )}
          <button
            type="button"
            onClick={() => {
              setAdding(false);
              setQuery("");
            }}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Cancel
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="flex items-center gap-1.5 text-sm text-primary hover:underline"
        >
          <Link2 className="h-3.5 w-3.5" />
          Add linked work item
        </button>
      )}
    </TicketCollapsibleSection>
  );
}

function EditableTitle({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  const save = () => {
    const trimmed = draft.trim();
    if (trimmed && trimmed !== value) onChange(trimmed);
    else setDraft(value);
    setEditing(false);
  };

  const cancel = () => {
    setDraft(value);
    setEditing(false);
  };

  if (editing) {
    return (
      <Textarea
        ref={inputRef}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={save}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            save();
          }
          if (e.key === "Escape") cancel();
        }}
        rows={2}
        className="min-h-0 resize-none border-primary/30 bg-card font-display text-2xl font-semibold leading-snug text-foreground shadow-sm focus-visible:ring-primary/30 sm:text-[26px]"
      />
    );
  }

  return (
    <h1
      role="button"
      tabIndex={0}
      onClick={() => setEditing(true)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") setEditing(true);
      }}
      className="cursor-text font-display text-2xl font-semibold leading-snug text-foreground transition-colors hover:text-primary/90 sm:text-[26px]"
      title="Click to edit title"
    >
      {value}
    </h1>
  );
}

function EditableDescription({
  value,
  onChange,
  extra,
}: {
  value: string;
  onChange: (value: string) => void;
  extra?: React.ReactNode;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  useEffect(() => {
    if (editing) textareaRef.current?.focus();
  }, [editing]);

  const save = () => {
    const trimmed = draft.trim();
    if (trimmed !== value) onChange(trimmed);
    else setDraft(value);
    setEditing(false);
  };

  const cancel = () => {
    setDraft(value);
    setEditing(false);
  };

  const startEditing = () => setEditing(true);

  return (
    <section className="border-t border-border pt-4">
      <h2 className="mb-3 text-sm font-semibold text-foreground">Description</h2>
      {editing ? (
        <div>
          <Textarea
            ref={textareaRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={save}
            onKeyDown={(e) => {
              if (e.key === "Escape") cancel();
            }}
            placeholder="Add a description…"
            rows={6}
            className="min-h-[120px] resize-y border-primary/30 bg-card text-sm leading-relaxed shadow-sm focus-visible:ring-primary/30"
          />
          <p className="mt-1.5 text-xs text-muted-foreground">Click outside to save · Esc to cancel</p>
        </div>
      ) : (
        <div
          role="button"
          tabIndex={0}
          onClick={startEditing}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") startEditing();
          }}
          className="min-h-[80px] cursor-text rounded-md text-sm leading-relaxed transition-colors hover:bg-secondary/30"
          title="Click to edit description"
        >
          {value ? (
            <p className="whitespace-pre-wrap text-foreground">{value}</p>
          ) : (
            <span className="text-muted-foreground">Add a description…</span>
          )}
        </div>
      )}
      {extra && <div className="mt-4 border-t border-border/60 pt-4">{extra}</div>}
    </section>
  );
}

type TicketDetailViewProps = {
  ticketKey: string;
  title: string;
  onTitleChange: (title: string) => void;
  description: string;
  onDescriptionChange: (description: string) => void;
  descriptionExtra?: React.ReactNode;
  workType: WorkType;
  status: TaskStatus;
  onStatusChange: (status: TaskStatus) => void;
  backTo: TicketNavLink;
  prevTicket?: TicketNavLink;
  nextTicket?: TicketNavLink;
  extraPanels?: React.ReactNode;
  linkedWorkItems?: NestedTicketItem[];
  linkCandidates?: WorkItemRef[];
  onLinkWorkItem?: (targetId: string) => void;
  onUnlinkWorkItem?: (targetId: string) => void;
  sidebar: React.ReactNode;
  comments?: number;
  attachments?: number;
  attachmentsPanel?: React.ReactNode;
  createdAt?: string;
  updatedAt?: string;
};

export function TicketDetailView({
  ticketKey,
  title,
  onTitleChange,
  description,
  onDescriptionChange,
  descriptionExtra,
  workType,
  status,
  onStatusChange,
  backTo,
  prevTicket,
  nextTicket,
  extraPanels,
  linkedWorkItems,
  linkCandidates,
  onLinkWorkItem,
  onUnlinkWorkItem,
  sidebar,
  comments = 0,
  attachments = 0,
  attachmentsPanel,
  createdAt,
  updatedAt,
}: TicketDetailViewProps) {
  const [activityTab, setActivityTab] = useState<"all" | "comments" | "history">("all");

  return (
    <JiraPage className="max-w-7xl">
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_300px] lg:gap-0">
        {/* Main content — Jira left pane */}
        <div className="min-w-0 lg:pr-8">
          <TicketDetailNav
            backTo={backTo}
            ticketKey={ticketKey}
            workType={workType}
            prevTicket={prevTicket}
            nextTicket={nextTicket}
          />

          <div className="mt-5 flex items-start gap-3">
            <WorkTypeIconSquare type={workType} size="lg" className="mt-1" />
            <div className="min-w-0 flex-1">
              <EditableTitle value={title} onChange={onTitleChange} />
            </div>
          </div>

          <div className="mt-6">
            <EditableDescription
              value={description}
              onChange={onDescriptionChange}
              extra={descriptionExtra}
            />

            {extraPanels}

            {onLinkWorkItem && onUnlinkWorkItem && linkCandidates && (
              <LinkedWorkItemsSection
                items={linkedWorkItems ?? []}
                linkCandidates={linkCandidates}
                onLink={onLinkWorkItem}
                onUnlink={onUnlinkWorkItem}
              />
            )}

            {attachmentsPanel ?? <TicketAttachmentsSection count={attachments} />}

            <section className="mt-2 border-t border-border pt-4">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-foreground">Activity</h2>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <MessageSquare className="h-3.5 w-3.5" />
                    {comments}
                  </span>
                </div>
              </div>
              <JiraTabsList className="mb-4 border-b border-border pb-0">
                {(["all", "comments", "history"] as const).map((tab) => (
                  <JiraTab
                    key={tab}
                    active={activityTab === tab}
                    onClick={() => setActivityTab(tab)}
                  >
                    {tab === "all" ? "All" : tab === "comments" ? "Comments" : "History"}
                  </JiraTab>
                ))}
              </JiraTabsList>
              <Textarea
                placeholder="Add a comment…"
                className="min-h-[72px] resize-none rounded-lg border-border bg-secondary/30 text-sm"
              />
              <div className="mt-2 flex justify-end">
                <JiraBtn variant="primary" size="sm">
                  Comment
                </JiraBtn>
              </div>
              <div className="mt-4 border-t border-border pt-4">
                <div className="flex gap-3">
                  <Clock className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-foreground">
                      <span className="font-medium">System</span> created this work item
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {createdAt ? formatRelativeTime(createdAt) : "Just now"}
                    </p>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </div>

        {/* Right sidebar — Jira metadata pane */}
        <aside className="min-w-0 lg:border-l lg:border-border lg:pl-6">
          <div className="sticky top-20 space-y-4">
            {/* <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setWatching((w) => !w)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium transition-colors",
                  watching ? "text-primary" : "text-muted-foreground hover:bg-secondary",
                )}
              >
                <Eye className="h-3.5 w-3.5" />
                {watching ? "1" : "0"}
              </button>
              <JiraBtn variant="subtle" size="sm" className="h-8 gap-1.5 px-2">
                <Share2 className="h-3.5 w-3.5" />
              </JiraBtn>
              <JiraBtn variant="subtle" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </JiraBtn>
            </div> */}

            <StatusSelect
              status={status}
              onStatusChange={onStatusChange}
              variant="sidebar"
              size="md"
            />

            <Accordion type="multiple" defaultValue={["details"]} className="w-full">
              <AccordionItem value="details" className="border-border">
                <AccordionTrigger className="py-3 text-sm font-semibold hover:no-underline [&>svg]:text-muted-foreground">
                  <span className="flex items-center gap-2">
                    Details
                    <Settings2 className="h-3.5 w-3.5 text-muted-foreground" />
                  </span>
                </AccordionTrigger>
                <AccordionContent className="pb-2 pt-0">{sidebar}</AccordionContent>
              </AccordionItem>

              {/* <AccordionItem value="development" className="border-border">
                <AccordionTrigger className="py-3 text-sm font-semibold hover:no-underline [&>svg]:text-muted-foreground">
                  <span className="flex items-center gap-2">
                    Development
                    <GitBranch className="h-3.5 w-3.5 text-muted-foreground" />
                  </span>
                </AccordionTrigger>
                <AccordionContent className="pb-3 pt-0">
                  <button type="button" className="text-sm text-primary hover:underline">
                    Create branch
                  </button>
                  <p className="mt-2 text-xs text-muted-foreground">No development work linked yet.</p>
                </AccordionContent>
              </AccordionItem> */}

              {/* <AccordionItem value="automation" className="border-border">
                <AccordionTrigger className="py-3 text-sm font-semibold hover:no-underline [&>svg]:text-muted-foreground">
                  <span className="flex items-center gap-2">
                    Automation
                    <AutomationIcon className="h-3.5 w-3.5 text-muted-foreground" />
                  </span>
                </AccordionTrigger>
                <AccordionContent className="pb-3 pt-0">
                  <p className="text-xs text-muted-foreground">No recent rule executions.</p>
                </AccordionContent>
              </AccordionItem> */}
            </Accordion>

            {(createdAt || updatedAt) && (
              <div className="space-y-1 border-t border-border pt-4 text-xs text-muted-foreground">
                {createdAt && <p>Created {formatRelativeTime(createdAt)}</p>}
                {updatedAt && <p>Updated {formatRelativeTime(updatedAt)}</p>}
              </div>
            )}
          </div>
        </aside>
      </div>
    </JiraPage>
  );
}

export function StatusSelect({
  status,
  onStatusChange,
  variant = "pill",
  size = "sm",
  className,
}: {
  status: TaskStatus;
  onStatusChange: (status: TaskStatus) => void;
  variant?: "pill" | "field" | "sidebar";
  size?: "sm" | "md";
  className?: string;
}) {
  const isPill = variant === "pill";
  const isSidebar = variant === "sidebar";

  return (
    <Select value={status} onValueChange={(v) => onStatusChange(v as TaskStatus)}>
      <SelectTrigger
        className={cn(
          isPill
            ? "h-auto w-fit min-w-0 gap-1 border-0 bg-transparent p-0 shadow-none hover:opacity-90 focus:ring-0 focus-visible:ring-0 [&>svg:last-child]:hidden"
            : isSidebar
              ? "h-9 w-full justify-between rounded-md border border-primary bg-primary px-3 py-2 text-sm font-medium text-primary-foreground shadow-none hover:bg-primary-glow [&>svg:last-child]:opacity-80"
              : fieldSelectTriggerClass,
          className,
        )}
        onClick={isPill ? (e) => e.stopPropagation() : undefined}
        onPointerDown={isPill ? (e) => e.stopPropagation() : undefined}
      >
        {isSidebar ? (
          <span className="truncate">{status}</span>
        ) : (
          <StatusLozenge status={status} size={size} />
        )}
        {isPill && <ChevronDown className="h-3 w-3 shrink-0 text-muted-foreground/80" />}
      </SelectTrigger>
      <SelectContent
        className="max-h-80 min-w-[160px] p-1"
        position="popper"
        sideOffset={4}
      >
        {taskStatuses.map((s) => (
          <SelectItem
            key={s}
            value={s}
            textValue={statusLabel[s]}
            className={cn(
              "cursor-pointer rounded-md py-1.5 pl-3 pr-3 focus:bg-secondary/80",
              "data-[state=checked]:bg-primary/5",
              "[&>span:first-child]:hidden",
            )}
          >
            <StatusLozenge status={s} size="sm" />
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/** @deprecated Use StatusSelect */
export function TicketStatusSelect({
  status,
  onStatusChange,
  size = "sm",
}: {
  status: TaskStatus;
  onStatusChange: (status: TaskStatus) => void;
  size?: "sm" | "md";
}) {
  return <StatusSelect status={status} onStatusChange={onStatusChange} variant="pill" size={size} />;
}

export function TicketListHeader({
  gridClass,
  columns,
}: {
  gridClass: string;
  columns: string[];
}) {
  return (
    <div
      className={cn(
        "hidden gap-3 border-b border-border bg-secondary/40 px-4 py-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground sm:grid",
        gridClass,
      )}
    >
      {columns.map((col) => (
        <span key={col || "spacer"}>{col}</span>
      ))}
    </div>
  );
}

export function TicketKeyLink({
  ticketKey,
  to,
  params,
  size = "sm",
  className,
}: {
  ticketKey: string;
  to: string;
  params: Record<string, string>;
  size?: "sm" | "md";
  className?: string;
}) {
  return (
    <Link
      to={to}
      params={params}
      className={cn(
        "relative z-10 font-mono font-medium text-primary hover:underline",
        size === "sm" ? "text-xs" : "text-sm",
        className,
      )}
      onClick={(e) => e.stopPropagation()}
    >
      {ticketKey}
    </Link>
  );
}

export function TicketListRow({
  workType,
  ticketKey,
  summary,
  projectName,
  status,
  priority,
  createdAt,
  showTypeBadge = false,
  assigneeInitials,
  reporterInitials,
  to,
  params,
  gridClass,
  onStatusChange,
  nested = false,
}: {
  workType: WorkType;
  ticketKey: string;
  summary: string;
  projectName?: string;
  status: TaskStatus;
  priority?: Priority | string;
  createdAt?: string;
  showTypeBadge?: boolean;
  assigneeInitials: string;
  reporterInitials?: string;
  to: string;
  params: Record<string, string>;
  gridClass: string;
  onStatusChange?: (status: TaskStatus) => void;
  nested?: boolean;
}) {
  return (
    <div
      className={cn(
        "group/row relative grid grid-cols-1 gap-2 border-b border-border px-4 py-3 transition-colors last:border-0 hover:bg-secondary/50 sm:items-center sm:gap-3 sm:py-2.5",
        gridClass,
        nested && "bg-secondary/20 pl-8",
      )}
    >
      <WorkTypeIcon type={workType} className="relative z-10 hidden sm:block" />
      <TicketKeyLink ticketKey={ticketKey} to={to} params={params} />
      <Link to={to} params={params} className="relative z-10 min-w-0 hover:underline" onClick={(e) => e.stopPropagation()}>
        <p className="truncate text-sm font-medium text-foreground">{summary}</p>
        {projectName && <p className="truncate text-xs text-muted-foreground sm:hidden">{projectName}</p>}
      </Link>
      {projectName !== undefined && (
        <span className="relative z-10 hidden truncate text-xs text-muted-foreground sm:block">{projectName}</span>
      )}
      {showTypeBadge && <div className="relative z-10"><WorkTypeBadge type={workType} size="sm" /></div>}
      <div className="relative z-20">
        {onStatusChange ? (
          <StatusSelect status={status} onStatusChange={onStatusChange} variant="pill" size="sm" />
        ) : (
          <StatusLozenge status={status} size="sm" />
        )}
      </div>
      {priority !== undefined && <div className="relative z-10"><PriorityLozenge priority={priority} /></div>}
      {createdAt !== undefined && (
        <span className="relative z-10 hidden text-xs text-muted-foreground sm:block">
          {formatWorkItemDate(createdAt)}
        </span>
      )}
      {reporterInitials !== undefined && (
        <div className="relative z-10"><AssigneeAvatar initials={reporterInitials} size="sm" /></div>
      )}
      <div className="relative z-10"><AssigneeAvatar initials={assigneeInitials} size="sm" /></div>
    </div>
  );
}

export type TicketListItem = {
  id: string;
  entityKind: "task" | "issue";
  workType: WorkType;
  summary: string;
  status: TaskStatus;
  priority?: Priority | string;
  projectName?: string;
  assigneeInitials: string;
  reporterInitials?: string;
  createdAt?: string;
  to: string;
  params: Record<string, string>;
};

export type NestedTicketItem = TicketListItem;

export function NestedTicketsPanel({
  items,
  onCreate,
  onStatusChange,
}: {
  items: NestedTicketItem[];
  onCreate: () => void;
  onStatusChange?: (id: string, kind: "task" | "issue", status: TaskStatus) => void;
}) {
  const gridClass = "sm:grid-cols-[28px_88px_minmax(0,1fr)_minmax(96px,auto)_72px_32px]";

  return (
    <TicketCollapsibleSection
      title="Child work items"
      count={items.length}
      defaultOpen={items.length > 0}
      action={
        <JiraBtn variant="subtle" size="sm" className="gap-1.5" onClick={onCreate}>
          <Plus className="h-3.5 w-3.5" /> Create
        </JiraBtn>
      }
    >
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">No child tickets yet. Use Create above to add one.</p>
      ) : (
        <div className="overflow-hidden rounded-lg border border-border/60">
          <div
            className={cn(
              "hidden gap-3 border-b border-border bg-secondary/40 px-4 py-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground sm:grid",
              gridClass,
            )}
          >
            <span />
            <span>Key</span>
            <span>Summary</span>
            <span>Status</span>
            <span>Created</span>
            <span />
          </div>
          {items.map((item) => (
            <TicketListRow
              key={item.id}
              workType={item.workType}
              ticketKey={item.id}
              summary={item.summary}
              status={item.status}
              createdAt={item.createdAt}
              assigneeInitials={item.assigneeInitials}
              to={item.to}
              params={item.params}
              gridClass={gridClass}
              nested
              onStatusChange={
                onStatusChange
                  ? (status) => onStatusChange(item.id, item.entityKind, status)
                  : undefined
              }
            />
          ))}
        </div>
      )}
    </TicketCollapsibleSection>
  );
}

export const TICKET_LIST_GRID = "sm:grid-cols-[28px_88px_minmax(0,1fr)_88px_minmax(96px,auto)_72px_72px_32px]";
export const TICKET_LIST_GRID_WITH_PROJECT = "sm:grid-cols-[28px_88px_minmax(0,1fr)_120px_minmax(96px,auto)_72px_72px_32px]";
export const TICKET_LIST_GRID_FULL =
  "sm:grid-cols-[28px_88px_minmax(0,1fr)_120px_88px_minmax(96px,auto)_72px_72px_32px_32px]";

export function TicketViewToggle({
  view,
  onViewChange,
}: {
  view: "list" | "board";
  onViewChange: (view: "list" | "board") => void;
}) {
  return (
    <div className="mb-4 flex gap-1 border-b border-border">
      <button
        type="button"
        onClick={() => onViewChange("list")}
        className={cn(
          "flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-colors",
          view === "list" ? "border-b-2 border-primary text-primary" : "text-muted-foreground hover:text-foreground",
        )}
      >
        <List className="h-3.5 w-3.5" /> List
      </button>
      <button
        type="button"
        onClick={() => onViewChange("board")}
        className={cn(
          "flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-colors",
          view === "board" ? "border-b-2 border-primary text-primary" : "text-muted-foreground hover:text-foreground",
        )}
      >
        <LayoutGrid className="h-3.5 w-3.5" /> Board
      </button>
    </div>
  );
}

function listColumns({
  showProject,
  showReporter,
  showTypeBadge,
  showCreated,
}: {
  showProject: boolean;
  showReporter: boolean;
  showTypeBadge: boolean;
  showCreated: boolean;
}) {
  const cols = ["", "Key", "Summary"];
  if (showProject) cols.push("Project");
  if (showTypeBadge) cols.push("Type");
  cols.push("Status", "Priority");
  if (showCreated) cols.push("Created");
  if (showReporter) cols.push("");
  cols.push("");
  return cols;
}

function listGridClass({
  showProject,
  showReporter,
}: {
  showProject: boolean;
  showReporter: boolean;
}) {
  if (showProject && showReporter) return TICKET_LIST_GRID_FULL;
  if (showProject) return TICKET_LIST_GRID_WITH_PROJECT;
  return TICKET_LIST_GRID;
}

export function TicketListView({
  items,
  showProject = false,
  showReporter = false,
  showTypeBadge = true,
  showCreated = true,
  groupByStatus = false,
  searchable = true,
  emptyMessage = "No work items yet.",
  emptyAction,
  onStatusChange,
}: {
  items: TicketListItem[];
  showProject?: boolean;
  showReporter?: boolean;
  showTypeBadge?: boolean;
  showCreated?: boolean;
  groupByStatus?: boolean;
  searchable?: boolean;
  emptyMessage?: string;
  emptyAction?: React.ReactNode;
  onStatusChange?: (id: string, kind: "task" | "issue", status: TaskStatus) => void;
}) {
  const [query, setQuery] = useState("");
  const gridClass = listGridClass({ showProject, showReporter });
  const columns = listColumns({ showProject, showReporter, showTypeBadge, showCreated });

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (item) =>
        item.id.toLowerCase().includes(q) ||
        item.summary.toLowerCase().includes(q) ||
        item.projectName?.toLowerCase().includes(q) ||
        item.status.toLowerCase().includes(q),
    );
  }, [items, query]);

  const renderRow = (item: TicketListItem) => (
    <TicketListRow
      key={item.id}
      workType={item.workType}
      ticketKey={item.id}
      summary={item.summary}
      projectName={showProject ? item.projectName : undefined}
      status={item.status}
      priority={item.priority}
      createdAt={showCreated ? item.createdAt : undefined}
      showTypeBadge={showTypeBadge}
      reporterInitials={showReporter ? item.reporterInitials : undefined}
      assigneeInitials={item.assigneeInitials}
      to={item.to}
      params={item.params}
      gridClass={gridClass}
      onStatusChange={
        onStatusChange
          ? (status) => onStatusChange(item.id, item.entityKind, status)
          : undefined
      }
    />
  );

  return (
    <div className="space-y-3">
      {searchable && (
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[200px] flex-1 sm:max-w-xs">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search work items…"
              className="h-9 rounded-lg border-border bg-card pl-9 text-sm"
            />
          </div>
          <span className="text-xs text-muted-foreground">
            {filtered.length} of {items.length} items
          </span>
        </div>
      )}

      <JiraPanel noPadding>
        {filtered.length === 0 ? (
          <JiraEmpty message={items.length === 0 ? emptyMessage : "No items match your search."} action={emptyAction} />
        ) : groupByStatus ? (
          taskStatuses.map((status) => {
            const group = filtered.filter((item) => item.status === status);
            if (group.length === 0) return null;
            return (
              <div key={status}>
                <div className="flex items-center gap-2 border-b border-border bg-secondary/30 px-4 py-2">
                  <StatusLozenge status={status} />
                  <span className="text-xs tabular-nums text-muted-foreground">{group.length}</span>
                </div>
                <TicketListHeader gridClass={gridClass} columns={columns} />
                {group.map(renderRow)}
              </div>
            );
          })
        ) : (
          <>
            <TicketListHeader gridClass={gridClass} columns={columns} />
            {filtered.map(renderRow)}
          </>
        )}
      </JiraPanel>
    </div>
  );
}
