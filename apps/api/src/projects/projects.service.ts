import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { computeEvm } from "../controls/evm";

@Injectable()
export class ProjectsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(orgId: string, type?: string) {
    const projects = await this.prisma.project.findMany({
      where: { orgId, deletedAt: null, ...(type ? { type: type as any } : {}) },
      orderBy: { createdAt: "asc" },
      include: {
        baseline: true,
        controlPeriods: true,
        portfolio: { select: { id: true, name: true } },
        _count: { select: { estimates: true, changes: true, risks: true } },
      },
    });
    return projects.map((p) => {
      const evm = computeEvm(p.controlPeriods, p.baseline?.bac);
      return {
        id: p.id,
        code: p.code,
        name: p.name,
        type: p.type,
        status: p.status,
        currency: p.currency,
        region: p.region,
        portfolio: p.portfolio,
        bac: p.baseline?.bac ?? 0,
        cpi: evm.cpi,
        spi: evm.spi,
        eac: evm.eac,
        percentComplete: evm.percentComplete,
        health: evm.health,
        anomaly: evm.anomaly,
        counts: p._count,
      };
    });
  }

  async get(orgId: string, id: string) {
    const project = await this.prisma.project.findFirst({
      where: { id, orgId, deletedAt: null },
      include: {
        portfolio: { select: { id: true, name: true } },
        baseline: { include: { estimate: { select: { id: true, name: true } } } },
        estimates: { orderBy: { createdAt: "desc" }, include: { _count: { select: { lineItems: true } } } },
        _count: { select: { changes: true, risks: true, activities: true, tenders: true, contracts: true } },
      },
    });
    if (!project) throw new NotFoundException("Project not found");
    return project;
  }

  async create(orgId: string, userId: string, dto: any) {
    return this.prisma.project.create({
      data: {
        orgId,
        portfolioId: dto.portfolioId ?? null,
        code: dto.code,
        name: dto.name,
        description: dto.description,
        type: dto.type ?? "CAPEX",
        currency: dto.currency ?? "USD",
        region: dto.region,
        createdById: userId,
      },
    });
  }

  async update(orgId: string, id: string, dto: any) {
    const p = await this.prisma.project.findFirst({ where: { id, orgId, deletedAt: null } });
    if (!p) throw new NotFoundException("Project not found");
    return this.prisma.project.update({ where: { id }, data: dto });
  }
}
