import { useMemo, useState } from "react";
import PageHeader from "../../components/ui/PageHeader.jsx";
import SegmentedControl from "../../components/ui/SegmentedControl.jsx";
import EmptyState from "../../components/ui/EmptyState.jsx";
import PersonCard from "./PersonCard.jsx";
import PersonForm from "./PersonForm.jsx";
import { DEPARTMENTS } from "../../data/vocab.js";
import { useAppState } from "../../store/context.js";

function PeoplePage() {
  const { people, projects } = useAppState();
  const [department, setDepartment] = useState("all");
  const [editing, setEditing] = useState(null); // null | "new" | person

  const filters = useMemo(
    () => [
      { id: "all", label: "Everyone", count: people.length },
      ...Object.entries(DEPARTMENTS)
        .map(([key, label]) => ({
          id: key,
          label,
          count: people.filter((p) => p.department === key).length,
        }))
        .filter((f) => f.count > 0),
    ],
    [people],
  );

  const visible =
    department === "all"
      ? people
      : people.filter((p) => p.department === department);

  return (
    <>
      <PageHeader
        title="Team"
        lede={
          people.length === 0
            ? "Add the people working on your QI projects."
            : "Everyone involved, and which projects they are on."
        }
      >
        <button type="button" className="btn-primary" onClick={() => setEditing("new")}>
          <i className="bi bi-person-plus" aria-hidden="true" /> Add person
        </button>
      </PageHeader>

      <div className="stack">
        {people.length === 0 ? (
          <EmptyState
            icon="bi-people"
            title="No people yet"
            hint="Add colleagues here and you can then set a project lead and assign a team."
            action={
              <button type="button" className="btn-primary" onClick={() => setEditing("new")}>
                <i className="bi bi-person-plus" aria-hidden="true" /> Add person
              </button>
            }
          />
        ) : (
          <>
            {filters.length > 2 && (
              <SegmentedControl
                options={filters}
                value={department}
                onChange={setDepartment}
                label="Filter by department"
              />
            )}

            {visible.length === 0 ? (
              <EmptyState title="Nobody in this department" hint="Try a different filter." />
            ) : (
              <div className="grid-cards">
                {visible.map((person) => (
                  <PersonCard
                    key={person.id}
                    person={person}
                    projects={projects}
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
