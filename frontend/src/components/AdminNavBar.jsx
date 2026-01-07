import { useNavigate, useLocation } from "react-router-dom";
import { 
  LayoutDashboard, Calendar, Store, Package, Box, Layers, 
  BarChart3, FileText, Settings, BookOpen,
  HelpCircle, LogOut, Wifi, WifiOff
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
 * AdminNavBar - Einheitlicher Header für alle Admin-Seiten
 * Layout: Navigation (links) | Verbindungsstatus + Hilfe + Logout (rechts)
 */
export default function AdminNavBar({ onHelp, onLogout }) {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Verbindungsstatus basierend auf Browser online Status
  const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

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

  const renderActionButton = (icon, label, onClick, testId) => {
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
    <div className="flex items-center justify-between w-full">
      {/* Navigation - Links */}
      <div className="flex flex-col gap-0.5">
        <div className="flex items-center gap-0.5">
          {row1.map(renderNavButton)}
        </div>
        <div className="flex items-center gap-0.5">
          {row2.map(renderNavButton)}
        </div>
      </div>
      
      {/* Verbindungsstatus + Hilfe + Logout - Rechts */}
      <div className="flex flex-col gap-0.5 ml-auto">
        <div className="flex items-center gap-0.5">
          {/* Verbindungsstatus */}
          <div 
            className={`flex items-center gap-1.5 px-2 py-1 rounded-full ${
              isOnline ? 'bg-green-500/10' : 'bg-yellow-500/10'
            }`}
            title={isOnline ? 'Verbunden' : 'Offline'}
          >
            <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500' : 'bg-yellow-500'}`} />
            {isOnline ? (
              <Wifi className="w-3.5 h-3.5 text-green-500" />
            ) : (
              <WifiOff className="w-3.5 h-3.5 text-yellow-500" />
            )}
          </div>
          {renderActionButton(HelpCircle, "Hilfe", onHelp || (() => navigate("/admin/docs")), "help-btn")}
        </div>
        <div className="flex items-center gap-0.5 justify-end">
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
