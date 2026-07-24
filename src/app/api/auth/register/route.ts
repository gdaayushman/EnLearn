import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword, sign, setAuthCookie } from "@/lib/auth";
import { z } from "zod";

const schema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().optional(),
  password: z.string().min(6),
});

export async function POST(req: Request) {
  const parse = schema.safeParse(await req.json());
  if (!parse.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  const { name, email, phone, password } = parse.data;

  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists) return NextResponse.json({ error: "Email already in use" }, { status: 409 });

  const user = await prisma.user.create({
    data: { name, email, phone, password: await hashPassword(password) },
  });
  const token = sign({ sub: user.id.toString(), role: user.role, email: user.email });
  const res = NextResponse.json({ id: user.id.toString() });
  setAuthCookie(res, token);
  return res;
}
