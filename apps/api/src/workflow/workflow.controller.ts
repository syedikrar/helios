import { Body, Controller, Get, Param, Post, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import type { AuthUser } from "@helios/types";
import { WorkflowService } from "./workflow.service";
import { CreateApprovalDto, TransitionDto } from "./dto";
import { CurrentUser, RequirePermissions } from "../auth/decorators";

@ApiTags("Workflow & Approvals")
@ApiBearerAuth()
@Controller("workflow")
export class WorkflowController {
  constructor(private readonly service: WorkflowService) {}

  @Get()
  @RequirePermissions("workflow:view")
  list(@CurrentUser() user: AuthUser, @Query("status") status?: string) {
    return this.service.list(user.orgId, status);
  }

  @Get(":id")
  @RequirePermissions("workflow:view")
  get(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    return this.service.get(user.orgId, id);
  }

  @Post()
  @RequirePermissions("workflow:create")
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateApprovalDto) {
    return this.service.create(user, dto);
  }

  @Post(":id/transition")
  @RequirePermissions("workflow:approve")
  transition(
    @CurrentUser() user: AuthUser,
    @Param("id") id: string,
    @Body() dto: TransitionDto,
  ) {
    return this.service.transition(user, id, dto);
  }
}
