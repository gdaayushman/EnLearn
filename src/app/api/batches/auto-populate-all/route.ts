import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { currentUser } from "@/lib/auth";
import { fetchVideosForBatch, guessBatchContext, subjectsFor, suggestPdfLinks } from "@/lib/content-fetcher";

export async function POST(req: Request) {
  const user = await currentUser();
  if (!user || user.role !== "admin") return NextResponse.json({ error: "Admin only" }, { status: 401 });
  if (!process.env.YOUTUBE_API_KEY) return NextResponse.json({ error: "YOUTUBE_API_KEY not set" }, { status: 500 });

  const body = await req.json().catch(() => ({}));
  const onlyEmpty = body.onlyEmpty ?? true;
  const videosPerSubject = Math.min(3, Math.max(1, body.videosPerSubject ?? 2));

  const batches = await prisma.batch.findMany({
    where: { isActive: true },
    include: {
      subCategory: { include: { category: true } },
      _count: { select: { contents: true } },
    },
  });

  const targets = onlyEmpty ? batches.filter(b => b._count.contents <= 2) : batches;
  const results: any[] = [];

  for (const batch of targets) {
    try {
      const videos = await fetchVideosForBatch({
        batchName: batch.name,
        subCategoryName: batch.subCategory.name,
        categoryName: batch.subCategory.category.name,
        videosPerSubject,
      });
      let inserted = 0;
      let order = batch._count.contents;
      for (const v of videos) {
        await prisma.batchContent.create({
          data: {
            batchId: batch.id, contentType: "video",
            title: `[${v.subject}] ${v.title}`.slice(0, 250),
            description: `by ${v.channelTitle}`.slice(0, 500),
            embedUrl: v.embedUrl,
            videoUrl: `https://www.youtube.com/watch?v=${v.videoId}`,
            displayOrder: order++,
            isPreview: order === batch._count.contents + 1,
          },
        });
        inserted++;
      }
      let pdfsAdded = 0;
      const ctx = guessBatchContext(batch.name, batch.subCategory.name, batch.subCategory.category.name);
      if (ctx.cls && ["JEE", "NEET", "CBSE Boards", ""].includes(ctx.exam)) {
        for (const subject of subjectsFor(ctx.exam)) {
          for (const p of suggestPdfLinks(subject, ctx.cls)) {
            await prisma.batchContent.create({
              data: { batchId: batch.id, contentType: "link", title: p.title, fileUrl: p.url, displayOrder: order++ },
            });
            pdfsAdded++;
          }
        }
      }
      results.push({ batch: batch.name, videosInserted: inserted, pdfsInserted: pdfsAdded });
      await new Promise(r => setTimeout(r, 250));
    } catch (e: any) {
      results.push({ batch: batch.name, error: e.message ?? "unknown" });
      if (String(e.message).includes("quotaExceeded") || String(e.message).includes("403")) {
        results.push({ note: "YouTube quota exceeded, stopping." });
        break;
      }
    }
  }

  return NextResponse.json({ ok: true, processed: results.length, results });
}
