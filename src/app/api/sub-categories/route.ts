import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { currentUser } from "@/lib/auth";
import { slugify } from "@/lib/utils";
import { z } from "zod";

export async function GET() {
  const subs = await prisma.subCategory.findMany({ include: { category: true } });
  return NextResponse.json(subs);
}

const schema = z.object({
  name: z.string().min(2),
  categoryId: z.string(),
  description: z.string().optional(),
  tags: z.array(z.string()).optional(),
  displayOrder: z.number().optional(),
});

export async function POST(req: Request) {
  const user = await currentUser();
  if (!user || user.role !== "admin") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parse = schema.safeParse(await req.json());
  if (!parse.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  const { categoryId, tags, ...rest } = parse.data;
  const sub = await prisma.subCategory.create({
    data: {
      ...rest,
      slug: slugify(rest.name),
      categoryId: BigInt(categoryId),
      tags: tags ?? [],
    },
  });
  return NextResponse.json(sub, { status: 201 });
}
