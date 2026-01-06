import { Injectable, Logger } from "@nestjs/common";
import OpenAI from "openai";
import { PrismaService } from "../prisma/prisma.service";
import { Urgency } from "@prisma/client";

interface ThreadEmail {
  fromAddress: string;
  fromName: string | null;
  subject: string;
  body: string;
  receivedAt: Date;
  attachments: { filename: string; mimeType: string }[];
}

interface InsightOutput {
  summary: string;
  participants: string[];
  topics: string[];
  actionItems: { task: string; owner: string }[];
  urgency: "LOW" | "MEDIUM" | "HIGH";
  requiresResponse: boolean;
  attachmentOverview: {
    count: number;
    types: string[];
    mentions: string[];
  };
}

@Injectable()
export class InsightService {
  private readonly logger = new Logger(InsightService.name);
  private openai: OpenAI;

  constructor(private prisma: PrismaService) {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  async generateInsight(threadId: string, emails: ThreadEmail[]) {
    const existing = await this.prisma.threadInsight.findUnique({
      where: { threadId },
    });

    if (existing) {
      return existing;
    }

    if (emails.length === 0) {
      return null;
    }

    const prompt = this.buildPrompt(emails);

    try {
      const response = await this.openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `You are an email analysis assistant. Analyze email threads and provide structured insights. Always respond with valid JSON matching the exact schema provided.`,
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        response_format: { type: "json_object" },
        temperature: 0.3,
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        this.logger.error("Empty response from OpenAI");
        return null;
      }

      const insight = JSON.parse(content) as InsightOutput;

      const urgencyMap: Record<string, Urgency> = {
        LOW: Urgency.LOW,
        MEDIUM: Urgency.MEDIUM,
        HIGH: Urgency.HIGH,
      };

      return this.prisma.threadInsight.create({
        data: {
          threadId,
          summary: insight.summary,
          participants: insight.participants,
          topics: insight.topics,
          actionItems: insight.actionItems,
          urgency: urgencyMap[insight.urgency] || Urgency.LOW,
          requiresResponse: insight.requiresResponse,
          attachmentOverview: insight.attachmentOverview,
        },
      });
    } catch (error) {
      this.logger.error("Failed to generate insight", error);
      return null;
    }
  }

  private buildPrompt(emails: ThreadEmail[]): string {
    const emailsText = emails
      .map((email, i) => {
        const attachmentList =
          email.attachments.length > 0
            ? `\nAttachments: ${email.attachments.map((a) => `${a.filename} (${a.mimeType})`).join(", ")}`
            : "";

        return `--- Email ${i + 1} ---
From: ${email.fromName || email.fromAddress} <${email.fromAddress}>
Date: ${email.receivedAt.toISOString()}
Subject: ${email.subject}
${attachmentList}

${email.body.slice(0, 2000)}${email.body.length > 2000 ? "..." : ""}`;
      })
      .join("\n\n");

    return `Analyze the following email thread and provide insights in JSON format.

${emailsText}

Respond with a JSON object containing:
{
  "summary": "A brief 1-2 sentence summary of the thread",
  "participants": ["List of participant names mentioned"],
  "topics": ["Main topics discussed"],
  "actionItems": [{"task": "Task description", "owner": "Person responsible"}],
  "urgency": "LOW, MEDIUM, or HIGH based on content urgency",
  "requiresResponse": true or false,
  "attachmentOverview": {
    "count": total number of attachments,
    "types": ["file extensions like pdf, docx"],
    "mentions": ["what the attachments are about based on context"]
  }
}`;
  }
}

