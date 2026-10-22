import { useEffect, useMemo } from "react";
import type { RealtimeDataChanged } from "../components/RealtimeBridge";

type RefreshHandler = (event: RealtimeDataChanged) => void | Promise<void>;

/**
 * Refreshes a page only for the realtime resources it displays. Bursts are
 * debounced because one business operation can legitimately update several
 * related resources at once.
 */
export default function useRealtimeRefresh(
  scopes: string[],
  refresh: RefreshHandler,
  debounceMilliseconds = 120,
) {
  const scopeKey = useMemo(
    () => [...new Set(scopes)].sort().join("|"),
    [scopes],
  );

  useEffect(() => {
    const acceptedScopes = new Set(scopeKey.split("|").filter(Boolean));
    let timeoutId: number | undefined;

    const handleChange = (rawEvent: Event) => {
      const event = rawEvent as CustomEvent<RealtimeDataChanged>;
      const detail = event.detail;

      if (!detail?.phamVi?.some((scope) => acceptedScopes.has(scope))) {
        return;
      }

      if (timeoutId !== undefined) {
        window.clearTimeout(timeoutId);
      }

      timeoutId = window.setTimeout(() => {
        timeoutId = undefined;
        void Promise.resolve(refresh(detail)).catch(() => undefined);
      }, debounceMilliseconds);
    };

    window.addEventListener("realtime-data-changed", handleChange);

    return () => {
      window.removeEventListener("realtime-data-changed", handleChange);
      if (timeoutId !== undefined) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [debounceMilliseconds, refresh, scopeKey]);
}
