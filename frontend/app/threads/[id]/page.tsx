"use client";

import { useUser } from "@clerk/nextjs";
import { useApi, ApiError } from "@/lib/use-api";
import { useState, useEffect, useRef, use } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmailCard } from "@/components/email-card";
import { InsightCard, InsightSkeleton } from "@/components/insight-card";
import { ThreadDetailSkeleton } from "@/components/skeletons";
import { formatDateTime } from "@/lib/utils";
import type { ThreadDetail, Insight } from "@/lib/types";

export default function ThreadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { isLoaded, isSignedIn } = useUser();
  const { api } = useApi();
  const [thread, setThread] = useState<ThreadDetail | null>(null);
  const [insight, setInsight] = useState<Insight | null>(null);
  const [loading, setLoading] = useState(true);
  const [insightLoading, setInsightLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fetchedRef = useRef(false);

  useEffect(() => {
    if (isSignedIn && id && !fetchedRef.current) {
      fetchedRef.current = true;
      api<ThreadDetail>(`/threads/${id}`)
        .then((data) => {
          setThread(data);
          if (data.emails.length > 0) {
            setInsightLoading(true);
            api<Insight>(`/threads/${id}/insights`, { method: "POST" })
              .then((insightData) => {
                if (insightData) {
                  setInsight(insightData);
                }
              })
              .catch((err) => {
                if (data.insight) {
                  setInsight(data.insight);
                } else {
                  const message = err instanceof ApiError ? err.message : "Failed to generate insights";
                  toast.error(message);
                }
              })
              .finally(() => setInsightLoading(false));
          }
        })
        .catch((err) => {
          const message = err instanceof ApiError ? err.message : "Failed to load thread";
          setError(message);
        })
        .finally(() => setLoading(false));
    }
  }, [isSignedIn, id]);

  if (!isLoaded || loading) {
    return (
      <div className="max-w-3xl mx-auto">
        <ThreadDetailSkeleton />
      </div>
    );
  }

  if (!isSignedIn) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-muted-foreground">
          Please sign in to view this thread.
        </p>
      </div>
    );
  }

  if (error || !thread) {
    return (
      <div className="max-w-3xl mx-auto">
        <Button variant="ghost" asChild className="mb-4">
          <Link href="/threads">← Back to threads</Link>
        </Button>
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-destructive">{error || "Thread not found"}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <Button variant="ghost" asChild className="mb-4">
        <Link href="/threads">← Back to threads</Link>
      </Button>

      <div className="mb-6">
        <h1 className="text-2xl font-bold">
          {thread.subject || "(No Subject)"}
        </h1>
        <p className="text-sm text-muted-foreground">
          Last updated: {formatDateTime(thread.lastMessageAt)}
        </p>
      </div>

      <div className="flex flex-col gap-6">
        {insight ? (
          <InsightCard insight={insight} />
        ) : insightLoading ? (
          <InsightSkeleton />
        ) : null}

        <div>
          <h2 className="text-lg font-semibold mb-3">
            Emails ({thread.emails.length})
          </h2>
          <div className="flex flex-col gap-3">
            {thread.emails.map((email) => (
              <EmailCard key={email.id} email={email} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
