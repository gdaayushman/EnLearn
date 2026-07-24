import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPassword, sign, setAuthCookie } from "@/lib/auth";
import { z } from "zod";

const schema = z.object({ email: z.string().email(), password: z.string().min(6) });

export async function POST(req: Request) {
  const parse = schema.safeParse(await req.json());
  if (!parse.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  const { email, password } = parse.data;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.isActive) return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  const ok = await verifyPassword(password, user.password);
  if (!ok) return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });

  const token = sign({ sub: user.id.toString(), role: user.role, email: user.email });
  const res = NextResponse.json({ id: user.id.toString(), role: user.role, name: user.name });
  setAuthCookie(res, token);
  return res;
}
