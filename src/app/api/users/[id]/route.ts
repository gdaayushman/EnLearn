import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { currentUser } from "@/lib/auth";
import { z } from "zod";

const schema = z.object({
  role: z.enum(["student", "teacher", "admin", "sub_admin"]).optional(),
  isActive: z.boolean().optional(),
});

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const admin = await currentUser();
  if (!admin || admin.role !== "admin")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parse = schema.safeParse(await req.json());
  if (!parse.success) return NextResponse.json({ error: "Invalid" }, { status: 400 });
  const user = await prisma.user.update({ where: { id: BigInt(params.id) }, data: parse.data });
  return NextResponse.json({ id: user.id.toString(), role: user.role, isActive: user.isActive });
}
