import { NavLink } from "react-router-dom";
import { navItems } from "./navItems.js";
import "./SideNav.css";

/**
 * Primary navigation. On narrow screens it becomes an off-canvas drawer
 * driven by `open`; on wide screens it is always visible.
 */
function SideNav({ open, onNavigate }) {
  return (
    <>
      <div
        className={`nav-scrim ${open ? "is-open" : ""}`}
        onClick={onNavigate}
        aria-hidden="true"
      />
      <aside className={`sidenav ${open ? "is-open" : ""}`}>
        <div className="sidenav-brand">
          <span className="sidenav-mark" aria-hidden="true">
            <i className="bi bi-bar-chart-fill" />
          </span>
          <span className="sidenav-word">Cadence</span>
        </div>

        <nav aria-label="Main">
          <ul className="sidenav-list">
            {navItems.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  end={item.end}
                  onClick={onNavigate}
                  className={({ isActive }) =>
                    `sidenav-link ${isActive ? "is-active" : ""}`
                  }
                >
                  <i className={`bi ${item.icon}`} aria-hidden="true" />
                  <span>{item.label}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <p className="sidenav-foot">Cadence · v0.1.0</p>
      </aside>
    </>
  );
}

export default SideNav;
