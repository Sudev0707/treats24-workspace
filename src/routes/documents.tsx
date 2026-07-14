import { createFileRoute } from "@tanstack/react-router";
import { Plus, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { JiraBtn, JiraEmpty, JiraPage, JiraPageHeader, JiraPanel } from "@/components/jira/ui";
import { docs } from "@/lib/data";

export const Route = createFileRoute("/documents")({
  head: () => ({ meta: [{ title: "Documents — Treats24" }] }),
  component: DocumentsPage,
});

function DocumentsPage() {
  return (
    <JiraPage>
      <JiraPageHeader
        title="Documents"
        subtitle="Team knowledge base"
        breadcrumbs={[{ label: "Treats24", to: "/" }, { label: "Documents" }]}
        actions={<JiraBtn variant="primary"><Plus className="h-4 w-4" /> Create</JiraBtn>}
      />
      <div className="relative mb-4 max-w-md">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-jira-muted" />
        <Input placeholder="Search documents…" className="h-8 rounded border-jira-border bg-jira-surface pl-9 text-sm" />
      </div>
      <JiraPanel noPadding>
        {docs.length === 0 ? (
          <JiraEmpty message="No documents yet." />
        ) : (
          docs.map((d) => (
            <div key={d.id} className="flex items-start gap-3 border-b border-jira-border px-4 py-3 last:border-0 hover:bg-jira-hover">
              <span className="text-xl">{d.icon}</span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-jira-link hover:underline">{d.title}</p>
                <p className="mt-0.5 line-clamp-2 text-xs text-jira-subtle">{d.excerpt}</p>
                <p className="mt-1 text-[10px] text-jira-muted">{d.category} · {d.author} · {d.updatedAt}</p>
              </div>
            </div>
          ))
        )}
      </JiraPanel>
    </JiraPage>
  );
}
