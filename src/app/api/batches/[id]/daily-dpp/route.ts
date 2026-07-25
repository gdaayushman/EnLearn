import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { topicForDay, totalTopics, type Curriculum } from "@/lib/curriculum-generator";
import { currentDayForBatch } from "./[day]/route";

/** GET → summary of the batch's daily-DPP timeline, no generation. */
export async function GET(_: Request, { params }: { params: { id: string } }) {
  const batchId = BigInt(params.id);
  const batch = await prisma.batch.findUnique({ where: { id: batchId } });
  if (!batch) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const cur = await prisma.batchCurriculum.findUnique({ where: { batchId } });
  if (!cur) return NextResponse.json({ totalDays: 0, currentDay: 0, days: [] });

  const curriculum = cur.data as unknown as Curriculum;
  const totalDays = totalTopics(curriculum);
  const currentDay = currentDayForBatch(batch.startsFrom);

  const cached = await prisma.dailyDPP.findMany({
    where: { batchId },
    orderBy: { dayNumber: "asc" },
    select: { dayNumber: true },
  });
  const generatedSet = new Set(cached.map(c => c.dayNumber));

  // Only surface Day 1 ... currentDay (or totalDays if smaller)
  const daysToShow = Math.min(currentDay, totalDays);
  const days = [];
  for (let d = 1; d <= daysToShow; d++) {
    const t = topicForDay(curriculum, d);
    if (!t) break;
    days.push({
      day: d, ...t,
      generated: generatedSet.has(d),
      isToday: d === currentDay,
    });
  }

  return NextResponse.json({ totalDays, currentDay: daysToShow, days });
}
