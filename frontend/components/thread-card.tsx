import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import type { ThreadListItem } from "@/lib/types";

export function ThreadCard({ thread }: { thread: ThreadListItem }) {
  return (
    <Link href={`/threads/${thread.id}`}>
      <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
        <CardContent className="p-4">
          <div className="flex justify-between items-start gap-4">
            <div className="flex-1 min-w-0">
              <h3 className="font-medium truncate">
                {thread.subject || "(No Subject)"}
              </h3>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-sm text-muted-foreground">
                  {thread.emailCount} email{thread.emailCount !== 1 ? "s" : ""}
                </span>
                {thread.attachmentCount > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    {thread.attachmentCount} attachment
                    {thread.attachmentCount !== 1 ? "s" : ""}
                  </Badge>
                )}
                {thread.hasInsight && (
                  <Badge className="text-xs">AI Insights</Badge>
                )}
              </div>
            </div>
            <span className="text-sm text-muted-foreground whitespace-nowrap">
              {formatDate(thread.lastMessageAt)}
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

