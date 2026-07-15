import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, Paperclip, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import type { TicketAttachment } from "@/lib/data";
import { isSupabaseConfigured } from "@/lib/supabase";
import { uploadTicketAttachment } from "@/lib/storage";
import { deleteTicketAttachmentInDb, fetchTicketAttachments } from "@/lib/workspace-db";
import { useWorkspace } from "@/lib/workspace-store";

type TicketAttachmentsPanelProps = {
  ticketId: string;
  projectKey: string;
  entityKind: "task" | "issue";
};

export function TicketAttachmentsPanel({ ticketId, projectKey, entityKind }: TicketAttachmentsPanelProps) {
  const { tasks, updateTask } = useWorkspace();
  const [attachments, setAttachments] = useState<TicketAttachment[]>([]);
  const [loading, setLoading] = useState(isSupabaseConfigured);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const syncCount = useCallback(
    (count: number) => {
      if (entityKind === "task") {
        updateTask(ticketId, { attachments: count });
      }
    },
    [entityKind, ticketId, updateTask],
  );

  const loadAttachments = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }
    try {
      const data = await fetchTicketAttachments(ticketId);
      setAttachments(data);
      syncCount(data.length);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [ticketId, syncCount]);

  useEffect(() => {
    void loadAttachments();
  }, [loadAttachments]);

  async function handleUpload(file: File) {
    if (!isSupabaseConfigured) {
      toast.error("Supabase is not configured");
      return;
    }
    setUploading(true);
    try {
      await uploadTicketAttachment(file, ticketId, projectKey);
      await loadAttachments();
      toast.success("Attachment uploaded");
    } catch (error) {
      toast.error("Upload failed", {
        description: error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(attachment: TicketAttachment) {
    try {
      await deleteTicketAttachmentInDb(attachment.id, attachment.filePath);
      const next = attachments.filter((a) => a.id !== attachment.id);
      setAttachments(next);
      syncCount(next.length);
      toast.success("Attachment deleted");
    } catch (error) {
      toast.error("Delete failed", {
        description: error instanceof Error ? error.message : "Please try again.",
      });
    }
  }

  const storedCount =
    entityKind === "task"
      ? tasks.find((t) => t.id === ticketId)?.attachments ?? attachments.length
      : attachments.length;

  return (
    <section className="border-t border-border pt-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground">
          Attachments
          {storedCount > 0 && (
            <span className="ml-2 text-xs font-normal tabular-nums text-muted-foreground">{storedCount}</span>
          )}
        </h2>
        <button
          type="button"
          className="rounded-md p-1 text-muted-foreground hover:bg-secondary hover:text-foreground disabled:opacity-50"
          aria-label="Add attachment"
          disabled={uploading || !isSupabaseConfigured}
          onClick={() => inputRef.current?.click()}
        >
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
        </button>
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void handleUpload(file);
            e.target.value = "";
          }}
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-6">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : attachments.length === 0 ? (
        <div
          className="rounded-lg border border-dashed border-border bg-secondary/20 px-4 py-8 text-center"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            const file = e.dataTransfer.files[0];
            if (file) void handleUpload(file);
          }}
        >
          <Paperclip className="mx-auto mb-2 h-5 w-5 text-muted-foreground/60" />
          <p className="text-sm text-muted-foreground">Drop files to attach, or</p>
          <button
            type="button"
            className="mt-1 text-sm font-medium text-primary hover:underline"
            disabled={!isSupabaseConfigured}
            onClick={() => inputRef.current?.click()}
          >
            browse
          </button>
        </div>
      ) : (
        <ul className="space-y-2">
          {attachments.map((a) => (
            <li
              key={a.id}
              className="flex items-center gap-3 rounded-lg border border-border bg-secondary/20 px-3 py-2"
            >
              <Paperclip className="h-4 w-4 shrink-0 text-muted-foreground" />
              <a
                href={a.url}
                target="_blank"
                rel="noopener noreferrer"
                className="min-w-0 flex-1 truncate text-sm text-primary hover:underline"
              >
                {a.fileName}
              </a>
              <span className="shrink-0 text-[10px] text-muted-foreground">
                {(a.fileSize / 1024).toFixed(0)} KB
              </span>
              <button
                type="button"
                className="rounded p-1 text-muted-foreground hover:bg-secondary hover:text-destructive"
                aria-label={`Delete ${a.fileName}`}
                onClick={() => void handleDelete(a)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
