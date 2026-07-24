import { PrismaClient } from "@prisma/client";

const globalForPrisma = global as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({ log: ["warn", "error"] });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

// BigInt JSON serializer — Prisma returns bigint PKs, JSON.stringify chokes.
// Enable app-wide by importing this module once (done in root layout via lib/init.ts).
(BigInt.prototype as any).toJSON = function () { return this.toString(); };
