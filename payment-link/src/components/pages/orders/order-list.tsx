"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { useToast } from "@/components/ui/use-toast";

type Order = {
  orderId: string;
  linkCode: string;
  email?: string | null;
  phone?: string | null;
  quantity: number;
  total: string;
  currency: string;
  payment: boolean;
  requireShipping: boolean;
  createdAt: string;
  paidAt?: string | null;
};

function formatDate(value?: string | null) {
  if (!value) return "—";
  const d = new Date(value);
  return isNaN(d.getTime()) ? "—" : d.toLocaleString();
}

export function OrderList() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast, ToastContainer } = useToast();

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/orders", { cache: "no-cache" });
        if (!res.ok) throw new Error("Failed to load orders");
        const data = await res.json();
        setOrders(data.orders ?? []);
      } catch (err) {
        const msg = (err as Error).message;
        setError(msg);
        toast({ title: "Error loading orders", description: msg, variant: "destructive" });
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
        <CardTitle>Orders</CardTitle>
        <CardDescription>Latest orders created from your links.</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Spinner />
            <span>Loading...</span>
          </div>
        ) : error ? (
          <div className="text-sm text-red-600">{error}</div>
        ) : orders.length === 0 ? (
          <div className="text-sm text-slate-500">No orders yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full border-separate border-spacing-y-2 text-sm">
              <thead>
                <tr className="text-left text-xs uppercase text-slate-500">
                  <th className="px-3 py-1">Order</th>
                  <th className="px-3 py-1">Link</th>
                  <th className="px-3 py-1">Customer</th>
                  <th className="px-3 py-1">Quantity</th>
                  <th className="px-3 py-1">Total</th>
                  <th className="px-3 py-1">Status</th>
                  <th className="px-3 py-1">Created</th>
                  <th className="px-3 py-1">Paid</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o.orderId} className="rounded-lg bg-white shadow-sm">
                    <td className="px-3 py-2 font-mono text-xs text-slate-800">
                      <Link href={`/orders/${o.orderId}`} className="text-blue-700 hover:underline">
                        {o.orderId}
                      </Link>
                    </td>
                    <td className="px-3 py-2">
                      <Link href={`/links/${o.linkCode}`} className="text-sm font-semibold text-blue-700 hover:underline">
                        {o.linkCode}
                      </Link>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex flex-col">
                        <span className="text-sm text-slate-800">{o.email || "—"}</span>
                        {o.phone && <span className="text-xs text-slate-500">{o.phone}</span>}
                      </div>
                    </td>
                    <td className="px-3 py-2">{o.quantity}</td>
                    <td className="px-3 py-2">
                      {o.currency} {Number(o.total).toFixed(2)}
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${
                          o.payment ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                        }`}
                      >
                        {o.payment ? "Paid" : "Pending"}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-slate-600">{formatDate(o.createdAt)}</td>
                    <td className="px-3 py-2 text-slate-600">{o.payment ? formatDate(o.paidAt) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
