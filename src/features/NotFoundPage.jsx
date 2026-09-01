import { Link } from "react-router-dom";
import EmptyState from "../components/ui/EmptyState.jsx";

function NotFoundPage() {
  return (
    <div style={{ paddingTop: "3rem" }}>
      <EmptyState
        icon="bi-compass"
        title="That page doesn't exist"
        hint="The link may be out of date."
      />
      <p style={{ textAlign: "center" }}>
        <Link to="/" className="btn-cadence">
          <i className="bi bi-arrow-left" aria-hidden="true" /> Back to overview
        </Link>
      </p>
    </div>
  );
}

export default NotFoundPage;
