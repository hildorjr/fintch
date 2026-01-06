import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { EmailController } from "./email.controller";
import { EmailService } from "./email.service";
import { GraphService } from "./graph.service";

@Module({
  imports: [AuthModule],
  controllers: [EmailController],
  providers: [EmailService, GraphService],
  exports: [EmailService],
})
export class EmailModule {}

