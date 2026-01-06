"use client";

import { useUser } from "@clerk/nextjs";
import { useApi } from "@/lib/use-api";
import { useState, useEffect } from "react";
import Link from "next/link";
import type { ThreadListItem, ThreadListResponse, SyncResult } from "@/lib/types";

export default function Home() {
  const { isLoaded, isSignedIn, user } = useUser();
  const { api } = useApi();
  const [syncing, setSyncing] = useState(false);
  const [threads, setThreads] = useState<ThreadListItem[]>([]);
  const [loading, setLoading] = useState(true);

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
      const result = await api<SyncResult>("/email/sync", { method: "POST" });
      console.log("Sync result:", result);
      await fetchThreads();
    } catch (error) {
      console.error("Sync failed:", error);
    } finally {
      setSyncing(false);
    }
  };

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-65px)]">
        <p>Loading...</p>
      </div>
    );
  }

  if (!isSignedIn) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-65px)] gap-4">
        <h1 className="text-2xl font-bold">Welcome to Fintch Email</h1>
        <p className="text-gray-600">Sign in to sync your Outlook emails</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">
          Welcome, {user.firstName || user.emailAddresses[0]?.emailAddress}
        </h1>
        <button
          onClick={handleSync}
          disabled={syncing}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {syncing ? "Syncing..." : "Sync Emails"}
        </button>
      </div>

      {loading ? (
        <p className="text-gray-500">Loading threads...</p>
      ) : threads.length === 0 ? (
        <p className="text-gray-500">No threads yet. Click "Sync Emails" to fetch your emails.</p>
      ) : (
        <div className="space-y-2">
          <h2 className="text-lg font-semibold mb-3">Email Threads ({threads.length})</h2>
          {threads.map((thread) => (
            <Link
              key={thread.id}
              href={`/threads/${thread.id}`}
              className="block p-4 border rounded hover:bg-gray-50 transition-colors"
            >
              <div className="flex justify-between items-start">
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium truncate">{thread.subject || "(No Subject)"}</h3>
                  <p className="text-sm text-gray-500 mt-1">
                    {thread.emailCount} email{thread.emailCount !== 1 ? "s" : ""}
                    {thread.attachmentCount > 0 && (
                      <span> · {thread.attachmentCount} attachment{thread.attachmentCount !== 1 ? "s" : ""}</span>
                    )}
                    {thread.hasInsight && (
                      <span className="ml-2 px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded">
                        Has Insights
                      </span>
                    )}
                  </p>
                </div>
                <span className="text-sm text-gray-400 ml-4 whitespace-nowrap">
                  {new Date(thread.lastMessageAt).toLocaleDateString()}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
