import "./globals.css";
import type { Metadata } from "next";
import Link from "next/link";
import { currentUser } from "@/lib/auth";
import { BRAND } from "@/lib/config";
import "@/lib/prisma"; // triggers BigInt JSON patch

export const metadata: Metadata = {
  title: `${BRAND.name} — ${BRAND.tagline}`,
  description: `${BRAND.name} — India's student-first learning platform for JEE, NEET, Boards, UPSC and more.`,
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await currentUser();
  return (
    <html lang="en">
      <body>
        <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/80 backdrop-blur dark:border-slate-800 dark:bg-slate-950/80">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
            <Link href="/" className="flex items-center gap-2 font-bold text-brand-700">
              <span className="grid h-8 w-8 place-items-center rounded-xl bg-brand-600 text-white">{BRAND.logoInitials}</span>
              <span>{BRAND.name}</span>
            </Link>
            <nav className="hidden gap-6 text-sm md:flex">
              <Link href="/" className="hover:text-brand-600">Home</Link>
              <Link href="/batches" className="hover:text-brand-600">Batches</Link>
              <Link href="/community" className="hover:text-brand-600">Community</Link>
              {user?.role === "admin" && <Link href="/admin" className="hover:text-brand-600">Admin</Link>}
              {user?.role === "teacher" && <Link href="/teacher" className="hover:text-brand-600">Teacher</Link>}
            </nav>
            <div className="flex items-center gap-2">
              {user ? (
                <>
                  <Link href="/profile" className="btn-ghost text-sm">Hi, {user.name.split(" ")[0]}</Link>
                  <form action="/api/auth/logout" method="post">
                    <button className="btn-ghost text-sm">Logout</button>
                  </form>
                </>
              ) : (
                <>
                  <Link href="/login" className="btn-ghost text-sm">Login</Link>
                  <Link href="/register" className="btn-primary text-sm">Sign up</Link>
                </>
              )}
            </div>
          </div>
        </header>
        <main className="mx-auto max-w-7xl px-4 py-6">{children}</main>
        <footer className="border-t border-slate-200 py-6 text-center text-sm text-slate-500 dark:border-slate-800">
          © {new Date().getFullYear()} {BRAND.name} • {BRAND.tagline}
        </footer>
      </body>
    </html>
  );
}
