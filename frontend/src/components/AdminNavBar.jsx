import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { 
  LayoutDashboard, Calendar, Store, Package, Box, Layers, 
  BarChart3, FileText, Settings, BookOpen
} from "lucide-react";

// Admin Navigation Items
const ADMIN_NAV_ITEMS = [
  { path: "/admin", icon: LayoutDashboard, label: "Dashboard" },
  { path: "/admin/events", icon: Calendar, label: "Events" },
  { path: "/admin/stands", icon: Store, label: "Stände" },
  { path: "/admin/articles", icon: Package, label: "Artikel" },
  { path: "/admin/stock", icon: Box, label: "Bestand" },
  { path: "/admin/stations", icon: Layers, label: "Stationen" },
  { path: "/admin/stats", icon: BarChart3, label: "Statistik" },
  { path: "/admin/orders", icon: FileText, label: "Bestellungen" },
  { path: "/admin/settings", icon: Settings, label: "Einstellungen" },
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
      <Button
        key={item.path}
        variant="ghost"
        size="sm"
        onClick={() => navigate(item.path)}
        className={`h-8 w-8 p-0 rounded-lg transition-all ${
          isActive 
            ? "bg-yellow-500/20 text-yellow-500 hover:bg-yellow-500/30 hover:text-yellow-500" 
            : "text-muted-foreground hover:text-foreground"
        }`}
        title={item.label}
      >
        <Icon className="w-4 h-4" />
      </Button>
    );
  };

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-center gap-1">
        {row1.map(renderButton)}
      </div>
      <div className="flex items-center justify-center gap-1">
        {row2.map(renderButton)}
      </div>
    </div>
  );
}

// Export for swipe navigation
export const ADMIN_ROUTES = ADMIN_NAV_ITEMS.map(item => ({
  path: item.path,
  label: item.label
}));
