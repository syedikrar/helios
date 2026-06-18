import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { JwtService } from "@nestjs/jwt";
import type { JwtPayload } from "@helios/types";
import { IS_PUBLIC_KEY } from "./decorators";

// Authenticates requests via Bearer JWT and attaches the decoded user to req.user.
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwt: JwtService,
  ) {}

  canActivate(ctx: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (isPublic) return true;

    const req = ctx.switchToHttp().getRequest();
    const header: string | undefined = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) {
      throw new UnauthorizedException("Missing bearer token");
    }
    try {
      const payload = this.jwt.verify<JwtPayload>(header.slice(7));
      // Shape the request user to match AuthUser.
      req.user = {
        id: payload.sub,
        email: payload.email,
        name: (payload as any).name ?? "",
        orgId: payload.orgId,
        roles: payload.roles,
        permissions: payload.permissions,
      };
      return true;
    } catch {
      throw new UnauthorizedException("Invalid or expired token");
    }
  }
}
