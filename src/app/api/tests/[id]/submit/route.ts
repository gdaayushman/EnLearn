import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { currentUser } from "@/lib/auth";
import { z } from "zod";

const schema = z.object({
  attemptId: z.string(),
  // { questionId: optionId }
  answers: z.record(z.string(), z.string()),
});

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Login required" }, { status: 401 });

  const parse = schema.safeParse(await req.json());
  if (!parse.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  const { attemptId, answers } = parse.data;

  const attempt = await prisma.testAttempt.findUnique({
    where: { id: BigInt(attemptId) },
  });
  if (!attempt || attempt.userId !== user.id || attempt.testId !== BigInt(params.id))
    return NextResponse.json({ error: "Attempt not found" }, { status: 404 });
  if (attempt.status === "submitted")
    return NextResponse.json({ error: "Already submitted" }, { status: 400 });

  const questions = await prisma.testQuestion.findMany({
    where: { testId: BigInt(params.id) },
    include: { options: true },
  });

  let score = 0;
  let totalMarks = 0;
  const perQuestion: Record<string, { correctOptionId: string; chosenOptionId?: string; isCorrect: boolean; marksAwarded: number }> = {};

  for (const q of questions) {
    totalMarks += q.marks;
    const correct = q.options.find((o) => o.isCorrect);
    if (!correct) continue;
    const chosen = answers[q.id.toString()];
    const isCorrect = chosen === correct.id.toString();
    const marksAwarded = isCorrect ? q.marks : chosen ? -q.negativeMarks : 0;
    score += marksAwarded;
    perQuestion[q.id.toString()] = {
      correctOptionId: correct.id.toString(),
      chosenOptionId: chosen,
      isCorrect,
      marksAwarded,
    };
  }

  const timeTakenMinutes = Math.max(1, Math.round((Date.now() - attempt.startedAt.getTime()) / 60000));

  const updated = await prisma.testAttempt.update({
    where: { id: attempt.id },
    data: {
      status: "submitted",
      score: Math.max(0, score),
      totalMarks,
      answers,
      submittedAt: new Date(),
      timeTakenMinutes,
    },
  });

  // Compute a naive rank = 1 + (number of higher scoring submitted attempts)
  const better = await prisma.testAttempt.count({
    where: { testId: attempt.testId, status: "submitted", score: { gt: updated.score } },
  });
  await prisma.testAttempt.update({ where: { id: updated.id }, data: { rank: better + 1 } });

  return NextResponse.json({
    ok: true,
    score: updated.score,
    totalMarks: updated.totalMarks,
    timeTakenMinutes,
    rank: better + 1,
    perQuestion,
  });
}
