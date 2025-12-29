import Link from "next/link";
import { notFound } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { DashboardShell } from "@/components/shell/dashboard-shell";
import { LinkBuilder } from "@/components/pages/links/link-builder";
import { AuthGuard } from "@/lib/auth-guard";
import { auth } from "@/auth";
import { Button } from "@/components/ui/button";

type Props = {
  params: Promise<{ code: string }>;
};

export default async function EditLinkPage({ params }: Props) {
  const { code } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    notFound();
  }

  const link = await prisma.link.findFirst({
    where: { code, userId: session.user.id },
    include: {
      linkProducts: {
        include: {
          product: true,
          price: true,
        },
      },
    },
  });

  if (!link) {
    notFound();
  }

  return (
    <AuthGuard>
      <DashboardShell
        title="Edit link"
        description={`Code ${code}`}
        actions={
          <Button asChild size="sm" variant="outline">
            <Link href="/links">Back to links</Link>
          </Button>
        }
      >
        <LinkBuilder
          mode="edit"
          initialLink={{
            code: link.code,
            productSlugs: link.linkProducts.map((lp) => lp.product.slug),
            network: link.network.replace(/_/g, "-"),
            payToAddress: link.payToAddress,
            successUrl: link.successUrl,
            cancelUrl: link.cancelUrl,
            requireShipping: link.requireShipping,
          }}
        />
      </DashboardShell>
    </AuthGuard>
  );
}
