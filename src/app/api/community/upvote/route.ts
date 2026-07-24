import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { currentUser } from "@/lib/auth";
import { z } from "zod";

const schema = z.object({
  kind: z.enum(["post", "reply"]),
  id: z.string(),
});

export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Login required" }, { status: 401 });
  const parse = schema.safeParse(await req.json());
  if (!parse.success) return NextResponse.json({ error: "Invalid" }, { status: 400 });

  const { kind, id } = parse.data;
  if (kind === "post") {
    await prisma.communityPost.update({ where: { id: BigInt(id) }, data: { upvotes: { increment: 1 } } });
  } else {
    await prisma.communityReply.update({ where: { id: BigInt(id) }, data: { upvotes: { increment: 1 } } });
  }
  return NextResponse.json({ ok: true });
}
