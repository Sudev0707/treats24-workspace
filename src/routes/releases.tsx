import { createFileRoute } from "@tanstack/react-router";
import { Plus, Tag } from "lucide-react";
import { JiraBtn, JiraEmpty, JiraPage, JiraPageHeader, JiraPanel } from "@/components/jira/ui";
import { releases, getProjectById, type ReleaseStatus } from "@/lib/data";
import { useWorkspace } from "@/lib/workspace-store";

export const Route = createFileRoute("/releases")({
  head: () => ({ meta: [{ title: "Releases — Treats24" }] }),
  component: ReleasesPage,
});

const statusStyle: Record<ReleaseStatus, string> = {
  Planned: "bg-muted text-muted-foreground",
  "In Development": "bg-primary/15 text-primary",
  Testing: "bg-warning/20 text-warning-foreground",
  Released: "bg-success/15 text-success",
};

function ReleasesPage() {
  const { projects } = useWorkspace();

  return (
    <JiraPage className="max-w-4xl">
      <JiraPageHeader
        title="Releases"
        subtitle="Version history and release notes"
        breadcrumbs={[{ label: "Treats24", to: "/" }, { label: "Releases" }]}
        actions={<JiraBtn variant="primary"><Plus className="h-4 w-4" /> Create version</JiraBtn>}
      />
      {releases.length === 0 ? (
        <JiraPanel>
          <JiraEmpty message="No releases yet." />
        </JiraPanel>
      ) : (
      <div className="space-y-3">
        {releases.map((r) => {
          const proj = getProjectById(projects, r.projectId);
          return (
            <JiraPanel key={r.id}>
              <div className="p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-sm font-medium text-jira-link">v{r.version}</span>
                  <span className="text-sm text-jira-text">{r.name}</span>
                  <span className={`ml-auto rounded px-1.5 py-0.5 text-[10px] font-medium ${statusStyle[r.status]}`}>{r.status}</span>
                </div>
                <div className="mt-1 flex items-center gap-2 text-xs text-jira-muted">
                  <Tag className="h-3 w-3" /> {proj.name}
                  <span>·</span>
                  {new Date(r.date).toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" })}
                </div>
                <p className="mt-3 text-sm text-jira-subtle">{r.notes}</p>
                {r.features.length > 0 && (
                  <ul className="mt-3 space-y-1 text-sm text-jira-text">
                    {r.features.map((f) => (
                      <li key={f} className="flex gap-2"><span className="text-jira-link">+</span>{f}</li>
                    ))}
                  </ul>
                )}
                {r.fixes.length > 0 && (
                  <ul className="mt-2 space-y-1 text-sm text-jira-subtle">
                    {r.fixes.map((f) => (
                      <li key={f} className="flex gap-2"><span className="text-jira-success">✓</span>{f}</li>
                    ))}
                  </ul>
                )}
              </div>
            </JiraPanel>
          );
        })}
      </div>
      )}
    </JiraPage>
  );
}
