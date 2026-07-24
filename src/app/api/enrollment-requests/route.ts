import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { currentUser } from "@/lib/auth";
import { z } from "zod";

const schema = z.object({
  batchId: z.string(),
  note: z.string().max(500).optional(),
});

/** Student clicks "Contact on Instagram to buy" → we log a pending request. */
export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Login required" }, { status: 401 });

  const parse = schema.safeParse(await req.json());
  if (!parse.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  const { batchId, note } = parse.data;
  const bId = BigInt(batchId);

  const batch = await prisma.batch.findUnique({ where: { id: bId } });
  if (!batch) return NextResponse.json({ error: "Batch not found" }, { status: 404 });

  // Already enrolled? no-op.
  const enrolled = await prisma.enrollment.findUnique({
    where: { userId_batchId: { userId: user.id, batchId: bId } },
  });
  if (enrolled) return NextResponse.json({ ok: true, alreadyEnrolled: true });

  // Dedupe pending requests for the same batch.
  const existing = await prisma.enrollmentRequest.findFirst({
    where: { userId: user.id, batchId: bId, status: "pending" },
  });
  if (existing) return NextResponse.json({ ok: true, request: existing, deduped: true });

  const request = await prisma.enrollmentRequest.create({
    data: { userId: user.id, batchId: bId, note },
  });
  return NextResponse.json({ ok: true, request }, { status: 201 });
}

/** Admin lists requests (optionally filter by status). */
export async function GET(req: Request) {
  const user = await currentUser();
  if (!user || !["admin", "sub_admin"].includes(user.role))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const status = url.searchParams.get("status") as any;
  const requests = await prisma.enrollmentRequest.findMany({
    where: status ? { status } : {},
    orderBy: { createdAt: "desc" },
    include: { user: true, batch: true },
    take: 200,
  });
  return NextResponse.json(requests);
}
