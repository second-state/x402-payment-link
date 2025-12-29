import Link from "next/link";

import { Button } from "@/components/ui/button";
import { DashboardShell } from "@/components/shell/dashboard-shell";
import { ProductForm } from "@/components/pages/products/product-form";
import { AuthGuard } from "@/lib/auth-guard";
export default function NewProductPage() {
  return (
    <AuthGuard>
      <DashboardShell
        title="Create product"
        description="Define a product with pricing."
        actions={
          <Button asChild size="sm" variant="outline">
            <Link href="/products">Back to products</Link>
          </Button>
        }
      >
        <ProductForm mode="create" redirectTo="/products" />
      </DashboardShell>
    </AuthGuard>
  );
}
