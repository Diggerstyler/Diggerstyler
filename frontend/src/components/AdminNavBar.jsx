import { useNavigate, useLocation } from "react-router-dom";
import { 
  LayoutDashboard, Calendar, Store, Package, Box, Layers, 
  BarChart3, FileText, Settings, BookOpen,
  HelpCircle, LogOut
} from "lucide-react";

// Admin Navigation Items
const ADMIN_NAV_ITEMS = [
  { path: "/admin", icon: LayoutDashboard, label: "Dashboard" },
  { path: "/admin/events", icon: Calendar, label: "Event" },
  { path: "/admin/stands", icon: Store, label: "Stände" },
  { path: "/admin/articles", icon: Package, label: "Artikel" },
  { path: "/admin/stock", icon: Box, label: "Bestand" },
  { path: "/admin/stations", icon: Layers, label: "Station" },
  { path: "/admin/stats", icon: BarChart3, label: "Statistik" },
  { path: "/admin/orders", icon: FileText, label: "Bestellung" },
  { path: "/admin/settings", icon: Settings, label: "Einstell." },
  { path: "/admin/docs", icon: BookOpen, label: "Doku" },
];

/**
 * AdminNavBar - Einheitliche Navigation für alle Admin-Seiten
 * Enthält nur: Navigation + Hilfe + Logout
 * KEINE Action-Buttons (die kommen in den Main Content)
 */
export default function AdminNavBar({ onHelp, onLogout }) {
  const navigate = useNavigate();
  const location = useLocation();

  // Split into 2 rows: 5 items each
  const row1 = ADMIN_NAV_ITEMS.slice(0, 5);
  const row2 = ADMIN_NAV_ITEMS.slice(5, 10);

  const renderNavButton = (item) => {
    const Icon = item.icon;
    const isActive = location.pathname === item.path;
    
    return (
      <button
        key={item.path}
        onClick={() => navigate(item.path)}
        className={`flex flex-col items-center justify-center px-1 sm:px-2 py-1 rounded-lg transition-all min-w-[40px] sm:min-w-[52px] ${
          isActive 
            ? "bg-yellow-500/20 text-yellow-500" 
            : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
        }`}
        title={item.label}
      >
        <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        <span className="text-[8px] sm:text-[9px] mt-0.5 leading-tight truncate max-w-[38px] sm:max-w-none">{item.label}</span>
      </button>
    );
  };

  const renderActionButton = (icon: any, label: string, onClick: () => void, testId?: string) => {
    const Icon = icon;
    return (
      <button
        onClick={onClick}
        data-testid={testId}
        className="flex flex-col items-center justify-center px-1 sm:px-2 py-1 rounded-lg transition-all min-w-[40px] sm:min-w-[52px] text-muted-foreground hover:text-foreground hover:bg-muted/50"
        title={label}
      >
        <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        <span className="text-[8px] sm:text-[9px] mt-0.5 leading-tight">{label}</span>
      </button>
    );
  };

  return (
    <div className="flex items-center gap-2">
      {/* Navigation - 2 Reihen */}
      <div className="flex flex-col gap-0.5 flex-1">
        <div className="flex items-center justify-center gap-0.5">
          {row1.map(renderNavButton)}
        </div>
        <div className="flex items-center justify-center gap-0.5">
          {row2.map(renderNavButton)}
        </div>
      </div>
      
      {/* Feste Actions: Hilfe + Logout */}
      <div className="flex flex-col gap-0.5 shrink-0">
        <div className="flex items-center gap-0.5">
          {renderActionButton(HelpCircle, "Hilfe", onHelp || (() => navigate("/admin/docs")), "help-btn")}
        </div>
        <div className="flex items-center gap-0.5">
          {renderActionButton(LogOut, "Logout", onLogout || (() => {
            sessionStorage.removeItem("adminAuth");
            navigate("/");
          }), "logout-btn")}
        </div>
      </div>
    </div>
  );
}

// Export for swipe navigation
export const ADMIN_ROUTES = ADMIN_NAV_ITEMS.map(item => ({
  path: item.path,
  label: item.label
}));
