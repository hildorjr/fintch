"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { api, ApiError } from "@/lib/api-server";
import type { SyncResult } from "@/lib/types";

export async function syncEmails(): Promise<{ success: boolean; result?: SyncResult; error?: string }> {
  try {
    const result = await api<SyncResult>("/email/sync", { method: "POST" }, { tags: ["sync"] });
    revalidateTag("threads", "max");
    revalidatePath("/threads", "page");
    return { success: true, result };
  } catch (err) {
    const error = err instanceof ApiError ? err.message : "Sync failed";
    return { success: false, error };
  }
}

export async function generateInsight(threadId: string): Promise<{ success: boolean; error?: string }> {
  try {
    await api(`/threads/${threadId}/insights`, { method: "POST" }, { tags: [`thread-${threadId}`] });
    revalidateTag(`thread-${threadId}`, "max");
    revalidatePath(`/threads/${threadId}`, "page");
    return { success: true };
  } catch (err) {
    const error = err instanceof ApiError ? err.message : "Failed to generate insights";
    return { success: false, error };
  }
}
