import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useWorkspace } from "@/lib/workspace-store";
import {
  members,
  priorities,
  taskStatuses,
  type Priority,
  type TaskStatus,
  type IssueType,
  type QueryFilters,
} from "@/lib/data";

const issueTypes: IssueType[] = ["Bug", "Feature", "Improvement", "Hotfix", "Documentation"];

type CreateQueryDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultProjectId?: string;
  onCreated?: (queryId: string) => void;
};

export function CreateQueryDialog({
  open,
  onOpenChange,
  defaultProjectId,
  onCreated,
}: CreateQueryDialogProps) {
  const { projects, createQuery } = useWorkspace();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [entityType, setEntityType] = useState<"tasks" | "issues">("tasks");
  const [projectId, setProjectId] = useState<string>(defaultProjectId ?? "all");
  const [assigneeId, setAssigneeId] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [selectedStatuses, setSelectedStatuses] = useState<TaskStatus[]>([]);
  const [selectedPriorities, setSelectedPriorities] = useState<Priority[]>([]);
  const [selectedTypes, setSelectedTypes] = useState<IssueType[]>([]);

  const toggle = <T,>(arr: T[], item: T, setter: (v: T[]) => void) => {
    setter(arr.includes(item) ? arr.filter((x) => x !== item) : [...arr, item]);
  };

  const reset = () => {
    setName("");
    setDescription("");
    setEntityType("tasks");
    setProjectId(defaultProjectId ?? "all");
    setAssigneeId("all");
    setSearch("");
    setSelectedStatuses([]);
    setSelectedPriorities([]);
    setSelectedTypes([]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const filters: QueryFilters = { entityType };
    if (projectId !== "all") filters.projectId = projectId;
    if (assigneeId !== "all") filters.assigneeId = assigneeId;
    if (search.trim()) filters.search = search.trim();
    if (selectedStatuses.length) filters.status = selectedStatuses;
    if (selectedPriorities.length) filters.priority = selectedPriorities;
    if (entityType === "issues" && selectedTypes.length) filters.issueType = selectedTypes;

    const query = createQuery({
      name: name.trim(),
      description: description.trim() || undefined,
      projectId: projectId !== "all" ? projectId : defaultProjectId,
      filters,
    });
    reset();
    onOpenChange(false);
    onCreated?.(query.id);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto rounded border-jira-border sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display">Save query</DialogTitle>
          <DialogDescription>
            Create a saved filter to quickly find tasks or issues — like Jira queries.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="query-name">Query name</Label>
            <Input
              id="query-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Open critical bugs"
              className="rounded-xl"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="query-desc">Description</Label>
            <Textarea
              id="query-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="min-h-[60px] rounded-xl"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Entity type</Label>
              <Select value={entityType} onValueChange={(v) => setEntityType(v as "tasks" | "issues")}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tasks">Tasks</SelectItem>
                  <SelectItem value="issues">Issues</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Project</Label>
              <Select value={projectId} onValueChange={setProjectId}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All projects</SelectItem>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Assignee</Label>
              <Select value={assigneeId} onValueChange={setAssigneeId}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Anyone</SelectItem>
                  {members.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="query-search">Text search</Label>
            <Input
              id="query-search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search in title, ID, description…"
              className="rounded-xl"
            />
          </div>
          <div className="space-y-2">
            <Label>Status</Label>
            <div className="flex flex-wrap gap-2">
              {taskStatuses.map((s) => (
                <label key={s} className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-border px-2 py-1 text-xs">
                  <Checkbox
                    checked={selectedStatuses.includes(s)}
                    onCheckedChange={() => toggle(selectedStatuses, s, setSelectedStatuses)}
                  />
                  {s}
                </label>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <Label>Priority / Severity</Label>
            <div className="flex flex-wrap gap-2">
              {priorities.map((p) => (
                <label key={p} className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-border px-2 py-1 text-xs">
                  <Checkbox
                    checked={selectedPriorities.includes(p)}
                    onCheckedChange={() => toggle(selectedPriorities, p, setSelectedPriorities)}
                  />
                  {p}
                </label>
              ))}
            </div>
          </div>
          {entityType === "issues" && (
            <div className="space-y-2">
              <Label>Issue type</Label>
              <div className="flex flex-wrap gap-2">
                {issueTypes.map((t) => (
                  <label key={t} className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-border px-2 py-1 text-xs">
                    <Checkbox
                      checked={selectedTypes.includes(t)}
                      onCheckedChange={() => toggle(selectedTypes, t, setSelectedTypes)}
                    />
                    {t}
                  </label>
                ))}
              </div>
            </div>
          )}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" className="rounded-xl" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" className="rounded-md bg-primary text-primary-foreground shadow-soft hover:bg-primary-glow">
              Save query
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
