import { Controller, Get } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { PrismaService } from "../prisma/prisma.service";
import { RequirePermissions } from "../auth/decorators";
import { MODULES } from "../rbac/catalog";

@ApiTags("Admin · RBAC")
@ApiBearerAuth()
@Controller("rbac")
export class RbacController {
  constructor(private readonly prisma: PrismaService) {}

  @Get("roles")
  @RequirePermissions("admin:view")
  async roles() {
    const roles = await this.prisma.role.findMany({
      orderBy: { name: "asc" },
      include: {
        permissions: { include: { permission: true } },
        _count: { select: { users: true } },
      },
    });
    return roles.map((r) => ({
      key: r.key,
      name: r.name,
      description: r.description,
      userCount: r._count.users,
      permissions: r.permissions.map((p) => p.permission.key).sort(),
    }));
  }

  @Get("permissions")
  @RequirePermissions("admin:view")
  async permissions() {
    return this.prisma.permission.findMany({ orderBy: { key: "asc" } });
  }

  // Roles × permissions grid for the admin permission-matrix page.
  @Get("matrix")
  @RequirePermissions("admin:view")
  async matrix() {
    const [roles, permissions] = await Promise.all([
      this.prisma.role.findMany({
        orderBy: { name: "asc" },
        include: { permissions: { include: { permission: true } } },
      }),
      this.prisma.permission.findMany({ orderBy: { key: "asc" } }),
    ]);

    const grants: Record<string, string[]> = {};
    for (const r of roles) {
      grants[r.key] = r.permissions.map((p) => p.permission.key);
    }

    return {
      modules: MODULES,
      actions: ["view", "create", "edit", "delete", "approve"],
      roles: roles.map((r) => ({ key: r.key, name: r.name })),
      permissions: permissions.map((p) => ({
        key: p.key,
        module: p.module,
        action: p.action,
      })),
      grants,
    };
  }
}
