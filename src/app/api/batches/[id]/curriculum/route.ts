import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { currentUser } from "@/lib/auth";
import { generateCurriculum, totalTopics, type Curriculum } from "@/lib/curriculum-generator";
import { guessBatchContext, subjectsFor } from "@/lib/content-fetcher";

export const runtime = "nodejs";
export const maxDuration = 60;

/** GET: fetch existing curriculum (public, so batch card can show topic count). */
export async function GET(_: Request, { params }: { params: { id: string } }) {
  const cur = await prisma.batchCurriculum.findUnique({
    where: { batchId: BigInt(params.id) },
  });
  if (!cur) return NextResponse.json({ curriculum: null, totalDays: 0 });
  return NextResponse.json({
    curriculum: cur.data,
    totalDays: totalTopics(cur.data as unknown as Curriculum),
    generatedAt: cur.generatedAt,
  });
}

/** POST: AI-generate a curriculum for this batch (or replace existing). */
export async function POST(_: Request, { params }: { params: { id: string } }) {
  const user = await currentUser();
  if (!user || !["admin", "sub_admin", "teacher"].includes(user.role))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const batch = await prisma.batch.findUnique({
    where: { id: BigInt(params.id) },
    include: { subCategory: { include: { category: true } } },
  });
  if (!batch) return NextResponse.json({ error: "Batch not found" }, { status: 404 });

  const ctx = guessBatchContext(batch.name, batch.subCategory.name, batch.subCategory.category.name);
  const exam = ctx.exam || "JEE";
  const subjects = subjectsFor(exam);

  const curriculum = await generateCurriculum({ exam, cls: ctx.cls, subjects });

  await prisma.batchCurriculum.upsert({
    where: { batchId: batch.id },
    update: { data: curriculum as any },
    create: { batchId: batch.id, data: curriculum as any },
  });

  return NextResponse.json({
    ok: true,
    totalDays: totalTopics(curriculum),
    subjects: curriculum.subjects.map(s => ({ name: s.name, chapters: s.chapters.length, topics: s.chapters.reduce((t, c) => t + c.topics.length, 0) })),
  });
}

/** PUT: admin manually edits/replaces the curriculum JSON. */
export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const user = await currentUser();
  if (!user || !["admin", "sub_admin"].includes(user.role))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  if (!body?.curriculum?.subjects) return NextResponse.json({ error: "Invalid curriculum" }, { status: 400 });

  await prisma.batchCurriculum.upsert({
    where: { batchId: BigInt(params.id) },
    update: { data: body.curriculum },
    create: { batchId: BigInt(params.id), data: body.curriculum },
  });

  return NextResponse.json({ ok: true, totalDays: totalTopics(body.curriculum) });
}
