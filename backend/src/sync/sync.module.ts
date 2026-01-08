import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { SyncController } from "./sync.controller";
import { SyncService } from "./sync.service";
import { GraphService } from "./graph.service";

@Module({
  imports: [AuthModule],
  controllers: [SyncController],
  providers: [SyncService, GraphService],
})
export class SyncModule {}

