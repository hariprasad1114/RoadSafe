import { useCallback, useEffect, useState } from "react";
import { api, errorMessage } from "@/lib/api";

interface UseApiOptions {
  enabled?: boolean;
}

export function useApi<T>(path: string | null, options: UseApiOptions = {}) {
  const { enabled = true } = options;
  const [data, setData] = useState<T | undefined>(undefined);
  const [loading, setLoading] = useState(Boolean(path && enabled));
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);

  const refetch = useCallback(() => {
    setNonce((value) => value + 1);
  }, []);

  useEffect(() => {
    if (!path || !enabled) {
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    api
      .get<T>(path, undefined, { signal: controller.signal })
      .then((result) => {
        setData(result);
      })
      .catch((caught) => {
        if (caught instanceof DOMException && caught.name === "AbortError") return;
        setError(errorMessage(caught));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [path, enabled, nonce]);

  return { data, loading, error, refetch };
}
