import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { inr } from "@/lib/utils";
import { BRAND } from "@/lib/config";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [categories, freeBatches, paidBatches] = await Promise.all([
    prisma.category.findMany({ orderBy: { displayOrder: "asc" }, include: { subCategories: true } }),
    prisma.batch.findMany({ where: { isFree: true, isActive: true }, take: 6, orderBy: { createdAt: "desc" } }),
    prisma.batch.findMany({ where: { isFree: false, isActive: true }, take: 6, orderBy: { createdAt: "desc" } }),
  ]);

  return (
    <div className="space-y-10">
      <section className="rounded-3xl bg-gradient-to-br from-brand-600 to-brand-900 p-8 text-white md:p-14">
        <h1 className="text-3xl font-bold md:text-5xl">{BRAND.tagline}</h1>
        <p className="mt-3 max-w-2xl text-brand-100">
          {BRAND.name} — India&apos;s focused learning platform. AI-crafted daily practice, live classes, notes, tests & doubt-solving for JEE, NEET, Boards, UPSC and more.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/batches" className="btn bg-white text-brand-700 hover:bg-brand-50">Browse batches</Link>
          <Link href="/batches?free=1" className="btn border border-white/40 text-white hover:bg-white/10">Free materials</Link>
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-xl font-semibold">Categories</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {categories.map((c) => (
            <div key={c.id.toString()} className="card p-5">
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-lg font-semibold">{c.name}</h3>
                <span className={`badge ${c.isPaid ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"}`}>
                  {c.isPaid ? "Paid" : "Free"}
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {c.subCategories.map((s) => (
                  <Link key={s.id.toString()} href={`/batches?sub=${s.slug}`} className="badge bg-slate-100 text-slate-700 hover:bg-brand-100 dark:bg-slate-800 dark:text-slate-200">
                    {s.name}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <BatchStrip title="Free materials" batches={freeBatches} />
      <BatchStrip title="Popular paid batches" batches={paidBatches} />
    </div>
  );
}

function BatchStrip({ title, batches }: { title: string; batches: any[] }) {
  if (!batches.length) return null;
  return (
    <section>
      <h2 className="mb-4 text-xl font-semibold">{title}</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {batches.map((b) => (
          <Link key={b.id.toString()} href={`/batches/${b.slug}`} className="card overflow-hidden hover:shadow-md transition">
            <img src={b.thumbnailUrl ?? "https://picsum.photos/640/360"} alt={b.name} className="h-40 w-full object-cover" />
            <div className="p-4">
              <div className="mb-1 flex items-center gap-2 text-xs text-slate-500">
                <span className="badge bg-brand-100 text-brand-700">{b.batchType}</span>
                <span>{b.language}</span>
              </div>
              <h3 className="line-clamp-2 font-semibold">{b.name}</h3>
              <div className="mt-2 text-sm">
                {b.isFree
                  ? <span className="text-emerald-600 font-semibold">FREE</span>
                  : <>
                      <span className="font-semibold">{inr(b.discountedPrice ?? b.price)}</span>{" "}
                      {b.discountedPrice && <span className="text-slate-400 line-through">{inr(b.price)}</span>}
                    </>}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
