import { useEffect, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";

// Admin Navigation Reihenfolge
const ADMIN_ROUTES = [
  { path: "/admin", label: "Dashboard" },
  { path: "/admin/events", label: "Events" },
  { path: "/admin/stands", label: "Stände" },
  { path: "/admin/articles", label: "Artikel" },
  { path: "/admin/stock", label: "Bestand" },
  { path: "/admin/stations", label: "Stationen" },
  { path: "/admin/stats", label: "Statistik" },
  { path: "/admin/orders", label: "Bestellungen" },
  { path: "/admin/settings", label: "Einstellungen" },
  { path: "/admin/docs", label: "Dokumentation" },
];

export function useAdminSwipe() {
  const navigate = useNavigate();
  const location = useLocation();
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);
  const [swiping, setSwiping] = useState(false);
  const [swipeDirection, setSwipeDirection] = useState(null);

  const currentIndex = ADMIN_ROUTES.findIndex(r => r.path === location.pathname);

  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
    setSwiping(true);
  };

  const handleTouchMove = (e) => {
    touchEndX.current = e.touches[0].clientX;
    const diff = touchStartX.current - touchEndX.current;
    if (Math.abs(diff) > 30) {
      setSwipeDirection(diff > 0 ? "left" : "right");
    }
  };

  const handleTouchEnd = () => {
    setSwiping(false);
    const diff = touchStartX.current - touchEndX.current;
    const minSwipeDistance = 80;

    if (Math.abs(diff) > minSwipeDistance && currentIndex !== -1) {
      if (diff > 0 && currentIndex < ADMIN_ROUTES.length - 1) {
        // Swipe left -> next page
        navigate(ADMIN_ROUTES[currentIndex + 1].path);
      } else if (diff < 0 && currentIndex > 0) {
        // Swipe right -> previous page
        navigate(ADMIN_ROUTES[currentIndex - 1].path);
      }
    }
    setSwipeDirection(null);
    touchStartX.current = 0;
    touchEndX.current = 0;
  };

  return {
    swipeHandlers: {
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd,
    },
    currentIndex,
    totalPages: ADMIN_ROUTES.length,
    currentLabel: ADMIN_ROUTES[currentIndex]?.label || "",
    prevLabel: currentIndex > 0 ? ADMIN_ROUTES[currentIndex - 1]?.label : null,
    nextLabel: currentIndex < ADMIN_ROUTES.length - 1 ? ADMIN_ROUTES[currentIndex + 1]?.label : null,
    swiping,
    swipeDirection,
  };
}

// Swipe Indicator Component
export function SwipeIndicator({ currentIndex, totalPages, prevLabel, nextLabel }) {
  if (currentIndex === -1) return null;
  
  return (
    <div className="flex items-center justify-center gap-2 py-2 text-xs text-muted-foreground sm:hidden">
      {prevLabel && (
        <span className="flex items-center gap-1">
          <span>←</span>
          <span className="truncate max-w-[60px]">{prevLabel}</span>
        </span>
      )}
      <div className="flex gap-1">
        {Array.from({ length: totalPages }).map((_, i) => (
          <div
            key={i}
            className={`w-1.5 h-1.5 rounded-full transition-colors ${
              i === currentIndex ? "bg-primary" : "bg-muted-foreground/30"
            }`}
          />
        ))}
      </div>
      {nextLabel && (
        <span className="flex items-center gap-1">
          <span className="truncate max-w-[60px]">{nextLabel}</span>
          <span>→</span>
        </span>
      )}
    </div>
  );
}

export default useAdminSwipe;
