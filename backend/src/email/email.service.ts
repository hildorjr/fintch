import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { GraphService } from "./graph.service";
import { InsightService } from "../insight/insight.service";
import {
  GraphMessage,
  SyncResult,
  ThreadListResponse,
  ThreadDetailResponse,
  InsightResponse,
} from "./types";
import type { ClerkUser } from "../auth";

@Injectable()
export class EmailService {
  constructor(
    private prisma: PrismaService,
    private graphService: GraphService,
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

    if (thread.insight) {
      return {
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
      };
    }

    if (thread.emails.length === 0) {
      return null;
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
    );

    if (!insight) {
      return null;
    }

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

  async syncEmails(
    user: ClerkUser,
    oauthToken: string,
    count: number = 20,
  ): Promise<SyncResult> {
    const existingUserByEmail = await this.prisma.user.findUnique({
      where: { email: user.email },
    });

    if (existingUserByEmail && existingUserByEmail.id !== user.userId) {
      await this.prisma.user.delete({ where: { email: user.email } });
    }

    await this.prisma.user.upsert({
      where: { id: user.userId },
      update: { email: user.email, name: user.name },
      create: { id: user.userId, email: user.email, name: user.name },
    });

    const messages = await this.graphService.fetchRecentEmails(
      oauthToken,
      count,
    );

    const threadGroups = this.groupByThread(messages);

    let threadsCreated = 0;
    let threadsUpdated = 0;
    let emailsSynced = 0;
    let attachmentsSynced = 0;

    for (const [conversationId, threadMessages] of Object.entries(
      threadGroups,
    )) {
      const sortedMessages = threadMessages.sort(
        (a, b) =>
          new Date(b.receivedDateTime).getTime() -
          new Date(a.receivedDateTime).getTime(),
      );

      const latestMessage = sortedMessages[0];
      const lastMessageAt = new Date(latestMessage.receivedDateTime);

      const existingThread = await this.prisma.thread.findUnique({
        where: {
          userId_conversationId: {
            userId: user.userId,
            conversationId,
          },
        },
      });

      const thread = await this.prisma.thread.upsert({
        where: {
          userId_conversationId: {
            userId: user.userId,
            conversationId,
          },
        },
        update: {
          subject: latestMessage.subject,
          lastMessageAt,
        },
        create: {
          conversationId,
          userId: user.userId,
          subject: latestMessage.subject,
          lastMessageAt,
        },
      });

      if (existingThread) {
        threadsUpdated++;
      } else {
        threadsCreated++;
      }

      for (const message of sortedMessages) {
        const existingEmail = await this.prisma.email.findUnique({
          where: { messageId: message.id },
        });

        if (existingEmail) continue;

        const toRecipients = message.toRecipients.map((r) => ({
          address: r.emailAddress.address,
          name: r.emailAddress.name,
        }));

        const ccRecipients = message.ccRecipients.map((r) => ({
          address: r.emailAddress.address,
          name: r.emailAddress.name,
        }));

        const email = await this.prisma.email.create({
          data: {
            messageId: message.id,
            threadId: thread.id,
            userId: user.userId,
            fromAddress: message.from.emailAddress.address,
            fromName: message.from.emailAddress.name || null,
            toRecipients,
            ccRecipients,
            subject: message.subject,
            body: message.body.content,
            receivedAt: new Date(message.receivedDateTime),
            attachmentCount: message.attachments?.length ?? 0,
          },
        });

        emailsSynced++;

        if (message.attachments?.length) {
          for (const attachment of message.attachments) {
            await this.prisma.attachment.create({
              data: {
                emailId: email.id,
                filename: attachment.name,
                mimeType: attachment.contentType,
                size: attachment.size,
              },
            });
            attachmentsSynced++;
          }
        }
      }
    }

    return {
      threadsCreated,
      threadsUpdated,
      emailsSynced,
      attachmentsSynced,
    };
  }

  private groupByThread(
    messages: GraphMessage[],
  ): Record<string, GraphMessage[]> {
    return messages.reduce(
      (acc, message) => {
        const key = message.conversationId;
        if (!acc[key]) acc[key] = [];
        acc[key].push(message);
        return acc;
      },
      {} as Record<string, GraphMessage[]>,
    );
  }
}
