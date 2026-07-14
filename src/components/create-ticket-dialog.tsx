import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  AtSign,
  Bold,
  ChevronDown,
  Code,
  Image,
  Italic,
  Link2,
  List,
  ListOrdered,
  Lock,
  Minus,
  Paperclip,
  Quote,
  Smile,
  Table,
  Underline,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AssigneeAvatar } from "@/components/jira/ui";
import {
  PrioritySelect,
  WorkTypeIcon,
  type WorkType,
} from "@/components/ticket/ticket-ui";
import { useWorkspace } from "@/lib/workspace-store";
import {
  CURRENT_USER_ID,
  UNASSIGNED_ID,
  members,
  findWorkItem,
  getMember,
  getProjectById,
  type Priority,
  type IssueType,
  type TaskStatus,
} from "@/lib/data";
import { cn } from "@/lib/utils";

type WorkKind = "task" | "subtask" | IssueType;

type IssueTypeOption = {
  kind: WorkKind;
  label: string;
  description: string;
  requiresParent?: boolean;
};

const issueTypeOptions: IssueTypeOption[] = [
  { kind: "task", label: "Task", description: "A small, distinct piece of work." },
  { kind: "Feature", label: "Story", description: "Functionality expressed as a user goal." },
  { kind: "Bug", label: "Bug", description: "A problem or error." },
  { kind: "Improvement", label: "Improvement", description: "An enhancement to existing functionality." },
  { kind: "Hotfix", label: "Hotfix", description: "An urgent production fix." },
  { kind: "Documentation", label: "Documentation", description: "Documentation work." },
  { kind: "subtask", label: "Sub-task", description: "Part of a larger parent work item.", requiresParent: true },
];

function issueTypeLabel(kind: WorkKind): string {
  return issueTypeOptions.find((t) => t.kind === kind)?.label ?? "Work item";
}

function workTypeForIcon(kind: WorkKind): WorkType {
  if (kind === "subtask") return "subtask";
  return kind as WorkType;
}

type CreateTicketDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultProjectId?: string;
  defaultKind?: WorkKind;
  defaultStatus?: TaskStatus;
  defaultParentId?: string;
  navigateOnCreate?: boolean;
  onCreated?: (id: string, kind: "task" | "issue") => void;
};

function CreateFieldRow({
  label,
  required,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-[108px_minmax(0,1fr)] items-start gap-3 border-b border-border/40 py-3 last:border-0">
      <span className="pt-2 text-[11px] font-semibold text-muted-foreground">
        {label}
        {required && <span className="text-destructive"> *</span>}
      </span>
      <div className="min-w-0 space-y-1">
        {children}
        {hint}
      </div>
    </div>
  );
}

