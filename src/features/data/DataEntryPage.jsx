import { useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import PageHeader from "../../components/ui/PageHeader.jsx";
import Panel from "../../components/ui/Panel.jsx";
import EmptyState from "../../components/ui/EmptyState.jsx";
import DataMatrix from "./DataMatrix.jsx";
import FamilyCharts from "./FamilyCharts.jsx";
import MeasureForm from "../measures/MeasureForm.jsx";
import { DEPARTMENTS } from "../../data/vocab.js";
import { measuresOf, cyclesOf } from "../../lib/metrics.js";
import { collectPeriods } from "../../lib/matrix.js";
import { useAppState } from "../../store/context.js";

/**
 * Data entry and the charts it feeds, on one screen.
 *
 * Keeping them together is the point: you type a month's figures and watch
 * the charts redraw underneath, so a data-entry slip shows up as an obvious
 * spike while you still remember what you typed.
 */
function DataEntryPage() {
  const state = useAppState();
  const { projectId } = useParams();

  // Periods added but not yet filled in. They only exist in the matrix
  // until a cell is typed, since an observation with no value is not data.
  const [extraPeriods, setExtraPeriods] = useState([]);
  const [hidden, setHidden] = useState(() => new Set());
  const [focusPeriod, setFocusPeriod] = useState(null);

  const project = state.projects.find((p) => p.id === projectId);

  const measures = useMemo(
    () => (project ? measuresOf(state.measures, project.id) : []),
    [project, state.measures],
  );

  const ordered = useMemo(
    () =>
      ["outcome", "process", "balancing"].flatMap((role) =>
        measures.filter((m) => m.role === role),
      ),
    [measures],
  );

  const periods = useMemo(
    () => collectPeriods(measures, state.observations, extraPeriods),
    [measures, state.observations, extraPeriods],
  );

  const [addingMeasure, setAddingMeasure] = useState(false);

  if (!project) {
    return (
      <EmptyState
        icon="bi-question-circle"
        title="Project not found"
        hint="It may have been deleted."
        action={
          <Link to="/projects" className="btn-primary">
            Back to projects
          </Link>
        }
      />
    );
  }

  const cycles = cyclesOf(state.cycles, project.id);

  /** Clicking a chart point scrolls the matrix to the row that produced it. */
  const jumpToPeriod = (period) => {
    setFocusPeriod(period);
    document
      .getElementById(`period-${period}`)
      ?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const toggleMeasure = (id) =>
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <>
      <PageHeader
        title="Data entry"
        lede={
          <>
            <Link to={`/projects/${project.id}`} className="crumb">
              {project.name}
            </Link>{" "}
            · {DEPARTMENTS[project.department]} ·{" "}
            {measures.length} {measures.length === 1 ? "measure" : "measures"},{" "}
            {periods.length} {periods.length === 1 ? "period" : "periods"}
          </>
        }
      >
        <Link to={`/projects/${project.id}`} className="btn-quiet">
          <i className="bi bi-arrow-left" aria-hidden="true" /> Back to project
        </Link>
      </PageHeader>

      <div className="stack">
        {measures.length === 0 ? (
          <EmptyState
            icon="bi-rulers"
            title="No measures to collect yet"
            hint="Add at least one measure and its column appears in the grid. A full family is an outcome measure, a process measure, and a balancing measure."
            action={
              <button
                type="button"
                className="btn-primary"
                onClick={() => setAddingMeasure(true)}
              >
                <i className="bi bi-plus-lg" aria-hidden="true" /> Add measure
              </button>
            }
          />
        ) : (
          <>
            <Panel title="Data" icon="bi-grid-3x3">
              <DataMatrix
                measures={ordered}
                observations={state.observations}
                extraPeriods={extraPeriods}
                onAddPeriod={(p) =>
                  setExtraPeriods((prev) =>
                    prev.includes(p) ? prev : [...prev, p],
                  )
                }
                onDropPeriod={(p) =>
                  setExtraPeriods((prev) => prev.filter((x) => x !== p))
                }
                focusPeriod={focusPeriod}
                onFocusPeriod={setFocusPeriod}
              />
            </Panel>

            <Panel
              title="Charts"
              icon="bi-graph-up"
              action={
                <span className="panel-note">
                  Click a point to find its row
                </span>
              }
            >
              <FamilyCharts
                project={project}
                measures={ordered}
                observations={state.observations}
                cycles={cycles}
                periods={periods}
                hidden={hidden}
                onToggle={toggleMeasure}
                onPointClick={jumpToPeriod}
              />
            </Panel>
          </>
        )}
      </div>

      {addingMeasure && (
        <MeasureForm
          projectId={project.id}
          onClose={() => setAddingMeasure(false)}
        />
      )}
    </>
  );
}

export default DataEntryPage;
