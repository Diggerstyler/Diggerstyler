import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import ErrorBoundary from "@/components/ErrorBoundary";
import { ThemeProvider } from "@/components/ThemeProvider";
import LandingPage from "@/pages/LandingPage";
import BestellungPage from "@/pages/BestellungPage";
import KuechePage from "@/pages/KuechePage";
import AusgabePage from "@/pages/AusgabePage";
import OneManShowPage from "@/pages/OneManShowPage";
import AdminLoginPage from "@/pages/AdminLoginPage";
import AdminDashboard from "@/pages/AdminDashboard";
import ArticleManagement from "@/pages/ArticleManagement";
import StandManagement from "@/pages/StandManagement";
import StationManagement from "@/pages/StationManagement";
import StatsPage from "@/pages/StatsPage";
import OrdersManagement from "@/pages/OrdersManagement";
import StockOverview from "@/pages/StockOverview";
import SettingsPage from "@/pages/SettingsPage";
import DocumentationPage from "@/pages/DocumentationPage";

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <div className="min-h-screen bg-background noise-bg">
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/bestellung/:standId/:standType" element={<BestellungPage />} />
              <Route path="/kueche/:standId/:standType" element={<KuechePage />} />
              <Route path="/kueche/:standId/:standType/:stationId" element={<KuechePage />} />
              <Route path="/ausgabe/:standId/:standType" element={<AusgabePage />} />
              <Route path="/onemanshow/:standId/:standType" element={<OneManShowPage />} />
              <Route path="/admin/login" element={<AdminLoginPage />} />
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/admin/articles" element={<ArticleManagement />} />
              <Route path="/admin/stands" element={<StandManagement />} />
              <Route path="/admin/stations" element={<StationManagement />} />
              <Route path="/admin/stats" element={<StatsPage />} />
              <Route path="/admin/orders" element={<OrdersManagement />} />
              <Route path="/admin/stock" element={<StockOverview />} />
              <Route path="/admin/settings" element={<SettingsPage />} />
              <Route path="/admin/docs" element={<DocumentationPage />} />
            </Routes>
          </BrowserRouter>
          <Toaster position="top-right" richColors />
        </div>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
