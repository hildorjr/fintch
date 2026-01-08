import {
  Controller,
  Post,
  UseGuards,
  UnauthorizedException,
  Logger,
  InternalServerErrorException,
} from "@nestjs/common";
import { ClerkAuthGuard, User } from "../auth";
import type { ClerkUser } from "../auth";
import { AuthService } from "../auth/auth.service";
import { SyncService } from "./sync.service";
import type { SyncResult } from "./types";

@Controller("email")
export class SyncController {
  private readonly logger = new Logger(SyncController.name);

  constructor(
    private authService: AuthService,
    private syncService: SyncService,
  ) {}

  @Post("sync")
  @UseGuards(ClerkAuthGuard)
  async sync(@User() user: ClerkUser): Promise<SyncResult> {
    const oauthToken = await this.authService.getMicrosoftOAuthToken(user.userId);

    if (!oauthToken) {
      throw new UnauthorizedException(
        "Microsoft OAuth token not found. Please sign out and sign in again with Microsoft.",
      );
    }

    try {
      return await this.syncService.syncEmails(user, oauthToken);
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
}

