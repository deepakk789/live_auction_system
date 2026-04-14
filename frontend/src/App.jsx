import { BrowserRouter, Routes, Route } from "react-router-dom";

import Layout from "./components/Layout";
import Home from "./pages/Home";
import LiveAuctions from "./pages/LiveAuctions";
import PastAuctions from "./pages/PastAuctions";
import OrganizerSetup from "./pages/OrganizerSetup";
import UploadPlayers from "./pages/UploadPlayers";
import OrganizerLive from "./pages/OrganizerLive";
import ViewerLive from "./pages/ViewerLive";
import DrinksBreak from "./pages/DrinksBreak";
import Dashboard from "./pages/Dashboard";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/live" element={<LiveAuctions />} />
          <Route path="/past" element={<PastAuctions />} />
          <Route path="/create-auction" element={<OrganizerSetup />} />
          <Route path="/organizer/upload" element={<UploadPlayers />} />
          <Route path="/organizer/live" element={<OrganizerLive />} />
          <Route path="/organizer/analytics" element={<Dashboard />} />
          <Route path="/organizer/teams" element={<DrinksBreak />} />
          <Route path="/viewer/:auctionId" element={<ViewerLive />} />
          <Route path="/break/:auctionId" element={<DrinksBreak />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
