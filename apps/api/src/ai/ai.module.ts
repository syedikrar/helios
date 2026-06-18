import {
  Body, Controller, Get, Post, Module, Injectable,
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import type { AuthUser } from "@helios/types";
import { PrismaService } from "../prisma/prisma.service";
import { CurrentUser, RequirePermissions } from "../auth/decorators";
import { computeEvm } from "../controls/evm";

// Archetype → discipline weighting (share of direct cost). Deterministic
// heuristic; swap `generateSkeleton` for a real LLM call later (same I/O shape).
const ARCHETYPES: { match: RegExp; name: string; weights: Record<string, number> }[] = [
  { match: /crude|refin|distill|fcc|coker/i, name: "Refinery process unit", weights: { Mechanical: 0.34, Piping: 0.22, Civil: 0.12, Structural: 0.1, Electrical: 0.08, Instrumentation: 0.09, Labour: 0.05 } },
  { match: /tank|storage|terminal/i, name: "Tank / storage facility", weights: { Civil: 0.3, Mechanical: 0.25, Piping: 0.18, Structural: 0.12, Electrical: 0.08, Instrumentation: 0.07 } },
  { match: /platform|offshore|topside/i, name: "Offshore topsides", weights: { Structural: 0.3, Mechanical: 0.24, Piping: 0.18, Electrical: 0.1, Instrumentation: 0.1, Labour: 0.08 } },
  { match: /pipeline|cross-?country/i, name: "Pipeline", weights: { Piping: 0.45, Civil: 0.25, Electrical: 0.1, Instrumentation: 0.1, Labour: 0.1 } },
  { match: /power|substation|electric/i, name: "Power / electrical", weights: { Electrical: 0.4, Civil: 0.2, Structural: 0.15, Instrumentation: 0.15, Labour: 0.1 } },
];
const DEFAULT_ARCHETYPE = { name: "General process facility", weights: { Mechanical: 0.3, Piping: 0.2, Civil: 0.15, Structural: 0.12, Electrical: 0.1, Instrumentation: 0.08, Labour: 0.05 } };

const REGION_FACTOR: Record<string, number> = {
  "us gulf coast": 1.0, "gulf coast": 1.0, "north sea": 1.25, "middle east": 0.9, australia: 1.15,
};

@Injectable()
class AiService {
  constructor(private readonly prisma: PrismaService) {}

  async generateSkeleton(orgId: string, description: string) {
    const archetype = ARCHETYPES.find((a) => a.match.test(description)) ?? DEFAULT_ARCHETYPE;

    // Extract a capacity figure (first number ≥ 2 digits) to scale magnitude.
    const num = description.replace(/,/g, "").match(/(\d{2,})/);
    const capacity = num ? Number(num[1]) : 1000;
    const scale = Math.max(0.4, Math.min(8, Math.log10(capacity + 10) / 2));

    // Region factor from any matched keyword.
    const regionKey = Object.keys(REGION_FACTOR).find((r) => description.toLowerCase().includes(r));
    const regionFactor = regionKey ? REGION_FACTOR[regionKey] : 1.0;

    const lib = await this.prisma.costLibraryItem.findMany({ where: { orgId, deletedAt: null } });
    const byDiscipline = new Map<string, typeof lib>();
    for (const it of lib) {
      const arr = byDiscipline.get(it.discipline) ?? [];
      arr.push(it); byDiscipline.set(it.discipline, arr);
    }

    const TARGET_TIC = 5_000_000_000 * scale; // notional total installed cost (~$50M × scale), minor units
    const lineItems: any[] = [];
    let total = 0;
    for (const [disc, weight] of Object.entries(archetype.weights)) {
      const items = byDiscipline.get(disc) ?? [];
      if (!items.length) continue;
      const budget = TARGET_TIC * weight;
      // Pick up to 4 representative items for the discipline.
      const picks = items.filter((_, i) => i % Math.max(1, Math.floor(items.length / 4)) === 0).slice(0, 4);
      const per = budget / picks.length;
      for (const it of picks) {
        const rate = Math.round(it.baseRate * regionFactor);
        const qty = rate > 0 ? Math.max(1, Math.round((per / rate) * 100) / 100) : 0;
        const amount = Math.round(qty * rate);
        total += amount;
        lineItems.push({
          code: it.code, description: it.description, discipline: disc,
          unit: it.unit, quantity: qty, unitRate: rate, amount,
        });
      }
    }

    return {
      basis: {
        archetype: archetype.name,
        capacity,
        regionFactor,
        method: "heuristic-v1",
        note: "Deterministic suggestion engine. Replace generateSkeleton() with an LLM call for NL reasoning.",
      },
      assumptions: [
        `Archetype matched: ${archetype.name}`,
        `Capacity parameter parsed: ${capacity.toLocaleString()}`,
        `Region cost factor applied: ${regionFactor}`,
        "Quantities derived from discipline cost weighting against a notional TIC.",
      ],
      lineItems,
      total,
      lineCount: lineItems.length,
    };
  }

  // Scan projects for cost/schedule anomalies (CPI/SPI thresholds).
  async anomalies(orgId: string) {
    const projects = await this.prisma.project.findMany({
      where: { orgId, deletedAt: null },
      include: { baseline: true, controlPeriods: true },
    });
    const flagged: any[] = [];
    for (const p of projects) {
      if (!p.baseline) continue;
      const evm = computeEvm(p.controlPeriods, p.baseline.bac);
      const reasons: string[] = [];
      if (evm.cpi > 0 && evm.cpi < 0.9) reasons.push(`CPI ${evm.cpi} below 0.90 — cost overrun trend`);
      if (evm.spi > 0 && evm.spi < 0.9) reasons.push(`SPI ${evm.spi} below 0.90 — schedule slippage`);
      if (evm.vac < 0 && Math.abs(evm.vac) > evm.bac * 0.05) reasons.push(`Forecast overrun ${Math.round((Math.abs(evm.vac) / evm.bac) * 100)}% of BAC`);
      if (reasons.length) {
        flagged.push({
          projectId: p.id, code: p.code, name: p.name,
          severity: evm.cpi < 0.85 ? "HIGH" : "MEDIUM",
          cpi: evm.cpi, spi: evm.spi, vac: evm.vac, reasons,
        });
      }
    }
    return { scanned: projects.length, flagged };
  }
}

@ApiTags("AI Copilot")
@ApiBearerAuth()
@Controller("ai")
class AiController {
  constructor(private readonly service: AiService) {}

  @Post("estimate") @RequirePermissions("ai:create")
  generate(@CurrentUser() u: AuthUser, @Body() dto: { description: string }) {
    return this.service.generateSkeleton(u.orgId, dto.description ?? "");
  }

  @Get("anomalies") @RequirePermissions("ai:view")
  anomalies(@CurrentUser() u: AuthUser) {
    return this.service.anomalies(u.orgId);
  }
}

@Module({
  controllers: [AiController],
  providers: [AiService],
})
export class AiModule {}
