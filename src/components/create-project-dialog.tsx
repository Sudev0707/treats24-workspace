import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  LayoutGrid,
  Columns3,
  Bug,
  FileText,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useWorkspace } from "@/lib/workspace-store";
import {
  CURRENT_USER_ID,
  generateProjectKey,
  members,
  priorities,
  projectCategories,
  type Priority,
  type ProjectTemplate,
} from "@/lib/data";
import { cn } from "@/lib/utils";

const templates: {
  id: ProjectTemplate;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}[] = [
  {
    id: "scrum",
    label: "Scrum",
    description: "Sprints & backlog",
    icon: LayoutGrid,
    color: "text-primary bg-primary/10 border-primary/20",
  },
  {
    id: "kanban",
    label: "Kanban",
    description: "Continuous flow board",
    icon: Columns3,
    color: "text-cta bg-cta/10 border-cta/20",
  },
  {
    id: "bug-tracking",
    label: "Bug tracking",
    description: "Triage defects",
    icon: Bug,
    color: "text-destructive bg-destructive/10 border-destructive/20",
  },
  {
    id: "documentation",
    label: "Documentation",
    description: "Docs & knowledge",
    icon: FileText,
    color: "text-muted-foreground bg-secondary border-border",
  },
];

type CreateProjectDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (projectId: string) => void;
};

