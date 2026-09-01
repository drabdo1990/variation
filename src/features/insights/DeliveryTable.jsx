import Panel from "../../components/ui/Panel.jsx";
import Pill from "../../components/ui/Pill.jsx";
import Meter from "../../components/ui/Meter.jsx";
import EmptyState from "../../components/ui/EmptyState.jsx";
import { HEALTH } from "../../data/vocab.js";
import {
  progressOf,
  healthOf,
  taskCountsOf,
  findPerson,
} from "../../lib/metrics.js";
import { longDate } from "../../lib/format.js";
import "./DeliveryTable.css";

function DeliveryTable({ projects, people, tasks }) {
  if (projects.length === 0) {
    return (
      <Panel title="Delivery detail" icon="bi-table">
        <EmptyState
          icon="bi-table"
          title="No projects to report on"
          hint="Add a project to see it broken down here."
        />
      </Panel>
    );
  }

  return (
    <Panel title="Delivery detail" icon="bi-table" padded={false}>
      <div className="dtable-scroll">
        <table className="dtable">
          <thead>
            <tr>
              <th scope="col">Project</th>
              <th scope="col">Lead</th>
              <th scope="col">Tasks</th>
              <th scope="col">Progress</th>
              <th scope="col">Health</th>
              <th scope="col">Target</th>
            </tr>
          </thead>
          <tbody>
            {projects.map((project) => {
              const health = HEALTH[healthOf(project, tasks)];
              const pct = progressOf(project, tasks);
              const counts = taskCountsOf(project, tasks);
              const lead = findPerson(people, project.leadId);

              return (
                <tr key={project.id}>
                  <th scope="row">{project.name}</th>
                  <td>{lead ? lead.name : "—"}</td>
                  <td>
                    {counts.total === 0
                      ? "—"
                      : `${counts.done}/${counts.total}`}
                  </td>
                  <td>
                    <div className="dtable-progress">
                      <Meter
                        value={pct ?? 0}
                        tone={health.tone}
                        label={`${project.name} progress`}
                      />
                      <span>{pct === null ? "—" : `${pct}%`}</span>
                    </div>
                  </td>
                  <td>
                    <Pill tone={health.tone} dot>
                      {health.label}
                    </Pill>
                  </td>
                  <td className="dtable-date">{longDate(project.targetDate)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

export default DeliveryTable;
