import {
  Body, Controller, Delete, Get, Param, Patch, Post, Query, Module,
  Injectable, NotFoundException,
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import type { AuthUser } from "@helios/types";
import { PrismaService } from "../prisma/prisma.service";
import { CurrentUser, RequirePermissions } from "../auth/decorators";
import { computeEvm } from "../controls/evm";
import { estimateTotals } from "../estimating/estimating.module";

// ----- Scheduling -----
@ApiTags("Scheduling")
@ApiBearerAuth()
@Controller("schedule")
class ScheduleController {
  constructor(private readonly prisma: PrismaService) {}

  @Get() @RequirePermissions("scheduling:view")
  list(@CurrentUser() u: AuthUser, @Query("projectId") projectId: string) {
    return this.prisma.scheduleActivity.findMany({
      where: { projectId },
      orderBy: { sortOrder: "asc" },
    });
  }

  @Post() @RequirePermissions("scheduling:create")
  create(@CurrentUser() u: AuthUser, @Body() dto: any) {
    return this.prisma.scheduleActivity.create({
      data: {
        projectId: dto.projectId, wbs: dto.wbs, name: dto.name,
        startDate: new Date(dto.startDate), endDate: new Date(dto.endDate),
        percentComplete: dto.percentComplete ?? 0, predecessors: dto.predecessors,
        sortOrder: dto.sortOrder ?? 0,
      },
    });
  }

  @Patch(":id") @RequirePermissions("scheduling:edit")
  update(@Param("id") id: string, @Body() dto: any) {
    const data: any = { ...dto };
    if (dto.startDate) data.startDate = new Date(dto.startDate);
    if (dto.endDate) data.endDate = new Date(dto.endDate);
    return this.prisma.scheduleActivity.update({ where: { id }, data });
  }

  @Delete(":id") @RequirePermissions("scheduling:edit")
  async remove(@Param("id") id: string) {
    await this.prisma.scheduleActivity.delete({ where: { id } });
    return { id, deleted: true };
  }
}

// ----- Tendering & Contracting -----
@ApiTags("Tendering & Contracting")
@ApiBearerAuth()
@Controller("tenders")
class TenderController {
  constructor(private readonly prisma: PrismaService) {}

  @Get() @RequirePermissions("tendering:view")
  list(@CurrentUser() u: AuthUser, @Query("projectId") projectId: string) {
    return this.prisma.tender.findMany({
      where: { orgId: u.orgId, ...(projectId ? { projectId } : {}) },
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { bids: true } } },
    });
  }

  @Get(":id") @RequirePermissions("tendering:view")
  async get(@CurrentUser() u: AuthUser, @Param("id") id: string) {
    const tender = await this.prisma.tender.findFirst({
      where: { id, orgId: u.orgId },
      include: { bids: { orderBy: { amount: "asc" } } },
    });
    if (!tender) throw new NotFoundException("Tender not found");
    return tender;
  }

  @Post() @RequirePermissions("tendering:create")
  async create(@CurrentUser() u: AuthUser, @Body() dto: any) {
    const count = await this.prisma.tender.count({ where: { projectId: dto.projectId } });
    return this.prisma.tender.create({
      data: {
        orgId: u.orgId, projectId: dto.projectId,
        ref: dto.ref ?? `TND-${String(count + 1).padStart(3, "0")}`,
        title: dto.title, referenceEstimate: dto.referenceEstimate ?? 0,
      },
    });
  }

  @Post(":id/bids") @RequirePermissions("tendering:edit")
  addBid(@Param("id") id: string, @Body() dto: any) {
    return this.prisma.bid.create({
      data: { tenderId: id, vendor: dto.vendor, amount: dto.amount, score: dto.score, notes: dto.notes },
    });
  }

  // Award a bid → mark tender AWARDED and create a Contract.
  @Post(":id/award") @RequirePermissions("tendering:approve")
  async award(@CurrentUser() u: AuthUser, @Param("id") id: string, @Body() dto: any) {
    const tender = await this.prisma.tender.findFirst({ where: { id, orgId: u.orgId }, include: { bids: true } });
    if (!tender) throw new NotFoundException("Tender not found");
    const bid = tender.bids.find((b) => b.id === dto.bidId);
    if (!bid) throw new NotFoundException("Bid not found");
    await this.prisma.$transaction([
      this.prisma.bid.updateMany({ where: { tenderId: id }, data: { awarded: false } }),
      this.prisma.bid.update({ where: { id: bid.id }, data: { awarded: true } }),
      this.prisma.tender.update({ where: { id }, data: { status: "AWARDED" } }),
      this.prisma.contract.create({
        data: {
          orgId: u.orgId, projectId: tender.projectId,
          ref: `CTR-${tender.ref}`, vendor: bid.vendor,
          type: dto.type ?? "LUMP_SUM", value: bid.amount,
        },
      }),
    ]);
    return { awarded: bid.vendor, value: bid.amount };
  }
}

