import { HashRouter, Routes, Route } from "react-router-dom";
import AppShell from "../components/layout/AppShell.jsx";
import OverviewPage from "../features/overview/OverviewPage.jsx";
import PortfolioPage from "../features/portfolio/PortfolioPage.jsx";
import PeoplePage from "../features/people/PeoplePage.jsx";
import BoardPage from "../features/board/BoardPage.jsx";
import InsightsPage from "../features/insights/InsightsPage.jsx";
import NotFoundPage from "../features/NotFoundPage.jsx";

/**
 * HashRouter (rather than BrowserRouter) so that refreshing or deep-linking
 * a route works on a static host with no server-side rewrite rules — GitHub
 * Pages in particular. URLs carry a `#`, e.g. `/#/portfolio`.
 */
function AppRouter() {
  return (
    <HashRouter>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<OverviewPage />} />
          <Route path="portfolio" element={<PortfolioPage />} />
          <Route path="people" element={<PeoplePage />} />
          <Route path="board" element={<BoardPage />} />
          <Route path="insights" element={<InsightsPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </HashRouter>
  );
}

export default AppRouter;
