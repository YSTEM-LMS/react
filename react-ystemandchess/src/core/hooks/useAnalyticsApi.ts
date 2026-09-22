import { useState, useEffect, useCallback } from 'react';
import { useCookies } from 'react-cookie';
import { environment } from '../../environments';

export interface AnalyticsParams {
  from?: string;
  to?: string;
  [key: string]: string | undefined;
}

interface UseAnalyticsApiOptions {
  endpoint: string;
  params?: AnalyticsParams;
  enabled?: boolean;
}

interface UseAnalyticsApiResult<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  refetch: () => void;
}

export function useAnalyticsApi<T>(
  { endpoint, params, enabled = true }: UseAnalyticsApiOptions,
): UseAnalyticsApiResult<T> {
  const [cookies] = useCookies(['login']);
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [tick, setTick] = useState(0);

  const refetch = useCallback(() => setTick((t) => t + 1), []);

  const paramsKey = params ? JSON.stringify(params) : '';

  useEffect(() => {
    if (!enabled) return;

    const controller = new AbortController();

    const url = new URL(`${environment.urls.middlewareURL}${endpoint}`);
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        if (v) url.searchParams.set(k, v);
      });
    }

    setLoading(true);
    setError(null);

    fetch(url.toString(), {
      headers: { Authorization: `Bearer ${cookies.login}` },
      signal: controller.signal,
    })
      .then((res) => {
        if (res.status === 401 || res.status === 403) {
          throw new Error('Access denied');
        }
        if (!res.ok) throw new Error(`Request failed (${res.status})`);
        return res.json() as Promise<T>;
      })
      .then((json) => {
        setData(json);
        setLoading(false);
      })
      .catch((err: Error) => {
        if (err.name === 'AbortError') return;
        setError(err);
        setLoading(false);
      });

    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endpoint, paramsKey, enabled, cookies.login, tick]);

  return { data, loading, error, refetch };
}
