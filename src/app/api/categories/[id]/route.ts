import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { currentUser } from "@/lib/auth";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const user = await currentUser();
  if (!user || user.role !== "admin") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const data = await req.json();
  const cat = await prisma.category.update({ where: { id: BigInt(params.id) }, data });
  return NextResponse.json(cat);
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const user = await currentUser();
  if (!user || user.role !== "admin") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await prisma.category.delete({ where: { id: BigInt(params.id) } });
  return NextResponse.json({ ok: true });
}
