import { CreateTicketDialog } from "@/components/create-ticket-dialog";
import type { TaskStatus } from "@/lib/data";

type CreateTaskDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultProjectId?: string;
  defaultStatus?: TaskStatus;
  onCreated?: (taskId: string) => void;
};

/** Jira-style create task modal — uses the shared create ticket dialog. */
export function CreateTaskDialog({
  open,
  onOpenChange,
  defaultProjectId,
  defaultStatus,
  onCreated,
}: CreateTaskDialogProps) {
  return (
    <CreateTicketDialog
      open={open}
      onOpenChange={onOpenChange}
      defaultProjectId={defaultProjectId}
      defaultKind="task"
      defaultStatus={defaultStatus}
      navigateOnCreate={false}
      onCreated={(id, kind) => {
        if (kind === "task") onCreated?.(id);
      }}
    />
  );
}
