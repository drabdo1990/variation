import { useMemo, useRef, useState } from "react";
import PageHeader from "../../components/ui/PageHeader.jsx";
import SegmentedControl from "../../components/ui/SegmentedControl.jsx";
import EmptyState from "../../components/ui/EmptyState.jsx";
import ProjectCard from "./ProjectCard.jsx";
import ProjectForm from "./ProjectForm.jsx";
import { PROJECT_PHASES } from "../../data/vocab.js";
import { useAppState, useDispatch } from "../../store/context.js";
import "./ProjectsPage.css";

/** The only shape `project/import` knows how to read. */
const FORMAT = "variation.project.v1";

function ProjectsPage() {
  const { projects, people, measures, observations } = useAppState();
  const dispatch = useDispatch();
  const [phase, setPhase] = useState("all");
  const [adding, setAdding] = useState(false);
  const [importError, setImportError] = useState(null);
  const fileRef = useRef(null);

  /**
   * Read a project bundle back in. The counterpart to Export on the project
   * page — how a project moves between a colleague, a supervisor and a
   * second browser, in an app that deliberately has no server.
   */
  const importFile = async (event) => {
    const file = event.target.files?.[0];
    // Clear the input first, so re-picking the same file fires onChange again.
    event.target.value = "";
    if (!file) return;

    try {
      const bundle = JSON.parse(await file.text());
      if (bundle?.format !== FORMAT || !bundle.project) {
        setImportError(
          `${file.name} is not a Variation project file. Use one exported with the Export button on a project.`,
        );
        return;
      }
      dispatch({ type: "project/import", bundle });
      setImportError(null);
    } catch {
      setImportError(`${file.name} could not be read — it is not valid JSON.`);
    }
  };

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
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          onChange={importFile}
          hidden
        />
        <button
          type="button"
          className="btn-quiet"
          onClick={() => fileRef.current?.click()}
        >
          <i className="bi bi-upload" aria-hidden="true" /> Import project
        </button>
        <button type="button" className="btn-primary" onClick={() => setAdding(true)}>
          <i className="bi bi-plus-lg" aria-hidden="true" /> New project
        </button>
      </PageHeader>

      <div className="stack">
        {importError && (
          <p className="import-error" role="alert">
            <i className="bi bi-exclamation-triangle-fill" aria-hidden="true" />
            <span>{importError}</span>
            <button
              type="button"
              className="btn-quiet"
              onClick={() => setImportError(null)}
            >
              Dismiss
            </button>
          </p>
        )}
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
