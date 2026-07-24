import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { currentUser } from "@/lib/auth";
import { z } from "zod";

export async function GET() {
  const posts = await prisma.communityPost.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      user: { select: { name: true, avatarUrl: true } },
      replies: {
        orderBy: { createdAt: "asc" },
        include: { user: { select: { name: true, avatarUrl: true } } },
      },
    },
    take: 100,
  });
  return NextResponse.json(posts);
}

const schema = z.object({
  content: z.string().min(3),
  batchId: z.string().optional(),
  postType: z.enum(["doubt","discussion","announcement"]).optional(),
});

export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parse = schema.safeParse(await req.json());
  if (!parse.success) return NextResponse.json({ error: "Invalid" }, { status: 400 });
  const post = await prisma.communityPost.create({
    data: {
      userId: user.id,
      batchId: parse.data.batchId ? BigInt(parse.data.batchId) : null,
      content: parse.data.content,
      postType: parse.data.postType ?? "doubt",
    },
  });
  return NextResponse.json(post, { status: 201 });
}
