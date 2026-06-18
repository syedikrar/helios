import { Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import type { CreateCostItemDto, UpdateCostItemDto } from "./dto";

interface ListParams {
  q?: string;
  discipline?: string;
  category?: string;
  page?: number;
  pageSize?: number;
}

@Injectable()
export class CostLibraryService {
  constructor(private readonly prisma: PrismaService) {}

  async list(orgId: string, params: ListParams) {
    const page = Math.max(1, params.page ?? 1);
    const pageSize = Math.min(200, Math.max(1, params.pageSize ?? 50));

    const where: Prisma.CostLibraryItemWhereInput = {
      orgId,
      deletedAt: null,
      ...(params.discipline ? { discipline: params.discipline } : {}),
      ...(params.category ? { category: params.category } : {}),
      ...(params.q
        ? {
            OR: [
              { code: { contains: params.q, mode: "insensitive" } },
              { description: { contains: params.q, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    const [total, data] = await Promise.all([
      this.prisma.costLibraryItem.count({ where }),
      this.prisma.costLibraryItem.findMany({
        where,
        orderBy: [{ discipline: "asc" }, { category: "asc" }, { code: "asc" }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return {
      data,
      meta: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    };
  }

  // Distinct disciplines + categories for filter dropdowns.
  async facets(orgId: string) {
    const rows = await this.prisma.costLibraryItem.findMany({
      where: { orgId, deletedAt: null },
      select: { discipline: true, category: true },
    });
    const disciplines = [...new Set(rows.map((r) => r.discipline))].sort();
    const byDiscipline: Record<string, string[]> = {};
    for (const r of rows) {
      byDiscipline[r.discipline] ??= [];
      if (!byDiscipline[r.discipline].includes(r.category)) {
        byDiscipline[r.discipline].push(r.category);
      }
    }
    Object.values(byDiscipline).forEach((c) => c.sort());
    return { disciplines, categories: byDiscipline, total: rows.length };
  }

  create(orgId: string, dto: CreateCostItemDto) {
    return this.prisma.costLibraryItem.create({
      data: { ...dto, orgId, currency: dto.currency ?? "USD" },
    });
  }

  async update(orgId: string, id: string, dto: UpdateCostItemDto) {
    const existing = await this.prisma.costLibraryItem.findFirst({
      where: { id, orgId, deletedAt: null },
    });
    if (!existing) throw new NotFoundException("Cost item not found");
    return this.prisma.costLibraryItem.update({ where: { id }, data: dto });
  }

  async remove(orgId: string, id: string) {
    const existing = await this.prisma.costLibraryItem.findFirst({
      where: { id, orgId, deletedAt: null },
    });
    if (!existing) throw new NotFoundException("Cost item not found");
    await this.prisma.costLibraryItem.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    return { id, deleted: true };
  }
}
