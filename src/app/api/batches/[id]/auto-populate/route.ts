import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { currentUser } from "@/lib/auth";
import { fetchVideosForBatch, guessBatchContext, subjectsFor, suggestPdfLinks } from "@/lib/content-fetcher";

/**
 * POST /api/batches/[id]/auto-populate
 * Body: { videosPerSubject?, includeNcertPdfs?, replaceExisting? }
 */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const user = await currentUser();
  if (!user || !["admin", "sub_admin", "teacher"].includes(user.role))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!process.env.YOUTUBE_API_KEY)
    return NextResponse.json({
      error: "YOUTUBE_API_KEY env var missing. Enable YouTube Data API v3 at console.cloud.google.com and add the key in Vercel.",
    }, { status: 500 });

  const body = await req.json().catch(() => ({}));
  const videosPerSubject = Math.min(5, Math.max(1, body.videosPerSubject ?? 3));
  const includeNcertPdfs = body.includeNcertPdfs ?? true;
  const replaceExisting = !!body.replaceExisting;

  const batch = await prisma.batch.findUnique({
    where: { id: BigInt(params.id) },
    include: { subCategory: { include: { category: true } } },
  });
  if (!batch) return NextResponse.json({ error: "Batch not found" }, { status: 404 });

  if (replaceExisting) await prisma.batchContent.deleteMany({ where: { batchId: batch.id } });
  const existingCount = await prisma.batchContent.count({ where: { batchId: batch.id } });

  const videos = await fetchVideosForBatch({
    batchName: batch.name,
    subCategoryName: batch.subCategory.name,
    categoryName: batch.subCategory.category.name,
    videosPerSubject,
  });

  const alreadyEmbedUrls = new Set(
    (await prisma.batchContent.findMany({
      where: { batchId: batch.id, embedUrl: { not: null } },
      select: { embedUrl: true },
    })).map(c => c.embedUrl)
  );

  let inserted = 0;
  let order = existingCount;
  for (const v of videos) {
    if (alreadyEmbedUrls.has(v.embedUrl)) continue;
    await prisma.batchContent.create({
      data: {
        batchId: batch.id,
        contentType: "video",
        title: `[${v.subject}] ${v.title}`.slice(0, 250),
        description: `by ${v.channelTitle}\n\n${v.description}`.slice(0, 500),
        embedUrl: v.embedUrl,
        videoUrl: `https://www.youtube.com/watch?v=${v.videoId}`,
        displayOrder: order++,
        isPreview: order <= existingCount + 1,
      },
    });
    inserted++;
  }

  let pdfsAdded = 0;
  if (includeNcertPdfs) {
    const ctx = guessBatchContext(batch.name, batch.subCategory.name, batch.subCategory.category.name);
    if (ctx.cls && ["JEE", "NEET", "CBSE Boards", ""].includes(ctx.exam)) {
      for (const subject of subjectsFor(ctx.exam)) {
        for (const p of suggestPdfLinks(subject, ctx.cls)) {
          await prisma.batchContent.create({
            data: {
              batchId: batch.id,
              contentType: "link",
              title: p.title,
              description: "Official NCERT textbook reference.",
              fileUrl: p.url,
              displayOrder: order++,
            },
          });
          pdfsAdded++;
        }
      }
    }
  }

  return NextResponse.json({
    ok: true,
    batchName: batch.name,
    videosFound: videos.length,
    videosInserted: inserted,
    pdfsInserted: pdfsAdded,
    totalContentNow: existingCount + inserted + pdfsAdded,
  });
}
