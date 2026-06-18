import {
  Body, Controller, Delete, Get, Param, Patch, Post, Query, Module,
  Injectable, NotFoundException,
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import type { AuthUser } from "@helios/types";
import { PrismaService } from "../prisma/prisma.service";
import { CurrentUser, RequirePermissions } from "../auth/decorators";
import { computeEvm } from "./evm";

@Injectable()
class ControlsService {
  constructor(private readonly prisma: PrismaService) {}

  // The EVM dashboard payload: baseline, periods, computed metrics + S-curve.
  async evm(orgId: string, projectId: string) {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, orgId, deletedAt: null },
      include: {
        baseline: { include: { estimate: { select: { name: true } } } },
        controlPeriods: { orderBy: { periodIndex: "asc" } },
      },
    });
    if (!project) throw new NotFoundException("Project not found");
    const evm = computeEvm(project.controlPeriods, project.baseline?.bac);
    return {
      project: { id: project.id, name: project.name, code: project.code, currency: project.currency, status: project.status },
      baseline: project.baseline,
      periods: project.controlPeriods,
      evm,
    };
  }

  async upsertPeriod(orgId: string, projectId: string, dto: any) {
    const project = await this.prisma.project.findFirst({ where: { id: projectId, orgId } });
    if (!project) throw new NotFoundException("Project not found");
    return this.prisma.controlPeriod.upsert({
      where: { projectId_periodIndex: { projectId, periodIndex: dto.periodIndex } },
      update: { label: dto.label, plannedValue: dto.plannedValue, earnedValue: dto.earnedValue, actualCost: dto.actualCost },
      create: {
        projectId, periodIndex: dto.periodIndex, label: dto.label,
        plannedValue: dto.plannedValue ?? 0, earnedValue: dto.earnedValue ?? 0, actualCost: dto.actualCost ?? 0,
      },
    });
  }
}

@ApiTags("Project Controls / EVM")
@ApiBearerAuth()
@Controller("controls")
class ControlsController {
  constructor(private readonly service: ControlsService) {}

  @Get(":projectId") @RequirePermissions("controls:view")
  evm(@CurrentUser() u: AuthUser, @Param("projectId") projectId: string) {
    return this.service.evm(u.orgId, projectId);
  }

  @Post(":projectId/periods") @RequirePermissions("controls:edit")
  upsertPeriod(@CurrentUser() u: AuthUser, @Param("projectId") projectId: string, @Body() dto: any) {
    return this.service.upsertPeriod(u.orgId, projectId, dto);
  }
}

// ----- Change Management -----
@ApiTags("Change Management")
@ApiBearerAuth()
@Controller("change")
class ChangeController {
  constructor(private readonly prisma: PrismaService) {}

  @Get() @RequirePermissions("change:view")
  async list(@CurrentUser() u: AuthUser, @Query("projectId") projectId: string) {
    const changes = await this.prisma.changeRequest.findMany({
      where: { orgId: u.orgId, ...(projectId ? { projectId } : {}) },
      orderBy: { createdAt: "desc" },
    });
    const approved = changes.filter((c) => c.status === "APPROVED");
    return {
      data: changes,
      meta: {
        total: changes.length,
        approvedCostImpact: approved.reduce((s, c) => s + c.costImpact, 0),
        approvedTimeImpact: approved.reduce((s, c) => s + c.timeImpact, 0),
      },
    };
  }

  @Post() @RequirePermissions("change:create")
  async create(@CurrentUser() u: AuthUser, @Body() dto: any) {
    const count = await this.prisma.changeRequest.count({ where: { projectId: dto.projectId } });
    return this.prisma.changeRequest.create({
      data: {
        orgId: u.orgId, projectId: dto.projectId,
        ref: dto.ref ?? `CR-${String(count + 1).padStart(3, "0")}`,
        title: dto.title, description: dto.description,
        costImpact: dto.costImpact ?? 0, timeImpact: dto.timeImpact ?? 0,
        raisedById: u.id,
      },
    });
  }

  @Patch(":id") @RequirePermissions("change:edit")
  update(@CurrentUser() u: AuthUser, @Param("id") id: string, @Body() dto: any) {
    return this.prisma.changeRequest.update({ where: { id }, data: dto });
  }
}

// ----- Risk Management -----
@ApiTags("Risk Management")
@ApiBearerAuth()
@Controller("risk")
class RiskController {
  constructor(private readonly prisma: PrismaService) {}

  @Get() @RequirePermissions("risk:view")
  async list(@CurrentUser() u: AuthUser, @Query("projectId") projectId: string) {
    const risks = await this.prisma.risk.findMany({
      where: { orgId: u.orgId, ...(projectId ? { projectId } : {}) },
      orderBy: { createdAt: "desc" },
    });
    // Expected value + simple P50/P80 contingency approximation.
    const expected = risks.reduce((s, r) => s + r.probability * r.impactCost, 0);
    const totalImpact = risks.reduce((s, r) => s + r.impactCost, 0);
    return {
      data: risks.map((r) => ({ ...r, expectedValue: Math.round(r.probability * r.impactCost) })),
      meta: {
        total: risks.length,
        expectedValue: Math.round(expected),
        p50: Math.round(expected),
        p80: Math.round(expected + 0.35 * (totalImpact - expected)),
      },
    };
  }

  @Post() @RequirePermissions("risk:create")
  async create(@CurrentUser() u: AuthUser, @Body() dto: any) {
    const count = await this.prisma.risk.count({ where: { projectId: dto.projectId } });
    return this.prisma.risk.create({
      data: {
        orgId: u.orgId, projectId: dto.projectId,
        ref: dto.ref ?? `R-${String(count + 1).padStart(3, "0")}`,
        title: dto.title, category: dto.category,
        probability: dto.probability ?? 0.3, impactCost: dto.impactCost ?? 0,
        response: dto.response, owner: dto.owner,
      },
    });
  }

  @Patch(":id") @RequirePermissions("risk:edit")
  update(@CurrentUser() u: AuthUser, @Param("id") id: string, @Body() dto: any) {
    return this.prisma.risk.update({ where: { id }, data: dto });
  }
}

@Module({
  controllers: [ControlsController, ChangeController, RiskController],
  providers: [ControlsService],
})
export class ControlsModule {}
