import { BrowserRouter, Routes, Route } from "react-router-dom";

import Layout from "./components/Layout";
import Home from "./pages/Home";
import LiveAuctions from "./pages/LiveAuctions";
import PastAuctions from "./pages/PastAuctions";
import AuctionAnalytics from "./pages/AuctionAnalytics";
import OrganizerSetup from "./pages/OrganizerSetup";
import UploadPlayers from "./pages/UploadPlayers";
import OrganizerLive from "./pages/OrganizerLive";
import ViewerLive from "./pages/ViewerLive";
import DrinksBreak from "./pages/DrinksBreak";
import Dashboard from "./pages/Dashboard";
import AuthPage from "./pages/AuthPage";
import ResetPassword from "./pages/ResetPassword";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/"                                element={<Home />} />
          <Route path="/login"                           element={<AuthPage />} />
          <Route path="/register"                        element={<AuthPage />} />
          <Route path="/reset-password/:token"           element={<ResetPassword />} />

          {/* Live Auctions listing */}
          <Route path="/live"                            element={<LiveAuctions />} />

          {/* Past Auctions listing → click → per-auction analytics */}
          <Route path="/past"                            element={<PastAuctions />} />
          <Route path="/past/:auctionId/analytics"       element={<AuctionAnalytics />} />

          {/* Organizer flows — scoped by auctionId */}
          <Route path="/create-auction"                  element={<OrganizerSetup />} />
          <Route path="/organizer/:auctionId/upload"     element={<UploadPlayers />} />
          <Route path="/organizer/:auctionId/live"       element={<OrganizerLive />} />
          <Route path="/organizer/:auctionId/analytics"  element={<Dashboard />} />
          <Route path="/organizer/:auctionId/teams"      element={<DrinksBreak />} />

          {/* Viewer / Break */}
          <Route path="/viewer/:auctionId"               element={<ViewerLive />} />
          <Route path="/break/:auctionId"                element={<DrinksBreak />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
