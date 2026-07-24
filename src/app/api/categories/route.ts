import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { currentUser } from "@/lib/auth";
import { slugify } from "@/lib/utils";
import { z } from "zod";

export async function GET() {
  const cats = await prisma.category.findMany({
    orderBy: { displayOrder: "asc" },
    include: { subCategories: true },
  });
  return NextResponse.json(cats);
}

const schema = z.object({
  name: z.string().min(2),
  description: z.string().optional(),
  isPaid: z.boolean().optional(),
  displayOrder: z.number().optional(),
  icon: z.string().optional(),
});

export async function POST(req: Request) {
  const user = await currentUser();
  if (!user || user.role !== "admin") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parse = schema.safeParse(await req.json());
  if (!parse.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const cat = await prisma.category.create({
    data: { ...parse.data, slug: slugify(parse.data.name) },
  });
  return NextResponse.json(cat, { status: 201 });
}
