import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { currentUser } from "@/lib/auth";

/** Create (or resume) an attempt. Returns questions without correct-answer flags. */
export async function POST(_: Request, { params }: { params: { id: string } }) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Login required" }, { status: 401 });

  const testId = BigInt(params.id);
  const test = await prisma.test.findUnique({
    where: { id: testId },
    include: {
      batch: true,
      questions: {
        orderBy: { displayOrder: "asc" },
        include: { options: { orderBy: { displayOrder: "asc" } } },
      },
    },
  });
  if (!test || !test.isActive) return NextResponse.json({ error: "Test not found" }, { status: 404 });

  // Access check: must be enrolled in batch (or batch is free)
  if (!test.batch.isFree) {
    const enrolled = await prisma.enrollment.findUnique({
      where: { userId_batchId: { userId: user.id, batchId: test.batchId } },
    });
    if (!enrolled) return NextResponse.json({ error: "Enroll first" }, { status: 403 });
  }

  // Resume existing in-progress attempt if any
  let attempt = await prisma.testAttempt.findFirst({
    where: { userId: user.id, testId, status: "in_progress" },
  });
  if (!attempt) {
    attempt = await prisma.testAttempt.create({
      data: { userId: user.id, testId, totalMarks: test.totalMarks },
    });
  }

  // Strip isCorrect from options before sending to client
  const safeQuestions = test.questions.map((q) => ({
    id: q.id.toString(),
    questionText: q.questionText,
    marks: q.marks,
    negativeMarks: q.negativeMarks,
    displayOrder: q.displayOrder,
    options: q.options.map((o) => ({
      id: o.id.toString(),
      optionText: o.optionText,
      displayOrder: o.displayOrder,
    })),
  }));

  return NextResponse.json({
    attempt: {
      id: attempt.id.toString(),
      startedAt: attempt.startedAt,
      answers: attempt.answers ?? {},
    },
    test: {
      id: test.id.toString(),
      title: test.title,
      description: test.description,
      durationMinutes: test.durationMinutes,
      totalMarks: test.totalMarks,
    },
    questions: safeQuestions,
  });
}
