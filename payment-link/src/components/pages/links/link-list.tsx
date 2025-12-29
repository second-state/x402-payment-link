"use client";

import { useEffect, useState } from "react";

import Link from "next/link";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { useToast } from "@/components/ui/use-toast";

type Link = {
  id: string;
  code: string;
  network: string;
  payToAddress: string;
  createdAt: string;
};

export function LinkList() {
  const [links, setLinks] = useState<Link[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast, ToastContainer } = useToast();

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/links", { cache: "no-cache" });
        if (!res.ok) throw new Error("Failed to load links");
        const data = await res.json();
        setLinks(data.links ?? []);
      } catch (err) {
        const msg = (err as Error).message;
        setError(msg);
        toast({ title: "Error loading links", description: msg, variant: "destructive" });
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [toast]);

  return (
    <Card>
      <ToastContainer />
      <CardHeader>
        <CardTitle>Links</CardTitle>
        <CardDescription>Shareable payment links with product context.</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Spinner />
            <span>Loading...</span>
          </div>
        ) : error ? (
          <div className="text-sm text-red-600">{error}</div>
        ) : links.length === 0 ? (
          <div className="text-sm text-slate-500">No links found.</div>
        ) : (
          <div className="space-y-3">
            {links.map((l) => (
              <Link
                key={l.id}
                href={`/links/${l.code}`}
                className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-slate-300 hover:shadow-md md:grid-cols-[1fr_1fr_auto]"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <div className="rounded-lg bg-slate-100 px-2 py-1 font-mono text-xs text-slate-700">{l.code}</div>
                    <span className="text-xs text-slate-500">{l.network.replace("_", "-")}</span>
                  </div>
                </div>
                <div className="space-y-1 text-sm">
                  <div className="text-xs uppercase text-slate-500">Pay to</div>
                  <div className="font-mono text-xs text-slate-700">{l.payToAddress}</div>
                </div>
                <div className="text-right text-xs text-slate-500 md:flex md:flex-col md:items-end md:justify-between">
                  <span>{new Date(l.createdAt).toLocaleString()}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
