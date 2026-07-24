import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { currentUser } from "@/lib/auth";
import { z } from "zod";

const schema = z.object({
  batchId: z.string(),
  chapterId: z.string().optional(),
  contentType: z.enum(["video","pdf","dpp","test","link"]),
  title: z.string(),
  description: z.string().optional(),
  fileUrl: z.string().optional(),
  videoUrl: z.string().optional(),
  embedUrl: z.string().optional(),
  durationMinutes: z.number().optional(),
  displayOrder: z.number().optional(),
  isPreview: z.boolean().optional(),
});

export async function POST(req: Request) {
  const user = await currentUser();
  if (!user || !["admin","sub_admin","teacher"].includes(user.role))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parse = schema.safeParse(await req.json());
  if (!parse.success) return NextResponse.json({ error: parse.error.flatten() }, { status: 400 });
  const d = parse.data;

  const content = await prisma.batchContent.create({
    data: {
      batchId: BigInt(d.batchId),
      chapterId: d.chapterId ? BigInt(d.chapterId) : undefined,
      contentType: d.contentType,
      title: d.title,
      description: d.description,
      fileUrl: d.fileUrl,
      videoUrl: d.videoUrl,
      embedUrl: d.embedUrl,
      durationMinutes: d.durationMinutes,
      displayOrder: d.displayOrder ?? 0,
      isPreview: !!d.isPreview,
    },
  });
  return NextResponse.json(content, { status: 201 });
}
