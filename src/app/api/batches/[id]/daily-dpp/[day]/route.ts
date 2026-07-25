import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { currentUser } from "@/lib/auth";
import { topicForDay, type Curriculum } from "@/lib/curriculum-generator";
import { generateDPP } from "@/lib/dpp-generator";
import { guessBatchContext } from "@/lib/content-fetcher";

export const runtime = "nodejs";
export const maxDuration = 60;

/** How many days since a batch's startsFrom (1-indexed). Returns 1 if no start date. */
export function currentDayForBatch(startsFrom: Date | null): number {
  if (!startsFrom) return 1;
  const start = new Date(startsFrom); start.setHours(0, 0, 0, 0);
  const now = new Date(); now.setHours(0, 0, 0, 0);
  return Math.max(1, Math.floor((now.getTime() - start.getTime()) / (24 * 3600 * 1000)) + 1);
}

/**
 * GET /api/batches/[id]/daily-dpp/[day]
 * Returns the DPP for Day N of this batch. Generates on-demand if not cached.
 */
export async function GET(_: Request, { params }: { params: { id: string; day: string } }) {
  const batchId = BigInt(params.id);
  const dayNumber = Math.max(1, parseInt(params.day, 10));

  const batch = await prisma.batch.findUnique({
    where: { id: batchId },
    include: { subCategory: { include: { category: true } } },
  });
  if (!batch) return NextResponse.json({ error: "Batch not found" }, { status: 404 });

  // Access check
  const user = await currentUser();
  const isFree = batch.isFree;
  const staff = user && ["admin", "sub_admin", "teacher"].includes(user.role);
  const enrolled = user && (staff || !!(await prisma.enrollment.findUnique({
    where: { userId_batchId: { userId: user.id, batchId } },
  })));
  if (!isFree && !enrolled) {
    return NextResponse.json({ error: "Enroll to access daily DPPs" }, { status: 403 });
  }

  // Prevent students from opening tomorrow's DPP (staff can preview any day)
  const today = currentDayForBatch(batch.startsFrom);
  if (!staff && dayNumber > today) {
    return NextResponse.json({ error: `Day ${dayNumber} unlocks on ${new Date(new Date(batch.startsFrom ?? Date.now()).getTime() + (dayNumber - 1) * 86400000).toDateString()}` }, { status: 403 });
  }

  // Serve from cache if already generated
  const cached = await prisma.dailyDPP.findUnique({
    where: { batchId_dayNumber: { batchId, dayNumber } },
  });
  if (cached) {
    return NextResponse.json({
      day: cached.dayNumber, subject: cached.subject, chapter: cached.chapter, topic: cached.topic,
      questions: cached.questions, cached: true, createdAt: cached.createdAt,
    });
  }

  // Need to generate. First load curriculum.
  const cur = await prisma.batchCurriculum.findUnique({ where: { batchId } });
  if (!cur) return NextResponse.json({ error: "Curriculum not set. Admin must generate the batch curriculum first." }, { status: 424 });

  const target = topicForDay(cur.data as unknown as Curriculum, dayNumber);
  if (!target) return NextResponse.json({ error: `Batch curriculum has fewer than ${dayNumber} days.` }, { status: 404 });

  // Generate 20 questions on this specific topic
  const ctx = guessBatchContext(batch.name, batch.subCategory.name, batch.subCategory.category.name);
  const questions = await generateDPP({
    chapter: target.chapter,
    topic: target.topic,
    subject: target.subject,
    exam: ctx.exam || "JEE",
    cls: ctx.cls,
    mcqCount: 16,
    integerCount: 4,
    difficulty: "mixed",
  });

  const saved = await prisma.dailyDPP.create({
    data: {
      batchId, dayNumber,
      subject: target.subject, chapter: target.chapter, topic: target.topic,
      questions: questions as any,
    },
  });

  return NextResponse.json({
    day: saved.dayNumber, subject: saved.subject, chapter: saved.chapter, topic: saved.topic,
    questions: saved.questions, cached: false, createdAt: saved.createdAt,
  });
}
