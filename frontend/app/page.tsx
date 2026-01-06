"use client";

import { useUser } from "@clerk/nextjs";
import { useApi } from "@/lib/use-api";
import { useState } from "react";

export default function Home() {
  const { isLoaded, isSignedIn, user } = useUser();
  const { api } = useApi();
  const [syncing, setSyncing] = useState(false);

  const handleSync = async () => {
    setSyncing(true);
    try {
      await api("/email/sync", { method: "POST" });
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
      <h1 className="text-2xl font-bold mb-4">
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
  );
}
