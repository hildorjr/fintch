import {
  Controller,
  Post,
  Get,
  Param,
  UseGuards,
  UnauthorizedException,
  Logger,
  InternalServerErrorException,
} from "@nestjs/common";
import { ClerkAuthGuard, User } from "../auth";
import type { ClerkUser } from "../auth";
import { AuthService } from "../auth/auth.service";
import { EmailService } from "./email.service";
import type {
  SyncResult,
  ThreadListResponse,
  ThreadDetailResponse,
  InsightResponse,
} from "./types";

@Controller()
export class EmailController {
  private readonly logger = new Logger(EmailController.name);

  constructor(
    private authService: AuthService,
    private emailService: EmailService,
  ) {}

  @Post("email/sync")
  @UseGuards(ClerkAuthGuard)
  async sync(@User() user: ClerkUser): Promise<SyncResult> {
    const oauthToken = await this.authService.getMicrosoftOAuthToken(
      user.userId,
    );

    if (!oauthToken) {
      throw new UnauthorizedException(
        "Microsoft OAuth token not found. Please sign out and sign in again with Microsoft.",
      );
    }

    try {
      return await this.emailService.syncEmails(user, oauthToken);
    } catch (error) {
      this.logger.error("Email sync failed", error);
      if (error instanceof Error && error.message.includes("Access")) {
        throw new UnauthorizedException(
          "Microsoft access denied. Please ensure you granted Mail.Read permission and try signing in again.",
        );
      }
      throw new InternalServerErrorException("Failed to sync emails");
    }
  }

  @Get("threads")
  @UseGuards(ClerkAuthGuard)
  async getThreads(@User() user: ClerkUser): Promise<ThreadListResponse> {
    return this.emailService.getThreads(user.userId);
  }

  @Get("threads/:id")
  @UseGuards(ClerkAuthGuard)
  async getThread(
    @User() user: ClerkUser,
    @Param("id") threadId: string,
  ): Promise<ThreadDetailResponse> {
    return this.emailService.getThreadById(user.userId, threadId);
  }

  @Post("threads/:id/insights")
  @UseGuards(ClerkAuthGuard)
  async generateInsight(
    @User() user: ClerkUser,
    @Param("id") threadId: string,
  ): Promise<InsightResponse | null> {
    try {
      return await this.emailService.generateThreadInsight(
        user.userId,
        threadId,
      );
    } catch (error) {
      this.logger.error("Insight generation failed", error);
      throw new InternalServerErrorException("Failed to generate insights");
    }
  }
}
