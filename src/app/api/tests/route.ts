import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { currentUser } from "@/lib/auth";
import { z } from "zod";

export async function GET() {
  return NextResponse.json(await prisma.test.findMany({ include: { batch: true } }));
}

const optionSchema = z.object({
  optionText: z.string().min(1),
  isCorrect: z.boolean().default(false),
});
const questionSchema = z.object({
  questionText: z.string().min(1),
  marks: z.number().int().min(1).default(1),
  negativeMarks: z.number().int().min(0).default(0),
  explanation: z.string().optional(),
  options: z.array(optionSchema).min(2).max(6),
});
const schema = z.object({
  batchId: z.string(),
  title: z.string().min(2),
  description: z.string().optional(),
  testType: z.enum(["mock", "topic", "pyq", "live"]).default("mock"),
  durationMinutes: z.number().int().min(1).default(60),
  questions: z.array(questionSchema).min(1),
});

export async function POST(req: Request) {
  const user = await currentUser();
  if (!user || !["admin", "sub_admin", "teacher"].includes(user.role))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parse = schema.safeParse(await req.json());
  if (!parse.success) return NextResponse.json({ error: parse.error.flatten() }, { status: 400 });
  const d = parse.data;

  // Validate: each question has exactly one correct option
  for (const q of d.questions) {
    const correct = q.options.filter((o) => o.isCorrect).length;
    if (correct !== 1)
      return NextResponse.json({ error: `Each question must have exactly one correct option (question: "${q.questionText.slice(0, 40)}")` }, { status: 400 });
  }

  const totalMarks = d.questions.reduce((sum, q) => sum + q.marks, 0);

  const test = await prisma.test.create({
    data: {
      batchId: BigInt(d.batchId),
      title: d.title,
      description: d.description,
      testType: d.testType,
      durationMinutes: d.durationMinutes,
      totalMarks,
      totalQuestions: d.questions.length,
      questions: {
        create: d.questions.map((q, qi) => ({
          questionText: q.questionText,
          marks: q.marks,
          negativeMarks: q.negativeMarks,
          explanation: q.explanation,
          displayOrder: qi,
          options: {
            create: q.options.map((o, oi) => ({
              optionText: o.optionText,
              isCorrect: o.isCorrect,
              displayOrder: oi,
            })),
          },
        })),
      },
    },
  });

  return NextResponse.json(test, { status: 201 });
}
