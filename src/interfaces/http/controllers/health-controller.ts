import type { Request, Response } from "express";
import type { PrismaClient } from "@prisma/client";
import type { Channel } from "amqplib";

export class HealthController {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly getRabbitChannel: () => Channel | null,
    private readonly isShuttingDown: () => boolean,
  ) {}

  liveness = (_req: Request, res: Response): void => {
    res.status(200).json({ status: "ok" });
  };

  readiness = async (req: Request, res: Response): Promise<void> => {
    if (this.isShuttingDown()) {
      res.status(503).type("application/problem+json").json({
        type: "urn:logistics:user:not_ready",
        title: "Shutting down",
        status: 503,
        instance: req.requestId,
      });
      return;
    }
    const checks: { db: boolean; rabbit: boolean } = { db: false, rabbit: false };
    try {
      await Promise.race([
        this.prisma.$queryRaw`SELECT 1`,
        new Promise((_, rej) => setTimeout(() => rej(new Error("db timeout")), 250)),
      ]);
      checks.db = true;
    } catch { checks.db = false; }

    const ch = this.getRabbitChannel();
    checks.rabbit = ch !== null;

    const ok = checks.db && checks.rabbit;
    if (ok) {
      res.status(200).json({ status: "ok", checks });
    } else {
      res.status(503).type("application/problem+json").json({
        type: "urn:logistics:user:not_ready",
        title: "Not ready",
        status: 503,
        instance: req.requestId,
        detail: JSON.stringify(checks),
      });
    }
  };
}
