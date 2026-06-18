import { Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import bcrypt from "bcryptjs";
import type { AuthUser, JwtPayload, RoleKey } from "@helios/types";
import { PrismaService } from "../prisma/prisma.service";

const userWithRoles = {
  roles: { include: { role: { include: { permissions: { include: { permission: true } } } } } },
} as const;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  // Aggregates role keys + the union of their permissions into an AuthUser.
  private toAuthUser(user: {
    id: string;
    email: string;
    name: string;
    orgId: string;
    roles: { role: { key: string; permissions: { permission: { key: string } }[] } }[];
  }): AuthUser {
    const roles = user.roles.map((r) => r.role.key as RoleKey);
    const permissions = [
      ...new Set(
        user.roles.flatMap((r) =>
          r.role.permissions.map((p) => p.permission.key),
        ),
      ),
    ].sort() as AuthUser["permissions"];
    return { id: user.id, email: user.email, name: user.name, orgId: user.orgId, roles, permissions };
  }

  async login(email: string, password: string) {
    const user = await this.prisma.user.findFirst({
      where: { email, deletedAt: null },
      include: userWithRoles,
    });
    if (!user) throw new UnauthorizedException("Invalid credentials");
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) throw new UnauthorizedException("Invalid credentials");

    const authUser = this.toAuthUser(user);
    const payload: JwtPayload & { name: string } = {
      sub: authUser.id,
      email: authUser.email,
      name: authUser.name,
      orgId: authUser.orgId,
      roles: authUser.roles,
      permissions: authUser.permissions,
    };
    const token = this.jwt.sign(payload);
    return { token, user: authUser };
  }

  async me(userId: string): Promise<AuthUser> {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
      include: userWithRoles,
    });
    if (!user) throw new UnauthorizedException();
    return this.toAuthUser(user);
  }
}
