import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { InsightService } from "../insight/insight.service";
import {
  ThreadListResponse,
  ThreadDetailResponse,
  InsightResponse,
} from "./types";

@Injectable()
export class ThreadsService {
  constructor(
    private prisma: PrismaService,
    private insightService: InsightService,
  ) {}

  async getThreads(userId: string): Promise<ThreadListResponse> {
    const threads = await this.prisma.thread.findMany({
      where: { userId },
      orderBy: { lastMessageAt: "desc" },
      include: {
        _count: { select: { emails: true } },
        emails: {
          select: { attachmentCount: true },
        },
        insight: { select: { id: true } },
      },
    });

    return {
      threads: threads.map((thread) => ({
        id: thread.id,
        subject: thread.subject,
        lastMessageAt: thread.lastMessageAt,
        emailCount: thread._count.emails,
        attachmentCount: thread.emails.reduce(
          (sum, e) => sum + e.attachmentCount,
          0,
        ),
        hasInsight: !!thread.insight,
      })),
    };
  }

  async getThreadById(
    userId: string,
    threadId: string,
  ): Promise<ThreadDetailResponse> {
    const thread = await this.prisma.thread.findFirst({
      where: { id: threadId, userId },
      include: {
        emails: {
          orderBy: { receivedAt: "desc" },
          include: { attachments: true },
        },
        insight: true,
      },
    });

    if (!thread) {
      throw new NotFoundException("Thread not found");
    }

    return {
      id: thread.id,
      subject: thread.subject,
      lastMessageAt: thread.lastMessageAt,
      emails: thread.emails.map((email) => ({
        id: email.id,
        fromAddress: email.fromAddress,
        fromName: email.fromName,
        subject: email.subject,
        body: email.body,
        receivedAt: email.receivedAt,
        attachments: email.attachments.map((a) => ({
          filename: a.filename,
          mimeType: a.mimeType,
          size: a.size,
        })),
      })),
      insight: thread.insight
        ? {
            summary: thread.insight.summary,
            participants: thread.insight.participants as string[],
            topics: thread.insight.topics as string[],
            actionItems: thread.insight.actionItems as {
              task: string;
              owner: string;
            }[],
            urgency: thread.insight.urgency,
            requiresResponse: thread.insight.requiresResponse,
            attachmentOverview: thread.insight.attachmentOverview as {
              count: number;
              types: string[];
              mentions: string[];
            },
          }
        : null,
    };
  }

  async generateThreadInsight(
    userId: string,
    threadId: string,
  ): Promise<InsightResponse | null> {
    const thread = await this.prisma.thread.findFirst({
      where: { id: threadId, userId },
      include: {
        emails: {
          orderBy: { receivedAt: "desc" },
          include: { attachments: true },
        },
        insight: true,
      },
    });

    if (!thread) {
      throw new NotFoundException("Thread not found");
    }

    if (thread.emails.length === 0) {
      return null;
    }

    const newestEmailDate = thread.emails[0]?.receivedAt;
    const needsRegeneration = !!(
      thread.insight &&
      newestEmailDate &&
      newestEmailDate > thread.insight.updatedAt
    );

    if (thread.insight && !needsRegeneration) {
      return this.formatInsight(thread.insight);
    }

    const insight = await this.insightService.generateInsight(
      threadId,
      thread.emails.map((e) => ({
        fromAddress: e.fromAddress,
        fromName: e.fromName,
        subject: e.subject,
        body: e.body,
        receivedAt: e.receivedAt,
        attachments: e.attachments.map((a) => ({
          filename: a.filename,
          mimeType: a.mimeType,
        })),
      })),
      needsRegeneration,
    );

    if (!insight) {
      return null;
    }

    return this.formatInsight(insight);
  }

  private formatInsight(insight: {
    summary: string;
    participants: unknown;
    topics: unknown;
    actionItems: unknown;
    urgency: string;
    requiresResponse: boolean;
    attachmentOverview: unknown;
  }): InsightResponse {
    return {
      summary: insight.summary,
      participants: insight.participants as string[],
      topics: insight.topics as string[],
      actionItems: insight.actionItems as { task: string; owner: string }[],
      urgency: insight.urgency,
      requiresResponse: insight.requiresResponse,
      attachmentOverview: insight.attachmentOverview as {
        count: number;
        types: string[];
        mentions: string[];
      },
    };
  }
}

