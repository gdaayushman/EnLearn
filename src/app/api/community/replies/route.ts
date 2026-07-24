import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { currentUser } from "@/lib/auth";
import { z } from "zod";

const schema = z.object({ postId: z.string(), content: z.string().min(2) });

export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parse = schema.safeParse(await req.json());
  if (!parse.success) return NextResponse.json({ error: "Invalid" }, { status: 400 });
  const reply = await prisma.communityReply.create({
    data: {
      postId: BigInt(parse.data.postId),
      userId: user.id,
      content: parse.data.content,
    },
  });
  return NextResponse.json(reply, { status: 201 });
}
