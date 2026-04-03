/** @jsxImportSource solid-js */
import { createSignal, onCleanup, onMount } from "solid-js";
import { useLocation } from "@solidjs/router";

export default function PullToRefresh(props) {
  const [pullDistance, setPullDistance] = createSignal(0);
  const [isPulling, setIsPulling] = createSignal(false);
  const [isRefreshing, setIsRefreshing] = createSignal(false);
  const location = useLocation();

  let startY = 0;
  const threshold = 100; // Meningkatkan batas minimum agar tidak tidak sengaja aktif

  const handleTouchStart = (e) => {
    // Hanya pantau jika di paling atas
    if (window.scrollY <= 0) {
      startY = e.touches[0].pageY;
    }
  };

  const handleTouchMove = (e) => {
    if (isRefreshing()) return;
    
    const currentY = e.touches[0].pageY;
    const diff = currentY - startY;

    // Hanya aktif jika tarik ke bawah (diff > 0) dan di paling atas
    if (diff > 0 && window.scrollY <= 0) {
      // Set pulling mode hanya jika sudah lewat bany sedikit (deadzone 10px)
      if (!isPulling() && diff > 10) {
        setIsPulling(true);
      }

      if (isPulling()) {
        // Resistance effect for native feel
        // Kita kurangi 10px deadzone dari diff sebelum hitung distance
        const distance = Math.pow(Math.max(0, diff - 10), 0.75);
        setPullDistance(distance);
        
        // Prevent scroll native hanya jika kita benar-benar sedang menarik komponen PTR
        if (distance > 5) {
          if (e.cancelable) e.preventDefault();
        }
      }
    } else {
      if (isPulling()) {
        setPullDistance(0);
        setIsPulling(false);
      }
    }
  };

  const handleTouchEnd = async () => {
    if (!isPulling() || isRefreshing()) return;

    if (pullDistance() >= threshold) {
      await triggerRefresh();
    }

    setIsPulling(false);
    setPullDistance(0);
  };

  const handleTouchCancel = () => {
    setIsPulling(false);
    setPullDistance(0);
  };

  const triggerRefresh = async () => {
    setIsRefreshing(true);
    
    try {
      const path = location.pathname;
      const isScanPage = path === "/library" || path === "/updates" || path === "/";
      
      if (isScanPage) {
        // Special Scan for updates
        await fetch("/api/scan-updates", { method: "POST" });
        // Dispatch event for pages to refetch data
        window.dispatchEvent(new CustomEvent("refresh-requested", { detail: { path } }));
        // Also wait a bit extra to ensure DB has settled or just for UX
        await new Promise(r => setTimeout(r, 800));
      } else {
        // Normal page refresh
        window.location.reload();
      }
    } catch (err) {
      console.error("Refresh failed:", err);
    } finally {
      setIsRefreshing(false);
    }
  };

  onMount(() => {
    window.addEventListener("touchstart", handleTouchStart, { passive: true });
    window.addEventListener("touchmove", handleTouchMove, { passive: false });
    window.addEventListener("touchend", handleTouchEnd, { passive: true });
    window.addEventListener("touchcancel", handleTouchCancel, { passive: true });
  });

  onCleanup(() => {
    window.removeEventListener("touchstart", handleTouchStart);
    window.removeEventListener("touchmove", handleTouchMove);
    window.removeEventListener("touchend", handleTouchEnd);
    window.removeEventListener("touchcancel", handleTouchCancel);
  });

  const getStatus = () => {
    if (isRefreshing()) return "loading";
    if (pullDistance() >= threshold) return "ready";
    return "pulling";
  };

  const getText = () => {
    const path = location.pathname;
    const isScanPage = path === "/library" || path === "/updates" || path === "/";
    
    if (isRefreshing()) return isScanPage ? "Scanning Chapters..." : "Refreshing...";
    if (pullDistance() >= threshold) return "Release to Refresh";
    return "Pull down to Refresh";
  };

  return (
    <div 
      class={`ptr-indicator ${getStatus()}`}
      style={{
        transform: `translateY(${pullDistance()}px)`,
        opacity: pullDistance() > 10 || isRefreshing() ? 1 : 0,
        visibility: pullDistance() > 10 || isRefreshing() ? "visible" : "hidden"
      }}
    >
      <i class={`fas ${isRefreshing() ? "fa-sync-alt fa-spin" : "fa-arrow-down"}`}></i>
      <span class="ptr-text">{getText()}</span>
    </div>
  );
}
