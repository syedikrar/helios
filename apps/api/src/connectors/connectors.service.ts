import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { SyncDirection } from "@prisma/client";

// Mock sync profiles — what each connector "does" when synced. Until the target
// modules are populated (later phases), a sync writes a realistic SyncLog entry.
const SYNC_PROFILES: Record<
  string,
  { direction: SyncDirection; records: number; message: string }
> = {
  SAP: { direction: "IMPORT", records: 42, message: "Imported commitments & actuals into Project Controls" },
  P6: { direction: "IMPORT", records: 128, message: "Round-tripped schedule activities with Primavera P6" },
  MAXIMO: { direction: "IMPORT", records: 64, message: "Imported asset tags into Scoping" },
  UNISIM: { direction: "IMPORT", records: 18, message: "Imported equipment list → estimate skeleton via Cost Library" },
  POWERBI: { direction: "EXPORT", records: 5, message: "Published analytics dataset to Power BI / Snowflake" },
};

@Injectable()
export class ConnectorsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(orgId: string) {
    return this.prisma.connector.findMany({
      where: { orgId },
      orderBy: { name: "asc" },
      include: { _count: { select: { logs: true } } },
    });
  }

  async get(orgId: string, id: string) {
    const connector = await this.prisma.connector.findFirst({
      where: { id, orgId },
      include: { logs: { orderBy: { createdAt: "desc" }, take: 20 } },
    });
    if (!connector) throw new NotFoundException("Connector not found");
    return connector;
  }

  async sync(orgId: string, id: string) {
    const connector = await this.prisma.connector.findFirst({ where: { id, orgId } });
    if (!connector) throw new NotFoundException("Connector not found");

    const profile = SYNC_PROFILES[connector.key] ?? {
      direction: "IMPORT" as SyncDirection,
      records: 10,
      message: "Synchronised mock dataset",
    };

    const now = new Date();
    const [log] = await this.prisma.$transaction([
      this.prisma.syncLog.create({
        data: {
          connectorId: id,
          direction: profile.direction,
          status: "SUCCESS",
          message: profile.message,
          recordCount: profile.records,
        },
      }),
      this.prisma.connector.update({
        where: { id },
        data: { lastSyncAt: now, status: "CONNECTED" },
      }),
    ]);
    return { log, lastSyncAt: now };
  }
}
