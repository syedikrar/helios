import {
  Body, Controller, Get, Param, Patch, Post, Query, Module,
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import type { AuthUser } from "@helios/types";
import { PrismaService } from "../prisma/prisma.service";
import { CurrentUser, RequirePermissions } from "../auth/decorators";
import { ProjectsService } from "./projects.service";
import { computeEvm } from "../controls/evm";

@ApiTags("Projects")
@ApiBearerAuth()
@Controller("projects")
class ProjectsController {
  constructor(private readonly service: ProjectsService) {}

  @Get()
  list(@CurrentUser() u: AuthUser, @Query("type") type?: string) {
    return this.service.list(u.orgId, type);
  }

  @Get(":id")
  get(@CurrentUser() u: AuthUser, @Param("id") id: string) {
    return this.service.get(u.orgId, id);
  }

  @Post()
  @RequirePermissions("portfolio:approve")
  create(@CurrentUser() u: AuthUser, @Body() dto: any) {
    return this.service.create(u.orgId, u.id, dto);
  }

  @Patch(":id")
  @RequirePermissions("portfolio:approve")
  update(@CurrentUser() u: AuthUser, @Param("id") id: string, @Body() dto: any) {
    return this.service.update(u.orgId, id, dto);
  }
}

@ApiTags("Portfolio")
@ApiBearerAuth()
@Controller("portfolios")
class PortfolioController {
  constructor(private readonly prisma: PrismaService) {}

  // Portfolio roll-up: aggregate health, CPI/SPI, budget vs forecast.
  @Get()
  @RequirePermissions("portfolio:view")
  async list(@CurrentUser() u: AuthUser) {
    const portfolios = await this.prisma.portfolio.findMany({
      where: { orgId: u.orgId },
      include: {
        projects: {
          where: { deletedAt: null },
          include: { baseline: true, controlPeriods: true },
        },
      },
    });
    return portfolios.map((pf) => {
      const projects = pf.projects.map((p) => {
        const evm = computeEvm(p.controlPeriods, p.baseline?.bac);
        return {
          id: p.id, code: p.code, name: p.name, status: p.status,
          bac: evm.bac, eac: evm.eac, cpi: evm.cpi, spi: evm.spi,
          percentComplete: evm.percentComplete, health: evm.health, anomaly: evm.anomaly,
        };
      });
      const totBac = projects.reduce((s, p) => s + p.bac, 0);
      const totEac = projects.reduce((s, p) => s + p.eac, 0);
      const wAvg = (sel: (p: any) => number) =>
        totBac > 0 ? projects.reduce((s, p) => s + sel(p) * p.bac, 0) / totBac : 0;
      return {
        id: pf.id, name: pf.name, description: pf.description,
        projectCount: projects.length,
        totalBac: totBac, totalEac: totEac, variance: totBac - totEac,
        avgCpi: Math.round(wAvg((p) => p.cpi) * 1000) / 1000,
        avgSpi: Math.round(wAvg((p) => p.spi) * 1000) / 1000,
        atRisk: projects.filter((p) => p.health === "RED").length,
        projects,
      };
    });
  }
}

@Module({
  controllers: [ProjectsController, PortfolioController],
  providers: [ProjectsService],
})
export class ProjectsModule {}
