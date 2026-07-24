import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";

export async function GET() {
  const user = await currentUser();
  if (!user) return NextResponse.json(null);
  const { password, ...safe } = user;
  return NextResponse.json(safe);
}
