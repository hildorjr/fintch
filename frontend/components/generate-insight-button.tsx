"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { InsightSkeleton } from "@/components/insight-card";
import { generateInsight } from "@/app/actions";

interface GenerateInsightButtonProps {
  threadId: string;
}

export function GenerateInsightButton({ threadId }: GenerateInsightButtonProps) {
  const [loading, setLoading] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleGenerate = async () => {
    setLoading(true);
    startTransition(async () => {
      const { success, error } = await generateInsight(threadId);
      if (success) {
        toast.success("Insight generated successfully");
        router.refresh();
      } else {
        toast.error(error || "Failed to generate insights");
      }
      setLoading(false);
    });
  };

  if (loading || isPending) {
    return <InsightSkeleton />;
  }

  return (
    <div className="text-center py-8">
      <button
        onClick={handleGenerate}
        disabled={loading || isPending}
        className="text-sm text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
      >
        Generate AI Insight
      </button>
    </div>
  );
}
