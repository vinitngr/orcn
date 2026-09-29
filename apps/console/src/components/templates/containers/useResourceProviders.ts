"use client";

import { useEffect, useState } from "react";
import type { ResourceProvider } from "./types";

export function useResourceProviders() {
  const [providers, setProviders] = useState<ResourceProvider[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch("/api/v1/resource-providers")
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) {
          setProviders(Array.isArray(data) ? data : data?.providers || []);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { providers, loading };
}
