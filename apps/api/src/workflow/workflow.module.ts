import { Module } from "@nestjs/common";
import { WorkflowService } from "./workflow.service";
import { WorkflowController } from "./workflow.controller";
import { NotificationsModule } from "../notifications/notifications.module";

@Module({
  imports: [NotificationsModule],
  controllers: [WorkflowController],
  providers: [WorkflowService],
})
export class WorkflowModule {}