function DescriptionEditor({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const tools = [
    { icon: Bold, label: "Bold" },
    { icon: Italic, label: "Italic" },
    { icon: Underline, label: "Underline" },
    { icon: List, label: "Bullet list" },
    { icon: ListOrdered, label: "Numbered list" },
    { icon: Link2, label: "Link" },
    { icon: Image, label: "Image" },
    { icon: AtSign, label: "Mention" },
    { icon: Smile, label: "Emoji" },
    { icon: Table, label: "Table" },
    { icon: Code, label: "Code" },
    { icon: Quote, label: "Quote" },
    { icon: Minus, label: "Divider" },
  ];

  return (
    <div className="overflow-hidden rounded-md border border-border bg-card">
      <div className="flex flex-wrap items-center gap-0.5 border-b border-border bg-secondary/40 px-1 py-1">
        <span className="mr-1 border-r border-border px-2 py-1 text-[11px] text-muted-foreground">Text</span>
        {tools.map(({ icon: Icon, label }) => (
          <button
            key={label}
            type="button"
            title={label}
            className="rounded p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground"
            onMouseDown={(e) => e.preventDefault()}
          >
            <Icon className="h-3.5 w-3.5" />
          </button>
        ))}
      </div>
      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Paste a description or type @ to mention…"
        className="min-h-[180px] resize-y rounded-none border-0 bg-card px-3 py-2.5 text-sm leading-relaxed shadow-none focus-visible:ring-0"
      />
    </div>
  );
}

export function CreateTicketDialog({
  open,
  onOpenChange,
  defaultProjectId,
  defaultKind = "task",
  defaultStatus = "To Do",
  defaultParentId,
  navigateOnCreate = true,
  onCreated,
}: CreateTicketDialogProps) {
  const navigate = useNavigate();
  const { projects, tasks, issues, createTask, createIssue } = useWorkspace();

  const [kind, setKind] = useState<WorkKind>(defaultParentId ? "subtask" : defaultKind);
  const [summary, setSummary] = useState("");
  const [description, setDescription] = useState("");
  const [projectId, setProjectId] = useState(defaultProjectId ?? projects[0]?.id ?? "");
  const [assigneeId, setAssigneeId] = useState(UNASSIGNED_ID);
  const [reporterId, setReporterId] = useState(CURRENT_USER_ID);
  const [priority, setPriority] = useState<Priority>("Medium");
  const [dueDate, setDueDate] = useState("");
  const [labelsInput, setLabelsInput] = useState("");
  const [createAnother, setCreateAnother] = useState(false);
  const [steps, setSteps] = useState("");
  const [expected, setExpected] = useState("");
  const [actual, setActual] = useState("");
  const [parentId, setParentId] = useState<string | undefined>(defaultParentId);

  const parentRef = useMemo(() => {
    const id = parentId ?? defaultParentId;
    return id ? findWorkItem(id, tasks, issues) : undefined;
  }, [parentId, defaultParentId, tasks, issues]);

  const parentProjectId = parentRef?.item.projectId;

  const isSubtask = Boolean(parentId ?? defaultParentId) || kind === "subtask";
  const lockedProject = Boolean(defaultProjectId || parentProjectId);
  const lockedIssueType = isSubtask;
  const project = projectId ? getProjectById(projects, projectId) : null;
  const reporter = getMember(reporterId);
  const assignee = getMember(assigneeId);
  const createsTask = kind === "task" || kind === "subtask";

  const availableIssueTypes = useMemo(
    () =>
      isSubtask
        ? issueTypeOptions.filter((t) => t.kind === "subtask")
        : issueTypeOptions.filter((t) => !t.requiresParent),
    [isSubtask],
  );

  useEffect(() => {
    if (!open) return;
    setParentId(defaultParentId);
    setKind(defaultParentId ? "subtask" : defaultKind);
    setProjectId(defaultProjectId ?? parentProjectId ?? projects[0]?.id ?? "");
    setSummary("");
    setDescription("");
    setAssigneeId(UNASSIGNED_ID);
    setReporterId(CURRENT_USER_ID);
    setPriority("Medium");
    setDueDate("");
    setLabelsInput("");
    setSteps("");
    setExpected("");
    setActual("");
    setCreateAnother(false);
  }, [open, defaultKind, defaultProjectId, defaultParentId, parentProjectId, projects]);

  const resetForm = (keepContext = false) => {
    setSummary("");
    setDescription("");
    setPriority("Medium");
    setDueDate("");
    setLabelsInput("");
    setSteps("");
    setExpected("");
    setActual("");
    setAssigneeId(UNASSIGNED_ID);
    setReporterId(CURRENT_USER_ID);
    if (!keepContext) {
      setKind(defaultParentId ? "subtask" : defaultKind);
      setProjectId(defaultProjectId ?? parentProjectId ?? projects[0]?.id ?? "");
    }
  };

  const parseLabels = () =>
    labelsInput
      .split(",")
      .map((l) => l.trim())
      .filter(Boolean);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!summary.trim() || !projectId) return;

    const assignee = assigneeId === UNASSIGNED_ID ? CURRENT_USER_ID : assigneeId;
    const effectiveParentId = parentId ?? defaultParentId;

    const taskInput = {
      title: summary.trim(),
      description: description.trim(),
      projectId,
      priority,
      status: defaultStatus,
      assigneeId: assignee,
      reporterId,
      dueDate: dueDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      labels: parseLabels(),
      parentId: effectiveParentId,
    };

    // Child work items are always created as sub-tasks linked to the parent
    if (effectiveParentId) {
      const task = createTask(taskInput);
      finishCreate(task.id, "task");
      return;
    }

    if (createsTask) {
      const task = createTask(taskInput);
      finishCreate(task.id, "task");
    } else {
      const issue = createIssue({
        title: summary.trim(),
        description: description.trim() || undefined,
        type: kind as IssueType,
        severity: priority,
        status: defaultStatus,
        projectId,
        assigneeId: assignee,
        reporterId,
        stepsToReproduce: kind === "Bug" && steps.trim() ? steps.trim() : undefined,
        expected: kind === "Bug" && expected.trim() ? expected.trim() : undefined,
        actual: kind === "Bug" && actual.trim() ? actual.trim() : undefined,
      });
      finishCreate(issue.id, "issue");
    }
  };

  const finishCreate = (id: string, entityKind: "task" | "issue") => {
    if (createAnother) {
      resetForm(true);
      return;
    }
    resetForm();
    onOpenChange(false);
    onCreated?.(id, entityKind);
    if (navigateOnCreate) {
      navigate({
        to: entityKind === "task" ? "/tasks/$taskId" : "/issues/$issueId",
        params: entityKind === "task" ? { taskId: id } : { issueId: id },
      });
    }
  };

  const canSubmit = Boolean(summary.trim() && projectId);
  const dialogTitle = isSubtask ? "Create Sub-task" : `Create ${issueTypeLabel(kind)}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "gap-0 overflow-hidden rounded-lg border-border p-0 shadow-2xl sm:max-w-[880px]",
          "[&>button]:top-3.5 [&>button]:right-3.5 [&>button]:rounded-sm [&>button]:opacity-60",
        )}
      >
        {/* Header — Jira create issue */}
        <div className="border-b border-border px-6 py-4 pr-12">
          <DialogTitle className="text-lg font-semibold text-foreground">{dialogTitle}</DialogTitle>
          <p className="mt-1 text-xs text-muted-foreground">
            Required fields are marked with an asterisk (
            <span className="text-destructive">*</span>)
          </p>
        </div>

        {/* Context bar — Project + Issue type */}
        <div className="grid border-b border-border bg-[#F7F8F9] sm:grid-cols-2">
          <div className="border-b border-border px-5 py-3 sm:border-b-0 sm:border-r">
            <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Project <span className="text-destructive">*</span>
            </p>
            {lockedProject && project ? (
              <div className="flex items-center gap-2.5">
                <div
                  className={cn(
                    "grid h-7 w-7 shrink-0 place-items-center rounded-sm text-[9px] font-bold text-white",
                    `bg-gradient-to-br ${project.color}`,
                  )}
                >
                  {project.key.slice(0, 2)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">{project.name}</p>
                  <p className="font-mono text-[11px] text-muted-foreground">{project.key}</p>
                </div>
                {defaultProjectId && <Lock className="h-3.5 w-3.5 shrink-0 text-muted-foreground/60" />}
              </div>
            ) : projects.length === 0 ? (
              <p className="text-sm text-muted-foreground">Create a project first.</p>
            ) : (
              <Select value={projectId} onValueChange={setProjectId}>
                <SelectTrigger className="h-9 border-border bg-card text-sm shadow-sm">
                  <SelectValue placeholder="Choose a project" />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      <span className="flex items-center gap-2">
                        <span
                          className={cn(
                            "grid h-5 w-5 place-items-center rounded-sm text-[8px] font-bold text-white",
                            `bg-gradient-to-br ${p.color}`,
                          )}
                        >
                          {p.key.slice(0, 2)}
                        </span>
                        <span className="font-mono text-xs text-primary">{p.key}</span>
                        {p.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="px-5 py-3">
            <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Issue Type <span className="text-destructive">*</span>
            </p>
            {lockedIssueType ? (
              <div className="flex h-9 items-center gap-2 rounded-md border border-border bg-card px-3 shadow-sm">
                <WorkTypeIcon type="task" className="h-4 w-4" />
                <span className="text-sm font-medium">Sub-task</span>
                <Lock className="ml-auto h-3.5 w-3.5 text-muted-foreground/60" />
              </div>
            ) : (
              <Select value={kind} onValueChange={(v) => setKind(v as WorkKind)}>
                <SelectTrigger className="h-9 border-border bg-card text-sm shadow-sm">
                  <SelectValue>
                    <span className="flex items-center gap-2">
                      <WorkTypeIcon type={workTypeForIcon(kind)} className="h-4 w-4" />
                      <span>{issueTypeLabel(kind)}</span>
                    </span>
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="min-w-[280px]">
                  {availableIssueTypes.map((t) => (
                    <SelectItem key={t.kind} value={t.kind} className="py-2.5">
                      <div className="flex items-start gap-2.5">
                        <WorkTypeIcon type={workTypeForIcon(t.kind)} className="mt-0.5 h-4 w-4 shrink-0" />
                        <div>
                          <p className="text-sm font-medium">{t.label}</p>
                          <p className="text-xs text-muted-foreground">{t.description}</p>
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>

        <form id="create-ticket-form" onSubmit={handleSubmit}>
          <div className="grid max-h-[min(520px,calc(85vh-220px))] overflow-y-auto lg:grid-cols-[minmax(0,1fr)_280px]">
            {/* Main fields */}
            <div className="space-y-5 border-b border-border p-6 lg:border-b-0 lg:border-r">
              <div>
                <label htmlFor="ticket-summary" className="mb-1.5 block text-xs font-semibold text-foreground">
                  Summary <span className="text-destructive">*</span>
                </label>
                <Input
                  id="ticket-summary"
                  autoFocus
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  placeholder="Enter a summary"
                  className="h-10 border-border bg-card text-sm shadow-sm"
                  required
                />
              </div>

              <div>
                <label htmlFor="ticket-desc" className="mb-1.5 block text-xs font-semibold text-foreground">
                  Description
                </label>
                <DescriptionEditor value={description} onChange={setDescription} />
              </div>

              {kind === "Bug" && (
                <div className="space-y-4 rounded-md border border-border bg-secondary/20 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Bug details
                  </p>
                  <div>
                    <label htmlFor="ticket-steps" className="mb-1.5 block text-xs font-medium text-muted-foreground">
                      Steps to reproduce
                    </label>
                    <Textarea
                      id="ticket-steps"
                      value={steps}
                      onChange={(e) => setSteps(e.target.value)}
                      placeholder={"1. Go to…\n2. Click…\n3. See error"}
                      className="min-h-[80px] resize-y border-border bg-card font-mono text-sm"
                    />
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label htmlFor="ticket-expected" className="mb-1.5 block text-xs font-medium text-muted-foreground">
                        Expected result
                      </label>
                      <Textarea
                        id="ticket-expected"
                        value={expected}
                        onChange={(e) => setExpected(e.target.value)}
                        className="min-h-[64px] resize-y border-border bg-card text-sm"
                      />
                    </div>
                    <div>
                      <label htmlFor="ticket-actual" className="mb-1.5 block text-xs font-medium text-muted-foreground">
                        Actual result
                      </label>
                      <Textarea
                        id="ticket-actual"
                        value={actual}
                        onChange={(e) => setActual(e.target.value)}
                        className="min-h-[64px] resize-y border-border bg-card text-sm"
                      />
                    </div>
                  </div>
                </div>
              )}

              <button
                type="button"
                className="flex items-center gap-2 rounded-md border border-dashed border-border px-3 py-2 text-xs text-muted-foreground hover:bg-secondary/50"
                disabled
              >
                <Paperclip className="h-3.5 w-3.5" />
                Attach files (coming soon)
              </button>
            </div>

            {/* Details sidebar — Jira right panel */}
            <aside className="bg-[#FAFBFC] p-4">
              <p className="mb-2 border-b border-border pb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Details
              </p>

              {(parentId ?? defaultParentId) && parentRef && (
                <CreateFieldRow label="Parent" required>
                  <Link
                    to={parentRef.kind === "task" ? "/tasks/$taskId" : "/issues/$issueId"}
                    params={
                      parentRef.kind === "task"
                        ? { taskId: parentRef.item.id }
                        : { issueId: parentRef.item.id }
                    }
                    className="flex min-h-9 items-center gap-2 rounded-md border border-border bg-card px-3 text-sm shadow-sm hover:bg-secondary/50"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <WorkTypeIcon
                      type={parentRef.kind === "task" ? "task" : parentRef.item.type}
                      className="h-4 w-4 shrink-0"
                    />
                    <span className="font-mono text-xs text-primary">{parentRef.item.id}</span>
                    <span className="truncate text-muted-foreground">{parentRef.item.title}</span>
                  </Link>
                </CreateFieldRow>
              )}

              <CreateFieldRow label="Assignee">
                <Select value={assigneeId} onValueChange={setAssigneeId}>
                  <SelectTrigger className="h-9 border-border bg-card text-sm shadow-sm">
                    <span className="flex items-center gap-2">
                      <AssigneeAvatar initials={assignee.avatar} size="sm" />
                      <span>{assignee.name}</span>
                    </span>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={UNASSIGNED_ID} textValue="Unassigned">
                      <span className="flex items-center gap-2 text-muted-foreground">
                        <AssigneeAvatar initials="?" size="sm" />
                        Unassigned
                      </span>
                    </SelectItem>
                    {members.map((m) => (
                      <SelectItem key={m.id} value={m.id} textValue={m.name}>
                        <span className="flex items-center gap-2">
                          <AssigneeAvatar initials={m.avatar} size="sm" />
                          {m.name}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <button
                  type="button"
                  className="text-xs text-primary hover:underline"
                  onClick={() => setAssigneeId(CURRENT_USER_ID)}
                >
                  Assign to me
                </button>
              </CreateFieldRow>

              <CreateFieldRow label="Reporter">
                <Select value={reporterId} onValueChange={setReporterId}>
                  <SelectTrigger className="h-9 border-border bg-card text-sm shadow-sm">
                    <span className="flex items-center gap-2">
                      <AssigneeAvatar initials={reporter.avatar} size="sm" />
                      <span>{reporter.name}</span>
                    </span>
                  </SelectTrigger>
                  <SelectContent>
                    {members.map((m) => (
                      <SelectItem key={m.id} value={m.id} textValue={m.name}>
                        <span className="flex items-center gap-2">
                          <AssigneeAvatar initials={m.avatar} size="sm" />
                          {m.name}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CreateFieldRow>

              <CreateFieldRow label="Priority">
                <PrioritySelect priority={priority} onPriorityChange={setPriority} variant="field" className="w-full" />
              </CreateFieldRow>

              <CreateFieldRow label="Due date">
                <Input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="h-9 border-border bg-card text-sm shadow-sm"
                />
              </CreateFieldRow>

              <CreateFieldRow label="Labels">
                <Input
                  value={labelsInput}
                  onChange={(e) => setLabelsInput(e.target.value)}
                  placeholder="Add labels separated by commas"
                  className="h-9 border-border bg-card text-sm shadow-sm"
                />
              </CreateFieldRow>

              <CreateFieldRow label="Sprint">
                <button
                  type="button"
                  className="flex h-9 w-full items-center justify-between rounded-md border border-dashed border-border bg-card px-3 text-xs text-muted-foreground shadow-sm"
                  disabled
                >
                  Select sprint
                  <ChevronDown className="h-3.5 w-3.5 opacity-50" />
                </button>
              </CreateFieldRow>

              <button
                type="button"
                className="mt-2 text-xs text-primary hover:underline disabled:opacity-50"
                disabled
              >
                Configure fields
              </button>
            </aside>
          </div>
        </form>

        {/* Footer */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border bg-[#F7F8F9] px-6 py-3">
          <label className="flex cursor-pointer items-center gap-2 text-sm text-foreground">
            <Checkbox
              checked={createAnother}
              onCheckedChange={(v) => setCreateAnother(v === true)}
              className="border-border data-[state=checked]:border-primary data-[state=checked]:bg-primary"
            />
            Create another
          </label>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              className="h-8 px-3 text-sm text-foreground hover:bg-secondary"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              form="create-ticket-form"
              className="h-8 min-w-[72px] rounded-[3px] bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary-glow"
              disabled={!canSubmit}
            >
              Create
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
