import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { GraphService } from "./graph.service";
import { GraphDeltaMessage, SyncResult } from "./types";
import type { ClerkUser } from "../auth";

@Injectable()
export class SyncService {
  private readonly logger = new Logger(SyncService.name);

  constructor(
    private prisma: PrismaService,
    private graphService: GraphService,
  ) {}

  async syncEmails(user: ClerkUser, oauthToken: string): Promise<SyncResult> {
    const existingUserByEmail = await this.prisma.user.findUnique({
      where: { email: user.email },
    });

    if (existingUserByEmail && existingUserByEmail.id !== user.userId) {
      await this.prisma.user.delete({ where: { email: user.email } });
    }

    const dbUser = await this.prisma.user.upsert({
      where: { id: user.userId },
      update: { email: user.email, name: user.name },
      create: { id: user.userId, email: user.email, name: user.name },
    });

    const { messages, deltaLink } = await this.graphService.fetchDelta(
      oauthToken,
      dbUser.deltaLink,
    );

    const isIncremental = !!dbUser.deltaLink;

    this.logger.log(
      `${isIncremental ? "Incremental" : "Full"} sync: ${messages.length} messages`,
    );

    await this.prisma.user.update({
      where: { id: user.userId },
      data: { deltaLink },
    });

    const deletedMessages = messages.filter((m) => m["@removed"]);
    const newOrUpdatedMessages = messages.filter((m) => !m["@removed"]);

    let emailsDeleted = 0;
    for (const message of deletedMessages) {
      const deleted = await this.prisma.email.deleteMany({
        where: { messageId: message.id, userId: user.userId },
      });
      emailsDeleted += deleted.count;
    }

    await this.cleanupEmptyThreads(user.userId);

    const threadGroups = this.groupByThread(newOrUpdatedMessages);

    let threadsCreated = 0;
    let threadsUpdated = 0;
    let emailsSynced = 0;
    let attachmentsSynced = 0;

    for (const [conversationId, threadMessages] of Object.entries(threadGroups)) {
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

        const toRecipients = (message.toRecipients || []).map((r) => ({
          address: r.emailAddress.address,
          name: r.emailAddress.name,
        }));

        const ccRecipients = (message.ccRecipients || []).map((r) => ({
          address: r.emailAddress.address,
          name: r.emailAddress.name,
        }));

        const attachments = await this.graphService.fetchAttachments(
          oauthToken,
          message.id,
        );

        const email = await this.prisma.email.create({
          data: {
            messageId: message.id,
            threadId: thread.id,
            userId: user.userId,
            fromAddress: message.from?.emailAddress?.address || "unknown",
            fromName: message.from?.emailAddress?.name || null,
            toRecipients,
            ccRecipients,
            subject: message.subject || "(No Subject)",
            body: message.body?.content || "",
            receivedAt: new Date(message.receivedDateTime),
            attachmentCount: attachments.length,
          },
        });

        emailsSynced++;

        for (const attachment of attachments) {
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

    return {
      threadsCreated,
      threadsUpdated,
      emailsSynced,
      emailsDeleted,
      attachmentsSynced,
      isIncremental,
    };
  }

  private async cleanupEmptyThreads(userId: string): Promise<void> {
    await this.prisma.thread.deleteMany({
      where: {
        userId,
        emails: { none: {} },
      },
    });
  }

  private groupByThread(
    messages: GraphDeltaMessage[],
  ): Record<string, GraphDeltaMessage[]> {
    return messages.reduce(
      (acc, message) => {
        const key = message.conversationId;
        if (!key) return acc;
        if (!acc[key]) acc[key] = [];
        acc[key].push(message);
        return acc;
      },
      {} as Record<string, GraphDeltaMessage[]>,
    );
  }
}

