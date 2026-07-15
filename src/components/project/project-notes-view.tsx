import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  Clock,
  FileText,
  MoreHorizontal,
  Plus,
  Search,
  StickyNote,
  Trash2,
  User,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { AssigneeAvatar, JiraBtn, JiraEmpty } from "@/components/jira/ui";
import { formatRelativeTime, formatWorkItemDate, getMember, type ProjectNote } from "@/lib/data";
import { useWorkspace } from "@/lib/workspace-store";
import { cn } from "@/lib/utils";

type ProjectNotesViewProps = {
  projectId: string;
};

function noteExcerpt(body: string): string {
  const text = body.trim();
  if (!text) return "Empty note — click to start writing";
  const line = text.split("\n").find(Boolean);
  return line ?? "Empty note — click to start writing";
}

function notePreviewDate(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const sameDay =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();
  if (sameDay) {
    return date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  }
  return formatWorkItemDate(iso);
}

export function ProjectNotesView({ projectId }: ProjectNotesViewProps) {
  const { projectNotes, createProjectNote, updateProjectNote, deleteProjectNote } = useWorkspace();
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ProjectNote | null>(null);

  const notes = useMemo(
    () =>
      projectNotes
        .filter((n) => n.projectId === projectId)
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()),
    [projectNotes, projectId],
  );

  const filteredNotes = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return notes;
    return notes.filter(
      (n) => n.title.toLowerCase().includes(q) || n.body.toLowerCase().includes(q),
    );
  }, [notes, search]);

  const selected = filteredNotes.find((n) => n.id === selectedId) ?? notes.find((n) => n.id === selectedId) ?? null;

  useEffect(() => {
    if (selectedId && !notes.some((n) => n.id === selectedId)) {
      setSelectedId(notes[0]?.id ?? null);
    }
  }, [notes, selectedId]);

  useEffect(() => {
    if (notes.length > 0 && !selectedId) {
      setSelectedId(notes[0].id);
    }
  }, [notes, selectedId]);

  useEffect(() => {
    if (selectedId && !filteredNotes.some((n) => n.id === selectedId) && filteredNotes.length > 0) {
      setSelectedId(filteredNotes[0].id);
    }
  }, [filteredNotes, selectedId]);

  function handleCreate() {
    const note = createProjectNote({ projectId, title: "Untitled note", body: "" });
    setSearch("");
    setSelectedId(note.id);
  }

  function confirmDelete() {
    if (!deleteTarget) return;
    if (selectedId === deleteTarget.id) {
      const remaining = notes.filter((n) => n.id !== deleteTarget.id);
      setSelectedId(remaining[0]?.id ?? null);
    }
    deleteProjectNote(deleteTarget.id);
    setDeleteTarget(null);
  }

  const showMobileEditor = Boolean(selectedId && selected);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-base font-semibold">Notes</h2>
          <p className="text-xs text-muted-foreground">
            Capture decisions, meeting notes, and project context
          </p>
        </div>
        <JiraBtn variant="primary" onClick={handleCreate}>
          <Plus className="h-4 w-4" /> New note
        </JiraBtn>
      </div>

      {notes.length === 0 ? (
        <div className="overflow-hidden rounded-xl border border-border/60 bg-card shadow-card">
          <div className="flex flex-col items-center px-6 py-16 text-center">
            <div className="mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-primary/10 text-primary">
              <StickyNote className="h-7 w-7" />
            </div>
            <h3 className="font-display text-lg font-semibold text-foreground">No notes yet</h3>
            <p className="mt-2 max-w-sm text-sm text-muted-foreground">
              Keep meeting summaries, decisions, and ideas in one place for this project.
            </p>
            <JiraBtn variant="primary" className="mt-6" onClick={handleCreate}>
              <Plus className="h-4 w-4" /> Create your first note
            </JiraBtn>
          </div>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border/60 bg-card shadow-card">
          <div className="flex min-h-[min(72vh,680px)] flex-col lg:flex-row">
            {/* Note list */}
            <aside
              className={cn(
                "flex w-full shrink-0 flex-col border-b border-border lg:w-[min(100%,320px)] lg:border-b-0 lg:border-r",
                showMobileEditor && "hidden lg:flex",
              )}
            >
              <div className="border-b border-border px-4 py-3">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search notes…"
                    className="h-8 border-border/80 bg-secondary/30 pl-8 text-sm shadow-none"
                  />
                </div>
                <p className="mt-2 text-[11px] text-muted-foreground">
                  {filteredNotes.length} of {notes.length} note{notes.length === 1 ? "" : "s"}
                </p>
              </div>

              <div className="flex-1 overflow-y-auto">
                {filteredNotes.length === 0 ? (
                  <JiraEmpty message="No notes match your search." />
                ) : (
                  <ul className="divide-y divide-border">
                    {filteredNotes.map((note) => {
                      const author = getMember(note.authorId);
                      const active = selectedId === note.id;
                      return (
                        <li key={note.id}>
                          <button
                            type="button"
                            onClick={() => setSelectedId(note.id)}
                            className={cn(
                              "group flex w-full gap-3 px-4 py-3.5 text-left transition-colors",
                              active
                                ? "border-l-[3px] border-l-primary bg-accent/50 pl-[13px]"
                                : "border-l-[3px] border-l-transparent hover:bg-secondary/40",
                            )}
                          >
                            <div
                              className={cn(
                                "mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg",
                                active ? "bg-primary/15 text-primary" : "bg-secondary text-muted-foreground",
                              )}
                            >
                              <FileText className="h-4 w-4" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-start justify-between gap-2">
                                <p
                                  className={cn(
                                    "truncate text-sm font-medium",
                                    active ? "text-foreground" : "text-foreground/90",
                                  )}
                                >
                                  {note.title}
                                </p>
                                <span className="shrink-0 text-[10px] tabular-nums text-muted-foreground">
                                  {notePreviewDate(note.updatedAt)}
                                </span>
                              </div>
                              <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                                {noteExcerpt(note.body)}
                              </p>
                              <div className="mt-2 flex items-center gap-1.5">
                                <AssigneeAvatar initials={author.avatar} size="sm" />
                                <span className="truncate text-[10px] text-muted-foreground">{author.name}</span>
                              </div>
                            </div>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </aside>

            {/* Editor */}
            <div
              className={cn(
                "flex min-h-[360px] min-w-0 flex-1 flex-col",
                !showMobileEditor && "hidden lg:flex",
              )}
            >
              {selected ? (
                <ProjectNoteEditor
                  key={selected.id}
                  note={selected}
                  onUpdate={(patch) => updateProjectNote(selected.id, patch)}
                  onDelete={() => setDeleteTarget(selected)}
                  onBack={() => setSelectedId(null)}
                />
              ) : (
                <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 py-16 text-center">
                  <StickyNote className="h-10 w-10 text-muted-foreground/30" />
                  <p className="text-sm text-muted-foreground">Select a note from the list to view or edit</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete note?</AlertDialogTitle>
            <AlertDialogDescription>
              &ldquo;{deleteTarget?.title}&rdquo; will be permanently removed. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function ProjectNoteEditor({
  note,
  onUpdate,
  onDelete,
  onBack,
}: {
  note: ProjectNote;
  onUpdate: (patch: Partial<ProjectNote>) => void;
  onDelete: () => void;
  onBack: () => void;
}) {
  const [title, setTitle] = useState(note.title);
  const [body, setBody] = useState(note.body);
  const [savedFlash, setSavedFlash] = useState(false);
  const titleRef = useRef<HTMLInputElement>(null);
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const author = getMember(note.authorId);
  const isNew = note.title === "Untitled note" && !note.body.trim();

  useEffect(() => {
    setTitle(note.title);
    setBody(note.body);
  }, [note.id, note.title, note.body]);

  useEffect(() => {
    if (isNew) {
      titleRef.current?.focus();
      titleRef.current?.select();
    }
  }, [note.id, isNew]);

  const flashSaved = () => {
    setSavedFlash(true);
    window.setTimeout(() => setSavedFlash(false), 1500);
  };

  const saveTitle = () => {
    const trimmed = title.trim();
    if (trimmed && trimmed !== note.title) {
      onUpdate({ title: trimmed });
      flashSaved();
    } else {
      setTitle(note.title);
    }
  };

  const saveBody = () => {
    if (body !== note.body) {
      onUpdate({ body });
      flashSaved();
    }
  };

  const wordCount = body.trim() ? body.trim().split(/\s+/).length : 0;

  return (
    <>
      <header className="flex items-center gap-2 border-b border-border px-4 py-3 sm:px-5">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground lg:hidden"
          aria-label="Back to notes"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>

        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <User className="h-3 w-3" />
            {author.name}
          </span>
          <span className="hidden h-3 w-px bg-border sm:block" />
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3 w-3" />
            Updated {formatRelativeTime(note.updatedAt)}
          </span>
          {savedFlash && (
            <span className="rounded-full bg-cta/15 px-2 py-0.5 text-[10px] font-medium text-cta">
              Saved
            </span>
          )}
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              aria-label="Note actions"
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={onDelete}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete note
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      <div className="flex flex-1 flex-col overflow-y-auto px-4 py-5 sm:px-6 sm:py-6">
        <Input
          ref={titleRef}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={saveTitle}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              saveTitle();
              bodyRef.current?.focus();
            }
          }}
          className="mb-4 h-auto border-0 bg-transparent px-0 font-display text-xl font-semibold leading-tight shadow-none placeholder:text-muted-foreground/60 focus-visible:ring-0 sm:text-2xl"
          placeholder="Note title"
        />

        <Textarea
          ref={bodyRef}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onBlur={saveBody}
          placeholder="Start writing… Use this space for meeting notes, decisions, links, or anything the team should remember."
          className="min-h-[280px] flex-1 resize-none border-0 bg-transparent px-0 py-0 text-sm leading-7 shadow-none placeholder:text-muted-foreground/50 focus-visible:ring-0 sm:min-h-[360px] sm:text-[15px]"
        />
      </div>

      <footer className="flex items-center justify-between border-t border-border px-4 py-2.5 text-[11px] text-muted-foreground sm:px-6">
        <span>
          Created {formatWorkItemDate(note.createdAt)}
        </span>
        <span className="tabular-nums">
          {wordCount} word{wordCount === 1 ? "" : "s"}
        </span>
      </footer>
    </>
  );
}
