import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { currentUser } from "@/lib/auth";

export async function GET() {
  const me = await currentUser();
  if (!me || !["admin", "sub_admin"].includes(me.role))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: { id: true, publicId: true, name: true, email: true, role: true, isActive: true, createdAt: true },
  });
  return NextResponse.json(users);
}
