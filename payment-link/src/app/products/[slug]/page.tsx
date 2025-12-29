import { notFound } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { ProductForm } from "@/components/pages/products/product-form";
import { DashboardShell } from "@/components/shell/dashboard-shell";
import { AuthGuard } from "@/lib/auth-guard";
import { auth } from "@/auth";
import Link from "next/link";
import { Button } from "@/components/ui/button";

type Props = {
  params: Promise<{ slug: string }>;
};

export default async function EditProductPage({ params }: Props) {
  const { slug } = await params;

  const session = await auth();
  if (!session?.user?.id) {
    notFound();
  }

  const product = await prisma.product.findFirst({
    where: { slug, userId: session.user.id },
    include: { prices: true },
  });

  if (!product) {
    notFound();
  }

  const price = product.prices[0];

  const mappedProduct = {
    slug: product.slug,
    name: product.name,
    description: product.description,
    image: product.image,
    price: Number(price?.amount ?? 0),
    shipping: Number(price?.shipping ?? 0),
  };

  return (
    <AuthGuard>
      <DashboardShell
        title="Edit product"
        description={`Update ${slug}`}
        actions={
          <Button asChild size="sm" variant="outline">
            <Link href="/products">Back to products</Link>
          </Button>
        }
      >
        <ProductForm mode="edit" initialSlug={slug} product={mappedProduct} redirectTo="/products" />
      </DashboardShell>
    </AuthGuard>
  );
}
