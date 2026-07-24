import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { currentUser } from "@/lib/auth";

export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.redirect(new URL("/login", req.url));

  const form = await req.formData();
  const batchId = BigInt(form.get("batchId") as string);
  const batch = await prisma.batch.findUnique({ where: { id: batchId } });
  if (!batch) return NextResponse.json({ error: "Batch not found" }, { status: 404 });

  // Only auto-enroll for free batches; paid batches go through the
  // Instagram contact flow → EnrollmentRequest → admin approval.
  if (!batch.isFree) return NextResponse.json({ error: "Paid batch — contact us on Instagram to buy" }, { status: 400 });

  await prisma.enrollment.upsert({
    where: { userId_batchId: { userId: user.id, batchId } },
    update: { isActive: true },
    create: {
      userId: user.id, batchId,
      expiresAt: new Date(Date.now() + batch.validityMonths * 30 * 24 * 3600 * 1000),
    },
  });
  await prisma.batch.update({ where: { id: batchId }, data: { enrollmentCount: { increment: 1 } } });

  return NextResponse.redirect(new URL(`/batches/${batch.slug}`, req.url));
}

export async function GET() {
  const user = await currentUser();
  if (!user) return NextResponse.json([]);
  const enrollments = await prisma.enrollment.findMany({
    where: { userId: user.id, isActive: true },
    include: { batch: true },
    orderBy: { enrolledAt: "desc" },
  });
  return NextResponse.json(enrollments);
}
