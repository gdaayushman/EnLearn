import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { currentUser } from "@/lib/auth";

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const batch = await prisma.batch.findUnique({
    where: { id: BigInt(params.id) },
    include: { contents: true, subCategory: true, tests: true },
  });
  if (!batch) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(batch);
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const user = await currentUser();
  if (!user || !["admin","sub_admin"].includes(user.role))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const data = await req.json();
  const batch = await prisma.batch.update({ where: { id: BigInt(params.id) }, data });
  return NextResponse.json(batch);
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const user = await currentUser();
  if (!user || user.role !== "admin") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await prisma.batch.delete({ where: { id: BigInt(params.id) } });
  return NextResponse.json({ ok: true });
}
