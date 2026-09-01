import { useMemo, useState } from "react";
import PageHeader from "../../components/ui/PageHeader.jsx";
import SegmentedControl from "../../components/ui/SegmentedControl.jsx";
import EmptyState from "../../components/ui/EmptyState.jsx";
import ProjectCard from "./ProjectCard.jsx";
import ProjectForm from "./ProjectForm.jsx";
import { PROJECT_PHASES } from "../../data/vocab.js";
import { useAppState } from "../../store/context.js";

function PortfolioPage() {
  const { projects, people, tasks } = useAppState();
  const [phase, setPhase] = useState("all");
  const [editing, setEditing] = useState(null); // null | "new" | project

  // Counts come from the data, so a phase with no projects is hidden.
  const filters = useMemo(() => {
    const base = [{ id: "all", label: "All", count: projects.length }];
    const byPhase = Object.entries(PROJECT_PHASES)
      .map(([key, meta]) => ({
        id: key,
        label: meta.label,
        count: projects.filter((p) => p.phase === key).length,
      }))
      .filter((f) => f.count > 0);
    return [...base, ...byPhase];
  }, [projects]);

  const visible =
    phase === "all" ? projects : projects.filter((p) => p.phase === phase);

  return (
    <>
      <PageHeader
        title="Portfolio"
        lede={
          projects.length === 0
            ? "Create a project to start tracking delivery."
            : "Every project, its phase, and whether it is holding its date."
        }
      >
        <button
          type="button"
          className="btn-cadence"
          onClick={() => setEditing("new")}
        >
          <i className="bi bi-plus-lg" aria-hidden="true" /> New project
        </button>
      </PageHeader>

      <div className="stack">
        {projects.length === 0 ? (
          <EmptyState
            icon="bi-collection"
            title="No projects yet"
            hint="A project holds a start and target date. Add tasks to it and Cadence works out progress and whether it is on pace."
            action={
              <button
                type="button"
                className="btn-cadence"
                onClick={() => setEditing("new")}
              >
                <i className="bi bi-plus-lg" aria-hidden="true" /> New project
              </button>
            }
          />
        ) : (
          <>
            {filters.length > 2 && (
              <SegmentedControl
                options={filters}
                value={phase}
                onChange={setPhase}
                label="Filter by phase"
              />
            )}

            {visible.length === 0 ? (
              <EmptyState
                title="No projects in this phase"
                hint="Try a different filter."
              />
            ) : (
              <div className="grid-cards">
                {visible.map((project) => (
                  <ProjectCard
                    key={project.id}
                    project={project}
                    people={people}
                    tasks={tasks}
                    onEdit={() => setEditing(project)}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {editing && (
        <ProjectForm
          project={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
        />
      )}
    </>
  );
}

export default PortfolioPage;
