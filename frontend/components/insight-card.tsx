import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import type { Insight } from "@/lib/types";

export function InsightSkeleton() {
  return (
    <Card className="bg-blue-50 border-blue-200 dark:bg-blue-950 dark:border-blue-800">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <span>AI Insights</span>
          <Badge className="animate-pulse bg-blue-500">Generating...</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-4 w-full bg-blue-200 dark:bg-blue-800" />
          <Skeleton className="h-4 w-3/4 bg-blue-200 dark:bg-blue-800" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Skeleton className="h-4 w-24 bg-blue-200 dark:bg-blue-800" />
          <Skeleton className="h-4 w-32 bg-blue-200 dark:bg-blue-800" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-6 w-16 bg-blue-200 dark:bg-blue-800" />
          <Skeleton className="h-6 w-20 bg-blue-200 dark:bg-blue-800" />
          <Skeleton className="h-6 w-14 bg-blue-200 dark:bg-blue-800" />
        </div>
      </CardContent>
    </Card>
  );
}

export function InsightCard({ insight }: { insight: Insight }) {
  return (
    <Card className="bg-primary/5 border-primary/20">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <span>AI Insights</span>
          <Badge
            variant={
              insight.urgency === "HIGH"
                ? "destructive"
                : insight.urgency === "MEDIUM"
                  ? "default"
                  : "secondary"
            }
          >
            {insight.urgency}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <p className="text-sm">{insight.summary}</p>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="font-medium">Requires Response:</span>{" "}
            <span className={insight.requiresResponse ? "text-orange-600" : ""}>
              {insight.requiresResponse ? "Yes" : "No"}
            </span>
          </div>
          {insight.participants.length > 0 && (
            <div>
              <span className="font-medium">Participants:</span>{" "}
              {insight.participants.join(", ")}
            </div>
          )}
        </div>

        {insight.topics.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {insight.topics.map((topic) => (
              <Badge key={topic} variant="outline">
                {topic}
              </Badge>
            ))}
          </div>
        )}

        {insight.actionItems.length > 0 && (
          <div>
            <span className="font-medium text-sm">Action Items:</span>
            <ul className="mt-1 flex flex-col gap-1">
              {insight.actionItems.map((item, i) => (
                <li key={i} className="text-sm flex items-start gap-2">
                  <span className="text-muted-foreground">•</span>
                  <span>
                    {item.task}{" "}
                    <span className="text-muted-foreground">({item.owner})</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

