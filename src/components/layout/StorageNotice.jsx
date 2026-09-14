import Meter from "../ui/Meter.jsx";
import { usePersistence } from "../../store/context.js";
import { formatBytes } from "../../lib/storage.js";
import "./StorageNotice.css";

/**
 * Tells the user when their data is at risk.
 *
 * This app's only store is localStorage, capped at roughly 5 MB. A failed
 * write used to be swallowed, which is the most damaging thing it could do:
 * the app carries on looking healthy while nothing is being kept. So a
 * failure is stated plainly, and the approach to the ceiling is shown early
 * enough that there is still time to export and archive.
 */
function StorageNotice() {
  const { ok, reason, crowded, percent, bytes, budget, tone } = usePersistence();

  if (ok && !crowded) return null;

  const body =
    reason === "quota" ? (
      <>
        <strong>Your changes are no longer being saved.</strong> This browser's
        storage is full, so anything you enter now will be lost when you reload.
        Export a project to keep a copy, then delete it here to free space.
      </>
    ) : reason === "serialise" ? (
      <>
        <strong>Your changes could not be saved.</strong> Export a project to
        keep a copy of your work before reloading.
      </>
    ) : !ok ? (
      <>
        <strong>This browser is not saving your data.</strong> Private browsing
        and blocked site storage both do this. Your work is held in memory only
        and will be lost when the tab closes — export anything you need to keep.
      </>
    ) : (
      <>
        <strong>Storage is {percent}% full.</strong> Once it fills, changes stop
        being saved. Export the projects you have finished with and delete them
        here to make room.
      </>
    );

  return (
    <div className={`storage-notice storage-notice-${tone}`} role="status">
      <i
        className={`bi ${ok ? "bi-exclamation-triangle-fill" : "bi-x-octagon-fill"}`}
        aria-hidden="true"
      />
      <div className="storage-notice-body">
        <p>{body}</p>
        {ok && (
          <div className="storage-notice-gauge">
            <Meter
              value={percent}
              tone={tone}
              label={`Storage used: ${percent}%`}
            />
            <small>
              {formatBytes(bytes)} of about {formatBytes(budget)}
            </small>
          </div>
        )}
      </div>
    </div>
  );
}

export default StorageNotice;
