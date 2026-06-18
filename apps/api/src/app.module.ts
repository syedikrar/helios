import { join } from "node:path";
import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ServeStaticModule } from "@nestjs/serve-static";
import { PrismaModule } from "./prisma/prisma.module";
import { HealthModule } from "./health/health.module";
import { AuthModule } from "./auth/auth.module";
import { UsersModule } from "./users/users.module";
import { CostLibraryModule } from "./cost-library/cost-library.module";
import { ConnectorsModule } from "./connectors/connectors.module";
import { AuditModule } from "./audit/audit.module";
import { WorkflowModule } from "./workflow/workflow.module";
import { NotificationsModule } from "./notifications/notifications.module";
import { CommentsModule } from "./comments/comments.module";
import { ProjectsModule } from "./projects/projects.module";
import { EstimatingModule } from "./estimating/estimating.module";
import { ControlsModule } from "./controls/controls.module";
import { DeliveryModule } from "./delivery/delivery.module";
import { StoPlanningModule } from "./sto/planning.module";
import { StoQualityModule } from "./sto/quality.module";
import { StoExecutionModule } from "./sto/execution.module";
import { AiModule } from "./ai/ai.module";
import { EsgModule } from "./esg/esg.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    // In production (single Heroku dyno) the API also serves the built React app.
    // The compiled app.module.js lives at apps/api/dist, so web/dist is ../../web/dist.
    // Disable with SERVE_STATIC=false for pure-API local dev (web runs on Vite).
    ...(process.env.SERVE_STATIC === "false"
      ? []
      : [
          ServeStaticModule.forRoot({
            rootPath: join(__dirname, "..", "..", "web", "dist"),
            exclude: ["/api/(.*)"],
          }),
        ]),
    PrismaModule,
    AuthModule,
    HealthModule,
    UsersModule,
    CostLibraryModule,
    ConnectorsModule,
    AuditModule,
    WorkflowModule,
    NotificationsModule,
    CommentsModule,
    ProjectsModule,
    EstimatingModule,
    ControlsModule,
    DeliveryModule,
    StoPlanningModule,
    StoQualityModule,
    StoExecutionModule,
    AiModule,
    EsgModule,
  ],
})
export class AppModule {}
