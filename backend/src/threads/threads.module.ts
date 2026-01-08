import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { InsightModule } from "../insight/insight.module";
import { ThreadsController } from "./threads.controller";
import { ThreadsService } from "./threads.service";

@Module({
  imports: [AuthModule, InsightModule],
  controllers: [ThreadsController],
  providers: [ThreadsService],
})
export class ThreadsModule {}

