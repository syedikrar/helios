import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import type { AuthUser } from "@helios/types";
import { CostLibraryService } from "./cost-library.service";
import { CreateCostItemDto, UpdateCostItemDto } from "./dto";
import { CurrentUser, RequirePermissions } from "../auth/decorators";

@ApiTags("Cost Library")
@ApiBearerAuth()
@Controller("cost-library")
export class CostLibraryController {
  constructor(private readonly service: CostLibraryService) {}

  @Get()
  @RequirePermissions("costlibrary:view")
  list(
    @CurrentUser() user: AuthUser,
    @Query("q") q?: string,
    @Query("discipline") discipline?: string,
    @Query("category") category?: string,
    @Query("page") page?: string,
    @Query("pageSize") pageSize?: string,
  ) {
    return this.service.list(user.orgId, {
      q,
      discipline,
      category,
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
    });
  }

  @Get("facets")
  @RequirePermissions("costlibrary:view")
  facets(@CurrentUser() user: AuthUser) {
    return this.service.facets(user.orgId);
  }

  @Post()
  @RequirePermissions("costlibrary:create")
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateCostItemDto) {
    return this.service.create(user.orgId, dto);
  }

  @Patch(":id")
  @RequirePermissions("costlibrary:edit")
  update(
    @CurrentUser() user: AuthUser,
    @Param("id") id: string,
    @Body() dto: UpdateCostItemDto,
  ) {
    return this.service.update(user.orgId, id, dto);
  }

  @Delete(":id")
  @RequirePermissions("costlibrary:delete")
  remove(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    return this.service.remove(user.orgId, id);
  }
}
