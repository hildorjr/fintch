import { Injectable, Logger } from "@nestjs/common";
import { createClerkClient } from "@clerk/backend";
import { PrismaService } from "../prisma/prisma.service";
import type { ClerkUser } from "./auth.guard";

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private clerk = createClerkClient({
    secretKey: process.env.CLERK_SECRET_KEY,
  });

  constructor(private prisma: PrismaService) {}

  async syncUser(clerkUser: ClerkUser) {
    return this.prisma.user.upsert({
      where: { id: clerkUser.userId },
      update: {
        email: clerkUser.email,
        name: clerkUser.name,
      },
      create: {
        id: clerkUser.userId,
        email: clerkUser.email,
        name: clerkUser.name,
      },
    });
  }

  async getMicrosoftOAuthToken(userId: string): Promise<string | null> {
    try {
      const tokens = await this.clerk.users.getUserOauthAccessToken(
        userId,
        "oauth_microsoft",
      );
      this.logger.log(`OAuth tokens found: ${tokens.data.length}`);
      if (tokens.data[0]) {
        this.logger.log(`Token scopes: ${tokens.data[0].scopes?.join(", ")}`);
      }
      return tokens.data[0]?.token ?? null;
    } catch (error) {
      this.logger.error("Failed to get Microsoft OAuth token", error);
      return null;
    }
  }
}
