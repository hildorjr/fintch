import { Module } from "@nestjs/common";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { PrismaModule } from "./prisma/prisma.module";
import { AuthModule } from "./auth/auth.module";
import { SyncModule } from "./sync/sync.module";
import { ThreadsModule } from "./threads/threads.module";
import { InsightModule } from "./insight/insight.module";

@Module({
  imports: [PrismaModule, AuthModule, SyncModule, ThreadsModule, InsightModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
