import { Controller, Get, Param, Post } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import type { AuthUser } from "@helios/types";
import { NotificationsService } from "./notifications.service";
import { CurrentUser, RequirePermissions } from "../auth/decorators";

@ApiTags("Notifications")
@ApiBearerAuth()
@Controller("notifications")
export class NotificationsController {
  constructor(private readonly service: NotificationsService) {}

  @Get()
  @RequirePermissions("notifications:view")
  list(@CurrentUser() user: AuthUser) {
    return this.service.listMine(user.id);
  }

  @Get("unread-count")
  @RequirePermissions("notifications:view")
  unread(@CurrentUser() user: AuthUser) {
    return this.service.unreadCount(user.id);
  }

  @Post("read-all")
  @RequirePermissions("notifications:view")
  readAll(@CurrentUser() user: AuthUser) {
    return this.service.markAllRead(user.id);
  }

  @Post(":id/read")
  @RequirePermissions("notifications:view")
  read(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    return this.service.markRead(user.id, id);
  }
}
