import { Controller, Get, Param, Post } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import type { AuthUser } from "@helios/types";
import { ConnectorsService } from "./connectors.service";
import { CurrentUser, RequirePermissions } from "../auth/decorators";

@ApiTags("Integrations")
@ApiBearerAuth()
@Controller("connectors")
export class ConnectorsController {
  constructor(private readonly service: ConnectorsService) {}

  @Get()
  @RequirePermissions("integrations:view")
  list(@CurrentUser() user: AuthUser) {
    return this.service.list(user.orgId);
  }

  @Get(":id")
  @RequirePermissions("integrations:view")
  get(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    return this.service.get(user.orgId, id);
  }

  @Post(":id/sync")
  @RequirePermissions("integrations:edit")
  sync(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    return this.service.sync(user.orgId, id);
  }
}
