import { useState } from "react";
import PageHeader from "../../components/ui/PageHeader.jsx";
import EmptyState from "../../components/ui/EmptyState.jsx";
import SummaryTiles from "./SummaryTiles.jsx";
import AtRiskList from "./AtRiskList.jsx";
import PhaseMix from "./PhaseMix.jsx";
import ActivityFeed from "./ActivityFeed.jsx";
import ProjectForm from "../portfolio/ProjectForm.jsx";
import { portfolioSummary } from "../../lib/metrics.js";
import { greetingFor } from "../../lib/format.js";
import { sampleState } from "../../data/sample.js";
import { useAppState, useDispatch } from "../../store/context.js";

function OverviewPage() {
  const state = useAppState();
  const dispatch = useDispatch();
  const [adding, setAdding] = useState(false);

  const { people, projects, tasks, events, settings } = state;
  const firstName = (settings.userName || "there").split(" ")[0];
  const isEmpty = people.length === 0 && projects.length === 0;

  if (isEmpty) {
    return (
      <>
        <PageHeader
          title={`${greetingFor()}, ${firstName}`}
          lede="Cadence is empty. Add your team and projects, or load a sample to look around."
        />
        <EmptyState
          icon="bi-rocket-takeoff"
          title="Let's set up your dashboard"
          hint="Start by adding the people on your team, then create a project and break it into tasks. Progress, workload, and delivery trends are all calculated from what you enter."
          action={
            <>
              <button
                type="button"
                className="btn-cadence"
                onClick={() => setAdding(true)}
              >
                <i className="bi bi-plus-lg" aria-hidden="true" /> New project
              </button>
              <button
                type="button"
                className="btn-quiet"
                onClick={() =>
                  dispatch({ type: "state/replace", state: sampleState(settings) })
                }
              >
                <i className="bi bi-magic" aria-hidden="true" /> Load sample data
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
        lede={`${projects.length} ${projects.length === 1 ? "project" : "projects"} and ${people.length} ${people.length === 1 ? "person" : "people"} on your board.`}
      >
        <button
          type="button"
          className="btn-cadence"
          onClick={() => setAdding(true)}
        >
          <i className="bi bi-plus-lg" aria-hidden="true" /> New project
        </button>
      </PageHeader>

      <div className="stack">
        <SummaryTiles items={portfolioSummary(state)} />

        <div className="grid-2-1">
          <AtRiskList projects={projects} tasks={tasks} />
          <PhaseMix projects={projects} />
        </div>

        <ActivityFeed events={events} />
      </div>

      {adding && <ProjectForm onClose={() => setAdding(false)} />}
    </>
  );
}

export default OverviewPage;
