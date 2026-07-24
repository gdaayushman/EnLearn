import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { currentUser } from "@/lib/auth";
import { slugify } from "@/lib/utils";
import { z } from "zod";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const sub = url.searchParams.get("sub");
  const batches = await prisma.batch.findMany({
    where: {
      isActive: true,
      ...(sub ? { subCategory: { slug: sub } } : {}),
    },
    include: { subCategory: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(batches);
}

const schema = z.object({
  name: z.string().min(3),
  subCategoryId: z.string(),
  description: z.string().optional(),
  batchType: z.enum(["recorded", "live", "hybrid"]).optional(),
  price: z.number().optional(),
  discountedPrice: z.number().optional(),
  validityMonths: z.number().optional(),
  language: z.string().optional(),
  thumbnailUrl: z.string().optional(),
  isFree: z.boolean().optional(),
  startsFrom: z.string().optional(),
});

export async function POST(req: Request) {
  const user = await currentUser();
  if (!user || !["admin", "sub_admin"].includes(user.role))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parse = schema.safeParse(await req.json());
  if (!parse.success) return NextResponse.json({ error: parse.error.flatten() }, { status: 400 });
  const d = parse.data;
  const s = slugify(d.name);

  const batch = await prisma.batch.create({
    data: {
      name: d.name,
      slug: s,
      batchCode: `PW-${s.toUpperCase().slice(0, 20)}-${Date.now().toString().slice(-4)}`,
      description: d.description,
      subCategoryId: BigInt(d.subCategoryId),
      batchType: d.batchType ?? "recorded",
      price: d.price ?? 0,
      discountedPrice: d.discountedPrice,
      validityMonths: d.validityMonths ?? 12,
      language: d.language ?? "Hinglish",
      thumbnailUrl: d.thumbnailUrl,
      isFree: !!d.isFree,
      startsFrom: d.startsFrom ? new Date(d.startsFrom) : undefined,
    },
  });
  return NextResponse.json(batch, { status: 201 });
}
