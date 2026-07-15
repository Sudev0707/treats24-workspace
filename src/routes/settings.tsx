import { createFileRoute, Link } from "@tanstack/react-router";
import { JiraBtn, JiraPage, JiraPageHeader, JiraPanel } from "@/components/jira/ui";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { AssigneeAvatar } from "@/components/jira/ui";
import { useCurrentUserDisplay } from "@/hooks/use-current-user-display";

export const Route = createFileRoute("/settings")({
  head: () => ({ meta: [{ title: "Settings — Treats24" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const display = useCurrentUserDisplay();
  return (
    <JiraPage className="max-w-3xl">
      <JiraPageHeader
        title="Settings"
        subtitle="Workspace and personal preferences"
        breadcrumbs={[{ label: "Treats24", to: "/" }, { label: "Settings" }]}
      />

      <div className="space-y-4">
        <JiraPanel title="Workspace">
          <div className="space-y-4 p-4">
            <div className="flex items-center gap-4">
              <div className="grid h-12 w-12 place-items-center rounded-md bg-primary text-lg font-bold text-primary-foreground">T</div>
              <div>
                <p className="font-medium text-jira-text">Treats24</p>
                <p className="text-xs text-jira-muted">treats24.atlassian.net</p>
              </div>
            </div>
            <Separator />
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5"><Label>Workspace name</Label><Input defaultValue="Treats24" className="h-8 rounded border-jira-border" /></div>
              <div className="space-y-1.5"><Label>URL slug</Label><Input defaultValue="treats24" className="h-8 rounded border-jira-border" /></div>
            </div>
          </div>
        </JiraPanel>

        <JiraPanel title="Profile">
          <div className="flex items-center justify-between gap-4 p-4">
            <div className="flex items-center gap-3">
              <AssigneeAvatar initials={display.initials} />
              <div>
                <p className="font-medium text-jira-text">{display.name}</p>
                <p className="text-xs text-jira-muted">{display.email}</p>
              </div>
            </div>
            <Link to="/profile" className="text-xs text-primary hover:underline">
              Manage profile →
            </Link>
          </div>
        </JiraPanel>

        <JiraPanel title="Notifications">
          <div className="divide-y divide-jira-border p-4">
            {[
              { id: "n1", label: "Task assigned to me", desc: "When someone assigns you work" },
              { id: "n2", label: "Comments", desc: "On items you watch or own" },
              { id: "n3", label: "Status changes", desc: "When issue status is updated" },
            ].map((n, i) => (
              <div key={n.id} className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
                <div>
                  <Label className="text-sm text-jira-text">{n.label}</Label>
                  <p className="text-xs text-jira-muted">{n.desc}</p>
                </div>
                <Switch defaultChecked={i < 2} />
              </div>
            ))}
          </div>
        </JiraPanel>

        <div className="flex justify-end gap-2">
          <JiraBtn variant="default">Cancel</JiraBtn>
          <JiraBtn variant="primary">Save changes</JiraBtn>
        </div>
      </div>
    </JiraPage>
  );
}
