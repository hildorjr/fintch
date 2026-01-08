import {
  Controller,
  Post,
  Get,
  Param,
  UseGuards,
  Logger,
  InternalServerErrorException,
} from "@nestjs/common";
import { ClerkAuthGuard, User } from "../auth";
import type { ClerkUser } from "../auth";
import { ThreadsService } from "./threads.service";
import type { ThreadListResponse, ThreadDetailResponse, InsightResponse } from "./types";

@Controller("threads")
export class ThreadsController {
  private readonly logger = new Logger(ThreadsController.name);

  constructor(private threadsService: ThreadsService) {}

  @Get()
  @UseGuards(ClerkAuthGuard)
  async getThreads(@User() user: ClerkUser): Promise<ThreadListResponse> {
    return this.threadsService.getThreads(user.userId);
  }

  @Get(":id")
  @UseGuards(ClerkAuthGuard)
  async getThread(
    @User() user: ClerkUser,
    @Param("id") threadId: string,
  ): Promise<ThreadDetailResponse> {
    return this.threadsService.getThreadById(user.userId, threadId);
  }

  @Post(":id/insights")
  @UseGuards(ClerkAuthGuard)
  async generateInsight(
    @User() user: ClerkUser,
    @Param("id") threadId: string,
  ): Promise<InsightResponse | null> {
    try {
      return await this.threadsService.generateThreadInsight(user.userId, threadId);
    } catch (error) {
      this.logger.error("Insight generation failed", error);
      throw new InternalServerErrorException("Failed to generate insights");
    }
  }
}

