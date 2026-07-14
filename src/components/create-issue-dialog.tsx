import { CreateTicketDialog } from "@/components/create-ticket-dialog";
import type { IssueType } from "@/lib/data";

type CreateIssueDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultProjectId?: string;
  defaultKind?: IssueType;
  onCreated?: (issueId: string) => void;
};

/** Jira-style create issue modal — uses the shared create ticket dialog. */
export function CreateIssueDialog({
  open,
  onOpenChange,
  defaultProjectId,
  defaultKind = "Bug",
  onCreated,
}: CreateIssueDialogProps) {
  return (
    <CreateTicketDialog
      open={open}
      onOpenChange={onOpenChange}
      defaultProjectId={defaultProjectId}
      defaultKind={defaultKind}
      navigateOnCreate={false}
      onCreated={(id, kind) => {
        if (kind === "issue") onCreated?.(id);
      }}
    />
  );
}
