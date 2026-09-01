import { useMemo, useState } from "react";
import PageHeader from "../../components/ui/PageHeader.jsx";
import SegmentedControl from "../../components/ui/SegmentedControl.jsx";
import EmptyState from "../../components/ui/EmptyState.jsx";
import PersonCard from "./PersonCard.jsx";
import PersonForm from "./PersonForm.jsx";
import { GUILDS } from "../../data/vocab.js";
import { loadFor } from "../../lib/metrics.js";
import { useAppState } from "../../store/context.js";

function PeoplePage() {
  const { people, tasks } = useAppState();
  const [guild, setGuild] = useState("all");
  const [editing, setEditing] = useState(null); // null | "new" | person

  const filters = useMemo(
    () => [
      { id: "all", label: "Everyone", count: people.length },
      ...Object.entries(GUILDS)
        .map(([key, label]) => ({
          id: key,
          label,
          count: people.filter((p) => p.guild === key).length,
        }))
        .filter((f) => f.count > 0),
    ],
    [people],
  );

  // Busiest first, so anyone needing rebalancing surfaces at the top.
  const visible = useMemo(() => {
    const subset = guild === "all" ? people : people.filter((p) => p.guild === guild);
    return [...subset].sort((a, b) => loadFor(b, tasks) - loadFor(a, tasks));
  }, [guild, people, tasks]);

  const stretched = visible.filter((p) => loadFor(p, tasks) >= 85).length;

  return (
    <>
      <PageHeader
        title="People"
        lede={
          people.length === 0
            ? "Add the people on your team to start tracking workload."
            : stretched
              ? `${stretched} ${stretched === 1 ? "person is" : "people are"} at or over capacity.`
              : "Everyone has room in their current workload."
        }
      >
        <button type="button" className="btn-cadence" onClick={() => setEditing("new")}>
          <i className="bi bi-person-plus" aria-hidden="true" /> Add person
        </button>
      </PageHeader>

      <div className="stack">
        {people.length === 0 ? (
          <EmptyState
            icon="bi-people"
            title="No people yet"
            hint="Add your first teammate to see workload and availability here."
            action={
              <button type="button" className="btn-cadence" onClick={() => setEditing("new")}>
                <i className="bi bi-person-plus" aria-hidden="true" /> Add person
              </button>
            }
          />
        ) : (
          <>
            {filters.length > 2 && (
              <SegmentedControl
                options={filters}
                value={guild}
                onChange={setGuild}
                label="Filter by guild"
              />
            )}

            {visible.length === 0 ? (
              <EmptyState title="Nobody in this guild" hint="Try a different filter." />
            ) : (
              <div className="grid-cards">
                {visible.map((person) => (
                  <PersonCard
                    key={person.id}
                    person={person}
                    tasks={tasks}
                    onEdit={() => setEditing(person)}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {editing && (
        <PersonForm
          person={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
        />
      )}
    </>
  );
}

export default PeoplePage;
