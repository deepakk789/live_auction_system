import { BrowserRouter, Routes, Route } from "react-router-dom";

import OrganizerSetup from "./pages/OrganizerSetup";
import UploadPlayers from "./pages/UploadPlayers";
import OrganizerLive from "./pages/OrganizerLive";
import ViewerLive from "./pages/ViewerLive";
import DrinksBreak from "./pages/DrinksBreak";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<OrganizerSetup />} />
        <Route path="/organizer/upload" element={<UploadPlayers />} />
        <Route path="/organizer/live" element={<OrganizerLive />} />
        <Route path="/viewer/:auctionId" element={<ViewerLive />} />
        <Route path="/break/:auctionId" element={<DrinksBreak />} />
        <Route path="/organizer/teams" element={<DrinksBreak />} />

      </Routes>
    </BrowserRouter>
  );
}

export default App;
