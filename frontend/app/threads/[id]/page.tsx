import Link from "next/link";
import { api, ApiError } from "@/lib/api-server";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmailCard } from "@/components/email-card";
import { InsightCard, InsightSkeleton } from "@/components/insight-card";
import { ThreadDetailSkeleton } from "@/components/skeletons";
import { formatDateTime } from "@/lib/utils";
import type { ThreadDetail, Insight } from "@/lib/types";
import { GenerateInsightButton } from "@/components/generate-insight-button";

export const revalidate = 60;

export default async function ThreadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let thread: ThreadDetail | null = null;
  let error: string | null = null;

  try {
    thread = await api<ThreadDetail>(`/threads/${id}`, {}, { tags: [`thread-${id}`] });
  } catch (err) {
    error = err instanceof ApiError ? err.message : "Failed to load thread";
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
        {thread.insight ? (
          <InsightCard insight={thread.insight} />
        ) : thread.emails.length > 0 ? (
          <GenerateInsightButton threadId={id} />
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
