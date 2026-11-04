import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from "@tanstack/react-query"
import { queryClientInstance } from "@/lib/query-client"
import { HashRouter as Router, Route, Routes } from "react-router-dom"
import PageNotFound from "@/lib/PageNotFound"
import ScrollToTop from "@/components/ScrollToTop"
import Home from "@/pages/Home"
import Game from "@/pages/Game"
import Shop from "@/pages/Shop"
import MapsPage from "@/pages/MapsPage"
import FieldIndex from "@/pages/FieldIndex"
import SettingsPage from "@/pages/SettingsPage"
import Credits from "@/pages/Credits"
import PspPage from "@/pages/PspPage"

export default function App() {
  return (
    <QueryClientProvider client={queryClientInstance}>
      <Router>
        <ScrollToTop />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/play" element={<Game />} />
          <Route path="/shop" element={<Shop />} />
          <Route path="/maps" element={<MapsPage />} />
          <Route path="/field-index" element={<FieldIndex />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/credits" element={<Credits />} />
          <Route path="/psp" element={<PspPage />} />
          <Route path="*" element={<PageNotFound />} />
        </Routes>
      </Router>
      <Toaster />
    </QueryClientProvider>
  )
}
