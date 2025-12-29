import Link from "next/link";
import { notFound } from "next/navigation";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { DashboardShell } from "@/components/shell/dashboard-shell";
import { AuthGuard } from "@/lib/auth-guard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type Props = {
  params: Promise<{ orderId: string }>;
};

function formatDate(value?: Date | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString();
}

export default async function OrderDetailPage({ params }: Props) {
  const { orderId } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    notFound();
  }

  const order = await prisma.order.findFirst({
    where: { orderId, link: { userId: session.user.id } },
    include: { link: true },
  });

  if (!order) {
    notFound();
  }

  const total = Number(order.total || 0);

  return (
    <AuthGuard>
      <DashboardShell
        title={`Order ${order.orderId}`}
        description="Order details"
        actions={
          <div className="flex gap-2">
            <Button asChild size="sm" variant="outline">
              <Link href="/orders">Back to orders</Link>
            </Button>
            <Button asChild size="sm">
              <Link href={`/links/${order.linkCode}`}>View link</Link>
            </Button>
          </div>
        }
      >
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Customer</CardTitle>
              <CardDescription>Contact and shipping details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-slate-800">
              <div>
                <div className="text-xs uppercase text-slate-500">Email</div>
                <div>{order.email || "—"}</div>
              </div>
              <div>
                <div className="text-xs uppercase text-slate-500">Phone</div>
                <div>{order.phone || "—"}</div>
              </div>
              <div>
                <div className="text-xs uppercase text-slate-500">Name</div>
                <div>{order.name || "—"}</div>
              </div>
              {order.requireShipping ? (
                <div className="space-y-1">
                  <div className="text-xs uppercase text-slate-500">Shipping address</div>
                  <div>{order.address1 || "—"}</div>
                  <div>{order.address2 || ""}</div>
                  <div>
                    {[order.state, order.zip, order.country].filter(Boolean).join(", ") || "—"}
                  </div>
                </div>
              ) : (
                <div className="text-xs text-slate-500">Shipping details not required for this order.</div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Payment</CardTitle>
              <CardDescription>Status and totals</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-slate-800">
              <div className="flex items-center justify-between">
                <span>Status</span>
                <span
                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${
                    order.payment ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                  }`}
                >
                  {order.payment ? "Paid" : "Pending"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Total</span>
                <span>
                  {order.currency} {total.toFixed(2)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Quantity</span>
                <span>{order.quantity}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Created</span>
                <span className="text-slate-600">{formatDate(order.createdAt)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Paid</span>
                <span className="text-slate-600">{order.payment ? formatDate(order.paidAt) : "—"}</span>
              </div>
              <div className="space-y-1">
                <div className="text-xs uppercase text-slate-500">Tx hash</div>
                <div className="font-mono text-xs break-all">{order.txHash || "—"}</div>
              </div>
              <div className="space-y-1">
                <div className="text-xs uppercase text-slate-500">Network</div>
                <div className="text-sm text-slate-800">{order.txNetwork || "—"}</div>
              </div>
            </CardContent>
          </Card>
        </div>
      </DashboardShell>
    </AuthGuard>
  );
}
