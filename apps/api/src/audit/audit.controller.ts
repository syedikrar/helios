import { Controller, Get, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { Prisma } from "@prisma/client";
import type { AuthUser } from "@helios/types";
import { PrismaService } from "../prisma/prisma.service";
import { CurrentUser, RequirePermissions } from "../auth/decorators";

@ApiTags("Audit Trail")
@ApiBearerAuth()
@Controller("audit")
export class AuditController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @RequirePermissions("audit:view")
  async list(
    @CurrentUser() user: AuthUser,
    @Query("entityType") entityType?: string,
    @Query("action") action?: string,
    @Query("q") q?: string,
    @Query("page") pageStr?: string,
  ) {
    const page = Math.max(1, pageStr ? Number(pageStr) : 1);
    const pageSize = 50;
    const where: Prisma.AuditLogWhereInput = {
      orgId: user.orgId,
      ...(entityType ? { entityType } : {}),
      ...(action ? { action: action as any } : {}),
      ...(q ? { summary: { contains: q, mode: "insensitive" } } : {}),
    };
    const [total, data, entityTypes] = await Promise.all([
      this.prisma.auditLog.count({ where }),
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.auditLog.findMany({
        where: { orgId: user.orgId },
        select: { entityType: true },
        distinct: ["entityType"],
      }),
    ]);
    return {
      data,
      meta: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
        entityTypes: entityTypes.map((e) => e.entityType).sort(),
      },
    };
  }
}
