import {
  Body, Controller, Get, Param, Patch, Post, Query, Module,
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import type { AuthUser } from "@helios/types";
import { PrismaService } from "../prisma/prisma.service";
import { CurrentUser, RequirePermissions } from "../auth/decorators";

@ApiTags("Execution")
@ApiBearerAuth()
@Controller("execution")
class ExecutionController {
  constructor(private readonly prisma: PrismaService) {}

  // Live execution board: work packs by status + progress vs planned hours.
  @Get() @RequirePermissions("execution:view")
  async board(@CurrentUser() u: AuthUser, @Query("projectId") projectId: string) {
    const packs = await this.prisma.workPack.findMany({
      where: { orgId: u.orgId, projectId }, orderBy: { ref: "asc" },
    });
    const columns = ["PLANNED", "READY", "IN_PROGRESS", "ON_HOLD", "COMPLETE"];
    const board: Record<string, any[]> = Object.fromEntries(columns.map((c) => [c, []]));
    let planned = 0, burned = 0;
    for (const p of packs) {
      board[p.status]?.push(p);
      planned += p.plannedHours;
      burned += p.hoursBurned;
    }
    const wAvg = planned > 0
      ? Math.round(packs.reduce((s, p) => s + p.progressPercent * p.plannedHours, 0) / planned)
      : 0;
    return {
      board, columns,
      meta: {
        total: packs.length, plannedHours: planned, burnedHours: burned,
        overallProgress: wAvg, complete: packs.filter((p) => p.status === "COMPLETE").length,
      },
    };
  }

  // Contractors submit field progress here.
  @Patch("workpacks/:id") @RequirePermissions("execution:edit")
  update(@Param("id") id: string, @Body() dto: any) {
    const data: any = {};
    if (dto.status !== undefined) data.status = dto.status;
    if (dto.progressPercent !== undefined) data.progressPercent = dto.progressPercent;
    if (dto.hoursBurned !== undefined) data.hoursBurned = dto.hoursBurned;
    return this.prisma.workPack.update({ where: { id }, data });
  }
}

@ApiTags("Lessons Learned")
@ApiBearerAuth()
@Controller("lessons")
class LessonsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get() @RequirePermissions("lessons:view")
  list(@CurrentUser() u: AuthUser, @Query("projectId") projectId: string) {
    return this.prisma.lessonLearned.findMany({
      where: { orgId: u.orgId, ...(projectId ? { projectId } : {}) },
      orderBy: { createdAt: "desc" },
    });
  }

  @Post() @RequirePermissions("lessons:create")
  create(@CurrentUser() u: AuthUser, @Body() dto: any) {
    return this.prisma.lessonLearned.create({
      data: {
        orgId: u.orgId, projectId: dto.projectId, category: dto.category,
        description: dto.description, recommendation: dto.recommendation,
      },
    });
  }

  // Close the learning loop — flag a lesson as fed back into the cost library/benchmarks.
  @Post(":id/push-to-library") @RequirePermissions("lessons:edit")
  push(@Param("id") id: string) {
    return this.prisma.lessonLearned.update({ where: { id }, data: { pushedToLibrary: true } });
  }
}

@Module({
  controllers: [ExecutionController, LessonsController],
})
export class StoExecutionModule {}
