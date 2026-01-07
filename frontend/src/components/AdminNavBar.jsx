import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { 
  LayoutDashboard, Calendar, Store, Package, Box, Layers, 
  BarChart3, FileText, Settings, BookOpen,
  Download, Trash2, HelpCircle, LogOut
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

export default function AdminNavBar() {
  const navigate = useNavigate();
  const location = useLocation();

  // Split into 2 rows: 5 items each
  const row1 = ADMIN_NAV_ITEMS.slice(0, 5);
  const row2 = ADMIN_NAV_ITEMS.slice(5, 10);

  const renderButton = (item) => {
    const Icon = item.icon;
    const isActive = location.pathname === item.path;
    
    return (
      <button
        key={item.path}
        onClick={() => navigate(item.path)}
        className={`flex flex-col items-center justify-center px-2 py-1 rounded-lg transition-all min-w-[52px] ${
          isActive 
            ? "bg-yellow-500/20 text-yellow-500" 
            : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
        }`}
        title={item.label}
      >
        <Icon className="w-4 h-4" />
        <span className="text-[9px] mt-0.5 leading-tight">{item.label}</span>
      </button>
    );
  };

  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex items-center justify-center gap-0.5">
        {row1.map(renderButton)}
      </div>
      <div className="flex items-center justify-center gap-0.5">
        {row2.map(renderButton)}
      </div>
    </div>
  );
}

// Reusable Action Button Component - consistent style with nav icons
export function AdminActionButton({ icon: Icon, label, onClick, color = "default", disabled = false, testId }) {
  const colorClasses = {
    default: "text-muted-foreground hover:text-foreground hover:bg-muted/50",
    green: "text-green-500 hover:bg-green-500/10",
    red: "text-destructive hover:bg-destructive/10",
    primary: "text-primary hover:bg-primary/10",
    yellow: "text-yellow-500 hover:bg-yellow-500/10"
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      data-testid={testId}
      className={`flex flex-col items-center justify-center px-2 py-1 rounded-lg transition-all min-w-[52px] ${colorClasses[color]} disabled:opacity-50`}
      title={label}
    >
      <Icon className="w-4 h-4" />
      <span className="text-[9px] mt-0.5 leading-tight">{label}</span>
    </button>
  );
}

// Standard Admin Actions Component - for pages that need export/reset/help/logout
export function AdminActions({ 
  onExport, 
  onReset, 
  onHelp, 
  onLogout,
  isExporting = false,
  showExport = true,
  showReset = true,
  showHelp = true,
  showLogout = true
}) {
  return (
    <div className="flex flex-col gap-0.5 shrink-0">
      <div className="flex items-center gap-0.5">
        {showExport && (
          <AdminActionButton 
            icon={Download} 
            label="Export" 
            onClick={onExport} 
            color="green"
            disabled={isExporting}
            testId="export-btn"
          />
        )}
        {showReset && (
          <AdminActionButton 
            icon={Trash2} 
            label="Reset" 
            onClick={onReset} 
            color="red"
            testId="reset-btn"
          />
        )}
      </div>
      <div className="flex items-center gap-0.5">
        {showHelp && (
          <AdminActionButton 
            icon={HelpCircle} 
            label="Hilfe" 
            onClick={onHelp}
            testId="help-btn"
          />
        )}
        {showLogout && (
          <AdminActionButton 
            icon={LogOut} 
            label="Logout" 
            onClick={onLogout}
            testId="logout-btn"
          />
        )}
      </div>
    </div>
  );
}

// Export for swipe navigation
export const ADMIN_ROUTES = ADMIN_NAV_ITEMS.map(item => ({
  path: item.path,
  label: item.label
}));
