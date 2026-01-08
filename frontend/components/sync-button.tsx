"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { formatRelativeTime } from "@/lib/utils";
import { syncEmails } from "@/app/actions";

interface SyncButtonProps {
  lastSync?: Date | null;
}

export function SyncButton({ lastSync }: SyncButtonProps) {
  const [syncing, setSyncing] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleSync = async () => {
    setSyncing(true);
    startTransition(async () => {
      const { success, result, error } = await syncEmails();
      if (success && result) {
        const syncType = result.isIncremental ? "Incremental" : "Full";
        const parts = [];
        if (result.emailsSynced > 0) parts.push(`${result.emailsSynced} new`);
        if (result.emailsDeleted > 0) parts.push(`${result.emailsDeleted} deleted`);
        const message = parts.length > 0 ? parts.join(", ") : "No changes";
        toast.success(`${syncType} sync: ${message}`);
        router.refresh();
      } else {
        toast.error(error || "Sync failed");
      }
      setSyncing(false);
    });
  };

  return (
    <div className="flex flex-col items-center gap-1">
      <Button onClick={handleSync} disabled={syncing || isPending}>
        {syncing || isPending ? "Syncing..." : "Sync Emails"}
      </Button>
      {lastSync && (
        <span className="text-xs text-muted-foreground">
          Synced {formatRelativeTime(lastSync)}
        </span>
      )}
    </div>
  );
}
