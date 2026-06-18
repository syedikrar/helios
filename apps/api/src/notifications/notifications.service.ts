import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

interface NotifyInput {
  type?: string;
  title: string;
  body?: string;
  link?: string;
}

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  notify(orgId: string, userId: string, input: NotifyInput) {
    return this.prisma.notification.create({
      data: {
        orgId,
        userId,
        type: input.type ?? "INFO",
        title: input.title,
        body: input.body,
        link: input.link,
      },
    });
  }

  listMine(userId: string) {
    return this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
  }

  async unreadCount(userId: string) {
    const count = await this.prisma.notification.count({
      where: { userId, read: false },
    });
    return { count };
  }

  async markRead(userId: string, id: string) {
    await this.prisma.notification.updateMany({
      where: { id, userId },
      data: { read: true },
    });
    return { id, read: true };
  }

  async markAllRead(userId: string) {
    const res = await this.prisma.notification.updateMany({
      where: { userId, read: false },
      data: { read: true },
    });
    return { updated: res.count };
  }
}
