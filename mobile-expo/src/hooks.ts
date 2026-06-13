import { useCallback, useEffect, useState } from "react";
import { Alert } from "react-native";

import { getErrorMessage } from "./api/client";

export function useAsyncData<T>(
  loader: () => Promise<T>,
  deps: React.DependencyList = [],
  options: { enabled?: boolean; silent?: boolean } = {}
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(Boolean(options.enabled ?? true));
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (refresh = false) => {
      if (options.enabled === false) return;
      if (refresh) setRefreshing(true);
      else setLoading(true);
      setError(null);

      try {
        const result = await loader();
        setData(result);
      } catch (err) {
        const message = getErrorMessage(err);
        setError(message);
        if (!options.silent) Alert.alert("오류", message);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    deps
  );

  useEffect(() => {
    void load(false);
  }, [load]);

  return { data, loading, refreshing, error, reload: () => load(true), setData };
}

export function formatDateTime(value?: string | null) {
  if (!value) return "";
  return value.replace("T", " ").slice(0, 16);
}

export function todayString() {
  return new Date().toISOString().slice(0, 10);
}

export function toNumber(value: string, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}
