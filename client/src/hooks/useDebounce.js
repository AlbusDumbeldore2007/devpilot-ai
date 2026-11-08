/** Debounce a rapidly changing value (used by search inputs). */
import { useEffect, useState } from 'react';

export function useDebounce(value, delay = 350) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}

/** Keep document.title in sync with the active page. */
export function useDocumentTitle(title) {
  useEffect(() => {
    document.title = title ? `${title} · DevPilot AI` : 'DevPilot AI — AI Developer Workspace';
  }, [title]);
}
