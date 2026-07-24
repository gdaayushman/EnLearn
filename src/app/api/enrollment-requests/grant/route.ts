import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { currentUser } from "@/lib/auth";
import { z } from "zod";

const schema = z.object({
  publicId: z.string().min(3),
  batchId: z.string(),
  adminNote: z.string().optional(),
});

/**
 * Admin shortcut: "user DMed me their unique ID + which batch they want".
 * Looks up the user by publicId and enrolls them directly, no prior request needed.
 * If a pending request exists it gets marked approved too.
 */
export async function POST(req: Request) {
  const admin = await currentUser();
  if (!admin || !["admin", "sub_admin"].includes(admin.role))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parse = schema.safeParse(await req.json());
  if (!parse.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  const { publicId, batchId, adminNote } = parse.data;

  const user = await prisma.user.findUnique({ where: { publicId } });
  if (!user) return NextResponse.json({ error: "No user with that ID" }, { status: 404 });

  const batch = await prisma.batch.findUnique({ where: { id: BigInt(batchId) } });
  if (!batch) return NextResponse.json({ error: "Batch not found" }, { status: 404 });

  await prisma.$transaction(async (tx) => {
    await tx.enrollment.upsert({
      where: { userId_batchId: { userId: user.id, batchId: batch.id } },
      update: { isActive: true },
      create: {
        userId: user.id,
        batchId: batch.id,
        expiresAt: new Date(Date.now() + batch.validityMonths * 30 * 24 * 3600 * 1000),
      },
    });
    await tx.batch.update({
      where: { id: batch.id },
      data: { enrollmentCount: { increment: 1 } },
    });
    await tx.enrollmentRequest.updateMany({
      where: { userId: user.id, batchId: batch.id, status: "pending" },
      data: { status: "approved", adminNote, reviewedAt: new Date() },
    });
  });

  return NextResponse.json({ ok: true, user: { publicId: user.publicId, name: user.name } });
}
