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
  { path: "/admin/docs", icon: BookOpen, label: "Dokumentation" },
];

export default function AdminNavBar() {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <div className="flex items-center gap-1 overflow-x-auto py-1 px-1 -mx-1 scrollbar-hide">
      {ADMIN_NAV_ITEMS.map((item) => {
        const Icon = item.icon;
        const isActive = location.pathname === item.path;
        
        return (
          <Button
            key={item.path}
            variant="ghost"
            size="sm"
            onClick={() => navigate(item.path)}
            className={`h-9 w-9 p-0 shrink-0 rounded-lg transition-all ${
              isActive 
                ? "bg-yellow-500/20 text-yellow-500 hover:bg-yellow-500/30 hover:text-yellow-500" 
                : "text-muted-foreground hover:text-foreground"
            }`}
            title={item.label}
          >
            <Icon className="w-5 h-5" />
          </Button>
        );
      })}
    </div>
  );
}

// Export for swipe navigation
export const ADMIN_ROUTES = ADMIN_NAV_ITEMS.map(item => ({
  path: item.path,
  label: item.label
}));
