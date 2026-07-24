import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { inr } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function BatchesListPage({
  searchParams,
}: { searchParams: { sub?: string; free?: string; q?: string } }) {
  const where: any = { isActive: true };
  if (searchParams.free === "1") where.isFree = true;
  if (searchParams.sub) where.subCategory = { slug: searchParams.sub };
  if (searchParams.q) where.name = { contains: searchParams.q, mode: "insensitive" };

  const batches = await prisma.batch.findMany({
    where, orderBy: { createdAt: "desc" },
    include: { subCategory: { include: { category: true } } },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Browse batches</h1>
        <form className="flex gap-2">
          <input name="q" defaultValue={searchParams.q ?? ""} placeholder="Search batches…" className="input max-w-xs" />
          <button className="btn-primary">Search</button>
        </form>
      </div>
      {batches.length === 0 ? (
        <p className="text-slate-500">No batches match your filters.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {batches.map((b) => (
            <Link key={b.id.toString()} href={`/batches/${b.slug}`} className="card overflow-hidden hover:shadow-md transition">
              <img src={b.thumbnailUrl ?? ""} alt={b.name} className="h-40 w-full object-cover" />
              <div className="p-4">
                <div className="mb-1 text-xs text-slate-500">
                  {b.subCategory.category.name} · {b.subCategory.name}
                </div>
                <h3 className="line-clamp-2 font-semibold">{b.name}</h3>
                <div className="mt-2 flex items-center justify-between text-sm">
                  <span className="badge bg-brand-100 text-brand-700">{b.batchType}</span>
                  {b.isFree
                    ? <span className="text-emerald-600 font-semibold">FREE</span>
                    : <span className="font-semibold">{inr(b.discountedPrice ?? b.price)}</span>}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
