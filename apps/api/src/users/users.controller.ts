import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import type { AuthUser } from "@helios/types";
import { UsersService } from "./users.service";
import { CreateUserDto, UpdateUserDto } from "./dto/user.dto";
import { CurrentUser, RequirePermissions } from "../auth/decorators";

@ApiTags("Admin · Users")
@ApiBearerAuth()
@Controller("users")
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  @RequirePermissions("admin:view")
  list(@CurrentUser() user: AuthUser) {
    return this.users.list(user.orgId);
  }

  @Post()
  @RequirePermissions("admin:create")
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateUserDto) {
    return this.users.create(user.orgId, dto);
  }

  @Patch(":id")
  @RequirePermissions("admin:edit")
  update(
    @CurrentUser() user: AuthUser,
    @Param("id") id: string,
    @Body() dto: UpdateUserDto,
  ) {
    return this.users.update(user.orgId, id, dto);
  }

  @Delete(":id")
  @RequirePermissions("admin:delete")
  remove(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    return this.users.remove(user.orgId, id);
  }
}
