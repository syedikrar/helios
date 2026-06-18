import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  Logger,
} from "@nestjs/common";
import { Observable } from "rxjs";
import { tap } from "rxjs/operators";
import type { AuthUser } from "@helios/types";
import { PrismaService } from "../prisma/prisma.service";

const ACTION_BY_METHOD: Record<string, "CREATE" | "UPDATE" | "DELETE"> = {
  POST: "CREATE",
  PUT: "UPDATE",
  PATCH: "UPDATE",
  DELETE: "DELETE",
};

// Routes we never audit (auth flows, the audit log itself).
const SKIP_PREFIXES = ["/api/auth", "/api/audit"];

// Records every successful mutating request to the immutable AuditLog.
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger("Audit");
  constructor(private readonly prisma: PrismaService) {}

  intercept(ctx: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = ctx.switchToHttp().getRequest();
    const action = ACTION_BY_METHOD[req.method];
    const url: string = req.originalUrl ?? req.url ?? "";
    const user: AuthUser | undefined = req.user;

    const shouldAudit =
      action && user && !SKIP_PREFIXES.some((p) => url.startsWith(p));

    return next.handle().pipe(
      tap((response) => {
        if (!shouldAudit) return;
        // entityType = first path segment after /api
        const seg = url.replace(/^\/api\//, "").split(/[/?]/)[0] || "unknown";
        const payload = (response as any)?.data ?? response;
        const entityId =
          payload?.id ?? req.params?.id ?? payload?.data?.id ?? null;

        this.prisma.auditLog
          .create({
            data: {
              orgId: user!.orgId,
              userId: user!.id,
              userEmail: user!.email,
              action,
              entityType: seg,
              entityId,
              summary: `${action} ${seg}${entityId ? ` (${entityId})` : ""}`,
              after: action === "DELETE" ? undefined : safeJson(req.body),
            },
          })
          .catch((e) => this.logger.warn(`audit write failed: ${e.message}`));
      }),
    );
  }
}

// Strip obviously-sensitive fields before persisting request bodies.
function safeJson(body: unknown) {
  if (!body || typeof body !== "object") return undefined;
  const clone: Record<string, unknown> = { ...(body as Record<string, unknown>) };
  for (const k of Object.keys(clone)) {
    if (/password|secret|token/i.test(k)) clone[k] = "***";
  }
  return clone as any;
}
