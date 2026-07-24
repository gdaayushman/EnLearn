import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "./prisma";

const SECRET = process.env.JWT_SECRET || "dev-only-secret-change-me";
const EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";
const COOKIE = "pw_token";

export type JwtPayload = { sub: string; role: string; email: string };

export const hashPassword = (p: string) => bcrypt.hash(p, 10);
export const verifyPassword = (p: string, h: string) => bcrypt.compare(p, h);

export function sign(payload: JwtPayload) {
  return jwt.sign(payload, SECRET, { expiresIn: EXPIRES_IN } as jwt.SignOptions);
}

export function verify(token: string): JwtPayload | null {
  try { return jwt.verify(token, SECRET) as JwtPayload; } catch { return null; }
}

export function setAuthCookie(res: NextResponse, token: string) {
  res.cookies.set(COOKIE, token, {
    httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production",
    path: "/", maxAge: 60 * 60 * 24 * 7,
  });
}
export function clearAuthCookie(res: NextResponse) {
  res.cookies.set(COOKIE, "", { path: "/", maxAge: 0 });
}

export async function currentUser() {
  const token = cookies().get(COOKIE)?.value;
  if (!token) return null;
  const payload = verify(token);
  if (!payload) return null;
  return prisma.user.findUnique({ where: { id: BigInt(payload.sub) } });
}

export function requireRole(roles: string[]) {
  return async (req: NextRequest) => {
    const token = req.cookies.get(COOKIE)?.value;
    const payload = token ? verify(token) : null;
    if (!payload || !roles.includes(payload.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return null; // means: allowed
  };
}
