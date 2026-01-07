"use client";

import { useUser } from "@clerk/nextjs";
import { useApi } from "@/lib/use-api";
import { useState, useEffect } from "react";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ThreadCard } from "@/components/thread-card";
import { ThreadListSkeleton } from "@/components/skeletons";
import { formatRelativeTime } from "@/lib/utils";
import { useLastSync } from "@/lib/use-last-sync";
import type { ThreadListItem, ThreadListResponse, SyncResult } from "@/lib/types";

export default function ThreadsPage() {
  const { isLoaded, isSignedIn, user } = useUser();
  const { api } = useApi();
  const [syncing, setSyncing] = useState(false);
  const [threads, setThreads] = useState<ThreadListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { lastSync, updateLastSync } = useLastSync();

  const fetchThreads = async () => {
    try {
      const data = await api<ThreadListResponse>("/threads");
      setThreads(data.threads);
    } catch {
      setThreads([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isSignedIn) {
      fetchThreads();
    }
  }, [isSignedIn]);

  const handleSync = async () => {
    setSyncing(true);
    try {
      await api<SyncResult>("/email/sync", { method: "POST" });
      updateLastSync();
      await fetchThreads();
    } catch (error) {
      console.error("Sync failed:", error);
    } finally {
      setSyncing(false);
    }
  };

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!isSignedIn) {
    redirect("/");
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">
            Welcome, {user.firstName || user.emailAddresses[0]?.emailAddress}
          </h1>
          <p className="text-muted-foreground">
            Your email threads and AI insights
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <div className="flex flex-col items-center gap-1">
            <Button onClick={handleSync} disabled={syncing}>
              {syncing ? "Syncing..." : "Sync Emails"}
            </Button>
            {lastSync && (
              <span className="text-xs text-muted-foreground">
                Synced {formatRelativeTime(lastSync)}
              </span>
            )}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col gap-3">
          <ThreadListSkeleton />
          <ThreadListSkeleton />
          <ThreadListSkeleton />
        </div>
      ) : threads.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground mb-4">
              No threads yet. Click "Sync Emails" to fetch your emails.
            </p>
            <Button onClick={handleSync} disabled={syncing}>
              {syncing ? "Syncing..." : "Sync Emails"}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">
              Email Threads ({threads.length})
            </h2>
          </div>
          {threads.map((thread) => (
            <ThreadCard key={thread.id} thread={thread} />
          ))}
        </div>
      )}
    </div>
  );
}
