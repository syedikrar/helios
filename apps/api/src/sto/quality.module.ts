import {
  Body, Controller, Get, Param, Patch, Post, Query, Module,
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import type { AuthUser } from "@helios/types";
import { PrismaService } from "../prisma/prisma.service";
import { CurrentUser, RequirePermissions } from "../auth/decorators";

@ApiTags("Weld Management")
@ApiBearerAuth()
@Controller("welds")
class WeldController {
  constructor(private readonly prisma: PrismaService) {}

  // Weld register + LISL (Line Inspection Summary List) rollup + welder cert overview.
  @Get() @RequirePermissions("weld:view")
  async list(@CurrentUser() u: AuthUser, @Query("projectId") projectId: string) {
    const welds = await this.prisma.weldRecord.findMany({
      where: { orgId: u.orgId, projectId },
      orderBy: { weldId: "asc" },
      include: { welder: true, wps: true },
    });

    // LISL: group by line/ISO with acceptance rollup.
    const byLine = new Map<string, any>();
    for (const w of welds) {
      const key = w.lineIso ?? "UNASSIGNED";
      const row = byLine.get(key) ?? { lineIso: key, total: 0, accepted: 0, rejected: 0, pending: 0 };
      row.total++;
      if (w.ndeResult === "PASS") row.accepted++;
      else if (w.ndeResult === "FAIL") row.rejected++;
      else row.pending++;
      byLine.set(key, row);
    }

    const summary = {
      total: welds.length,
      accepted: welds.filter((w) => w.ndeResult === "PASS").length,
      rejected: welds.filter((w) => w.ndeResult === "FAIL").length,
      pending: welds.filter((w) => w.ndeResult === "PENDING").length,
    };
    const repairRate = summary.total ? Math.round((summary.rejected / summary.total) * 1000) / 10 : 0;

    // No top-level `data` key → the transform interceptor nests the whole payload
    // under `data`, matching the other multi-field STO endpoints (qa, execution).
    return { welds, lisl: [...byLine.values()], summary: { ...summary, repairRate } };
  }

  @Post() @RequirePermissions("weld:create")
  async create(@CurrentUser() u: AuthUser, @Body() dto: any) {
    const count = await this.prisma.weldRecord.count({ where: { projectId: dto.projectId } });
    return this.prisma.weldRecord.create({
      data: {
        orgId: u.orgId, projectId: dto.projectId, workPackId: dto.workPackId,
        weldId: dto.weldId ?? `W-${String(count + 1).padStart(4, "0")}`,
        joint: dto.joint, lineIso: dto.lineIso, welderId: dto.welderId,
        wpsId: dto.wpsId, pqrRef: dto.pqrRef, heatNo: dto.heatNo,
      },
    });
  }

  @Patch(":id") @RequirePermissions("weld:edit")
  update(@Param("id") id: string, @Body() dto: any) {
    return this.prisma.weldRecord.update({ where: { id }, data: dto });
  }

  // Welder qualification overview — flags expired certifications.
  @Get("welders/list") @RequirePermissions("weld:view")
  async welders(@CurrentUser() u: AuthUser) {
    const welders = await this.prisma.welder.findMany({
      where: { orgId: u.orgId }, orderBy: { stamp: "asc" },
      include: { _count: { select: { welds: true } } },
    });
    const now = Date.now();
    return welders.map((w) => ({
      ...w,
      expired: w.certExpiry ? new Date(w.certExpiry).getTime() < now : false,
    }));
  }

  @Get("wps/list") @RequirePermissions("weld:view")
  wps(@CurrentUser() u: AuthUser) {
    return this.prisma.wps.findMany({ where: { orgId: u.orgId }, include: { pqrs: true } });
  }
}

@ApiTags("QA/QC")
@ApiBearerAuth()
@Controller("qa")
class QaController {
  constructor(private readonly prisma: PrismaService) {}

  @Get() @RequirePermissions("qaqc:view")
  async list(@CurrentUser() u: AuthUser, @Query("projectId") projectId: string) {
    const [checks, ncrs] = await Promise.all([
      this.prisma.qaCheck.findMany({ where: { orgId: u.orgId, projectId }, orderBy: { createdAt: "desc" } }),
      this.prisma.ncr.findMany({ where: { orgId: u.orgId, projectId }, orderBy: { createdAt: "desc" } }),
    ]);
    return {
      checks, ncrs,
      meta: {
        checks: checks.length,
        passed: checks.filter((c) => c.result === "PASS").length,
        failed: checks.filter((c) => c.result === "FAIL").length,
        openNcrs: ncrs.filter((n) => n.status !== "CLOSED").length,
      },
    };
  }

  @Post("checks") @RequirePermissions("qaqc:create")
  createCheck(@CurrentUser() u: AuthUser, @Body() dto: any) {
    return this.prisma.qaCheck.create({
      data: {
        orgId: u.orgId, projectId: dto.projectId, workPackId: dto.workPackId, weldId: dto.weldId,
        checklist: dto.checklist, result: dto.result ?? "PENDING", inspector: dto.inspector, note: dto.note,
      },
    });
  }

  @Patch("checks/:id") @RequirePermissions("qaqc:edit")
  updateCheck(@Param("id") id: string, @Body() dto: any) {
    return this.prisma.qaCheck.update({ where: { id }, data: dto });
  }

  @Post("ncr") @RequirePermissions("qaqc:create")
  async createNcr(@CurrentUser() u: AuthUser, @Body() dto: any) {
    const count = await this.prisma.ncr.count({ where: { projectId: dto.projectId } });
    return this.prisma.ncr.create({
      data: {
        orgId: u.orgId, projectId: dto.projectId,
        ref: dto.ref ?? `NCR-${String(count + 1).padStart(3, "0")}`,
        title: dto.title, description: dto.description, severity: dto.severity ?? "MINOR", raisedBy: u.email,
      },
    });
  }

  @Patch("ncr/:id") @RequirePermissions("qaqc:edit")
  updateNcr(@Param("id") id: string, @Body() dto: any) {
    return this.prisma.ncr.update({ where: { id }, data: dto });
  }
}

@ApiTags("Safeguarding")
@ApiBearerAuth()
@Controller("safeguards")
class SafeguardController {
  constructor(private readonly prisma: PrismaService) {}

  @Get() @RequirePermissions("safeguarding:view")
  async list(@CurrentUser() u: AuthUser, @Query("projectId") projectId: string) {
    const items = await this.prisma.safeguardItem.findMany({
      where: { orgId: u.orgId, projectId }, orderBy: { createdAt: "desc" },
    });
    return {
      data: items,
      meta: { total: items.length, open: items.filter((i) => i.status !== "CLOSED").length },
    };
  }

  @Post() @RequirePermissions("safeguarding:create")
  create(@CurrentUser() u: AuthUser, @Body() dto: any) {
    return this.prisma.safeguardItem.create({
      data: {
        orgId: u.orgId, projectId: dto.projectId, workPackId: dto.workPackId,
        type: dto.type ?? "PTW", title: dto.title, responsible: dto.responsible,
      },
    });
  }

  @Patch(":id") @RequirePermissions("safeguarding:edit")
  update(@Param("id") id: string, @Body() dto: any) {
    return this.prisma.safeguardItem.update({ where: { id }, data: dto });
  }
}

@Module({
  controllers: [WeldController, QaController, SafeguardController],
})
export class StoQualityModule {}
