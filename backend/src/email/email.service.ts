import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { GraphService } from "./graph.service";
import { GraphMessage, SyncResult } from "./types";
import type { ClerkUser } from "../auth";

@Injectable()
export class EmailService {
  constructor(
    private prisma: PrismaService,
    private graphService: GraphService,
  ) {}

  async syncEmails(
    user: ClerkUser,
    oauthToken: string,
    count: number = 20,
  ): Promise<SyncResult> {
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

