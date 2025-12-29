import { DashboardShell } from "@/components/shell/dashboard-shell";
import { ProductList } from "@/components/pages/products/product-list";
import { AuthGuard } from "@/lib/auth-guard";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function ProductsPage() {
  return (
    <AuthGuard>
      <DashboardShell
        title="Products"
        description="Catalog of items and pricing used in payment links."
        actions={
          <Button asChild size="sm">
            <Link href="/products/new">Create product</Link>
          </Button>
        }
      >
        <ProductList />
      </DashboardShell>
    </AuthGuard>
  );
}
