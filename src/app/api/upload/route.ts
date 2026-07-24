import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { randomBytes } from "crypto";

export const runtime = "nodejs";

const MAX = 100 * 1024 * 1024; // 100 MB
const ALLOWED = new Set([
  "image/png", "image/jpeg", "image/webp", "image/gif",
  "application/pdf",
  "video/mp4", "video/webm", "video/quicktime",
]);

export async function POST(req: Request) {
  const user = await currentUser();
  if (!user || !["admin", "sub_admin", "teacher"].includes(user.role))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const form = await req.formData();
  const file = form.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "No file" }, { status: 400 });
  if (file.size > MAX) return NextResponse.json({ error: "File too large (max 100 MB)" }, { status: 413 });
  if (file.type && !ALLOWED.has(file.type))
    return NextResponse.json({ error: `Unsupported type: ${file.type}` }, { status: 415 });

  const buf = Buffer.from(await file.arrayBuffer());
  const ext = path.extname(file.name).slice(0, 10) || "";
  const name = `${Date.now()}-${randomBytes(6).toString("hex")}${ext}`;
  const dir = path.join(process.cwd(), "public", "uploads");
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, name), buf);

  const url = `/uploads/${name}`;
  return NextResponse.json({ url, name, size: file.size, type: file.type });
}
