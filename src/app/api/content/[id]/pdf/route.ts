import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { buildDPPPdf } from "@/lib/pdf-builder";
import { CONTACT } from "@/lib/config";
import { currentUser } from "@/lib/auth";

export const runtime = "nodejs";

/**
 * GET /api/content/[id]/pdf
 * Serves the on-demand generated DPP PDF for a BatchContent row.
 * Access rules: preview content OR free batch OR enrolled user.
 */
export async function GET(_: Request, { params }: { params: { id: string } }) {
  const content = await prisma.batchContent.findUnique({
    where: { id: BigInt(params.id) },
    include: { batch: true },
  });
  if (!content || !content.generatedData)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Access check
  const user = await currentUser();
  const canAccess = content.isPreview || content.batch.isFree || (user && (
    ["admin", "sub_admin", "teacher"].includes(user.role) ||
    !!(await prisma.enrollment.findUnique({
      where: { userId_batchId: { userId: user.id, batchId: content.batchId } },
    }))
  ));
  if (!canAccess) return NextResponse.json({ error: "Enroll to access" }, { status: 403 });

  const data: any = content.generatedData;
  const pdfBytes = await buildDPPPdf(data.questions, {
    batchName: content.batch.name,
    chapter: data.chapter,
    subject: data.subject,
    brand: CONTACT.brandName,
  });

  return new NextResponse(pdfBytes as any, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${data.chapter.replace(/[^a-z0-9]+/gi, "-")}-DPP.pdf"`,
      "Cache-Control": "public, max-age=3600",
    },
  });
}