// ----- Benchmarking -----
@ApiTags("Benchmarking")
@ApiBearerAuth()
@Controller("benchmarks")
class BenchmarkController {
  constructor(private readonly prisma: PrismaService) {}

  @Get() @RequirePermissions("benchmarking:view")
  list(@CurrentUser() u: AuthUser) {
    return this.prisma.benchmarkRecord.findMany({ where: { orgId: u.orgId }, orderBy: { metric: "asc" } });
  }

  // Compare a project's discipline cost split against anonymised benchmarks.
  @Get("compare") @RequirePermissions("benchmarking:view")
  async compare(@CurrentUser() u: AuthUser, @Query("projectId") projectId: string) {
    const baseline = await this.prisma.baseline.findFirst({
      where: { projectId },
      include: { estimate: { include: { lineItems: true } } },
    });
    const records = await this.prisma.benchmarkRecord.findMany({ where: { orgId: u.orgId } });
    if (!baseline) return { bac: 0, byDiscipline: {}, benchmarks: records };
    const totals = estimateTotals(baseline.estimate, baseline.estimate.lineItems);
    return { bac: baseline.bac, byDiscipline: totals.byDiscipline, benchmarks: records };
  }
}

// ----- BIM / Takeoff import -----
@ApiTags("BIM / Takeoff")
@ApiBearerAuth()
@Controller("bim")
class BimController {
  constructor(private readonly prisma: PrismaService) {}

  // Import quantity takeoff rows (representing a BIM/5D export) into an estimate.
  @Post("import") @RequirePermissions("bim:create")
  async importTakeoff(@CurrentUser() u: AuthUser, @Body() dto: any) {
    const est = await this.prisma.estimate.findFirst({ where: { id: dto.estimateId, orgId: u.orgId } });
    if (!est) throw new NotFoundException("Estimate not found");
    const rows: any[] = dto.rows ?? [];
    await this.prisma.estimateLineItem.createMany({
      data: rows.map((r) => ({
        estimateId: est.id,
        description: r.description ?? "Takeoff item",
        discipline: r.discipline ?? "BIM",
        category: r.category ?? "Takeoff",
        unit: r.unit ?? "ea",
        quantity: Number(r.quantity) || 0,
        unitRate: Math.round((Number(r.unitRate) || 0) * 100),
      })),
    });
    return { imported: rows.length, estimateId: est.id };
  }
}

// ----- Dashboards -----
@ApiTags("Dashboards")
@ApiBearerAuth()
@Controller("dashboard")
class DashboardController {
  constructor(private readonly prisma: PrismaService) {}

  @Get(":projectId") @RequirePermissions("dashboarding:view")
  async project(@CurrentUser() u: AuthUser, @Param("projectId") projectId: string) {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, orgId: u.orgId, deletedAt: null },
      include: {
        baseline: { include: { estimate: { include: { lineItems: true } } } },
        controlPeriods: { orderBy: { periodIndex: "asc" } },
        changes: true,
        risks: true,
      },
    });
    if (!project) throw new NotFoundException("Project not found");
    const evm = computeEvm(project.controlPeriods, project.baseline?.bac);
    const totals = project.baseline
      ? estimateTotals(project.baseline.estimate, project.baseline.estimate.lineItems)
      : null;
    return {
      project: { id: project.id, name: project.name, code: project.code, currency: project.currency, status: project.status, type: project.type },
      evm,
      costBreakdown: totals?.byDiscipline ?? {},
      carbon: totals?.carbon ?? 0,
      openChanges: project.changes.filter((c) => c.status !== "REJECTED").length,
      approvedChangeImpact: project.changes.filter((c) => c.status === "APPROVED").reduce((s, c) => s + c.costImpact, 0),
      riskExposure: Math.round(project.risks.reduce((s, r) => s + r.probability * r.impactCost, 0)),
    };
  }
}

@Module({
  controllers: [
    ScheduleController, TenderController, BenchmarkController, BimController, DashboardController,
  ],
})
export class DeliveryModule {}
