import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatFileSize, formatDateTime } from "@/lib/utils";
import type { Email } from "@/lib/types";

export function EmailCard({ email }: { email: Email }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex justify-between items-start mb-3">
          <div>
            <span className="font-medium">
              {email.fromName || email.fromAddress}
            </span>
            {email.fromName && (
              <span className="text-muted-foreground text-sm ml-2">
                &lt;{email.fromAddress}&gt;
              </span>
            )}
          </div>
          <span className="text-sm text-muted-foreground">
            {formatDateTime(email.receivedAt)}
          </span>
        </div>

        <h3 className="font-medium mb-3">{email.subject}</h3>

        <div className="text-sm whitespace-pre-wrap max-h-64 overflow-y-auto bg-muted/50 p-3 rounded-md">
          {email.body}
        </div>

        {email.attachments.length > 0 && (
          <div className="mt-3 pt-3 border-t">
            <span className="text-sm font-medium">
              Attachments ({email.attachments.length}):
            </span>
            <div className="flex flex-wrap gap-2 mt-2">
              {email.attachments.map((att, i) => (
                <Badge key={i} variant="secondary" className="gap-1">
                  <span>📎</span>
                  <span>{att.filename} ({att.mimeType})</span>
                  <span className="text-muted-foreground">
                    ({formatFileSize(att.size)})
                  </span>
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

