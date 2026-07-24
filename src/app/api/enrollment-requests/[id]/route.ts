import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { currentUser } from "@/lib/auth";
import { z } from "zod";

const schema = z.object({
  status: z.enum(["approved", "rejected"]),
  adminNote: z.string().max(500).optional(),
});

/** Admin approves/rejects a request. Approving auto-creates the Enrollment. */
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const admin = await currentUser();
  if (!admin || !["admin", "sub_admin"].includes(admin.role))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parse = schema.safeParse(await req.json());
  if (!parse.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  const { status, adminNote } = parse.data;

  const request = await prisma.enrollmentRequest.findUnique({
    where: { id: BigInt(params.id) },
    include: { batch: true },
  });
  if (!request) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (status === "approved") {
    await prisma.$transaction(async (tx) => {
      await tx.enrollmentRequest.update({
        where: { id: request.id },
        data: { status, adminNote, reviewedAt: new Date() },
      });
      await tx.enrollment.upsert({
        where: { userId_batchId: { userId: request.userId, batchId: request.batchId } },
        update: { isActive: true },
        create: {
          userId: request.userId,
          batchId: request.batchId,
          expiresAt: new Date(Date.now() + request.batch.validityMonths * 30 * 24 * 3600 * 1000),
        },
      });
      await tx.batch.update({
        where: { id: request.batchId },
        data: { enrollmentCount: { increment: 1 } },
      });
    });
  } else {
    await prisma.enrollmentRequest.update({
      where: { id: request.id },
      data: { status, adminNote, reviewedAt: new Date() },
    });
  }

  return NextResponse.json({ ok: true });
}
