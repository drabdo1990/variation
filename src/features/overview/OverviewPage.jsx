import { useState } from "react";
import PageHeader from "../../components/ui/PageHeader.jsx";
import EmptyState from "../../components/ui/EmptyState.jsx";
import SummaryTiles from "./SummaryTiles.jsx";
import SignalList from "./SignalList.jsx";
import PhaseMix from "./PhaseMix.jsx";
import ActivityFeed from "./ActivityFeed.jsx";
import CollectionDue from "./CollectionDue.jsx";
import ProjectForm from "../projects/ProjectForm.jsx";
import { portfolioSummary } from "../../lib/metrics.js";
import { greetingFor } from "../../lib/format.js";
import { sampleState } from "../../data/sample.js";
import { useAppState, useDispatch } from "../../store/context.js";

function OverviewPage() {
  const state = useAppState();
  const dispatch = useDispatch();
  const [adding, setAdding] = useState(false);

  const { projects, measures, observations, events, settings } = state;
  const firstName = (settings.userName || "there").split(" ")[0];

  if (projects.length === 0) {
    return (
      <>
        <PageHeader
          title={`${greetingFor()}, ${firstName}`}
          lede="Variation is empty. Start a QI project, or load a worked example to look around."
        />
        <EmptyState
          icon="bi-clipboard2-pulse"
          title="Let's start a project"
          hint="Give it an aim, add a family of measures, and enter your data. Variation works out the run and control charts, and tells you when something has genuinely changed rather than just wobbled."
          action={
            <>
              <button type="button" className="btn-primary" onClick={() => setAdding(true)}>
                <i className="bi bi-plus-lg" aria-hidden="true" /> New project
              </button>
              <button
                type="button"
                className="btn-quiet"
                onClick={() =>
                  dispatch({ type: "state/replace", state: sampleState(settings) })
                }
              >
                <i className="bi bi-magic" aria-hidden="true" /> Load a worked example
              </button>
            </>
          }
        />
        {adding && <ProjectForm onClose={() => setAdding(false)} />}
      </>
    );
  }

  return (
    <>
      <PageHeader
        title={`${greetingFor()}, ${firstName}`}
        lede={`${projects.length} ${projects.length === 1 ? "project" : "projects"}, ${measures.length} ${measures.length === 1 ? "measure" : "measures"}, ${observations.length} data points.`}
      >
        <button type="button" className="btn-primary" onClick={() => setAdding(true)}>
          <i className="bi bi-plus-lg" aria-hidden="true" /> New project
        </button>
      </PageHeader>

      <div className="stack">
        <SummaryTiles items={portfolioSummary(state)} />

        <div className="grid-2-1">
          <SignalList
            projects={projects}
            measures={measures}
            observations={observations}
          />
          <PhaseMix projects={projects} />
        </div>

        <div className="grid-2">
          <CollectionDue
            projects={projects}
            measures={measures}
            observations={observations}
          />
          <ActivityFeed events={events} />
        </div>
      </div>

      {adding && <ProjectForm onClose={() => setAdding(false)} />}
    </>
  );
}

export default OverviewPage;
