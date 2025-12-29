"use client";

import { useEffect, useState } from "react";

import Image from "next/image";
import Link from "next/link";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { useToast } from "@/components/ui/use-toast";

type Price = {
  amount: string;
  shipping: string;
  currency: string;
};

type Product = {
  id: string;
  slug: string;
  name: string;
  description?: string | null;
  image?: string | null;
  active: boolean;
  prices?: Price[];
};

export function ProductList() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast, ToastContainer } = useToast();

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/products?includePrices=true", { cache: "no-cache" });
        if (!res.ok) throw new Error("Failed to load products");
        const data = await res.json();
        setProducts(data.products ?? []);
      } catch (err) {
        setError((err as Error).message);
        toast({ title: "Error loading products", description: (err as Error).message, variant: "destructive" });
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
        <CardTitle>Products</CardTitle>
        <CardDescription>Your catalog with pricing for links.</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Spinner />
            <span>Loading...</span>
          </div>
        ) : error ? (
          <div className="text-sm text-red-600">{error}</div>
        ) : products.length === 0 ? (
          <div className="text-sm text-slate-500">No products found.</div>
        ) : (
          <div className="space-y-4">
            {products.map((p) => {
              const price = (p.prices ?? [])[0];
              return (
                <Link
                  key={p.id}
                  href={`/products/${p.slug}`}
                  className="grid gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-3 md:items-center"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-16 w-16 overflow-hidden rounded-md border border-slate-200 bg-slate-100">
                      {p.image ? (
                        <Image src={p.image} alt={p.name} width={64} height={64} className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-xs text-slate-400">
                          No image
                        </div>
                      )}
                    </div>
                    <div className="text-lg font-semibold text-slate-900">{p.name}</div>
                  </div>
                  <div className="text-xs text-slate-500 md:text-sm">{p.slug}</div>
                  <div className="flex flex-wrap items-center gap-3 text-sm text-slate-700">
                    {price ? (
                      <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                        <div className="text-xs uppercase text-slate-500">Price</div>
                        <div className="font-semibold">
                          {price.currency} {price.amount}
                        </div>
                        <div className="text-xs text-slate-500">
                          Shipping: {price.currency} {price.shipping}
                        </div>
                      </div>
                    ) : (
                      <div className="text-xs text-slate-500">No price</div>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
