import { useEffect, useState, useCallback } from 'react';
import { systemApi, isAbortError } from '../services/api.js';

/**
 * Polls /api/health so the UI can surface configuration problems
 * (MongoDB offline, AI key missing) instead of silently failing.
 */
export function useSystemHealth() {
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const response = await systemApi.health();
      setHealth(response);
      setError(null);
    } catch (requestError) {
      if (!isAbortError(requestError)) {
        setError(requestError.message || 'The API is unreachable.');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    let mounted = true;

    systemApi
      .health({ signal: controller.signal })
      .then((response) => {
        if (mounted) {
          setHealth(response);
          setError(null);
        }
      })
      .catch((requestError) => {
        if (mounted && !isAbortError(requestError)) {
          setError(requestError.message || 'The API is unreachable.');
        }
      })
      .finally(() => mounted && setLoading(false));

    return () => {
      mounted = false;
      controller.abort();
    };
  }, []);

  return { health, loading, error, refresh };
}
