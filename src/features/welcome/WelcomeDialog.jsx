import { useState } from "react";
import Modal from "../../components/ui/Modal.jsx";
import Field from "../../components/ui/Field.jsx";
import { useDispatch } from "../../store/context.js";

/**
 * Shown once on first run, and again whenever the user chooses to edit
 * their name from the topbar. Variation has no accounts — this is only used
 * for the greeting.
 */
function WelcomeDialog({ current = "", onClose }) {
  const dispatch = useDispatch();
  const [name, setName] = useState(current);
  const [error, setError] = useState("");
  const firstRun = !current;

  const submit = (event) => {
    event.preventDefault();
    if (!name.trim()) {
      setError("Enter a name so the dashboard can greet you.");
      return;
    }
    dispatch({ type: "settings/update", settings: { userName: name.trim() } });
    onClose();
  };

  return (
    <Modal
      title={firstRun ? "Welcome to Variation" : "Your name"}
      // First run has nothing behind it worth returning to, so the dialog
      // offers no way out until a name is given.
      onClose={onClose}
      dismissible={!firstRun}
      size="sm"
      footer={
        <>
          {!firstRun && (
            <button type="button" className="btn-quiet" onClick={onClose}>
              Cancel
            </button>
          )}
          <button type="submit" form="welcome-form" className="btn-primary">
            {firstRun ? "Get started" : "Save"}
          </button>
        </>
      }
    >
      {firstRun && (
        <p style={{ marginTop: 0, color: "var(--c-ink-muted)" }}>
          Variation starts empty. You add your own people, projects, and tasks —
          everything is stored in this browser, nothing is sent anywhere.
        </p>
      )}

      <form id="welcome-form" onSubmit={submit} noValidate>
        <Field label="What should we call you?" required error={error}>
          {(props) => (
            <input
              {...props}
              value={name}
              onChange={(event) => {
                setName(event.target.value);
                setError("");
              }}
              placeholder="Mohamed Mansour"
              autoComplete="name"
            />
          )}
        </Field>
      </form>
    </Modal>
  );
}

export default WelcomeDialog;
