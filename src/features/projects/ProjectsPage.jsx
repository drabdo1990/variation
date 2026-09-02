import { useMemo, useState } from "react";
import PageHeader from "../../components/ui/PageHeader.jsx";
import SegmentedControl from "../../components/ui/SegmentedControl.jsx";
import EmptyState from "../../components/ui/EmptyState.jsx";
import ProjectCard from "./ProjectCard.jsx";
import ProjectForm from "./ProjectForm.jsx";
import { PROJECT_PHASES } from "../../data/vocab.js";
import { useAppState } from "../../store/context.js";

function ProjectsPage() {
  const { projects, people, measures, observations } = useAppState();
  const [phase, setPhase] = useState("all");
  const [adding, setAdding] = useState(false);

  // Only phases that actually contain something are offered as filters.
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
        title="Projects"
        lede={
          projects.length === 0
            ? "Start a quality improvement project and give it an aim."
            : "Every QI project, its phase, and whether its measures are moving."
        }
      >
        <button type="button" className="btn-primary" onClick={() => setAdding(true)}>
          <i className="bi bi-plus-lg" aria-hidden="true" /> New project
        </button>
      </PageHeader>

      <div className="stack">
        {projects.length === 0 ? (
          <EmptyState
            icon="bi-clipboard2-pulse"
            title="No projects yet"
            hint="A QI project holds an aim, a family of measures, and the PDSA cycles you run to move them. Start with the aim — what will improve, for whom, by how much, and by when."
            action={
              <button type="button" className="btn-primary" onClick={() => setAdding(true)}>
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
              <EmptyState title="Nothing in this phase" hint="Try a different filter." />
            ) : (
              <div className="grid-cards">
                {visible.map((project) => (
                  <ProjectCard
                    key={project.id}
                    project={project}
                    people={people}
                    measures={measures}
                    observations={observations}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {adding && <ProjectForm onClose={() => setAdding(false)} />}
    </>
  );
}

export default ProjectsPage;
