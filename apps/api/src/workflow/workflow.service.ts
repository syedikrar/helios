import { Injectable, NotFoundException } from "@nestjs/common";
import {
  ApprovalEventType,
  ApprovalStatus,
  Prisma,
} from "@prisma/client";
import type { AuthUser } from "@helios/types";
import { PrismaService } from "../prisma/prisma.service";
import { NotificationsService } from "../notifications/notifications.service";
import type { CreateApprovalDto, TransitionDto } from "./dto";

const STATUS_BY_ACTION: Record<
  TransitionDto["action"],
  { status: ApprovalStatus; event: ApprovalEventType }
> = {
  REVIEW: { status: "IN_REVIEW", event: "REVIEW" },
  APPROVE: { status: "APPROVED", event: "APPROVE" },
  REJECT: { status: "REJECTED", event: "REJECT" },
};

@Injectable()
export class WorkflowService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  async create(user: AuthUser, dto: CreateApprovalDto) {
    return this.prisma.approvalRequest.create({
      data: {
        orgId: user.orgId,
        entityType: dto.entityType,
        entityId: dto.entityId,
        title: dto.title,
        status: "SUBMITTED",
        submittedById: user.id,
        submittedBy: user.name || user.email,
        events: {
          create: {
            type: "SUBMIT",
            actorId: user.id,
            actorEmail: user.email,
            comment: "Submitted for approval",
          },
        },
      },
      include: { events: true },
    });
  }

  async list(orgId: string, status?: string) {
    const where: Prisma.ApprovalRequestWhereInput = {
      orgId,
      ...(status ? { status: status as ApprovalStatus } : {}),
    };
    return this.prisma.approvalRequest.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      include: { _count: { select: { events: true } } },
    });
  }

  async get(orgId: string, id: string) {
    const request = await this.prisma.approvalRequest.findFirst({
      where: { id, orgId },
      include: { events: { orderBy: { createdAt: "asc" } } },
    });
    if (!request) throw new NotFoundException("Approval request not found");
    return request;
  }

  async transition(user: AuthUser, id: string, dto: TransitionDto) {
    const request = await this.prisma.approvalRequest.findFirst({
      where: { id, orgId: user.orgId },
    });
    if (!request) throw new NotFoundException("Approval request not found");

    const { status, event } = STATUS_BY_ACTION[dto.action];
    const updated = await this.prisma.approvalRequest.update({
      where: { id },
      data: {
        status,
        events: {
          create: {
            type: event,
            actorId: user.id,
            actorEmail: user.email,
            comment: dto.comment,
          },
        },
      },
      include: { events: { orderBy: { createdAt: "asc" } } },
    });

    // Notify the submitter of the decision.
    if (request.submittedById !== user.id) {
      await this.notifications.notify(request.orgId, request.submittedById, {
        type: dto.action === "REJECT" ? "WARNING" : "INFO",
        title: `Approval ${status.toLowerCase()}: ${request.title}`,
        body: dto.comment ?? undefined,
        link: `/workflow`,
      });
    }
    return updated;
  }
}
