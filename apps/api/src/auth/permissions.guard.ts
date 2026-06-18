import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { AuthUser } from "@helios/types";
import { IS_PUBLIC_KEY, PERMISSIONS_KEY } from "./decorators";

// Authorizes requests against @RequirePermissions metadata.
// Runs after JwtAuthGuard, so req.user is present for protected routes.
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(ctx: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (isPublic) return true;

    const required = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [ctx.getHandler(), ctx.getClass()],
    );
    if (!required || required.length === 0) return true;

    const user: AuthUser | undefined = ctx.switchToHttp().getRequest().user;
    const held = new Set<string>(user?.permissions ?? []);
    const missing = required.filter((p) => !held.has(p));
    if (missing.length > 0) {
      throw new ForbiddenException(
        `Missing permission(s): ${missing.join(", ")}`,
      );
    }
    return true;
  }
}
