import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Bug, CheckSquare, FolderKanban, Search } from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { useWorkspace } from "@/lib/workspace-store";

type GlobalSearchProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function GlobalSearch({ open, onOpenChange }: GlobalSearchProps) {
  const navigate = useNavigate();
  const { tasks, issues, projects } = useWorkspace();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        onOpenChange(true);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, [onOpenChange]);

  const go = (to: string) => {
    onOpenChange(false);
    navigate({ to });
  };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Search tasks, issues, projects… (⌘K)" />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading="Tasks">
          {tasks.slice(0, 8).map((t) => (
            <CommandItem
              key={t.id}
              value={`${t.id} ${t.title}`}
              onSelect={() => go(`/tasks/${t.id}`)}
              className="gap-2"
            >
              <CheckSquare className="h-4 w-4 text-primary" />
              <span className="font-mono text-xs text-muted-foreground">{t.id}</span>
              <span className="truncate">{t.title}</span>
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Issues">
          {issues.slice(0, 8).map((i) => (
            <CommandItem
              key={i.id}
              value={`${i.id} ${i.title}`}
              onSelect={() => go(`/issues/${i.id}`)}
              className="gap-2"
            >
              <Bug className="h-4 w-4 text-destructive" />
              <span className="font-mono text-xs text-muted-foreground">{i.id}</span>
              <span className="truncate">{i.title}</span>
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Projects">
          {projects.map((p) => (
            <CommandItem
              key={p.id}
              value={p.name}
              onSelect={() => go(`/projects/${p.id}`)}
              className="gap-2"
            >
              <FolderKanban className="h-4 w-4 text-primary" />
              <span>{p.name}</span>
              <span className="ml-auto text-xs text-muted-foreground">{p.tags[0] ?? "Software"}</span>
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Quick actions">
          <CommandItem onSelect={() => go("/queries")} className="gap-2">
            <Search className="h-4 w-4" />
            Browse saved queries
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}

export function useGlobalSearchShortcut() {
  const [open, setOpen] = useState(false);
  return { open, setOpen };
}
