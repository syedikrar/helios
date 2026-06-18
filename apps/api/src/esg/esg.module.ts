import { Controller, Get, Param, Module, Injectable } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import type { AuthUser } from "@helios/types";
import { PrismaService } from "../prisma/prisma.service";
import { CurrentUser, RequirePermissions } from "../auth/decorators";

// Embodied carbon from baselined estimate line items (carbonFactor × quantity,
// in kgCO2e). Intensity = tCO2e per $M of baseline cost.
@Injectable()
class EsgService {
  constructor(private readonly prisma: PrismaService) {}

  private carbonFor(lines: { quantity: number; carbonFactor: number; discipline: string | null }[]) {
    let kg = 0;
    const byDiscipline: Record<string, number> = {};
    for (const l of lines) {
      const c = l.quantity * (l.carbonFactor ?? 0);
      kg += c;
      const d = l.discipline ?? "Other";
      byDiscipline[d] = (byDiscipline[d] ?? 0) + c;
    }
    return { kg, byDiscipline };
  }

  async portfolio(orgId: string) {
    const baselines = await this.prisma.baseline.findMany({
      where: { estimate: { orgId } },
      include: { estimate: { include: { lineItems: true, project: { select: { id: true, name: true, code: true } } } } },
    });
    let totalKg = 0, totalBac = 0;
    const projects = baselines.map((b) => {
      const { kg } = this.carbonFor(b.estimate.lineItems);
      totalKg += kg; totalBac += b.bac;
      return {
        projectId: b.estimate.project.id, code: b.estimate.project.code, name: b.estimate.project.name,
        tco2e: Math.round(kg / 1000),
        bac: b.bac,
        intensity: b.bac > 0 ? Math.round((kg / 1000 / (b.bac / 100 / 1_000_000)) * 10) / 10 : 0, // tCO2e per $M
      };
    });
    return {
      totalTco2e: Math.round(totalKg / 1000),
      totalBac,
      avgIntensity: totalBac > 0 ? Math.round((totalKg / 1000 / (totalBac / 100 / 1_000_000)) * 10) / 10 : 0,
      projects,
    };
  }

  async project(orgId: string, projectId: string) {
    const baseline = await this.prisma.baseline.findFirst({
      where: { projectId, estimate: { orgId } },
      include: { estimate: { include: { lineItems: true, project: { select: { name: true } } } } },
    });
    if (!baseline) return { tco2e: 0, byDiscipline: {}, intensity: 0 };
    const { kg, byDiscipline } = this.carbonFor(baseline.estimate.lineItems);
    return {
      name: baseline.estimate.project.name,
      tco2e: Math.round(kg / 1000),
      byDiscipline: Object.fromEntries(Object.entries(byDiscipline).map(([k, v]) => [k, Math.round(v / 1000)])),
      bac: baseline.bac,
      intensity: baseline.bac > 0 ? Math.round((kg / 1000 / (baseline.bac / 100 / 1_000_000)) * 10) / 10 : 0,
    };
  }
}

@ApiTags("ESG / Carbon")
@ApiBearerAuth()
@Controller("esg")
class EsgController {
  constructor(private readonly service: EsgService) {}

  @Get() @RequirePermissions("esg:view")
  portfolio(@CurrentUser() u: AuthUser) {
    return this.service.portfolio(u.orgId);
  }

  @Get(":projectId") @RequirePermissions("esg:view")
  project(@CurrentUser() u: AuthUser, @Param("projectId") projectId: string) {
    return this.service.project(u.orgId, projectId);
  }
}

@Module({
  controllers: [EsgController],
  providers: [EsgService],
})
export class EsgModule {}
