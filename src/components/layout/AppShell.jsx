import { useState, useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import SideNav from "./SideNav.jsx";
import TopBar from "./TopBar.jsx";
import WelcomeDialog from "../../features/welcome/WelcomeDialog.jsx";
import { useAppState } from "../../store/context.js";
import "./AppShell.css";

function AppShell() {
  const { settings } = useAppState();
  const [navOpen, setNavOpen] = useState(false);
  const [seenPath, setSeenPath] = useState(null);
  const [editingName, setEditingName] = useState(false);
  const { pathname } = useLocation();

  // Close the mobile drawer whenever the route changes — including on
  // browser back/forward. Adjusting during render (rather than in an
  // effect) avoids a second render pass with the drawer still open.
  if (pathname !== seenPath) {
    setSeenPath(pathname);
    setNavOpen(false);
  }

  // Escape closes the drawer.
  useEffect(() => {
    if (!navOpen) return;
    const onKey = (event) => event.key === "Escape" && setNavOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [navOpen]);

  const needsName = !settings.userName;

  return (
    <div className="shell">
      <SideNav open={navOpen} onNavigate={() => setNavOpen(false)} />
      <div className="shell-main">
        <TopBar
          onMenuClick={() => setNavOpen(true)}
          onEditName={() => setEditingName(true)}
        />
        <main className="shell-content">
          <Outlet />
        </main>
      </div>

      {(needsName || editingName) && (
        <WelcomeDialog
          current={settings.userName}
          onClose={() => setEditingName(false)}
        />
      )}
    </div>
  );
}

export default AppShell;
