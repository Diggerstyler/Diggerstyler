import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import LandingPage from "@/pages/LandingPage";
import BestellungPage from "@/pages/BestellungPage";
import KuechePage from "@/pages/KuechePage";
import AusgabePage from "@/pages/AusgabePage";
import AdminLoginPage from "@/pages/AdminLoginPage";
import AdminDashboard from "@/pages/AdminDashboard";
import ArticleManagement from "@/pages/ArticleManagement";
import StatsPage from "@/pages/StatsPage";

function App() {
  return (
    <div className="min-h-screen bg-background noise-bg">
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/bestellung/:standId" element={<BestellungPage />} />
          <Route path="/kueche/:standId" element={<KuechePage />} />
          <Route path="/ausgabe/:standId" element={<AusgabePage />} />
          <Route path="/admin/login" element={<AdminLoginPage />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/articles" element={<ArticleManagement />} />
          <Route path="/admin/stats" element={<StatsPage />} />
        </Routes>
      </BrowserRouter>
      <Toaster position="top-right" richColors />
    </div>
  );
}

export default App;
