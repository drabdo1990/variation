import { useMemo, useState } from "react";
import PageHeader from "../../components/ui/PageHeader.jsx";
import SegmentedControl from "../../components/ui/SegmentedControl.jsx";
import Panel from "../../components/ui/Panel.jsx";
import EmptyState from "../../components/ui/EmptyState.jsx";
import HeadlineRow from "./HeadlineRow.jsx";
import ThroughputChart from "./ThroughputChart.jsx";
import CycleTimeChart from "./CycleTimeChart.jsx";
import DeliveryTable from "./DeliveryTable.jsx";
import {
  WINDOWS,
  throughputSeries,
  cycleTimeSeries,
  headlineMetrics,
} from "../../lib/insights.js";
import { useAppState } from "../../store/context.js";

function InsightsPage() {
  const { tasks, projects, people } = useAppState();
  const [windowId, setWindowId] = useState("6m");
  const window = WINDOWS.find((w) => w.id === windowId);

  const { headlines, throughput, cycle, hasHistory } = useMemo(() => {
    const shipped = tasks.filter((task) => task.completedAt);
    return {
      headlines: headlineMetrics(tasks, projects, window),
      throughput: throughputSeries(tasks, window),
      cycle: cycleTimeSeries(tasks, window),
      hasHistory: shipped.length > 0,
    };
  }, [tasks, projects, window]);

  return (
    <>
      <PageHeader
        title="Insights"
        lede={
          tasks.length === 0
            ? "Delivery trends appear here once you have tasks moving through the board."
            : `Throughput and cycle time over the last ${window.label}.`
        }
      />

      <div className="stack">
        {tasks.length === 0 ? (
          <EmptyState
            icon="bi-graph-up"
            title="No delivery history yet"
            hint="Cadence measures throughput and cycle time from your own tasks — when they were created and when they shipped. Add tasks on the Board and move them to Shipped to start building a trend."
          />
        ) : (
          <>
            <SegmentedControl
              options={WINDOWS}
              value={windowId}
              onChange={setWindowId}
              label="Reporting window"
            />

            <HeadlineRow items={headlines} />

            {hasHistory ? (
              <div className="grid-2">
                <ThroughputChart data={throughput} />
                <CycleTimeChart data={cycle} />
              </div>
            ) : (
              <Panel title="Delivery trend" icon="bi-graph-up">
                <EmptyState
                  icon="bi-hourglass"
                  title="Nothing has shipped yet"
                  hint="Move a task to the Shipped lane and its cycle time will start plotting here."
                />
              </Panel>
            )}

            <DeliveryTable projects={projects} people={people} tasks={tasks} />
          </>
        )}
      </div>
    </>
  );
}

export default InsightsPage;
