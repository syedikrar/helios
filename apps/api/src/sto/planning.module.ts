import {
  Body, Controller, Get, Param, Patch, Post, Query, Module,
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import type { AuthUser } from "@helios/types";
import { PrismaService } from "../prisma/prisma.service";
import { CurrentUser, RequirePermissions } from "../auth/decorators";

@ApiTags("Scoping")
@ApiBearerAuth()
@Controller("scoping")
class ScopingController {
  constructor(private readonly prisma: PrismaService) {}

  @Get() @RequirePermissions("scoping:view")
  async list(@CurrentUser() u: AuthUser, @Query("projectId") projectId: string) {
    const items = await this.prisma.scopeItem.findMany({
      where: { orgId: u.orgId, projectId }, orderBy: { ref: "asc" },
    });
    const byStatus: Record<string, number> = {};
    let hours = 0;
    for (const i of items) { byStatus[i.status] = (byStatus[i.status] ?? 0) + 1; hours += i.estimatedHours; }
    return { data: items, meta: { total: items.length, estimatedHours: hours, byStatus } };
  }

  @Post() @RequirePermissions("scoping:create")
  async create(@CurrentUser() u: AuthUser, @Body() dto: any) {
    const count = await this.prisma.scopeItem.count({ where: { projectId: dto.projectId } });
    return this.prisma.scopeItem.create({
      data: {
        orgId: u.orgId, projectId: dto.projectId,
        ref: dto.ref ?? `SC-${String(count + 1).padStart(3, "0")}`,
        description: dto.description, discipline: dto.discipline,
        equipmentTag: dto.equipmentTag, priority: dto.priority ?? "MEDIUM",
        estimatedHours: dto.estimatedHours ?? 0,
      },
    });
  }

  @Patch(":id") @RequirePermissions("scoping:edit")
  update(@Param("id") id: string, @Body() dto: any) {
    return this.prisma.scopeItem.update({ where: { id }, data: dto });
  }
}

@ApiTags("Work Packs")
@ApiBearerAuth()
@Controller("workpacks")
class WorkPackController {
  constructor(private readonly prisma: PrismaService) {}

  @Get() @RequirePermissions("workpack:view")
  async list(@CurrentUser() u: AuthUser, @Query("projectId") projectId: string) {
    const packs = await this.prisma.workPack.findMany({
      where: { orgId: u.orgId, projectId }, orderBy: { ref: "asc" },
      include: { _count: { select: { materials: true } } },
    });
    return packs;
  }

  @Get(":id") @RequirePermissions("workpack:view")
  async get(@CurrentUser() u: AuthUser, @Param("id") id: string) {
    const pack = await this.prisma.workPack.findFirst({
      where: { id, orgId: u.orgId }, include: { materials: true },
    });
    const scope = pack ? await this.prisma.scopeItem.findMany({ where: { workPackId: id } }) : [];
    return { ...pack, scopeItems: scope };
  }

  @Post() @RequirePermissions("workpack:create")
  async create(@CurrentUser() u: AuthUser, @Body() dto: any) {
    const count = await this.prisma.workPack.count({ where: { projectId: dto.projectId } });
    return this.prisma.workPack.create({
      data: {
        orgId: u.orgId, projectId: dto.projectId,
        ref: dto.ref ?? `WP-${String(count + 1).padStart(3, "0")}`,
        title: dto.title, discipline: dto.discipline,
        plannedHours: dto.plannedHours ?? 0, contractor: dto.contractor,
      },
    });
  }

  @Patch(":id") @RequirePermissions("workpack:edit")
  update(@Param("id") id: string, @Body() dto: any) {
    return this.prisma.workPack.update({ where: { id }, data: dto });
  }
}

@ApiTags("Material Management")
@ApiBearerAuth()
@Controller("materials")
class MaterialController {
  constructor(private readonly prisma: PrismaService) {}

  @Get() @RequirePermissions("material:view")
  async list(@CurrentUser() u: AuthUser, @Query("projectId") projectId: string, @Query("workPackId") workPackId?: string) {
    const packs = await this.prisma.workPack.findMany({
      where: { orgId: u.orgId, projectId, ...(workPackId ? { id: workPackId } : {}) },
      select: { id: true, ref: true, title: true },
    });
    const packMap = new Map(packs.map((p) => [p.id, p]));
    const materials = await this.prisma.material.findMany({
      where: { workPackId: { in: packs.map((p) => p.id) } }, orderBy: { partNo: "asc" },
    });
    const shortages = materials.filter((m) => m.status === "SHORTAGE").length;
    return {
      data: materials.map((m) => ({ ...m, workPack: packMap.get(m.workPackId) })),
      meta: { total: materials.length, shortages, received: materials.filter((m) => m.status === "RECEIVED").length },
    };
  }

  @Post() @RequirePermissions("material:create")
  create(@Body() dto: any) {
    return this.prisma.material.create({
      data: {
        workPackId: dto.workPackId, partNo: dto.partNo, description: dto.description,
        quantity: dto.quantity ?? 1, unit: dto.unit ?? "ea", status: dto.status ?? "REQUIRED", supplier: dto.supplier,
      },
    });
  }

  @Patch(":id") @RequirePermissions("material:edit")
  update(@Param("id") id: string, @Body() dto: any) {
    return this.prisma.material.update({ where: { id }, data: dto });
  }
}

@Module({
  controllers: [ScopingController, WorkPackController, MaterialController],
})
export class StoPlanningModule {}
