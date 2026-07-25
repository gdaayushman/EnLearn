import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { currentUser } from "@/lib/auth";
import { generateDPP } from "@/lib/dpp-generator";
import { guessBatchContext, subjectsFor } from "@/lib/content-fetcher";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * POST /api/batches/[id]/generate-dpp
 *
 * Body: {
 *   chapters: string[],
 *   subject?: string,
 *   mcqCount?: number, integerCount?: number,
 *   difficulty?: "easy"|"medium"|"hard"|"mixed"
 * }
 *
 * For each chapter: generates original questions via Gemini, stores them as JSON
 * in BatchContent.generatedData, creates content row. The actual PDF is built
 * on-demand at /api/content/[id]/pdf so it works on ephemeral serverless disks.
 */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const user = await currentUser();
  if (!user || !["admin", "sub_admin", "teacher"].includes(user.role))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!process.env.GEMINI_API_KEY)
    return NextResponse.json({
      error: "GEMINI_API_KEY env var missing. Get a free key at https://aistudio.google.com/apikey",
    }, { status: 500 });

  const body = await req.json().catch(() => ({}));
  const chapters: string[] = Array.isArray(body.chapters) ? body.chapters.filter(Boolean) : [];
  if (chapters.length === 0)
    return NextResponse.json({ error: "chapters array is required" }, { status: 400 });

  const mcqCount = Math.min(20, Math.max(2, body.mcqCount ?? 8));
  const integerCount = Math.min(10, Math.max(0, body.integerCount ?? 2));
  const difficulty = body.difficulty ?? "mixed";

  const batch = await prisma.batch.findUnique({
    where: { id: BigInt(params.id) },
    include: { subCategory: { include: { category: true } } },
  });
  if (!batch) return NextResponse.json({ error: "Batch not found" }, { status: 404 });

  const ctx = guessBatchContext(batch.name, batch.subCategory.name, batch.subCategory.category.name);
  const exam = ctx.exam || "JEE";
  const cls = ctx.cls;
  const subject = body.subject ?? subjectsFor(exam)[0];

  const results: any[] = [];
  const existingCount = await prisma.batchContent.count({ where: { batchId: batch.id } });
  let order = existingCount;

  for (const chapter of chapters) {
    try {
      const questions = await generateDPP({
        chapter, subject, exam, cls, mcqCount, integerCount, difficulty,
      });

      const content = await prisma.batchContent.create({
        data: {
          batchId: batch.id,
          contentType: "dpp",
          title: `DPP: ${chapter} (${subject})`,
          description: `${questions.length} original practice questions (${questions.filter(q => q.type === "mcq").length} MCQ + ${questions.filter(q => q.type === "integer").length} integer). AI-generated, original questions.`,
          displayOrder: order++,
          generatedData: {
            chapter, subject, exam, cls, questions,
            generatedAt: new Date().toISOString(),
          },
        },
      });

      // Set fileUrl to the on-demand PDF route
      await prisma.batchContent.update({
        where: { id: content.id },
        data: { fileUrl: `/api/content/${content.id}/pdf` },
      });

      results.push({ chapter, questions: questions.length, contentId: content.id.toString() });
    } catch (e: any) {
      results.push({ chapter, error: e.message ?? "unknown" });
    }
  }

  return NextResponse.json({
    ok: true,
    batchName: batch.name,
    subject,
    generated: results.filter(r => !r.error).length,
    failed: results.filter(r => r.error).length,
    results,
  });
}
