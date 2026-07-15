import { Link } from "@tanstack/react-router";
import {
  LayoutGrid,
  List,
  ListOrdered,
  Bug,
  LayoutDashboard,
  Filter,
  Star,
  ChevronRight,
  StickyNote,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Project } from "@/lib/data";

export type ProjectView = "summary" | "list" | "board" | "backlog" | "issues" | "filters" | "notes";

const navItems: { id: ProjectView; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "summary", label: "Summary", icon: LayoutDashboard },
  { id: "list", label: "List", icon: List },
  { id: "board", label: "Board", icon: LayoutGrid },
  { id: "backlog", label: "Backlog", icon: ListOrdered },
  { id: "issues", label: "Issues", icon: Bug },
  { id: "notes", label: "Notes", icon: StickyNote },
  { id: "filters", label: "Filters", icon: Filter },
];

type ProjectSidebarProps = {
  project: Project;
  activeView: ProjectView;
  onViewChange: (view: ProjectView) => void;
  issueCount: number;
  taskCount: number;
  noteCount?: number;
};

export function ProjectSidebar({ project, activeView, onViewChange, issueCount, taskCount, noteCount = 0 }: ProjectSidebarProps) {
  return (
    <aside className="w-full shrink-0 lg:w-56">
      <div className="rounded-md border border-border bg-card shadow-soft lg:sticky lg:top-20">
        <div className="border-b border-border p-4">
          <div className="flex items-center gap-3">
            <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-gradient-to-br ${project.color} text-sm font-bold text-white`}>
              {project.name.slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="truncate font-display text-sm font-semibold text-foreground">{project.name}</p>
              <p className="truncate text-[11px] text-muted-foreground">
                <span className="font-mono font-medium text-primary">{project.key}</span>
                {" · "}
                {project.template.replace("-", " ")} project
              </p>
            </div>
          </div>
          <div className="mt-3 flex gap-3 text-[11px] text-muted-foreground">
            <span>{taskCount} tasks</span>
            <span>{issueCount} issues</span>
          </div>
        </div>
        <nav className="p-2">
          <p className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Planning</p>
          {navItems.map((item) => {
            const active = activeView === item.id;
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onViewChange(item.id)}
                className={cn(
                  "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors",
                  active
                    ? "bg-accent font-medium text-accent-foreground"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="flex-1 text-left">{item.label}</span>
                {item.id === "issues" && issueCount > 0 && (
                  <span className="rounded-full bg-secondary px-1.5 text-[10px] tabular-nums">{issueCount}</span>
                )}
                {item.id === "notes" && noteCount > 0 && (
                  <span className="rounded-full bg-secondary px-1.5 text-[10px] tabular-nums">{noteCount}</span>
                )}
                {active && <ChevronRight className="h-3.5 w-3.5 opacity-60" />}
              </button>
            );
          })}
        </nav>
        <div className="border-t border-border p-2">
          <Link
            to="/projects"
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs text-muted-foreground hover:bg-secondary hover:text-primary"
          >
            ← All projects
          </Link>
        </div>
      </div>
    </aside>
  );
}

export function ProjectHeaderBar({
  project,
  onCreateTicket,
}: {
  project: Project;
  onCreateTicket: () => void;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-md border border-border bg-card px-4 py-3 shadow-soft">
      <div className="flex min-w-0 items-center gap-3">
        <nav className="hidden items-center gap-1 text-xs text-muted-foreground sm:flex">
          <Link to="/projects" className="text-primary hover:underline">Projects</Link>
          <span>/</span>
          <span className="truncate font-medium text-foreground">{project.name}</span>
        </nav>
      </div>
      <div className="flex items-center gap-2">
        <button type="button" className="rounded-lg p-2 text-muted-foreground hover:bg-secondary" aria-label="Star project">
          <Star className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={onCreateTicket}
          className="inline-flex h-8 items-center gap-1.5 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground shadow-soft hover:bg-primary-glow"
        >
          Create
        </button>
      </div>
    </div>
  );
}
