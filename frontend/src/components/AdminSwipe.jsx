import { useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ADMIN_ROUTES } from "./AdminNavBar";

export function useAdminSwipe() {
  const navigate = useNavigate();
  const location = useLocation();
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const touchEndX = useRef(0);
  const isHorizontalSwipe = useRef(false);
  const [swiping, setSwiping] = useState(false);
  const [swipeDirection, setSwipeDirection] = useState(null);

  const currentIndex = ADMIN_ROUTES.findIndex(r => r.path === location.pathname);

  const handleTouchStart = (e) => {
    // Ignoriere Touch auf interaktiven Elementen
    const target = e.target;
    if (target.closest('button, a, input, select, [role="button"], [data-no-swipe]')) {
      return;
    }
    
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    touchEndX.current = e.touches[0].clientX;
    isHorizontalSwipe.current = false;
    setSwiping(true);
  };

  const handleTouchMove = (e) => {
    if (!swiping) return;
    
    const target = e.target;
    if (target.closest('button, a, input, select, [role="button"], [data-no-swipe]')) {
      return;
    }
    
    touchEndX.current = e.touches[0].clientX;
    const diffX = Math.abs(touchStartX.current - touchEndX.current);
    const diffY = Math.abs(touchStartY.current - e.touches[0].clientY);
    
    // Nur horizontale Swipes zählen (mehr X als Y Bewegung)
    if (diffX > 20 && diffX > diffY * 1.5) {
      isHorizontalSwipe.current = true;
      const direction = touchStartX.current - touchEndX.current;
      setSwipeDirection(direction > 0 ? "left" : "right");
    }
  };

  const handleTouchEnd = () => {
    if (!swiping) return;
    
    setSwiping(false);
    const diff = touchStartX.current - touchEndX.current;
    const minSwipeDistance = 80;

    // Nur navigieren wenn es ein horizontaler Swipe war
    if (isHorizontalSwipe.current && Math.abs(diff) > minSwipeDistance && currentIndex !== -1) {
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
    touchStartY.current = 0;
    touchEndX.current = 0;
    isHorizontalSwipe.current = false;
  };

  return {
    swipeHandlers: {
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd,
    },
    currentIndex,
    totalPages: ADMIN_ROUTES.length,
    swiping,
    swipeDirection,
  };
}

export default useAdminSwipe;
