import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await currentUser();
  if (!user || !["admin","sub_admin"].includes(user.role)) redirect("/login");

  const items = [
    ["Dashboard", "/admin"],
    ["Enrollment Requests", "/admin/enrollment-requests"],
    ["Categories", "/admin/categories"],
    ["Sub-Categories", "/admin/sub-categories"],
    ["Batches", "/admin/batches"],
    ["Content", "/admin/content"],
    ["✨ Auto-populate", "/admin/auto-populate"],
    ["Users", "/admin/users"],
    ["Tests", "/admin/tests"],
  ];

  return (
    <div className="grid gap-6 md:grid-cols-[220px_1fr]">
      <aside className="card p-3 h-fit sticky top-20">
        <div className="mb-2 px-2 text-xs font-semibold uppercase text-slate-500">Admin</div>
        <ul className="space-y-1 text-sm">
          {items.map(([label, href]) => (
            <li key={href}>
              <Link href={href} className="block rounded-lg px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-800">{label}</Link>
            </li>
          ))}
        </ul>
      </aside>
      <section>{children}</section>
    </div>
  );
}
