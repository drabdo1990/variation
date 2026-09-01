import { useState } from "react";
import Avatar from "../ui/Avatar.jsx";
import Modal from "../ui/Modal.jsx";
import { useAppState, useDispatch } from "../../store/context.js";
import "./TopBar.css";

function TopBar({ onMenuClick, onEditName }) {
  const { settings, people, projects, tasks } = useAppState();
  const dispatch = useDispatch();
  const [confirmReset, setConfirmReset] = useState(false);

  const name = settings.userName || "You";
  const hasData = people.length + projects.length + tasks.length > 0;

  return (
    <header className="topbar">
      <button
        type="button"
        className="topbar-menu"
        onClick={onMenuClick}
        aria-label="Open navigation"
      >
        <i className="bi bi-list" aria-hidden="true" />
      </button>

      <div className="topbar-search">
        <i className="bi bi-search" aria-hidden="true" />
        <input
          type="search"
          placeholder="Search projects, people, tasks"
          aria-label="Search"
        />
      </div>

      <div className="topbar-right">
        {hasData && (
          <button
            type="button"
            className="topbar-icon"
            onClick={() => setConfirmReset(true)}
            aria-label="Clear all data"
            title="Clear all data"
          >
            <i className="bi bi-arrow-counterclockwise" aria-hidden="true" />
          </button>
        )}

        <button type="button" className="topbar-user" onClick={onEditName}>
          <Avatar name={name} size={34} title={null} />
          <span className="topbar-user-text">
            <strong>{name}</strong>
            <small>Edit name</small>
          </span>
        </button>
      </div>

      {confirmReset && (
        <Modal
          title="Clear all data?"
          onClose={() => setConfirmReset(false)}
          size="sm"
        >
          <p style={{ marginTop: 0 }}>
            This deletes every person, project, and task in this browser. Your
            name is kept. This cannot be undone.
          </p>
          <div
            className="modal-foot"
            style={{ border: 0, padding: 0, marginTop: "1rem" }}
          >
            <button
              type="button"
              className="btn-quiet"
              onClick={() => setConfirmReset(false)}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn-danger"
              onClick={() => {
                dispatch({ type: "state/reset" });
                setConfirmReset(false);
              }}
            >
              <i className="bi bi-trash3" aria-hidden="true" /> Clear everything
            </button>
          </div>
        </Modal>
      )}
    </header>
  );
}

export default TopBar;
