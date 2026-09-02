import { HashRouter, Routes, Route } from "react-router-dom";
import AppShell from "../components/layout/AppShell.jsx";
import OverviewPage from "../features/overview/OverviewPage.jsx";
import ProjectsPage from "../features/projects/ProjectsPage.jsx";
import ProjectDetailPage from "../features/projects/ProjectDetailPage.jsx";
import MeasureDetailPage from "../features/measures/MeasureDetailPage.jsx";
import PeoplePage from "../features/people/PeoplePage.jsx";
import NotFoundPage from "../features/NotFoundPage.jsx";

/**
 * HashRouter (rather than BrowserRouter) so that refreshing or deep-linking
 * a route works on a static host with no server-side rewrite rules — GitHub
 * Pages in particular. URLs carry a `#`, e.g. `/#/projects`.
 */
function AppRouter() {
  return (
    <HashRouter>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<OverviewPage />} />
          <Route path="projects" element={<ProjectsPage />} />
          <Route path="projects/:projectId" element={<ProjectDetailPage />} />
          <Route
            path="projects/:projectId/measures/:measureId"
            element={<MeasureDetailPage />}
          />
          <Route path="team" element={<PeoplePage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </HashRouter>
  );
}

export default AppRouter;
