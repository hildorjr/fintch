"use client";

import { useUser } from "@clerk/nextjs";
import { useApi } from "@/lib/use-api";
import { useState, useEffect, use } from "react";
import Link from "next/link";
import type { ThreadDetail } from "@/lib/types";

function formatFileSize(bytes: number | null): string {
  if (bytes === null) return "Unknown size";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function ThreadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { isLoaded, isSignedIn } = useUser();
  const { api } = useApi();
  const [thread, setThread] = useState<ThreadDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isSignedIn && id) {
      api<ThreadDetail>(`/threads/${id}`)
        .then(setThread)
        .catch(() => setError("Failed to load thread"))
        .finally(() => setLoading(false));
    }
  }, [isSignedIn, id]);

  if (!isLoaded || loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-65px)]">
        <p>Loading...</p>
      </div>
    );
  }

  if (!isSignedIn) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-65px)]">
        <p>Please sign in to view this thread.</p>
      </div>
    );
  }

  if (error || !thread) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <Link href="/" className="text-blue-600 hover:underline mb-4 inline-block">
          ← Back to threads
        </Link>
        <p className="text-red-500">{error || "Thread not found"}</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <Link href="/" className="text-blue-600 hover:underline mb-4 inline-block">
        ← Back to threads
      </Link>

      <h1 className="text-2xl font-bold mb-2">{thread.subject || "(No Subject)"}</h1>
      <p className="text-sm text-gray-500 mb-6">
        Last updated: {new Date(thread.lastMessageAt).toLocaleString()}
      </p>

      {thread.insight && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h2 className="font-semibold text-blue-900 mb-2">AI Insights</h2>
          <p className="text-gray-700 mb-3">{thread.insight.summary}</p>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium">Urgency:</span>{" "}
              <span
                className={`px-2 py-0.5 rounded text-xs ${
                  thread.insight.urgency === "HIGH"
                    ? "bg-red-100 text-red-700"
                    : thread.insight.urgency === "MEDIUM"
                      ? "bg-yellow-100 text-yellow-700"
                      : "bg-green-100 text-green-700"
                }`}
              >
                {thread.insight.urgency}
              </span>
            </div>
            <div>
              <span className="font-medium">Requires Response:</span>{" "}
              {thread.insight.requiresResponse ? "Yes" : "No"}
            </div>
          </div>

          {thread.insight.topics.length > 0 && (
            <div className="mt-3">
              <span className="font-medium text-sm">Topics:</span>{" "}
              {thread.insight.topics.map((topic) => (
                <span
                  key={topic}
                  className="inline-block px-2 py-0.5 bg-gray-200 text-gray-700 text-xs rounded mr-1"
                >
                  {topic}
                </span>
              ))}
            </div>
          )}

          {thread.insight.actionItems.length > 0 && (
            <div className="mt-3">
              <span className="font-medium text-sm">Action Items:</span>
              <ul className="list-disc list-inside mt-1 text-sm">
                {thread.insight.actionItems.map((item, i) => (
                  <li key={i}>
                    {item.task} <span className="text-gray-500">({item.owner})</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      <h2 className="text-lg font-semibold mb-3">
        Emails ({thread.emails.length})
      </h2>

      <div className="space-y-4">
        {thread.emails.map((email) => (
          <div key={email.id} className="border rounded-lg p-4">
            <div className="flex justify-between items-start mb-2">
              <div>
                <span className="font-medium">
                  {email.fromName || email.fromAddress}
                </span>
                {email.fromName && (
                  <span className="text-gray-500 text-sm ml-2">
                    &lt;{email.fromAddress}&gt;
                  </span>
                )}
              </div>
              <span className="text-sm text-gray-400">
                {new Date(email.receivedAt).toLocaleString()}
              </span>
            </div>

            <h3 className="font-medium text-gray-800 mb-2">{email.subject}</h3>

            <div className="text-gray-700 text-sm whitespace-pre-wrap max-h-64 overflow-y-auto bg-gray-50 p-3 rounded">
              {email.body}
            </div>

            {email.attachments.length > 0 && (
              <div className="mt-3 pt-3 border-t">
                <span className="text-sm font-medium text-gray-600">
                  Attachments ({email.attachments.length}):
                </span>
                <div className="flex flex-wrap gap-2 mt-2">
                  {email.attachments.map((att, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-2 px-3 py-1 bg-gray-100 rounded text-sm"
                    >
                      <span>📎</span>
                      <span>{att.filename}</span>
                      <span className="text-gray-400">({formatFileSize(att.size)})</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

