import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import bcrypt from "bcryptjs";
import { PrismaService } from "../prisma/prisma.service";
import type { CreateUserDto, UpdateUserDto } from "./dto/user.dto";

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  private shape(user: any) {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      title: user.title,
      orgId: user.orgId,
      roles: user.roles.map((r: any) => ({ key: r.role.key, name: r.role.name })),
      createdAt: user.createdAt,
    };
  }

  private async roleIdsForKeys(keys: string[]): Promise<string[]> {
    const roles = await this.prisma.role.findMany({ where: { key: { in: keys } } });
    if (roles.length !== keys.length) {
      const found = new Set(roles.map((r) => r.key));
      const missing = keys.filter((k) => !found.has(k));
      throw new BadRequestException(`Unknown role(s): ${missing.join(", ")}`);
    }
    return roles.map((r) => r.id);
  }

  async list(orgId: string) {
    const users = await this.prisma.user.findMany({
      where: { orgId, deletedAt: null },
      orderBy: { createdAt: "asc" },
      include: { roles: { include: { role: true } } },
    });
    return users.map((u) => this.shape(u));
  }

  async create(orgId: string, dto: CreateUserDto) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) throw new BadRequestException("Email already registered");
    const roleIds = await this.roleIdsForKeys(dto.roleKeys);
    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        name: dto.name,
        title: dto.title,
        passwordHash,
        orgId,
        roles: { create: roleIds.map((roleId) => ({ roleId })) },
      },
      include: { roles: { include: { role: true } } },
    });
    return this.shape(user);
  }

  async update(orgId: string, id: string, dto: UpdateUserDto) {
    const user = await this.prisma.user.findFirst({ where: { id, orgId, deletedAt: null } });
    if (!user) throw new NotFoundException("User not found");

    const data: Record<string, unknown> = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.title !== undefined) data.title = dto.title;
    if (dto.password) data.passwordHash = await bcrypt.hash(dto.password, 10);

    if (dto.roleKeys) {
      const roleIds = await this.roleIdsForKeys(dto.roleKeys);
      await this.prisma.userRole.deleteMany({ where: { userId: id } });
      await this.prisma.userRole.createMany({
        data: roleIds.map((roleId) => ({ userId: id, roleId })),
        skipDuplicates: true,
      });
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data,
      include: { roles: { include: { role: true } } },
    });
    return this.shape(updated);
  }

  async remove(orgId: string, id: string) {
    const user = await this.prisma.user.findFirst({ where: { id, orgId, deletedAt: null } });
    if (!user) throw new NotFoundException("User not found");
    await this.prisma.user.update({ where: { id }, data: { deletedAt: new Date() } });
    return { id, deleted: true };
  }
}
