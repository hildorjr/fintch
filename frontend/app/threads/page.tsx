import { currentUser } from "@clerk/nextjs/server";
import { api, ApiError } from "@/lib/api-server";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ThreadCard } from "@/components/thread-card";
import { ThreadListSkeleton } from "@/components/skeletons";
import { SyncButton } from "@/components/sync-button";
import type { ThreadListResponse } from "@/lib/types";

export const revalidate = 60;

export default async function ThreadsPage() {
  const user = await currentUser();
  const userName = user?.firstName || user?.emailAddresses[0]?.emailAddress || "User";

  let threads: ThreadListResponse["threads"] = [];
  let error: string | null = null;

  try {
    const data = await api<ThreadListResponse>("/threads", {}, { tags: ["threads"] });
    threads = data.threads;
  } catch (err) {
    error = err instanceof ApiError ? err.message : "Failed to load threads";
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">Welcome, {userName}</h1>
          <p className="text-muted-foreground">
            Your email threads and AI insights
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <SyncButton />
        </div>
      </div>

      {error ? (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-destructive mb-4">{error}</p>
            <form action={async () => {
              "use server";
              const { revalidatePath } = await import("next/cache");
              revalidatePath("/threads");
            }}>
              <Button type="submit" variant="outline">
                Try Again
              </Button>
            </form>
          </CardContent>
        </Card>
      ) : threads.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground mb-4">
              No threads yet. Click "Sync Emails" to fetch your emails.
            </p>
            <SyncButton />
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
