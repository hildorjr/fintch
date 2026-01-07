"use client";

import { useState, useEffect } from "react";

const LAST_SYNC_KEY = "fintch_last_sync";

export function useLastSync() {
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [, setTick] = useState(0);

  useEffect(() => {
    const stored = localStorage.getItem(LAST_SYNC_KEY);
    if (stored) setLastSync(new Date(stored));

    const interval = setInterval(() => setTick((t) => t + 1), 60000);
    return () => clearInterval(interval);
  }, []);

  const updateLastSync = () => {
    const now = new Date();
    localStorage.setItem(LAST_SYNC_KEY, now.toISOString());
    setLastSync(now);
  };

  return { lastSync, updateLastSync };
}

