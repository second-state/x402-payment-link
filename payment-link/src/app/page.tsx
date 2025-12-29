import Link from "next/link";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DashboardShell } from "@/components/shell/dashboard-shell";

export default function Home() {
  return (
    <DashboardShell
      title="Welcome"
      description="Manage products, links, and API keys. Public checkout consumes the link endpoints you create here."
    >
      <div className="grid gap-4 md:grid-cols-2">
        <Link href="/products" className="group block">
          <Card className="transition-shadow group-hover:shadow-md">
            <CardHeader>
              <CardTitle>Products</CardTitle>
              <CardDescription>Define items and prices for your checkout links.</CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-slate-700">
              View and edit your product catalog used by checkout links.
            </CardContent>
          </Card>
        </Link>
        <Link href="/links" className="group block">
          <Card className="transition-shadow group-hover:shadow-md">
            <CardHeader>
              <CardTitle>Links</CardTitle>
              <CardDescription>Create shareable payment links.</CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-slate-700">
              Generate short codes tied to products and networks for x402 checkout.
            </CardContent>
          </Card>
        </Link>
      </div>
    </DashboardShell>
  );
}