export function CreateProjectDialog({ open, onOpenChange, onCreated }: CreateProjectDialogProps) {
  const navigate = useNavigate();
  const { projects, createProject } = useWorkspace();

  const [template, setTemplate] = useState<ProjectTemplate>("kanban");
  const [name, setName] = useState("");
  const [key, setKey] = useState("");
  const [keyTouched, setKeyTouched] = useState(false);
  const [description, setDescription] = useState("");
  const [leadId, setLeadId] = useState(CURRENT_USER_ID);
  const [category, setCategory] = useState<(typeof projectCategories)[number]>("Software");
  const [priority, setPriority] = useState<Priority>("Medium");
  const [dueDate, setDueDate] = useState(
    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
  );
  const [memberIds, setMemberIds] = useState<string[]>([]);
  const [showMore, setShowMore] = useState(false);
  const [createAnother, setCreateAnother] = useState(false);

  const existingKeys = useMemo(() => projects.map((p) => p.key), [projects]);

  useEffect(() => {
    if (open && !keyTouched && name.trim()) {
      setKey(generateProjectKey(name, existingKeys));
    }
  }, [name, open, keyTouched, existingKeys]);

  useEffect(() => {
    if (open) {
      setTemplate("kanban");
      setLeadId(CURRENT_USER_ID);
    }
  }, [open]);

  const resetForm = () => {
    setName("");
    setKey("");
    setKeyTouched(false);
    setDescription("");
    setTemplate("kanban");
    setLeadId(CURRENT_USER_ID);
    setCategory("Software");
    setPriority("Medium");
    setDueDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10));
    setMemberIds([]);
    setShowMore(false);
  };

  const toggleMember = (id: string) => {
    setMemberIds((prev) => (prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !key.trim()) return;

    const normalizedKey = key.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 10);
    if (!normalizedKey) return;

    const project = createProject({
      name: name.trim(),
      key: normalizedKey,
      description: description.trim(),
      template,
      priority,
      dueDate,
      tags: [category.toLowerCase()],
      leadId,
      memberIds: memberIds.filter((id) => id !== leadId),
    });

    if (createAnother) {
      resetForm();
      return;
    }

    resetForm();
    onOpenChange(false);
    onCreated?.(project.id);
    navigate({ to: "/projects/$projectId", params: { projectId: project.id }, search: { view: "list" } });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 overflow-hidden rounded-xl border-border p-0 sm:max-w-[600px]">
        <div className="border-b border-border px-5 py-4">
          <DialogTitle className="font-display text-lg">Create project</DialogTitle>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Choose a template and set up your new Jira-style project
          </p>
        </div>

        <form id="create-project-form" onSubmit={handleSubmit} className="max-h-[70vh] overflow-y-auto px-5 py-4">
          <div className="mb-4">
            <Label className="text-xs text-muted-foreground">Template *</Label>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {templates.map((t) => {
                const Icon = t.icon;
                const selected = template === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTemplate(t.id)}
                    className={cn(
                      "flex items-start gap-3 rounded-xl border p-3 text-left transition-all",
                      selected ? t.color + " ring-2 ring-primary/30" : "border-border bg-card hover:bg-secondary",
                    )}
                  >
                    <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", selected ? "" : "text-muted-foreground")} />
                    <div>
                      <p className="text-sm font-medium">{t.label}</p>
                      <p className="text-[11px] text-muted-foreground">{t.description}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mb-4 grid gap-3 sm:grid-cols-[1fr_120px]">
            <div>
              <Label htmlFor="proj-name" className="text-xs text-muted-foreground">Name *</Label>
              <Input
                id="proj-name"
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Loyalty Program"
                className="mt-1.5 rounded-xl"
                required
              />
            </div>
            <div>
              <Label htmlFor="proj-key" className="text-xs text-muted-foreground">Key *</Label>
              <Input
                id="proj-key"
                value={key}
                onChange={(e) => {
                  setKeyTouched(true);
                  setKey(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 10));
                }}
                placeholder="LP"
                className="mt-1.5 rounded-xl font-mono uppercase"
                required
                maxLength={10}
              />
            </div>
          </div>

          <div className="mb-4">
            <Label className="text-xs text-muted-foreground">Project lead *</Label>
            <Select value={leadId} onValueChange={setLeadId}>
              <SelectTrigger className="mt-1.5 rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {members.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.name} · {m.role}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="mb-4">
            <Label htmlFor="proj-desc" className="text-xs text-muted-foreground">Description</Label>
            <Textarea
              id="proj-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What is this project about?"
              className="mt-1.5 min-h-[72px] rounded-xl"
            />
          </div>

          <button
            type="button"
            onClick={() => setShowMore(!showMore)}
            className="mb-3 flex items-center gap-1 text-xs font-medium text-primary hover:underline"
          >
            {showMore ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            {showMore ? "Hide fields" : "More fields (category, team, dates…)"}
          </button>

          {showMore && (
            <div className="mb-4 space-y-3 rounded-xl border border-border bg-secondary/30 p-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-xs">Category</Label>
                  <Select value={category} onValueChange={(v) => setCategory(v as typeof category)}>
                    <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {projectCategories.map((c) => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Priority</Label>
                  <Select value={priority} onValueChange={(v) => setPriority(v as Priority)}>
                    <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {priorities.map((p) => (
                        <SelectItem key={p} value={p}>{p}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Target date</Label>
                <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="rounded-xl" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Team members</Label>
                <div className="flex flex-wrap gap-2">
                  {members
                    .filter((m) => m.id !== leadId)
                    .map((m) => (
                      <label
                        key={m.id}
                        className={cn(
                          "flex cursor-pointer items-center gap-2 rounded-lg border px-2.5 py-1.5 text-xs transition-colors",
                          memberIds.includes(m.id)
                            ? "border-primary/30 bg-primary/10 text-primary"
                            : "border-border bg-card text-muted-foreground hover:bg-secondary",
                        )}
                      >
                        <Checkbox
                          checked={memberIds.includes(m.id)}
                          onCheckedChange={() => toggleMember(m.id)}
                        />
                        {m.name}
                      </label>
                    ))}
                </div>
              </div>
            </div>
          )}
        </form>

        <div className="flex items-center justify-between border-t border-border bg-secondary/30 px-5 py-3">
          <label className="flex cursor-pointer items-center gap-2 text-xs text-muted-foreground">
            <Checkbox checked={createAnother} onCheckedChange={(v) => setCreateAnother(v === true)} />
            Create another
          </label>
          <div className="flex gap-2">
            <Button type="button" variant="outline" className="rounded-xl" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              form="create-project-form"
              className="rounded-md bg-primary text-primary-foreground shadow-soft hover:bg-primary-glow"
              disabled={!name.trim() || !key.trim()}
            >
              Create project
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
