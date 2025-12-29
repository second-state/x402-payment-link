 "use client";

import Link from "next/link";
import { signOut, useSession } from "next-auth/react";

import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";

const baseLinks = [
  { href: "/", label: "Home" },
  { href: "/products", label: "Products" },
  { href: "/links", label: "Links" },
  { href: "/orders", label: "Orders" },
];

const adminLinks = [{ href: "/api-keys", label: "API Keys" }];

export function DashboardHeader() {
  const { data: session } = useSession();
  const { toast, ToastContainer } = useToast();

  async function handleSignOut() {
    await signOut({ redirect: false });
    toast({ title: "Signed out" });
    window.location.href = "/";
  }

  const navLinks =
    session?.user?.role === "admin" ? [...baseLinks, ...adminLinks] : baseLinks;

  return (
    <header className="border-b bg-white">
      <ToastContainer />
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <div className="flex items-center gap-4">
          <Link href="/" className="text-lg font-semibold text-slate-900">
            x402 Payment Link
          </Link>
          <nav className="flex items-center gap-3 text-sm text-slate-600">
            {navLinks.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="rounded-md px-2 py-1 hover:bg-slate-100 hover:text-slate-900"
              >
                {l.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-2">
          {session?.user ? (
            <>
              <span className="text-sm text-slate-700">{session.user.email}</span>
              <Button variant="outline" size="sm" onClick={handleSignOut}>
                Sign out
              </Button>
            </>
          ) : (
            <Button asChild variant="outline" size="sm">
              <Link href="/sign-in">Sign in</Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
