import {
  Body, Controller, Delete, Get, Param, Patch, Post, Query, Module,
  Injectable, NotFoundException, BadRequestException,
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import type { AuthUser } from "@helios/types";
import { PrismaService } from "../prisma/prisma.service";
import { CurrentUser, RequirePermissions } from "../auth/decorators";

export interface EstimateTotals {
  direct: number; indirect: number; contingency: number; total: number;
  carbon: number; byDiscipline: Record<string, number>; lineCount: number;
}

export function estimateTotals(
  est: { indirectPct: number; contingencyPct: number },
  lines: { quantity: number; unitRate: number; carbonFactor: number; discipline: string | null }[],
): EstimateTotals {
  let direct = 0, carbon = 0;
  const byDiscipline: Record<string, number> = {};
  for (const l of lines) {
    const amt = Math.round(l.quantity * l.unitRate);
    direct += amt;
    carbon += l.quantity * (l.carbonFactor ?? 0);
    const d = l.discipline ?? "Other";
    byDiscipline[d] = (byDiscipline[d] ?? 0) + amt;
  }
  const indirect = Math.round(direct * (est.indirectPct / 100));
  const contingency = Math.round((direct + indirect) * (est.contingencyPct / 100));
  return {
    direct, indirect, contingency, total: direct + indirect + contingency,
    carbon: Math.round(carbon), byDiscipline, lineCount: lines.length,
  };
}

@Injectable()
class EstimatingService {
  constructor(private readonly prisma: PrismaService) {}

  list(orgId: string, projectId: string) {
    return this.prisma.estimate.findMany({
      where: { orgId, projectId },
      orderBy: { createdAt: "desc" },
      include: { lineItems: true },
    }).then((ests) =>
      ests.map((e) => ({
        id: e.id, code: e.code, name: e.name, aaceClass: e.aaceClass,
        method: e.method, status: e.status, version: e.version, currency: e.currency,
        totals: estimateTotals(e, e.lineItems),
      })),
    );
  }

  async get(orgId: string, id: string) {
    const est = await this.prisma.estimate.findFirst({
      where: { id, orgId },
      include: { lineItems: { orderBy: { sortOrder: "asc" } }, project: { select: { id: true, name: true, currency: true } } },
    });
    if (!est) throw new NotFoundException("Estimate not found");
    return { ...est, totals: estimateTotals(est, est.lineItems) };
  }

  async create(orgId: string, dto: any) {
    const count = await this.prisma.estimate.count({ where: { projectId: dto.projectId } });
    return this.prisma.estimate.create({
      data: {
        orgId, projectId: dto.projectId, name: dto.name,
        code: dto.code ?? `EST-${String(count + 1).padStart(3, "0")}`,
        aaceClass: dto.aaceClass ?? "CLASS_5", method: dto.method ?? "FACTOR",
        contingencyPct: dto.contingencyPct ?? 10, indirectPct: dto.indirectPct ?? 15,
        createdById: dto.createdById,
      },
    });
  }

  async update(orgId: string, id: string, dto: any) {
    await this.assert(orgId, id);
    return this.prisma.estimate.update({ where: { id }, data: dto });
  }

  async assert(orgId: string, id: string) {
    const e = await this.prisma.estimate.findFirst({ where: { id, orgId } });
    if (!e) throw new NotFoundException("Estimate not found");
    return e;
  }

  async addLine(orgId: string, estimateId: string, dto: any) {
    await this.assert(orgId, estimateId);
    let base = { ...dto };
    // Pull defaults from the cost library if linked.
    if (dto.costLibraryItemId) {
      const item = await this.prisma.costLibraryItem.findFirst({
        where: { id: dto.costLibraryItemId, orgId },
      });
      if (!item) throw new BadRequestException("Cost library item not found");
      base = {
        costLibraryItemId: item.id,
        code: item.code,
        description: dto.description ?? item.description,
        discipline: item.discipline,
        category: item.category,
        unit: item.unit,
        unitRate: Math.round(item.baseRate * item.locationFactor),
        quantity: dto.quantity ?? 1,
      };
    }
    return this.prisma.estimateLineItem.create({
      data: {
        estimateId,
        costLibraryItemId: base.costLibraryItemId ?? null,
        code: base.code ?? null,
        description: base.description,
        discipline: base.discipline ?? null,
        category: base.category ?? null,
        unit: base.unit ?? "ea",
        quantity: base.quantity ?? 0,
        unitRate: base.unitRate ?? 0,
        carbonFactor: base.carbonFactor ?? 0,
      },
    });
  }

  async updateLine(orgId: string, estimateId: string, lineId: string, dto: any) {
    await this.assert(orgId, estimateId);
    return this.prisma.estimateLineItem.update({ where: { id: lineId }, data: dto });
  }

  async removeLine(orgId: string, estimateId: string, lineId: string) {
    await this.assert(orgId, estimateId);
    await this.prisma.estimateLineItem.delete({ where: { id: lineId } });
    return { id: lineId, deleted: true };
  }

  // Freeze the estimate as the project cost baseline (BAC).
  async promote(orgId: string, id: string, userId: string) {
    const est = await this.prisma.estimate.findFirst({
      where: { id, orgId }, include: { lineItems: true },
    });
    if (!est) throw new NotFoundException("Estimate not found");
    const totals = estimateTotals(est, est.lineItems);

    await this.prisma.estimate.update({ where: { id }, data: { status: "BASELINED" } });
    const baseline = await this.prisma.baseline.upsert({
      where: { projectId: est.projectId },
      update: { estimateId: est.id, name: `Baseline — ${est.name}`, bac: totals.total, setById: userId },
      create: { projectId: est.projectId, estimateId: est.id, name: `Baseline — ${est.name}`, bac: totals.total, setById: userId },
    });
    return { baseline, totals };
  }
}

@ApiTags("Estimating")
@ApiBearerAuth()
@Controller("estimating")
class EstimatingController {
  constructor(private readonly service: EstimatingService) {}

  @Get() @RequirePermissions("estimating:view")
  list(@CurrentUser() u: AuthUser, @Query("projectId") projectId: string) {
    return this.service.list(u.orgId, projectId);
  }

  @Get(":id") @RequirePermissions("estimating:view")
  get(@CurrentUser() u: AuthUser, @Param("id") id: string) {
    return this.service.get(u.orgId, id);
  }

  @Post() @RequirePermissions("estimating:create")
  create(@CurrentUser() u: AuthUser, @Body() dto: any) {
    return this.service.create(u.orgId, { ...dto, createdById: u.id });
  }

  @Patch(":id") @RequirePermissions("estimating:edit")
  update(@CurrentUser() u: AuthUser, @Param("id") id: string, @Body() dto: any) {
    return this.service.update(u.orgId, id, dto);
  }

  @Post(":id/lines") @RequirePermissions("estimating:edit")
  addLine(@CurrentUser() u: AuthUser, @Param("id") id: string, @Body() dto: any) {
    return this.service.addLine(u.orgId, id, dto);
  }

  @Patch(":id/lines/:lineId") @RequirePermissions("estimating:edit")
  updateLine(@CurrentUser() u: AuthUser, @Param("id") id: string, @Param("lineId") lineId: string, @Body() dto: any) {
    return this.service.updateLine(u.orgId, id, lineId, dto);
  }

  @Delete(":id/lines/:lineId") @RequirePermissions("estimating:edit")
  removeLine(@CurrentUser() u: AuthUser, @Param("id") id: string, @Param("lineId") lineId: string) {
    return this.service.removeLine(u.orgId, id, lineId);
  }

  @Post(":id/promote") @RequirePermissions("estimating:approve")
  promote(@CurrentUser() u: AuthUser, @Param("id") id: string) {
    return this.service.promote(u.orgId, id, u.id);
  }
}

@Module({
  controllers: [EstimatingController],
  providers: [EstimatingService],
})
export class EstimatingModule {}
