import { useLayoutEffect, useRef } from "react";
import { useLocation, useNavigationType } from "react-router-dom";

type ScrollPosition = {
  left: number;
  top: number;
};

const routeScrollPositions = new Map<string, ScrollPosition>();
const MAX_SAVED_POSITIONS = 50;

function rememberPosition(key: string, position: ScrollPosition) {
  routeScrollPositions.set(key, position);

  if (routeScrollPositions.size > MAX_SAVED_POSITIONS) {
    const oldestKey = routeScrollPositions.keys().next().value;
    if (oldestKey) routeScrollPositions.delete(oldestKey);
  }
}

function scrollToHash(hash: string) {
  if (!hash) return false;

  const id = decodeURIComponent(hash.slice(1));
  const target = document.getElementById(id);
  if (!target) return false;

  target.scrollIntoView({ behavior: "auto", block: "start" });
  return true;
}

function RouteScrollManager() {
  const location = useLocation();
  const navigationType = useNavigationType();
  const previousLocationKey = useRef(location.key);
  const previousPath = useRef(location.pathname);

  useLayoutEffect(() => {
    const previousMode = window.history.scrollRestoration;
    window.history.scrollRestoration = "manual";

    return () => {
      window.history.scrollRestoration = previousMode;
    };
  }, []);

  useLayoutEffect(() => {
    const previousKey = previousLocationKey.current;

    // Không can thiệp lần tải trang đầu tiên; trình duyệt vẫn được phép giữ vị trí khi refresh.
    if (previousKey === location.key) return;

    rememberPosition(previousKey, {
      left: window.scrollX,
      top: window.scrollY,
    });

    previousLocationKey.current = location.key;

    const samePage = previousPath.current === location.pathname;
    previousPath.current = location.pathname;
    // Search/filter updates keep the reader and focused control in place.
    // POP still restores the position saved for that history entry.
    if (samePage && navigationType !== "POP" && !location.hash) return;

    const savedPosition = navigationType === "POP"
      ? routeScrollPositions.get(location.key)
      : undefined;

    const applyPosition = () => {
      if (scrollToHash(location.hash)) return;

      window.scrollTo({
        left: savedPosition?.left ?? 0,
        top: savedPosition?.top ?? 0,
        behavior: "auto",
      });
    };

    applyPosition();
    const frameId = window.requestAnimationFrame(applyPosition);

    // Khi Back/Forward, chờ nội dung trang dựng lại rồi khôi phục chính xác vị trí cũ.
    const restoreTimer = navigationType === "POP"
      ? window.setTimeout(applyPosition, 350)
      : undefined;

    return () => {
      window.cancelAnimationFrame(frameId);
      if (restoreTimer !== undefined) window.clearTimeout(restoreTimer);
    };
  }, [location.hash, location.key, location.pathname, navigationType]);

  return null;
}

export default RouteScrollManager;
